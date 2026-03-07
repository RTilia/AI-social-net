from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from agent_workflow import app as agent_graph
import time
import random
from services.websocket_manager import manager

router = APIRouter(
    prefix="/api/generate",
    tags=["agent"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/multiagent/{draft_id}")
async def run_multiagent(draft_id: int, db: Session = Depends(get_db)):
    """Запускает мультиагентный пайплайн для конкретного черновика."""
    
    # 1. Проверяем существование черновика
    post = db.query(models.Post).filter(models.Post.id == draft_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Черновик не найден")
        
    initial_state = {
        "draft_id": draft_id,
        "context_text": post.content,
        "image_url": post.image_url,
        "brand_voice": None,
        "generated_text": None,
        "suggested_date": None
    }
    
    try:
        # 2. Запуск графа
        final_state = await agent_graph.ainvoke(initial_state)
        
        # 3. Обновление БД
        if final_state.get("generated_text"):
            post.content = final_state["generated_text"]
            
        if final_state.get("image_url"):
            post.image_url = final_state["image_url"]
        
        if final_state.get("suggested_date"):
            post.publish_date = final_state["suggested_date"]
            post.publish_time = "12:00" # Дефолтное время, можно улучшить
            post.status = "planned"
            
        # 4. Обновление метрик
        if final_state.get("start_time"):
            post.generation_time_seconds = round(time.time() - final_state["start_time"], 2)
            # Имитация других метрик для графиков (можно заменить реальными расчетами)
            post.clip_score = round(random.uniform(70, 95), 1)
            post.perplexity = round(random.uniform(10, 30), 1)
            
        db.commit()
        db.refresh(post)
        
        # Notify frontend via WebSocket
        await manager.broadcast({"type": "POST_UPDATED", "post_id": post.id, "user_id": post.owner_id})
        await manager.broadcast({"type": "METRICS_UPDATED"})
        
        return {
            "status": "success",
            "message": "Мультиагентная обработка завершена",
            "post_id": post.id,
            "generated_text": post.content,
            "publish_date": post.publish_date,
            "publish_time": post.publish_time,
            "new_status": post.status
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ошибка генерации: {str(e)}")
