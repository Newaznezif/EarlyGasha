import sqlite3
import os

db_path = "earlygasha.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT email, role FROM users;")
        rows = cursor.fetchall()
        print(f"Total Users: {len(rows)}")
        for r in rows:
            print(f"Email: {r[0]}, Role: {r[1]}")
    except Exception as e:
        print(f"Error reading users: {e}")
    finally:
        conn.close()
else:
    print("No database file found.")
