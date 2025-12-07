import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import { DataService } from '../services/dataService';
import { AuthService } from '../services/authService';
import { AppData, ForecastResult } from '../types';
import { formatCurrency } from '../utils/formatters';

const Forecasting: React.FC = () => {
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

  const updateForecast = async (field: keyof AppData['forecast'], value: number) => {
    if (!data) return;
    
    const updatedData = {
      ...data,
      forecast: {
        ...data.forecast,
        [field]: value
      }
    };
    
    setData(updatedData);
    await DataService.save(updatedData);
  };

  if (!data) return <div>Loading...</div>;

  const { initial, monthly, rate, years } = data.forecast;

  const calculateGrowth = (): ForecastResult[] => {
    const results: ForecastResult[] = [];
    let current = initial;
    let totalInvested = initial;
    const monthlyRate = rate / 100 / 12;

    for (let i = 0; i <= years * 12; i++) {
      if (i % 12 === 0) { // Store yearly data points
        results.push({
          month: i / 12,
          value: Math.round(current),
          invested: Math.round(totalInvested),
          interest: Math.round(current - totalInvested)
        });
      }
      current = (current + monthly) * (1 + monthlyRate);
      totalInvested += monthly;
    }
    return results;
  };

  const chartData = calculateGrowth();
  const finalAmount = chartData[chartData.length - 1].value;
  const finalInvested = chartData[chartData.length - 1].invested;
  const interestEarned = chartData[chartData.length - 1].interest;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Forecasting</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Parameters" className="h-fit">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Initial Investment (₹)</label>
              <input 
                type="number" 
                value={initial} 
                onChange={(e) => updateForecast('initial', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Monthly Contribution (₹)</label>
              <input 
                type="number" 
                value={monthly} 
                onChange={(e) => updateForecast('monthly', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Annual Return (%)</label>
              <input 
                type="number" 
                value={rate} 
                onChange={(e) => updateForecast('rate', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition"
              />
              <input 
                type="range" 
                min="1" max="15" 
                value={rate} 
                onChange={(e) => updateForecast('rate', Number(e.target.value))}
                className="w-full mt-2 accent-indigo-500"
              />
            </div>
             <div>
              <label className="block text-sm text-gray-400 mb-1">Time Horizon (Years)</label>
              <input 
                type="number" 
                value={years} 
                onChange={(e) => updateForecast('years', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </Card>

        <Card title="Growth Projection" className="lg:col-span-2">
           <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
                <p className="text-xs text-indigo-300 uppercase">Future Value</p>
                <p className="text-xl font-bold text-white">{formatCurrency(finalAmount)}</p>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                <p className="text-xs text-emerald-300 uppercase">Total Invested</p>
                <p className="text-xl font-bold text-white">{formatCurrency(finalInvested)}</p>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
                <p className="text-xs text-purple-300 uppercase">Interest Earned</p>
                <p className="text-xl font-bold text-white">{formatCurrency(interestEarned)}</p>
              </div>
           </div>

           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                 <XAxis dataKey="month" stroke="#94a3b8" label={{ value: 'Years', position: 'insideBottomRight', offset: -10, fill: '#64748b' }} />
                 <YAxis stroke="#94a3b8" tickFormatter={(val) => `₹${val/1000}k`} />
                 <Tooltip 
                   contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                   itemStyle={{ color: '#e2e8f0' }}
                   formatter={(value: number, name: string) => [formatCurrency(value), name]}
                   cursor={{ stroke: '#6366f1', strokeWidth: 1 }}
                 />
                 <Line type="monotone" dataKey="value" name="Total Value" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
                 <Line type="monotone" dataKey="invested" name="Principal Invested" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
               </LineChart>
             </ResponsiveContainer>
           </div>
           <div className="flex justify-center gap-6 mt-4 text-sm">
             <div className="flex items-center gap-2">
               <div className="w-3 h-1 bg-indigo-500"></div>
               <span className="text-gray-300">Total Value</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-1 bg-emerald-500 border-dashed"></div>
               <span className="text-gray-300">Principal Invested</span>
             </div>
           </div>
        </Card>
      </div>
    </div>
  );
};

export default Forecasting;