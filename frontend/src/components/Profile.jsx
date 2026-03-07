import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Link2, Bot, Save, CheckCircle2, AlertCircle, Loader2, Send, Camera, Key } from 'lucide-react';
import { getProfile, updateProfile, getToken } from '../api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const SECTIONS = [
    { id: 'profile', label: 'Профиль', color: '#8b5cf6' },
    { id: 'yandex', label: 'Яндекс.Диск', color: '#6366f1' },
    { id: 'telegram', label: 'Telegram', color: '#06b6d4' },
];

const card = { borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: 24, transition: 'border-color 0.25s, box-shadow 0.25s' };

function SectionCard({ color, children }) {
    const [hov, setHov] = useState(false);
    return (
        <div style={{ ...card, background: `linear-gradient(145deg,#0e1222,#101624)`, borderColor: hov ? `${color}33` : 'rgba(255,255,255,0.06)', boxShadow: hov ? `0 0 28px -8px ${color}22` : 'none' }}
            onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
            {children}
        </div>
    );
}

function SectionLabel({ label, color, Icon }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ padding: '6px', borderRadius: 8, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex' }}>
                <Icon size={14} style={{ color }} />
            </div>
            <h3 style={{ color }}>{label}</h3>
        </div>
    );
}

function Field({ label, Icon, color = '#6b80a8', ...rest }) {
    return (
        <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(107,128,168,0.7)', marginBottom: 8 }}>
                <Icon size={12} style={{ color }} /> {label}
            </label>
            <input {...rest} className="input" />
        </div>
    );
}

export default function Profile() {
    const [form, setForm] = useState({
        name: '',
        username: '',
        avatar_url: '',
        yandex_disk_url: '',
        telegram_auth_code: '',
        telegram_channel_id: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [toast, setToast] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        getProfile()
            .then(d => setForm({
                name: d.name || '',
                username: d.username || '',
                avatar_url: d.avatar_url || '',
                yandex_disk_url: d.yandex_disk_url || '',
                telegram_auth_code: d.telegram_auth_code || '',
                telegram_channel_id: d.telegram_channel_id || ''
            }))
            .catch(() => showToast('Ошибка загрузки профиля', 'error'))
            .finally(() => setLoading(false));
    }, []);

    const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setUploadingAvatar(true);
        try {
            const fd = new FormData(); fd.append('file', file);
            const res = await fetch(`${API_URL}/api/user/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
            if (!res.ok) { const err = await res.json(); throw new Error(err.detail); }
            const d = await res.json(); setForm(p => ({ ...p, avatar_url: d.avatar_url })); showToast('Аватар обновлён');
        } catch (err) { showToast(err.message, 'error'); }
        finally { setUploadingAvatar(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateProfile({
                name: form.name || null,
                yandex_disk_url: form.yandex_disk_url || null,
                telegram_channel_id: form.telegram_channel_id || null
            });
            showToast('Настройки сохранены');
        } catch (e) { showToast(e.message, 'error'); }
        finally { setSaving(false); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 size={32} style={{ color: '#8b5cf6', animation: 'spin 1s linear infinite' }} /></div>;

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
                <h1>Личный кабинет</h1>
                <p style={{ color: 'rgba(107,128,168,0.8)', fontSize: '0.875rem', marginTop: 4 }}>Профиль и настройки интеграций</p>
            </div>

            {/* Profile */}
            <SectionCard color="#8b5cf6">
                <SectionLabel label="Профиль" color="#8b5cf6" Icon={User} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
                    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0, cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                        {form.avatar_url
                            ? <img src={`${API_URL}${form.avatar_url}`} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(139,92,246,0.35)' }} />
                            : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={26} style={{ color: '#fff' }} /></div>
                        }
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                            {uploadingAvatar ? <Loader2 size={16} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} /> : <Camera size={16} style={{ color: '#fff' }} />}
                        </div>
                    </div>
                    <div>
                        <p style={{ fontWeight: 600, color: '#e8eeff', marginBottom: 2 }}>{form.name || form.username}</p>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(107,128,168,0.7)', marginBottom: 6 }}>@{form.username}</p>
                        <button onClick={() => fileInputRef.current?.click()} style={{ fontSize: '0.75rem', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Изменить фото</button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
                    <Field label="Имя" Icon={User} color="#8b5cf6" type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ваше имя" />
                    <Field label="Username" Icon={User} color="#8b5cf6" type="text" value={form.username} readOnly placeholder="" style={{ opacity: 0.6, cursor: 'default' }} />
                </div>
            </SectionCard>

            {/* Yandex */}
            <SectionCard color="#6366f1">
                <SectionLabel label="Яндекс.Диск" color="#6366f1" Icon={Link2} />
                <Field label="Публичная ссылка на папку" Icon={Link2} color="#6366f1" type="text" value={form.yandex_disk_url} onChange={e => setForm(p => ({ ...p, yandex_disk_url: e.target.value }))} placeholder="https://disk.yandex.ru/d/..." />
            </SectionCard>

            {/* Telegram */}
            <SectionCard color="#06b6d4">
                <SectionLabel label="Telegram Интеграция" color="#06b6d4" Icon={Send} />

                <div style={{ marginBottom: 20, padding: 14, borderRadius: 12, background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}>
                    <p style={{ fontSize: '0.85rem', color: '#e8eeff', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bot size={16} /> Настройте публикацию через нашего бота
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(107,128,168,0.8)', lineHeight: 1.5 }}>
                        1. Откройте <a href="https://t.me/aisocseti_bot" target="_blank" rel="noreferrer" style={{ color: '#06b6d4', fontWeight: 600 }}>@aisocseti_bot</a><br />
                        2. Отправьте ему ПИН-код, указанный ниже<br />
                        3. Добавьте бота в свой канал как администратора
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
                    <Field
                        label="Ваш ПИН-код"
                        Icon={Key}
                        color="#06b6d4"
                        type="text"
                        value={form.telegram_auth_code}
                        readOnly
                        style={{ background: 'rgba(255,255,255,0.03)', fontWeight: 700, textAlign: 'center', letterSpacing: '0.1em' }}
                    />
                    <Field
                        label="Channel ID"
                        Icon={Send}
                        color="#06b6d4"
                        type="text"
                        value={form.telegram_channel_id || 'Не привязан'}
                        readOnly
                        style={{ opacity: 0.8, cursor: 'default' }}
                        placeholder="Заполнится ботом"
                    />
                </div>
            </SectionCard>

            <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ justifyContent: 'center', padding: '13px 18px', width: '100%', fontSize: '0.9rem' }}>
                {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Сохранение...</> : <><Save size={16} /> Сохранить настройки</>}
            </button>

            {toast && (
                <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 50, padding: '12px 20px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', background: '#141b2d', border: `1px solid ${toast.type === 'error' ? 'rgba(244,63,94,0.25)' : 'rgba(16,185,129,0.25)'}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>
                    {toast.type === 'error' ? <AlertCircle size={15} style={{ color: '#f43f5e' }} /> : <CheckCircle2 size={15} style={{ color: '#10b981' }} />}
                    <span style={{ color: '#e8eeff' }}>{toast.msg}</span>
                </div>
            )}
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </motion.div>
    );
}
