from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import models
from database import engine, SessionLocal
from pydantic import BaseModel
from routes import content, auth, user, posts, admin, cloud, agent
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
import pytz
from services.telegram_service import send_telegram_post
from services.telegram_bot import start_telegram_bot, stop_telegram_bot
from services.websocket_manager import manager
from fastapi import WebSocket, WebSocketDisconnect
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Content Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost", "http://127.0.0.1"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(content.router)
app.include_router(posts.router)
app.include_router(admin.router)
app.include_router(cloud.router)
app.include_router(agent.router)

# Static files (avatars, etc.)
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WS Error: {e}")
        manager.disconnect(websocket)

scheduler = AsyncIOScheduler(timezone=pytz.utc)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def check_and_publish_posts():
    db = SessionLocal()
    try:
        # Use LOCAL time (not UTC) so it matches what the user entered in the UI
        import time as _time
        now_local = datetime.fromtimestamp(_time.time())
        current_date_str = now_local.strftime("%Y-%m-%d")
        current_time_str = now_local.strftime("%H:%M")
        
        # Find posts that are scheduled, haven't been published, and belong to a user with Telegram channel
        pending_posts = db.query(models.Post).join(models.User).filter(
            models.Post.publish_date != None,
            models.Post.is_published == 0,
            models.User.telegram_channel_id != None
        ).all()
        
        for post in pending_posts:
            # Check if it's time to publish
            should_publish = False
            if post.publish_date < current_date_str:
                # Past date — always publish
                should_publish = True
            elif post.publish_date == current_date_str:
                if not post.publish_time:
                    # No specific time set — publish any time today
                    should_publish = True
                elif post.publish_time <= current_time_str:
                    should_publish = True
                
            if should_publish:
                print(f"[Scheduler] Publishing post ID {post.id} to Telegram Channel...")
                user = post.owner
                
                bot_token = os.getenv("TELEGRAM_BOT_TOKEN") or os.getenv("BOT_TOKEN")
                if not bot_token:
                    print("[Scheduler] TELEGRAM_BOT_TOKEN and BOT_TOKEN are missing!")
                    continue
                    
                success = await send_telegram_post(
                    bot_token=bot_token,
                    chat_id=user.telegram_channel_id,
                    text=post.content or post.title or "Сгенерированный пост",
                    image_url=post.image_url
                )
                
                if success:
                    post.is_published = 1
                    post.status = "published"
                    db.commit()
                    print(f"[Scheduler] Post ID {post.id} successfully published.")
                else:
                    print(f"[Scheduler] Failed to publish post ID {post.id}.")
    except Exception as e:
        print(f"[Scheduler] Error: {e}")
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    scheduler.add_job(check_and_publish_posts, 'interval', minutes=1)
    scheduler.start()
    logger.info("Background scheduler started.")
    # Start Telegram Bot polling in the background
    asyncio.create_task(start_telegram_bot())
    logger.info("Telegram Bot task created.")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    print("Background scheduler stopped.")
    await stop_telegram_bot()
    print("Telegram Bot stopped.")

frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
assets_dir = os.path.join(frontend_dir, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if full_path.startswith("api/") or full_path.startswith("static/") or full_path.startswith("ws"):
        raise HTTPException(status_code=404, detail="Route not found")
    
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not built yet. Run 'npm run build' in the frontend directory."}
