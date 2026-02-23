#include <iostream>
#include <string>
using namespace std;

#include "solution.cpp"

int main() {
    string s, expectedStr;
    int caseId = 1;

    // Input format: INPUT_STRING EXPECTED_BOOL
    while (cin >> s >> expectedStr) {
        // Handle empty string case
        if (s == "EMPTY") s = "";

        bool expected = (expectedStr == "true");

        Solution sol;
        bool result = sol.isValid(s);

        bool pass = (result == expected);
        string actualStr = result ? "true" : "false";

        // Output format: CASE|ID|STATUS|INPUT|OUTPUT|EXPECTED
        cout << "CASE|" << caseId++ << "|" << (pass ? "PASS" : "FAIL") << "|"
             << "s='" << s << "'|" << actualStr << "|" << expectedStr << endl;
    }
    return 0;
}
