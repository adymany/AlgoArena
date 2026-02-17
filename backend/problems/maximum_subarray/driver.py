import sys
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
            n = int(next(iterator))
            nums = []
            for _ in range(n):
                nums.append(int(next(iterator)))
            expected = int(next(iterator))

            input_str = f"nums={nums}"

            sol = Solution()
            try:
                result = sol.maxSubArray(nums)
            except Exception as e:
                print(f"CASE|{case_id}|FAIL|{input_str}|Runtime Error: {str(e)}|{expected}")
                case_id += 1
                continue

            pass_status = (result == expected)
            status = "PASS" if pass_status else "FAIL"

            print(f"CASE|{case_id}|{status}|{input_str}|{result}|{expected}")
            case_id += 1

        except StopIteration:
            break
        except Exception as e:
            print(f"CASE|{case_id}|FAIL|Parse Error|{str(e)}|N/A")
            break

if __name__ == "__main__":
    solve()
