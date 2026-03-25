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
    
    try {
        const res = await fetch(`${API_BASE_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
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

// 3. Fetch Notes (Requires JWT)
async function fetchNotes() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/notes`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` } // Send JWT here
        });
        
        if (res.ok) {
            const notes = await res.json();
            renderNotes(notes);
        } else if (res.status === 401) {
            logout(); // Token expired or invalid
        }
    } catch (err) { console.error("API Error:", err); }
}

// 4. Create Note (Requires JWT)
document.getElementById('add-note-btn').addEventListener('click', async () => {
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    
    if (!title) return alert("Title is required");

    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/notes`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Send JWT here
            },
            body: JSON.stringify({ title, content })
        });
        
        if (res.ok) {
            document.getElementById('note-title').value = '';
            document.getElementById('note-content').value = '';
            fetchNotes(); // Refresh list
        }
    } catch (err) { console.error("API Error:", err); }
});

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