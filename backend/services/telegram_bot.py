import os
import logging
import asyncio
from typing import Optional
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, CommandStart, CommandObject
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from dotenv import load_dotenv

from database import SessionLocal
import models
from datetime import datetime
from services.websocket_manager import manager

logger = logging.getLogger(__name__)

load_dotenv()
# BOT_TOKEN is now loaded inside start_telegram_bot

# --- States ---
class BotState(StatesGroup):
    waiting_for_auth_code = State()
    waiting_for_draft = State()

# --- Keyboards ---
def get_main_keyboard():
    kb = [
        [
            KeyboardButton(text="📥 Загрузить черновик"),
            KeyboardButton(text="🗓️ Расписание")
        ],
        [
            KeyboardButton(text="📢 Привязать канал"),
            KeyboardButton(text="🚪 Выйти")
        ]
    ]
    return ReplyKeyboardMarkup(keyboard=kb, resize_keyboard=True)

# --- Handlers ---

def get_user_by_chat_id(db, chat_id: int):
    return db.query(models.User).filter(models.User.telegram_chat_id == str(chat_id)).first()

async def cmd_start_code(message: types.Message, command: CommandObject, state: FSMContext):
    await state.clear()
    
    auth_code = command.args
    db = SessionLocal()
    try:
        if auth_code:
            # Try to find a user with this code
            user_by_code = db.query(models.User).filter(models.User.telegram_auth_code == auth_code).first()
            if user_by_code:
                # Code matched! Link them.
                user_by_code.telegram_chat_id = str(message.chat.id)
                user_by_code.telegram_auth_code = None  # Consume the code
                db.commit()
                await message.answer(
                    f"✅ Успешно! Вы вошли в аккаунт **{user_by_code.username}**.\n\n"
                    "Я ваш AI SMM Ассистент. 🤖\n"
                    "Вы можете присылать мне идеи и фото для черновиков, посмотреть расписание, "
                    "или привязать свой канал.",
                    reply_markup=get_main_keyboard(),
                    parse_mode="Markdown"
                )
                return
            else:
                await message.answer("❌ Неверный или устаревший код авторизации.\nСгенерируйте новый в личном кабинете на сайте.")
                return

        # No auth code provided. Check if already linked.
        user = get_user_by_chat_id(db, message.chat.id)
        if user:
            await message.answer(
                f"С возвращением, **{user.username}**!\n\nЧто будем делать?",
                reply_markup=get_main_keyboard(),
                parse_mode="Markdown"
            )
        else:
            await message.answer(
                "Привет! Я AI SMM Ассистент. 🤖\n\n"
                "Чтобы начать работу, мне нужен ваш код авторизации.\n"
                "Пожалуйста, **введите 6-значный код** из личного кабинета на сайте:",
                parse_mode="Markdown",
                reply_markup=types.ReplyKeyboardRemove()
            )
            await state.set_state(BotState.waiting_for_auth_code)
    except Exception as e:
        logger.error(f"Error in start command: {e}")
    finally:
        db.close()

async def process_auth_code(message: types.Message, state: FSMContext):
    auth_code = (message.text or "").strip()
    if not auth_code or len(auth_code) != 6:
        await message.answer("Пожалуйста, введите корректный 6-значный ПИН-код.")
        return

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.telegram_auth_code == auth_code).first()
        if user:
            user.telegram_chat_id = str(message.chat.id)
            user.telegram_auth_code = None
            db.commit()
            await state.clear()
            await message.answer(
                f"✅ Успешно привязано! Добро пожаловать, **{user.username}**.",
                reply_markup=get_main_keyboard(),
                parse_mode="Markdown"
            )
        else:
            await message.answer("❌ Неверный код. Проверьте ПИН-код в личном кабинете и попробуйте снова.")
    except Exception as e:
        logger.error(f"Error processing auth code: {e}")
        await message.answer("Произошла техническая ошибка.")
    finally:
        db.close()

async def cmd_logout(message: types.Message, state: FSMContext):
    db = SessionLocal()
    try:
        user = get_user_by_chat_id(db, message.chat.id)
        if user:
            user.telegram_chat_id = None
            user.telegram_channel_id = None
            db.commit()
            await state.clear()
            await message.answer(
                "🚪 Вы успешно вышли из аккаунта.\n\n"
                "Чтобы войти снова, используйте команду `/start`.",
                reply_markup=types.ReplyKeyboardRemove()
            )
        else:
            await message.answer("Вы и так не авторизованы.")
    except Exception as e:
        logger.error(f"Error in logout: {e}")
    finally:
        db.close()

async def cmd_link_channel_help(message: types.Message):
    await message.answer(
        "📢 **Как привязать канал для авто-постинга:**\n\n"
        "1. Добавьте меня в администраторы вашего канала (с правом публикации сообщений).\n"
        "2. Перешлите мне любое сообщение из этого канала сюда.\n\n"
        "Я всё пойму и запомню ваш канал автоматически!",
        parse_mode="Markdown"
    )

async def process_forwarded_message(message: types.Message):
    if not message.forward_from_chat or message.forward_from_chat.type != 'channel':
        return # Not a channel forward
        
    db = SessionLocal()
    try:
        user = get_user_by_chat_id(db, message.chat.id)
        if not user:
            await message.answer("Сначала авторизуйтесь через `/start ВАШ_КОД`", parse_mode="Markdown")
            return
            
        channel_id = str(message.forward_from_chat.id)
        channel_title = message.forward_from_chat.title
        
        user.telegram_channel_id = channel_id
        db.commit()
        
        await message.answer(f"✅ Успех! Канал **{channel_title}** успешно привязан для авто-постинга.", parse_mode="Markdown")
        
    except Exception as e:
        logger.error(f"Error linking channel: {e}")
        await message.answer("Произошла ошибка при привязке канала.")
    finally:
        db.close()

async def cmd_upload(message: types.Message, state: FSMContext):
    db = SessionLocal()
    user = get_user_by_chat_id(db, message.chat.id)
    db.close()
    if not user:
        await message.answer("Сначала нужно войти в аккаунт. Введите ПИН-код:")
        await state.set_state(BotState.waiting_for_auth_code)
        return

    await message.answer(
        "Отправьте мне текст для нового поста, или фотографию (с подписью или без).\n"
        "Я сохраню это в черновики 📝",
        reply_markup=types.ReplyKeyboardRemove()
    )
    await state.set_state(BotState.waiting_for_draft)

async def process_draft(message: types.Message, state: FSMContext, bot: Bot):
    text_content = message.text or message.caption or ""
    image_url = None
    
    db = SessionLocal()
    try:
        user = get_user_by_chat_id(db, message.chat.id)
        if not user:
            await message.answer("Ошибка: Пользователь не найден. Введите ПИН-код для авторизации:")
            await state.set_state(BotState.waiting_for_auth_code)
            return
            
        if message.photo:
            photo = message.photo[-1]
            file = await bot.get_file(photo.file_id)
            
            static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads")
            os.makedirs(static_dir, exist_ok=True)
            img_name = f"telegram_{photo.file_id}.jpg"
            img_path = os.path.join(static_dir, img_name)
            
            await bot.download_file(file.file_path, destination=img_path)
            image_url = f"http://localhost:8000/static/uploads/{img_name}"

        if not text_content and not image_url:
            await message.answer("Не удалось понять сообщение. Пожалуйста, отправьте текст или фото.")
            return

        new_post = models.Post(
            owner_id=user.id,
            content=text_content,
            image_url=image_url,
            status="draft",
        )
        db.add(new_post)
        db.commit()
        
        await message.answer(
            "✅ Черновик успешно сохранён!\n"
            "Зайдите в календарь, чтобы отправить его в авто-обработку.",
            reply_markup=get_main_keyboard()
        )
        # Notify frontend via WebSocket
        await manager.broadcast({"type": "NEW_POST", "user_id": user.id})
    except Exception as e:
        logger.error(f"Error saving draft: {e}")
        await message.answer("Произошла ошибка при сохранении в базу данных. 😔")
    finally:
        db.close()
        await state.clear()

async def cmd_schedule(message: types.Message, state: FSMContext):
    await state.clear()
    
    db = SessionLocal()
    try:
        user = get_user_by_chat_id(db, message.chat.id)
        if not user:
            await message.answer("Сначала нужно войти в аккаунт. Введите ПИН-код:")
            await state.set_state(BotState.waiting_for_auth_code)
            return
            
        posts = db.query(models.Post).filter(
            models.Post.owner_id == user.id, 
            models.Post.publish_date.isnot(None),
            models.Post.publish_date != "",
            models.Post.status != "published"
        ).order_by(models.Post.publish_date).all()
        
        if not posts:
            await message.answer("У вас пока нет запланированных постов. 📭", reply_markup=get_main_keyboard())
            return
            
        schedule_dict = {}
        for p in posts:
            date_key = p.publish_date if p.publish_date else "🗓️ Дата не назначена"
            if date_key not in schedule_dict:
                schedule_dict[date_key] = []
            schedule_dict[date_key].append(p)
        
        response = "📅 **Ваше расписание:**\n\n"
        
        for date_str, items in schedule_dict.items():
            if date_str != "🗓️ Дата не назначена":
                try:
                    dt = datetime.strptime(date_str, "%Y-%m-%d")
                    friendly_date = f"🗓️ **{dt.strftime('%d.%m.%Y')}**"
                except:
                    friendly_date = f"🗓️ **{date_str}**"
            else:
                friendly_date = f"**{date_str}**"
                
            response += f"{friendly_date}\n"
            for item in items:
                time_str = item.publish_time or "Без времени"
                icon = "🖼️" if item.image_url else "📝"
                text_preview = item.content[:40] + "..." if item.content and len(item.content) > 40 else item.content or "Фото без подписи"
                response += f"  {icon} `{time_str}` — _{text_preview}_\n"
            response += "\n"
            
        response += f"💡 Всего запланировано: {len(posts)} постов."
        
        await message.answer(response, parse_mode="Markdown", reply_markup=get_main_keyboard())

    except Exception as e:
        logger.error(f"Error fetching schedule: {e}")
        await message.answer("Произошла ошибка при загрузке расписания. 😔", reply_markup=get_main_keyboard())
    finally:
        db.close()

# --- Registration ---
def register_handlers(dp: Dispatcher):
    # dp.message.register(log_all) # Log everything for debug
    dp.message.register(cmd_start_code, CommandStart())
    dp.message.register(cmd_logout, Command("logout"))
    dp.message.register(cmd_logout, F.text == "🚪 Выйти")
    dp.message.register(process_auth_code, BotState.waiting_for_auth_code)
    dp.message.register(cmd_link_channel_help, F.text == "📢 Привязать канал")
    dp.message.register(process_forwarded_message, F.forward_from_chat)
    dp.message.register(cmd_upload, F.text == "📥 Загрузить черновик")
    dp.message.register(cmd_upload, Command("upload"))
    dp.message.register(process_draft, BotState.waiting_for_draft)
    dp.message.register(cmd_schedule, F.text == "🗓️ Расписание")
    dp.message.register(cmd_schedule, Command("schedule"))

# --- Fallback Config ---
bot = None
dp = None

async def start_telegram_bot():
    global bot, dp
    
    token = (os.getenv("TELEGRAM_BOT_TOKEN") or os.getenv("BOT_TOKEN") or "").strip()
    if not token:
        logger.warning("BOT_TOKEN or TELEGRAM_BOT_TOKEN (.env) is not set. Telegram bot will not start.")
        print(">>> Bot Token MISSING! <<<")
        return
        
    bot = Bot(token=token)
    dp = Dispatcher()
    register_handlers(dp)
    
    logger.info("Starting Telegram Bot Polling...")
    print(">>> Telegram Bot Polling STARTED <<<")
    try:
        await dp.start_polling(bot)
    except Exception as e:
        print(f">>> Telegram Bot Error: {e} <<<")
        logger.error(f"Polling error: {e}")

async def stop_telegram_bot():
    if bot and dp:
        logger.info("Stopping Telegram Bot...")
        await bot.session.close()
