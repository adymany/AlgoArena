import requests, time

r = requests.post('http://127.0.0.1:5555/start', json={'code': 'i=input("enter: ")\nprint("you said", i)'})
sid = r.json()['session_id']
print('session:', sid)

time.sleep(1)
print('poll 1:', requests.get(f'http://127.0.0.1:5555/poll/{sid}').json())

requests.post(f'http://127.0.0.1:5555/input/{sid}', json={'input': 'hello\n'})
time.sleep(1)
print('poll 2:', requests.get(f'http://127.0.0.1:5555/poll/{sid}').json())

time.sleep(1)
print('poll 3:', requests.get(f'http://127.0.0.1:5555/poll/{sid}').json())
