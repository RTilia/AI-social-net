from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    # Редактируемые метрики дашборда
    planned_posts = Column(Integer, default=0)
    active_brandbooks = Column(Integer, default=0)
    generated_texts = Column(Integer, default=0)
    
    brandbooks = relationship("BrandBook", back_populates="owner")
    posts = relationship("Post", back_populates="owner")

class BrandBook(Base):
    __tablename__ = "brandbooks"
    id = Column(Integer, primary_key=True, index=True)
    tone_of_voice = Column(String, default="Professional")
    key_themes = Column(Text, default="")
    target_audience = Column(Text, default="")
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="brandbooks")

class ContentPlan(Base):
    __tablename__ = "content_plans"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    image_prompt = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    status = Column(String, default="draft")
    publish_date = Column(String, nullable=True)  # Формат: YYYY-MM-DD
    publish_time = Column(String, nullable=True)  # Формат: HH:MM
    generation_time_seconds = Column(Float, nullable=True)
    clip_score = Column(Float, nullable=True)
    perplexity = Column(Float, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="posts")
