// Shared auth utilities used by login, dashboard, and admin pages

function requireAuth(onUser) {
  auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = 'login.html'; return; }
    onUser(user);
  });
}

async function requireAdmin(onUser) {
  auth.onAuthStateChanged(async user => {
    if (!user) { window.location.href = 'login.html'; return; }
    const snap = await db.collection('users').doc(user.uid).get();
    if (!snap.exists || snap.data().role !== 'admin') {
      window.location.href = 'dashboard.html'; return;
    }
    onUser(user, snap.data());
  });
}

async function doSignOut() {
  await auth.signOut();
  localStorage.removeItem('zp_session');
  window.location.href = 'index.html';
}

async function getUserData(uid) {
  const snap = await db.collection('users').doc(uid).get();
  return snap.exists ? { uid, ...snap.data() } : null;
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function eventTypeBadge(type) {
  const map = {
    chapter:      { label: 'Chapter',       color: '#002D6C' },
    philanthropy: { label: 'Philanthropy',   color: '#2e7d32' },
    social:       { label: 'Social',         color: '#7b1fa2' },
    brotherhood:  { label: 'Brotherhood',    color: '#e65100' },
    meeting:      { label: 'Meeting',        color: '#1565c0' },
    other:        { label: 'Other',          color: '#546e7a' },
  };
  const t = map[type] || map.other;
  return `<span style="background:${t.color};color:#fff;font-size:0.72rem;padding:2px 8px;
    border-radius:20px;font-family:sans-serif;font-weight:600;letter-spacing:0.04em;">
    ${t.label}</span>`;
}

// Update main-site nav "Sign In / Dashboard" link using localStorage cache
function updatePublicNav() {
  const link = document.getElementById('nav-member-link');
  if (!link) return;
  const session = localStorage.getItem('zp_session');
  if (session) {
    link.textContent = 'Dashboard';
    link.href = 'dashboard.html';
  } else {
    link.textContent = 'Sign In';
    link.href = 'login.html';
  }
}
