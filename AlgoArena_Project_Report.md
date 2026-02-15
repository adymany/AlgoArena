# PROJECT REPORT: AlgoArena - A Competitive Coding Platform

## 1. ABSTRACT

AlgoArena is a comprehensive web-based platform designed for competitive programmers to solve coding challenges, track progress, and leverage Artificial Intelligence for learning. The project aims to bridge the gap between traditional coding platforms and modern AI assistants by providing real-time feedback and intelligent hints. Built using a robust microservices-inspired architecture, it utilizes **Next.js** for a dynamic frontend, **Flask** for a scalable backend, and **Docker** for secure, isolated code execution. The platform supports multiple programming languages (Python and C++) and ensures high data integrity through a structured **PostgreSQL** database. This solution minimizes the need for manual resource provisioning and offers an automated pipeline from problem creation to code evaluation.

---

## 2. INTRODUCTION / OBJECTIVES

The primary objective of AlgoArena is to provide a seamless and secure environment for practicing coding problems. Key goals include:

- **Secure Code Execution:** Using containerization (Docker) to run untrusted user code safely.
- **AI Integration:** Providing an AI-powered sidebar to help users debug and understand complex algorithms.
- **Admin Management:** Allowing administrators to create, update, and delete problems dynamically.
- **Performance Tracking:** Maintaining a detailed history of user submissions and chat interactions.
- **Scalability:** Ensuring the system can handle concurrent code executions efficiently.

---

## 3. SYSTEM ANALYSIS

### a. Identification of Need

Modern developers need more than just a list of problems; they need an interactive environment that mimics real-world development and provides immediate, intelligent feedback. AlgoArena satisfies this by integrating a large language model (LLM) contextually with the specific problem a user is solving.

### b. Preliminary Investigation

Research was conducted on existing OJs (Online Judges) and AI assistant tools. Findings indicated a need for a unified platform that combines the evaluating capabilities of an OJ with the conversational power of AI.

### c. Feasibility Study

- **Technical Feasibility:** Python (Flask) and Next.js are well-suited for building the API and UI. Docker provides the necessary security layer.
- **Economic Feasibility:** The project uses open-source technologies (PostgreSQL, Docker, Flask), making it cost-effective.
- **Operational Feasibility:** The automated deployment and initialization scripts (init_db) make it easy to maintain.

### d. Project Planning

The project was divided into four main phases:

1. Backend API & Database Schema Design.
2. Code Execution Engine development using Docker.
3. Frontend UI/UX development with Next.js and Tailwind CSS.
4. AI Integration and System Polishing.

### e. Project Scheduling

| Task                 | Duration |
| :------------------- | :------- |
| Requirement Analysis | 2 Weeks  |
| Design & Prototyping | 2 Weeks  |
| Backend Development  | 4 Weeks  |
| Frontend Development | 4 Weeks  |
| Testing & Debugging  | 2 Weeks  |

### f. Software Requirement Specifications (SRS)

- **Functional Requirements:** User authentication, Problem listing, Code editor (Monaco), Remote code execution, AI Chat, Admin Dashboard.
- **Non-Functional Requirements:** Security (Isolating user code), Reliability (DB transactions), Usability (Responsive UI), Latency (Optimized execution).

### g. Software Engineering Paradigm Applied

The **Agile Methodology** was used, allowing for iterative development and frequent testing of individual modules (Backend, Frontend, Judger).

### h. Data Models

The system uses the following Relational Schema:

- **Users:** (id, username, password_hash, created_at)
- **Problems:** (id, slug, title, description, difficulty, templates)
- **Submissions:** (id, user_id, problem_id, language, code, status, output, created_at)
- **Chat Sessions:** (id, user_id, problem_id, history, updated_at)

---

## 4. SYSTEM DESIGN

### a. Modularization Details

- **Frontend-Next:** Handles the user interface, state management, and interaction with the backend.
- **Backend (Flask):** Orchestrates API requests, manages the database, and interfaces with Docker.
- **Judger (Docker):** A lightweight container image pre-configured with compilers and interpreters (g++, python3).

### b. Data Integrity and Constraints

- **Primary Keys:** Unique IDs for all tables.
- **Foreign Keys:** `submissions.user_id` references `users.id`, `chat_sessions.user_id` references `users.id`.
- **Unique Constraints:** `users.username` and `problems.slug`.
- **Defaults:** Timestamps for creation and update times.

### c. Database Design

Entity Relationship Diagram (ERD) focuses on the interaction between Users and Problems via Submissions and Chat Sessions.

### d. User Interface Design

The UI is designed to be sleek and professional, featuring:

- **Dark Mode Support** for reduced eye strain.
- **Monaco Editor Integration** for a VS-Code-like development experience.
- **Dynamic AI Sidebar** that provides contextual hints without giving away the full solution.

### e. Test Cases

The platform uses an automated evaluation system. Below are sample test cases for the "Two Sum" problem:

| Test Case ID | Input (nums, target)               | Expected Output            | Status     |
| :----------- | :--------------------------------- | :------------------------- | :--------- |
| TS-01        | [2, 7, 11, 15], 9                  | [0, 1]                     | Functional |
| TS-02        | [3, 2, 4], 6                       | [1, 2]                     | Functional |
| TS-03        | [3, 3], 6                          | [0, 1]                     | Functional |
| SEC-01       | `import os; os.system("rm -rf /")` | Error / Connection Refused | Security   |

---

## 5. CODING

### a. SQL Commands

```sql
-- Database Creation
CREATE DATABASE contest_db;

-- Table Creation
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE problems (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(10) DEFAULT 'Easy',
    templates JSONB DEFAULT '{}'
);

CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    language VARCHAR(10) NOT NULL,
    code TEXT NOT NULL,
    problem_id VARCHAR(50),
    status VARCHAR(20),
    output TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    problem_id VARCHAR(50),
    history JSONB DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, problem_id)
);
```

### b. Complete Project Coding

_(Note: Codebase available in the `backend/` and `frontend-next/` directories)_
Key segment: **Secure Execution Engine**

```python
# Extract from server.py
con = client.containers.create(
    image="judger:latest",
    command=["/bin/bash", "-c", cmd],
    mem_limit="128m",
    network_mode="none",
    detach=True
)
```

---

## 6. STANDARDIZATION OF THE CODING

### a. Code Efficiency & Error Handling

- **Query Logging:** Every SQL query is logged to the console for real-time monitoring of database health.
- **Docker Pooling (Future):** Planned implementation of a container pool to reduce cold-start latency.
- **Graceful Failures:** If the database connection fails, the system retries 5 times before exiting.

### b. Parameters Calling/Passing

- **API Versioning:** Uses `/api/v1/` prefix for all endpoints to ensure backward compatibility.
- **JSON Payload:** All communication between Frontend and Backend is standardized using JSON.

### c. Validation Checks

- **Slug Uniqueness:** Backend checks if a problem slug exists before creation to prevent data collisions.
- **Language Support:** Only 'python' and 'cpp' are allowed in the execution request.

---

## 7. TESTING

- **Testing Techniques:** Black-box testing for code execution output.
- **Testing Plan:** Automated unit tests for core API endpoints.
- **Debugging:** Extensive logging of SQL queries and container execution logs to `server.py` console.

---

## 8. SYSTEM SECURITY MEASURES

- **Execution Isolation:** All user code runs inside ephemeral Docker containers with no network access (`network_mode="none"`) and limited memory (`128m`).
- **Data Security:** Password hashing using `werkzeug.security` (PBKDF2 with salt).
- **Access Control:** Differentiated endpoints for Users and Admins (e.g., `/api/v1/admin/problems`).

---

## 9. COST ESTIMATION

| Component            | Estimated Monthly Cost |
| :------------------- | :--------------------- |
| AWS EC2 (t3.medium)  | \$25.00                |
| AWS RDS (PostgreSQL) | \$15.00                |
| S3 (Storage)         | \$5.00                 |
| **Total**            | **\$45.00**            |

---

## 10. FUTURE SCOPE

- **Real-time Leaderboards:** Using WebSockets for live competition rankings.
- **Plagiarism Detection:** Integrating MOSS or similar tools to detect copied code.
- **Multi-File Projects:** Allowing users to solve problems that span multiple files.
- **Mobile Support:** Mobile-optimized IDE for on-the-go practice.

---

## 11. BIBLIOGRAPHY

1. Next.js Documentation: https://nextjs.org/docs
2. Flask Framework: https://flask.palletsprojects.com/
3. PostgreSQL JSONB: https://www.postgresql.org/docs/current/datatype-json.html
4. Docker SDK for Python: https://docker-py.readthedocs.io/

---

## 12. GLOSSARY

- **Slug:** A URL-friendly version of a title.
- **OJ (Online Judge):** System for testing code in programming contests.
- **JSONB:** Binary-formatted JSON data in PostgreSQL.
- **TLE:** Time Limit Exceeded.
