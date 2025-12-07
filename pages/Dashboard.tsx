import React, { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '../components/Card';
import { DataService } from '../services/dataService';
import { AuthService } from '../services/authService';
import { AppData } from '../types';
import { formatCurrency } from '../utils/formatters';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<AppData | null>(null);

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

  if (!data) return <div className="p-8 text-center text-gray-400">Loading your financial dashboard...</div>;

  const netWorth = DataService.getNetWorth(data);
  const totalAssets = data.assets.reduce((sum, i) => sum + i.amount, 0);
  const totalLiabilities = data.liabilities.reduce((sum, i) => sum + i.amount, 0);
  
  // Calculate current month's flow
  const monthlyFlow = DataService.getMonthlyCashflow(data, 0);

  // --- Calculate Trend Data (Last 6 Months) ---
  const trendData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthName = d.toLocaleString('default', { month: 'short' });
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    // Calculate totals for that specific month
    const income = data.income.filter(item => item.date.startsWith(dateStr)).reduce((sum, item) => sum + item.amount, 0);
    const expense = data.expenses.filter(item => item.date.startsWith(dateStr)).reduce((sum, item) => sum + item.amount, 0);
    
    trendData.push({
      name: monthName,
      income,
      expense,
      savings: income - expense
    });
  }

  // Asset allocation data
  const assetData = data.assets.map(a => ({ name: a.name, value: a.amount }));
  const COLORS = ['#4f46e5', '#818cf8', '#c7d2fe', '#ec4899', '#f472b6'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-400">Financial Overview & Insights</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { DataService.reset(data.userId); }} className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm transition font-medium">Reset Data</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border-indigo-500/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Net Worth</p>
              <h3 className="text-3xl font-bold text-white mt-1">{formatCurrency(netWorth)}</h3>
            </div>
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <i className="ri-safe-2-line text-indigo-400 text-xl"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-400">
            <i className="ri-arrow-up-line mr-1"></i>
            <span>+2.4% from last month</span>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Assets</p>
              <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(totalAssets)}</h3>
            </div>
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <i className="ri-briefcase-line text-emerald-400 text-xl"></i>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Liabilities</p>
              <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(totalLiabilities)}</h3>
            </div>
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <i className="ri-hand-coin-line text-rose-400 text-xl"></i>
            </div>
          </div>
        </Card>

         <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">This Month's Flow</p>
              <h3 className={`text-2xl font-bold mt-1 ${monthlyFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {monthlyFlow >= 0 ? '+' : ''}{formatCurrency(monthlyFlow)}
              </h3>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <i className="ri-refresh-line text-blue-400 text-xl"></i>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Spending Trends (Last 6 Months)" className="lg:col-span-2 min-h-[400px]">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#818cf8' }}
                  cursor={{ fill: '#ffffff05' }}
                  formatter={(value: number) => [formatCurrency(value)]}
                />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Asset Allocation" className="min-h-[400px]">
          <div className="h-[300px] w-full mt-4 flex items-center justify-center relative">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {assetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                   itemStyle={{ color: '#e2e8f0' }}
                   formatter={(value: number) => [formatCurrency(value), 'Value']}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase">Total</p>
                <p className="text-lg font-bold text-white">{(totalAssets/100000).toFixed(2)}L</p>
              </div>
            </div>
          </div>
          <div className="mt-2 space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar">
            {assetData.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                   <span className="text-gray-300">{item.name}</span>
                 </div>
                 <span className="font-medium text-white">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Insights / Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Financial Insights">
          <div className="space-y-4">
             {monthlyFlow < 0 ? (
               <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex gap-3 items-start">
                 <i className="ri-alert-line text-red-400 text-xl mt-1"></i>
                 <div>
                   <h4 className="text-red-400 font-semibold">Overspending Alert</h4>
                   <p className="text-sm text-gray-300">You have spent {formatCurrency(Math.abs(monthlyFlow))} more than you earned this month. Review your 'Entertainment' budget.</p>
                 </div>
               </div>
             ) : (
               <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex gap-3 items-start">
                 <i className="ri-thumb-up-line text-emerald-400 text-xl mt-1"></i>
                 <div>
                   <h4 className="text-emerald-400 font-semibold">Great Job!</h4>
                   <p className="text-sm text-gray-300">You are cash positive this month. Consider investing the surplus of {formatCurrency(monthlyFlow)}.</p>
                 </div>
               </div>
             )}
          </div>
        </Card>

        <Card title="Financial Milestones">
          <div className="space-y-4">
          {data.milestones.map((m) => {
            const progress = (m.currentAmount / m.targetAmount) * 100;
            return (
              <div key={m.id} className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="flex justify-between mb-2">
                  <h4 className="font-semibold text-white">{m.name}</h4>
                  <span className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">
                    Due: {new Date(m.deadline).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>{formatCurrency(m.currentAmount)}</span>
                  <span>{formatCurrency(m.targetAmount)}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" 
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;