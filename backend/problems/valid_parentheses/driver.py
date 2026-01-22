import sys
import os
import json

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
            # Format: input_string expected_bool
            parts = line.strip().split()
            s = parts[0]
            expected_str = parts[1]
            expected = expected_str.lower() == "true"
            
            # Input normalization for empty string case if needed
            if s == "EMPTY":
                s = ""

            sol = Solution()
            try:
                result = sol.isValid(s)
            except Exception as e:
                print(f"CASE|{case_id}|FAIL|s='{s}'|Runtime Error: {str(e)}|{expected_str}")
                case_id += 1
                continue

            pass_status = (result == expected)
            status = "PASS" if pass_status else "FAIL"
            actual_str = str(result).lower()

            print(f"CASE|{case_id}|{status}|s='{s}'|{actual_str}|{expected_str}")
            case_id += 1

        except Exception as e:
            print(f"CASE|{case_id}|FAIL|Parse Error|{str(e)}|N/A")
            case_id += 1

if __name__ == "__main__":
    solve()
