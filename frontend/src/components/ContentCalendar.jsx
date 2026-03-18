import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getPosts, updatePostDate, deletePost, mergePosts, runMultiAgent } from '../api';
import { X, Clock, Calendar, ChevronLeft, ChevronRight, Image, FileText, Sparkles, Check, Bot, Loader2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

// ─── Helpers ──────────────────────────────────────────────────────────────
const isAssembled = (p) => p.image_url && p.content;
const isImageOnly = (p) => p.image_url && !p.content;
const isTextOnly = (p) => p.content && !p.image_url;

// ─── Tooltip ──────────────────────────────────────────────────────────────
function PostTooltip({ post, anchorRect, onMouseEnter, onMouseLeave }) {
    if (!anchorRect) return null;
    const vpW = window.innerWidth, vpH = window.innerHeight;
    const tw = 240, th = 320;
    const left = anchorRect.right + 12 + tw < vpW ? anchorRect.right + 12 : anchorRect.left - tw - 12;
    const top = Math.min(Math.max(8, anchorRect.top), vpH - th - 8);
    return (
        <div
            style={{ position: 'fixed', zIndex: 99999, background: 'linear-gradient(145deg,#0e1222,#101624)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column', top, left, width: tw, maxHeight: th }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {post.image_url && <img src={post.image_url} alt="preview" style={{ width: '100%', height: 110, objectFit: 'cover', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }} />}
            <div style={{ padding: 14, overflowY: 'auto', flex: 1 }}>
                <p style={{ fontSize: '0.75rem', color: 'rgba(232,238,255,0.85)', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>{post.content || <span style={{ color: 'rgba(107,128,168,0.5)', fontStyle: 'italic' }}>(нет текста)</span>}</p>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '0.65rem', color: 'rgba(99,102,241,0.8)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={10} />
                    {post.publish_date ? 'Запланировано' : 'Перетащи на дату для публикации'}
                </div>
            </div>
        </div>
    );
}


// ─── Context Menu ─────────────────────────────────────────────────────────
function ContextMenu({ menu, onClose, onAction }) {
    const [view, setView] = useState('menu'); // 'menu' | 'schedule'
    const [date, setDate] = useState('');
    const [time, setTime] = useState('12:00');

    // Reset state when menu object changes to a new post
    useEffect(() => {
        if (menu?.post) {
            setView('menu');
            setDate(menu.post.publish_date || '');
            setTime(menu.post.publish_time || '12:00');
        }
    }, [menu]);

    if (!menu) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999 }} onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }}>
            <div
                style={{
                    position: 'absolute',
                    top: menu.y,
                    left: menu.x,
                    background: 'linear-gradient(145deg,#0e1222,#101624)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                    padding: view === 'schedule' ? 12 : 6,
                    minWidth: view === 'schedule' ? 220 : 180,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: view === 'schedule' ? 8 : 2,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {view === 'menu' ? (
                    <>
                        <button
                            onClick={() => setView('schedule')}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'transparent', border: 'none', color: '#e8eeff', fontSize: '0.8rem', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Clock size={14} style={{ color: '#06b6d4' }} /> Запланировать
                        </button>
                        <button
                            onClick={() => { onAction('process', menu.post); onClose(); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'transparent', border: 'none', color: '#e8eeff', fontSize: '0.8rem', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Bot size={14} style={{ color: '#8b5cf6' }} /> Авто-обработка
                        </button>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                        <button
                            onClick={() => { onAction('delete', menu.post.id); onClose(); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'transparent', border: 'none', color: '#f43f5e', fontSize: '0.8rem', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <X size={14} strokeWidth={2.5} /> Удалить
                        </button>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <button onClick={() => setView('menu')} style={{ padding: 4, background: 'transparent', border: 'none', color: 'rgba(107,128,168,0.8)', cursor: 'pointer', borderRadius: 6 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <ChevronLeft size={16} />
                            </button>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e8eeff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Указать время</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8eeff', fontSize: '0.75rem', outline: 'none' }} />
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8eeff', fontSize: '0.75rem', outline: 'none' }} />
                        </div>
                        <button
                            onClick={() => { onAction('save_schedule', { post: menu.post, date, time }); onClose(); }}
                            style={{ marginTop: 6, padding: '8px', background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: '#fff', fontSize: '0.75rem', fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'opacity 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                            onMouseLeave={e => e.currentTarget.style.opacity = 1}
                        >
                            Сохранить
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Post Card ────────────────────────────────────────────────────────────
function PostCard({ post, provided, snapshot, onDelete, onEdit, onProcess, compact = false, highlight = false }) {
    const [visible, setVisible] = useState(false);
    const [anchorRect, setAnchorRect] = useState(null);
    const cardRef = useRef(null);
    const hideTimer = useRef(null);

    const showTooltip = useCallback(() => {
        clearTimeout(hideTimer.current);
        if (cardRef.current) setAnchorRect(cardRef.current.getBoundingClientRect());
        setVisible(true);
    }, []);
    const scheduleHide = useCallback(() => {
        hideTimer.current = setTimeout(() => { setVisible(false); setAnchorRect(null); }, 120);
    }, []);
    const cancelHide = useCallback(() => clearTimeout(hideTimer.current), []);
    useEffect(() => () => clearTimeout(hideTimer.current), []);

    return (
        <>
            <div
                ref={el => { provided.innerRef(el); cardRef.current = el; }}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                onMouseEnter={showTooltip}
                onMouseLeave={scheduleHide}
                className="group relative rounded-lg cursor-grab"
                onContextMenu={e => {
                    e.preventDefault();
                    if (onEdit || onProcess || onDelete) {
                        e.stopPropagation();
                        // Call the injected context menu handler if provided
                        if (post._onContextMenu) {
                            post._onContextMenu(e, post);
                        }
                    }
                }}
                style={{
                    background: highlight ? 'linear-gradient(135deg,#1a1500,#101624)' : post.status === 'published' ? 'linear-gradient(135deg,#061a12,#101624)' : 'linear-gradient(145deg,#0f1222,#101624)',
                    border: `1px solid ${snapshot.isDragging ? 'rgba(99,102,241,0.5)' : highlight ? 'rgba(245,158,11,0.35)' : post.status === 'published' ? 'rgba(16,185,129,0.3)' : visible && !snapshot.isDragging ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: snapshot.isDragging ? '0 8px 32px rgba(99,102,241,0.25)' : 'none',
                    transition: snapshot.isDragging ? 'none' : 'box-shadow 0.2s, border 0.2s',
                    opacity: snapshot.isDragging ? 0.9 : 1,
                    /* key fix: constrain width in compact mode */
                    width: compact ? 140 : '100%',
                    flexShrink: compact ? 0 : undefined,
                    minWidth: compact ? 0 : undefined,
                    position: 'relative',
                    borderRadius: 8,
                    ...provided.draggableProps.style,
                }}
            >
                {/* Context menu will handle actions, remove inline buttons */}
                <div style={{ padding: compact ? '6px' : '8px' }}>
                    {post.image_url && (
                        <img
                            src={post.image_url} alt="post"
                            style={{ width: '100%', objectFit: 'cover', borderRadius: 4, marginBottom: compact ? 4 : 6, height: compact ? 32 : 48, background: 'rgba(255,255,255,0.04)' }}
                        />
                    )}
                    <div style={{ fontSize: 10, lineHeight: 1.4, color: 'rgba(180,190,220,0.8)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: compact ? 2 : 3, WebkitBoxOrient: 'vertical' }}>
                        {post.isProcessing
                            ? <span style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: 3 }}><Bot size={9} /> Агенты...</span>
                            : post.content || <span style={{ color: 'rgba(107,128,168,0.4)', fontStyle: 'italic' }}>нет текста</span>}
                    </div>
                    {post.publish_time && (
                        <div style={{ marginTop: 3, fontSize: 9, fontWeight: 600, color: 'rgba(99,102,241,0.75)', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Clock size={8} />{post.publish_time}
                        </div>
                    )}
                </div>
            </div>
            {visible && !snapshot.isDragging && <PostTooltip post={post} anchorRect={anchorRect} onMouseEnter={cancelHide} onMouseLeave={scheduleHide} />}
        </>
    );
}

// ─── Draft Lane ───────────────────────────────────────────────────────────
function DraftLane({ droppableId, title, icon: Icon, iconColor, posts, onDelete, onEdit, onProcess, mergeTarget, compact = true }) {
    const isEmpty = posts.length === 0;

    // Pick accent color per zone
    const accentMap = { assembled: '#8b5cf6', images: '#3b82f6', texts: '#d946ef' };
    const accent = accentMap[droppableId] || '#6366f1';

    return (
        <div style={{ background: 'rgba(10,14,26,0.55)', border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: `${accent}0d` }}>
                <div style={{ padding: 5, borderRadius: 7, background: `${accent}20`, display: 'flex' }}>
                    <Icon size={13} style={{ color: accent }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'rgba(232,238,255,0.8)' }}>{title}</span>
                <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', color: 'rgba(107,128,168,0.7)', fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>{posts.length}</span>
            </div>
            <Droppable droppableId={droppableId}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            padding: 12,
                            minHeight: 120,
                            alignContent: 'flex-start',
                            background: snapshot.isDraggingOver ? 'rgba(99,102,241,0.04)' : 'transparent',
                            transition: 'background 0.2s',
                        }}
                    >
                        {isEmpty && !snapshot.isDraggingOver && (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(107,128,168,0.3)', fontSize: '0.65rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'lowercase', fontStyle: 'italic', transition: 'opacity 0.2s' }}>
                                пусто
                            </div>
                        )}
                        {posts.map((post, index) => (
                            <Draggable key={post.id.toString()} draggableId={post.id.toString()} index={index}>
                                {(provided, snapshot) => (
                                    <PostCard
                                        post={post}
                                        provided={provided}
                                        snapshot={snapshot}
                                        onDelete={onDelete}
                                        onEdit={onEdit}
                                        onProcess={onProcess}
                                        compact={compact}
                                        highlight={mergeTarget === post.id}
                                    />
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────
function ContentCalendar({ onLoad }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [mergeTarget, setMergeTarget] = useState(null);
    const [mergeGlow, setMergeGlow] = useState(null);
    const [toast, setToast] = useState(null);
    const [postToDelete, setPostToDelete] = useState(null);
    const [postToSchedule, setPostToSchedule] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);

    const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

    // ── Handle Context Menu Actions ──
    const handleContextMenuOpen = useCallback((e, post) => {
        e.preventDefault();

        // Calculate position (keep menu on screen)
        const x = e.clientX;
        const y = e.clientY;
        const menuWidth = 180;
        const menuHeight = 120;

        const safeX = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 8 : x;
        const safeY = y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 8 : y;

        setContextMenu({ x: safeX, y: safeY, post });
    }, []);

    const handleContextMenuAction = (action, payload) => {
        if (action === 'save_schedule') {
            handleSaveSchedule(payload.post.id, payload.date, payload.time);
        } else if (action === 'process') {
            handleProcessPost(payload);
        } else if (action === 'delete') {
            setPostToDelete(payload);
        }
    };

    useEffect(() => { fetchPosts(); }, []);

    const fetchPosts = async () => {
        try {
            const data = await getPosts();
            setPosts(data);
        } catch (err) {
            console.error('Failed to load posts', err);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handlePrevWeek = () => setCurrentWeekStart(p => subWeeks(p, 1));
    const handleNextWeek = () => setCurrentWeekStart(p => addWeeks(p, 1));
    const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const handleSaveSchedule = async (postId, date, time) => {
        const orig = [...posts];
        setPosts(posts.map(p => p.id === postId ? { ...p, publish_date: date, publish_time: time } : p));
        
        // Auto-jump calendar view to the scheduled week
        if (date && date.includes('-')) {
            const [y, m, d] = date.split('-');
            const scheduledDate = new Date(y, parseInt(m) - 1, d, 12, 0, 0);
            if (!isNaN(scheduledDate.getTime())) {
                const newWeekStart = startOfWeek(scheduledDate, { weekStartsOn: 1 });
                setCurrentWeekStart(newWeekStart);
            }
        }
        
        try {
            await updatePostDate(postId, date, time);
            if (onLoad) onLoad();
        } catch {
            setPosts(orig);
            showToast('Ошибка при сохранении расписания', 'error');
        }
    };

    const handleDeletePost = async (postId) => {
        const orig = [...posts];
        setPosts(posts.filter(p => p.id !== postId));
        try {
            await deletePost(postId);
            if (onLoad) onLoad();
            showToast('Пост успешно удален', 'success');
        } catch {
            setPosts(orig);
            showToast('Не удалось удалить пост', 'error');
        }
    };

    const handleProcessPost = async (post) => {
        // Устанавливаем статус "в обработке" локально
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isProcessing: true } : p));
        showToast('🤖 SMM-агенты начали работу над постом...', 'success');

        try {
            const result = await runMultiAgent(post.id);
            if (result.status === 'success') {
                showToast('✨ Пост успешно сгенерирован и запланирован!', 'success');
                if (onLoad) onLoad();
                await fetchPosts(); // Обновляем данные с сервера
            }
        } catch (e) {
            showToast(e.message, 'error');
            // Убираем статус "в обработке" при ошибке
            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isProcessing: false } : p));
        }
    };

    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;

        const draggedPostId = parseInt(draggableId);
        const draggedPost = posts.find(p => p.id === draggedPostId);
        if (!draggedPost) return;

        const srcId = source.droppableId;
        const destId = destination.droppableId;

        // ── Merge: image dragged onto text zone or vice versa ──
        const isCrossZoneMerge =
            (srcId === 'images' && destId === 'texts') ||
            (srcId === 'texts' && destId === 'images');

        if (isCrossZoneMerge) {
            // Find the post at the destination index to merge with
            const destPosts = destId === 'texts'
                ? posts.filter(isTextOnly)
                : posts.filter(isImageOnly);
            const targetPost = destPosts[destination.index] || destPosts[destPosts.length - 1];

            if (!targetPost) return;

            const imagePostId = isImageOnly(draggedPost) ? draggedPost.id : targetPost.id;
            const textPostId = isTextOnly(draggedPost) ? draggedPost.id : targetPost.id;

            // Optimistic: remove both, add merged placeholder
            const orig = [...posts];
            setPosts(posts.filter(p => p.id !== draggedPost.id && p.id !== targetPost.id));
            setMergeGlow(true);
            setTimeout(() => setMergeGlow(false), 800);

            try {
                const merged = await mergePosts(imagePostId, textPostId);
                setPosts(prev => [...prev, merged]);
                showToast('✨ Пост собран! Теперь в «Готовых постах»');
                if (onLoad) onLoad();
            } catch (err) {
                setPosts(orig);
                showToast('Ошибка при объединении: ' + err.message, 'error');
            }
            return;
        }

        // ── Move to calendar day ──
        if (!['assembled', 'images', 'texts'].includes(destId)) {
            const newDate = destId;
            const newTime = draggedPost.publish_time || null;
            const orig = [...posts];
            setPosts(posts.map(p => p.id === draggedPostId ? { ...p, publish_date: newDate, publish_time: newTime } : p));
            try {
                await updatePostDate(draggedPostId, newDate, newTime);
                if (onLoad) onLoad();
            } catch {
                setPosts(orig);
            }
            return;
        }

        // ── Move to "no date" (back to drafts) ──
        if (destId === 'assembled' || destId === 'images' || destId === 'texts') {
            const orig = [...posts];
            setPosts(posts.map(p => p.id === draggedPostId ? { ...p, publish_date: null, publish_time: null } : p));
            try {
                await updatePostDate(draggedPostId, null, null);
                if (onLoad) onLoad();
            } catch {
                setPosts(orig);
            }
        }
    };

    if (loading) return <div className="text-center py-10 animate-pulse text-zinc-600">Загрузка calendar...</div>;

    const unscheduled = posts.filter(p => !p.publish_date || p.publish_date === 'null' || p.publish_date === '');
    const scheduledPosts = posts.filter(p => p.publish_date && p.publish_date !== 'null' && p.publish_date !== '');

    // Exhaustive sorting of unscheduled posts to ensure nothing is "lost"
    const assembledDrafts = unscheduled.filter(isAssembled);
    const imageDrafts = unscheduled.filter(p => isImageOnly(p) && !isAssembled(p));
    const textDrafts = unscheduled.filter(p => !isAssembled(p) && !isImageOnly(p));

    return (
        <div className="min-h-[600px]">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.015em', color: '#e8eeff', margin: 0 }}>Календарь публикаций</h2>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(107,128,168,0.6)', margin: '3px 0 0' }}>Перетащивай посты на даты или в зоны черновиков</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(13,16,32,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '4px' }}>
                    <button onClick={handlePrevWeek} style={{ padding: 7, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(107,128,168,0.8)', display: 'flex', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><ChevronLeft size={16} /></button>
                    <button onClick={handleToday} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, color: 'rgba(232,238,255,0.8)', fontFamily: 'inherit', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Сегодня</button>
                    <button onClick={handleNextWeek} style={{ padding: 7, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(107,128,168,0.8)', display: 'flex', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><ChevronRight size={16} /></button>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                {/* ── Main Vertical Layout ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

                    {/* ── TOP: Weekly Calendar Grid ── */}
                    <div style={{ width: '100%' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
                            gap: 8
                        }}>
                            {days.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const dayPosts = scheduledPosts.filter(p => p.publish_date === dateStr);
                                const today = isToday(day);
                                return (
                                    <Droppable key={dateStr} droppableId={dateStr}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                style={{
                                                    minHeight: 200,
                                                    borderRadius: 12,
                                                    transition: 'all 0.2s',
                                                    background: snapshot.isDraggingOver ? 'rgba(99,102,241,0.06)' : today ? 'rgba(16,185,129,0.04)' : 'rgba(10,14,26,0.5)',
                                                    border: `1px solid ${snapshot.isDraggingOver ? 'rgba(99,102,241,0.4)' : today ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.05)'}`,
                                                }}
                                            >
                                                {/* Day header */}
                                                <div style={{ textAlign: 'center', padding: '7px 4px 5px', borderBottom: '1px solid rgba(255,255,255,0.05)', borderRadius: '11px 11px 0 0', background: today ? 'linear-gradient(135deg,#10b981,#06b6d4)' : 'rgba(255,255,255,0.02)' }}>
                                                    <div style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '0.7rem', color: today ? '#fff' : 'rgba(107,128,168,0.75)' }}>{format(day, 'EEEEEE', { locale: ru })}</div>
                                                    <div style={{ fontSize: '0.6rem', color: today ? 'rgba(255,255,255,0.75)' : 'rgba(107,128,168,0.4)', marginTop: 1 }}>{format(day, 'd MMM', { locale: ru })}</div>
                                                </div>
                                                {/* Posts */}
                                                <div style={{ padding: '6px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    {dayPosts.map((post, index) => (
                                                        <Draggable key={post.id.toString()} draggableId={post.id.toString()} index={index}>
                                                            {(provided, snapshot) => (
                                                                <PostCard
                                                                    post={{ ...post, _onContextMenu: handleContextMenuOpen }}
                                                                    provided={provided} snapshot={snapshot} onDelete={setPostToDelete} onEdit={setPostToSchedule} onProcess={handleProcessPost} />
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            </div>
                                        )}
                                    </Droppable>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── BOTTOM: Draft Zones ── */}
                    <div style={{ width: '100%' }}>
                        {/* Label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(107,128,168,0.5)' }}>Зоны черновиков</span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                            <span style={{ fontSize: '0.7rem', color: 'rgba(107,128,168,0.4)' }}>Перетаскивай посты для объединения</span>
                        </div>
                        {/* 3 Columns */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                            gap: 16
                        }}>
                            <DraftLane droppableId="assembled" title="Готовые" icon={Sparkles} iconColor="text-violet-400" posts={assembledDrafts.map(p => ({ ...p, _onContextMenu: handleContextMenuOpen }))} onDelete={setPostToDelete} onEdit={setPostToSchedule} onProcess={handleProcessPost} mergeTarget={mergeTarget} />
                            <DraftLane droppableId="images" title="Фото" icon={Image} iconColor="text-blue-400" posts={imageDrafts.map(p => ({ ...p, _onContextMenu: handleContextMenuOpen }))} onDelete={setPostToDelete} onEdit={null} onProcess={handleProcessPost} mergeTarget={mergeTarget} />
                            <DraftLane droppableId="texts" title="Тексты" icon={FileText} iconColor="text-fuchsia-400" posts={textDrafts.map(p => ({ ...p, _onContextMenu: handleContextMenuOpen }))} onDelete={setPostToDelete} onEdit={null} onProcess={handleProcessPost} mergeTarget={mergeTarget} />
                        </div>
                    </div>

                </div>
            </DragDropContext>

            <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} onAction={handleContextMenuAction} />

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

            <ConfirmModal
                isOpen={!!postToDelete}
                onClose={() => setPostToDelete(null)}
                onConfirm={() => { handleDeletePost(postToDelete); setPostToDelete(null); }}
                title="Удалить этот пост?"
                message="Это действие нельзя отменить. Пост будет навсегда удалён из календаря."
            />
        </div>
    );
}

export default ContentCalendar;
