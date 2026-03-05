import chromadb
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_data")
client = chromadb.PersistentClient(path=DB_PATH)

# Коллекция для хранения информации о пользователях (Brand Voice, метрики)
users_collection = client.get_or_create_collection(name="users")

def upsert_user_vector(user_id: int, info_text: str, metadata: dict):
    """
    Сохраняет или обновляет информацию о пользователе в векторной базе по его ID.
    info_text - текстовое описание (например, метрики или стиль бренда), которое переводится в вектор.
    """
    try:
        users_collection.upsert(
            documents=[info_text],
            metadatas=[metadata],
            ids=[str(user_id)]
        )
        return True
    except Exception as e:
        print(f"Ошибка сохранения в векторную БД: {e}")
        return False

def get_user_vector(user_id: int):
    """
    Получает сохраненную информацию пользователя по ID (строгое совпадение).
    """
    try:
        result = users_collection.get(ids=[str(user_id)])
        if result and result['documents']:
            return {"document": result['documents'][0], "metadata": result['metadatas'][0]}
        return None
    except Exception:
        return None

def search_users(query: str, n_results: int = 3):
    """
    Семантический поиск по пользователям.
    """
    results = users_collection.query(
        query_texts=[query],
        n_results=n_results
    )
    return results
