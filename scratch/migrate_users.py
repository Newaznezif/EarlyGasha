import sqlite3
import os

db_path = "earlygasha.db"

if not os.path.exists(db_path):
    print(f"Error: {db_path} not found.")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Checking 'users' table...")
    cursor.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'region_id' not in columns:
        print("Adding 'region_id' column to 'users' table...")
        cursor.execute("ALTER TABLE users ADD COLUMN region_id INTEGER REFERENCES regions(id)")
        print("Column added successfully.")
    else:
        print("'region_id' column already exists.")
        
    conn.commit()
except Exception as e:
    print(f"Migration failed: {e}")
finally:
    conn.close()
