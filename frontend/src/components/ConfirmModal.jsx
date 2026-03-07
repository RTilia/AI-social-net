import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="backdrop"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    onClick={onClose}
                    style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', padding: 16 }}
                >
                    <motion.div
                        key="card"
                        initial={{ opacity: 0, scale: 0.94, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 18 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                        onClick={e => e.stopPropagation()}
                        style={{ background: 'linear-gradient(145deg,#0e1222,#101624)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 26, width: '100%', maxWidth: 380, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
                    >
                        {/* Top rose accent */}
                        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#f43f5e,transparent)', borderRadius: 99, marginBottom: 20, opacity: 0.7 }} />

                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ padding: 8, borderRadius: 10, background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', flexShrink: 0 }}>
                                    <AlertTriangle size={18} style={{ color: '#f43f5e' }} />
                                </div>
                                <h2 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em', color: '#e8eeff' }}>{title}</h2>
                            </div>
                            <button onClick={onClose} style={{ color: 'rgba(107,128,168,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginLeft: 8 }}
                                onMouseEnter={e => e.currentTarget.style.color = '#e8eeff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(107,128,168,0.5)'}>
                                <X size={18} />
                            </button>
                        </div>

                        <p style={{ fontSize: '0.875rem', color: 'rgba(107,128,168,0.8)', lineHeight: 1.65, marginBottom: 22 }}>{message}</p>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={onClose} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Отмена</button>
                            <button onClick={onConfirm} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, fontFamily: 'inherit', background: 'linear-gradient(135deg,#f43f5e,#8b5cf6)', color: '#fff', transition: 'opacity 0.2s, transform 0.15s', boxShadow: '0 4px 16px -4px rgba(244,63,94,0.35)' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                Удалить
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
