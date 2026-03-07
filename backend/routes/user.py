from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from database import SessionLocal
from auth_utils import get_current_user_id
from services.vector_db import upsert_user_vector
import os, shutil, uuid
import random

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

class TelegramConfigResponse(BaseModel):
    auth_code: str | None
    chat_id: str | None
    channel_id: str | None

@router.get("/telegram", response_model=TelegramConfigResponse)
def get_telegram_config(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Generate auth code if it doesn't exist
    if not user.telegram_auth_code:
        import random
        user.telegram_auth_code = str(random.randint(100000, 999999))
        db.commit()
        
    return {
        "auth_code": user.telegram_auth_code, 
        "chat_id": user.telegram_chat_id,
        "channel_id": user.telegram_channel_id
    }


# ─── Profile endpoints ────────────────────────────────────────────────────────

class ProfileResponse(BaseModel):
    username: str
    name: str | None
    avatar_url: str | None
    yandex_disk_url: str | None
    telegram_auth_code: str | None
    telegram_chat_id: str | None
    telegram_channel_id: str | None
    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    name: str | None = None
    yandex_disk_url: str | None = None
    telegram_channel_id: str | None = None

@router.get("/profile", response_model=ProfileResponse)
def get_profile(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Generate auth code if it doesn't exist
    if not user.telegram_auth_code:
        user.telegram_auth_code = str(random.randint(100000, 999999))
        db.commit()
        db.refresh(user)
        
    return user

@router.put("/profile", response_model=ProfileResponse)
def update_profile(data: ProfileUpdate, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if data.name is not None:
        user.name = data.name
    if data.yandex_disk_url is not None:
        user.yandex_disk_url = data.yandex_disk_url
    if data.telegram_channel_id is not None:
        user.telegram_channel_id = data.telegram_channel_id
    
    db.commit()
    db.refresh(user)
    return user


@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Allowed image types
    allowed = ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Недопустимый тип файла. Разрешены: jpg, png, webp, gif")
    
    ext = file.filename.rsplit('.', 1)[-1] if '.' in file.filename else 'jpg'
    filename = f"{user_id}_{uuid.uuid4().hex[:8]}.{ext}"
    save_dir = os.path.join(os.path.dirname(__file__), '..', 'static', 'avatars')
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, filename)
    
    with open(save_path, 'wb') as buf:
        shutil.copyfileobj(file.file, buf)
    
    user.avatar_url = f"/static/avatars/{filename}"
    db.commit()
    db.refresh(user)
    return {"avatar_url": user.avatar_url}
