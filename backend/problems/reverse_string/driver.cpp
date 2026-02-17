#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include "solution.cpp"

using namespace std;

// Parse a JSON-like char array: ["h","e","l","l","o"]
vector<char> parseCharArray(const string& s) {
    vector<char> result;
    for (size_t i = 0; i < s.size(); i++) {
        if (s[i] == '"' && i + 1 < s.size() && s[i + 1] != ']') {
            result.push_back(s[i + 1]);
            i++; // skip the char itself
        }
    }
    return result;
}

string charVecToStr(const vector<char>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); i++) {
        s += "\"";
        s += v[i];
        s += "\"";
        if (i < v.size() - 1) s += ",";
    }
    s += "]";
    return s;
}

int main() {
    string line;
    int caseId = 1;

    while (getline(cin, line)) {
        if (line.empty()) continue;

        // Find the boundary between two arrays: "] [" 
        size_t split = line.find("] [");
        if (split == string::npos) continue;

        string inputStr = line.substr(0, split + 1);
        string expectedStr = line.substr(split + 2);

        vector<char> s = parseCharArray(inputStr);
        vector<char> expected = parseCharArray(expectedStr);
        vector<char> inputCopy = s;

        Solution sol;
        sol.reverseString(s);

        bool pass = (s == expected);

        // Output format: CASE|ID|STATUS|INPUT|OUTPUT|EXPECTED
        cout << "CASE|" << caseId++ << "|" << (pass ? "PASS" : "FAIL") << "|"
             << "s=" << charVecToStr(inputCopy) << "|" 
             << charVecToStr(s) << "|" << charVecToStr(expected) << endl;
    }
    return 0;
}
