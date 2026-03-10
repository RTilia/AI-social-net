from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx
import os
from database import SessionLocal
import models
from services.vector_db import upsert_user_vector
from auth_utils import get_current_user_id

router = APIRouter(prefix="/api/cloud", tags=["cloud"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".jfif")

async def get_public_download_url(client: httpx.AsyncClient, public_key: str, path: str = None) -> str:
    """Get a direct download URL for a public resource on Yandex Disk."""
    params = {"public_key": public_key}
    if path:
        params["path"] = path
    resp = await client.get(
        "https://cloud-api.yandex.net/v1/disk/public/resources/download",
        params=params
    )
    if resp.status_code == 200:
        return resp.json().get("href", "")
    return ""

@router.post("/sync")
async def sync_yandex_disk(db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    user = db.query(models.User).filter(models.User.id == current_user_id).first()
    if not user or not user.yandex_disk_url:
        raise HTTPException(
            status_code=400,
            detail="Ссылка на Яндекс.Диск не настроена. Перейдите в Личный кабинет и укажите её."
        )
    public_key = user.yandex_disk_url
    api_url = "https://cloud-api.yandex.net/v1/disk/public/resources"

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        try:
            # 1. List files in the public folder
            response = await client.get(api_url, params={"public_key": public_key, "limit": 1000})
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Failed to fetch Yandex Disk folder: {response.text}")

            data = response.json()

            # Handle folder vs single file
            items = []
            if data.get("type") == "dir" and "_embedded" in data:
                items = data["_embedded"].get("items", [])
            elif data.get("type") == "file":
                items = [data]
            else:
                items = data.get("_embedded", {}).get("items", [])

            print(f"[cloud sync] Found {len(items)} items total")
            synced_texts = 0
            synced_images = 0

            for item in items:
                file_name = item.get("name", "")
                file_type = item.get("type", "")
                item_path = item.get("path", "")

                if file_type != "file":
                    continue

                name_lower = file_name.lower()
                print(f"[cloud sync] Processing: {file_name} | mime: {item.get('mime_type')} | has_file: {bool(item.get('file'))}")

                # --- Handle .txt files ---
                if name_lower.endswith(".txt"):
                    download_url = item.get("file", "")
                    print(f"[cloud sync] TXT file '{file_name}': direct_url={bool(download_url)}, path={item_path}")
                    if not download_url:
                        download_url = await get_public_download_url(client, public_key, item_path)
                        print(f"[cloud sync] TXT download url fetched: {bool(download_url)} -> {download_url[:80] if download_url else 'EMPTY'}")

                    if download_url:
                        text_resp = await client.get(download_url)
                        print(f"[cloud sync] TXT content status: {text_resp.status_code}, len={len(text_resp.text)}")
                        if text_resp.status_code == 200:
                            content = text_resp.text.strip()
                            if content:
                                # Save to ChromaDB for AI context
                                upsert_user_vector(
                                    user_id=current_user_id,
                                    info_text=content,
                                    metadata={"source": "yandex_disk", "filename": file_name}
                                )
                                # Also create a Post record so text is visible/draggable in UI
                                new_text_post = models.Post(
                                    title=f"Текст: {file_name}",
                                    content=content,
                                    image_url=None,
                                    status="draft",
                                    owner_id=current_user_id
                                )
                                db.add(new_text_post)
                                synced_texts += 1
                                print(f"[cloud sync] TXT '{file_name}' saved to ChromaDB + Post record created")

                # --- Handle image files ---
                elif name_lower.endswith(IMAGE_EXTS):
                    image_url = item.get("file", "") or item.get("preview", "")
                    if not image_url:
                        image_url = await get_public_download_url(client, public_key, item_path)

                    if image_url:
                        # Download image to local storage to avoid expired links/CORS
                        import uuid
                        ext = name_lower.rsplit('.', 1)[-1]
                        local_filename = f"sync_{uuid.uuid4().hex[:12]}.{ext}"
                        
                        save_dir = os.path.join(os.path.dirname(__file__), '..', 'static', 'yandex_sync')
                        os.makedirs(save_dir, exist_ok=True)
                        save_path = os.path.join(save_dir, local_filename)
                        
                        img_resp = await client.get(image_url)
                        if img_resp.status_code == 200:
                            with open(save_path, 'wb') as f:
                                f.write(img_resp.content)
                            
                            local_url = f"/static/yandex_sync/{local_filename}"
                            new_post = models.Post(
                                title=f"Черновик: {file_name}",
                                content=None,
                                image_url=local_url,
                                status="draft",
                                owner_id=current_user_id
                            )
                            db.add(new_post)
                            synced_images += 1
                            print(f"[cloud sync] Image '{file_name}' downloaded and saved as {local_url}")
                        else:
                            print(f"[cloud sync] Failed to download image '{file_name}': {img_resp.status_code}")

            # Save/update integration record
            integration = db.query(models.CloudIntegration).filter(
                models.CloudIntegration.owner_id == current_user_id,
                models.CloudIntegration.yandex_folder_url == public_key
            ).first()

            if not integration:
                integration = models.CloudIntegration(
                    yandex_folder_url=public_key,
                    owner_id=current_user_id
                )
                db.add(integration)

            db.commit()

            return {
                "message": "Synchronization successful",
                "synced_texts": synced_texts,
                "synced_images": synced_images
            }

        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
