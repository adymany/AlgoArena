#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include "solution.cpp"
#include <streambuf>

int main() {
    Solution sol;
    std::ifstream file("test_data.txt");
    std::string line;
    int case_id = 0;
    
    while (std::getline(file, line)) {
        if (line.empty()) continue;
        case_id++;
        
        // For printing, we capture stdout
        std::stringstream buffer;
        std::streambuf* oldCout = std::cout.rdbuf(buffer.rdbuf());

        // Parse JSON manually or use simple format (assuming no input for this problem)
        // Call sol.solve()
        sol.solve();

        std::cout.rdbuf(oldCout); // Restore original stdout buffer
        std::string result = buffer.str();
        // Remove trailing newline if present for comparison
        if (!result.empty() && result.back() == '\n') {
            result.pop_back();
        }

        // For this problem, we manually check the expected output string
        // The 'expected' field in JSON will be the string "Hello, World!"
        std::string expected = "Hello, World!"; // Assuming this from test data structure
        std::string status = (result == expected) ? "PASS" : "FAIL";
        
        std::cout << "CASE|" << case_id << "|" << status << "|input_N/A|" << result << "|" << expected << std::endl;
    }
    return 0;
}