import React, { useState, useEffect } from 'react';
import ContentCalendar from './ContentCalendar';
import { getMe, getPosts, updateMetrics } from '../api';
import { motion } from 'framer-motion';

function Dashboard() {
    const [user, setUser] = useState(null);
    const [autoMetrics, setAutoMetrics] = useState({
        planned_posts: 0,
        active_brandbooks: 0,
        generated_texts: 0,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await getMe();
            setUser(data);
            const postsData = await getPosts();
            const scheduledCount = postsData.filter(p => p.publish_date).length;
            const totalCount = postsData.length;
            const brandBookActive = data.active_brandbooks > 0 ? data.active_brandbooks : 1;
            const newMetrics = {
                planned_posts: scheduledCount,
                active_brandbooks: brandBookActive,
                generated_texts: totalCount,
            };
            setAutoMetrics(newMetrics);
            await updateMetrics(newMetrics);
        } catch (err) {
            console.error(err);
        }
    };

    if (!user) return <div className="p-4 text-gray-500">Загрузка дашборда...</div>;

    const statCards = [
        { value: autoMetrics.planned_posts, label: "Постов запланировано", color: "text-blue-600", bg: "bg-blue-50" },
        { value: autoMetrics.active_brandbooks, label: "Активный BrandBook", color: "text-purple-600", bg: "bg-purple-50" },
        { value: autoMetrics.generated_texts, label: "Сгенерировано постов", color: "text-green-600", bg: "bg-green-50" },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100
            }
        }
    };

    return (
        <div>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white p-6 rounded-lg shadow mb-6 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 opacity-10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2 text-gray-800">Привет, {user.username}!</h2>
                    <p className="text-gray-600 max-w-2xl">
                        Управляйте настройками стиля вашего бренда и используйте ИИ для автоматической генерации постов.
                    </p>
                </div>
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    {statCards.map(card => (
                        <motion.div
                            key={card.label}
                            variants={itemVariants}
                            whileHover={{ y: -5, shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                            className={`border border-gray-100 ${card.bg} rounded-lg p-4 transition-all duration-300`}
                        >
                            <div className={`${card.color} font-bold text-3xl mb-1`}>{card.value}</div>
                            <h3 className="font-semibold text-gray-700 text-sm">{card.label}</h3>
                            <p className="text-xs text-gray-400 mt-1">Обновляется автоматически</p>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>
            <ContentCalendar onLoad={loadData} />
        </div>
    );
}

export default Dashboard;
