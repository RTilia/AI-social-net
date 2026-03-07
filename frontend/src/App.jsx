import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import PostGenerator from './components/PostGenerator';
import ContentCalendar from './components/ContentCalendar';
import AdminDashboard from './components/AdminDashboard';
import Profile from './components/Profile';
import Auth from './components/Auth';
import { getToken, setToken } from './api';
import { AnimatePresence, motion } from 'framer-motion';
import PageWrapper from './components/PageWrapper';
import { LayoutDashboard, Sparkles, User, LogOut, CalendarDays, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Дашборд', Icon: LayoutDashboard, color: '#6366f1' },
  { id: 'generator', label: 'Генератор', Icon: Sparkles, color: '#8b5cf6' },
  { id: 'calendar', label: 'Календарь', Icon: CalendarDays, color: '#10b981' },
  { id: 'profile', label: 'Кабинет', Icon: User, color: '#f43f5e' },
  { id: 'admin', label: 'Админ', Icon: Settings, color: '#94a3b8' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- Global Generator State ---
  const [generatorState, setGeneratorState] = useState({
    theme: '', tone: 'Professional', audience: '', length: 'Medium',
    result: null, loading: false, saved: false, loadedBrand: false
  });

  useEffect(() => {
    if (getToken()) setIsAuthenticated(true);
    if (window.location.hash === '#/admin') setActiveTab('admin');
  }, []);

  const handleLogout = () => { setToken(null); setIsAuthenticated(false); };
  const activeItem = NAV_ITEMS.find(n => n.id === activeTab);

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 24px', textAlign: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#e8eeff' }}>
            AI <span style={{ background: 'linear-gradient(90deg,#6366f1,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Content</span> Studio
          </span>
        </header>
        <Auth onAuthSuccess={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Top Nav ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backgroundColor: 'rgba(6,9,18,0.85)',
        backdropFilter: 'blur(16px)',
        display: 'var(--desktop-header-display, flex)',
      }}>
        <style>{`
          @media (max-width: 768px) {
            :root { --desktop-header-display: none; --mobile-nav-display: flex; --main-padding-bottom: 80px; }
          }
          @media (min-width: 769px) {
            :root { --desktop-header-display: flex; --mobile-nav-display: none; --main-padding-bottom: 32px; }
          }
        `}</style>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 56, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em', color: '#e8eeff', userSelect: 'none' }}>
            AI{' '}
            <span style={{ background: 'linear-gradient(90deg,#6366f1,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Content</span>
            {' '}Studio
          </span>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(13,16,32,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '5px' }}>
            {NAV_ITEMS.map(({ id, label, Icon, color }) => {
              const active = activeTab === id;
              return (
                <button key={id} onClick={() => setActiveTab(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: '0.8125rem', fontWeight: 500, fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  background: active ? `${color}22` : 'transparent',
                  color: active ? color : 'rgba(107,128,168,0.9)',
                  boxShadow: active ? `inset 0 0 0 1px ${color}44` : 'none',
                }}>
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              );
            })}
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
            <button onClick={handleLogout} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: '0.8125rem', fontWeight: 500, fontFamily: 'inherit',
              background: 'transparent', color: 'rgba(107,128,168,0.7)',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fb7185'; e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(107,128,168,0.7)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={14} />
              <span>Выйти</span>
            </button>
          </nav>
        </div>

        {/* Active tab gradient underline */}
        {activeItem && (
          <motion.div
            layoutId="tab-accent"
            style={{ height: 2, background: `linear-gradient(90deg,transparent,${activeItem.color},transparent)`, opacity: 0.6 }}
          />
        )}
      </header>

      {/* ── Mobile Bottom Nav ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        display: 'var(--mobile-nav-display, none)',
        background: 'rgba(12,16,32,0.9)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '8px 12px 24px', // Extra padding for safe areas
        justifyContent: 'space-around',
        alignItems: 'center'
      }}>
        {NAV_ITEMS.map(({ id, label, Icon, color }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: active ? color : 'rgba(107,128,168,0.6)',
              transition: 'all 0.2s',
              flex: 1
            }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                padding: '6px 16px',
                borderRadius: 16,
                background: active ? `${color}15` : 'transparent'
              }}>
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: active ? 700 : 500 }}>{label}</span>
            </button>
          );
        })}
      </nav>


      {/* ── Content ── */}
      <main style={{ padding: '20px 0 var(--main-padding-bottom, 32px)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 var(--side-padding, 24px)' }}>
          <AnimatePresence mode="wait">
            <PageWrapper key={activeTab}>
              {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
              {activeTab === 'generator' && <PostGenerator onNavigate={(tab) => setActiveTab(tab)} generatorState={generatorState} setGeneratorState={setGeneratorState} />}
              {activeTab === 'calendar' && <ContentCalendar />}
              {activeTab === 'profile' && <Profile />}
              {activeTab === 'admin' && <AdminDashboard />}
            </PageWrapper>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
