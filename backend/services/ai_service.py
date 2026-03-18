import os
import asyncio
import base64
import urllib.parse
import httpx
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "dummy_key")
HF_TOKEN = os.getenv("HF_TOKEN", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

# Список моделей HF для попытки (в порядке предпочтения)
HF_MODELS = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
]


async def generate_image_hf(prompt: str) -> str | None:
    """
    Пробует сгенерировать изображение через HF Inference API.
    Возвращает base64 data URL или None если не получилось.
    """
    if not HF_TOKEN:
        return None

    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=40.0) as http_client:
        for model in HF_MODELS:
            # Используем новый эндпоинт HF Router
            url = f"https://router.huggingface.co/hf-inference/models/{model}"
            try:
                resp = await http_client.post(
                    url,
                    headers=headers,
                    json={"inputs": prompt}
                )
                if resp.status_code == 200:
                    content_type = resp.headers.get("content-type", "")
                    if "image" in content_type:
                        b64 = base64.b64encode(resp.content).decode("utf-8")
                        ext = "jpeg" if "jpeg" in content_type else "png"
                        return f"data:image/{ext};base64,{b64}"
                elif resp.status_code == 503:
                    # Модель грузится — ждём и пробуем ещё раз
                    print(f"[HF {model}] Loading (503), waiting...")
                    await asyncio.sleep(8)
                    resp2 = await http_client.post(url, headers=headers, json={"inputs": prompt})
                    if resp2.status_code == 200:
                        b64 = base64.b64encode(resp2.content).decode("utf-8")
                        return f"data:image/jpeg;base64,{b64}"
                
                print(f"[HF {model}] Error {resp.status_code}: {resp.text[:100]}")
            except Exception as e:
                print(f"[HF {model}] Exception: {e}")

    return None


async def generate_post_content(brand_voice: str, theme: str, target_audience: str, length: str = "Medium", ai_provider: str = "openrouter", ollama_model: str = "llama3") -> tuple[str, str]:

    length_instruction = {
        "Short": "Сделай текст очень коротким, максимум 1-2 абзаца.",
        "Medium": "Сделай текст среднего размера, 3-4 абзаца.",
        "Long": "Напиши подробный лонгрид, разделенный на смысловые блоки."
    }.get(length, "Сделай текст среднего размера.")

    system_prompt_text = (
        f"Ты креативный SMM-специалист и копирайтер. Напиши яркий и вовлекающий пост для соцсетей на тему '{theme}'.\n"
        f"Целевая аудитория: {target_audience}.\n"
        f"Уникальный стиль твоего бренда (Tone of Voice): {brand_voice}.\n\n"
        f"{length_instruction}\n\n"
        "ВАЖНЫЕ ПРАВИЛА ФОРМАТИРОВАНИЯ:\n"
        "1. КАТЕГОРИЧЕСКИ ЗАПРЕЩАЕТСЯ использовать markdown: никаких звездочек (**), решеток (#) для заголовков, подчеркиваний (_) или жирного шрифта.\n"
        "2. Текст должен выглядеть эстетично и читаемо.\n"
        "3. Разделяй мысли пустыми строками (абзацами).\n"
        "4. Используй 3-5 подходящих по смыслу красивых эмодзи, чтобы разнообразить текст, но не переборщи.\n"
        "5. В конце текста добавь 3-4 релевантных хэштега (вот здесь знак решетки писать можно, например: #бизнес #технологии).\n"
        "Пиши ТОЛЬКО текст готового поста, без приветствий и вводных слов."
    )

    async def get_text():
        if ai_provider == "ollama":
            try:
                # Используем локальный Ollama API
                async with httpx.AsyncClient(timeout=60.0) as http_client:
                    response = await http_client.post(
                        f"{OLLAMA_BASE_URL}/api/generate",
                        json={
                            "model": ollama_model,
                            "prompt": f"System: {system_prompt_text}\nUser: Напиши пост.",
                            "stream": False
                        }
                    )
                    if response.status_code == 200:
                        return response.json().get("response", "Ошибка: пустой ответ от Ollama")
                    return f"Ошибка Ollama: {response.status_code} {response.text}"
            except Exception as e:
                return f"Ошибка генерации Ollama: {str(e)}"
        
        # Старая логика OpenRouter
        try:
            response = await client.chat.completions.create(
                model="deepseek/deepseek-chat",
                messages=[
                    {"role": "system", "content": system_prompt_text},
                    {"role": "user", "content": "Напиши пост."}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Ошибка генерации текста: {str(e)}"

    async def get_image_url():
        try:
            # Шаг 1: получаем красивый промпт
            if ai_provider == "ollama":
                try:
                    async with httpx.AsyncClient(timeout=30.0) as http_client:
                        resp = await http_client.post(
                            f"{OLLAMA_BASE_URL}/api/generate",
                            json={
                                "model": ollama_model,
                                "prompt": (
                                    f"System: You are an expert prompt engineer for image generation AI. Create a short, vivid English image prompt (max 20 words) for a social media post about the given topic. Style: photorealistic, vibrant colors, professional photography. Reply ONLY with the prompt, no explanations.\n"
                                    f"User: {theme}"
                                ),
                                "stream": False
                            }
                        )
                        img_prompt = resp.json().get("response", theme).strip() if resp.status_code == 200 else theme
                except:
                    img_prompt = theme
            else:
                prompt_response = await client.chat.completions.create(
                    model="deepseek/deepseek-chat",
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are an expert prompt engineer for image generation AI. "
                                "Create a short, vivid English image prompt (max 20 words) for a social media post about the given topic. "
                                "Style: photorealistic, vibrant colors, professional photography. "
                                "Reply ONLY with the prompt, no explanations."
                            )
                        },
                        {"role": "user", "content": theme}
                    ]
                )
                img_prompt = prompt_response.choices[0].message.content.strip()
            print(f"[Image] Prompt: {img_prompt}")

            # Шаг 2: пробуем HF
            hf_url = await generate_image_hf(img_prompt)
            if hf_url:
                print(f"[Image] HF success, size: {len(hf_url)} chars")
                return hf_url

            # Fallback: LoremFlickr (бесплатный и надежный)
            print("[Image] HF failed, using LoremFlickr fallback")
            keyword = img_prompt.split()[0].lower() if img_prompt else theme
            return f"https://loremflickr.com/1024/1024/{urllib.parse.quote(keyword)}"

        except Exception as e:
            print(f"[Image] Error: {e}")
            return f"https://loremflickr.com/1024/1024/business"

    text, img_url = await asyncio.gather(get_text(), get_image_url())
    return text, img_url
