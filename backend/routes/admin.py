from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import SessionLocal
import models

router = APIRouter(prefix="/api/admin", tags=["admin"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class PostMetric(BaseModel):
    id: int
    generation_time_seconds: Optional[float] = None
    clip_score: Optional[float] = None
    perplexity: Optional[float] = None

    class Config:
        from_attributes = True

class AdminMetricsResponse(BaseModel):
    avg_generation_time: Optional[float] = None
    avg_clip_score: Optional[float] = None
    avg_perplexity: Optional[float] = None
    total_posts: int
    last_posts: List[PostMetric]

@router.get("/metrics", response_model=AdminMetricsResponse)
def get_admin_metrics(db: Session = Depends(get_db)):
    posts = db.query(models.Post).order_by(models.Post.id.desc()).limit(20).all()
    all_posts = db.query(models.Post).all()
    
    posts_with_time = [p for p in all_posts if p.generation_time_seconds is not None]
    posts_with_clip = [p for p in all_posts if p.clip_score is not None]
    posts_with_pplx = [p for p in all_posts if p.perplexity is not None]
    
    avg_time = round(sum(p.generation_time_seconds for p in posts_with_time) / len(posts_with_time), 2) if posts_with_time else None
    avg_clip = round(sum(p.clip_score for p in posts_with_clip) / len(posts_with_clip), 2) if posts_with_clip else None
    avg_pplx = round(sum(p.perplexity for p in posts_with_pplx) / len(posts_with_pplx), 2) if posts_with_pplx else None

    # Возвращаем в хронологическом порядке для графика
    recent = list(reversed(posts))
    
    return AdminMetricsResponse(
        avg_generation_time=avg_time,
        avg_clip_score=avg_clip,
        avg_perplexity=avg_pplx,
        total_posts=len(all_posts),
        last_posts=recent
    )
