import docker
import time

client = docker.from_env()

code = """
import time
i = input("Enter value: ")
print(f"You entered: {i}")
for x in range(3):
    print("Working...")
    time.sleep(1)
"""

con = client.containers.create(
    "judger:latest", 
    command=["/bin/bash", "-c", "sleep 600"],
    tty=True, # Need tty for interactive prompt?
    detach=True
)
con.start()

try:
    print("Container started, setting up...")
    # write solution.py
    import io, tarfile
    stream = io.BytesIO()
    t = tarfile.open(fileobj=stream, mode='w')
    info = tarfile.TarInfo("solution.py")
    b_code = code.encode('utf-8')
    info.size = len(b_code)
    t.addfile(info, io.BytesIO(b_code))
    t.close()
    stream.seek(0)
    con.put_archive("/home/sandbox", stream)
    
    # exec_run
    exec_res = client.api.exec_create(
        con.id,
        "python3 -u solution.py",
        stdin=True,
        tty=True,
        workdir="/home/sandbox"
    )
    sock = client.api.exec_start(exec_res['Id'], socket=True)
    
    # socket will output the prompt
    sock._sock.setblocking(False)
    
    end_time = time.time() + 10
    while time.time() < end_time:
        try:
            data = sock._sock.recv(4096)
            if data:
                print("STDOUT:", data.decode('utf-8'))
                if "Enter value:" in data.decode('utf-8'):
                    print("Sending input...")
                    sock._sock.send(b"Hello from sock!\n")
        except Exception as e:
            pass
        time.sleep(0.1)
        
finally:
    con.remove(force=True)
