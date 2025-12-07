import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTableModule from 'jspdf-autotable';
import Card from '../components/Card';
import { DataService } from '../services/dataService';
import { AuthService } from '../services/authService';
import { AppData } from '../types';
import { formatCurrency } from '../utils/formatters';

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

  const handleRangeSelect = (range: 'week' | 'month' | 'year') => {
    const end = new Date();
    const start = new Date();

    if (range === 'week') start.setDate(end.getDate() - 7);
    if (range === 'month') start.setMonth(end.getMonth() - 1);
    if (range === 'year') start.setFullYear(end.getFullYear() - 1);

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  const generatePDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    const startStr = new Date(dateRange.start).toLocaleDateString();
    const endStr = new Date(dateRange.end).toLocaleDateString();

    const autoTable = (autoTableModule as any).default || autoTableModule;

    if (typeof autoTable !== 'function') {
      console.error('AutoTable function could not be loaded');
      alert('Error loading PDF generator. Please try again.');
      return;
    }

    // Title
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Primary color
    doc.text('FinMate Financial Report', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Period: ${startStr} - ${endStr}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 36);

    // Summary Section
    const netWorth = DataService.getNetWorth(data);
    const totalAssets = data.assets.reduce((sum, i) => sum + i.amount, 0);
    const totalLiabilities = data.liabilities.reduce((sum, i) => sum + i.amount, 0);

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
      headStyles: { fillColor: [236, 72, 153] } // Pink/Secondary
    });

    finalY = (doc as any).lastAutoTable.finalY + 15;

    // Monthly Budget Snapshot
    doc.text('Monthly Budget Snapshot', 14, finalY);
    const monthlyIncome = data.income.reduce((s, i) => s + i.amount, 0);
    const monthlyExpense = data.expenses.reduce((s, i) => s + i.amount, 0);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Type', 'Total Monthly Amount']],
      body: [
        ['Income', formatCurrency(monthlyIncome)],
        ['Expenses', formatCurrency(monthlyExpense)],
        ['Net Cashflow', formatCurrency(monthlyIncome - monthlyExpense)]
      ],
      theme: 'striped',
    });

    doc.save('FinMate_Report.pdf');
  };

  if (!data) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Financial Reports</h2>
      <p className="text-gray-400">Generate and export detailed financial statements.</p>

      <Card title="Export Options">
        <div className="space-y-6">
          
          {/* Preset Buttons */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Quick Ranges</label>
            <div className="flex gap-2">
              <button onClick={() => handleRangeSelect('week')} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-200 transition">Last 7 Days</button>
              <button onClick={() => handleRangeSelect('month')} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-200 transition">Last Month</button>
              <button onClick={() => handleRangeSelect('year')} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-200 transition">Last Year</button>
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start Date</label>
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">End Date</label>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <button 
              onClick={generatePDF}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition shadow-lg shadow-indigo-500/20"
            >
              <i className="ri-file-pdf-line text-xl"></i>
              Download PDF Report
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-indigo-500/20">
          <div className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
               <i className="ri-file-chart-line text-2xl"></i>
            </div>
            <div>
              <h4 className="font-semibold text-white">Statement of Net Worth</h4>
              <p className="text-sm text-gray-400">Summarizes assets and liabilities.</p>
            </div>
          </div>
        </Card>
         <Card className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border-emerald-500/20">
          <div className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
               <i className="ri-wallet-3-line text-2xl"></i>
            </div>
            <div>
              <h4 className="font-semibold text-white">Cash Flow Statement</h4>
              <p className="text-sm text-gray-400">Details income and expense breakdown.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports;