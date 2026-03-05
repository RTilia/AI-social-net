import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_URL = "http://localhost:8000";

function AdminDashboard() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/admin/metrics`);
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
            value: metrics?.avg_generation_time != null ? `${metrics.avg_generation_time} сек` : "—",
            target: "< 30 сек",
            good: metrics?.avg_generation_time != null && metrics.avg_generation_time < 30,
            icon: "⏱️",
            desc: "Скорость ответа ИИ",
        },
        {
            label: "Ср. CLIP Score",
            value: metrics?.avg_clip_score != null ? `${metrics.avg_clip_score}` : "—",
            target: "> 75.0",
            good: metrics?.avg_clip_score != null && metrics.avg_clip_score > 75,
            icon: "🎯",
            desc: "Совпадение текста и картинки",
        },
        {
            label: "Ср. Perplexity",
            value: metrics?.avg_perplexity != null ? `${metrics.avg_perplexity}` : "—",
            target: "< 25.0",
            good: metrics?.avg_perplexity != null && metrics.avg_perplexity < 25,
            icon: "🧠",
            desc: "Естественность текста",
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
        <div className="min-h-screen bg-gray-950 text-white p-8">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl">🔒</span>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                        Панель Администратора
                    </h1>
                </div>
                <p className="text-gray-400 ml-11">Метрики качества генерации · Всего постов в БД: <span className="text-white font-bold">{metrics?.total_posts ?? 0}</span></p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {kpiCards.map(card => (
                    <div key={card.label} className={`relative overflow-hidden rounded-2xl p-6 border ${card.good ? 'border-green-500/30 bg-green-500/10' : 'border-gray-700 bg-gray-900'}`}>
                        <div className="absolute top-0 right-0 opacity-10 text-9xl leading-none rotate-12 pr-2">{card.icon}</div>
                        <div className="relative">
                            <span className="text-2xl mr-2">{card.icon}</span>
                            <p className="text-gray-400 text-sm mt-1">{card.label}</p>
                            <p className={`text-4xl font-black mt-1 ${card.good ? 'text-green-400' : 'text-white'}`}>
                                {card.value}
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${card.good ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                                    Цель: {card.target}
                                </span>
                                {card.good && <span className="text-green-400 text-xs font-bold">✓ ОК</span>}
                            </div>
                            <p className="text-gray-500 text-xs mt-2">{card.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700">
                <h2 className="text-lg font-bold mb-6 text-gray-200">📈 Тренды метрик (последние 20 генераций)</h2>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#e5e7eb' }}
                                labelStyle={{ color: '#9ca3af' }}
                            />
                            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '13px' }} />
                            <Line
                                type="monotone" dataKey="Время (сек)" stroke="#818cf8"
                                strokeWidth={2} dot={{ r: 4, fill: '#818cf8' }} activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone" dataKey="CLIP Score" stroke="#34d399"
                                strokeWidth={2} dot={{ r: 4, fill: '#34d399' }} activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone" dataKey="Perplexity" stroke="#f97316"
                                strokeWidth={2} dot={{ r: 4, fill: '#f97316' }} activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                        <span className="text-4xl mb-3">📊</span>
                        <p>Данных пока нет. Сгенерируйте несколько постов, чтобы графики появились.</p>
                    </div>
                )}
            </div>

            {/* Table */}
            {chartData.length > 0 && (
                <div className="mt-8 bg-gray-900 rounded-2xl p-6 border border-gray-700">
                    <h2 className="text-lg font-bold mb-4 text-gray-200">📋 Последние генерации</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left border-b border-gray-700">
                                    <th className="pb-3 text-gray-400 font-semibold">Post ID</th>
                                    <th className="pb-3 text-gray-400 font-semibold">Время (сек)</th>
                                    <th className="pb-3 text-gray-400 font-semibold">CLIP Score</th>
                                    <th className="pb-3 text-gray-400 font-semibold">Perplexity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...chartData].reverse().map((row, i) => (
                                    <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50 transition">
                                        <td className="py-3 text-indigo-400 font-mono">{row.name}</td>
                                        <td className={`py-3 font-semibold ${row["Время (сек)"] < 30 ? 'text-green-400' : 'text-red-400'}`}>
                                            {row["Время (сек)"]}
                                        </td>
                                        <td className="py-3 text-emerald-400">{row["CLIP Score"]}</td>
                                        <td className="py-3 text-orange-400">{row["Perplexity"]}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
