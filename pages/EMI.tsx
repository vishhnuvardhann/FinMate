import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { DataService } from '../services/dataService';
import { AuthService } from '../services/authService';
import { AppData, EMI as EMIInterface } from '../types';
import { formatCurrency } from '../utils/formatters';

const EMI: React.FC = () => {
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

  const handleTogglePaid = async (id: string) => {
    if (!data) return;
    const updatedData = { ...data };
    const emi = updatedData.emis.find(e => e.id === id);
    if (emi) {
      emi.isPaid = !emi.isPaid;
      setData(updatedData);
      await DataService.save(updatedData);
    }
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!data) return;
    const formData = new FormData(e.currentTarget);
    const item: EMIInterface = {
      id: Date.now().toString(),
      userId: data.userId,
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string),
      dueDate: parseInt(formData.get('date') as string),
      isPaid: false
    };

    const updatedData = { ...data };
    updatedData.emis.push(item);
    setData(updatedData);
    await DataService.save(updatedData);
    (e.target as HTMLFormElement).reset();
  };
  
  const handleDelete = async (id: string) => {
     if (!data) return;
     const updatedData = { ...data };
     updatedData.emis = updatedData.emis.filter(e => e.id !== id);
     setData(updatedData);
     await DataService.save(updatedData);
  }

  if (!data) return null;

  const currentDay = new Date().getDate();
  const sortedEMIs = [...data.emis].sort((a, b) => a.dueDate - b.dueDate);
  const totalMonthly = data.emis.reduce((sum, e) => sum + e.amount, 0);
  const paidAmount = data.emis.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Recurring Bills & EMIs</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-900/40 to-slate-900/40">
           <p className="text-gray-400 font-medium">Total Monthly Obligations</p>
           <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(totalMonthly)}</h3>
           <div className="mt-4 w-full bg-gray-700 h-2 rounded-full overflow-hidden">
             <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${totalMonthly > 0 ? (paidAmount/totalMonthly)*100 : 0}%` }}></div>
           </div>
           <p className="text-xs text-purple-300 mt-2">{totalMonthly > 0 ? (paidAmount/totalMonthly*100).toFixed(0) : 0}% Paid this month</p>
        </Card>

        <Card title="Add New Bill" className="lg:col-span-2">
          <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-1 w-full">
               <label className="text-xs text-gray-400">Bill Name</label>
               <input name="name" required className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white" placeholder="e.g. Netflix" />
             </div>
             <div className="w-full md:w-32">
               <label className="text-xs text-gray-400">Amount (₹)</label>
               <input name="amount" type="number" step="0.01" required className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white" placeholder="0.00" />
             </div>
             <div className="w-full md:w-32">
               <label className="text-xs text-gray-400">Due Day (1-31)</label>
               <input name="date" type="number" min="1" max="31" required className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white" placeholder="DD" />
             </div>
             <button className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded font-medium">Add</button>
          </form>
        </Card>
      </div>

      <Card title="Upcoming Payments">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-white/10">
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Bill Name</th>
                <th className="py-3 px-2">Due Date</th>
                <th className="py-3 px-2 text-right">Amount</th>
                <th className="py-3 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedEMIs.map((emi) => {
                const isOverdue = !emi.isPaid && currentDay > emi.dueDate;
                return (
                  <tr key={emi.id} className="hover:bg-white/5 transition">
                    <td className="py-4 px-2">
                       <button onClick={() => handleTogglePaid(emi.id)} className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${emi.isPaid ? 'bg-green-500 border-green-500 text-white' : 'border-gray-500 text-transparent hover:border-green-500'}`}>
                         <i className="ri-check-line"></i>
                       </button>
                    </td>
                    <td className="py-4 px-2 font-medium text-white">{emi.name}</td>
                    <td className="py-4 px-2">
                      <span className={`px-2 py-1 rounded text-xs ${isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-300'}`}>
                        {currentDay > emi.dueDate ? 'Past due' : 'Due'} on {emi.dueDate}th
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right font-bold text-white">{formatCurrency(emi.amount)}</td>
                    <td className="py-4 px-2 text-right">
                       <button onClick={() => handleDelete(emi.id)} className="text-gray-500 hover:text-red-400"><i className="ri-delete-bin-line"></i></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default EMI;