import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { DataService } from '../services/dataService';
import { AuthService } from '../services/authService';
import { AppData, FinancialItem } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../utils/formatters';

const BalanceSheet: React.FC = () => {
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

  const handleDelete = async (id: string, type: 'asset' | 'liability') => {
    if (!data) return;
    const updatedData = { ...data };
    if (type === 'asset') updatedData.assets = updatedData.assets.filter(i => i.id !== id);
    else updatedData.liabilities = updatedData.liabilities.filter(i => i.id !== id);
    
    setData(updatedData);
    await DataService.save(updatedData);
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>, type: 'asset' | 'liability') => {
    e.preventDefault();
    if (!data) return;
    
    const formData = new FormData(e.currentTarget);
    const item: FinancialItem = {
      id: Date.now().toString(),
      userId: data.userId,
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string),
      category: formData.get('category') as any,
      icon: 'ri-money-dollar-circle-line',
      date: new Date().toISOString().split('T')[0],
      recurring: false
    };

    const updatedData = { ...data };
    if (type === 'asset') updatedData.assets.push(item);
    else updatedData.liabilities.push(item);

    setData(updatedData);
    await DataService.save(updatedData);
    (e.target as HTMLFormElement).reset();
  }

  if (!data) return null;

  const totalAssets = data.assets.reduce((sum, i) => sum + i.amount, 0);
  const totalLiabilities = data.liabilities.reduce((sum, i) => sum + i.amount, 0);
  const netWorth = totalAssets - totalLiabilities;

  const assetCategories = [
    { name: 'Cash', value: data.assets.filter(a => a.category === 'cash').reduce((s, i) => s + i.amount, 0) },
    { name: 'Investments', value: data.assets.filter(a => a.category === 'investment' || a.category === 'retirement').reduce((s, i) => s + i.amount, 0) },
    { name: 'Property/Vehicles', value: data.assets.filter(a => a.category === 'property' || a.category === 'vehicle').reduce((s, i) => s + i.amount, 0) },
  ].filter(i => i.value > 0);

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899'];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Balance Sheet</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold text-white">Net Worth</h3>
             <span className="text-2xl font-bold text-indigo-400">{formatCurrency(netWorth)}</span>
           </div>
           
           <div className="flex flex-col md:flex-row gap-8">
             <div className="flex-1">
               <h4 className="text-sm font-medium text-gray-400 uppercase mb-4">Assets Composition</h4>
               <div className="h-[200px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={assetCategories} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                       {assetCategories.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <Tooltip 
                       contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc' }}
                       itemStyle={{ color: '#e2e8f0' }}
                       formatter={(value: number) => [formatCurrency(value), 'Value']}
                     />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
               <div className="flex justify-center gap-4 text-xs text-gray-400">
                 {assetCategories.map((c, i) => (
                   <div key={i} className="flex items-center gap-1">
                     <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></div>
                     {c.name}
                   </div>
                 ))}
               </div>
             </div>

             <div className="flex-1 space-y-4">
                <div className="bg-white/5 rounded-xl p-4 border border-emerald-500/20">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Assets</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(totalAssets)}</span>
                  </div>
                  <div className="w-full bg-gray-700 h-1 mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-rose-500/20">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Liabilities</span>
                    <span className="text-rose-400 font-bold">{formatCurrency(totalLiabilities)}</span>
                  </div>
                  <div className="w-full bg-gray-700 h-1 mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20 text-center">
                   <p className="text-sm text-indigo-300">Debt Ratio</p>
                   <p className="text-xl font-bold text-white">{totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : 0}%</p>
                </div>
             </div>
           </div>
        </Card>

        {/* Add Forms */}
        <div className="space-y-6">
          <Card title="Add Asset">
            <form onSubmit={(e) => handleAdd(e, 'asset')} className="space-y-3">
              <input name="name" placeholder="Asset Name" required className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white" />
              <div className="flex gap-2">
                 <input name="amount" type="number" placeholder="Value" required className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white" />
                 <select name="category" className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white">
                   <option className="text-black" value="cash">Cash</option>
                   <option className="text-black" value="investment">Invest</option>
                   <option className="text-black" value="property">Prop</option>
                 </select>
              </div>
              <button className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-white text-sm font-medium">Add Asset</button>
            </form>
          </Card>
          
          <Card title="Add Liability">
            <form onSubmit={(e) => handleAdd(e, 'liability')} className="space-y-3">
              <input name="name" placeholder="Liability Name" required className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white" />
               <div className="flex gap-2">
                 <input name="amount" type="number" placeholder="Amount" required className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white" />
                 <select name="category" className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white">
                   <option className="text-black" value="loan">Loan</option>
                   <option className="text-black" value="credit_card">Card</option>
                   <option className="text-black" value="mortgage">Mortgage</option>
                 </select>
              </div>
              <button className="w-full bg-rose-600 hover:bg-rose-500 py-2 rounded text-white text-sm font-medium">Add Liability</button>
            </form>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Your Assets">
          <div className="space-y-3">
            {data.assets.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                 <div>
                   <p className="font-medium text-white">{item.name}</p>
                   <p className="text-xs text-gray-400 capitalize">{item.category}</p>
                 </div>
                 <div className="flex items-center gap-3">
                   <span className="font-bold text-emerald-400">{formatCurrency(item.amount)}</span>
                   <button onClick={() => handleDelete(item.id, 'asset')} className="text-gray-500 hover:text-red-400"><i className="ri-close-circle-line"></i></button>
                 </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Your Liabilities">
           <div className="space-y-3">
            {data.liabilities.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                 <div>
                   <p className="font-medium text-white">{item.name}</p>
                   <p className="text-xs text-gray-400 capitalize">{item.category}</p>
                 </div>
                 <div className="flex items-center gap-3">
                   <span className="font-bold text-rose-400">{formatCurrency(item.amount)}</span>
                   <button onClick={() => handleDelete(item.id, 'liability')} className="text-gray-500 hover:text-red-400"><i className="ri-close-circle-line"></i></button>
                 </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BalanceSheet;