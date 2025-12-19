import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { DataService } from '../services/dataService';
import { AuthService } from '../services/authService';
import { AppData, BudgetPlan, FinancialItem, BudgetItem } from '../types';
import { formatCurrency } from '../utils/formatters';

const BudgetPlanner: React.FC = () => {
    const [data, setData] = useState<AppData | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [monthlyBudget, setMonthlyBudget] = useState<number>(0);

    // New State: List of detailed budget items
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);

    const [newCategory, setNewCategory] = useState('');
    const [newCategoryLimit, setNewCategoryLimit] = useState('');
    const [newCategoryDesc, setNewCategoryDesc] = useState('');
    const [sortOption, setSortOption] = useState<'name' | 'limit' | 'spent' | 'status'>('name');

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

            // Migration Logic: Convert old format to new format if needed
            if (existingPlan.budgetItems) {
                setBudgetItems(existingPlan.budgetItems);
            } else if (existingPlan.categoryLimits) {
                const migratedItems: BudgetItem[] = Object.entries(existingPlan.categoryLimits).map(([cat, limit]) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    category: cat,
                    limit: Number(limit), // Explicit cast to fix TS lint
                    description: existingPlan.categoryDescriptions?.[cat] || ''
                }));
                setBudgetItems(migratedItems);
            } else {
                setBudgetItems([]);
            }
        } else {
            setMonthlyBudget(0);
            setBudgetItems([]);
        }
    }, [data, currentDate]);

    const saveBudget = async (newTotal: number, newItems: BudgetItem[]) => {
        if (!data) return;

        const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const newPlan: BudgetPlan = {
            month: currentMonthStr,
            totalLimit: newTotal,
            budgetItems: newItems
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
        saveBudget(amount, budgetItems);
    };

    // Update a specific item's limit
    const handleItemLimitChange = (id: string, amount: number) => {
        const newItems = budgetItems.map(item => item.id === id ? { ...item, limit: amount } : item);
        setBudgetItems(newItems);
        saveBudget(monthlyBudget, newItems);
    };

    const handleManualAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory || !data) return;

        const newItem: BudgetItem = {
            id: Math.random().toString(36).substr(2, 9),
            category: newCategory,
            limit: parseFloat(newCategoryLimit) || 0,
            description: newCategoryDesc
        };

        const newItems = [...budgetItems, newItem];
        setBudgetItems(newItems);
        saveBudget(monthlyBudget, newItems);

        setNewCategory('');
        setNewCategoryLimit('');
        setNewCategoryDesc('');
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

    // Group items by Category for display logic
    // 1. Get all unique categories from expenses AND budget items
    const expenseCategories = new Set(data.expenses.map(e => e.subcategory).filter((c): c is string => !!c));
    const budgetCategories = new Set(budgetItems.map(i => i.category));
    const allCategories = Array.from(new Set([...Array.from(expenseCategories), ...Array.from(budgetCategories)]));

    // 2. Create aggregated data structure
    const categoryData = allCategories.map(cat => {
        const items = budgetItems.filter(i => i.category === cat);
        const totalLimit = items.reduce((sum, i) => sum + i.limit, 0);
        const spent = currentMonthExpenses.filter(e => e.subcategory === cat).reduce((sum, e) => sum + e.amount, 0);
        const isOver = totalLimit > 0 && spent > totalLimit;

        // Calculate status score for sorting
        const statusScore = totalLimit > 0 ? spent / totalLimit : 0;

        return { cat, items, totalLimit, spent, isOver, statusScore };
    });

    // 3. Sort
    const sortedCategoryData = categoryData.sort((a, b) => {
        switch (sortOption) {
            case 'limit': return b.totalLimit - a.totalLimit;
            case 'spent': return b.spent - a.spent;
            case 'status': return b.statusScore - a.statusScore;
            default: return (a.cat as string).localeCompare(b.cat as string); // Explicit string cast
        }
    });

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

                <Card title="Category Breakdown" className="h-fit">

                    {/* Add Category Form */}
                    <form onSubmit={handleManualAddCategory} className="mb-6 flex flex-col gap-2">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <input
                                    value={newCategory}
                                    onChange={e => setNewCategory(e.target.value)}
                                    placeholder="Category Name (e.g. Food)"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="w-24">
                                <input
                                    type="number"
                                    value={newCategoryLimit}
                                    onChange={e => setNewCategoryLimit(e.target.value)}
                                    placeholder="Limit"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition">
                                <i className="ri-add-line"></i>
                            </button>
                        </div>
                        {/* New Description Input */}
                        <div className="w-full">
                            <input
                                value={newCategoryDesc}
                                onChange={e => setNewCategoryDesc(e.target.value)}
                                placeholder="Description (e.g. Groceries)"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </form>

                    <div className="flex justify-between items-center mb-4">
                        <p className="text-xs text-gray-400">Manage category limits</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Sort by:</span>
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value as any)}
                                className="bg-white/5 border border-white/10 rounded text-xs px-2 py-1 text-gray-300 focus:outline-none hover:bg-white/10"
                            >
                                <option className="bg-slate-800" value="name">Name</option>
                                <option className="bg-slate-800" value="limit">Limit (High)</option>
                                <option className="bg-slate-800" value="spent">Spent (High)</option>
                                <option className="bg-slate-800" value="status">Over Budget</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {sortedCategoryData.length === 0 && <p className="text-sm text-gray-500 italic">No expense categories found. Add expenses to see them here.</p>}

                        {sortedCategoryData.map(({ cat, items, totalLimit, spent, isOver }) => {
                            // Calculate remaining or exceeded amount
                            const remaining = totalLimit - spent;
                            const diffAmount = Math.abs(remaining);

                            return (
                                <div key={cat} className="rounded-lg bg-white/5 border border-white/5 overflow-hidden transition">
                                    {/* Category Header */}
                                    <div className="p-3 bg-white/5 flex justify-between items-center">
                                        <div>
                                            <span className="font-medium text-white">{cat}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {totalLimit > 0 && (
                                                <span className={`text-xs px-2 py-0.5 rounded ${isOver ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                                    {isOver
                                                        ? `Exceeded: ${formatCurrency(diffAmount)}`
                                                        : `Remaining: ${formatCurrency(remaining)}`
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Combined Progress */}
                                    <div className="px-3 pb-3 pt-2">
                                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                                            <span>Spent: {formatCurrency(spent)}</span>
                                            <span>Limit: {formatCurrency(totalLimit)}</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${isOver ? 'bg-red-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${Math.min((spent / (totalLimit || 1)) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Detailed Items */}
                                    {items.length > 0 && (
                                        <div className="border-t border-white/5">
                                            {items.map(item => (
                                                <div key={item.id} className="flex justify-between items-center p-3 hover:bg-white/5 text-sm">
                                                    <span className="text-gray-300 pl-4 border-l-2 border-indigo-500/30">
                                                        {item.description || 'General'}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        value={item.limit || ''}
                                                        onChange={(e) => handleItemLimitChange(item.id, parseFloat(e.target.value) || 0)}
                                                        className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 w-24 text-right text-indigo-300 focus:border-indigo-500 focus:outline-none text-xs"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            {/* Transactions List */}
            <Card title="Monthly Transactions">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10 text-gray-400 text-sm">
                                <th className="pb-3 font-medium">Date</th>
                                <th className="pb-3 font-medium">Description</th>
                                <th className="pb-3 font-medium">Category</th>
                                <th className="pb-3 font-medium text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {currentMonthExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(item => (
                                <tr key={item.id} className="hover:bg-white/5 transition">
                                    <td className="py-3 text-gray-300 text-sm">{item.date}</td>
                                    <td className="py-3 text-white font-medium">{item.name}</td>
                                    <td className="py-3 text-gray-400 text-sm">
                                        <span className="px-2 py-1 rounded bg-white/5 border border-white/5">{item.subcategory}</span>
                                    </td>
                                    <td className="py-3 text-white text-right font-medium">{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}
                            {currentMonthExpenses.length === 0 && (
                                <tr><td colSpan={4} className="py-8 text-center text-gray-500 italic">No transactions found for this month.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

        </div>
    );
};

export default BudgetPlanner;
