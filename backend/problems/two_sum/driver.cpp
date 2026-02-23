#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

#include "solution.cpp"

int main() {
    int n, target, exp1, exp2;
    int caseId = 1;
    
    // Input format: N TARGET EXP1 EXP2
    while (cin >> n >> target >> exp1 >> exp2) {
        vector<int> nums(n);
        string inputStr = "nums=[";
        for(int i=0; i<n; i++) {
            cin >> nums[i];
            inputStr += to_string(nums[i]) + (i==n-1?"":",");
        }
        inputStr += "], target=" + to_string(target);

        Solution sol;
        vector<int> result = sol.twoSum(nums, target);
        
        string actualStr = "[]";
        bool pass = false;
        
        if (result.size() == 2) {
            // Normalize for comparison (sort indices)
            if (result[0] > result[1]) swap(result[0], result[1]);
            
            actualStr = to_string(result[0]) + " " + to_string(result[1]);
            
            if (result[0] == exp1 && result[1] == exp2) {
                pass = true;
            }
        }
        
        string expectedStr = to_string(exp1) + " " + to_string(exp2);
        
        // Output format: CASE|ID|STATUS|INPUT|OUTPUT|EXPECTED
        cout << "CASE|" << caseId++ << "|" << (pass ? "PASS" : "FAIL") << "|" 
             << inputStr << "|" << actualStr << "|" << expectedStr << endl;
    }
    return 0;
}
