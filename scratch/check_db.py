import sqlite3
import os

db_path = 'earlygasha.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    tables = ['communication_rooms', 'regions', 'users', 'risk_scores', 'indicators']
    for table in tables:
        print(f"\n--- Table: {table} ---")
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"Count: {count}")
            cursor.execute(f"SELECT * FROM {table} LIMIT 5")
            rows = cursor.fetchall()
            for row in rows:
                print(row)
        except Exception as e:
            print(f"Error querying {table}: {e}")
    conn.close()
