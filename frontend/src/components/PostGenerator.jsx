import React, { useState } from 'react';
import { generatePost, savePost } from '../api';
import { motion, AnimatePresence } from 'framer-motion';

function PostGenerator({ onNavigate }) {
    const [theme, setTheme] = useState("");
    const [tone, setTone] = useState("Professional");
    const [audience, setAudience] = useState("Широкая аудитория");
    const [length, setLength] = useState("Medium");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async (e) => {
        if (e) e.preventDefault();
        if (!theme) return;

        setLoading(true);
        setResult(null);
        try {
            const res = await generatePost(theme, tone, audience, length);
            setResult(res);
        } catch (error) {
            setResult({ content: "Произошла ошибка при генерации. Проверьте подключение.", image_url: "" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!result) return;
        try {
            await savePost(result.content, result.image_url, null, {
                generation_time_seconds: result.generation_time_seconds,
                clip_score: result.clip_score,
                perplexity: result.perplexity
            });
            alert("Пост успешно сохранен в черновики!");
            if (onNavigate) {
                onNavigate('dashboard');
            }
        } catch (error) {
            alert("Ошибка при сохранении поста: " + error.message);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white p-6 rounded-lg shadow"
            >
                <h2 className="text-xl font-bold mb-6 text-gray-800">Генератор Контента</h2>
                <form onSubmit={handleGenerate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Тема поста</label>
                        <input
                            type="text"
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            placeholder="Как использовать ИИ в бизнесе"
                            className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Тон (из BrandBook)</label>
                        <select
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="Professional">Профессиональный</option>
                            <option value="Friendly">Дружелюбный</option>
                            <option value="Humorous">С юмором</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Размер текста</label>
                        <select
                            value={length}
                            onChange={(e) => setLength(e.target.value)}
                            className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="Short">Короткий (1-2 абзаца)</option>
                            <option value="Medium">Средний (3-4 абзаца)</option>
                            <option value="Long">Длинный (Лонгрид)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Аудитория</label>
                        <input
                            type="text"
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                            placeholder="Менеджеры, владельцы бизнеса"
                            className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium py-3 rounded hover:shadow-lg transition-all duration-300 disabled:opacity-50 active:scale-[0.98]"
                    >
                        {loading ? "Генерация..." : "Создать пост (DeepSeek)"}
                    </button>
                </form>
            </motion.div>

            <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white p-6 rounded-lg shadow flex flex-col h-full"
            >
                <h2 className="text-xl font-bold mb-4 text-gray-800">Результат</h2>

                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-grow animate-pulse space-y-4"
                        >
                            <div className="h-64 bg-gray-200 rounded-xl w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                        </motion.div>
                    ) : result ? (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="flex-grow flex flex-col space-y-4"
                        >
                            {result.image_url && (
                                <img
                                    src={result.image_url}
                                    alt="Сгенерированное изображение"
                                    className="w-full h-auto rounded-xl object-cover shadow-sm bg-gray-100 hover:shadow-md transition-shadow duration-300"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                    }}
                                />
                            )}
                            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl whitespace-pre-wrap text-gray-700 leading-relaxed">
                                {result.content}
                            </div>
                            <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 hover:shadow-md transition-all duration-300 font-medium active:scale-[0.98]"
                                >
                                    Сохранить в план
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    className="flex-1 bg-blue-100 text-blue-700 py-2 px-4 rounded hover:bg-blue-200 transition-all duration-300 font-medium active:scale-[0.98]"
                                >
                                    Сгенерировать заново
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-grow flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 min-h-[300px]"
                        >
                            <span className="text-gray-400 italic text-center px-4">Сгенерированный пост появится здесь...</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

export default PostGenerator;
