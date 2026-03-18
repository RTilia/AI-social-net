import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { API_URL, getToken } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Brain, ShieldCheck, List, Timer, Target, BarChart3, ChevronRight } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

const cardBase = {
    borderRadius: 20, padding: 24,
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

function KpiCard({ label, value, target, good, icon: Icon, color, desc }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            style={{
                ...cardBase,
                background: hovered ? 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' : 'rgba(255,255,255,0.02)',
                borderColor: hovered ? `${color}44` : 'rgba(255,255,255,0.06)',
                boxShadow: hovered ? `0 20px 40px -20px ${color}22` : 'none',
                transform: hovered ? 'translateY(-4px)' : 'none',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ padding: 10, borderRadius: 12, background: `${color}15`, border: `1px solid ${color}25` }}>
                    <Icon size={20} style={{ color }} />
                </div>
                <div style={{
                    fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                    background: good ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: good ? '#4ade80' : '#f87171',
                    border: `1px solid ${good ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                }}>
                    Цель: {target}
                </div>
            </div>

            <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'rgba(107,128,168,0.8)', marginBottom: 4 }}>{label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#e8eeff', letterSpacing: '-0.02em' }}>{value}</span>
                {good && <ShieldCheck size={16} style={{ color: '#4ade80' }} />}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'rgba(107,128,168,0.6)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={12} /> {desc}
            </p>
        </div>
    );
}


function AdminDashboard() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useWebSocket({
        'METRICS_UPDATED': () => {
            console.log('WS: Metrics updated, reloading...');
            fetchMetrics();
        }
    });

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const token = getToken();
            const res = await fetch(`${API_URL}/api/admin/metrics`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            setMetrics(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const chartData = metrics?.last_posts?.filter(p => p.generation_time_seconds != null).map((p, idx) => ({
        name: `Post #${p.id}`,
        "Время (сек)": p.generation_time_seconds,
        "CLIP Score": p.clip_score,
        "Perplexity": p.perplexity,
    })) ?? [];

    const kpiCards = [
        {
            label: "Ср. Время Генерации",
            value: metrics?.avg_generation_time != null ? `${metrics.avg_generation_time}с` : "—",
            target: "< 30с",
            good: metrics?.avg_generation_time != null && metrics.avg_generation_time < 30,
            icon: Timer,
            color: '#6366f1',
            desc: "Скорость ответа ИИ пайплайна",
        },
        {
            label: "Ср. CLIP Score",
            value: metrics?.avg_clip_score != null ? `${metrics.avg_clip_score}` : "—",
            target: "> 75.0",
            good: metrics?.avg_clip_score != null && metrics.avg_clip_score > 75,
            icon: Target,
            color: '#10b981',
            desc: "Консистентность текст-визуал",
        },
        {
            label: "Ср. Perplexity",
            value: metrics?.avg_perplexity != null ? `${metrics.avg_perplexity}` : "—",
            target: "< 25.0",
            good: metrics?.avg_perplexity != null && metrics.avg_perplexity < 25,
            icon: Brain,
            color: '#f59e0b',
            desc: "Естественность и читаемость",
        },
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="text-4xl">⚙️</div>
                    <div className="text-gray-500 text-lg">Загрузка метрик...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-red-600 bg-red-50 rounded-xl">
                Ошибка загрузки метрик: {error}
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#060912', color: '#e8eeff' }}>
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ maxWidth: 1200, margin: '0 auto' }}
                >
                    {/* Header Section */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 20,
                        marginBottom: 40,
                        padding: '0 4px'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <div style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', padding: 8, borderRadius: 12, display: 'flex' }}>
                                    <ShieldCheck size={24} color="white" />
                                </div>
                                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                                    Панель <span style={{ color: '#8b5cf6' }}>Администратора</span>
                                </h1>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'rgba(107,128,168,0.7)', margin: 0, paddingLeft: 4 }}>
                                Глобальный мониторинг качества и производительности системы
                            </p>
                        </div>

                        <div style={{ textAlign: 'right', minWidth: 'fit-content' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e8eeff' }}>{metrics?.total_posts ?? 0}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(107,128,168,0.5)' }}>Всего постов</div>
                        </div>
                    </div>

                    {/* KPI Cards Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                        gap: 24,
                        marginBottom: 40
                    }}>
                        {kpiCards.map(card => (
                            <KpiCard key={card.label} {...card} />
                        ))}
                    </div>

                    {/* Charts Section */}
                    <div style={{ ...cardBase, background: 'rgba(13,16,32,0.6)', backdropFilter: 'blur(20px)', marginBottom: 40, overflowX: 'hidden' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 16,
                            marginBottom: 32
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <BarChart3 size={20} color="#818cf8" />
                                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Тренды последних генераций</h2>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(107,128,168,0.6)', padding: '6px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)' }}>
                                Последние 20 прогонов
                            </div>
                        </div>

                        {chartData.length > 0 ? (
                            <div style={{ height: 350, width: '100%' }}>
                                <ResponsiveContainer>
                                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="rgba(107,128,168,0.4)"
                                            tick={{ fontSize: 10, fill: 'rgba(107,128,168,0.7)' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            stroke="rgba(107,128,168,0.4)"
                                            tick={{ fontSize: 10, fill: 'rgba(107,128,168,0.7)' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#0d1020',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '14px',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                                fontSize: '12px'
                                            }}
                                            itemStyle={{ padding: '2px 0' }}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 12, color: 'rgba(107,128,168,0.8)' }} />
                                        <Line
                                            type="monotone" 
                                            dataKey="Время (сек)" 
                                            stroke="#6366f1"
                                            strokeWidth={3} 
                                            dot={{ r: 4, fill: '#6366f1' }}
                                            activeDot={{ r: 6 }}
                                            connectNulls
                                        />
                                        <Line
                                            type="monotone" 
                                            dataKey="CLIP Score" 
                                            stroke="#10b981"
                                            strokeWidth={3} 
                                            dot={{ r: 4, fill: '#10b981' }}
                                            activeDot={{ r: 6 }}
                                            connectNulls
                                        />
                                        <Line
                                            type="monotone" 
                                            dataKey="Perplexity" 
                                            stroke="#f59e0b"
                                            strokeWidth={3} 
                                            dot={{ r: 4, fill: '#f59e0b' }}
                                            activeDot={{ r: 6 }}
                                            connectNulls
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 250, border: '2px dashed rgba(255,255,255,0.03)', borderRadius: 20 }}>
                                <BarChart3 size={40} style={{ color: 'rgba(107,128,168,0.2)', marginBottom: 16 }} />
                                <p style={{ color: 'rgba(107,128,168,0.5)', fontSize: '0.875rem' }}>Недостаточно данных для построения графиков</p>
                            </div>
                        )}
                    </div>

                    {/* Detail Table */}
                    {chartData.length > 0 && (
                        <div style={{ ...cardBase, background: 'rgba(255,255,255,0.01)', marginBottom: 60, overflowX: 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                <List size={20} color="#94a3b8" />
                                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>История генераций</h2>
                            </div>

                            <div style={{ minWidth: 600 }}> {/* Constrain min-width for table readability on móvil scroll */}
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            {['ID ПОСТА', 'ВРЕМЯ', 'CLIP SCORE', 'PERPLEXITY', ''].map(h => (
                                                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.65rem', fontWeight: 800, color: 'rgba(107,128,168,0.5)', letterSpacing: '0.1em' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...chartData].reverse().map((row, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                                                <td style={{ padding: '16px', fontSize: '0.875rem', fontWeight: 600, color: '#818cf8' }}>{row.name.replace('Post #', '#')}</td>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: row["Время (сек)"] < 30 ? '#10b981' : '#f87171' }} />
                                                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{row["Время (сек)"]}с</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '0.875rem', color: '#34d399', fontWeight: 500 }}>{row["CLIP Score"]}</td>
                                                <td style={{ padding: '16px', fontSize: '0.875rem', color: '#fbbf24', fontWeight: 500 }}>{row["Perplexity"]}</td>
                                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                                    <ChevronRight size={16} color="rgba(107,128,168,0.3)" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

export default AdminDashboard;
