import React, { useState, useEffect } from 'react';
import { generatePost, savePost, getBrandBook } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, BookmarkPlus, Loader2 } from 'lucide-react';

const card = { borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(145deg,#0e1222,#101624)' };

export default function PostGenerator({ onNavigate, generatorState, setGeneratorState }) {
    const { theme, tone, audience, length, result, loading, saved, loadedBrand } = generatorState;

    const setTheme = (val) => setGeneratorState(p => ({ ...p, theme: val }));
    const setTone = (val) => setGeneratorState(p => ({ ...p, tone: val }));
    const setAudience = (val) => setGeneratorState(p => ({ ...p, audience: val }));
    const setLength = (val) => setGeneratorState(p => ({ ...p, length: val }));
    const setResult = (val) => setGeneratorState(p => ({ ...p, result: val }));
    const setLoading = (val) => setGeneratorState(p => ({ ...p, loading: val }));
    const setSaved = (val) => setGeneratorState(p => ({ ...p, saved: val }));
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        if (loadedBrand) return;
        const loadBrandSettings = async () => {
            try {
                const bb = await getBrandBook();
                setGeneratorState(p => ({
                    ...p,
                    tone: bb?.tone_of_voice || p.tone,
                    audience: bb?.target_audience || p.audience,
                    loadedBrand: true
                }));
            } catch (err) { console.error('Failed to load brand book', err); }
        };
        loadBrandSettings();
    }, [loadedBrand, setGeneratorState]);

    const handleGenerate = async (e) => {
        if (e) e.preventDefault();
        if (!theme) return;
        setLoading(true); setResult(null); setSaved(false);
        try { setResult(await generatePost(theme, tone, audience, length)); }
        catch { setResult({ content: 'Произошла ошибка. Проверьте подключение.', image_url: '' }); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        if (!result) return;
        try {
            await savePost(result.content, result.image_url, null, { generation_time_seconds: result.generation_time_seconds, clip_score: result.clip_score, perplexity: result.perplexity });
            setSaved(true);
            setTimeout(() => { if (onNavigate) onNavigate('dashboard'); }, 1200);
        } catch (err) { showToast('Ошибка: ' + err.message, 'error'); }
    };

    const LENGTHS = [{ v: 'Short', l: 'Короткий' }, { v: 'Medium', l: 'Средний' }, { v: 'Long', l: 'Длинный' }];
    const TONES_LIST = [['Professional', 'Профессиональный', '#6366f1'], ['Friendly', 'Дружелюбный', '#06b6d4'], ['Humorous', 'С юмором', '#f59e0b']];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* ── Settings ── */}
            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }} style={{ ...card, padding: 28 }}>
                <div style={{ marginBottom: 24 }}>
                    <h1>Генератор ИИ</h1>
                    <p style={{ color: 'rgba(107,128,168,0.8)', fontSize: '0.875rem', marginTop: 4 }}>Создайте пост по теме и стилю бренда</p>
                </div>

                <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(107,128,168,0.7)', marginBottom: 8 }}>Тема поста</label>
                        <input type="text" value={theme} onChange={e => setTheme(e.target.value)} placeholder="Как использовать ИИ в бизнесе" className="input" required />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(107,128,168,0.7)', marginBottom: 10 }}>Тон</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {TONES_LIST.map(([v, l, c]) => (
                                <button type="button" key={v} onClick={() => setTone(v)} style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: `1px solid ${tone === v ? c + '55' : 'rgba(255,255,255,0.06)'}`, background: tone === v ? `${c}14` : 'transparent', color: tone === v ? c : 'rgba(107,128,168,0.7)', fontFamily: 'inherit', fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s', fontWeight: tone === v ? 600 : 400 }}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(107,128,168,0.7)', marginBottom: 10 }}>Размер</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {LENGTHS.map(({ v, l }) => (
                                <button type="button" key={v} onClick={() => setLength(v)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${length === v ? '#8b5cf655' : 'rgba(255,255,255,0.06)'}`, background: length === v ? '#8b5cf614' : 'transparent', color: length === v ? '#a78bfa' : 'rgba(107,128,168,0.7)', fontFamily: 'inherit', fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s', fontWeight: length === v ? 600 : 400 }}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(107,128,168,0.7)', marginBottom: 8 }}>Аудитория</label>
                        <input type="text" value={audience} onChange={e => setAudience(e.target.value)} placeholder="Менеджеры, владельцы бизнеса" className="input" />
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', padding: '12px 18px' }}>
                        {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Генерация...</> : <><Sparkles size={16} /> Создать пост</>}
                    </button>
                </form>
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </motion.div>

            {/* ── Result ── */}
            <motion.div initial={{ x: 16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }} style={{ ...card, padding: 28, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: 20 }}>Результат</h3>
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ height: 200, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                            {[75, 55, 85, 65].map((w, i) => <div key={i} style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.04)', width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
                        </motion.div>
                    ) : result ? (
                        <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {result.image_url && (
                                <img src={result.image_url} alt="Сгенерированное" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', background: 'rgba(255,255,255,0.04)' }} onError={e => { e.target.style.display = 'none'; }} />
                            )}
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px', fontSize: '0.875rem', color: 'rgba(232,238,255,0.85)', lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowY: 'auto', maxHeight: 400 }}>
                                {result.content}
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={handleSave} disabled={saved} className="btn-primary" style={{ flex: 1, justifyContent: 'center', ...(saved ? { background: 'linear-gradient(135deg,#10b981,#06b6d4)', boxShadow: '0 4px 16px -4px rgba(16,185,129,0.35)' } : {}) }}>
                                    <BookmarkPlus size={15} /> {saved ? 'Сохранено!' : 'Сохранить в план'}
                                </button>
                                <button onClick={handleGenerate} className="btn-secondary">
                                    <RefreshCw size={14} /> Заново
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(99,102,241,0.15)', borderRadius: 12, minHeight: 300 }}>
                            <div style={{ textAlign: 'center' }}>
                                <Sparkles size={28} style={{ color: 'rgba(99,102,241,0.25)', margin: '0 auto 10px' }} />
                                <span style={{ color: 'rgba(107,128,168,0.45)', fontSize: '0.875rem', fontStyle: 'italic' }}>Пост появится здесь...</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        style={{ position: 'fixed', bottom: 32, left: '50%', zIndex: 99999, padding: '12px 20px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', fontWeight: 500, background: '#141b2d', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                    >
                        <span style={{ color: toast.type === 'success' ? '#10b981' : '#f43f5e', fontSize: '1.2rem' }}>{toast.type === 'success' ? '✓' : '⚠️'}</span>
                        <span style={{ color: '#e8eeff' }}>{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
