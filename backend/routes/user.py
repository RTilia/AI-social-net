from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from database import SessionLocal
from auth_utils import get_current_user_id
from services.vector_db import upsert_user_vector

router = APIRouter(prefix="/api/user", tags=["user"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class MetricsUpdate(BaseModel):
    planned_posts: int
    active_brandbooks: int
    generated_texts: int

class UserResponse(BaseModel):
    username: str
    planned_posts: int
    active_brandbooks: int
    generated_texts: int

class BrandBookResponse(BaseModel):
    id: int
    tone_of_voice: str
    key_themes: str
    target_audience: str
    class Config:
        from_attributes = True

class BrandBookUpdate(BaseModel):
    tone_of_voice: str
    key_themes: str = ""
    target_audience: str = ""

@router.get("/me", response_model=UserResponse)
def get_me(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/metrics", response_model=UserResponse)
def update_metrics(metrics: MetricsUpdate, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.planned_posts = metrics.planned_posts
    user.active_brandbooks = metrics.active_brandbooks
    user.generated_texts = metrics.generated_texts
    
    db.commit()
    db.refresh(user)
    
    # Сохраняем информацию о пользователе в векторную базу данных
    info_text = f"Пользователь {user.username}. Метрики: {user.planned_posts} запланированных постов, {user.active_brandbooks} активных брендбуков, {user.generated_texts} сгенерированных текстов."
    metadata = {
        "username": user.username,
        "planned_posts": user.planned_posts,
        "active_brandbooks": user.active_brandbooks,
        "generated_texts": user.generated_texts
    }
    upsert_user_vector(user.id, info_text, metadata)
    
    return user

@router.get("/brandbook", response_model=BrandBookResponse)
def get_brandbook(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    bb = db.query(models.BrandBook).filter(models.BrandBook.owner_id == user_id).first()
    if not bb:
        # Создаём пустой brandbook при первом обращении
        bb = models.BrandBook(tone_of_voice="Professional", key_themes="", target_audience="", owner_id=user_id)
        db.add(bb)
        db.commit()
        db.refresh(bb)
    return bb

@router.put("/brandbook", response_model=BrandBookResponse)
def update_brandbook(data: BrandBookUpdate, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    bb = db.query(models.BrandBook).filter(models.BrandBook.owner_id == user_id).first()
    if not bb:
        bb = models.BrandBook(owner_id=user_id)
        db.add(bb)
    bb.tone_of_voice = data.tone_of_voice
    bb.key_themes = data.key_themes
    bb.target_audience = data.target_audience
    db.commit()
    db.refresh(bb)
    return bb
