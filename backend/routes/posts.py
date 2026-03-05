from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import SessionLocal
import models
from auth_utils import get_current_user_id

router = APIRouter(
    prefix="/api/posts",
    tags=["posts"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class PostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None
    publish_date: Optional[str] = None
    publish_time: Optional[str] = None
    generation_time_seconds: Optional[float] = None
    clip_score: Optional[float] = None
    perplexity: Optional[float] = None

class PostUpdateDate(BaseModel):
    publish_date: Optional[str] = None
    publish_time: Optional[str] = None

class PostResponse(BaseModel):
    id: int
    content: str
    image_url: Optional[str] = None
    status: str
    publish_date: Optional[str] = None
    publish_time: Optional[str] = None

    class Config:
        from_attributes = True

@router.post("/", response_model=PostResponse)
def create_post(post: PostCreate, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    db_post = models.Post(
        title="Сгенерированный пост",
        content=post.content,
        image_url=post.image_url,
        publish_date=post.publish_date,
        publish_time=post.publish_time,
        generation_time_seconds=post.generation_time_seconds,
        clip_score=post.clip_score,
        perplexity=post.perplexity,
        status="draft",
        owner_id=current_user_id
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

@router.get("/", response_model=List[PostResponse])
def get_posts(db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    posts = db.query(models.Post).filter(models.Post.owner_id == current_user_id).all()
    return posts

@router.put("/{post_id}", response_model=PostResponse)
def update_post_date(post_id: int, update_data: PostUpdateDate, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    post = db.query(models.Post).filter(models.Post.id == post_id, models.Post.owner_id == current_user_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.publish_date = update_data.publish_date
    post.publish_time = update_data.publish_time
    db.commit()
    db.refresh(post)
    return post

@router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    post = db.query(models.Post).filter(models.Post.id == post_id, models.Post.owner_id == current_user_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()
    return {"message": "Post deleted successfully"}
