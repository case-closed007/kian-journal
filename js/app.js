// ── HELPERS ────────────────────────────────────────────
function dateKey(d) { return d.toISOString().split('T')[0]; }

function formatDate(d) { return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); }

function formatDateCn(d) { return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }); }

function getDayAge() { return Math.floor((new Date() - BIRTH_DATE) / 86400000); }

function formatAge(ageDays) {
  const totalMonths = Math.floor(ageDays / 30.44);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const remDays = ageDays - Math.floor(totalMonths * 30.44);
  if (years >= 1) return `${years}岁${months}月`;
  if (totalMonths >= 3) return `${totalMonths}月${remDays}天`;
  return `${ageDays}天`;
}

function parseDuration(dur) {
  const hm = dur.match(/(\d+)h\s*(\d+)m/);
  const m = dur.match(/^(\d+)m$/);
  const h = dur.match(/^(\d+)h$/);
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2]);
  if (m) return parseInt(m[1]);
  if (h) return parseInt(h[1]) * 60;
  return 0;
}

function calcSleepDuration(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  let [eh, em] = end.split(':').map(Number);
  let startMin = sh * 60 + sm, endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60;
  const diff = endMin - startMin;
  const h = Math.floor(diff / 60), m = diff % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── INIT ───────────────────────────────────────────────
function init() {
  loadData();
  const age = getDayAge();
  const ageEl = document.getElementById('topbar-age-num');
  const ageUnitEl = document.getElementById('topbar-age-unit');
  if (ageEl) {
    const formatted = formatAge(age);
    // Split into num + unit parts for display
    const mMatch = formatted.match(/^(\d+月\d+)天$/);
    const yMatch = formatted.match(/^(\d+岁\d+)月$/);
    if (mMatch || yMatch) {
      ageEl.textContent = formatted;
      if (ageUnitEl) ageUnitEl.textContent = '';
    } else {
      ageEl.textContent = age;
    }
  }
  updateDateDisplay();
  renderAll();
}

function updateDateDisplay() {
  document.getElementById('current-date-display').textContent = formatDate(currentDate);
  document.getElementById('current-date-cn').textContent = formatDateCn(currentDate);
  const picker = document.getElementById('date-picker-input');
  if (picker) picker.value = dateKey(currentDate);
}

function openDatePicker() {
  const picker = document.getElementById('date-picker-input');
  if (picker) { picker.value = dateKey(currentDate); picker.showPicker ? picker.showPicker() : picker.click(); }
}

function onDatePickerChange(val) {
  if (!val) return;
  currentDate = new Date(val + 'T00:00:00');
  updateDateDisplay();
  renderAll();
}

function renderAll() {
  renderTimeline();
  renderDailySummary();
  renderPredictions();
  renderInsight();
  renderDailyNote();
  renderMilestones();
  renderGrowthHistory();
  renderWeekly();
  renderNotes();
  renderCalendar();
}

// ── DATE NAV ───────────────────────────────────────────
function changeDate(dir) {
  if (dir === 0) { currentDate = new Date(); currentDate.setHours(0,0,0,0); }
  else currentDate.setDate(currentDate.getDate() + dir);
  updateDateDisplay();
  renderAll();
}

// ── AI COLLAPSIBLE ─────────────────────────────────────
function toggleAiInput(bar) {
  const body = document.getElementById('ai-expanded-body');
  const arrow = document.getElementById('ai-quick-arrow');
  if (!body) return;
  const open = body.classList.toggle('open');
  if (arrow) arrow.classList.toggle('open', open);
  if (open) { const ta = document.getElementById('ai-input-text'); if (ta) ta.focus(); }
}

// ── TIMELINE FILTER ────────────────────────────────────
let _timelineFilter = 'all';

function setTimelineFilter(type, btn) {
  _timelineFilter = type;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTimeline();
}

// ── ADD FORM TABS ───────────────────────────────────────
function showAddForm(type, btn) {
  ['feed', 'sleep', 'activity'].forEach(t => {
    document.getElementById('add-form-' + t).style.display = t === type ? 'block' : 'none';
  });
  document.querySelectorAll('.add-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ── FEEDS ──────────────────────────────────────────────
function addFeed() {
  const time = document.getElementById('feed-time').value;
  const amount = parseInt(document.getElementById('feed-amount').value);
  const type = document.getElementById('feed-type').value;
  if (!time || !amount) return;
  const key = dateKey(currentDate);
  if (!data.feeds[key]) data.feeds[key] = [];
  data.feeds[key].push({ time, amount, type, id: Date.now() });
  data.feeds[key].sort((a, b) => a.time.localeCompare(b.time));
  document.getElementById('feed-amount').value = '';
  saveData();
  renderTimeline();
  renderDailySummary();
  renderPredictions();
  renderInsight();
}

function deleteFeed(key, id) {
  data.feeds[key] = data.feeds[key].filter(f => f.id !== id);
  saveData();
  renderTimeline();
  renderDailySummary();
  renderPredictions();
  renderInsight();
}

// ── SLEEP ──────────────────────────────────────────────
function addSleep() {
  const start = document.getElementById('sleep-start').value;
  const end = document.getElementById('sleep-end').value;
  const type = document.getElementById('sleep-type').value;
  if (!start || !end) return;
  const key = dateKey(currentDate);
  if (!data.sleeps[key]) data.sleeps[key] = [];
  data.sleeps[key].push({ start, end, type, duration: calcSleepDuration(start, end), id: Date.now() });
  data.sleeps[key].sort((a, b) => a.start.localeCompare(b.start));
  saveData();
  renderTimeline();
  renderDailySummary();
  renderPredictions();
}

function deleteSleep(key, id) {
  data.sleeps[key] = data.sleeps[key].filter(s => s.id !== id);
  saveData();
  renderTimeline();
  renderDailySummary();
  renderPredictions();
}

// ── ACTIVITIES ─────────────────────────────────────────
function addActivity() {
  const time = document.getElementById('activity-time').value;
  const type = document.getElementById('activity-type').value;
  const note = document.getElementById('activity-note').value;
  if (!time) return;
  const key = dateKey(currentDate);
  if (!data.activities[key]) data.activities[key] = [];
  data.activities[key].push({ time, type, note, id: Date.now() });
  data.activities[key].sort((a, b) => a.time.localeCompare(b.time));
  document.getElementById('activity-note').value = '';
  saveData();
  renderTimeline();
}

function deleteActivity(key, id) {
  data.activities[key] = data.activities[key].filter(a => a.id !== id);
  saveData();
  renderTimeline();
}

// ── NIGHT SLEEP CALCULATION (prev day 19:00 → today 07:00) ──
function calcNightSleepSpan() {
  const todayKey = dateKey(currentDate);
  const prevDay = new Date(currentDate);
  prevDay.setDate(prevDay.getDate() - 1);
  const prevKey = dateKey(prevDay);
  let totalMin = 0;

  // Yesterday's Night sleeps starting >= 19:00
  (data.sleeps[prevKey] || []).filter(s => s.type === 'Night' && s.start >= '19:00').forEach(s => {
    const [sh, sm] = s.start.split(':').map(Number);
    let [eh, em] = s.end.split(':').map(Number);
    let endMin = eh * 60 + em;
    const startMin = sh * 60 + sm;
    if (endMin < startMin) endMin += 1440;
    totalMin += Math.min(endMin, 1440) - startMin; // cap at midnight
  });

  // Today's Night sleeps ending <= 07:00
  (data.sleeps[todayKey] || []).filter(s => s.type === 'Night' && s.end <= '07:00').forEach(s => {
    const [sh, sm] = s.start.split(':').map(Number);
    const [eh, em] = s.end.split(':').map(Number);
    totalMin += (eh * 60 + em) - (sh * 60 + sm);
  });

  if (!totalMin) {
    // Fallback: sum today's Night sleeps
    (data.sleeps[todayKey] || []).filter(s => s.type === 'Night').forEach(s => totalMin += parseDuration(s.duration));
  }
  if (!totalMin) return null;
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── DAILY NOTE ─────────────────────────────────────────
function saveDailyNote() {
  const key = dateKey(currentDate);
  data.dailyNotes[key] = document.getElementById('daily-note').value;
  saveData();
  showSyncStatus('synced');
}

function renderDailyNote() {
  const key = dateKey(currentDate);
  document.getElementById('daily-note').value = data.dailyNotes[key] || '';
}

// ── TABS ───────────────────────────────────────────────
function switchTab(tab, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  const tabEl = el || document.querySelector(`[data-tab="${tab}"]`);
  if (tabEl) tabEl.classList.add('active');
}

// ── SET DEFAULT DATES ──────────────────────────────────
function setDefaultDates() {
  const today = dateKey(new Date());
  const now = new Date().toTimeString().slice(0, 5);
  const ftEl = document.getElementById('feed-time');
  const ssEl = document.getElementById('sleep-start');
  const atEl = document.getElementById('activity-time');
  if (ftEl && !ftEl.value) ftEl.value = now;
  if (ssEl && !ssEl.value) ssEl.value = now;
  if (atEl && !atEl.value) atEl.value = now;
  const gdEl = document.getElementById('growth-date');
  const ndEl = document.getElementById('note-date');
  const mdEl = document.getElementById('milestone-date');
  if (gdEl) gdEl.value = today;
  if (ndEl) ndEl.value = today;
  if (mdEl) mdEl.value = today;
}

// Auto-refresh time fields every 30 seconds
setInterval(() => {
  const now = new Date().toTimeString().slice(0, 5);
  ['feed-time', 'sleep-start', 'activity-time'].forEach(id => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = now;
  });
}, 30000);

// ── START ──────────────────────────────────────────────
init();
setDefaultDates();
