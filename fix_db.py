
import sqlite3
import os

db_path = os.path.join('backend', 'data', 'app.db')

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Adding ai_provider column...")
    cursor.execute("ALTER TABLE users ADD COLUMN ai_provider TEXT DEFAULT 'openrouter'")
    print("ai_provider added.")
except sqlite3.OperationalError as e:
    print(f"ai_provider column might already exist: {e}")

try:
    print("Adding ollama_model column...")
    cursor.execute("ALTER TABLE users ADD COLUMN ollama_model TEXT DEFAULT 'llama3'")
    print("ollama_model added.")
except sqlite3.OperationalError as e:
    print(f"ollama_model column might already exist: {e}")

conn.commit()
conn.close()
print("Migration complete.")
