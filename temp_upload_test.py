import requests
f = {'file': open('sample_students.csv', 'rb')}
resp = requests.post('http://127.0.0.1:5000/api/students/upload', files=f)
print(resp.status_code)
print(resp.json())
