import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        database="contest_db",
        user="user",
        password="password",
        port="5432"
    )
    print("SUCCESS: Connected to database")
    
    cur = conn.cursor()
    cur.execute("SELECT 1")
    print("SUCCESS: Executed query")
    
    conn.close()
except Exception as e:
    print(f"FAILURE: {e}")
