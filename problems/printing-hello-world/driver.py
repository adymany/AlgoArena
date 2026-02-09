import sys
import json
sys.path.insert(0, '/app')
from solution import Solution

sol = Solution()
case_id = 0

with open('test_data.txt', 'r') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        case_id += 1
        try:
            data = json.loads(line)
            # Extract input args and expected result
            inp = data["input"]
            expected = data["expected"]
            
            # Call solution - ADAPT THIS LINE to match your function signature
            # For printing, we'll capture stdout instead of direct return value comparison
            import io
            from contextlib import redirect_stdout

            f = io.StringIO()
            with redirect_stdout(f):
                sol.solve()
            result = f.getvalue().strip()

            status = "PASS" if result == expected else "FAIL"
            print(f"CASE|{case_id}|{status}|{inp}|{result}|{expected}")
        except Exception as e:
            print(f"CASE|{case_id}|FAIL|error|{str(e)}|N/A")