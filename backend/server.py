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
            host="localhost",
            database="contest_db",
            user="user",
            password="password",
            port="5432"
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
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)

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
        execute_query(cur, "SELECT id, password_hash FROM users WHERE username = %s", (username,))
        user = cur.fetchone()
        
        if user and check_password_hash(user[1], password):
            print(f"Login success: {username}")
            return jsonify({"message": "Login successful", "user_id": user[0], "username": username}), 200
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
    
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, 
            "INSERT INTO submissions (user_id, problem_id, language, code, status) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (user_id, problem_id, language, code, "Submitted")
        )
        sub_id = cur.fetchone()[0]
        conn.commit()
        print(f"Submission saved with ID: {sub_id}")
        return jsonify({"message": "Submitted successfully", "submission_id": sub_id}), 201
    except Exception as e:
        print(f"Submit error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# --- Chat Endpoints ---
@app.route("/api/v1/chat/save", methods=["POST"])
def save_chat():
    data = request.json
    user_id = data.get("user_id")
    problem_id = data.get("problem_id")
    history = data.get("history") 
    
    print(f"Saving chat for User {user_id}, Problem {problem_id}")
    
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        history_json = json.dumps(history)
        execute_query(cur, """
            INSERT INTO chat_sessions (user_id, problem_id, history) 
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id, problem_id) 
            DO UPDATE SET history = EXCLUDED.history, updated_at = CURRENT_TIMESTAMP
        """, (user_id, problem_id, history_json))
        conn.commit()
        return jsonify({"status": "saved"}), 200
    except Exception as e:
        print(f"Save chat error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route("/api/v1/chat/<problem_id>", methods=["GET"])
def get_chat(problem_id):
    user_id = request.args.get("user_id")
    print(f"Loading chat for User {user_id}, Problem {problem_id}")

    if not user_id:
        return jsonify([])

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        execute_query(cur, "SELECT history FROM chat_sessions WHERE user_id = %s AND problem_id = %s", (user_id, problem_id))
        row = cur.fetchone()
        if row:
             return jsonify(row[0]) 
        return jsonify([])
    finally:
        conn.close()

# --- Execution Endpoint ---
@app.route("/api/v1/execute", methods=["POST"])
def run_code():
    data = request.json
    lang = data["language"]
    user_code = data["code"]
    pid = data.get("problem_id", "")
    user_id = data.get("user_id")
    
    print(f"Execution request: Lang={lang}, Problem={pid}, User={user_id}")
    
    fname = "solution.py"
    cmd = ""

    if lang == "python":
        fname = "solution.py"
        if pid != "":
            cmd = "python3 -u driver.py < test_data.txt"
        else:
            cmd = "python3 solution.py"
            
    elif lang == "cpp":
        fname = "solution.cpp"
        if pid != "":
            cmd = "g++ -o solution driver.cpp -I/home/sandbox && ./solution < test_data.txt"
        else:
            cmd = "g++ -o solution solution.cpp && ./solution"
    else:
        return jsonify({"error": "bad language"})

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
        b_code = user_code.encode('utf-8')
        info.size = len(b_code)
        t.addfile(info, io.BytesIO(b_code))
        
        if pid != "":
            p_path = os.path.join(PROBLEMS_DIR, pid)
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
            return jsonify({
                "status": "TLE", 
                "output": "Time Limit Exceeded", 
                "exit_code": 124
            })
            
        con.remove(force=True)
        
        # Save submission
        execution_output = res["msg"].decode('utf-8') if res["msg"] else ""
        
        # Determine Pass/Fail based on test output
        if res["code"] != 0:
            exec_status = "Fail"
        elif "FAIL" in execution_output:
            exec_status = "Fail"
        else:
            exec_status = "Pass"
        
        if user_id: 
            try:
                conn = get_db_connection()
                if conn:
                    cur = conn.cursor()
                    execute_query(cur, 
                        "INSERT INTO submissions (user_id, language, code, problem_id, status, output) VALUES (%s, %s, %s, %s, %s, %s)",
                        (user_id, lang, user_code, pid, exec_status, execution_output)
                    )
                    conn.commit()
                    conn.close()
                    print("Submission saved to DB")
            except Exception as e:
                print("Failed to save submission:", e)
        
        return jsonify({
            "status": exec_status,
            "output": execution_output,
            "exit_code": res["code"]
        })

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)})

print("Server starting on 9000...")
app.run(host="0.0.0.0", port=9000)
