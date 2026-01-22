var python_code = "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]";

var cpp_code = "#include<vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {0, 1};\n    }\n};";

// code to run when page loads
window.onload = function () {
    console.log("page loaded");

    var btn = document.getElementById("run-btn");
    var select = document.getElementById("lang-select");
    var textarea = document.getElementById("code-area");

    // set default
    textarea.value = python_code;

    // change code when language changes
    select.onchange = function () {
        textarea.value = (select.value == "python") ? python_code : cpp_code;
    }

    btn.onclick = function () {
        console.log("clicked run");

        var my_lang = select.value;
        var my_code = textarea.value;
        var result_div = document.getElementById("results");
        var status_div = document.getElementById("status-text");

        status_div.innerHTML = "Wait...";
        result_div.innerHTML = "loading...";
        btn.disabled = true;

        // sending data to my server
        var data = {
            "language": my_lang,
            "code": my_code,
            "problem_id": "two_sum"
        };

        fetch('http://localhost:9000/api/v1/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                console.log(data);

                // show output
                if (data.output) {
                    result_div.innerText = data.output;
                } else {
                    result_div.innerText = "No output";
                }

                // check status
                if (data.exit_code == 0 && data.status == "Executed") {
                    status_div.innerHTML = "<span class='good'>Passed!</span>";
                } else if (data.status == "TLE") {
                    status_div.innerHTML = "<span class='bad'>Too Slow (TLE)</span>";
                } else {
                    status_div.innerHTML = "<span class='bad'>Error</span>";
                }

                btn.disabled = false;
            })
            .catch(function (error) {
                console.log("error happened", error);
                result_div.innerText = "Server error " + error;
                btn.disabled = false;
            });
    }
}
