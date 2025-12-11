import requests
f = {'file': open('sample_students.csv', 'rb')}
try:
	resp = requests.post('http://127.0.0.1:5000/api/students/upload_preview', files=f, timeout=10)
	print('status', resp.status_code)
	print(resp.text)
except Exception as e:
	print('Error:', e)
