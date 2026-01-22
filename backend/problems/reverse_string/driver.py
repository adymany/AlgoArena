import sys
import os
import json
import ast

sys.path.append("/home/sandbox")

try:
    from solution import Solution
except ImportError:
    print("CASE|0|FAIL|Import Error|Could not import Solution class|N/A")
    sys.exit(0)

def solve():
    input_data = sys.stdin.read().splitlines()
    if not input_data:
        return

    case_id = 1
    for line in input_data:
        if not line.strip():
            continue
            
        try:
            # Input format: ["h","e","l","l","o"] ["o","l","l","e","h"]
            # We strictly expect two JSON-like list strings on one line separated by space is tricky if json has spaces.
            # Let's assume input and output are valid JSON arrays.
            # Actually, let's parse linearly.
            
            # Simple parser: extract the two lists
            # We know it's a list if it starts with [
            
            parts = line.strip().split('] [')
            if len(parts) != 2:
                # Try simple split if just two separate JSONs
                # Rely on proper formatting in test_data
                parts = []
                # Fallback to python literal eval which is safer/easier for list of chars
                import ast
                # We expect "['a','b'] ['b','a']"
                # Let's just find the closing bracket of first list
                idx = line.find(']')
                if idx == -1: continue
                s_str = line[:idx+1]
                expected_str = line[idx+1:].strip()
            else:
                s_str = parts[0] + ']'
                expected_str = '[' + parts[1]

            s = ast.literal_eval(s_str)
            expected = ast.literal_eval(expected_str)
            
            # Deep copy s for verification since it modifies in-place
            input_copy = list(s)

            sol = Solution()
            try:
                # Defines return type as void, modifies s in-place
                sol.reverseString(s)
            except Exception as e:
                print(f"CASE|{case_id}|FAIL|s={input_copy}|Runtime Error: {str(e)}|{expected}")
                case_id += 1
                continue

            pass_status = (s == expected)
            status = "PASS" if pass_status else "FAIL"
            
            print(f"CASE|{case_id}|{status}|s={input_copy}|{s}|{expected}")
            case_id += 1

        except Exception as e:
            print(f"CASE|{case_id}|FAIL|Parse Error|{str(e)}|N/A")
            case_id += 1

if __name__ == "__main__":
    solve()
