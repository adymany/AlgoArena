#include <iostream>
using namespace std;

#include "solution.cpp"

int main() {
    int n, expected;
    int caseId = 1;

    while (cin >> n >> expected) {
        Solution sol;
        int result = sol.climbStairs(n);

        bool pass = (result == expected);

        cout << "CASE|" << caseId++ << "|" << (pass ? "PASS" : "FAIL") << "|"
             << "n=" << n << "|" << result << "|" << expected << endl;
    }
    return 0;
}
