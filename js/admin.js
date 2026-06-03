let allMembers = [];   // { uid, ...firestoreData }
let allEvents  = [];   // { id, ...firestoreData }
let currentEventId = null;  // event being edited in modal

requireAdmin(async (user, adminData) => {
  localStorage.setItem('zp_session', user.uid);
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('admin-body').style.display     = 'block';
  document.getElementById('admin-name-tag').textContent   = adminData.name;

  // Set dues column headers from config
  const col1 = document.getElementById('dues-col-1');
  const col2 = document.getElementById('dues-col-2');
  if (DUES_SEMESTERS[0]) col1.textContent = DUES_SEMESTERS[0].label;
  if (DUES_SEMESTERS[1]) col2.textContent = DUES_SEMESTERS[1].label;

  await Promise.all([loadMembers(), loadEvents()]);
  renderSummary();
});

// ── Tab switching ──────────────────────────────────────────────────────────
document.querySelectorAll('.at-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.at-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.at-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ── Load members ───────────────────────────────────────────────────────────
async function loadMembers() {
  const snap = await db.collection('users').orderBy('lastName').get();
  allMembers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  renderMemberTable(allMembers);
}

function renderMemberTable(members) {
  const tbody = document.getElementById('member-tbody');

  if (members.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No brothers found.</td></tr>';
    return;
  }

  tbody.innerHTML = members.map(m => {
    const dues0 = m.duesPaid?.[DUES_SEMESTERS[0]?.key] === true;
    const dues1 = m.duesPaid?.[DUES_SEMESTERS[1]?.key] === true;

    return `<tr>
      <td><strong>${m.name}</strong></td>
      <td style="white-space:nowrap;">${m.pledgeClass || '—'}</td>
      <td>${m.major || '—'}</td>
      <td style="text-align:center;">${(m.eventsAttended || []).length}</td>
      <td style="text-align:center;">${m.totalHours || 0}</td>
      <td style="text-align:center;">${(m.chaptersAttended || []).length}</td>
      <td style="text-align:center;">
        <button class="dues-toggle ${dues0 ? 'paid' : 'unpaid'}"
          onclick="toggleDues('${m.uid}', '${DUES_SEMESTERS[0]?.key}', ${dues0})">
          ${dues0 ? '✓ Paid' : '✗ Unpaid'}
        </button>
      </td>
      <td style="text-align:center;">
        <button class="dues-toggle ${dues1 ? 'paid' : 'unpaid'}"
          onclick="toggleDues('${m.uid}', '${DUES_SEMESTERS[1]?.key}', ${dues1})">
          ${dues1 ? '✓ Paid' : '✗ Unpaid'}
        </button>
      </td>
      <td style="font-family:sans-serif;font-size:0.8rem;">${m.phone || '—'}</td>
    </tr>`;
  }).join('');
}

// Member search filter
document.getElementById('member-search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  renderMemberTable(allMembers.filter(m =>
    m.name.toLowerCase().includes(q) ||
    (m.pledgeClass || '').toLowerCase().includes(q) ||
    (m.major || '').toLowerCase().includes(q)
  ));
});

// ── Toggle dues ────────────────────────────────────────────────────────────
async function toggleDues(uid, semKey, currentlyPaid) {
  if (!semKey) return;
  const newVal = !currentlyPaid;
  await db.collection('users').doc(uid).update({
    [`duesPaid.${semKey}`]: newVal
  });
  // Update local cache
  const m = allMembers.find(x => x.uid === uid);
  if (m) { m.duesPaid = m.duesPaid || {}; m.duesPaid[semKey] = newVal; }
  renderMemberTable(allMembers);
  renderSummary();
  showToast(`${m?.name || 'Member'}: ${semKey.replace('_', ' ')} dues marked as ${newVal ? 'Paid' : 'Unpaid'}`);
}

// ── Load events ────────────────────────────────────────────────────────────
async function loadEvents() {
  const snap = await db.collection('events').orderBy('date', 'desc').limit(50).get();
  allEvents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderEventsList();
}

function renderEventsList() {
  const container = document.getElementById('events-list');
  if (allEvents.length === 0) {
    container.innerHTML = '<p style="color:var(--gray-mid);font-family:sans-serif;font-size:0.9rem;">No events yet. Create one in the "Add Event" tab.</p>';
    return;
  }

  container.innerHTML = allEvents.map(ev => `
    <div class="event-list-item">
      <div class="ev-info">
        <div class="ev-title">${ev.title} ${eventTypeBadge(ev.type)}</div>
        <div class="ev-meta">
          ${formatDate(ev.date)}
          ${ev.location ? ' · ' + ev.location : ''}
          ${ev.hours > 0 ? ' · ' + ev.hours + 'h service' : ''}
          · ${(ev.attendees || []).length} attended
        </div>
      </div>
      <div class="ev-actions">
        <button class="btn-xs navy" onclick="openAttendanceModal('${ev.id}')">Mark Attendance</button>
        <button class="btn-xs red"  onclick="deleteEvent('${ev.id}', '${ev.title.replace(/'/g, "\\'")}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// ── Create event ───────────────────────────────────────────────────────────
async function submitEvent() {
  const title    = document.getElementById('ev-title').value.trim();
  const dateVal  = document.getElementById('ev-date').value;
  const type     = document.getElementById('ev-type').value;
  const hours    = parseFloat(document.getElementById('ev-hours').value) || 0;
  const location = document.getElementById('ev-location').value.trim();
  const desc     = document.getElementById('ev-desc').value.trim();

  if (!title || !dateVal) { showToast('Please fill in title and date.', true); return; }

  const btn = document.getElementById('ev-submit-btn');
  btn.disabled = true; btn.textContent = 'Creating…';

  try {
    const ref = await db.collection('events').add({
      title,
      date:      firebase.firestore.Timestamp.fromDate(new Date(dateVal)),
      type,
      hours,
      location,
      description: desc,
      attendees:   [],
      createdAt:   firebase.firestore.FieldValue.serverTimestamp()
    });

    allEvents.unshift({ id: ref.id, title, date: firebase.firestore.Timestamp.fromDate(new Date(dateVal)), type, hours, location, description: desc, attendees: [] });

    // Reset form
    ['ev-title','ev-date','ev-location','ev-desc'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('ev-hours').value = '';

    renderEventsList();
    renderSummary();
    showToast(`Event "${title}" created!`);

    // Switch to events tab
    document.querySelector('[data-tab="events"]').click();
  } catch (err) {
    showToast('Error creating event: ' + err.message, true);
  }

  btn.disabled = false; btn.textContent = 'Create Event';
}

// ── Delete event ───────────────────────────────────────────────────────────
async function deleteEvent(eventId, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  await db.collection('events').doc(eventId).delete();
  allEvents = allEvents.filter(e => e.id !== eventId);
  renderEventsList();
  renderSummary();
  showToast(`"${title}" deleted.`);
}

// ── Attendance modal ───────────────────────────────────────────────────────
function openAttendanceModal(eventId) {
  currentEventId = eventId;
  const ev = allEvents.find(e => e.id === eventId);
  if (!ev) return;

  document.getElementById('modal-event-title').textContent = `Attendance: ${ev.title}`;
  document.getElementById('modal-search').value = '';
  renderModalList(allMembers);
  document.getElementById('attendance-modal').classList.add('open');
}

function renderModalList(members) {
  const ev      = allEvents.find(e => e.id === currentEventId);
  const checked = new Set(ev?.attendees || []);

  document.getElementById('modal-member-list').innerHTML = members.map(m => `
    <div class="member-check-row">
      <input type="checkbox" id="chk-${m.uid}" data-uid="${m.uid}" ${checked.has(m.uid) ? 'checked' : ''}>
      <label for="chk-${m.uid}">
        ${m.name}
        <span class="pledge-tag">${m.pledgeClass || ''}</span>
      </label>
    </div>
  `).join('');
}

function filterModalList() {
  const q = document.getElementById('modal-search').value.toLowerCase();
  renderModalList(allMembers.filter(m => m.name.toLowerCase().includes(q) || (m.pledgeClass || '').toLowerCase().includes(q)));
}

function closeModal() {
  document.getElementById('attendance-modal').classList.remove('open');
  currentEventId = null;
}

async function saveAttendance() {
  if (!currentEventId) return;
  const ev = allEvents.find(e => e.id === currentEventId);
  if (!ev) return;

  const saveBtn = document.getElementById('save-attendance-btn');
  saveBtn.disabled = true; saveBtn.textContent = 'Saving…';

  const previousAttendees = new Set(ev.attendees || []);
  const newAttendees = new Set(
    [...document.querySelectorAll('#modal-member-list input[type="checkbox"]:checked')]
      .map(cb => cb.dataset.uid)
  );

  const added   = [...newAttendees].filter(uid => !previousAttendees.has(uid));
  const removed = [...previousAttendees].filter(uid => !newAttendees.has(uid));

  const batch = db.batch();
  const isChapter = ev.type === 'chapter';

  // Update event attendees
  batch.update(db.collection('events').doc(currentEventId), {
    attendees: [...newAttendees]
  });

  // Update each added member's stats
  for (const uid of added) {
    const updates = {};
    if (isChapter) {
      updates.chaptersAttended = firebase.firestore.FieldValue.arrayUnion(currentEventId);
    } else {
      updates.eventsAttended = firebase.firestore.FieldValue.arrayUnion(currentEventId);
    }
    if (ev.hours > 0) updates.totalHours = firebase.firestore.FieldValue.increment(ev.hours);
    batch.update(db.collection('users').doc(uid), updates);
  }

  // Update each removed member's stats
  for (const uid of removed) {
    const updates = {};
    if (isChapter) {
      updates.chaptersAttended = firebase.firestore.FieldValue.arrayRemove(currentEventId);
    } else {
      updates.eventsAttended = firebase.firestore.FieldValue.arrayRemove(currentEventId);
    }
    if (ev.hours > 0) updates.totalHours = firebase.firestore.FieldValue.increment(-ev.hours);
    batch.update(db.collection('users').doc(uid), updates);
  }

  try {
    await batch.commit();

    // Sync local cache
    ev.attendees = [...newAttendees];

    for (const uid of added) {
      const m = allMembers.find(x => x.uid === uid);
      if (!m) continue;
      if (isChapter) {
        m.chaptersAttended = [...new Set([...(m.chaptersAttended || []), currentEventId])];
      } else {
        m.eventsAttended = [...new Set([...(m.eventsAttended || []), currentEventId])];
      }
      if (ev.hours > 0) m.totalHours = (m.totalHours || 0) + ev.hours;
    }

    for (const uid of removed) {
      const m = allMembers.find(x => x.uid === uid);
      if (!m) continue;
      if (isChapter) {
        m.chaptersAttended = (m.chaptersAttended || []).filter(id => id !== currentEventId);
      } else {
        m.eventsAttended = (m.eventsAttended || []).filter(id => id !== currentEventId);
      }
      if (ev.hours > 0) m.totalHours = Math.max(0, (m.totalHours || 0) - ev.hours);
    }

    renderMemberTable(allMembers);
    renderEventsList();
    renderSummary();
    showToast(`Attendance saved: ${newAttendees.size} present`);
    closeModal();
  } catch (err) {
    showToast('Error saving: ' + err.message, true);
  }

  saveBtn.disabled = false; saveBtn.textContent = 'Save Attendance';
}

// ── Summary stats ──────────────────────────────────────────────────────────
function renderSummary() {
  const total    = allMembers.length;
  const semKey   = DUES_SEMESTERS[DUES_SEMESTERS.length - 1]?.key;
  const paid     = allMembers.filter(m => m.duesPaid?.[semKey] === true).length;
  const pct      = total > 0 ? Math.round((paid / total) * 100) : 0;
  const evCount  = allEvents.length;
  const totalHrs = allMembers.reduce((sum, m) => sum + (m.totalHours || 0), 0);

  document.getElementById('sum-members').textContent  = total;
  document.getElementById('sum-dues-pct').textContent = `${pct}%`;
  document.getElementById('sum-events').textContent   = evCount;
  document.getElementById('sum-hours').textContent    = totalHrs;
}

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#c62828' : '#2e7d32';
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3500);
}
