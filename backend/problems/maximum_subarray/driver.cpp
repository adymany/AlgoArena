#include <iostream>
#include <vector>
using namespace std;

#include "solution.cpp"

int main() {
    int n;
    int caseId = 1;

    while (cin >> n) {
        vector<int> nums(n);
        for (int i = 0; i < n; i++) cin >> nums[i];

        int expected;
        cin >> expected;

        Solution sol;
        int result = sol.maxSubArray(nums);

        bool pass = (result == expected);

        cout << "CASE|" << caseId++ << "|" << (pass ? "PASS" : "FAIL") << "|"
             << "n=" << n << "|" << result << "|" << expected << endl;
    }
    return 0;
}
