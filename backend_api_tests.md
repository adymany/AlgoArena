# Backend API Test Collection

You can import these commands into Postman or run them directly in your terminal (Git Bash, PowerShell, or Command Prompt).

## 1. Authentication

### Register a new user

```bash
curl -X POST http://localhost:9000/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "curl_user",
    "password": "securepassword123"
  }'
```

### Login

```bash
curl -X POST http://localhost:9000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "curl_user",
    "password": "securepassword123"
  }'
```

_Note: Keep the `user_id` from the response for subsequent requests._

---

## 2. Problems

### Get All Problems

```bash
curl -X GET http://localhost:9000/api/v1/problems
```

### Get Specific Problem (e.g., Two Sum)

```bash
curl -X GET http://localhost:9000/api/v1/problems/two_sum
```

---

## 3. Execution & Submission

### Execute Code (Run)

**Python Example:**

```bash
curl -X POST http://localhost:9000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "problem_id": "two_sum",
    "user_id": 1,
    "code": "class Solution:\n    def twoSum(self, nums, target):\n        prevMap = {}\n        for i, n in enumerate(nums):\n            diff = target - n\n            if diff in prevMap:\n                return [prevMap[diff], i]\n            prevMap[n] = i\n        return []"
  }'
```

**C++ Example:**

```bash
curl -X POST http://localhost:9000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "cpp",
    "problem_id": "two_sum",
    "user_id": 1,
    "code": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> m;\n        for (int i = 0; i < nums.size(); i++) {\n            if (m.find(target - nums[i]) != m.end()) {\n                return {m[target - nums[i]], i};\n            }\n            m[nums[i]] = i;\n        }\n        return {};\n    }\n};"
  }'
```

### Submit Code (Save Submission)

```bash
curl -X POST http://localhost:9000/api/v1/submit \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "problem_id": "two_sum",
    "language": "python",
    "code": "print(\"Submitted Code\")"
  }'
```

### Get User Submissions

```bash
curl -X GET "http://localhost:9000/api/v1/submissions?user_id=1"
```

---

## 4. Admin Operations

### Create a New Problem

```bash
curl -X POST http://localhost:9000/api/v1/admin/problems \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "multiply_numbers",
    "title": "Multiply Numbers",
    "description": "<p>Given two integers, return their product.</p>",
    "difficulty": "Easy",
    "python_template": "class Solution:\n    def multiply(self, a, b):\n        pass",
    "driver_python": "import sys\nfrom solution import Solution\n\nsol = Solution()\nprint(sol.multiply(2, 3))",
    "test_data": ""
  }'
```

### Update a Problem

```bash
curl -X PUT http://localhost:9000/api/v1/admin/problems/multiply_numbers \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Multiply Two Integers",
    "description": "<p>Updated description.</p>"
  }'
```

### Delete a Problem

```bash
curl -X DELETE http://localhost:9000/api/v1/admin/problems/multiply_numbers
```

---

## 5. Chat History

### Save Chat History

```bash
curl -X POST http://localhost:9000/api/v1/chat/save \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "problem_id": "two_sum",
    "history": [
        {"role": "user", "content": "Help me with this"},
        {"role": "assistant", "content": "Sure, allow me to help."}
    ]
  }'
```

### Get Chat History

```bash
curl -X GET "http://localhost:9000/api/v1/chat/two_sum?user_id=1"
```
