// ── HELPERS ────────────────────────────────────────────
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate(d) { return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); }

function formatDateCn(d) { return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }); }

function getDayAge() { return Math.floor((new Date() - BIRTH_DATE) / 86400000); }

function formatAge(ageDays) {
  const totalMonths = Math.floor(ageDays / 30.44);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const remDays = ageDays - Math.floor(totalMonths * 30.44);
  if (years >= 1) return `${years}岁${months}个月`;
  if (totalMonths >= 3) return `${totalMonths}个月${remDays}天`;
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
    const mMatch = formatted.match(/^(\d+个月\d+)天$/);
    const yMatch = formatted.match(/^(\d+岁\d+)个月$/);
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
  const todayTag = document.getElementById('today-tag');
  if (todayTag) {
    const isToday = dateKey(currentDate) === dateKey(new Date());
    todayTag.style.display = isToday ? 'inline-flex' : 'none';
    todayTag.textContent = currentLang === 'en' ? 'Today' : '今天';
  }
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
  _aiInsightPending = false;
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

// ── TIMELINE VIEW ──────────────────────────────────────
let _timelineView = 'list';

function setTimelineView(view, btn) {
  _timelineView = view;
  document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTimeline();
}

// ── NOTE EXPAND ─────────────────────────────────────────
function toggleNoteExpand(id, btn) {
  const el = document.getElementById('note-cnt-' + id);
  if (!el) return;
  const expanded = el.classList.toggle('expanded');
  btn.textContent = expanded ? (currentLang === 'zh' ? '收起' : 'Collapse') : (currentLang === 'zh' ? '展开' : 'Expand');
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
  // Dream Feed at 19:00+ belongs to next day (night window)
  let targetKey = dateKey(currentDate);
  let isNextDay = false;
  if (type === 'Dream Feed' && time >= '19:00') {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    targetKey = dateKey(nextDay);
    isNextDay = true;
  }
  if (!data.feeds[targetKey]) data.feeds[targetKey] = [];
  data.feeds[targetKey].push({ time, amount, type, id: Date.now() });
  data.feeds[targetKey].sort((a, b) => a.time.localeCompare(b.time));
  document.getElementById('feed-amount').value = '';
  document.getElementById('feed-time').value = new Date().toTimeString().slice(0, 5);
  saveData();
  if (isNextDay) {
    const hint = document.getElementById('dream-feed-hint');
    if (hint) { hint.textContent = `⟳ 已归入 ${targetKey}（次日夜间记录）`; hint.style.display = 'block'; setTimeout(() => { hint.style.display = 'none'; }, 3500); }
  }
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
  const nowTime = new Date().toTimeString().slice(0, 5);
  document.getElementById('sleep-start').value = nowTime;
  document.getElementById('sleep-end').value = '';
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
  document.getElementById('activity-time').value = new Date().toTimeString().slice(0, 5);
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

// ── MINI CALENDAR MODAL ────────────────────────────────
let calModalYear, calModalMonth;

function openCalModal() {
  const d = new Date();
  calModalYear = d.getFullYear();
  calModalMonth = d.getMonth();
  renderCalModal();
  document.getElementById('cal-modal').classList.add('open');
}

function closeCalModal() {
  document.getElementById('cal-modal').classList.remove('open');
}

function calModalNav(dir) {
  calModalMonth += dir;
  if (calModalMonth < 0) { calModalMonth = 11; calModalYear--; }
  if (calModalMonth > 11) { calModalMonth = 0; calModalYear++; }
  renderCalModal();
}

function renderCalModal() {
  document.getElementById('cal-modal-title').textContent = `${calModalYear}年${calModalMonth + 1}月`;
  const grid = document.getElementById('cal-modal-grid');
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = dateKey(today);
  const firstDay = new Date(calModalYear, calModalMonth, 1).getDay();
  const daysInMonth = new Date(calModalYear, calModalMonth + 1, 0).getDate();
  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-modal-day empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${calModalYear}-${String(calModalMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = ds === todayStr;
    const hasData = !!(
      (data.feeds[ds] && data.feeds[ds].length) ||
      (data.sleeps[ds] && data.sleeps[ds].length) ||
      (data.activities[ds] && data.activities[ds].length)
    );
    html += `<div class="cal-modal-day${isToday?' today':''}${hasData?' has-data':''}" onclick="selectCalDay('${ds}')">${d}</div>`;
  }
  grid.innerHTML = html;
}

function selectCalDay(dateStr) {
  closeCalModal();
  currentDate = new Date(dateStr + 'T00:00:00');
  _aiInsightPending = false;
  updateDateDisplay();
  renderAll();
}

// ── NOTES HELPERS ──────────────────────────────────────
function toggleNoteForm() {
  const panel = document.getElementById('note-form-panel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function setNotesMonthFilter(month) {
  _notesMonthFilter = month;
  renderNotes();
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
