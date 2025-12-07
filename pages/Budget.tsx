import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { DataService } from '../services/dataService';
import { AuthService } from '../services/authService';
import { AppData, FinancialItem } from '../types';
import { formatCurrency } from '../utils/formatters';

const Budget: React.FC = () => {
  const [data, setData] = useState<AppData | null>(null);
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

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

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!data) return;
    
    const formData = new FormData(e.currentTarget);
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    
    const newItem: FinancialItem = {
      id: Date.now().toString(),
      userId: data.userId,
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string),
      category: activeTab,
      subcategory: formData.get('subcategory') as string,
      icon: activeTab === 'income' ? 'ri-money-dollar-circle-line' : 'ri-shopping-bag-line',
      date: dateStr,
      recurring: formData.get('recurring') === 'on'
    };

    const updatedData = { ...data };
    if (activeTab === 'income') {
      updatedData.income.push(newItem);
    } else {
      updatedData.expenses.push(newItem);
    }

    setData(updatedData); // Optimistic update
    await DataService.save(updatedData);
    (e.target as HTMLFormElement).reset();
  };

  const handleDelete = async (id: string, type: 'income' | 'expense') => {
    if (!data) return;
    const updatedData = { ...data };
    if (type === 'income') {
      updatedData.income = updatedData.income.filter(i => i.id !== id);
    } else {
      updatedData.expenses = updatedData.expenses.filter(i => i.id !== id);
    }
    setData(updatedData); // Optimistic update
    await DataService.save(updatedData);
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  }

  if (!data) return null;

  // Filter Data by Month
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const filteredIncome = data.income.filter(i => i.date.startsWith(currentMonthStr));
  const filteredExpenses = data.expenses.filter(i => i.date.startsWith(currentMonthStr));

  const totalIncome = filteredIncome.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = filteredExpenses.reduce((sum, i) => sum + i.amount, 0);
  const balance = totalIncome - totalExpense;

  const listItems = activeTab === 'income' ? filteredIncome : filteredExpenses;
  const displayedItems = listItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.subcategory === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <h2 className="text-3xl font-bold text-white">Budget Worksheet</h2>
         
         {/* Month Navigation */}
         <div className="flex items-center gap-4 bg-white/5 rounded-xl p-2 border border-white/10">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-lg transition text-gray-300 hover:text-white">
              <i className="ri-arrow-left-s-line text-xl"></i>
            </button>
            <span className="text-lg font-semibold w-32 text-center text-white">
              {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
            </span>
             <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-lg transition text-gray-300 hover:text-white">
              <i className="ri-arrow-right-s-line text-xl"></i>
            </button>
         </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-900/20 border-emerald-500/20">
          <p className="text-emerald-400 text-sm font-medium uppercase">Income ({currentDate.toLocaleDateString('default', {month:'short'})})</p>
          <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(totalIncome)}</h3>
        </Card>
        <Card className="bg-rose-900/20 border-rose-500/20">
          <p className="text-rose-400 text-sm font-medium uppercase">Expenses ({currentDate.toLocaleDateString('default', {month:'short'})})</p>
          <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(totalExpense)}</h3>
        </Card>
        <Card className="bg-blue-900/20 border-blue-500/20">
          <p className="text-blue-400 text-sm font-medium uppercase">Balance</p>
          <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(balance)}</h3>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card title={`Add ${activeTab === 'income' ? 'Income' : 'Expense'}`} className="h-fit">
          <div className="flex gap-2 p-1 bg-white/5 rounded-lg mb-6">
            <button 
              onClick={() => setActiveTab('expense')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${activeTab === 'expense' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Expenses
            </button>
            <button 
              onClick={() => setActiveTab('income')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${activeTab === 'income' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Income
            </button>
          </div>

          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
              <input name="name" required className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition" placeholder="e.g. Salary, Rent..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Amount (₹)</label>
              <input name="amount" type="number" step="0.01" required className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition" placeholder="0.00" />
            </div>
            {activeTab === 'expense' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                <select name="subcategory" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition">
                  <option className="bg-slate-800" value="Housing">Housing</option>
                  <option className="bg-slate-800" value="Food">Food</option>
                  <option className="bg-slate-800" value="Utilities">Utilities</option>
                  <option className="bg-slate-800" value="Transport">Transport</option>
                  <option className="bg-slate-800" value="Entertainment">Entertainment</option>
                  <option className="bg-slate-800" value="Health">Health</option>
                  <option className="bg-slate-800" value="Other">Other</option>
                </select>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <input type="checkbox" name="recurring" id="recurring" className="w-4 h-4 rounded border-gray-600 bg-white/5 text-indigo-600 focus:ring-indigo-500" />
              <label htmlFor="recurring" className="text-sm text-gray-300">Recurring (Auto-add next month)</label>
            </div>

            <button type="submit" className={`w-full py-2 rounded-lg font-medium text-white shadow-lg transition transform hover:scale-[1.02] ${activeTab === 'income' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
              Add to {currentDate.toLocaleDateString('default', { month: 'long' })}
            </button>
          </form>
        </Card>

        {/* List & Filters */}
        <Card className="lg:col-span-2">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
             <h3 className="text-lg font-semibold text-white">{activeTab === 'income' ? 'Income Sources' : 'Expenses'}</h3>
             
             <div className="flex gap-2 w-full md:w-auto">
               <div className="relative flex-1 md:w-48">
                 <i className="ri-search-line absolute left-3 top-2.5 text-gray-500"></i>
                 <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                 />
               </div>
               {activeTab === 'expense' && (
                 <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                 >
                    <option className="bg-slate-800" value="All">All Categories</option>
                    <option className="bg-slate-800" value="Housing">Housing</option>
                    <option className="bg-slate-800" value="Food">Food</option>
                    <option className="bg-slate-800" value="Utilities">Utilities</option>
                    <option className="bg-slate-800" value="Transport">Transport</option>
                 </select>
               )}
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-sm">
                  <th className="pb-3 font-medium">Description</th>
                  {activeTab === 'expense' && <th className="pb-3 font-medium">Category</th>}
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {displayedItems.map((item) => (
                  <tr key={item.id} className="group hover:bg-white/5 transition">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${activeTab === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          <i className={item.icon || 'ri-money-dollar-circle-line'}></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-200">{item.name}</p>
                          {item.recurring && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20">Recurring</span>}
                        </div>
                      </div>
                    </td>
                    {activeTab === 'expense' && (
                      <td className="py-4 text-gray-400 text-sm">
                        <span className="px-2 py-1 rounded bg-white/5 border border-white/5">{item.subcategory}</span>
                      </td>
                    )}
                    <td className="py-4 text-right font-medium text-white">{formatCurrency(item.amount)}</td>
                    <td className="py-4 text-right">
                      <button onClick={() => handleDelete(item.id, activeTab)} className="text-gray-500 hover:text-red-400 transition p-2">
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {displayedItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500 italic">
                      No items found for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Budget;