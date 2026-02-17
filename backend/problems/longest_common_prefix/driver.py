import sys
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
            parts = line.strip().rsplit(' ', 1)
            strs_raw = parts[0]
            expected = parts[1]

            strs = strs_raw.split(',')

            input_str = f"strs={strs}"

            sol = Solution()
            try:
                result = sol.longestCommonPrefix(strs)
            except Exception as e:
                print(f"CASE|{case_id}|FAIL|{input_str}|Runtime Error: {str(e)}|{expected}")
                case_id += 1
                continue

            if expected == "NONE":
                expected = ""
            pass_status = (result == expected)
            status = "PASS" if pass_status else "FAIL"

            print(f"CASE|{case_id}|{status}|{input_str}|{result}|{expected}")
            case_id += 1

        except Exception as e:
            print(f"CASE|{case_id}|FAIL|Parse Error|{str(e)}|N/A")
            case_id += 1

if __name__ == "__main__":
    solve()
