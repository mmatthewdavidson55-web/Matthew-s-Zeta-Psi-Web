requireAuth(async user => {
  const data = await getUserData(user.uid);
  if (!data) { doSignOut(); return; }

  // If admin, redirect to admin panel
  if (data.role === 'admin') {
    window.location.href = 'admin.html';
    return;
  }

  localStorage.setItem('zp_session', user.uid);

  // Reveal dashboard
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('dashboard-body').style.display  = 'block';

  // Header
  document.getElementById('user-info-text').textContent = data.name;

  // Welcome
  document.getElementById('welcome-name').textContent = `Welcome back, ${data.firstName || data.name}!`;
  document.getElementById('welcome-sub').textContent  =
    `${data.pledgeClass ? data.pledgeClass + ' · ' : ''}${data.major || ''}`;

  // Stats
  document.getElementById('stat-events').textContent   = (data.eventsAttended   || []).length;
  document.getElementById('stat-hours').textContent    = data.totalHours || 0;
  document.getElementById('stat-chapters').textContent = (data.chaptersAttended || []).length;

  // Dues status — show current semester
  const duesPaid = data.duesPaid || {};
  const currentSem = DUES_SEMESTERS[DUES_SEMESTERS.length - 1];
  const isPaid = duesPaid[currentSem.key] === true;
  const duesCard = document.getElementById('stat-dues-card');
  duesCard.classList.add(isPaid ? 'dues-paid' : 'dues-unpaid');
  document.getElementById('stat-dues-value').innerHTML =
    `<span class="dues-badge ${isPaid ? 'paid' : 'unpaid'}">${isPaid ? 'Paid ✓' : 'Unpaid ✗'}</span>`;
  document.getElementById('stat-dues-sub').textContent = currentSem.label;

  // Dues detail panel
  const duesEl = document.getElementById('dues-detail');
  let duesHtml = '<table class="dues-table">';
  DUES_SEMESTERS.forEach(s => {
    const paid = duesPaid[s.key] === true;
    duesHtml += `<tr>
      <td>${s.label}</td>
      <td><span class="dues-badge ${paid ? 'paid' : 'unpaid'}">${paid ? 'Paid ✓' : 'Unpaid ✗'}</span></td>
    </tr>`;
  });
  duesHtml += '</table>';
  duesEl.innerHTML = duesHtml;

  // Profile panel
  document.getElementById('profile-panel').innerHTML = `
    <table class="dues-table">
      <tr><td>Name</td><td>${data.name}</td></tr>
      <tr><td>Email</td><td>${data.email}</td></tr>
      <tr><td>Phone</td><td>${data.phone || '—'}</td></tr>
      <tr><td>Pledge Class</td><td>${data.pledgeClass || '—'}</td></tr>
      <tr><td>Major</td><td>${data.major || '—'}</td></tr>
    </table>`;

  // Upcoming events
  const now = new Date();
  const upcomingSnap = await db.collection('events')
    .where('date', '>=', firebase.firestore.Timestamp.fromDate(now))
    .orderBy('date')
    .limit(5)
    .get();

  const upcomingEl = document.getElementById('upcoming-events-list');
  if (upcomingSnap.empty) {
    upcomingEl.innerHTML = '<div class="empty-state">No upcoming events scheduled.</div>';
  } else {
    upcomingEl.innerHTML = upcomingSnap.docs.map(doc => {
      const ev = doc.data();
      return `<div class="item-row">
        <div>
          <div class="item-name">${ev.title}</div>
          <div style="margin-top:3px;">${eventTypeBadge(ev.type)}</div>
        </div>
        <div style="text-align:right;">
          <div class="item-date">${formatDate(ev.date)}</div>
          ${ev.hours > 0 ? `<div class="item-date">${ev.hours}h service</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  // My recent attendance — look up events they attended
  const myEventIds = (data.eventsAttended || []).slice(-5).reverse();
  const recentEl = document.getElementById('recent-attendance-list');

  if (myEventIds.length === 0) {
    recentEl.innerHTML = '<div class="empty-state">No events recorded yet.</div>';
  } else {
    const eventDocs = await Promise.all(
      myEventIds.map(id => db.collection('events').doc(id).get())
    );
    recentEl.innerHTML = eventDocs
      .filter(d => d.exists)
      .map(d => {
        const ev = d.data();
        return `<div class="item-row">
          <div>
            <div class="item-name">${ev.title}</div>
            <div style="margin-top:3px;">${eventTypeBadge(ev.type)}</div>
          </div>
          <div class="item-date">${formatDate(ev.date)}</div>
        </div>`;
      }).join('') || '<div class="empty-state">No recent events found.</div>';
  }
});
