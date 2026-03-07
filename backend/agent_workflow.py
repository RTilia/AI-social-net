from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
import os
from database import SessionLocal
import models
from datetime import datetime, timedelta
import time

# Настройка LLM (используем OpenRouter)
llm = ChatOpenAI(
    model="deepseek/deepseek-chat",
    openai_api_key=os.getenv("OPENROUTER_API_KEY"),
    openai_api_base="https://openrouter.ai/api/v1",
    max_tokens=2000,
)

# --- State ---
class AgentState(TypedDict):
    draft_id: int
    context_text: Optional[str]
    image_url: Optional[str]
    brand_voice: Optional[dict]
    generated_text: Optional[str]
    suggested_date: Optional[str]
    start_time: Optional[float]

# --- Nodes ---

def monitor_node(state: AgentState):
    """Извлекает данные черновика и настройки бренда из БД."""
    state["start_time"] = time.time()
    print(f"\n[Monitor] Анализ черновика ID: {state['draft_id']}")
    db = SessionLocal()
    try:
        post = db.query(models.Post).filter(models.Post.id == state["draft_id"]).first()
        if not post:
            return state

        state["context_text"] = post.content if post.content else "Сгенерируй интересный пост для социальных сетей."
        state["image_url"] = post.image_url
        
        user = post.owner
        if user:
            # Получаем первый активный брендбук пользователя (упрощенно)
            brandbook = db.query(models.BrandBook).filter(models.BrandBook.owner_id == user.id).first()
            if brandbook:
                state["brand_voice"] = {
                    "tone": brandbook.tone_of_voice,
                    "themes": brandbook.key_themes,
                    "audience": brandbook.target_audience
                }
        
        return state
    finally:
        db.close()

def copywriter_node(state: AgentState):
    """Генерирует текст с учетом brand voice."""
    print("[Copywriter] Написание текста поста...")
    
    brand_voice = state.get("brand_voice", {})
    tone = brand_voice.get("tone", "Professional")
    themes = brand_voice.get("themes", "Общие темы")
    target = brand_voice.get("audience", "Широкая аудитория")
    
    context = state.get("context_text", "")
    
    prompt = PromptTemplate.from_template(
        "Ты опытный SMM-копирайтер. Напиши пост для социальных сетей.\n\n"
        "Контекст или черновик: {context}\n"
        "Стиль общения (Tone of Voice): {tone}\n"
        "Ключевые темы: {themes}\n"
        "Целевая аудитория: {target}\n\n"
        "Ограничения:\n"
        "- Запрещено использовать маркдаун (никаких **, *, #)\n"
        "- Используй абзацы\n"
        "- Добавь пару эмодзи, но не переборщи\n\n"
        "Твой текст:"
    )
    
    chain = prompt | llm
    
    result = chain.invoke({
        "context": context,
        "tone": tone,
        "themes": themes,
        "target": target
    })
    
    state["generated_text"] = result.content
    return state

def scheduler_node(state: AgentState):
    """Подбирает ближайшую свободную дату для поста."""
    print("[Scheduler] Подбор оптимальной даты публикации...")
    db = SessionLocal()
    try:
        # Находим все занятые даты у текущих запланированных постов
        scheduled_posts = db.query(models.Post).filter(models.Post.publish_date != None).all()
        busy_dates = {post.publish_date for post in scheduled_posts}
        
        current_date = datetime.now()
        
        # Начинаем с завтрашнего дня и ищем первый свободный день
        for idx in range(1, 30):
            next_day = current_date + timedelta(days=idx)
            date_str = next_day.strftime("%Y-%m-%d")
            
            if date_str not in busy_dates:
                state["suggested_date"] = date_str
                print(f"[Scheduler] Найдена свободная дата: {date_str}")
                break
        
        if not state.get("suggested_date"):
            # Fallback, если все 30 дней заняты - ставим на завтра
            state["suggested_date"] = (current_date + timedelta(days=1)).strftime("%Y-%m-%d")
            
        return state
    finally:
        db.close()

async def image_generator_node(state: AgentState):
    """Генерирует фото для поста, если его нет."""
    print("[ImageGenerator] Проверка необходимости генерации фото...")
    if state.get("image_url"):
        print("[ImageGenerator] Фото уже есть, пропускаем.")
        return state
        
    print("[ImageGenerator] Генерация нового фото...")
    text_content = state.get("generated_text") or state.get("context_text") or "business"
    
    # 1. Генерируем короткий промпт
    prompt_template = PromptTemplate.from_template(
        "You are an expert prompt engineer. "
        "Create a short, vivid English image prompt (max 20 words) for a social media post based on this text:\n\n{text}\n\n"
        "Style: photorealistic, vibrant colors, premium quality. "
        "Reply ONLY with the prompt."
    )
    chain = prompt_template | llm
    result = await chain.ainvoke({"text": text_content[:500]})
    img_prompt = result.content.strip()
    print(f"[ImageGenerator] Prompt: {img_prompt}")
    
    # 2. Обращаемся к HF API
    from services.ai_service import generate_image_hf
    import urllib.parse
    
    try:
        hf_url = await generate_image_hf(img_prompt)
        if hf_url:
            state["image_url"] = hf_url
            print("[ImageGenerator] Фото успешно сгенерировано через HF!")
            return state
    except Exception as e:
        print(f"[ImageGenerator] HF fail: {e}")
        
    # 3. Fallback
    print("[ImageGenerator] HF не сработал, используем LoremFlickr.")
    keyword = img_prompt.split()[0].lower() if img_prompt else "business"
    state["image_url"] = f"https://loremflickr.com/1024/1024/{urllib.parse.quote(keyword)}"
    return state

# --- Graph Assembly ---

workflow = StateGraph(AgentState)

workflow.add_node("monitor", monitor_node)
workflow.add_node("copywriter", copywriter_node)
workflow.add_node("image_generator", image_generator_node)
workflow.add_node("scheduler", scheduler_node)

workflow.set_entry_point("monitor")
workflow.add_edge("monitor", "copywriter")
workflow.add_edge("copywriter", "image_generator")
workflow.add_edge("image_generator", "scheduler")
workflow.add_edge("scheduler", END)

# Компилируем граф
app = workflow.compile()

