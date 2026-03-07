from flask import Flask, jsonify, request
import docker
import tarfile, io, uuid
import select
import threading

app = Flask(__name__)
client = docker.from_env()

active_sessions = {}

@app.route("/start", methods=["POST"])
def start():
    data = request.json
    code = data["code"]
    
    con = client.containers.create(
        "python:3.11-slim", command=["/bin/bash", "-c", "sleep 600"],
        tty=True, detach=True
    )
    con.start()
    
    stream = io.BytesIO()
    t = tarfile.open(fileobj=stream, mode='w')
    b_code = code.encode('utf-8')
    info = tarfile.TarInfo(name="solution.py")
    info.size = len(b_code)
    t.addfile(info, io.BytesIO(b_code))
    t.close()
    stream.seek(0)
    con.put_archive("/home", stream)
    
    exec_id = client.api.exec_create(
        con.id,
        "python3 -u solution.py",
        stdin=True, stdout=True, stderr=True, tty=True,
        workdir="/home"
    )['Id']
    
    sock = client.api.exec_start(exec_id, socket=True)
    sock_fd = sock._sock if hasattr(sock, '_sock') else sock
    sock_fd.setblocking(False)
    
    sid = str(uuid.uuid4())
    active_sessions[sid] = {
        "con": con,
        "sock": sock_fd,
        "exec_id": exec_id
    }
    return jsonify({"session_id": sid})

@app.route("/poll/<sid>", methods=["GET"])
def poll(sid):
    s = active_sessions.get(sid)
    if not s: return jsonify({"error": "not found"}), 404
    
    sock_fd = s["sock"]
    output = ""
    try:
        while True:
            ready = select.select([sock_fd], [], [], 0.1)
            if ready[0]:
                chunk = sock_fd.recv(4096)
                if not chunk:
                    break
                output += chunk.decode('utf-8', errors='replace')
            else:
                break
    except Exception as e:
        pass
        
    res = client.api.exec_inspect(s["exec_id"])
    running = res['Running']
    
    if not running:
        s["con"].remove(force=True)
        del active_sessions[sid]
        
    return jsonify({"output": output, "running": running})

@app.route("/input/<sid>", methods=["POST"])
def send_input(sid):
    s = active_sessions.get(sid)
    if not s: return jsonify({"error": "not found"}), 404
    
    val = request.json.get("input", "")
    s["sock"].send(val.encode('utf-8'))
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(port=5555)
