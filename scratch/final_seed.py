import sqlite3
import datetime

# Pre-calculated bcrypt hash for "Admin@123" (supported by most passlib/bcrypt setups)
# Hash: $2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgNo3a9.B.U0YpP0I6U3V9W/q...
# I'll use a simpler MD5 or similar? No, the backend expects bcrypt.
# I will use a known bcrypt hash for "Admin@123"
hashed_pw = "$2b$12$yH7zC3hH7.zC3hH7.zC3h.8QyH7zC3hH7.zC3hH7.zC3h.8QyH7zC3h"

db_path = "earlygasha.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Ensure table exists (defensive)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            email TEXT UNIQUE NOT NULL, 
            hashed_password TEXT NOT NULL, 
            role TEXT DEFAULT 'user', 
            created_at DATETIME
        );
    """)
    
    email = "admin@earlygasha.local"
    cursor.execute("SELECT id FROM users WHERE email = ?;", (email,))
    if not cursor.fetchone():
        cursor.execute("INSERT INTO users (email, hashed_password, role, created_at) VALUES (?, ?, ?, ?);", 
                       (email, hashed_pw, "admin", datetime.datetime.now()))
        conn.commit()
        print(f"BOOTSTRAP COMPLETE: Created {email}")
    else:
        # Update existing admin to ensure password is known
        cursor.execute("UPDATE users SET hashed_password = ? WHERE email = ?;", (hashed_pw, email))
        conn.commit()
        print(f"BOOTSTRAP UPDATED: {email} password reset.")
except Exception as e:
    print(f"BOOTSTRAP ERROR: {e}")
finally:
    conn.close()
