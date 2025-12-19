import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { DataService } from '../services/dataService';
import { AuthService } from '../services/authService';
import { AppData, FinancialItem } from '../types';
import { formatCurrency } from '../utils/formatters';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const [data, setData] = useState<AppData | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchData = async () => {
      const user = AuthService.getCurrentUser();
      if (user) {
        const cloudData = await DataService.load(user.uid);
        setData(cloudData);
      }
    };
    fetchData();
  }, []);

  if (!data) return <div className="p-8 text-center text-gray-400">Loading Report Data...</div>;

  // --- Calculations ---
  const netWorth = DataService.getNetWorth(data);
  const totalAssets = data.assets.reduce((sum, i) => sum + i.amount, 0);
  const totalLiabilities = data.liabilities.reduce((sum, i) => sum + i.amount, 0);

  // Filter transactions by date range
  const income = data.income.filter(i => i.date >= dateRange.start && i.date <= dateRange.end);
  const expenses = data.expenses.filter(i => i.date >= dateRange.start && i.date <= dateRange.end);

  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenses.reduce((s, i) => s + i.amount, 0);
  const savings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  // Insights Generation
  const insights: { type: 'good' | 'warn' | 'info', text: string }[] = [];
  if (savingsRate > 20) insights.push({ type: 'good', text: `Great job! You saved ${savingsRate.toFixed(1)}% of your income this period.` });
  if (savingsRate < 0) insights.push({ type: 'warn', text: 'You are spending more than you earn. Review expenses.' });
  if (totalLiabilities > totalAssets) insights.push({ type: 'warn', text: 'Liabilities exceed assets. Focus on debt reduction.' });
  if (totalAssets > 0 && totalLiabilities === 0) insights.push({ type: 'good', text: 'You are debt-free! Consider investing surplus cash.' });

  // Group Expenses by Category
  const expenseCategories: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = e.subcategory || 'General';
    expenseCategories[cat] = (expenseCategories[cat] || 0) + e.amount;
  });
  const sortedCategories = Object.entries(expenseCategories).sort((a, b) => b[1] - a[1]);

  const generatePDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    const startStr = new Date(dateRange.start).toLocaleDateString();
    const endStr = new Date(dateRange.end).toLocaleDateString();

    // Title
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text('FinMate Financial Report', 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Period: ${startStr} - ${endStr}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 36);

    // Summary
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, 45, 180, 25, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('NET WORTH', 20, 55);
    doc.text('TOTAL ASSETS', 80, 55);
    doc.text('TOTAL LIABILITIES', 140, 55);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(formatCurrency(netWorth), 20, 63);
    doc.text(formatCurrency(totalAssets), 80, 63);
    doc.text(formatCurrency(totalLiabilities), 140, 63);

    let finalY = 80;

    // Assets Table
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('Assets Breakdown', 14, finalY);

    const autoTable = (autoTableModule as any).default || autoTableModule;
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Asset Name', 'Category', 'Value']],
      body: data.assets.map(a => [a.name, a.category, formatCurrency(a.amount)]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    finalY = (doc as any).lastAutoTable.finalY + 15;

    // Liabilities Table
    doc.text('Liabilities Breakdown', 14, finalY);
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Liability Name', 'Category', 'Amount']],
      body: data.liabilities.map(l => [l.name, l.category, formatCurrency(l.amount)]),
      theme: 'grid',
      headStyles: { fillColor: [236, 72, 153] }
    });

    doc.save('FinMate_Report.pdf');
  };

  const handlePrint = () => {
    window.print();
  }

  return (
    <div className="space-y-8 print:space-y-4 max-w-5xl mx-auto">

      {/* --- Header --- */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-900 border border-white/10 shadow-2xl print:border-none print:shadow-none">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Financial Health Report</h1>
            <p className="text-indigo-200 mt-1">Generated for <span className="font-semibold text-white">{AuthService.getCurrentUser()?.displayName}</span></p>
          </div>

          <div className="flex flex-col items-end gap-2 print:hidden">
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
              <input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                className="bg-transparent text-white text-sm px-2 py-1 outline-none border-none"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                className="bg-transparent text-white text-sm px-2 py-1 outline-none border-none"
              />
            </div>
            <button onClick={generatePDF} className="text-sm font-medium text-emerald-300 hover:text-white flex items-center gap-1 transition">
              <i className="ri-file-pdf-line"></i> Download PDF
            </button>
            <button onClick={handlePrint} className="text-sm font-medium text-indigo-300 hover:text-white flex items-center gap-1 transition">
              <i className="ri-printer-line"></i> Print Report
            </button>
          </div>
          <div className="hidden print:block text-right">
            <p className="text-sm text-gray-500">Period: {dateRange.start} to {dateRange.end}</p>
          </div>
        </div>
      </div>

      {/* --- Key Metrics --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/5 shadow-lg">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Net Worth</p>
          <h3 className="text-2xl font-bold text-white">{formatCurrency(netWorth)}</h3>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-900/40 to-emerald-900/10 border border-emerald-500/20 shadow-lg">
          <p className="text-emerald-400 text-xs font-medium uppercase tracking-wider mb-1">Total Assets</p>
          <h3 className="text-2xl font-bold text-white">{formatCurrency(totalAssets)}</h3>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-rose-900/40 to-rose-900/10 border border-rose-500/20 shadow-lg">
          <p className="text-rose-400 text-xs font-medium uppercase tracking-wider mb-1">Total Liabilities</p>
          <h3 className="text-2xl font-bold text-white">{formatCurrency(totalLiabilities)}</h3>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900/40 to-indigo-900/10 border border-indigo-500/20 shadow-lg">
          <p className="text-indigo-400 text-xs font-medium uppercase tracking-wider mb-1">Savings Rate</p>
          <h3 className="text-2xl font-bold text-white">{savingsRate.toFixed(1)}%</h3>
        </div>
      </div>

      {/* --- Insights & Recommendations --- */}
      {insights.length > 0 && (
        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-6">
          <h4 className="flex items-center gap-2 font-semibold text-white mb-4">
            <i className="ri-lightbulb-flash-line text-yellow-400 text-xl"></i> Financial Insights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${insight.type === 'good' ? 'bg-emerald-500/5 border-emerald-500/10' : insight.type === 'warn' ? 'bg-amber-500/5 border-amber-500/10' : 'bg-blue-500/5 border-blue-500/10'}`}>
                <i className={`mt-0.5 text-lg ${insight.type === 'good' ? 'ri-checkbox-circle-fill text-emerald-400' : insight.type === 'warn' ? 'ri-alert-fill text-amber-400' : 'ri-information-fill text-blue-400'}`}></i>
                <span className="text-sm text-gray-200">{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block print:space-y-8">

        {/* --- Balance Sheet Section --- */}
        <Card title="Balance Sheet Breakdown" className="h-full">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-sm font-semibold text-emerald-400">Assets</span>
                <span className="text-xs text-gray-400">{((totalAssets / (totalAssets + totalLiabilities || 1)) * 100).toFixed(0)}% of Portfolio</span>
              </div>
              <div className="bg-white/5 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-white/5">
                    {data.assets.length === 0 && <tr><td className="p-3 text-gray-500 italic">No assets recorded</td></tr>}
                    {data.assets.map(a => (
                      <tr key={a.id} className="hover:bg-white/5">
                        <td className="p-3 text-gray-300">{a.name}</td>
                        <td className="p-3 text-right font-medium text-emerald-400">{formatCurrency(a.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-sm font-semibold text-rose-400">Liabilities</span>
                <span className="text-xs text-gray-400">{((totalLiabilities / (totalAssets + totalLiabilities || 1)) * 100).toFixed(0)}% of Portfolio</span>
              </div>
              <div className="bg-white/5 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-white/5">
                    {data.liabilities.length === 0 && <tr><td className="p-3 text-gray-500 italic">No liabilities recorded</td></tr>}
                    {data.liabilities.map(l => (
                      <tr key={l.id} className="hover:bg-white/5">
                        <td className="p-3 text-gray-300">{l.name}</td>
                        <td className="p-3 text-right font-medium text-rose-400">{formatCurrency(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>

        {/* --- Budget Analysis Section --- */}
        <Card title="Budget & Spending Analysis" className="h-full">
          <div className="space-y-6">

            {/* Income vs Expense Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Cash Flow</span>
                <span className={savings >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {savings >= 0 ? '+' : ''}{formatCurrency(savings)}
                </span>
              </div>
              <div className="flex h-4 rounded-full overflow-hidden bg-gray-800">
                <div style={{ width: `${(totalIncome / ((totalIncome + totalExpense) || 1)) * 100}%` }} className="bg-emerald-500"></div>
                <div style={{ width: `${(totalExpense / ((totalIncome + totalExpense) || 1)) * 100}%` }} className="bg-rose-500"></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Income: {formatCurrency(totalIncome)}</span>
                <span>Exp: {formatCurrency(totalExpense)}</span>
              </div>
            </div>

            {/* Top Spending Categories */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Top Expenses by Category</h4>
              <div className="space-y-3">
                {sortedCategories.slice(0, 5).map(([cat, amount]) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300">{cat}</span>
                      <span className="text-white font-medium">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${(amount / (totalExpense || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                {sortedCategories.length === 0 && <p className="text-sm text-gray-500">No expenses in this period.</p>}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* --- Transaction History --- */}
      <Card title="Recent Transactions" className="print:break-before-page">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="p-3 rounded-tl-lg">Date</th>
                <th className="p-3">Description</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right rounded-tr-lg">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[...income, ...expenses].sort((a, b) => b.date.localeCompare(a.date)).map(t => (
                <tr key={t.id} className="hover:bg-white/5">
                  <td className="p-3 text-gray-400 whitespace-nowrap">{t.date}</td>
                  <td className="p-3 text-white">{t.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-gray-300 border border-white/10">{t.subcategory || t.category}</span>
                  </td>
                  <td className={`p-3 text-right font-medium ${income.find(i => i.id === t.id) ? 'text-emerald-400' : 'text-white'}`}>
                    {income.find(i => i.id === t.id) ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
              {[...income, ...expenses].length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No transactions found for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-center text-gray-500 text-xs py-8 print:text-black">
        <p>FinMate Financial Report • Generated on {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default Reports;