import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import BrandVoiceForm from './components/BrandVoiceForm';
import PostGenerator from './components/PostGenerator';
import ContentCalendar from './components/ContentCalendar';
import AdminDashboard from './components/AdminDashboard';
import Auth from './components/Auth';
import { getToken, setToken } from './api';
import { AnimatePresence } from 'framer-motion';
import PageWrapper from './components/PageWrapper';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Secret admin route: navigate to /#/admin in browser
  useEffect(() => {
    if (getToken()) {
      setIsAuthenticated(true);
    }
    if (window.location.hash === '#/admin') {
      setActiveTab('admin');
    }
  }, []);

  const handleLogout = () => {
    setToken(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <header className="bg-white shadow-sm border-b border-gray-100 py-4 px-6 mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 inline-block">
            AI Content Creator
          </h1>
        </header>
        <Auth onAuthSuccess={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            AI Content Creator
          </h1>
          <nav className="flex space-x-2 bg-gray-50 p-1 rounded-lg border border-gray-100 shadow-sm">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Дашборд
            </button>
            <button
              onClick={() => setActiveTab('brand')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${activeTab === 'brand' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Стиль Бренда
            </button>
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${activeTab === 'generator' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Генератор ИИ
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-md font-medium text-sm text-red-500 hover:bg-red-50 transition-all duration-200"
            >
              Выйти
            </button>
          </nav>
        </div>
      </header>
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <PageWrapper key={activeTab}>
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'brand' && <BrandVoiceForm />}
              {activeTab === 'generator' && <PostGenerator onNavigate={(tab) => setActiveTab(tab)} />}
              {activeTab === 'calendar' && <ContentCalendar />}
              {activeTab === 'admin' && <AdminDashboard />}
            </PageWrapper>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;
