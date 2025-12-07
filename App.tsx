import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Budget from './pages/Budget';
import BalanceSheet from './pages/BalanceSheet';
import Forecasting from './pages/Forecasting';
import EMI from './pages/EMI';
import Reports from './pages/Reports';
import Login from './pages/Login';
import { AuthService } from './services/authService';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for firebase auth to initialize
    const unsubscribe = AuthService.subscribeToAuth((user) => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-gray-400">Connecting to FinMate Cloud...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/balance" element={<BalanceSheet />} />
          <Route path="/forecasting" element={<Forecasting />} />
          <Route path="/emis" element={<EMI />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;