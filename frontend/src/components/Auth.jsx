import React, { useState } from 'react';
import { loginUser, registerUser } from '../api';
import { Loader2, AlertCircle, Zap } from 'lucide-react';

export default function Auth({ onAuthSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            if (isLogin) await loginUser(username, password);
            else await registerUser(username, password);
            onAuthSuccess();
        } catch (err) { setError(err.message || 'Произошла ошибка'); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '70vh', padding: 24 }}>
            {/* Background glow */}
            <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse,rgba(99,102,241,0.06) 0%,transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: 380, background: 'linear-gradient(145deg,#0e1222,#101624)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 32, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', position: 'relative', zIndex: 1 }}>
                {/* Top accent line */}
                <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#6366f1,#06b6d4,transparent)', borderRadius: 99, marginBottom: 28 }} />

                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ display: 'inline-flex', padding: 12, borderRadius: 14, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 14 }}>
                        <Zap size={22} style={{ color: '#818cf8' }} />
                    </div>
                    <h1 style={{ marginBottom: 6 }}>{isLogin ? 'Добро пожаловать' : 'Создать аккаунт'}</h1>
                    <p style={{ color: 'rgba(107,128,168,0.8)', fontSize: '0.875rem' }}>
                        {isLogin ? 'Войдите в систему' : 'Начните работу с платформой'}
                    </p>
                </div>

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 18, fontSize: '0.875rem', color: '#fb7185' }}>
                        <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(107,128,168,0.7)', marginBottom: 6 }}>Имя пользователя</label>
                        <input type="text" required value={username} onChange={e => setUsername(e.target.value)} placeholder="username" className="input" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(107,128,168,0.7)', marginBottom: 6 }}>Пароль</label>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input" />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', width: '100%', padding: '11px 18px', marginTop: 6, borderRadius: 12, fontSize: '0.9rem' }}>
                        {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Загрузка...</> : (isLogin ? 'Войти' : 'Зарегистрироваться')}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <button onClick={() => setIsLogin(!isLogin)} style={{ fontSize: '0.8rem', color: 'rgba(107,128,168,0.6)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.2s' }}
                        onMouseEnter={e => e.target.style.color = '#818cf8'} onMouseLeave={e => e.target.style.color = 'rgba(107,128,168,0.6)'}>
                        {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войти'}
                    </button>
                </div>
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
        </div>
    );
}
