#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include "solution.cpp"

using namespace std;

int main() {
    string line;
    int caseId = 1;

    while (getline(cin, line)) {
        if (line.empty()) continue;

        // Find last space to separate expected
        size_t lastSpace = line.rfind(' ');
        string strsRaw = line.substr(0, lastSpace);
        string expected = line.substr(lastSpace + 1);

        // Parse comma-separated strings
        vector<string> strs;
        stringstream ss(strsRaw);
        string token;
        while (getline(ss, token, ',')) {
            strs.push_back(token);
        }

        Solution sol;
        string result = sol.longestCommonPrefix(strs);

        bool pass = (result == expected);

        cout << "CASE|" << caseId++ << "|" << (pass ? "PASS" : "FAIL") << "|"
             << "strs=" << strsRaw << "|" << result << "|" << expected << endl;
    }
    return 0;
}
