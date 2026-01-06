from flask import Flask, request, jsonify
from flask_cors import CORS
import docker
import tarfile
import io
import os
import threading

app = Flask(__name__)
CORS(app) 

# this connects to docker desktop
client = docker.from_env()

@app.route("/api/v1/execute", methods=["POST"])
def run_code():
    print("got a request!")
    
    # get data from json
    data = request.json
    lang = data["language"]
    user_code = data["code"]
    pid = data.get("problem_id", "")
    
    # default python filename
    fname = "solution.py"
    cmd = ""

    # check language
    if lang == "python":
        fname = "solution.py"
        # run python driver if possible
        if pid != "":
            cmd = "python3 -u driver.py < test_data.txt"
        else:
            cmd = "python3 solution.py"
            
    elif lang == "cpp":
        fname = "solution.cpp"
        if pid != "":
            # compile and run
            cmd = "g++ -o solution driver.cpp -I/home/sandbox && ./solution < test_data.txt"
        else:
            cmd = "g++ -o solution solution.cpp && ./solution"
    else:
        return jsonify({"error": "bad language"})

    # config for container
    my_config = {
        "image": "judger:latest",
        "command": ["/bin/bash", "-c", "sleep 600"], # sleep so we can copy files
        "mem_limit": "128m",
        "network_mode": "none", # security
        "detach": True
    }

    try:
        # start container
        con = client.containers.create(**my_config)
        con.start()
        
        # --- File Copying Stuff ---
        # i used tarfile because docker needs it
        stream = io.BytesIO()
        t = tarfile.open(fileobj=stream, mode='w')
        
        # add user code
        info = tarfile.TarInfo(name=fname)
        b_code = user_code.encode('utf-8')
        info.size = len(b_code)
        t.addfile(info, io.BytesIO(b_code))
        
        # add driver files if needed
        if pid != "":
            # path to problem folder
            p_path = os.path.join("backend", "problems", pid)
            if not os.path.exists(p_path):
                p_path = os.path.join("problems", pid)
                
            # determine driver filename
            if lang == "python":
                d_name = "driver.py"
            else:
                d_name = "driver.cpp"
                
            # read driver file
            if os.path.exists(os.path.join(p_path, d_name)):
                with open(os.path.join(p_path, d_name), "rb") as f:
                    d_data = f.read()
                    info2 = tarfile.TarInfo(name=d_name)
                    info2.size = len(d_data)
                    t.addfile(info2, io.BytesIO(d_data))

            # read test data
            if os.path.exists(os.path.join(p_path, "test_data.txt")):
                 with open(os.path.join(p_path, "test_data.txt"), "rb") as f:
                    t_data = f.read()
                    info3 = tarfile.TarInfo(name="test_data.txt")
                    info3.size = len(t_data)
                    t.addfile(info3, io.BytesIO(t_data))
        
        t.close()
        stream.seek(0)
        con.put_archive("/home/sandbox", stream)
        # ---------------------------

        # --- Running the code ---
        
        # i found this timeout logic on stackoverflow mostly
        res = {"code": None, "msg": "", "is_tle": False}
        
        def run_thread():
            try:
                # runs the command
                c, out = con.exec_run(
                    cmd=f"/bin/bash -c '{cmd.replace('\'', '\'\\\'')}'",
                    workdir="/home/sandbox"
                )
                res["code"] = c
                res["msg"] = out
            except:
                print("exec run failed")

        worker = threading.Thread(target=run_thread)
        worker.start()
        
        # wait 2 seconds
        worker.join(timeout=2)
        
        if worker.is_alive():
            print("timeout happened!")
            res["is_tle"] = True
            try:
                con.kill() # stop it
            except:
                pass
            worker.join()
            
            # remove container
            con.remove(force=True)
            return jsonify({
                "status": "TLE", 
                "output": "Time Limit Exceeded", 
                "exit_code": 124
            })
            
        # cleanup
        con.remove(force=True)
        
        return jsonify({
            "status": "Executed",
            "output": res["msg"].decode('utf-8') if res["msg"] else "",
            "exit_code": res["code"]
        })

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)})

if __name__ == "__main__":
    print("Server starting on 9000...")
    app.run(host="0.0.0.0", port=9000)
