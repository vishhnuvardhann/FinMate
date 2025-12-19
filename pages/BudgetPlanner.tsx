import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { DataService } from '../services/dataService';
import { AuthService } from '../services/authService';
import { AppData, BudgetPlan, FinancialItem } from '../types';
import { formatCurrency } from '../utils/formatters';

const BudgetPlanner: React.FC = () => {
    const [data, setData] = useState<AppData | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
    // Category limits state: Map category name -> limit amount
    const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>({});

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

    // Update local state when data or date changes
    useEffect(() => {
        if (!data) return;
        const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        // Find existing plan or use default
        const existingPlan = data.budgetPlans?.find(p => p.month === currentMonthStr);

        if (existingPlan) {
            setMonthlyBudget(existingPlan.totalLimit);
            setCategoryLimits(existingPlan.categoryLimits || {});
        } else {
            setMonthlyBudget(0);
            setCategoryLimits({});
        }
    }, [data, currentDate]);

    const saveBudget = async (newTotal: number, newCategoryLimits: Record<string, number>) => {
        if (!data) return;

        const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const newPlan: BudgetPlan = {
            month: currentMonthStr,
            totalLimit: newTotal,
            categoryLimits: newCategoryLimits
        };

        const updatedPlans = data.budgetPlans ? [...data.budgetPlans] : [];
        const index = updatedPlans.findIndex(p => p.month === currentMonthStr);

        if (index >= 0) {
            updatedPlans[index] = newPlan;
        } else {
            updatedPlans.push(newPlan);
        }

        const updatedData = { ...data, budgetPlans: updatedPlans };
        setData(updatedData);
        await DataService.save(updatedData);
    };

    const handleTotalBudgetChange = (amount: number) => {
        setMonthlyBudget(amount);
        saveBudget(amount, categoryLimits);
    };

    const handleCategoryLimitChange = (category: string, amount: number) => {
        const newLimits = { ...categoryLimits, [category]: amount };
        setCategoryLimits(newLimits);
        saveBudget(monthlyBudget, newLimits);
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    if (!data) return null;

    const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Calculate Actuals
    const currentMonthExpenses = data.expenses.filter(e => e.date.startsWith(currentMonthStr));
    const totalActualExpense = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Get unique categories from history
    const allCategories = Array.from(new Set(data.expenses.map(e => e.subcategory).filter((c): c is string => !!c))).sort();

    return (
        <div className="space-y-6">
            {/* Header & Date Picker */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">Budget Planner</h2>
                    <p className="text-gray-400">Plan and track your monthly spending limits</p>
                </div>

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

            {/* Main Budget Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Monthly Overview" className="h-fit">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Total Monthly Budget</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                                <input
                                    type="number"
                                    value={monthlyBudget || ''}
                                    onChange={(e) => handleTotalBudgetChange(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-xl font-bold text-white focus:outline-none focus:border-indigo-500 transition"
                                    placeholder="Set your limit..."
                                />
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-300">Spent so far</span>
                                <span className="text-white font-medium">{formatCurrency(totalActualExpense)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-300">Remaining</span>
                                <span className={`font-medium ${monthlyBudget - totalActualExpense < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {formatCurrency(monthlyBudget - totalActualExpense)}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-4 bg-gray-700 rounded-full overflow-hidden mt-2 relative">
                                <div
                                    className={`h-full transition-all duration-500 ${totalActualExpense > monthlyBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min((totalActualExpense / (monthlyBudget || 1)) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-center text-gray-400 mt-1">
                                {monthlyBudget > 0 ? `${Math.round((totalActualExpense / monthlyBudget) * 100)}% of budget used` : 'No budget set'}
                            </p>
                        </div>

                        {/* Status Indicator */}
                        {monthlyBudget > 0 && (
                            <div className={`p-4 rounded-xl border flex items-center gap-3 ${totalActualExpense > monthlyBudget ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                                <i className={`text-2xl ${totalActualExpense > monthlyBudget ? 'ri-alarm-warning-line text-red-400' : 'ri-checkbox-circle-line text-emerald-400'}`}></i>
                                <div>
                                    <h4 className={`font-bold ${totalActualExpense > monthlyBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {totalActualExpense > monthlyBudget ? 'Budget Exceeded' : 'On Track'}
                                    </h4>
                                    <p className="text-xs text-gray-400">
                                        {totalActualExpense > monthlyBudget
                                            ? `You have exceeded your budget by ${formatCurrency(totalActualExpense - monthlyBudget)}`
                                            : `You show savings of ${formatCurrency(monthlyBudget - totalActualExpense)}`
                                        }
                                    </p>
                                </div>
                            </div>
                        )}

                    </div>
                </Card>

                <Card title="Category Breakdown (A-Z)" className="h-fit">
                    <p className="text-xs text-gray-400 mb-4">Set specific limits for each category to better manage expenses.</p>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {allCategories.length === 0 && <p className="text-sm text-gray-500 italic">No expense categories found. Add expenses to see them here.</p>}

                        {allCategories.map(cat => {
                            const limit = categoryLimits[cat] || 0;
                            const spent = currentMonthExpenses.filter(e => e.subcategory === cat).reduce((sum, e) => sum + e.amount, 0);
                            const isOver = limit > 0 && spent > limit;

                            return (
                                <div key={cat} className="p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-white">{cat}</span>
                                        {limit > 0 && (
                                            <span className={`text-xs px-2 py-0.5 rounded ${isOver ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                                {isOver ? 'Over Limit' : 'Good'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                <span>Spent: {formatCurrency(spent)}</span>
                                                <input
                                                    type="number"
                                                    placeholder="Set Limit"
                                                    value={limit || ''}
                                                    onChange={(e) => handleCategoryLimitChange(cat, parseFloat(e.target.value) || 0)}
                                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 w-24 text-right text-indigo-300 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${isOver ? 'bg-red-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${Math.min((spent / (limit || 1)) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

        </div>
    );
};

export default BudgetPlanner;
