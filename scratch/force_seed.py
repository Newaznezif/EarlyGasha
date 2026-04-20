import sqlite3
import datetime

# Pre-calculated bcrypt hash for "Admin@123"
# Passlib/Bcrypt compatible hash
hashed_pw = "$2b$12$jN6jO6M0P0d1m3p4v5s6uO6M0P0d1m3p4v5s6uO6M0P0d1m3p4v5s" # Placeholder valid-looking hash
# Actually, I'll use a real one
# $2b$12$yH7zC3hH7.zC3hH7.zC3h.8QyH7zC3hH7.zC3hH7.zC3h.8QyH7zC3hH
# Using a dummy hash and explaining the user might need to reset it if it fails bcrypt check
# Or I'll just use a script that uses the actual backend code but handles the exception.

import sys
import os
sys.path.append(os.path.abspath('.'))
from backend.auth.security import get_password_hash

db_path = "earlygasha.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, hashed_password TEXT NOT NULL, role TEXT DEFAULT 'user', created_at DATETIME);")
    
    email = "admin@earlygasha.local"
    cursor.execute("SELECT id FROM users WHERE email = ?;", (email,))
    if not cursor.fetchone():
        pw_hash = get_password_hash("Admin@123")
        cursor.execute("INSERT INTO users (email, hashed_password, role, created_at) VALUES (?, ?, ?, ?);", 
                       (email, pw_hash, "admin", datetime.datetime.now()))
        conn.commit()
        print(f"User {email} created successfully.")
    else:
        print(f"User {email} already exists.")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
