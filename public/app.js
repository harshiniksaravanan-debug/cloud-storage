const API = window.location.origin;

let token = localStorage.getItem('token') || null;
let currentUser = null;

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
  if (name === 'login') {
    document.getElementById('login-form').classList.remove('hidden');
    document.querySelector('.tab:first-child').classList.add('active');
  } else {
    document.getElementById('register-form').classList.remove('hidden');
    document.querySelector('.tab:last-child').classList.add('active');
  }
}

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  try {
    const data = await api('POST', '/api/auth/login', {
      username: document.getElementById('login-username').value,
      password: document.getElementById('login-password').value,
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    showDashboard();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('reg-error');
  try {
    const data = await api('POST', '/api/auth/register', {
      username: document.getElementById('reg-username').value,
      email: document.getElementById('reg-email').value,
      password: document.getElementById('reg-password').value,
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    showDashboard();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('dashboard-section').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('dashboard-section').classList.remove('hidden');
  document.getElementById('user-display').textContent = currentUser?.username || '';
  loadFiles();
}

// Upload
document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('file-input');
  if (!fileInput.files[0]) return;
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  try {
    const res = await fetch(API + '/api/files/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    document.getElementById('upload-status').textContent = `Uploaded: ${data.file.original_name}`;
    fileInput.value = '';
    loadFiles();
  } catch (err) {
    document.getElementById('upload-status').textContent = err.message;
    document.getElementById('upload-status').style.color = '#ef4444';
  }
});

async function loadFiles() {
  try {
    const files = await api('GET', '/api/files/');
    renderOwned(files.owned);
    renderShared(files.shared);

    const publicFiles = await api('GET', '/api/files/public');
    renderPublic(publicFiles.files);
  } catch (err) {
    console.error(err);
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function getBadge(file) {
  if (file.shared_permission === 'write') return '<span class="badge write">write</span>';
  if (file.shared_permission === 'read') return '<span class="badge read">read</span>';
  if (file.is_public) return '<span class="badge public">public</span>';
  return '';
}

function renderOwned(files) {
  const el = document.getElementById('owned-files');
  if (!files.length) { el.innerHTML = '<p class="empty">No files uploaded yet.</p>'; return; }
  el.innerHTML = files.map(f => `
    <div class="file-item">
      <div class="file-info">
        <span class="file-name">${f.original_name} ${f.is_public ? '<span class="badge public">public</span>' : '<span class="badge">private</span>'}</span>
        <span class="file-meta">${formatSize(f.size)} &middot; ${new Date(f.created_at).toLocaleDateString()}</span>
      </div>
      <div class="file-actions">
        <button class="btn-small" onclick="downloadFile('${f.id}')">Download</button>
        <button class="btn-small" onclick="toggleVisibility('${f.id}', ${f.is_public})">${f.is_public ? 'Make Private' : 'Make Public'}</button>
        <button class="btn-small" onclick="openShareModal('${f.id}','${f.original_name}')">Share</button>
        <button class="btn-danger" onclick="deleteFile('${f.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function renderShared(files) {
  const el = document.getElementById('shared-files');
  if (!files.length) { el.innerHTML = '<p class="empty">No files shared with you.</p>'; return; }
  el.innerHTML = files.map(f => `
    <div class="file-item">
      <div class="file-info">
        <span class="file-name">${f.original_name} ${getBadge(f)}</span>
        <span class="file-meta">${formatSize(f.size)} &middot; ${new Date(f.created_at).toLocaleDateString()}</span>
      </div>
      <div class="file-actions">
        <button class="btn-small" onclick="downloadFile('${f.id}')">Download</button>
      </div>
    </div>
  `).join('');
}

function renderPublic(files) {
  const el = document.getElementById('public-files');
  if (!files.length) { el.innerHTML = '<p class="empty">No public files.</p>'; return; }
  el.innerHTML = files.map(f => `
    <div class="file-item">
      <div class="file-info">
        <span class="file-name">${f.original_name} <span class="badge public">public</span></span>
        <span class="file-meta">${formatSize(f.size)}</span>
      </div>
      <div class="file-actions">
        <button class="btn-small" onclick="downloadFile('${f.id}')">Download</button>
      </div>
    </div>
  `).join('');
}

function downloadFile(id) {
  window.open(API + '/api/files/' + id + '?token=' + (token || ''), '_blank');
}

async function toggleVisibility(id, current) {
  try {
    await api('PATCH', `/api/files/${id}/visibility`, { is_public: !current });
    loadFiles();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteFile(id) {
  if (!confirm('Delete this file?')) return;
  try {
    await api('DELETE', `/api/files/${id}`);
    loadFiles();
  } catch (err) {
    alert(err.message);
  }
}

let shareFileId = null;
function openShareModal(fileId, fileName) {
  shareFileId = fileId;
  document.getElementById('share-file-name').textContent = fileName;
  document.getElementById('share-username').value = '';
  document.getElementById('share-permission').value = 'read';
  document.getElementById('share-status').textContent = '';
  document.getElementById('share-modal').classList.remove('hidden');
}

function closeShareModal() {
  document.getElementById('share-modal').classList.add('hidden');
  shareFileId = null;
}

async function shareFile() {
  const username = document.getElementById('share-username').value;
  const permission = document.getElementById('share-permission').value;
  try {
    await api('POST', `/api/files/${shareFileId}/share`, { username, permission });
    document.getElementById('share-status').textContent = `Shared with ${username}`;
    setTimeout(closeShareModal, 1000);
  } catch (err) {
    document.getElementById('share-status').textContent = err.message;
    document.getElementById('share-status').style.color = '#ef4444';
  }
}

// Auto-login if token exists
if (token) {
  api('GET', '/api/files/').then(() => {
    currentUser = { username: 'User' };
    showDashboard();
  }).catch(() => {
    localStorage.removeItem('token');
    token = null;
  });
}
