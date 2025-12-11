from flask import Flask, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import pandas as pd
import numpy as np

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, 'students.sqlite')

# Serve static files from frontend/static when requested via '/static/*'
app = Flask(__name__, static_folder=os.path.join(BASE_DIR, '../frontend/static'), static_url_path='/static')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)

class Student(db.Model):
    roll = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    age = db.Column(db.Integer, nullable=True)
    course = db.Column(db.String(200), nullable=True)

    def to_dict(self):
        return {
            'roll': self.roll,
            'name': self.name,
            'age': self.age,
            'course': self.course
        }


def create_tables():
    # Ensure tables exist (manual invocation to be compatible with Flask 3.x)
    db.create_all()

FRONTEND_DIR = os.path.join(BASE_DIR, '../frontend')

@app.route('/')
def index():
    # Serve the frontend index (from the frontend directory, not the static subfolder)
    return send_from_directory(FRONTEND_DIR, 'index.html')

# API routes
@app.route('/api/students', methods=['GET'])
def get_students():
    students = Student.query.order_by(Student.roll).all()
    return jsonify([s.to_dict() for s in students])

@app.route('/api/students/<int:roll>', methods=['GET'])
def get_student(roll):
    s = Student.query.get(roll)
    if not s:
        return jsonify({'message': 'Student not found'}), 404
    return jsonify(s.to_dict())

@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.get_json() or {}
    try:
        roll = int(data.get('roll'))
    except (TypeError, ValueError):
        return jsonify({'message': 'Invalid roll number'}), 400
    if Student.query.get(roll):
        return jsonify({'message': 'Student with this roll already exists'}), 400
    student = Student(roll=roll, name=data.get('name', '').strip(), age=data.get('age'), course=data.get('course'))
    db.session.add(student)
    db.session.commit()
    return jsonify(student.to_dict()), 201

@app.route('/api/students/<int:old_roll>', methods=['PUT'])
def update_student(old_roll):
    s = Student.query.get(old_roll)
    if not s:
        return jsonify({'message': 'Student not found'}), 404
    data = request.get_json() or {}
    
    # Handle roll number update
    new_roll = data.get('roll')
    if new_roll is not None:
        try:
            new_roll = int(new_roll)
        except (TypeError, ValueError):
            return jsonify({'message': 'Invalid roll number'}), 400
        
        if new_roll != old_roll and Student.query.get(new_roll):
            return jsonify({'message': 'Student with this roll number already exists'}), 400
        
        s.roll = new_roll
    
    if 'name' in data:
        s.name = data.get('name')
    if 'age' in data:
        s.age = data.get('age')
    if 'course' in data:
        s.course = data.get('course')
    
    db.session.commit()
    return jsonify(s.to_dict())

@app.route('/api/students/<int:roll>', methods=['DELETE'])
def delete_student(roll):
    s = Student.query.get(roll)
    if not s:
        return jsonify({'message': 'Student not found'}), 404
    db.session.delete(s)
    db.session.commit()
    return jsonify({'message': 'Student deleted'})

@app.route('/api/students/search')
def search_students():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify([])
    if q.isdigit():
        students = Student.query.filter(Student.roll == int(q)).all()
    else:
        students = Student.query.filter(Student.name.ilike(f'%{q}%')).all()
    return jsonify([s.to_dict() for s in students])

@app.route('/api/students/upload', methods=['POST'])
def upload_csv():
    if 'file' not in request.files:
        return jsonify({'message': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400
    # Attempt to parse CSV using a few common delimiters
    df = None
    parse_errors = []
    for sep in [',', ';', '\t', '|']:
        try:
            file.seek(0)
            df = pd.read_csv(file, sep=sep, encoding='utf-8')
            # If parsed, break out
            if df is not None and not df.empty:
                break
        except Exception as e:
            parse_errors.append((sep, str(e)))
            df = None
    if df is None:
        return jsonify({'message': f'Error reading CSV. Tried separators: {parse_errors}'}), 400
    
    # Normalize columns to lower-case and strip whitespace
    df.columns = df.columns.str.lower().str.strip().str.replace('\ufeff', '')
    
    # Map flexible field names to required columns
    def find_column(df, keywords):
        """Find a column that matches any of the keywords (case-insensitive)"""
        for col in df.columns:
            for keyword in keywords:
                if keyword.lower() in col.lower():
                    return col
        return None
    
    roll_col = find_column(df, ['roll', 'id', 'number'])
    name_col = find_column(df, ['name', 'student name'])
    age_col = find_column(df, ['age'])
    course_col = find_column(df, ['course', 'department', 'subject'])
    
    if not roll_col or not name_col:
        return jsonify({'message': 'CSV must contain "roll" (or "id", "number") and "name" columns'}), 400
    
    records_added = 0
    for _, row in df.iterrows():
        try:
            roll = int(np.int64(row[roll_col])) if pd.notna(row[roll_col]) else None
        except Exception:
            continue
        
        if roll is None:
            continue
        
        name = str(row[name_col]).strip() if pd.notna(row[name_col]) else ''
        if not name:
            continue
        
        try:
            age = int(np.int64(row[age_col])) if age_col and pd.notna(row[age_col]) else None
        except Exception:
            age = None
        
        course = str(row[course_col]).strip() if course_col and pd.notna(row[course_col]) else ''
        
        if Student.query.get(roll):
            # update existing
            s = Student.query.get(roll)
            s.name = name
            s.age = age
            s.course = course
        else:
            s = Student(roll=roll, name=name, age=age, course=course)
            db.session.add(s)
            records_added += 1
    
    db.session.commit()
    return jsonify({'message': f'CSV processed successfully! {records_added} new records added.'}), 200


@app.route('/api/students/delete_all', methods=['DELETE'])
def delete_all_students():
    try:
        num_deleted = Student.query.delete()
        db.session.commit()
        return jsonify({'message': f'All {num_deleted} students deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error deleting students: {str(e)}'}), 500

@app.route('/api/students/upload_preview', methods=['POST'])
def upload_csv_preview():
    if 'file' not in request.files:
        return jsonify({'message': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400
    # Try to parse CSV using pandas with several common separators
    df = None
    parse_errors = []
    for sep in [',', ';', '\t', '|']:
        try:
            file.seek(0)
            df = pd.read_csv(file, sep=sep, encoding='utf-8')
            # If parsed with at least one row or columns present, we consider it successful
            if df is not None and len(df.columns) > 0:
                break
        except Exception as e:
            parse_errors.append((sep, str(e)))
            df = None
    if df is None:
        return jsonify({'message': f'Error reading CSV. Tried separators: {parse_errors}'}), 400
    # Normalize columns
    df.columns = df.columns.str.lower().str.strip().str.replace('\ufeff', '')
    
    # Map flexible field names to display columns
    def find_column(df, keywords):
        """Find a column that matches any of the keywords (case-insensitive)"""
        for col in df.columns:
            for keyword in keywords:
                if keyword.lower() in col.lower():
                    return col
        return None
    
    roll_col = find_column(df, ['roll', 'id', 'number'])
    name_col = find_column(df, ['name', 'student name'])
    age_col = find_column(df, ['age'])
    course_col = find_column(df, ['course', 'department', 'subject'])
    
    if not roll_col or not name_col:
        return jsonify({'message': 'CSV must contain "roll" (or "id", "number") and "name" columns'}), 400
    
    # Use numpy to coerce types and create sanitized rows
    rows = []
    for _, row in df.iterrows():
        try:
            roll = int(np.int64(row[roll_col])) if pd.notna(row[roll_col]) else None
        except Exception:
            try:
                roll = int(float(row[roll_col])) if pd.notna(row[roll_col]) else None
            except Exception:
                roll = None
        
        try:
            age = int(np.int64(row[age_col])) if age_col and pd.notna(row[age_col]) else None
        except Exception:
            try:
                age = int(float(row[age_col])) if age_col and pd.notna(row[age_col]) else None
            except Exception:
                age = None
        
        rows.append({
            'roll': roll,
            'name': str(row[name_col]) if pd.notna(row[name_col]) else '',
            'age': age,
            'course': str(row[course_col]) if course_col and pd.notna(row[course_col]) else ''
        })
    
    return jsonify({
        'message': f'CSV parsed successfully! {len(rows)} rows detected.',
        'rows': rows[:200],
        'count': len(rows),
        'fields': ['roll', 'name', 'age', 'course']
    }), 200

if __name__ == '__main__':
    # Preload a sample student if DB empty
    # Ensure tables exist and pre-populate a sample row if DB didn't exist
    with app.app_context():
        create_tables()
        if not os.path.exists(DB_PATH):
            s = Student(roll=101, name='John Doe', age=21, course='Computer Science')
            db.session.add(s)
            db.session.commit()
    app.run(debug=True)
