import sys
import os

sys.path.append("/home/sandbox")

try:
    from solution import Solution
except ImportError:
    print("CASE|0|FAIL|Import Error|Could not import Solution class|N/A")
    sys.exit(0)

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return

    iterator = iter(input_data)
    case_id = 1

    while True:
        try:
            val_str = next(iterator)
            n = int(val_str)
            
            expected_str = next(iterator)
            expected = int(expected_str)
            
            sol = Solution()
            try:
                result = sol.fib(n)
            except Exception as e:
                print(f"CASE|{case_id}|FAIL|n={n}|Runtime Error: {str(e)}|{expected_str}")
                case_id += 1
                continue

            pass_status = (result == expected)
            status = "PASS" if pass_status else "FAIL"
            
            print(f"CASE|{case_id}|{status}|n={n}|{result}|{expected}")
            case_id += 1

        except StopIteration:
            break
        except Exception as e:
            print(f"CASE|{case_id}|FAIL|Parse Error|{str(e)}|N/A")
            break

if __name__ == "__main__":
    solve()
