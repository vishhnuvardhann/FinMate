
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { AppData, FinancialItem } from '../types';

const generateDefaultData = (userId: string): AppData => ({
  userId,
  currency: 'INR',
  lastSynced: new Date().toISOString(),
  assets: [],
  liabilities: [],
  income: [],
  income: [],
  expenses: [],
  milestones: [],
  budgetPlans: [],
  forecast: {
    initial: 0,
    monthly: 0,
    rate: 12,
    years: 10
  }
});

export const DataService = {
  // Initialize data in Firestore if it doesn't exist
  initUser: async (userId: string) => {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      const defaultData = generateDefaultData(userId);
      await setDoc(docRef, defaultData);
    }

    // Check for recurring transactions upon init
    await DataService.checkRecurringTransactions(userId);
    // Check for recurring budget plans - DISABLED per user request for manual-only monthly entry
    // await DataService.checkRecurringBudgets(userId);
  },

  load: async (userId: string): Promise<AppData> => {
    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const parsed = docSnap.data() as Partial<AppData>;
        // Ensure defaults for new fields to prevent crashes
        const defaults = generateDefaultData(userId);
        return { ...defaults, ...parsed, userId };
      }
      // If doc missing for some reason, return default
      return generateDefaultData(userId);
    } catch (e) {
      console.error("Failed to load data from Firestore", e);
      return generateDefaultData(userId);
    }
  },

  save: async (data: AppData) => {
    try {
      // Update sync time
      data.lastSynced = new Date().toISOString();
      const docRef = doc(db, "users", data.userId);
      // We use set with merge to be safe
      await setDoc(docRef, data, { merge: true });
    } catch (e) {
      console.error("Failed to save data to Firestore", e);
    }
  },

  reset: async (userId: string) => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      const defaultData = generateDefaultData(userId);
      await DataService.save(defaultData);
      window.location.reload();
    }
  },

  // Logic to handle auto-adding recurring transactions for the new month
  checkRecurringTransactions: async (userId: string) => {
    const data = await DataService.load(userId);
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Check if we have any entries for the current month
    const hasCurrentMonthEntries = data.expenses.some(e => e.date.startsWith(currentMonthStr)) ||
      data.income.some(i => i.date.startsWith(currentMonthStr));

    if (!hasCurrentMonthEntries) {
      console.log('New month detected! Rolling over recurring items...');

      // Find items from the previous month (or any past recurring item that acts as a template)
      const recurringExpenses = data.expenses.filter(e => e.recurring);
      const recurringIncome = data.income.filter(i => i.recurring);

      // Helper to avoid duplicates
      const uniqueItems = new Map();
      [...recurringExpenses, ...recurringIncome].forEach(item => {
        if (!uniqueItems.has(item.name)) {
          uniqueItems.set(item.name, item);
        }
      });

      const newItems: FinancialItem[] = [];

      uniqueItems.forEach((item: FinancialItem) => {
        newItems.push({
          ...item,
          id: `${item.name}_${currentMonthStr}_${Date.now()}`,
          date: `${currentMonthStr}-01`, // Set to 1st of month
          recurring: true
        });
      });

      // Add to data
      if (newItems.length > 0) {
        newItems.forEach(item => {
          if (item.category === 'income') data.income.push(item);
          else data.expenses.push(item);
        });

        await DataService.save(data);
      }
    }
  },

  getNetWorth: (data: AppData) => {
    const totalAssets = data.assets.reduce((sum, item) => sum + item.amount, 0);
    const totalLiabilities = data.liabilities.reduce((sum, item) => sum + item.amount, 0);
    return totalAssets - totalLiabilities;
  },

  getMonthlyCashflow: (data: AppData, monthOffset: number = 0) => {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + monthOffset);
    const targetStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

    const totalIncome = data.income
      .filter(i => i.date.startsWith(targetStr))
      .reduce((sum, item) => sum + item.amount, 0);

    const totalExpenses = data.expenses
      .filter(i => i.date.startsWith(targetStr))
      .reduce((sum, item) => sum + item.amount, 0);

    return totalIncome - totalExpenses;
  },

  checkRecurringBudgets: async (userId: string) => {
    const data = await DataService.load(userId);
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Check if budget plan exists for current month
    const existingPlan = data.budgetPlans?.find(p => p.month === currentMonthStr);

    if (!existingPlan) {
      // Find latest previous plan
      const sortedPlans = [...(data.budgetPlans || [])].sort((a, b) => b.month.localeCompare(a.month));
      const latestPlan = sortedPlans[0];

      if (latestPlan && latestPlan.budgetItems) {
        const recurringItems = latestPlan.budgetItems.filter(item => item.recurring);

        if (recurringItems.length > 0) {
          const newPlan: import('../types').BudgetPlan = {
            month: currentMonthStr,
            // If we have recurring items, we likely want to keep the same overall budget ceiling, 
            // or at least a baseline. For now, let's carry over the total limit to be helpful.
            totalLimit: latestPlan.totalLimit,
            budgetItems: recurringItems.map(item => ({
              ...item,
              id: Math.random().toString(36).substr(2, 9) // New ID for new month instance
            }))
          };

          data.budgetPlans = [...(data.budgetPlans || []), newPlan];
          await DataService.save(data);
          console.log('Rolled over recurring budget items to', currentMonthStr);
        }
      }
    }
  }
};
