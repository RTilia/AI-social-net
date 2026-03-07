import httpx
import logging
import base64

logger = logging.getLogger(__name__)

async def send_telegram_post(bot_token: str, chat_id: str, text: str, image_url: str = None) -> bool:
    """
    Sends a message (with optional image) to a Telegram chat.
    Returns True if successful, False otherwise.
    """
    if not bot_token or not chat_id:
        logger.error("Missing Telegram bot token or chat ID.")
        return False

    base_url = f"https://api.telegram.org/bot{bot_token}"

    try:
        async with httpx.AsyncClient() as client:
            if image_url:
                url = f"{base_url}/sendPhoto"
                data = {
                    "chat_id": chat_id,
                    "parse_mode": "HTML"
                }

                # Telegram caption limit is 1024 characters
                caption = text if text and len(text) <= 1024 else ""
                if caption:
                    data["caption"] = caption

                if image_url.startswith("data:image"):
                    header, encoded = image_url.split(",", 1)
                    image_bytes = base64.b64decode(encoded)
                    files = {"photo": ("image.jpg", image_bytes, "image/jpeg")}
                    response = await client.post(url, data=data, files=files)
                else:
                    data["photo"] = image_url
                    response = await client.post(url, data=data)
                
                result = response.json()
                if not (response.status_code == 200 and result.get("ok")):
                     logger.error(f"Failed to send photo to Telegram: {result}")
                     return False
                     
                # If text was too long for caption, send it as a separate message
                if text and len(text) > 1024:
                    msg_url = f"{base_url}/sendMessage"
                    msg_data = {
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": "HTML"
                    }
                    response = await client.post(msg_url, data=msg_data)
                    
            else:
                # Отправка только текста
                url = f"{base_url}/sendMessage"
                data = {
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML"
                }
                response = await client.post(url, data=data)

            result = response.json()
            if response.status_code == 200 and result.get("ok"):
                logger.info(f"Successfully sent message to Telegram chat {chat_id}")
                return True
            else:
                logger.error(f"Failed to send message to Telegram: {result}")
                return False
    except Exception as e:
        logger.error(f"Exception during Telegram sending: {e}")
        return False
