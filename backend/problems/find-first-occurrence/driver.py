import sys
import json
sys.path.append("/home/sandbox")
from solution import Solution

sol = Solution()
case_id = 0
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    case_id += 1
    try:
        data = json.loads(line)
        inp = data["input"]
        expected = data["expected"]
        result = sol.findFirstOccurrence(inp["nums"], inp["target"])
        status = "PASS" if result == expected else "FAIL"
        print(f"CASE|{case_id}|{status}|{inp}|{result}|{expected}")
    except Exception as e:
        print(f"CASE|{case_id}|FAIL|ERROR|{e}|N/A")