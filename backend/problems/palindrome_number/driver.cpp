#include <iostream>
#include <string>
#include "solution.cpp"

using namespace std;

int main() {
    int x;
    string expectedStr;
    int caseId = 1;

    // Input format: X EXPECTED_BOOL
    while (cin >> x >> expectedStr) {
        bool expected = (expectedStr == "true");

        Solution sol;
        bool result = sol.isPalindrome(x);

        bool pass = (result == expected);
        string actualStr = result ? "true" : "false";

        // Output format: CASE|ID|STATUS|INPUT|OUTPUT|EXPECTED
        cout << "CASE|" << caseId++ << "|" << (pass ? "PASS" : "FAIL") << "|"
             << "x=" << x << "|" << actualStr << "|" << expectedStr << endl;
    }
    return 0;
}
