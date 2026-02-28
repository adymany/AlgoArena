from flask import Flask, request, jsonify, g
from flask_cors import CORS
import docker
import tarfile
import io
import os
import re
import threading
import psycopg2
import time
import json
import shutil
import datetime as dt
from datetime import datetime, timedelta, timezone
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import redis
import jwt as pyjwt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import uuid
import select

# Load environment variables
load_dotenv()

# Base directory is where this script lives (backend/)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROBLEMS_DIR = os.path.join(BASE_DIR, "problems")

DEBUG = os.getenv("DEBUG", "false").lower() == "true"

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    f"http://{os.getenv('FRONTEND_HOST', 'localhost')}:3000",
])

client = docker.from_env()

# --- JWT Config ---
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    print("WARNING: JWT_SECRET not set in .env — using insecure default for development only.")
    JWT_SECRET = "algoarena-dev-secret-key-not-for-production"
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))

# --- Redis Connection ---
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", "6379")),
    db=0,
    decode_responses=True
)

# Test Redis connection at startup
try:
    redis_client.ping()
    print("Redis connected successfully.")
except redis.ConnectionError:
    print("WARNING: Redis connection failed. Caching/rate-limiting will be unavailable.")



# --- Rate Limiter ---
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    storage_uri=f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', '6379')}/2",
    default_limits=["60/minute"]
)

# Database Connection
class DatabaseUnavailableError(Exception):
    pass

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
        raise DatabaseUnavailableError("Database is currently unavailable")

@app.errorhandler(DatabaseUnavailableError)
def handle_db_unavailable(e):
    return jsonify({"error": "Database is currently unavailable. Please try again later."}), 503

# Helper to log and execute queries
def execute_query(cur, query, params=None):
    if DEBUG:
        print(f"\n[SQL QUERY]: {query[:120]}..." if len(query) > 120 else f"\n[SQL QUERY]: {query}")
    if params:
        cur.execute(query, params)
    else:
        cur.execute(query)

# --- JWT Helpers ---
def generate_token(user_id, username, is_admin=False):
    """Generate a JWT token and store it in Redis for validation."""
    payload = {
        "user_id": user_id,
        "username": username,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    token = pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")
    # Store in Redis with TTL for server-side validation & revocation
    redis_client.setex(f"token:{user_id}", JWT_EXPIRY_HOURS * 3600, token)
    return token

def decode_token(token):
    """Decode and validate a JWT token."""
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload["user_id"]
        # Check if token is still valid in Redis (not revoked)
        stored = redis_client.get(f"token:{user_id}")
        if stored != token:
            return None
        return payload
    except pyjwt.ExpiredSignatureError:
        return None
    except pyjwt.InvalidTokenError:
        return None

def require_auth(f):
    """Decorator: requires a valid JWT Bearer token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authentication required"}), 401
        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        g.user_id = payload["user_id"]
        g.username = payload["username"]
        g.is_admin = payload.get("is_admin", False)
        return f(*args, **kwargs)
    return decorated

def require_admin(f):
    """Decorator: requires a valid JWT token AND admin privileges."""
    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        if not g.is_admin:
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated

# --- Cache Helpers ---
def cache_get(key):
    """Get a cached value from Redis."""
    val = redis_client.get(key)
    if val:
        return json.loads(val)
    return None

def cache_set(key, value, ttl=300):
    """Set a cached value in Redis with TTL (seconds)."""
    redis_client.setex(key, ttl, json.dumps(value))

def cache_delete_pattern(pattern):
    """Delete all keys matching a pattern."""
    for key in redis_client.scan_iter(match=pattern):
        redis_client.delete(key)

# --- Routes ---

@app.route("/api/v1/problems/<slug>", methods=["GET"])
def get_problem(slug):
    # Cache individual problem for 10 minutes
    cache_key = f"problem:{slug}"
    cached = cache_get(cache_key)
    if cached:
        print(f"Returning cached problem: {slug}")
        return jsonify(cached)

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

            result = {
                "slug": row[0], 
                "title": row[1], 
                "description": row[2], 
                "difficulty": row[3],
                "templates": row[4],
                "driver_python": driver_python,
                "driver_cpp": driver_cpp,
                "test_data": test_data
            }
            cache_set(cache_key, result, ttl=600)
            return jsonify(result)
        return jsonify({"error": "Problem not found"}), 404
    finally:
        conn.close()

# --- Admin Endpoints ---

@app.route("/api/v1/admin/stats", methods=["GET"])
@require_admin
def admin_stats():
    # Cache admin stats for 30 seconds
    cached = cache_get("admin:stats")
    if cached:
        return jsonify(cached)
    

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
                   MAX(s.created_at) AS last_active,
                   COALESCE(u.is_admin, FALSE) AS is_admin
            FROM users u
            LEFT JOIN submissions s ON u.id = s.user_id
            GROUP BY u.id, u.username, u.created_at, u.is_admin
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
                "last_active": row[5].isoformat() if row[5] else None,
                "is_admin": bool(row[6])
            })

        result = {
            "users": {"total": total_users, "new_today": new_today, "active_today": active_today},
            "submissions": {"total": total_submissions, "today": submissions_today, "pass_count": pass_count, "fail_count": fail_count},
            "acceptance_rate": acceptance_rate,
            "problems": {"total": total_problems, "by_difficulty": by_difficulty},
            "hourly_activity": hourly_activity,
            "language_distribution": language_distribution,
            "top_problems": top_problems,
            "recent_users": recent_users
        }
        cache_set("admin:stats", result, ttl=30)
        return jsonify(result)
    finally:
        conn.close()

@app.route("/api/v1/admin/database", methods=["GET"])
@require_admin
def admin_database():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        ALLOWED_TABLES = {"users", "problems", "submissions", "chat_sessions"}
        tables = [t for t in ["users", "problems", "submissions", "chat_sessions"] if t in ALLOWED_TABLES]
        table_stats = []
        for table in tables:
            cur.execute(f"SELECT COUNT(*) FROM {table}")  # safe: table is from hardcoded whitelist
            count = cur.fetchone()[0]
            # Get estimated size using pg_relation_size
            execute_query(cur, f"SELECT pg_size_pretty(pg_total_relation_size('{table}'))")
            size = cur.fetchone()[0]
            table_stats.append({
                "table": table,
                "rows": count,
                "size": size
            })
        
        execute_query(cur, "SELECT pg_size_pretty(pg_database_size(current_database()))")
        total_db_size = cur.fetchone()[0]
        
        return jsonify({
            "tables": table_stats,
            "total_size": total_db_size
        })
    except Exception as e:
        print(f"DB Stat error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route("/api/v1/admin/users/<int:user_id>", methods=["PUT"])
@require_admin
def update_user_status(user_id):
    data = request.json
    is_admin = data.get("is_admin", False)
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, "UPDATE users SET is_admin = %s WHERE id = %s", (is_admin, user_id))
        conn.commit()
        # Invalidate the target user's JWT so they re-auth with updated is_admin
        redis_client.delete(f"token:{user_id}")
        return jsonify({"message": "User updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        redis_client.delete("admin:stats")
        conn.close()

@app.route("/api/v1/admin/users/<int:user_id>", methods=["DELETE"])
@require_admin
def delete_user(user_id):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        # Ensure we don't delete the last admin
        execute_query(cur, "SELECT COUNT(*) FROM users WHERE is_admin = TRUE")
        if cur.fetchone()[0] == 1:
            execute_query(cur, "SELECT is_admin FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            if user and user[0]:
                return jsonify({"error": "Cannot delete the only admin"}), 400
        
        # Need to clean up related data first
        execute_query(cur, "DELETE FROM submissions WHERE user_id = %s", (user_id,))
        execute_query(cur, "DELETE FROM chat_sessions WHERE user_id = %s", (user_id,))
        execute_query(cur, "DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return jsonify({"message": "User deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        redis_client.delete("admin:stats")
        conn.close()

@app.route("/api/v1/admin/problems", methods=["POST"])
@require_admin
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
        cache_delete_pattern("problems:*")
        cache_delete_pattern("problem:*")
        redis_client.delete("admin:stats")
        conn.close()

@app.route("/api/v1/admin/problems/<slug>", methods=["PUT"])
@require_admin
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
        cache_delete_pattern("problems:*")
        redis_client.delete(f"problem:{slug}")
        redis_client.delete("admin:stats")
        conn.close()

@app.route("/api/v1/admin/problems/<slug>", methods=["DELETE"])
@require_admin
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
        cache_delete_pattern("problems:*")
        redis_client.delete(f"problem:{slug}")
        redis_client.delete("admin:stats")
        conn.close()
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
                
                # Also grant admin to specific users from env
                extra_admins = os.getenv("ADMIN_USERS", "").split(",")
                for admin_user in extra_admins:
                    admin_user = admin_user.strip()
                    if admin_user:
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

<div class="example-box">
    <div class="example-title">Example 1:</div>
    <p><span class="example-label">Input:</span> x = 121</p>
    <p><span class="example-label">Output:</span> true</p>
    <p style="color: #64748b; font-size: 0.85em;">Explanation: 121 reads as 121 from left to right and from right to left.</p>
</div>

<div class="example-box">
    <div class="example-title">Example 2:</div>
    <p><span class="example-label">Input:</span> x = -121</p>
    <p><span class="example-label">Output:</span> false</p>
    <p style="color: #64748b; font-size: 0.85em;">Explanation: From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome.</p>
</div>

<div class="example-box">
    <div class="example-title">Example 3:</div>
    <p><span class="example-label">Input:</span> x = 10</p>
    <p><span class="example-label">Output:</span> false</p>
    <p style="color: #64748b; font-size: 0.85em;">Explanation: Reads 01 from right to left. Therefore it is not a palindrome.</p>
</div>
""", "Easy", json.dumps({
    "python": "class Solution:\n    def isPalindrome(self, x):\n        ",
    "cpp": "class Solution {\npublic:\n    bool isPalindrome(int x) {\n        \n    }\n};"
})),

        ("valid_parentheses", "Valid Parentheses", """
<p>Given a string <code>s</code> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is valid.</p>
<p>An input string is valid if:</p>
<ul style="margin-left: 20px;">
    <li>Open brackets must be closed by the same type of brackets.</li>
    <li>Open brackets must be closed in the correct order.</li>
    <li>Every close bracket has a corresponding open bracket of the same type.</li>
</ul>

<div class="example-box">
    <div class="example-title">Example 1:</div>
    <p><span class="example-label">Input:</span> s = "()"</p>
    <p><span class="example-label">Output:</span> true</p>
</div>

<div class="example-box">
    <div class="example-title">Example 2:</div>
    <p><span class="example-label">Input:</span> s = "()[]{}"</p>
    <p><span class="example-label">Output:</span> true</p>
</div>

<div class="example-box">
    <div class="example-title">Example 3:</div>
    <p><span class="example-label">Input:</span> s = "(]"</p>
    <p><span class="example-label">Output:</span> false</p>
</div>
""", "Medium", json.dumps({
    "python": "class Solution:\n    def isValid(self, s):\n        ",
    "cpp": "class Solution {\npublic:\n    bool isValid(string s) {\n        \n    }\n};"
})),

        ("fibonacci_number", "Fibonacci Number", """
<p>The <strong>Fibonacci numbers</strong>, commonly denoted <code>F(n)</code> form a sequence, called the <strong>Fibonacci sequence</strong>, such that each number is the sum of the two preceding ones, starting from <code>0</code> and <code>1</code>. That is,</p>
<pre style="background: rgba(0,0,0,0.1); padding: 10px; border-radius: 4px;">
F(0) = 0, F(1) = 1
F(n) = F(n - 1) + F(n - 2), for n > 1.
</pre>
<p>Given <code>n</code>, calculate <code>F(n)</code>.</p>

<div class="example-box">
    <div class="example-title">Example 1:</div>
    <p><span class="example-label">Input:</span> n = 2</p>
    <p><span class="example-label">Output:</span> 1</p>
    <p style="color: #64748b; font-size: 0.85em;">Explanation: F(2) = F(1) + F(0) = 1 + 0 = 1.</p>
</div>

<div class="example-box">
    <div class="example-title">Example 2:</div>
    <p><span class="example-label">Input:</span> n = 3</p>
    <p><span class="example-label">Output:</span> 2</p>
    <p style="color: #64748b; font-size: 0.85em;">Explanation: F(3) = F(2) + F(1) = 1 + 1 = 2.</p>
</div>

<div class="example-box">
    <div class="example-title">Example 3:</div>
    <p><span class="example-label">Input:</span> n = 4</p>
    <p><span class="example-label">Output:</span> 3</p>
    <p style="color: #64748b; font-size: 0.85em;">Explanation: F(4) = F(3) + F(2) = 2 + 1 = 3.</p>
</div>
""", "Easy", json.dumps({
    "python": "class Solution:\n    def fib(self, n):\n        ",
    "cpp": "class Solution {\npublic:\n    int fib(int n) {\n        \n    }\n};"
})),

        ("reverse_string", "Reverse String", """
<p>Write a function that reverses a string. The input string is given as an array of characters <code>s</code>.</p>
<p>You must do this by modifying the input array <strong>in-place</strong> with <code>O(1)</code> extra memory.</p>

<div class="example-box">
    <div class="example-title">Example 1:</div>
    <p><span class="example-label">Input:</span> s = ["h","e","l","l","o"]</p>
    <p><span class="example-label">Output:</span> ["o","l","l","e","h"]</p>
</div>

<div class="example-box">
    <div class="example-title">Example 2:</div>
    <p><span class="example-label">Input:</span> s = ["H","a","n","n","a","h"]</p>
    <p><span class="example-label">Output:</span> ["h","a","n","n","a","H"]</p>
</div>
""", "Easy", json.dumps({
    "python": "class Solution:\n    def reverseString(self, s):\n        \"\"\"\n        Do not return anything, modify s in-place instead.\n        \"\"\"\n        ",
    "cpp": "class Solution {\npublic:\n    void reverseString(vector<char>& s) {\n        \n    }\n};"
}))
    ]
    
    print("\n--- SEEDING PROBLEMS ---")
    for p in problems:
        slug = p[0]
        execute_query(cur, "SELECT id FROM problems WHERE slug = %s", (slug,))
        exists = cur.fetchone()
        
        if exists:
            print(f"Problem already exists, skipping: {slug}")
        else:
            print(f"Creating new problem: {slug}")
            execute_query(cur, "INSERT INTO problems (slug, title, description, difficulty, templates) VALUES (%s, %s, %s, %s, %s)", p)
    print("--- SEEDING COMPLETE ---\n")

# Start DB initialization synchronously
init_db()

# --- Auth Endpoints ---
@app.route("/api/v1/check-admin", methods=["GET"])
@require_auth
def check_admin():
    # Read is_admin from the database (not JWT) so it reflects live changes
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, "SELECT COALESCE(is_admin, FALSE) FROM users WHERE id = %s", (g.user_id,))
        row = cur.fetchone()
        return jsonify({"is_admin": bool(row[0]) if row else False}), 200
    finally:
        conn.close()

@app.route("/api/v1/logout", methods=["POST"])
@require_auth
def logout():
    """Revoke the current token by removing it from Redis."""
    redis_client.delete(f"token:{g.user_id}")
    return jsonify({"message": "Logged out successfully"}), 200

@app.route("/api/v1/admin/set-admin", methods=["POST"])
@require_admin
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
@limiter.limit("3/minute")
def register():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    if not re.match(r'^[a-zA-Z0-9_@.\-]{3,50}$', username):
        return jsonify({"error": "Username must be 3-50 characters and contain only letters, numbers, _, @, . or -"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    hashed = generate_password_hash(password)
    
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, "INSERT INTO users (username, password_hash) VALUES (%s, %s) RETURNING id", (username, hashed))
        user_id = cur.fetchone()[0]
        conn.commit()
        print(f"User created: {username} (ID: {user_id})")
        token = generate_token(user_id, username, False)
        return jsonify({"message": "User created", "user_id": user_id, "token": token, "username": username, "is_admin": False}), 201
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
@limiter.limit("5/minute")
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
            token = generate_token(user[0], username, bool(user[2]))
            return jsonify({
                "message": "Login successful",
                "user_id": user[0],
                "username": username,
                "is_admin": bool(user[2]),
                "token": token
            }), 200
        else:
            print(f"Login failed: {username}")
            return jsonify({"error": "Invalid credentials"}), 401
    finally:
        conn.close()

# --- Problems Endpoints ---
@app.route("/api/v1/problems", methods=["GET"])
def get_problems():
    # Cache problems list for 5 minutes
    cached = cache_get("problems:list")
    if cached:
        print("Returning cached problems list")
        return jsonify(cached)
    
    print("Fetching problem list...")
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, """
            SELECT p.slug, p.title, p.difficulty,
                   COUNT(s.id) AS total_subs,
                   COUNT(CASE WHEN s.status = 'Pass' THEN 1 END) AS pass_count
            FROM problems p
            LEFT JOIN submissions s ON p.slug = s.problem_id
            GROUP BY p.id, p.slug, p.title, p.difficulty
            ORDER BY p.id ASC
        """)
        problems = []
        for row in cur.fetchall():
            total = row[3] or 0
            passed = row[4] or 0
            acceptance = round((passed / total) * 100) if total > 0 else 0
            problems.append({
                "slug": row[0],
                "title": row[1],
                "difficulty": row[2],
                "acceptance": acceptance,
                "total_submissions": total
            })
        cache_set("problems:list", problems, ttl=300)
        return jsonify(problems)
    finally:
        conn.close()


# --- Leaderboard Endpoint ---
@app.route("/api/v1/leaderboard", methods=["GET"])
def get_leaderboard():
    cached = cache_get("leaderboard")
    if cached:
        return jsonify(cached)

    conn = get_db_connection()
    try:
        cur = conn.cursor()

        # Get total problems count first
        execute_query(cur, "SELECT COUNT(*) FROM problems")
        total_problems = cur.fetchone()[0]

        execute_query(cur, """
            SELECT 
                u.id,
                u.username,
                COUNT(DISTINCT CASE WHEN s.status = 'Pass' THEN s.problem_id END) AS solved,
                COUNT(s.id) AS total_submissions,
                COUNT(CASE WHEN s.status = 'Pass' THEN 1 END) AS pass_count,
                MAX(s.created_at) AS last_active
            FROM users u
            LEFT JOIN submissions s ON u.id = s.user_id
            GROUP BY u.id, u.username
            ORDER BY solved DESC, pass_count DESC, total_submissions ASC
            LIMIT 100
        """)

        leaderboard = []
        rank = 0
        for row in cur.fetchall():
            rank += 1
            total_subs = row[3] or 0
            pass_ct = row[4] or 0
            pass_rate = round((pass_ct / total_subs) * 100) if total_subs > 0 else 0
            leaderboard.append({
                "rank": rank,
                "user_id": row[0],
                "username": row[1],
                "solved": row[2] or 0,
                "total_submissions": total_subs,
                "pass_rate": pass_rate,
                "last_active": str(row[5]) if row[5] else None,
            })

        cache_set("leaderboard", leaderboard, ttl=120)
        return jsonify(leaderboard)
    finally:
        conn.close()


# --- Achievements Endpoint ---
ACHIEVEMENT_DEFS = [
    {"id": "first_steps", "title": "First Steps", "desc": "Solve your first problem", "icon": "flag"},
    {"id": "on_fire", "title": "On Fire", "desc": "Achieve a 3-day streak", "icon": "flame"},
    {"id": "big_brain", "title": "Big Brain", "desc": "Solve a hard problem", "icon": "brain"},
    {"id": "champion", "title": "Champion", "desc": "Solve all problems", "icon": "trophy"},
    {"id": "centurion", "title": "Centurion", "desc": "Make 100 submissions", "icon": "zap"},
    {"id": "consistent", "title": "Consistent", "desc": "7-day streak", "icon": "calendar"},
    {"id": "tenacious", "title": "Tenacious", "desc": "Attempt 5 different problems", "icon": "target"},
    {"id": "perfectionist", "title": "Perfectionist", "desc": "Achieve 80%+ pass rate (min 10 subs)", "icon": "star"},
]

@app.route("/api/v1/achievements", methods=["GET"])
@require_auth
def get_achievements():
    user_id = g.user_id
    cache_key = f"achievements:{user_id}"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)


    conn = get_db_connection()
    try:
        cur = conn.cursor()

        # Solved count
        execute_query(cur, """
            SELECT COUNT(DISTINCT problem_id) FROM submissions
            WHERE user_id = %s AND status = 'Pass'
        """, (user_id,))
        solved = cur.fetchone()[0]

        # Total problems
        execute_query(cur, "SELECT COUNT(*) FROM problems")
        total_problems = cur.fetchone()[0]

        # Solved hard
        execute_query(cur, """
            SELECT COUNT(DISTINCT s.problem_id) FROM submissions s
            JOIN problems p ON s.problem_id = p.slug
            WHERE s.user_id = %s AND s.status = 'Pass' AND p.difficulty = 'Hard'
        """, (user_id,))
        solved_hard = cur.fetchone()[0]

        # Total submissions & pass count
        execute_query(cur, "SELECT COUNT(*) FROM submissions WHERE user_id = %s", (user_id,))
        total_subs = cur.fetchone()[0]
        execute_query(cur, "SELECT COUNT(*) FROM submissions WHERE user_id = %s AND status = 'Pass'", (user_id,))
        pass_count = cur.fetchone()[0]
        pass_rate = round((pass_count / total_subs) * 100) if total_subs > 0 else 0

        # Attempted distinct problems
        execute_query(cur, "SELECT COUNT(DISTINCT problem_id) FROM submissions WHERE user_id = %s", (user_id,))
        attempted = cur.fetchone()[0]

        # Streaks
        execute_query(cur, """
            SELECT DATE(created_at) as day, COUNT(*)
            FROM submissions
            WHERE user_id = %s AND created_at >= CURRENT_DATE - INTERVAL '364 days'
            GROUP BY DATE(created_at)
            ORDER BY day ASC
        """, (user_id,))
        activity_map = {str(row[0]): row[1] for row in cur.fetchall()}

        today = datetime.now()
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
        for i in range(0, 365):
            day = (today - timedelta(days=i)).strftime('%Y-%m-%d')
            if activity_map.get(day, 0) > 0:
                current_streak += 1
            else:
                break

        # Compute earned achievements
        earned = set()
        if solved > 0:
            earned.add("first_steps")
        if current_streak >= 3 or longest_streak >= 3:
            earned.add("on_fire")
        if solved_hard > 0:
            earned.add("big_brain")
        if solved >= total_problems and total_problems > 0:
            earned.add("champion")
        if total_subs >= 100:
            earned.add("centurion")
        if current_streak >= 7 or longest_streak >= 7:
            earned.add("consistent")
        if attempted >= 5:
            earned.add("tenacious")
        if pass_rate >= 80 and total_subs >= 10:
            earned.add("perfectionist")

        result = {
            "achievements": [
                {**a, "earned": a["id"] in earned}
                for a in ACHIEVEMENT_DEFS
            ],
            "stats": {
                "solved": solved,
                "total_problems": total_problems,
                "total_submissions": total_subs,
                "pass_rate": pass_rate,
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "attempted": attempted,
            }
        }
        cache_set(cache_key, result, ttl=120)
        return jsonify(result)
    finally:
        conn.close()


# --- Stats Endpoint ---
@app.route("/api/v1/stats", methods=["GET"])
@require_auth
def get_stats():
    user_id = g.user_id
    
    # Cache user stats for 2 minutes
    cache_key = f"stats:user:{user_id}"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

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

        result = {
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
        }
        cache_set(cache_key, result, ttl=120)
        return jsonify(result)
    finally:
        conn.close()

# --- Submissions Endpoints ---
@app.route("/api/v1/submissions", methods=["GET"])
@require_auth
def get_submissions():
    user_id = g.user_id
    print(f"Fetching submissions for user: {user_id}")
    
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

import re
def simplify_error_message(raw_output, lang):
    if not raw_output or not raw_output.strip():
        return "Execution failed with no output."
        
    lines = [line.strip() for line in raw_output.split("\n") if line.strip()]
    
    if lang == "cpp":
        for line in lines:
            if "error:" in line:
                try:
                    err_msg = line.split("error:")[1].strip()
                    loc_match = re.search(r'solution\.cpp:(\d+):', line)
                    line_text = f" on line {loc_match.group(1)}" if loc_match else ""
                    
                    if "does not name a type" in err_msg:
                        item = err_msg.split()[0].replace("'", "")
                        return f"Error{line_text}: C++ doesn't recognize '{item}'. Did you forget an #include or make a typo?"
                    elif "expected" in err_msg and "before" in err_msg:
                        return f"Syntax Error{line_text}: {err_msg.capitalize().replace(';', 'semicolon (;)')}. You probably missed a semicolon."
                    elif "has no member named" in err_msg:
                        return f"Error{line_text}: {err_msg.capitalize()}. Make sure your function name exactly matches the expected!"
                    elif "was not declared in this scope" in err_msg:
                        item = err_msg.split()[0].replace("'", "")
                        return f"Variable Name Error{line_text}: You used '{item}' without defining it first."
                    else:
                        return f"C++ Error{line_text}: {err_msg.capitalize()}"
                except:
                    pass
        return "Compilation Error: Your code failed to compile. Please check for syntax mistakes."
    elif lang == "python":
        for line in reversed(lines):
            if "Error:" in line or "Exception:" in line:
                try:
                    err_msg = line.split(":", 1)[1].strip()
                    if "SyntaxError" in line:
                        return f"Syntax Error: You have a typo or invalid Python syntax. Check spelling and parentheses."
                    elif "IndentationError" in line:
                        return f"Indentation Error: Your spaces or tabs don't align correctly."
                    elif "NameError" in line:
                        return f"Variable Definition Error: {err_msg}. You tried to use something that isn't defined."
                    elif "TypeError" in line:
                        return f"Type Error: {err_msg}. You might be mixing incompatible data types."
                    elif "IndexError" in line:
                        return f"Index Error: {err_msg}. You're trying to access a list element outside its bounds."
                    else:
                        return f"Python {line}"
                except:
                    pass
        return "Runtime Error: Your Python code crashed while running. Please check your logic."
    
    return raw_output

# Helper: Execute code in Docker
def execute_code_in_docker(lang, code, problem_id, user_id=None, adhoc_driver=None, adhoc_test_data=None):
    # Track execution in Redis for monitoring
    redis_client.incr("exec:active")
    redis_client.incr("exec:total")
    start_time = time.time()
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
        
        worker.join(timeout=10)
        
        if worker.is_alive():
            res["is_tle"] = True
            try:
                con.kill() 
            except:
                pass
            worker.join()
            con.remove(force=True)
            redis_client.decr("exec:active")
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
            execution_output = simplify_error_message(execution_output, lang)
        elif "FAIL" in execution_output:
            exec_status = "Fail"
        else:
            exec_status = "Pass"
            
        redis_client.decr("exec:active")
        elapsed = time.time() - start_time
        # Track average execution time in Redis
        redis_client.lpush("exec:times", round(elapsed, 3))
        redis_client.ltrim("exec:times", 0, 99)  # Keep last 100
        
        return {
            "status": exec_status,
            "output": execution_output,
            "exit_code": res["code"]
        }

    except Exception as e:
        print("Docker Error:", e)
        redis_client.decr("exec:active")
        # Always try to clean up the container
        try:
            con.remove(force=True)
        except:
            pass
# --- PLAYGROUND INTERACTIVE ENDPOINTS ---

active_playground_sessions = {}

def playground_timeout_killer(con, sid):
    # Enforces a 10 minute timeout limit for playground sessions
    time.sleep(600.0)
    if sid in active_playground_sessions:
        active_playground_sessions[sid]["is_tle"] = True
        try:
            con.remove(force=True)
        except Exception:
            pass

@app.route("/api/v1/playground/start", methods=["POST"])
@require_auth
@limiter.limit("10/minute")
def playground_start():
    data = request.json
    lang = data.get("language")
    code = data.get("code")
    
    if not code or not lang:
        return jsonify({"error": "Missing language or code"}), 400

    cmd = ""
    fname = "solution.py"
    if lang == "python":
        fname = "solution.py"
        cmd = "python3 -u solution.py"
    elif lang == "cpp":
        fname = "solution.cpp"
        cmd = "g++ -o solution solution.cpp && ./solution"
    elif lang == "c":
        fname = "solution.c"
        cmd = "gcc -o solution solution.c && ./solution"
    else:
        return jsonify({"error": "bad language"}), 400

    my_config = {
        "image": "judger:latest",
        "command": ["/bin/bash", "-c", "sleep 600"],
        "mem_limit": "256m",
        "network_mode": "none",
        "detach": True,
        "tty": True
    }

    try:
        con = client.containers.create(**my_config)
        con.start()
        
        # Write code to container
        stream = io.BytesIO()
        t = tarfile.open(fileobj=stream, mode='w')
        b_code = code.encode('utf-8')
        info = tarfile.TarInfo(name=fname)
        info.size = len(b_code)
        t.addfile(info, io.BytesIO(b_code))
        t.close()
        stream.seek(0)
        con.put_archive("/home/sandbox", stream)

        escaped_cmd = cmd.replace("'", "'\\''")
        exec_res = client.api.exec_create(
            con.id,
            f"/bin/bash -c '{escaped_cmd}'",
            stdin=True,
            stdout=True,
            stderr=True,
            tty=True,
            workdir="/home/sandbox"
        )
        
        exec_id = exec_res['Id']
        sock = client.api.exec_start(exec_id, socket=True)
        sock_fd = sock._sock if hasattr(sock, '_sock') else sock
        sock_fd.setblocking(False)
        
        sid = str(uuid.uuid4())
        active_playground_sessions[sid] = {
            "con": con,
            "sock": sock_fd,
            "exec_id": exec_id,
            "is_tle": False,
            "start_time": time.time()
        }
        
        # Start timeout killer thread
        threading.Thread(target=playground_timeout_killer, args=(con, sid), daemon=True).start()
        
        return jsonify({"session_id": sid})
        
    except Exception as e:
        print("Playground start error:", e)
        try:
            con.remove(force=True)
        except:
            pass
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/playground/poll/<sid>", methods=["GET"])
@require_auth
def playground_poll(sid):
    s = active_playground_sessions.get(sid)
    if not s:
        return jsonify({"error": "Session not found or expired"}), 404
        
    sock_fd = s["sock"]
    output = ""
    try:
        # Read available bytes from the socket
        while True:
            ready = select.select([sock_fd], [], [], 0.0)
            if ready[0]:
                chunk = sock_fd.recv(4096)
                if not chunk:
                    break
                output += chunk.decode('utf-8', errors='replace')
            else:
                break
    except Exception as e:
        pass
        
    try:
        res = client.api.exec_inspect(s["exec_id"])
        running = res['Running']
        exit_code = res.get('ExitCode')
    except Exception:
        running = False
        exit_code = -1
        
    if s["is_tle"]:
        running = False
        output += "\n\nError: Time Limit Exceeded (10 minutes)."
        exit_code = 124
        
    if not running:
        elapsed = round(time.time() - s["start_time"], 3)
        try:
            s["con"].remove(force=True)
        except:
            pass
        if sid in active_playground_sessions:
            del active_playground_sessions[sid]
        return jsonify({
            "output": output, 
            "running": False, 
            "exit_code": exit_code,
            "execution_time": elapsed
        })
        
    return jsonify({
        "output": output,
        "running": True
    })

@app.route("/api/v1/playground/input/<sid>", methods=["POST"])
@require_auth
def playground_input(sid):
    s = active_playground_sessions.get(sid)
    if not s:
        return jsonify({"error": "Session not found"}), 404
        
    val = request.json.get("input", "")
    try:
        # TTY mode requires \n explicitly to register input
        if not val.endswith('\n'):
            val += '\n'
        s["sock"].send(val.encode('utf-8'))
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/submit", methods=["POST"])
@require_auth
@limiter.limit("5/minute")
def submit_code():
    data = request.json
    user_id = g.user_id
    problem_id = data.get("problem_id")
    language = data.get("language")
    code = data.get("code")
    
    print(f"Submission: User={user_id}, Problem={problem_id}")
    
    if not all([problem_id, language, code]):
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
        
        # Invalidate user stats and admin stats caches
        redis_client.delete(f"stats:user:{user_id}")
        redis_client.delete("admin:stats")
        
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

# --- Chat Endpoints ---
@app.route("/api/v1/chat/<problem_id>", methods=["GET"])
@require_auth
@limiter.limit("20/minute")
def get_chat_history(problem_id):
    """Load chat history for a user+problem. Uses Redis cache with DB fallback."""
    user_id = g.user_id
    cache_key = f"chat:{user_id}:{problem_id}"
    
    # Try Redis cache first
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)
    
    # Fallback to DB
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, 
            "SELECT history FROM chat_sessions WHERE user_id = %s AND problem_id = %s",
            (user_id, problem_id))
        row = cur.fetchone()
        if row and row[0]:
            history = row[0] if isinstance(row[0], list) else json.loads(row[0])
            cache_set(cache_key, history, ttl=1800)  # Cache for 30 min
            return jsonify(history)
        return jsonify([])
    finally:
        conn.close()

@app.route("/api/v1/chat/save", methods=["POST"])
@require_auth
@limiter.limit("20/minute")
def save_chat_history():
    """Save chat history to Redis cache + PostgreSQL."""
    user_id = g.user_id
    data = request.json
    problem_id = data.get("problem_id")
    history = data.get("history", [])
    
    if not problem_id:
        return jsonify({"error": "problem_id required"}), 400
    
    # Update Redis cache immediately
    cache_key = f"chat:{user_id}:{problem_id}"
    cache_set(cache_key, history, ttl=1800)
    
    # Persist to DB (upsert)
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, """
            INSERT INTO chat_sessions (user_id, problem_id, history, updated_at)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, problem_id) 
            DO UPDATE SET history = %s, updated_at = CURRENT_TIMESTAMP
        """, (user_id, problem_id, json.dumps(history), json.dumps(history)))
        conn.commit()
        return jsonify({"message": "Chat saved"}), 200
    except Exception as e:
        print(f"Chat save error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

print("Server starting on 9000...")
app.run(host="0.0.0.0", port=9000)
