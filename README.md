# Student Management System (MVP)

This repository contains a minimal Student Management System (MVP) with a Python backend (Flask + SQLite) and a Bootstrap frontend.

Features implemented:
- View Students
- Add Student
- Search Student
- Update Student
- Delete Student
- Upload CSV of students

Quick setup

1. Create and activate a virtual environment (Windows PowerShell):

```powershell
python -m venv venv; .\venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Start the app:

```powershell
python backend/app.py
```

Then open http://127.0.0.1:5000 in your browser.

Sample CSV

roll,name,age,course
101,John Doe,21,Computer Science

Notes

- This is an MVP for development and demonstration purposes only. It uses SQLite for storage and serves static frontend files from the backend.

API endpoints

GET /api/students - list all students
GET /api/students/<roll> - get a student's info
POST /api/students - add a student; JSON: {roll,name,age,course}
PUT /api/students/<roll> - update student; JSON with fields to update
DELETE /api/students/<roll> - delete student
POST /api/students/upload - CSV form file; columns roll,name,age,course

Try the test script:

```powershell
python test_api.py
```

Quick API examples (curl)

List students:

```bash
curl http://127.0.0.1:5000/api/students
```

Add a student:

```bash
curl -H "Content-Type: application/json" -d '{"roll":999,"name":"New Student","age":20,"course":"Biology"}' http://127.0.0.1:5000/api/students
```

Update a student:

```bash
curl -X PUT -H "Content-Type: application/json" -d '{"name":"Updated Student"}' http://127.0.0.1:5000/api/students/999
```

Delete a student:

```bash
curl -X DELETE http://127.0.0.1:5000/api/students/999
```

---

Frontend usage

- The app runs at http://127.0.0.1:5000; the UI includes buttons: Add Student, View Students, Search Student, Upload CSV; each action uses the same API described above.
- Click "Add Student" to open a modal and submit a new student.
- Click "Update" for a row to open the modal prefilled for editing. Use the "Delete" button to remove a student.
- Upload a CSV containing columns `roll,name,age,course` by clicking the "Upload CSV" button.
When you select a CSV the UI will preview the data in a modal allowing you to confirm the upload. Once confirmed the CSV will be posted to the server and the new rows will be shown in the UI (followed by a server refresh).

CSV parsing/encoding tips

- The frontend uses PapaParse to preview CSV files before uploading. It will attempt to auto-detect common delimiters (comma, semicolon, tab, pipe). If the preview shows 'No rows were parsed', try saving the CSV using commas as delimiters or change the file encoding to UTF-8 without BOM.
- The server attempts to parse common delimiters (comma, semicolon, tab, pipe) as well before failing the upload.
- Use the `sample_students.csv` sample to verify the upload flow.
When you select a CSV the UI will preview the data in a modal allowing you to confirm the upload. Once confirmed the CSV will be posted to the server and the new rows will be shown in the UI (followed by a server refresh).

Development tips

- `run.ps1` is a convenience script for Windows PowerShell to create a virtual environment, install dependencies, and run the app.
- Use `sample_students.csv` to test the CSV upload feature.

Run with Docker

If you have Docker, you can run it with Docker and avoid installing Python locally. From project root:

```powershell
docker-compose build --no-cache
docker-compose up
```
Frontend usage

- The app runs at http://127.0.0.1:5000; the UI includes buttons: Add Student, View Students, Search Student, Upload CSV; each action uses the same API described above.
- Click "Add Student" to open a modal and submit a new student.
- Click "Update" for a row to open the modal prefilled for editing. Use the "Delete" button to remove a student.
- Upload a CSV containing columns `roll,name,age,course` by clicking the "Upload CSV" button.

Development tips

- `run.ps1` is a convenience script for Windows PowerShell to create a virtual environment, install dependencies, and run the app.
- Use `sample_students.csv` to test the CSV upload feature.


Then open http://127.0.0.1:5000 in your browser.

