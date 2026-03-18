from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)

    # Метрики дашборда
    planned_posts = Column(Integer, default=0)
    active_brandbooks = Column(Integer, default=0)
    generated_texts = Column(Integer, default=0)

    # Интеграции
    yandex_disk_url = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    telegram_auth_code = Column(String, nullable=True)
    telegram_channel_id = Column(String, nullable=True)
    
    # Настройки ИИ
    ai_provider = Column(String, default="openrouter")
    ollama_model = Column(String, default="llama3")

    
    brandbooks = relationship("BrandBook", back_populates="owner")
    posts = relationship("Post", back_populates="owner")
    cloud_integrations = relationship("CloudIntegration", back_populates="owner")

class CloudIntegration(Base):
    __tablename__ = "cloud_integrations"
    id = Column(Integer, primary_key=True, index=True)
    yandex_folder_url = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="cloud_integrations")

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
    title = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    image_prompt = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    status = Column(String, default="draft")
    is_published = Column(Integer, default=0)  # 0 - нет, 1 - да (используем Integer для совместимости с SQLite)
    publish_date = Column(String, nullable=True)  # Формат: YYYY-MM-DD
    publish_time = Column(String, nullable=True)  # Формат: HH:MM
    generation_time_seconds = Column(Float, nullable=True)
    clip_score = Column(Float, nullable=True)
    perplexity = Column(Float, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="posts")
