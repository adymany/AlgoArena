from flask import Flask, request, jsonify
from flask_cors import CORS
import docker
import tarfile
import io
import os
import threading
import psycopg2
import time
import json
import shutil
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base directory is where this script lives (backend/)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROBLEMS_DIR = os.path.join(BASE_DIR, "problems")

app = Flask(__name__)

@app.route("/api/v1/problems/<slug>", methods=["GET"])
def get_problem(slug):
    print(f"Fetching problem details: {slug}")
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, "SELECT slug, title, description, difficulty, templates FROM problems WHERE slug = %s", (slug,))
        row = cur.fetchone()
        if row:
            # Read driver files from disk
            problem_dir = os.path.join(PROBLEMS_DIR, slug)
            driver_python = ""
            driver_cpp = ""
            test_data = ""
            
            if os.path.exists(os.path.join(problem_dir, "driver.py")):
                with open(os.path.join(problem_dir, "driver.py"), "r", encoding="utf-8") as f:
                    driver_python = f.read()
            
            if os.path.exists(os.path.join(problem_dir, "driver.cpp")):
                with open(os.path.join(problem_dir, "driver.cpp"), "r", encoding="utf-8") as f:
                    driver_cpp = f.read()
                    
            if os.path.exists(os.path.join(problem_dir, "test_data.txt")):
                with open(os.path.join(problem_dir, "test_data.txt"), "r", encoding="utf-8") as f:
                    test_data = f.read()

            return jsonify({
                "slug": row[0], 
                "title": row[1], 
                "description": row[2], 
                "difficulty": row[3],
                "templates": row[4],
                "driver_python": driver_python,
                "driver_cpp": driver_cpp,
                "test_data": test_data
            })
        return jsonify({"error": "Problem not found"}), 404
    finally:
        conn.close()

# --- Admin Endpoints ---

@app.route("/api/v1/admin/stats", methods=["GET"])
def admin_stats():
    from datetime import datetime, timedelta
    conn = get_db_connection()
    try:
        cur = conn.cursor()

        # --- Users ---
        execute_query(cur, "SELECT COUNT(*) FROM users")
        total_users = cur.fetchone()[0]

        execute_query(cur, "SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE")
        new_today = cur.fetchone()[0]

        # Active today = users who submitted today
        execute_query(cur, """
            SELECT COUNT(DISTINCT user_id) FROM submissions
            WHERE created_at >= CURRENT_DATE
        """)
        active_today = cur.fetchone()[0]

        # --- Submissions ---
        execute_query(cur, "SELECT COUNT(*) FROM submissions")
        total_submissions = cur.fetchone()[0]

        execute_query(cur, "SELECT COUNT(*) FROM submissions WHERE created_at >= CURRENT_DATE")
        submissions_today = cur.fetchone()[0]

        execute_query(cur, "SELECT COUNT(*) FROM submissions WHERE status = 'Pass'")
        pass_count = cur.fetchone()[0]

        fail_count = total_submissions - pass_count
        acceptance_rate = round((pass_count / max(total_submissions, 1)) * 100, 1)

        # --- Problems ---
        execute_query(cur, "SELECT COUNT(*) FROM problems")
        total_problems = cur.fetchone()[0]

        execute_query(cur, "SELECT difficulty, COUNT(*) FROM problems GROUP BY difficulty")
        by_difficulty = {row[0]: row[1] for row in cur.fetchall()}

        # --- Hourly Activity (today, 24h) ---
        execute_query(cur, """
            SELECT EXTRACT(HOUR FROM created_at)::int AS hr, COUNT(*)
            FROM submissions
            WHERE created_at >= CURRENT_DATE
            GROUP BY hr ORDER BY hr
        """)
        hourly_map = {row[0]: row[1] for row in cur.fetchall()}
        hourly_activity = []
        for h in range(24):
            hourly_activity.append({
                "hour": f"{h:02d}:00",
                "count": hourly_map.get(h, 0)
            })

        # --- Language Distribution ---
        execute_query(cur, """
            SELECT language, COUNT(*) FROM submissions GROUP BY language ORDER BY COUNT(*) DESC
        """)
        language_distribution = {row[0]: row[1] for row in cur.fetchall()}

        # --- Top Problems (by submission count) ---
        execute_query(cur, """
            SELECT s.problem_id, p.title, 
                   COUNT(*) AS total,
                   SUM(CASE WHEN s.status = 'Pass' THEN 1 ELSE 0 END) AS passes
            FROM submissions s
            LEFT JOIN problems p ON s.problem_id = p.slug
            GROUP BY s.problem_id, p.title
            ORDER BY total DESC
            LIMIT 8
        """)
        top_problems = []
        for row in cur.fetchall():
            t = row[2]
            p = row[3]
            top_problems.append({
                "slug": row[0],
                "title": row[1] or row[0],
                "submissions": t,
                "acceptance": round((p / max(t, 1)) * 100, 1)
            })

        # --- Recent Users with stats ---
        execute_query(cur, """
            SELECT u.id, u.username, u.created_at,
                   COUNT(s.id) AS sub_count,
                   COUNT(DISTINCT CASE WHEN s.status = 'Pass' THEN s.problem_id END) AS solved,
                   MAX(s.created_at) AS last_active
            FROM users u
            LEFT JOIN submissions s ON u.id = s.user_id
            GROUP BY u.id, u.username, u.created_at
            ORDER BY sub_count DESC
        """)
        recent_users = []
        for row in cur.fetchall():
            recent_users.append({
                "id": row[0],
                "username": row[1],
                "joined": row[2].isoformat() if row[2] else None,
                "submissions": row[3],
                "solved": row[4],
                "last_active": row[5].isoformat() if row[5] else None
            })

        return jsonify({
            "users": {"total": total_users, "new_today": new_today, "active_today": active_today},
            "submissions": {"total": total_submissions, "today": submissions_today, "pass_count": pass_count, "fail_count": fail_count},
            "acceptance_rate": acceptance_rate,
            "problems": {"total": total_problems, "by_difficulty": by_difficulty},
            "hourly_activity": hourly_activity,
            "language_distribution": language_distribution,
            "top_problems": top_problems,
            "recent_users": recent_users
        })
    finally:
        conn.close()

@app.route("/api/v1/admin/problems", methods=["POST"])
def create_problem():
    data = request.json
    slug = data.get("slug")
    title = data.get("title")
    description = data.get("description", "")
    difficulty = data.get("difficulty", "Easy")
    python_template = data.get("python_template", "")
    cpp_template = data.get("cpp_template", "")
    driver_python = data.get("driver_python", "")
    driver_cpp = data.get("driver_cpp", "")
    test_data = data.get("test_data", "")
    
    print(f"Creating new problem: {slug}")
    
    if not slug or not title:
        return jsonify({"error": "slug and title are required"}), 400
    
    templates = json.dumps({"python": python_template, "cpp": cpp_template})
    
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, "SELECT id FROM problems WHERE slug = %s", (slug,))
        if cur.fetchone():
            return jsonify({"error": "Problem with this slug already exists"}), 409
        
        execute_query(cur, 
            "INSERT INTO problems (slug, title, description, difficulty, templates) VALUES (%s, %s, %s, %s, %s)",
            (slug, title, description, difficulty, templates))
        conn.commit()
        
        problem_dir = os.path.join(PROBLEMS_DIR, slug)
        os.makedirs(problem_dir, exist_ok=True)
        
        if driver_python:
            with open(os.path.join(problem_dir, "driver.py"), "w", encoding="utf-8") as f:
                f.write(driver_python)
        
        if driver_cpp:
            with open(os.path.join(problem_dir, "driver.cpp"), "w", encoding="utf-8") as f:
                f.write(driver_cpp)
        
        if test_data:
            with open(os.path.join(problem_dir, "test_data.txt"), "w", encoding="utf-8") as f:
                f.write(test_data)
        
        return jsonify({"message": "Problem created", "slug": slug}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route("/api/v1/admin/problems/<slug>", methods=["PUT"])
def update_problem(slug):
    data = request.json
    title = data.get("title")
    description = data.get("description", "")
    difficulty = data.get("difficulty", "Easy")
    python_template = data.get("python_template", "")
    cpp_template = data.get("cpp_template", "")
    driver_python = data.get("driver_python", "")
    driver_cpp = data.get("driver_cpp", "")
    test_data = data.get("test_data", "")
    
    print(f"Updating problem: {slug}")
    
    templates = json.dumps({"python": python_template, "cpp": cpp_template})
    
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        # Check if problem exists
        execute_query(cur, "SELECT id FROM problems WHERE slug = %s", (slug,))
        if not cur.fetchone():
            return jsonify({"error": "Problem not found"}), 404
            
        execute_query(cur, 
            "UPDATE problems SET title = %s, description = %s, difficulty = %s, templates = %s WHERE slug = %s",
            (title, description, difficulty, templates, slug))
        conn.commit()
        
        # Update files
        problem_dir = os.path.join(PROBLEMS_DIR, slug)
        os.makedirs(problem_dir, exist_ok=True)
        
        # Always write (truncate) or create
        with open(os.path.join(problem_dir, "driver.py"), "w", encoding="utf-8") as f:
            f.write(driver_python)
        
        with open(os.path.join(problem_dir, "driver.cpp"), "w", encoding="utf-8") as f:
            f.write(driver_cpp)
        
        with open(os.path.join(problem_dir, "test_data.txt"), "w", encoding="utf-8") as f:
            f.write(test_data)
        
        return jsonify({"message": "Problem updated"}), 200
    except Exception as e:
        print(f"Update error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route("/api/v1/admin/problems/<slug>", methods=["DELETE"])
def delete_problem(slug):
    print(f"Deleting problem: {slug}")
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        
        # 1. Delete associated chat sessions
        execute_query(cur, "DELETE FROM chat_sessions WHERE problem_id = %s", (slug,))
        
        # 2. Delete associated submissions
        execute_query(cur, "DELETE FROM submissions WHERE problem_id = %s", (slug,))

        # 3. Delete the problem itself
        execute_query(cur, "DELETE FROM problems WHERE slug = %s RETURNING slug", (slug,))
        row = cur.fetchone()
        
        if not row:
             return jsonify({"error": "Problem not found"}), 404
        
        conn.commit()
        
        # Remove files
        problem_dir = os.path.join(PROBLEMS_DIR, slug)
        if os.path.exists(problem_dir):
            shutil.rmtree(problem_dir)
            
        return jsonify({"message": "Problem deleted"}), 200
    except Exception as e:
        print(f"Delete error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
CORS(app) 

client = docker.from_env()

# Database Connection
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME", "contest_db"),
            user=os.getenv("DB_USER", "user"),
            password=os.getenv("DB_PASSWORD", "password"),
            port=os.getenv("DB_PORT", "5433")
        )
        return conn
    except Exception as e:
        print("Database connection failed:", e)
        return None

# Helper to log and execute queries
def execute_query(cur, query, params=None):
    if params:
        print(f"\n[SQL QUERY]: {query} | Params: {params}")
        cur.execute(query, params)
    else:
        print(f"\n[SQL QUERY]: {query}")
        cur.execute(query)

# Initialize Database
def init_db():
    retries = 5
    while retries > 0:
        conn = get_db_connection()
        if conn:
            try:
                cur = conn.cursor()
                
                # Users Table
                execute_query(cur, """
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(50) UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        is_admin BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)

                # MIGRATION: Ensure 'is_admin' column exists for existing tables
                try:
                    execute_query(cur, "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE")
                    conn.commit()
                except Exception as ex:
                    print("Migration warning (is_admin):", ex)
                    conn.rollback()

                # Problems Table
                execute_query(cur, """
                    CREATE TABLE IF NOT EXISTS problems (
                        id SERIAL PRIMARY KEY,
                        slug VARCHAR(50) UNIQUE NOT NULL,
                        title VARCHAR(100) NOT NULL,
                        description TEXT NOT NULL,
                        difficulty VARCHAR(10) DEFAULT 'Easy',
                        templates JSONB DEFAULT '{}'
                    );
                """)
                
                # MIGRATION: Ensure 'templates' column exists for existing tables
                try:
                   execute_query(cur, "ALTER TABLE problems ADD COLUMN IF NOT EXISTS templates JSONB DEFAULT '{}'")
                   conn.commit()
                except Exception as ex:
                   print("Migration warning (templates):", ex)
                   conn.rollback()


                # Submissions Table
                execute_query(cur, """
                    CREATE TABLE IF NOT EXISTS submissions (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id),
                        language VARCHAR(10) NOT NULL,
                        code TEXT NOT NULL,
                        problem_id VARCHAR(50),
                        status VARCHAR(20),
                        output TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)

                # Chat Sessions Table
                execute_query(cur, """
                    CREATE TABLE IF NOT EXISTS chat_sessions (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id),
                        problem_id VARCHAR(50),
                        history JSONB DEFAULT '[]',
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, problem_id)
                    );
                """)

                conn.commit()
                
                # Seed Problems
                seed_problems(cur)
                conn.commit()

                # Seed default user (so user_id=1 always exists)
                execute_query(cur, "SELECT id FROM users WHERE username = %s", ("admin",))
                if not cur.fetchone():
                    hashed = generate_password_hash("admin123")
                    execute_query(cur, "INSERT INTO users (username, password_hash, is_admin) VALUES (%s, %s, %s)", ("admin", hashed, True))
                    print("Default user 'admin' created (password: admin123)")
                else:
                    # Ensure existing admin user has is_admin flag
                    execute_query(cur, "UPDATE users SET is_admin = TRUE WHERE username = %s", ("admin",))
                
                # Also grant admin to specific users
                for admin_user in ["23se02cs093@ppsu.ac.in"]:
                    execute_query(cur, "UPDATE users SET is_admin = TRUE WHERE username = %s", (admin_user,))
                
                conn.commit()
                
                cur.close()
                conn.close()
                print("Database initialized successfully.")
                return
            except Exception as e:
                print("Error initializing database:", e)
        else:
            print(f"Waiting for database... ({retries} retries left)")
            time.sleep(2)
            retries -= 1

def seed_problems(cur):
    problems = [
        ("two_sum", "Two Sum", """
<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.</p>
<p>You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.</p>
<p>You can return the answer in any order.</p>

<div class="example-box">
    <div class="example-title">Example 1:</div>
    <p><span class="example-label">Input:</span> nums = [2,7,11,15], target = 9</p>
    <p><span class="example-label">Output:</span> [0,1]</p>
    <p style="color: #64748b; font-size: 0.85em;">Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].</p>
</div>

<div class="example-box">
    <div class="example-title">Example 2:</div>
    <p><span class="example-label">Input:</span> nums = [3,2,4], target = 6</p>
    <p><span class="example-label">Output:</span> [1,2]</p>
</div>

<div class="example-box">
    <div class="example-title">Example 3:</div>
    <p><span class="example-label">Input:</span> nums = [3,3], target = 6</p>
    <p><span class="example-label">Output:</span> [0,1]</p>
</div>
""", "Easy", json.dumps({
    "python": "class Solution:\n    def twoSum(self, nums, target):\n        ",
    "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};"
})),

        ("palindrome_number", "Palindrome Number", """
<p>Given an integer <code>x</code>, return <code>true</code> if <code>x</code> is a <strong>palindrome</strong>, and <code>false</code> otherwise.</p>
""", "Easy", json.dumps({
    "python": "class Solution:\n    def isPalindrome(self, x):\n        ",
    "cpp": "class Solution {\npublic:\n    bool isPalindrome(int x) {\n        \n    }\n};"
})),

        ("valid_parentheses", "Valid Parentheses", """
<p>Given a string <code>s</code> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is valid.</p>
""", "Medium", json.dumps({
    "python": "class Solution:\n    def isValid(self, s):\n        ",
    "cpp": "class Solution {\npublic:\n    bool isValid(string s) {\n        \n    }\n};"
})),

        ("fibonacci_number", "Fibonacci Number", """
<p>The <strong>Fibonacci numbers</strong>, commonly denoted <code>F(n)</code> form a sequence, called the <strong>Fibonacci sequence</strong>, such that each number is the sum of the two preceding ones, starting from <code>0</code> and <code>1</code>.</p>
""", "Easy", json.dumps({
    "python": "class Solution:\n    def fib(self, n):\n        ",
    "cpp": "class Solution {\npublic:\n    int fib(int n) {\n        \n    }\n};"
})),

        ("reverse_string", "Reverse String", """
<p>Write a function that reverses a string. The input string is given as an array of characters <code>s</code>.</p>
<p>You must do this by modifying the input array <strong>in-place</strong> with <code>O(1)</code> extra memory.</p>
""", "Easy", json.dumps({
    "python": "class Solution:\n    def reverseString(self, s):\n        \"\"\"\n        Do not return anything, modify s in-place instead.\n        \"\"\"\n        ",
    "cpp": "class Solution {\npublic:\n    void reverseString(vector<char>& s) {\n        \n    }\n};"
}))
    ]
    
    print("\n--- SEEDING PROBLEMS ---")
    for p in problems:
        # Check if exists first to potentially update it
        slug = p[0]
        execute_query(cur, "SELECT id FROM problems WHERE slug = %s", (slug,))
        exists = cur.fetchone()
        
        if exists:
            # Update description AND templates if it exists
            print(f"Updating content for: {slug}")
            execute_query(cur, "UPDATE problems SET title = %s, description = %s, difficulty = %s, templates = %s WHERE slug = %s", (p[1], p[2], p[3], p[4], slug))
        else:
            print(f"Creating new problem: {slug}")
            execute_query(cur, "INSERT INTO problems (slug, title, description, difficulty, templates) VALUES (%s, %s, %s, %s, %s)", p)
    print("--- SEEDING COMPLETE ---\n")

# Start DB initialization synchronously
init_db()

# --- Auth Endpoints ---
@app.route("/api/v1/check-admin", methods=["GET"])
def check_admin():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"is_admin": False}), 200
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, "SELECT COALESCE(is_admin, FALSE) FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return jsonify({"is_admin": bool(row[0]) if row else False}), 200
    finally:
        conn.close()

@app.route("/api/v1/admin/set-admin", methods=["POST"])
def set_admin():
    data = request.json
    target_username = data.get("username")
    is_admin = data.get("is_admin", True)
    if not target_username:
        return jsonify({"error": "username required"}), 400
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, "UPDATE users SET is_admin = %s WHERE username = %s", (is_admin, target_username))
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"message": f"User {target_username} admin status set to {is_admin}"}), 200
    finally:
        conn.close()

@app.route("/api/v1/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
        
    hashed = generate_password_hash(password)
    
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, "INSERT INTO users (username, password_hash) VALUES (%s, %s) RETURNING id", (username, hashed))
        user_id = cur.fetchone()[0]
        conn.commit()
        print(f"User created: {username} (ID: {user_id})")
        return jsonify({"message": "User created", "user_id": user_id}), 201
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        print(f"Registration failed: Username {username} exists")
        return jsonify({"error": "Username already exists"}), 409
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route("/api/v1/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    print(f"Login attempt for: {username}")
    
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, "SELECT id, password_hash, COALESCE(is_admin, FALSE) FROM users WHERE username = %s", (username,))
        user = cur.fetchone()
        
        if user and check_password_hash(user[1], password):
            print(f"Login success: {username}")
            return jsonify({"message": "Login successful", "user_id": user[0], "username": username, "is_admin": bool(user[2])}), 200
        else:
            print(f"Login failed: {username}")
            return jsonify({"error": "Invalid credentials"}), 401
    finally:
        conn.close()

# --- Problems Endpoints ---
@app.route("/api/v1/problems", methods=["GET"])
def get_problems():
    print("Fetching problem list...")
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, "SELECT slug, title, difficulty FROM problems ORDER BY id ASC")
        problems = [{"slug": row[0], "title": row[1], "difficulty": row[2]} for row in cur.fetchall()]
        return jsonify(problems)
    finally:
        conn.close()


# --- Stats Endpoint ---
@app.route("/api/v1/stats", methods=["GET"])
def get_stats():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor()

        # Total problems
        execute_query(cur, "SELECT COUNT(*) FROM problems")
        total_problems = cur.fetchone()[0]

        # Problems by difficulty
        execute_query(cur, "SELECT difficulty, COUNT(*) FROM problems GROUP BY difficulty")
        diff_totals = {row[0]: row[1] for row in cur.fetchall()}

        # User's solved problems (distinct problem_ids with 'Pass' status)
        execute_query(cur, """
            SELECT DISTINCT problem_id FROM submissions 
            WHERE user_id = %s AND status = 'Pass'
        """, (user_id,))
        solved_slugs = [row[0] for row in cur.fetchall()]
        solved_count = len(solved_slugs)

        # User's attempted problems (distinct problem_ids)
        execute_query(cur, """
            SELECT DISTINCT problem_id FROM submissions WHERE user_id = %s
        """, (user_id,))
        attempted_count = len(cur.fetchall())

        # Total submissions
        execute_query(cur, "SELECT COUNT(*) FROM submissions WHERE user_id = %s", (user_id,))
        total_submissions = cur.fetchone()[0]

        # Pass rate
        if total_submissions > 0:
            execute_query(cur, """
                SELECT COUNT(*) FROM submissions 
                WHERE user_id = %s AND status = 'Pass'
            """, (user_id,))
            pass_count = cur.fetchone()[0]
            pass_rate = round((pass_count / total_submissions) * 100, 1)
        else:
            pass_rate = 0

        # Solved by difficulty
        by_difficulty = {}
        for diff, total in diff_totals.items():
            execute_query(cur, """
                SELECT COUNT(DISTINCT s.problem_id) FROM submissions s
                JOIN problems p ON s.problem_id = p.slug
                WHERE s.user_id = %s AND s.status = 'Pass' AND p.difficulty = %s
            """, (user_id, diff))
            solved_in_diff = cur.fetchone()[0]
            by_difficulty[diff] = {"total": total, "solved": solved_in_diff}

        # Recent activity - full year (365 days)
        from datetime import datetime, timedelta
        execute_query(cur, """
            SELECT DATE(created_at) as day, COUNT(*) 
            FROM submissions 
            WHERE user_id = %s AND created_at >= CURRENT_DATE - INTERVAL '364 days'
            GROUP BY DATE(created_at) 
            ORDER BY day ASC
        """, (user_id,))
        activity_map = {str(row[0]): row[1] for row in cur.fetchall()}
        
        today = datetime.now()
        recent_activity = []
        for i in range(364, -1, -1):
            day = (today - timedelta(days=i)).strftime('%Y-%m-%d')
            recent_activity.append({"date": day, "count": activity_map.get(day, 0)})

        # Streaks
        current_streak = 0
        longest_streak = 0
        streak = 0
        for i in range(364, -1, -1):
            day = (today - timedelta(days=i)).strftime('%Y-%m-%d')
            if activity_map.get(day, 0) > 0:
                streak += 1
                longest_streak = max(longest_streak, streak)
            else:
                streak = 0
        # current streak: count backwards from today
        for i in range(0, 365):
            day = (today - timedelta(days=i)).strftime('%Y-%m-%d')
            if activity_map.get(day, 0) > 0:
                current_streak += 1
            else:
                break

        # Active days count
        active_days = sum(1 for v in activity_map.values() if v > 0)

        return jsonify({
            "total_problems": total_problems,
            "solved": solved_count,
            "attempted": attempted_count,
            "pass_rate": pass_rate,
            "total_submissions": total_submissions,
            "by_difficulty": by_difficulty,
            "recent_activity": recent_activity,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "active_days": active_days
        })
    finally:
        conn.close()

# --- Submissions Endpoints ---
@app.route("/api/v1/submissions", methods=["GET"])
def get_submissions():
    user_id = request.args.get("user_id")
    print(f"Fetching submissions for user: {user_id}")
    
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, """
            SELECT id, problem_id, language, status, created_at 
            FROM submissions 
            WHERE user_id = %s 
            ORDER BY created_at DESC
            LIMIT 50
        """, (user_id,))
        
        submissions = [{
            "id": row[0],
            "problem_id": row[1],
            "language": row[2],
            "status": row[3],
            "created_at": row[4].isoformat() if row[4] else None
        } for row in cur.fetchall()]
        
        return jsonify(submissions)
    finally:
        conn.close()

# Helper: Execute code in Docker
def execute_code_in_docker(lang, code, problem_id, user_id=None, adhoc_driver=None, adhoc_test_data=None):
    fname = "solution.py"
    cmd = ""

    if lang == "python":
        fname = "solution.py"
        if problem_id != "" or adhoc_driver:
            cmd = "python3 -u driver.py < test_data.txt"
        else:
            cmd = "python3 solution.py"
            
    elif lang == "cpp":
        fname = "solution.cpp"
        if problem_id != "" or adhoc_driver:
            cmd = "g++ -o solution driver.cpp -I/home/sandbox && ./solution < test_data.txt"
        else:
            cmd = "g++ -o solution solution.cpp && ./solution"
    else:
        return {"error": "bad language"}, 400

    my_config = {
        "image": "judger:latest",
        "command": ["/bin/bash", "-c", "sleep 600"],
        "mem_limit": "128m",
        "network_mode": "none",
        "detach": True
    }

    try:
        con = client.containers.create(**my_config)
        con.start()
        
        stream = io.BytesIO()
        t = tarfile.open(fileobj=stream, mode='w')
        
        info = tarfile.TarInfo(name=fname)
        b_code = code.encode('utf-8')
        info.size = len(b_code)
        t.addfile(info, io.BytesIO(b_code))
        
        # Use ad-hoc driver/test data if provided, otherwise load from disk
        if adhoc_driver and adhoc_test_data:
            print("  Using ad-hoc driver and test data")
            d_name = "driver.py" if lang == "python" else "driver.cpp"
            d_data = adhoc_driver.encode('utf-8')
            info2 = tarfile.TarInfo(name=d_name)
            info2.size = len(d_data)
            t.addfile(info2, io.BytesIO(d_data))
            
            t_data = adhoc_test_data.encode('utf-8')
            info3 = tarfile.TarInfo(name="test_data.txt")
            info3.size = len(t_data)
            t.addfile(info3, io.BytesIO(t_data))
        elif problem_id != "":
            p_path = os.path.join(PROBLEMS_DIR, problem_id)
            print(f"Loading problem files from: {p_path}")
             
            if lang == "python":
                d_name = "driver.py"
            else:
                d_name = "driver.cpp"
                
            driver_path = os.path.join(p_path, d_name)
            if os.path.exists(driver_path):
                print(f"  Found driver: {driver_path}")
                with open(driver_path, "rb") as f:
                    d_data = f.read()
                    info2 = tarfile.TarInfo(name=d_name)
                    info2.size = len(d_data)
                    t.addfile(info2, io.BytesIO(d_data))
            else:
                print(f"  WARNING: Driver not found: {driver_path}")

            test_path = os.path.join(p_path, "test_data.txt")
            if os.path.exists(test_path):
                print(f"  Found test data: {test_path}")
                with open(test_path, "rb") as f:
                    t_data = f.read()
                    info3 = tarfile.TarInfo(name="test_data.txt")
                    info3.size = len(t_data)
                    t.addfile(info3, io.BytesIO(t_data))
            else:
                print(f"  WARNING: Test data not found: {test_path}")
        
        t.close()
        stream.seek(0)
        con.put_archive("/home/sandbox", stream)
       
        res = {"code": None, "msg": "", "is_tle": False}
        
        def run_thread():
            try:
                escaped_cmd = cmd.replace("'", "'\\''")
                c, out = con.exec_run(
                    cmd=f"/bin/bash -c '{escaped_cmd}'",
                    workdir="/home/sandbox"
                )
                res["code"] = c
                res["msg"] = out
            except:
                print("exec run failed")

        worker = threading.Thread(target=run_thread)
        worker.start()
        
        worker.join(timeout=2)
        
        if worker.is_alive():
            res["is_tle"] = True
            try:
                con.kill() 
            except:
                pass
            worker.join()
            con.remove(force=True)
            return {
                "status": "TLE", 
                "output": "Time Limit Exceeded", 
                "exit_code": 124
            }
            
        con.remove(force=True)
        
        execution_output = res["msg"].decode('utf-8') if res["msg"] else ""
        
        # Determine Pass/Fail based on test output
        if res["code"] != 0:
            exec_status = "Fail"
        elif "FAIL" in execution_output:
            exec_status = "Fail"
        else:
            exec_status = "Pass"
            
        return {
            "status": exec_status,
            "output": execution_output,
            "exit_code": res["code"]
        }

    except Exception as e:
        print("Docker Error:", e)
        return {"error": str(e)}

@app.route("/api/v1/execute", methods=["POST"])
def run_code():
    data = request.json
    lang = data["language"]
    user_code = data["code"]
    pid = data.get("problem_id", "")
    user_id = data.get("user_id")
    
    # Optional ad-hoc driver/test data
    adhoc_driver = data.get("driver_code")
    adhoc_test_data = data.get("test_data")
    
    print(f"Execution request: Lang={lang}, Problem={pid}, User={user_id}")

    result = execute_code_in_docker(lang, user_code, pid, user_id, adhoc_driver, adhoc_test_data)
    
    if "error" in result:
        return jsonify(result), 500 if "error" in result else 200
        
    return jsonify(result)

@app.route("/api/v1/submit", methods=["POST"])
def submit_code():
    data = request.json
    user_id = data.get("user_id")
    problem_id = data.get("problem_id")
    language = data.get("language")
    code = data.get("code")
    
    print(f"Submission: User={user_id}, Problem={problem_id}")
    
    if not all([user_id, problem_id, language, code]):
        return jsonify({"error": "Missing required fields"}), 400
    
    # 1. Execute the code to get status
    print("Verifying submission...")
    result = execute_code_in_docker(language, code, problem_id, user_id)
    
    if "error" in result:
         return jsonify(result), 500

    status = result["status"]
    output = result["output"]
    
    # 2. Save with actual status
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, 
            "INSERT INTO submissions (user_id, problem_id, language, code, status, output) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (user_id, problem_id, language, code, status, output)
        )
        sub_id = cur.fetchone()[0]
        conn.commit()
        print(f"Submission saved with ID: {sub_id}, Status: {status}")
        
        # Return the execution result so frontend can show it
        return jsonify({
            "message": "Submitted successfully", 
            "submission_id": sub_id,
            "status": status,
            "output": output,
            "exit_code": result.get("exit_code")
        }), 201
    except Exception as e:
        print(f"Submit error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

print("Server starting on 9000...")
app.run(host="0.0.0.0", port=9000)
