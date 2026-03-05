import React, { useState, useEffect } from 'react';
import { getBrandBook, saveBrandBook } from '../api';

const TONES = [
    { value: "Professional", label: "Профессиональный, экспертный" },
    { value: "Friendly", label: "Дружелюбный, неформальный" },
    { value: "Humorous", label: "С юмором, дерзкий" },
    { value: "Inspirational", label: "Вдохновляющий, мотивирующий" },
];

function BrandVoiceForm() {
    const [data, setData] = useState({ tone_of_voice: "Professional", key_themes: "", target_audience: "" });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadBrandBook();
    }, []);

    const loadBrandBook = async () => {
        try {
            const bb = await getBrandBook();
            setData(bb);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const saved = await saveBrandBook({
                tone_of_voice: data.tone_of_voice,
                key_themes: data.key_themes,
                target_audience: data.target_audience,
            });
            setData(saved);
            setIsEditing(false);
        } catch (err) {
            alert("Ошибка при сохранении: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4 text-gray-500">Загрузка Brand Voice...</div>;

    const toneLabel = TONES.find(t => t.value === data.tone_of_voice)?.label ?? data.tone_of_voice;

    return (
        <div className="bg-white p-6 rounded-lg shadow max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Настройки Brand Voice</h2>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-all duration-300 hover:shadow-sm active:scale-95"
                    >
                        Редактировать
                    </button>
                )}
            </div>

            {!isEditing ? (
                <div className="space-y-5">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Тон общения</p>
                        <p className="text-gray-800 font-medium">{toneLabel}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Ключевые темы</p>
                        <p className="text-gray-800">{data.key_themes || <span className="text-gray-400 italic">Не указано</span>}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Целевая аудитория</p>
                        <p className="text-gray-800">{data.target_audience || <span className="text-gray-400 italic">Не указано</span>}</p>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Тон общения (Tone of Voice)</label>
                        <select
                            value={data.tone_of_voice}
                            onChange={(e) => setData({ ...data, tone_of_voice: e.target.value })}
                            className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {TONES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ключевые темы (через запятую)</label>
                        <input
                            type="text"
                            value={data.key_themes}
                            onChange={(e) => setData({ ...data, key_themes: e.target.value })}
                            placeholder="IT, дизайн, стартапы, мотивация"
                            className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Целевая аудитория</label>
                        <textarea
                            value={data.target_audience}
                            onChange={(e) => setData({ ...data, target_audience: e.target.value })}
                            placeholder="Начинающие предприниматели, 25-35 лет..."
                            className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            rows="3"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`flex-1 bg-blue-600 text-white font-medium py-2 px-4 rounded hover:bg-blue-700 transition ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            {saving ? "Сохранение..." : "Сохранить настройки"}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsEditing(false); loadBrandBook(); }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-all duration-300 active:scale-95"
                        >
                            Отмена
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default BrandVoiceForm;
