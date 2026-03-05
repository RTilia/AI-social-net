# AI Content Creator 🚀

Премиальное веб-приложение для автоматизации SMM с использованием искусственного интеллекта. Генерируйте профессиональный контент (текст и изображения), планируйте публикации и управляйте стилем вашего бренда в одном месте.

![Preview](https://img.shields.io/badge/UI-Premium-blueviolet) ![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-blue) ![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green) ![React](https://img.shields.io/badge/Frontend-React-61dafb)

## ✨ Основные возможности

- 🧠 **Генерация контента через AI:** Создание постов с помощью DeepSeek API с учетом тональности и целевой аудитории.
- 🎨 **Генерация изображений:** Автоматическое создание визуалов через Hugging Face (Flux) или LoremFlickr.
- 📅 **Интерактивный Календарь:** Планирование постов с помощью Drag-and-Drop интерфейса.
- 🎭 **Brand Voice:** Настройка уникального «голоса» бренда для консистентности всех публикаций.
- 💎 **Premium UX/UI:** Плавные анимации (Framer Motion), современные градиенты и адаптивный дизайн.
- 🔐 **Безопасность:** JWT-авторизация и защищенные роуты.

## 🛠 Технологический стек

### Frontend
- **React 19** + **Vite**
- **Tailwind CSS** (дизайн и анимации)
- **Framer Motion** (плавные переходы и эффекты)
- **Lucide React** (иконки)
- **Hello-Pangea/DND** (Drag & Drop)

### Backend
- **Python 3.10+**
- **FastAPI** (высокопроизводительный API)
- **SQLAlchemy** + **SQLite** (база данных)
- **OpenAI SDK** (интеграция с DeepSeek/OpenRouter)
- **Hugging Face Inference API** (генерация картинок)

## 🚀 Быстрый старт

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd AI-socseti
```

### 2. Настройка Backend
```bash
cd backend
python -m venv venv
source venv/bin/soft/activate  # Для Windows: venv\Scripts\activate
pip install -r requirements.txt
```
Создайте файл `.env` в папке `backend`:
```env
OPENROUTER_API_KEY=ваш_ключ_openrouter
HF_TOKEN=ваш_токен_huggingface
SECRET_KEY=ваш_секретный_ключ_для_jwt
```
Запуск:
```bash
uvicorn main:app --reload
```

### 4. Запуск через Docker (Рекомендуется)
Если у вас установлен Docker и Docker Compose, вы можете запустить весь проект одной командой:
```bash
docker-compose up --build
```
- Frontend будет доступен по адресу: `http://localhost`
- Backend API будет доступен по адресу: `http://localhost:8000`

## 📂 Структура проекта
```bash
npm run dev
```

## 📂 Структура проекта

- `/backend` — FastAPI сервер, модели БД, AI сервисы.
- `/frontend` — React приложение (Vite), компоненты, стили.
- `app.db` — SQLite база данных (создается автоматически).

## 📄 Лицензия

MIT License. Свободно для использования и модификации.
