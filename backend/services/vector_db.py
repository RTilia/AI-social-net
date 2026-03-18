import chromadb
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_data")
client = chromadb.PersistentClient(path=DB_PATH)

# Коллекция для хранения постов, где каждый пост — референс стиля
posts_collection = client.get_or_create_collection(name="brand_posts")

def add_post_to_vector_db(post_id: int, user_id: int, content: str, topic: str):
    """
    Добавляет текст поста в векторную базу для последующего использования в RAG.
    """
    if not content or len(content.strip()) < 10:
        return False
        
    try:
        posts_collection.upsert(
            documents=[content],
            metadatas=[{"user_id": user_id, "post_id": post_id, "topic": topic}],
            ids=[f"post_{post_id}"]
        )
        return True
    except Exception as e:
        print(f"Ошибка сохранения поста в векторную БД: {e}")
        return False

def get_similar_posts(user_id: int, query_theme: str, n_results: int = 2) -> list[str]:
    """
    Ищет релевантные прошлые посты пользователя по теме для использования в Few-Shot Prompting.
    """
    try:
        results = posts_collection.query(
            query_texts=[query_theme],
            n_results=n_results,
            where={"user_id": user_id}
        )
        if results and results['documents'] and results['documents'][0]:
            return results['documents'][0]
        return []
    except Exception as e:
        print(f"Ошибка поиска в векторной БД: {e}")
        return []
