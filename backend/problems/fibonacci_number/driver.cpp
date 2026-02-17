#include <iostream>
#include <string>
#include "solution.cpp"

using namespace std;

int main() {
    int n, expected;
    int caseId = 1;

    // Input format: N EXPECTED
    while (cin >> n >> expected) {
        Solution sol;
        int result = sol.fib(n);

        bool pass = (result == expected);

        // Output format: CASE|ID|STATUS|INPUT|OUTPUT|EXPECTED
        cout << "CASE|" << caseId++ << "|" << (pass ? "PASS" : "FAIL") << "|"
             << "n=" << n << "|" << result << "|" << expected << endl;
    }
    return 0;
}
