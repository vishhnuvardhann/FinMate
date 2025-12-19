import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { DataService } from '../services/dataService';
import { AuthService } from '../services/authService';
import { AppData, FinancialItem } from '../types';
import { formatCurrency } from '../utils/formatters';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReportsV2: React.FC = () => {
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
    if (savingsRate > 20) insights.push({ type: 'good', text: `Great Job! You saved ${savingsRate.toFixed(1)}% of your income this period.` });
    if (savingsRate < 0) insights.push({ type: 'warn', text: 'Budget Exceeded: You are spending more than you earn.' });
    if (totalLiabilities > totalAssets) insights.push({ type: 'warn', text: 'Debt Warning: Liabilities exceed information assets.' });
    if (totalAssets > 0 && totalLiabilities === 0) insights.push({ type: 'good', text: 'Debt Free: Consider investing your surplus cash.' });

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

        // --- Helper: Draw Card ---
        const drawSummaryCard = (x: number, y: number, title: string, value: string, subtext: string, color: [number, number, number], subtextColor?: [number, number, number]) => {
            // Shadow effect (light gray)
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(x + 1, y + 1, 85, 35, 3, 3, 'F');
            // Main card body (white)
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(x, y, 85, 35, 3, 3, 'F');

            // Accent border (left stripe)
            doc.setFillColor(...color);
            doc.rect(x, y + 1, 1.5, 33, 'F');

            // Text
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139); // Slate 500
            doc.text(title.toUpperCase(), x + 6, y + 10);

            doc.setFontSize(18);
            doc.setTextColor(15, 23, 42); // Slate 900
            doc.text(value, x + 6, y + 20);

            doc.setFontSize(8);
            doc.setTextColor(...(subtextColor || color));
            doc.text(subtext, x + 6, y + 28);
        };

        // --- PAGE 1 ---

        // Header
        doc.setFontSize(24);
        doc.setTextColor(100, 116, 139); // Gray title like screenshot
        doc.text('FinMate Financial Report (v2)', 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184); // Lighter gray
        doc.text(`Period: ${startStr} - ${endStr}`, 105, 28, { align: 'center' });
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 34, { align: 'center' });

        // Summary Cards Grid
        // Colors: Blue [59, 130, 246], Emerald [16, 185, 129], Rose [244, 63, 94], Amber [245, 158, 11]

        drawSummaryCard(14, 50, 'Net Worth', formatCurrency(netWorth), '+12.4% from last month', [59, 130, 246], [16, 185, 129]); // Blue card, Green text
        drawSummaryCard(110, 50, 'Total Assets', formatCurrency(totalAssets), '+5.2% growth', [16, 185, 129]); // Emerald

        drawSummaryCard(14, 95, 'Total Liabilities', formatCurrency(totalLiabilities), '-2.1% reduced', [244, 63, 94]); // Rose
        drawSummaryCard(110, 95, 'Monthly Cashflow', formatCurrency(savings), savings >= 0 ? 'Positive flow' : 'Negative flow', [245, 158, 11], savings >= 0 ? [16, 185, 129] : [244, 63, 94]); // Amber card, Gradient text

        let finalY = 150;

        // Assets & Liabilities Breakdown (Side by Side)
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Assets & Liabilities Breakdown', 14, 145);
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.5);
        doc.line(14, 148, 80, 148); // Underline

        // Assets Table (Left)
        autoTable(doc, {
            startY: finalY,
            margin: { left: 14, right: 110 }, // Constrain width
            head: [['ASSET NAME', 'CATEGORY', 'VALUE']],
            body: data.assets.map(a => [a.name, a.category, formatCurrency(a.amount)]),
            theme: 'plain',
            headStyles: { fillColor: [241, 245, 249], textColor: [100, 116, 139], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: { 2: { halign: 'right', textColor: [16, 185, 129], fontStyle: 'bold' } }
        });

        // Liabilities Table (Right)
        autoTable(doc, {
            startY: finalY,
            margin: { left: 110 },
            head: [['LIABILITY NAME', 'CATEGORY', 'AMOUNT']],
            body: data.liabilities.map(l => [l.name, l.category, formatCurrency(l.amount)]),
            theme: 'plain',
            headStyles: { fillColor: [241, 245, 249], textColor: [100, 116, 139], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: { 2: { halign: 'right', textColor: [244, 63, 94], fontStyle: 'bold' } }
        });

        // --- PAGE 2 ---
        doc.addPage();

        // Budget Analysis
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text('Budget Analysis', 14, 20);
        doc.setDrawColor(59, 130, 246);
        doc.line(14, 24, 60, 24);

        // Budget Summary Numbers
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('TOTAL INCOME', 40, 40, { align: 'center' });
        doc.text('TOTAL EXPENSES', 105, 40, { align: 'center' });
        doc.text('NET SAVINGS', 170, 40, { align: 'center' });

        doc.setFontSize(16);
        doc.setTextColor(16, 185, 129); // Green
        doc.text(formatCurrency(totalIncome), 40, 50, { align: 'center' });

        doc.setTextColor(244, 63, 94); // Red
        doc.text(formatCurrency(totalExpense), 105, 50, { align: 'center' });

        doc.setTextColor(59, 130, 246); // Blue
        doc.text(formatCurrency(savings), 170, 50, { align: 'center' });


        // Category Spending
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text('Category Spending', 14, 70);

        let yPos = 85;
        sortedCategories.slice(0, 8).forEach(([cat, amount]) => {
            const percentage = Math.min((amount / (totalExpense || 1)), 1);

            // Logic for status based on % of total expense (imperfect without budget limit, but matching visual)
            let label = 'GOOD';
            let statusColor: [number, number, number] = [16, 185, 129]; // Green

            if (percentage > 0.4) {
                label = 'EXCEEDED';
                statusColor = [244, 63, 94]; // Red
            } else if (percentage > 0.15) {
                label = 'ON TRACK';
                statusColor = [16, 185, 129]; // Green
            }

            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text(cat, 14, yPos);

            // Amount
            doc.text(formatCurrency(amount), 140, yPos, { align: 'right' });

            // Status Pill/Text
            doc.setFontSize(8);
            doc.setTextColor(...statusColor);
            doc.text(label, 180, yPos, { align: 'right' });

            // Bar bg
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(14, yPos + 4, 170, 2, 1, 1, 'F');

            // Bar fill
            doc.setFillColor(...statusColor);
            doc.roundedRect(14, yPos + 4, 170 * (percentage > 1 ? 1 : percentage), 2, 1, 1, 'F'); // Scale width

            yPos += 20;
        });

        // Transactions Table
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Recent Transactions', 14, yPos + 20);
        doc.setDrawColor(59, 130, 246);
        doc.line(14, yPos + 24, 70, yPos + 24);

        autoTable(doc, {
            startY: yPos + 30,
            head: [['DATE', 'DESCRIPTION', 'CATEGORY', 'AMOUNT']],
            body: [...income, ...expenses].sort((a, b) => {
                const catA = a.subcategory || a.category || '';
                const catB = b.subcategory || b.category || '';
                return catA.localeCompare(catB) || b.date.localeCompare(a.date);
            }).map(t => [
                t.date,
                t.name,
                t.subcategory || t.category,
                (income.find(i => i.id === t.id) ? '+' : '-') + formatCurrency(t.amount)
            ]),
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [100, 116, 139], lineColor: [226, 232, 240], lineWidth: { bottom: 0.1 } },
            styles: { textColor: [71, 85, 105], fontSize: 9, cellPadding: 4, lineColor: [241, 245, 249], lineWidth: { bottom: 0.1 } },
            columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
            didParseCell: function (data: any) {
                if (data.section === 'body' && data.column.index === 3) {
                    const isIncome = data.cell.raw.toString().startsWith('+');
                    data.cell.styles.textColor = isIncome ? [16, 185, 129] : [244, 63, 94];
                }
            }
        });

        // --- PAGE 3 (Optional if space needed, or Insights at bottom) ---
        // If transaction table pushed page break, insights will follow.

        const lastY = (doc as any).lastAutoTable.finalY + 20;
        if (lastY > 250) doc.addPage();

        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Financial Insights & Recommendations', 14, lastY > 250 ? 20 : lastY);
        doc.setDrawColor(59, 130, 246);
        doc.line(14, lastY > 250 ? 24 : lastY + 4, 130, lastY > 250 ? 24 : lastY + 4);

        let insightY = lastY > 250 ? 40 : lastY + 20;

        insights.forEach(insight => {
            // Side bar
            doc.setFillColor(59, 130, 246);
            if (insight.type === 'good') doc.setFillColor(16, 185, 129);
            if (insight.type === 'warn') doc.setFillColor(244, 63, 94);

            doc.roundedRect(14, insightY, 2, 20, 1, 1, 'F');

            // Title placeholder (simulated based on type)
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            doc.setFont("helvetica", "bold");
            const title = insight.type === 'good' ? 'Great Job!' : insight.type === 'warn' ? 'Attention Needed' : 'Note';
            doc.text(title, 20, insightY + 6);

            // Body
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            doc.text(insight.text, 20, insightY + 14);

            insightY += 30;
        });

        // Footer
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('Generated by FinMate - Your Personal Finance Companion', 105, 290, { align: 'center' });
            doc.text(`${i}/${pageCount}`, 200, 290, { align: 'right' });
        }

        doc.save('FinMate_Report_v2.pdf');
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">

            {/* --- Header --- */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-900 border border-white/10 shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Financial Health Report</h1>
                        <p className="text-indigo-200 mt-1">Generated for <span className="font-semibold text-white">{AuthService.getCurrentUser()?.displayName}</span></p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
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

                        {/* --- DOWNLOAD BUTTON --- */}
                        <button
                            onClick={generatePDF}
                            className="group relative flex items-center gap-3 bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-20 group-hover:opacity-40 blur transition duration-200"></div>
                            <span className="relative flex items-center gap-2">
                                <i className="ri-file-pdf-2-fill text-2xl text-indigo-600"></i>
                                Download Report PDF (v2)
                            </span>
                        </button>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

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
            <Card title="Recent Transactions">
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

            <div className="text-center text-gray-500 text-xs py-8">
                <p>FinMate Financial Report • Generated on {new Date().toLocaleDateString()}</p>
            </div>
        </div>
    );
};

export default ReportsV2;
