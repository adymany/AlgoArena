import sys
import os

# Add sandbox to path to import user solution
sys.path.append("/home/sandbox")
print("DEBUG: Driver Started", flush=True)

try:
    from solution import Solution
except ImportError:
    # Fallback or error handling if solution.py is bad
    print("CASE|0|FAIL|Import Error|Could not import Solution class|N/A")
    sys.exit(0)

def solve():
    # Read all input from stdin (which is redirected from test_data.txt)
    input_data = sys.stdin.read().split()
    if not input_data:
        return

    iterator = iter(input_data)
    case_id = 1

    while True:
        try:
            # Parse N
            n = int(next(iterator))
            # Parse Target
            target = int(next(iterator))
            # Parse Expected Indices
            exp1 = int(next(iterator))
            exp2 = int(next(iterator))
            
            # Parse Array
            nums = []
            for _ in range(n):
                nums.append(int(next(iterator)))
            
            # Format Input String for Log
            input_str = f"nums={nums}, target={target}"
            
            # Run User Solution
            sol = Solution()
            try:
                result = sol.twoSum(nums, target)
            except Exception as e:
                print(f"CASE|{case_id}|FAIL|{input_str}|Runtime Error: {str(e)}|{exp1} {exp2}")
                case_id += 1
                continue

            # Format Actual Output
            if result and len(result) == 2:
                result.sort()
                actual_str = f"{result[0]} {result[1]}"
                pass_status = (result[0] == exp1 and result[1] == exp2)
            else:
                actual_str = str(result)
                pass_status = False

            expected_str = f"{exp1} {exp2}"
            status = "PASS" if pass_status else "FAIL"

            print(f"CASE|{case_id}|{status}|{input_str}|{actual_str}|{expected_str}")
            case_id += 1

        except StopIteration:
            break
        except Exception as e:
            print(f"CASE|{case_id}|FAIL|Parse Error|{str(e)}|N/A")
            break

if __name__ == "__main__":
    solve()
