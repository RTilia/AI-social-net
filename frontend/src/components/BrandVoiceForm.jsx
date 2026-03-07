import React, { useState, useEffect } from 'react';
import { getBrandBook, saveBrandBook } from '../api';
import { Paintbrush, Edit3, Save, X, Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const TONES = [
    { value: 'Professional', label: 'Профессиональный, экспертный', color: '#6366f1' },
    { value: 'Friendly', label: 'Дружелюбный, неформальный', color: '#06b6d4' },
    { value: 'Humorous', label: 'С юмором, дерзкий', color: '#f59e0b' },
    { value: 'Inspirational', label: 'Вдохновляющий, мотивирующий', color: '#10b981' },
];

const card = { borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(145deg,#0e1222,#101624)', padding: '24px' };

export default function BrandVoiceForm() {
    const [data, setData] = useState({ tone_of_voice: 'Professional', key_themes: '', target_audience: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => { loadBrandBook(); }, []);

    const loadBrandBook = async () => {
        try { const bb = await getBrandBook(); setData(bb); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            const saved = await saveBrandBook({ tone_of_voice: data.tone_of_voice, key_themes: data.key_themes, target_audience: data.target_audience });
            setData(saved); setIsEditing(false);
            showToast('Настройки сохранены!');
        } catch (err) { showToast('Ошибка: ' + err.message, 'error'); }
        finally { setSaving(false); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} /></div>;

    const activeTone = TONES.find(t => t.value === data.tone_of_voice);

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1>Стиль Бренда</h1>
                    <p style={{ color: 'rgba(107,128,168,0.8)', fontSize: '0.875rem', marginTop: 4 }}>Голос, темы и аудитория</p>
                </div>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="btn-secondary">
                        <Edit3 size={14} /> Редактировать
                    </button>
                )}
            </div>

            {/* Tone pill when viewing */}
            {!isEditing && activeTone && (
                <div style={{ display: 'inline-flex' }}>
                    <div style={{ ...card, padding: '14px 20px', borderColor: `${activeTone.color}44`, background: `linear-gradient(135deg,${activeTone.color}14,#101624)`, boxShadow: `0 0 20px -6px ${activeTone.color}33`, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: activeTone.color, flexShrink: 0, boxShadow: `0 0 10px ${activeTone.color}` }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: activeTone.color, lineHeight: 1.3 }}>{activeTone.label}</span>
                    </div>
                </div>
            )}

            {/* Read view: data fields */}
            {!isEditing && (
                <div style={{ ...card }}>
                    {[['Ключевые темы', data.key_themes], ['Целевая аудитория', data.target_audience]].map(([label, val]) => (
                        <div key={label} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.04)', lastChild: { borderBottom: 'none' } }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(107,128,168,0.7)', marginBottom: 6 }}>{label}</p>
                            <p style={{ fontSize: '0.9rem', color: val ? '#e8eeff' : 'rgba(107,128,168,0.4)', fontStyle: val ? 'normal' : 'italic', lineHeight: 1.6 }}>{val || 'Не указано'}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit form */}
            {isEditing && (
                <div style={{ ...card }}>
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(107,128,168,0.7)', marginBottom: 10 }}>Тон общения</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                                {TONES.map(t => (
                                    <button
                                        type="button"
                                        key={t.value}
                                        onClick={() => setData({ ...data, tone_of_voice: t.value })}
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: 12,
                                            border: `1px solid ${data.tone_of_voice === t.value ? t.color + '66' : 'rgba(255,255,255,0.06)'}`,
                                            background: data.tone_of_voice === t.value ? `${t.color}14` : 'rgba(10,14,26,0.3)',
                                            color: data.tone_of_voice === t.value ? t.color : 'rgba(232,238,255,0.7)',
                                            fontFamily: 'inherit',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 10,
                                            lineHeight: 1.4
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, marginTop: 1, borderRadius: '50%', background: data.tone_of_voice === t.value ? t.color : 'rgba(255,255,255,0.05)', color: '#fff', flexShrink: 0, transition: 'background 0.2s' }}>
                                            {data.tone_of_voice === t.value && <Check size={11} strokeWidth={3} />}
                                        </div>
                                        <span style={{ fontWeight: data.tone_of_voice === t.value ? 600 : 400 }}>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(107,128,168,0.7)', marginBottom: 8 }}>Ключевые темы</label>
                            <input type="text" value={data.key_themes} onChange={e => setData({ ...data, key_themes: e.target.value })} placeholder="IT, дизайн, стартапы, мотивация" className="input" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(107,128,168,0.7)', marginBottom: 8 }}>Целевая аудитория</label>
                            <textarea value={data.target_audience} onChange={e => setData({ ...data, target_audience: e.target.value })} placeholder="Начинающие предприниматели, 25-35 лет..." className="input" rows={3} style={{ resize: 'vertical', lineHeight: 1.6 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                                {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Сохранение...</> : <><Save size={15} /> Сохранить</>}
                            </button>
                            <button type="button" onClick={() => { setIsEditing(false); loadBrandBook(); }} className="btn-secondary">
                                <X size={14} /> Отмена
                            </button>
                        </div>
                    </form>
                </div>
            )}
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </motion.div>
    );
}
