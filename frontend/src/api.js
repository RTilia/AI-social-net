const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let currentToken = localStorage.getItem('token') || null;

export const setToken = (token) => {
    currentToken = token;
    if (token) {
        localStorage.setItem('token', token);
    } else {
        localStorage.removeItem('token');
    }
};

export const getToken = () => currentToken;

const getHeaders = () => {
    const headers = {
        "Content-Type": "application/json",
    };
    if (currentToken) {
        headers["Authorization"] = `Bearer ${currentToken}`;
    }
    return headers;
};

export const registerUser = async (username, password) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
    if (!response.ok) throw new Error("Ошибка регистрации");
    const data = await response.json();
    setToken(data.access_token);
    return data;
};

export const loginUser = async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
    });
    if (!response.ok) throw new Error("Неверные учетные данные");
    const data = await response.json();
    setToken(data.access_token);
    return data;
};

export const getMe = async () => {
    const response = await fetch(`${API_URL}/api/user/me`, {
        method: "GET",
        headers: getHeaders()
    });
    if (!response.ok) {
        if (response.status === 401) setToken(null);
        throw new Error("Необходима авторизация");
    }
    return await response.json();
};

export const updateMetrics = async (metrics) => {
    const response = await fetch(`${API_URL}/api/user/metrics`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(metrics)
    });
    if (!response.ok) throw new Error("Ошибка обновления метрик");
    return await response.json();
};

export const generatePost = async (theme, brandVoice, targetAudience, length = "Medium") => {
    const response = await fetch(`${API_URL}/api/content/generate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            theme: theme,
            brand_voice: brandVoice,
            target_audience: targetAudience,
            length: length
        }),
    });
    if (!response.ok) throw new Error("Ошибка при генерации поста");
    return await response.json();
};

export const savePost = async (content, imageUrl, publishDate = null, metrics = {}) => {
    const response = await fetch(`${API_URL}/api/posts/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            content: content,
            image_url: imageUrl,
            publish_date: publishDate,
            publish_time: metrics.publish_time ?? null,
            generation_time_seconds: metrics.generation_time_seconds ?? null,
            clip_score: metrics.clip_score ?? null,
            perplexity: metrics.perplexity ?? null
        }),
    });
    if (!response.ok) throw new Error("Ошибка при сохранении поста");
    return await response.json();
};

export const getPosts = async () => {
    const response = await fetch(`${API_URL}/api/posts/`, {
        method: "GET",
        headers: getHeaders()
    });
    if (!response.ok) throw new Error("Ошибка при загрузке постов");
    return await response.json();
};

export const updatePostDate = async (postId, publishDate, publishTime = null) => {
    const response = await fetch(`${API_URL}/api/posts/${postId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
            publish_date: publishDate,
            publish_time: publishTime
        }),
    });
    if (!response.ok) throw new Error("Ошибка при обновлении даты поста");
    return await response.json();
};

export const getBrandBook = async () => {
    const response = await fetch(`${API_URL}/api/user/brandbook`, {
        method: "GET",
        headers: getHeaders()
    });
    if (!response.ok) throw new Error("Ошибка загрузки Brand Voice");
    return await response.json();
};

export const saveBrandBook = async (data) => {
    const response = await fetch(`${API_URL}/api/user/brandbook`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error("Ошибка сохранения Brand Voice");
    return await response.json();
};

export const deletePost = async (postId) => {
    const response = await fetch(`${API_URL}/api/posts/${postId}`, {
        method: "DELETE",
        headers: getHeaders()
    });
    if (!response.ok) throw new Error("Ошибка при удалении поста");
    return await response.json();
};
