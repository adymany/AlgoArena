import sys
import os

# Add sandbox to path to import user solution
sys.path.append("/home/sandbox")

try:
    from solution import Solution
except ImportError:
    print("CASE|0|FAIL|Import Error|Could not import Solution class|N/A")
    sys.exit(0)

def solve():
    # Read all input from stdin
    input_data = sys.stdin.read().split()
    if not input_data:
        return

    iterator = iter(input_data)
    case_id = 1

    while True:
        try:
            # Parse X
            x_str = next(iterator)
            x = int(x_str)
            
            # Parse Expected Output (bool)
            expected_str = next(iterator)
            expected = expected_str.lower() == "true"
            
            # Run User Solution
            sol = Solution()
            try:
                result = sol.isPalindrome(x)
            except Exception as e:
                print(f"CASE|{case_id}|FAIL|x={x}|Runtime Error: {str(e)}|{expected_str}")
                case_id += 1
                continue

            # Format Actual Output
            pass_status = (result == expected)
            
            status = "PASS" if pass_status else "FAIL"
            actual_str = str(result).lower()

            print(f"CASE|{case_id}|{status}|x={x}|{actual_str}|{expected_str}")
            case_id += 1

        except StopIteration:
            break
        except Exception as e:
            print(f"CASE|{case_id}|FAIL|Parse Error|{str(e)}|N/A")
            break

if __name__ == "__main__":
    solve()
