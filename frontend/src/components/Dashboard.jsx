import React, { useState, useEffect } from 'react';
import ContentCalendar from './ContentCalendar';
import { useWebSocket } from '../hooks/useWebSocket';
import { getMe, getPosts, syncCloud, getTelegramConfig } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, BookMarked, FileText, Cloud, Send, Settings, CheckCircle2, AlertCircle, Loader2, RefreshCw, TrendingUp, Copy } from 'lucide-react';

/* ─── Inline style helpers ─── */
const cardBase = {
    borderRadius: 16, padding: 24,
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'border-color 0.25s, box-shadow 0.25s',
};

const isAssembled = (p) => p.image_url && p.content;

const STAT_DEFS = [
    {
        label: 'Запланировано',
        key: 'planned_posts',
        Icon: CalendarDays,
        accent: '#6366f1',
        glow: 'rgba(99,102,241,0.15)',
        bg: 'linear-gradient(135deg,#0f1030 0%,#101624 100%)',
        bar: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
    },
    {
        label: 'Черновики',
        key: 'draft_posts',
        Icon: FileText,
        accent: '#06b6d4',
        glow: 'rgba(6,182,212,0.15)',
        bg: 'linear-gradient(135deg,#061a25 0%,#101624 100%)',
        bar: 'linear-gradient(90deg,#06b6d4,#3b82f6)',
    },
    {
        label: 'Опубликовано',
        key: 'published_posts',
        Icon: CheckCircle2,
        accent: '#10b981',
        glow: 'rgba(16,185,129,0.12)',
        bg: 'linear-gradient(135deg,#061a12 0%,#101624 100%)',
        bar: 'linear-gradient(90deg,#10b981,#06b6d4)',
    },
];

function StatCard({ label, value, Icon, accent, glow, bg, bar, animate }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            style={{
                ...cardBase,
                background: bg,
                borderColor: hovered ? `${accent}33` : 'rgba(255,255,255,0.06)',
                boxShadow: hovered ? `0 0 32px -8px ${glow}` : 'none',
                cursor: 'default',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Icon + Label */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(107,128,168,0.8)' }}>{label}</span>
                <div style={{ padding: 8, borderRadius: 10, background: `${accent}18`, border: `1px solid ${accent}28` }}>
                    <Icon size={16} style={{ color: accent }} />
                </div>
            </div>

            {/* Value */}
            <div style={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#e8eeff', lineHeight: 1, marginBottom: 14 }}>
                {animate ? value : value}
            </div>

            {/* Color bar */}
            <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(8, value * 10))}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 99, background: bar }}
                />
            </div>
        </div>
    );
}

function IntegrationRow({ Icon, iconColor, iconBg, title, subtitle, action }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ padding: 8, borderRadius: 10, background: iconBg, flexShrink: 0 }}>
                <Icon size={16} style={{ color: iconColor }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 500, fontSize: '0.875rem', color: '#e8eeff', marginBottom: 1 }}>{title}</p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(107,128,168,0.7)' }}>{subtitle}</p>
            </div>
            {action}
        </div>
    );
}

function Btn({ children, onClick, disabled, style = {}, secondary = false }) {
    const [hov, setHov] = useState(false);
    const base = secondary
        ? { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(107,128,168,0.9)' }
        : { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', boxShadow: '0 4px 16px -4px rgba(99,102,241,0.35)' };
    const hoverStyle = secondary
        ? { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.16)', color: '#e8eeff' }
        : { opacity: 0.88, boxShadow: '0 6px 24px -4px rgba(99,102,241,0.5)' };
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            style={{ ...base, ...(hov ? hoverStyle : {}), ...style, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 500, fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'all 0.2s' }}
            onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        >
            {children}
        </button>
    );
}

export default function Dashboard({ onNavigate }) {
    const [user, setUser] = useState(null);
    const [autoMetrics, setAutoMetrics] = useState({ planned_posts: 0, draft_posts: 0, published_posts: 0 });
    const [syncing, setSyncing] = useState(false);
    const [toast, setToast] = useState(null);
    const [calendarKey, setCalendarKey] = useState(0);
    const [telegramConfig, setTelegramConfig] = useState(null);

    useWebSocket({
        'NEW_POST': () => {
            console.log('WS: New post received, reloading...');
            loadData(false);
            setCalendarKey(k => k + 1);
        },
        'POST_UPDATED': () => {
            console.log('WS: Post updated, reloading...');
            loadData(false);
            setCalendarKey(k => k + 1);
        }
    });

    useEffect(() => {
        loadData();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadData(false);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const loadData = async (showLoaders = true) => {
        try {
            const data = await getMe();
            setUser(data);
            const postsData = await getPosts();
            const m = {
                planned_posts: postsData.filter(p => p.publish_date && p.publish_date !== 'null' && p.publish_date !== '' && !p.is_published).length,
                draft_posts: postsData.filter(p => (!p.publish_date || p.publish_date === 'null' || p.publish_date === '') && !p.is_published).length,
                published_posts: postsData.filter(p => p.is_published).length
            };
            setAutoMetrics(m);

            const tgData = await getTelegramConfig().catch(() => null);
            setTelegramConfig(tgData);
        } catch (err) { console.error(err); }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await syncCloud();
            setToast({ message: `Синхронизировано: ${res.synced_texts} текст., ${res.synced_images} фото`, type: 'success' });
            loadData(); setCalendarKey(k => k + 1);
        } catch (err) {
            const cfg = err.message.includes('настроена');
            setToast({ message: err.message, type: 'error', action: cfg ? { label: 'Настроить', onClick: () => onNavigate?.('profile') } : null });
        } finally {
            setSyncing(false);
            setTimeout(() => setToast(null), 6000);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ marginBottom: 4 }}>{user ? `Привет, ${user.name || user.username}` : 'Дашборд'}</h1>
                    <p style={{ color: 'rgba(107,128,168,0.8)', fontSize: '0.875rem' }}>Обзор контент-стратегии</p>
                </div>
                <Btn secondary onClick={loadData}><RefreshCw size={14} /> Обновить</Btn>
            </div>

            {/* ── Bento: Stats ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%, 180px),1fr))',
                gap: 16
            }}>
                {STAT_DEFS.map(s => <StatCard key={s.key} {...s} value={autoMetrics[s.key]} animate />)}
            </div>

            {/* ── Bento: Integrations + Calendar ── */}
            <div className="dashboard-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
                gap: 16,
                alignItems: 'start'
            }}>
                {/* Integrations card */}
                <div style={{ ...cardBase, background: '#101624', display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <h3 style={{ marginBottom: 8 }}>Интеграции</h3>
                    <IntegrationRow
                        Icon={Cloud} iconColor="#6366f1" iconBg="rgba(99,102,241,0.12)"
                        title="Яндекс.Диск" subtitle="Ссылка в профиле"
                        action={
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Btn onClick={handleSync} disabled={syncing}>
                                    {syncing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Cloud size={14} />}
                                    {syncing ? 'Синхр...' : 'Синхронизировать'}
                                </Btn>
                                {onNavigate && <Btn secondary onClick={() => onNavigate('profile')}><Settings size={14} /></Btn>}
                            </div>
                        }
                    />
                    <IntegrationRow
                        Icon={Send} iconColor="#06b6d4" iconBg="rgba(6,182,212,0.12)"
                        title="Telegram Бот" subtitle={telegramConfig?.channel_id ? `Привязан канал: ${telegramConfig.channel_id}` : (telegramConfig?.auth_code ? `Код: ${telegramConfig.auth_code}` : "Загрузка...")}
                        action={
                            telegramConfig?.auth_code && !telegramConfig?.channel_id ? (
                                <Btn secondary onClick={() => navigator.clipboard.writeText(telegramConfig.auth_code).then(() => setToast({ message: 'ПИН-код скопирован!', type: 'success' }))}>
                                    <Copy size={14} /> Взять ПИН
                                </Btn>
                            ) : null
                        }
                    />
                    <IntegrationRow
                        Icon={TrendingUp} iconColor="#10b981" iconBg="rgba(16,185,129,0.12)"
                        title="Аналитика" subtitle="Метрики активны"
                        action={null}
                    />
                </div>

                {/* Calendar card */}
                <div style={{ ...cardBase, background: 'linear-gradient(145deg,#0e1222 0%,#101624 100%)' }}>
                    <h3 style={{ marginBottom: 16 }}>Контент-Календарь</h3>
                    <ContentCalendar key={calendarKey} compact onLoad={() => loadData(false)} />
                </div>
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 60, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 60, x: '-50%' }}
                        style={{ position: 'fixed', bottom: 32, left: '50%', zIndex: 50, padding: '12px 20px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', fontWeight: 500, background: '#141b2d', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={16} style={{ color: '#10b981' }} /> : <AlertCircle size={16} style={{ color: '#f43f5e' }} />}
                        <span style={{ color: '#e8eeff' }}>{toast.message}</span>
                        {toast.action && <button onClick={() => { toast.action.onClick(); setToast(null); }} style={{ marginLeft: 4, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'underline' }}>{toast.action.label}</button>}
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </motion.div>
    );
}
