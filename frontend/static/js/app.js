const API_PREFIX = '/api';
let editingRoll = null;
let csvImportedData = [];

async function loadStudents() {
    try {
        const res = await fetch(`${API_PREFIX}/students`);
        const students = await res.json();
        populateTable(students);
    } catch (err) {
        console.error('Error loading students', err);
    }
}

function populateTable(students) {
    const tbody = document.querySelector('#studentsTable tbody');
    tbody.innerHTML = '';
    for (const s of students) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.roll}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${s.age ?? ''}</td>
            <td>${escapeHtml(s.course ?? '')}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-primary edit-btn" data-roll="${s.roll}"><i class="fa fa-edit"></i> Update</button>
                <button class="btn btn-sm btn-danger delete-btn" data-roll="${s.roll}"><i class="fa fa-trash"></i> Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
    // attach handlers
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const roll = e.target.dataset.roll;
            editStudent(parseInt(roll));
        });
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const roll = e.target.dataset.roll;
            deleteStudent(parseInt(roll));
        });
    });
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

async function editStudent(roll) {
    // fetch student
    const res = await fetch(`${API_PREFIX}/students/${roll}`);
    if (!res.ok) {
        alert('Student not found');
        return;
    }
    const s = await res.json();
    editingRoll = s.roll;
    document.getElementById('roll').value = s.roll;
    document.getElementById('roll').disabled = false;
    document.getElementById('name').value = s.name;
    document.getElementById('age').value = s.age ?? '';
    document.getElementById('course').value = s.course ?? '';
    document.getElementById('modalTitle').textContent = 'Update Student';
    $('#studentModal').modal('show');
}

function openAddModal() {
    editingRoll = null;
    document.getElementById('studentForm').reset();
    document.getElementById('roll').disabled = false;
    document.getElementById('modalTitle').textContent = 'Add Student';
    $('#studentModal').modal('show');
}

async function saveStudent() {
    const roll = parseInt(document.getElementById('roll').value);
    const name = document.getElementById('name').value;
    const age = parseInt(document.getElementById('age').value) || null;
    const course = document.getElementById('course').value;

    const payload = { roll, name, age, course };
    try {
        if (editingRoll !== null) {
            // PUT - update existing student, including roll number change
            const res = await fetch(`${API_PREFIX}/students/${editingRoll}`, {
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.message || 'Failed to update');
                return;
            }
        } else {
            // POST - add new student
            const res = await fetch(`${API_PREFIX}/students`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.message || 'Failed to create');
                return;
            }
        }
        $('#studentModal').modal('hide');
        loadStudents();
    } catch (err) {
        console.error(err);
        alert('Error saving student');
    }
}

async function deleteStudent(roll) {
    if (!confirm(`Delete student with roll ${roll}?`)) return;
    const res = await fetch(`${API_PREFIX}/students/${roll}`, { method: 'DELETE' });
    if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to delete');
        return;
    }
    loadStudents();
}

async function deleteAllStudents() {
    if (!confirm('Are you sure you want to delete ALL students and CSV imports? This action cannot be undone.')) return;
    
    try {
        const res = await fetch(`${API_PREFIX}/students/delete_all`, { method: 'DELETE' });
        const json = await res.json();
        
        if (!res.ok) {
            alert(json.message || 'Failed to delete students');
            return;
        }
        
        alert(json.message || 'All students deleted successfully!');
        csvImportedData = [];
        displayCsvImportedContent();
        loadStudents();
    } catch (err) {
        console.error(err);
        alert('Error deleting students: ' + (err.message || String(err)));
    }
}

async function searchStudents() {
    const q = document.getElementById('search').value.trim();
    if (!q) { loadStudents(); return; }
    const res = await fetch(`${API_PREFIX}/students/search?q=${encodeURIComponent(q)}`);
    const students = await res.json();
    populateTable(students);
}

async function uploadCSV(file) {
    if (!file) return;
    const errDiv = document.getElementById('csvPreviewErrors');
    if (errDiv) errDiv.textContent = '';
    const msgDiv = document.getElementById('csvPreviewMessage');
    if (msgDiv) msgDiv.textContent = '';
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_PREFIX}/students/upload_preview`, { 
            method: 'POST', 
            body: formData 
        });
        const json = await res.json();
        
        if (!res.ok) {
            if (errDiv) errDiv.textContent = json.message || 'CSV preview failed';
            return;
        }
        
        const rows = json.rows || [];
        const fields = json.fields || [];
        
        if (rows.length === 0) {
            if (errDiv) errDiv.textContent = 'No valid rows found in CSV file';
            return;
        }
        
        // Show preview message
        if (msgDiv) msgDiv.textContent = json.message || `CSV parsed successfully! Found ${rows.length} rows.`;
        
        // Store data for import
        csvImportedData = rows;
        
        // Populate preview and show modal
        populateCsvPreview(rows, fields);
        $('#csvPreviewModal').modal('show');
        window.__csvToUpload = { file, rows, fields };
        
        // Reset file input
        const csvInput = document.getElementById('csvFile');
        if (csvInput) csvInput.value = '';
    } catch (err) {
        console.error(err);
        if (errDiv) errDiv.textContent = 'Error previewing CSV: ' + (err.message || String(err));
    }
}

function populateCsvPreview(rows, fields) {
    const thead = document.querySelector('#csvPreviewTable thead');
    const tbody = document.querySelector('#csvPreviewTable tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    // Create header row
    const tr = document.createElement('tr');
    for (const f of fields) {
        const th = document.createElement('th');
        th.textContent = f;
        tr.appendChild(th);
    }
    thead.appendChild(tr);
    
    // Populate data rows
    const limit = Math.min(rows.length, 100);
    for (let i = 0; i < limit; i++) {
        const row = rows[i];
        const tr = document.createElement('tr');
        for (const f of fields) {
            const td = document.createElement('td');
            td.textContent = row[f] ?? '';
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    
    // Show row count message
    if (rows.length > limit) {
        const trMore = document.createElement('tr');
        const td = document.createElement('td');
        td.setAttribute('colspan', String(fields.length));
        td.textContent = `Showing ${limit} of ${rows.length} rows`;
        td.className = 'text-muted';
        trMore.appendChild(td);
        tbody.appendChild(trMore);
    }
}

function displayCsvImportedContent() {
    if (csvImportedData.length === 0) {
        const section = document.getElementById('csvContentSection');
        if (section) section.style.display = 'none';
        return;
    }
    
    const section = document.getElementById('csvContentSection');
    const msgDiv = document.getElementById('csvImportMessage');
    const tbody = document.querySelector('#csvImportedTable tbody');
    
    if (section) section.style.display = 'block';
    if (msgDiv) msgDiv.textContent = `Successfully imported ${csvImportedData.length} records from CSV`;
    if (tbody) {
        tbody.innerHTML = '';
        csvImportedData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.roll ?? ''}</td>
                <td>${escapeHtml(row.name ?? '')}</td>
                <td>${row.age ?? ''}</td>
                <td>${escapeHtml(row.course ?? '')}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// Confirm CSV upload from preview modal
document.getElementById('confirmUploadCSV')?.addEventListener('click', async () => {
    const entry = window.__csvToUpload;
    if (!entry || !entry.file) {
        alert('No CSV to upload.');
        return;
    }
    
    // Upload original file to the server
    const formData = new FormData();
    formData.append('file', entry.file);
    
    try {
        const res = await fetch(`${API_PREFIX}/students/upload`, { 
            method: 'POST', 
            body: formData 
        });
        const json = await res.json();
        
        if (!res.ok) {
            alert(json.message || 'Upload failed');
        } else {
            alert(json.message || 'CSV uploaded successfully!');
            // Display the imported content
            displayCsvImportedContent();
        }
    } catch (err) {
        console.error(err);
        alert('Error uploading CSV to server');
    }
    
    $('#csvPreviewModal').modal('hide');
    
    // Refresh student list from server
    setTimeout(loadStudents, 500);
    
    // Clear the upload entry
    window.__csvToUpload = null;
});

// When preview modal is hidden, clear errors and table
$('#csvPreviewModal').on('hidden.bs.modal', function () {
    document.querySelector('#csvPreviewTable thead').innerHTML = '';
    document.querySelector('#csvPreviewTable tbody').innerHTML = '';
    const msgDiv = document.getElementById('csvPreviewMessage');
    if (msgDiv) msgDiv.textContent = '';
    const errDiv = document.getElementById('csvPreviewErrors');
    if (errDiv) errDiv.textContent = '';
    window.__csvToUpload = null;
});

function wireHandlers() {
    document.getElementById('addBtn').addEventListener('click', openAddModal);
    document.getElementById('viewBtn').addEventListener('click', loadStudents);
    document.getElementById('searchBtn').addEventListener('click', searchStudents);
    
    const topSearchBtn = document.getElementById('searchBtnTop');
    if (topSearchBtn) topSearchBtn.addEventListener('click', () => { 
        document.getElementById('search').focus(); 
    });
    
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) updateBtn.addEventListener('click', () => { 
        alert('Click "Update" button on any student row to edit their details (including Roll number).'); 
    });
    
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) deleteBtn.addEventListener('click', () => { 
        alert('Click "Delete" button on any student row to remove the student.'); 
    });
    
    document.getElementById('saveStudent').addEventListener('click', saveStudent);
    
    document.getElementById('csvFile').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) uploadCSV(file);
    });
    
    document.getElementById('search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchStudents();
    });
    
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) deleteAllBtn.addEventListener('click', deleteAllStudents);
}

document.addEventListener('DOMContentLoaded', () => {
    wireHandlers();
    loadStudents();
});
