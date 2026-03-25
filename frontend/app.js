// Configuration
const API_BASE_URL = 'http://127.0.0.1:8000'; // Make sure this matches your backend port
let token = localStorage.getItem('jwt_token');

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const notesList = document.getElementById('notes-list');
const authMessage = document.getElementById('auth-message');

// --- Initialization ---
function init() {
    if (token) {
        showDashboard();
        fetchNotes();
    } else {
        showAuth();
    }
}

// --- UI Toggles ---
function showAuth() {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
}

function showDashboard() {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
}

// --- API Calls ---

// 1. Register User
document.getElementById('register-btn').addEventListener('click', async () => {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p, role: 'user' })
        });
        if (res.ok) {
            authMessage.style.color = 'green';
            authMessage.innerText = "Registration successful! Please login.";
        } else {
            const data = await res.json();
            authMessage.innerText = data.detail || "Registration failed.";
        }
    } catch (err) { console.error("API Error:", err); }
});

// 2. Login User
document.getElementById('login-btn').addEventListener('click', async () => {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    
    // Create form-urlencoded data to satisfy FastAPI's OAuth2PasswordRequestForm
    const formData = new URLSearchParams();
    formData.append('username', u);
    formData.append('password', p);

    try {
        const res = await fetch(`${API_BASE_URL}/token`, {
            method: 'POST',
            headers: { 
                // Update the content type to match the form data
                'Content-Type': 'application/x-www-form-urlencoded' 
            },
            body: formData // Send the URLSearchParams object instead of JSON.stringify
        });
        
        if (res.ok) {
            const data = await res.json();
            token = data.access_token;
            localStorage.setItem('jwt_token', token); // Save token securely
            authMessage.innerText = "";
            init(); // Refresh UI
        } else {
            authMessage.innerText = "Invalid credentials.";
        }
    } catch (err) { console.error("API Error:", err); }
});
// Global State Variables
let allNotes = [];
let editingNoteId = null; 

// 3. Fetch Notes (Requires JWT)
async function fetchNotes() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/notes`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            allNotes = await res.json(); // Store locally for editing reference
            renderNotes(allNotes);
        } else if (res.status === 401) {
            logout(); 
        }
    } catch (err) { console.error("API Error:", err); }
}

// 4. Create or Update Note (Requires JWT)
document.getElementById('add-note-btn').addEventListener('click', async () => {
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    
    if (!title) return alert("Title is required");

    // Determine if we are updating an existing note or creating a new one
    const method = editingNoteId ? 'PUT' : 'POST';
    const url = editingNoteId 
        ? `${API_BASE_URL}/api/v1/notes/${editingNoteId}` 
        : `${API_BASE_URL}/api/v1/notes`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ title, content })
        });
        
        if (res.ok) {
            // Reset the form
            document.getElementById('note-title').value = '';
            document.getElementById('note-content').value = '';
            
            // Reset the UI state back to "Create" mode
            document.getElementById('add-note-btn').innerText = 'Save Note';
            editingNoteId = null; 
            
            fetchNotes(); // Refresh list
        }
    } catch (err) { console.error("API Error:", err); }
});

// --- Note Actions (Edit & Delete) ---
window.editNote = (id) => {
    const note = allNotes.find(n => n.id === id);
    if (note) {
        // Populate the input fields with the note's data
        document.getElementById('note-title').value = note.title;
        document.getElementById('note-content').value = note.content;
        
        // Change UI to indicate editing state
        document.getElementById('add-note-btn').innerText = 'Update Note';
        editingNoteId = id;
        
        // Scroll to the top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.deleteNote = async (id) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/notes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            fetchNotes(); // Refresh list after deletion
        }
    } catch (err) { console.error("API Error:", err); }
};

// --- Render Helper ---
function renderNotes(notes) {
    if (notes.length === 0) {
        notesList.innerHTML = "<p>No notes found. Create one above!</p>";
        return;
    }
    
    // Inject the note ID directly into the onclick handlers for the buttons
    notesList.innerHTML = notes.map(note => `
        <div class="note-item">
            <div class="note-content-wrapper">
                <h4>${note.title}</h4>
                <p>${note.content}</p>
            </div>
            <div class="note-actions">
                <button onclick="editNote(${note.id})" class="edit-btn">Edit</button>
                <button onclick="deleteNote(${note.id})" class="danger delete-btn">Delete</button>
            </div>
        </div>
    `).reverse().join('');
}
// 4. Create Note (Requires JWT)
// 5. Logout
document.getElementById('logout-btn').addEventListener('click', logout);

function logout() {
    token = null;
    localStorage.removeItem('jwt_token');
    showAuth();
}

// --- Render Helper ---
function renderNotes(notes) {
    if (notes.length === 0) {
        notesList.innerHTML = "<p>No notes found. Create one above!</p>";
        return;
    }
    notesList.innerHTML = notes.map(note => `
        <div class="note-item">
            <h4>${note.title}</h4>
            <p>${note.content}</p>
        </div>
    `).reverse().join(''); // Reverse to show newest first
}

// Start the app
init();