import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getPosts, updatePostDate, deletePost } from '../api';
import { X, Clock, Calendar, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';

// Попап с полным содержимым поста
function PostTooltip({ post, anchorRect, onMouseEnter, onMouseLeave }) {
    if (!anchorRect) return null;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 320;
    const tooltipMaxHeight = Math.min(440, viewportHeight - 32);

    const leftPos = anchorRect.right + 12 + tooltipWidth < viewportWidth
        ? anchorRect.right + 12
        : anchorRect.left - tooltipWidth - 12;

    const topPos = Math.min(
        Math.max(8, anchorRect.top),
        viewportHeight - tooltipMaxHeight - 8
    );

    return (
        <div
            className="fixed z-[99999] bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden flex flex-col"
            style={{ top: topPos, left: leftPos, width: tooltipWidth, maxHeight: tooltipMaxHeight }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {post.image_url && (
                <img src={post.image_url} alt="post visual" className="w-full h-40 object-cover flex-shrink-0" />
            )}
            <div className="p-4 overflow-y-auto flex-1">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                </p>
                <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-400">
                    📌 Перетащи на дату для публикации
                </div>
            </div>
        </div>
    );
}

// Модальное окно для планирования
function SchedulingModal({ post, isOpen, onClose, onSave }) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('12:00');

    useEffect(() => {
        if (post) {
            setDate(post.publish_date || '');
            setTime(post.publish_time || '12:00');
        }
    }, [post, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-100 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Clock className="text-purple-500" size={24} />
                        Запланировать пост
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar size={16} className="text-blue-500" /> Дата публикации
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition bg-gray-50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Clock size={16} className="text-blue-500" /> Время публикации
                        </label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition bg-gray-50"
                        />
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition font-semibold"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={() => onSave(date, time)}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition font-semibold shadow-md"
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
}

// Карточка поста (обновляю пропсы)
function PostCard({ post, provided, snapshot, onDelete, onEdit, compact = false }) {
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
        hideTimer.current = setTimeout(() => {
            setVisible(false);
            setAnchorRect(null);
        }, 120);
    }, []);

    const cancelHide = useCallback(() => {
        clearTimeout(hideTimer.current);
    }, []);

    useEffect(() => () => clearTimeout(hideTimer.current), []);

    return (
        <>
            <div
                ref={(el) => {
                    provided.innerRef(el);
                    cardRef.current = el;
                }}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                onMouseEnter={showTooltip}
                onMouseLeave={scheduleHide}
                className={`group relative bg-white rounded-lg shadow-sm border text-sm cursor-grab transition-all duration-300 ease-in-out
                    ${snapshot.isDragging ? 'border-purple-500 shadow-xl ring-2 ring-purple-300 scale-105 opacity-90' : 'hover:-translate-y-1 hover:shadow-lg'}
                    ${visible && !snapshot.isDragging ? 'border-blue-400 shadow-md ring-1 ring-blue-200' : 'border-gray-200'}
                    ${compact ? 'min-w-[200px] max-w-[200px] flex-shrink-0' : ''}
                `}
            >
                {/* Кнопка удаления */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(post.id);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600 shadow-sm"
                    title="Удалить пост"
                >
                    <X size={12} strokeWidth={3} />
                </button>

                {/* Кнопка редактирования времени */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(post);
                    }}
                    className="absolute -top-2 -left-2 bg-blue-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-blue-600 shadow-sm"
                    title="Запланировать"
                >
                    <Clock size={12} strokeWidth={3} />
                </button>

                <div className="p-3">
                    {post.image_url && (
                        <img
                            src={post.image_url}
                            alt="post"
                            className={`w-full object-cover rounded-md mb-2 bg-gray-100 ${compact ? 'h-16' : 'h-20'}`}
                        />
                    )}
                    <div className={`text-gray-700 leading-snug text-xs ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}>
                        {post.content}
                    </div>
                    {post.publish_time && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded w-fit">
                            <Clock size={10} /> {post.publish_time}
                        </div>
                    )}
                </div>
            </div>
            {visible && !snapshot.isDragging && (
                <PostTooltip
                    post={post}
                    anchorRect={anchorRect}
                    onMouseEnter={cancelHide}
                    onMouseLeave={scheduleHide}
                />
            )}
        </>
    );
}

function ContentCalendar({ onLoad }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const data = await getPosts();
            setPosts(data);
        } catch (error) {
            console.error("Failed to load posts", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
    const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
    const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const handleEditPost = (post) => {
        setEditingPost(post);
        setIsModalOpen(true);
    };

    const handleSaveSchedule = async (date, time) => {
        if (!editingPost) return;
        const postId = editingPost.id;
        const originalPosts = [...posts];

        // Оптимистичное обновление
        setPosts(posts.map(p => p.id === postId ? { ...p, publish_date: date, publish_time: time } : p));
        setIsModalOpen(false);

        try {
            await updatePostDate(postId, date, time);
            if (onLoad) onLoad();
        } catch (error) {
            console.error("Failed to update schedule", error);
            setPosts(originalPosts);
            alert("Ошибка при сохранении расписания");
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Удалить этот пост навсегда?")) return;

        const originalPosts = [...posts];
        setPosts(posts.filter(p => p.id !== postId));

        try {
            await deletePost(postId);
            if (onLoad) onLoad();
        } catch (error) {
            console.error("Failed to delete post", error);
            setPosts(originalPosts);
            alert("Не удалось удалить пост");
        }
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const postId = parseInt(result.draggableId);
        const newDate = result.destination.droppableId === "drafts" ? null : result.destination.droppableId;
        const originalPosts = [...posts];
        setPosts(posts.map(post => post.id === postId ? { ...post, publish_date: newDate } : post));
        try {
            await updatePostDate(postId, newDate);
            if (onLoad) onLoad();
        } catch (error) {
            console.error("Failed to update post date", error);
            setPosts(originalPosts);
        }
    };

    if (loading) return <div className="text-center py-10 animate-pulse text-gray-500">Загрузка календаря...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow min-h-[600px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Календарь публикаций</h2>

                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100 shadow-sm">
                    <button
                        onClick={handlePrevWeek}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition text-gray-600 hover:text-purple-600"
                        title="Предыдущая неделя"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <button
                        onClick={handleToday}
                        className="px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition"
                    >
                        Сегодня
                    </button>

                    <button
                        onClick={handleNextWeek}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition text-gray-600 hover:text-purple-600"
                        title="Следующая неделя"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {days.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayPosts = posts.filter(post => post.publish_date === dateStr);
                        const today = isToday(day);

                        return (
                            <Droppable key={dateStr} droppableId={dateStr}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`min-h-[220px] border-2 rounded-xl transition-all duration-200
                                            ${snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' :
                                                today ? 'bg-blue-50/30 border-blue-400/50 shadow-sm' : 'bg-gray-50 border-gray-200'}
                                        `}
                                    >
                                        <div className={`text-center py-2 border-b mb-2 shadow-sm rounded-t-xl
                                            ${today ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}
                                        `}>
                                            <div className="font-semibold capitalize text-sm">{format(day, 'EEEEEE', { locale: ru })}</div>
                                            <div className={`text-xs ${today ? 'text-blue-50' : 'text-gray-500'}`}>{format(day, 'd MMM', { locale: ru })}</div>
                                        </div>
                                        <div className="space-y-2 p-2 flex flex-col">
                                            {dayPosts.map((post, index) => (
                                                <Draggable key={post.id} draggableId={post.id.toString()} index={index}>
                                                    {(provided, snapshot) => (
                                                        <PostCard
                                                            post={post}
                                                            provided={provided}
                                                            snapshot={snapshot}
                                                            onDelete={handleDeletePost}
                                                            onEdit={handleEditPost}
                                                        />
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

                <div className="mt-8">
                    <h3 className="text-lg font-bold mb-4 text-gray-800">Черновики (без даты)</h3>
                    <Droppable droppableId="drafts" direction="horizontal">
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`min-h-[140px] flex gap-4 overflow-x-auto p-4 border-2 border-dashed rounded-xl ${snapshot.isDraggingOver ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-300'}`}
                            >
                                {posts.filter(p => !p.publish_date).map((post, index) => (
                                    <Draggable key={post.id} draggableId={post.id.toString()} index={index}>
                                        {(provided, snapshot) => (
                                            <PostCard
                                                post={post}
                                                provided={provided}
                                                snapshot={snapshot}
                                                onDelete={handleDeletePost}
                                                onEdit={handleEditPost}
                                                compact={true}
                                            />
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                                {posts.filter(p => !p.publish_date).length === 0 && !snapshot.isDraggingOver && (
                                    <div className="flex-1 flex items-center justify-center text-gray-400 italic text-sm">
                                        Нет черновиков. Сгенерируйте новые посты!
                                    </div>
                                )}
                            </div>
                        )}
                    </Droppable>
                </div>
            </DragDropContext>

            <SchedulingModal
                post={editingPost}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveSchedule}
            />
        </div>
    );
}

export default ContentCalendar;
