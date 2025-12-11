import requests

BASE = 'http://127.0.0.1:5000/api'

# List
print(requests.get(f'{BASE}/students').json())

# Add a student
resp = requests.post(f'{BASE}/students', json={'roll': 123, 'name': 'Test Student', 'age': 20, 'course': 'Physics'})
print('Add:', resp.status_code, resp.json())

# Update
resp = requests.put(f'{BASE}/students/123', json={'name': 'Updated', 'age': 21})
print('Update:', resp.status_code, resp.json())

# Delete
resp = requests.delete(f'{BASE}/students/123')
print('Delete:', resp.status_code, resp.json())

# Search
resp = requests.get(f'{BASE}/students/search?q=John')
print('Search:', resp.status_code, resp.json())
