#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
#include "solution.cpp"

// Helper function to parse JSON string (basic implementation for this context)
std::vector<int> parseNums(const std::string& s) {
    std::vector<int> nums;
    std::string temp = s.substr(s.find('[') + 1, s.find(']') - s.find('[') - 1);
    std::stringstream ss(temp);
    std::string segment;
    while (std::getline(ss, segment, ',')) {
        nums.push_back(std::stoi(segment));
    }
    return nums;
}

int parseTarget(const std::string& s) {
    size_t colonPos = s.find(":");
    size_t commaPos = s.find(",");
    return std::stoi(s.substr(colonPos + 1, commaPos - colonPos - 1));
}

int main() {
    Solution sol;
    int case_id = 0;
    std::string line;
    while (std::getline(std::cin, line)) {
        case_id++;
        if (line.empty()) continue;
        try {
            // Basic JSON parsing for the expected structure
            size_t numsStart = line.find("\"nums\":");
            size_t numsEnd = line.find(", \"target\"");
            std::string numsStr = line.substr(numsStart + 7, numsEnd - (numsStart + 7)); // "[1, 5, 3, 5, 2]"
            
            size_t targetStart = line.find("\"target\":");
            size_t targetEnd = line.find("}", targetStart);
            std::string targetStr = line.substr(targetStart + 9, targetEnd - (targetStart + 9)); // "5"
            
            int target = std::stoi(targetStr);
            std::vector<int> nums = parseNums(numsStr);

            // Expected value parsing (simplified, assumes expected is the last part)
            size_t expectedStart = line.rfind(":");
            int expected = std::stoi(line.substr(expectedStart + 1));

            int result = sol.findFirstOccurrence(nums, target);
            std::string status = (result == expected) ? "PASS" : "FAIL";
            
            std::cout << "CASE|" << case_id << "|" << status << "|" << "{\"nums\": " << numsStr << ", \"target\": " << target << "}|" << result << "|" << expected << std::endl;

        } catch (const std::exception& e) {
            std::cout << "CASE|" << case_id << "|FAIL|ERROR|" << e.what() << "|N/A" << std::endl;
        }
    }
    return 0;
}