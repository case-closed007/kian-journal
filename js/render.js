// ── MIXED TIMELINE ─────────────────────────────────────
function renderTimeline() {
  const key = dateKey(currentDate);
  let feeds = (data.feeds[key] || []).map(f => ({ sortTime: f.time, kind: 'feed', id: f.id, data: f }));
  let sleeps = (data.sleeps[key] || []).map(s => ({ sortTime: s.start, kind: 'sleep', id: s.id, data: s }));
  let acts = (data.activities[key] || []).map(a => ({ sortTime: a.time, kind: 'activity', id: a.id, data: a }));

  let all;
  if (_timelineFilter === 'feed') all = feeds;
  else if (_timelineFilter === 'sleep') all = sleeps;
  else if (_timelineFilter === 'activity') all = acts;
  else all = [...feeds, ...sleeps, ...acts];
  all.sort((a, b) => a.sortTime.localeCompare(b.sortTime));

  const el = document.getElementById('mixed-timeline');
  if (!el) return;

  if (!all.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">${t('empty-timeline')}</div></div>`;
    return;
  }

  el.innerHTML = all.map(entry => {
    const { kind, data: d } = entry;
    let inner = '';
    if (kind === 'feed') {
      const typeLabel = t('feed-type-' + d.type) || d.type;
      inner = `<div class="timeline-entry">
        <span class="timeline-emoji">🍼</span>
        <span class="timeline-time">${d.time}</span>
        <div class="timeline-body">
          <div class="timeline-main">${typeLabel}<span class="timeline-badge badge-feed">${d.amount}ml</span></div>
        </div>
      </div>
      <div class="tl-swipe-bg" onclick="deleteFeed('${key}', ${d.id})">🗑️</div>`;
    } else if (kind === 'sleep') {
      const typeLabel = t('sleep-type-' + d.type) || d.type;
      inner = `<div class="timeline-entry">
        <span class="timeline-emoji">😴</span>
        <span class="timeline-time">${d.start}</span>
        <div class="timeline-body">
          <div class="timeline-main">${typeLabel}<span class="timeline-badge badge-sleep">${d.duration}</span></div>
          <div class="timeline-sub">${d.start} → ${d.end}</div>
        </div>
      </div>
      <div class="tl-swipe-bg" onclick="deleteSleep('${key}', ${d.id})">🗑️</div>`;
    } else {
      const actLabel = t('activity-type-' + d.type) || d.type;
      inner = `<div class="timeline-entry">
        <span class="timeline-emoji">🎯</span>
        <span class="timeline-time">${d.time}</span>
        <div class="timeline-body">
          <div class="timeline-main">${actLabel}</div>
          ${d.note ? `<div class="timeline-sub">${d.note}</div>` : ''}
        </div>
      </div>
      <div class="tl-swipe-bg" onclick="${kind === 'activity' ? `deleteActivity('${key}', ${d.id})` : ''}">🗑️</div>`;
    }
    return `<div class="tl-wrap" data-id="${d.id}">${inner}</div>`;
  }).join('');

  // Attach swipe-to-delete touch handlers
  el.querySelectorAll('.tl-wrap').forEach(wrap => {
    let startX = 0, isDragging = false;
    const entry = wrap.querySelector('.timeline-entry');
    wrap.addEventListener('touchstart', e => { startX = e.touches[0].clientX; isDragging = true; }, { passive: true });
    wrap.addEventListener('touchmove', e => {
      if (!isDragging) return;
      const dx = e.touches[0].clientX - startX;
      if (dx < 0) entry.style.transform = `translateX(${Math.max(dx, -72)}px)`;
    }, { passive: true });
    wrap.addEventListener('touchend', e => {
      isDragging = false;
      const dx = e.changedTouches[0].clientX - startX;
      if (dx < -40) {
        entry.style.transform = 'translateX(-72px)';
      } else {
        entry.style.transform = '';
      }
    });
  });
}

// ── SUMMARY ────────────────────────────────────────────
function renderDailySummary() {
  const key = dateKey(currentDate);
  const feeds = data.feeds[key] || [];
  const sleeps = data.sleeps[key] || [];
  const total = feeds.reduce((s, f) => s + f.amount, 0);
  const naps = sleeps.filter(s => s.type === 'Nap' || s.type === 'Catnap').length;
  const unit = t('count-unit');
  const nightStr = calcNightSleepSpan();

  document.getElementById('total-feed').innerHTML = total ? `${total}<span class="summary-unit">ml</span>` : `—<span class="summary-unit">ml</span>`;
  document.getElementById('total-feeds-count').innerHTML = feeds.length ? `${feeds.length}<span class="summary-unit">${unit}</span>` : `—<span class="summary-unit">${unit}</span>`;
  document.getElementById('total-naps').innerHTML = naps ? `${naps}<span class="summary-unit">${unit}</span>` : `—<span class="summary-unit">${unit}</span>`;
  document.getElementById('night-sleep').innerHTML = nightStr ? `${nightStr}<span class="summary-unit"></span>` : `—<span class="summary-unit">hrs</span>`;

  // Goal texts
  const goalFeed = document.getElementById('goal-feed');
  const goalNaps = document.getElementById('goal-naps');
  if (goalFeed) goalFeed.textContent = currentLang === 'zh' ? '目标 700–900ml' : 'Target 700–900ml';
  if (goalNaps) goalNaps.textContent = currentLang === 'zh' ? '参考 3–5小时' : 'Ref. 3–5 hrs';
}

// ── PREDICTIONS ────────────────────────────────────────
function renderPredictions() {
  const key = dateKey(currentDate);
  const today = new Date(); today.setHours(0,0,0,0);
  const isToday = currentDate.getTime() === today.getTime();
  const predRow = document.getElementById('pred-cards-row');
  if (!predRow) return;

  // Only show predictions for today
  if (!isToday) { predRow.style.display = 'none'; return; }

  const todayFeeds = (data.feeds[key] || []).slice().sort((a, b) => a.time.localeCompare(b.time));
  const todaySleeps = (data.sleeps[key] || []).filter(s => s.type !== 'Night').slice().sort((a, b) => a.start.localeCompare(b.start));
  const feedCard = document.getElementById('pred-feed-card');
  const sleepCard = document.getElementById('pred-sleep-card');
  const feedTimeEl = document.getElementById('pred-feed-time');
  const sleepTimeEl = document.getElementById('pred-sleep-time');
  let hasPred = false;

  if (todayFeeds.length >= 1) {
    let avgInterval = 180;
    if (todayFeeds.length >= 2) {
      const intervals = [];
      for (let i = 1; i < todayFeeds.length; i++) {
        const [h1, m1] = todayFeeds[i-1].time.split(':').map(Number);
        const [h2, m2] = todayFeeds[i].time.split(':').map(Number);
        const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff > 0) intervals.push(diff);
      }
      if (intervals.length) avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
    }
    const last = todayFeeds[todayFeeds.length - 1];
    const [lh, lm] = last.time.split(':').map(Number);
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    let nextMin = lh * 60 + lm + avgInterval;
    while (nextMin <= nowMin) nextMin += avgInterval;
    const w = nextMin % (24 * 60);
    feedTimeEl.textContent = String(Math.floor(w / 60)).padStart(2, '0') + ':' + String(w % 60).padStart(2, '0');
    feedCard.style.display = 'flex';
    hasPred = true;
  } else { feedCard.style.display = 'none'; }

  if (todaySleeps.length >= 1) {
    const last = todaySleeps[todaySleeps.length - 1];
    const [lh, lm] = last.end.split(':').map(Number);
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    let nextMin = lh * 60 + lm + 105;
    while (nextMin <= nowMin) nextMin += 105;
    const w = nextMin % (24 * 60);
    sleepTimeEl.textContent = '~' + String(Math.floor(w / 60)).padStart(2, '0') + ':' + String(w % 60).padStart(2, '0');
    sleepCard.style.display = 'flex';
    hasPred = true;
  } else { sleepCard.style.display = 'none'; }

  predRow.style.display = hasPred ? 'flex' : 'none';
}

// ── MILESTONES ─────────────────────────────────────────
const upcomingMilestones = [
  { title: "Laughs Out Loud", titleCn: "大声笑出来", icon: "😂", eta: "4 months · 4个月" },
  { title: "Recognizes Own Name", titleCn: "对自己名字有反应", icon: "👂", eta: "5-6 months · 5-6个月" },
  { title: "Babbling (ba, ma, da)", titleCn: "开始发辅音", icon: "🗣️", eta: "4-6 months · 4-6个月" },
  { title: "Stranger Anxiety", titleCn: "认生期", icon: "😬", eta: "6-8 months · 6-8个月" },
  { title: "Sitting with Support", titleCn: "辅助坐立", icon: "🪑", eta: "4-6 months · 4-6个月" },
  { title: "First Words (mama/baba)", titleCn: "有意义叫妈妈/爸爸", icon: "💬", eta: "7-10 months · 7-10个月" },
];

function addMilestone() {
  const title = document.getElementById('milestone-title').value;
  const titleCn = document.getElementById('milestone-title-cn').value;
  const date = document.getElementById('milestone-date').value;
  if (!title || !date) return;
  data.milestones.achieved.push({ title, titleCn, date, icon: "⭐" });
  data.milestones.achieved.sort((a, b) => a.date.localeCompare(b.date));
  document.getElementById('milestone-title').value = '';
  document.getElementById('milestone-title-cn').value = '';
  saveData();
  renderMilestones();
}

function deleteMilestone(idx) {
  data.milestones.achieved.splice(idx, 1);
  saveData();
  renderMilestones();
}

function renderMilestones() {
  const achievedBadge = t('milestone-badge-achieved');
  const upcomingBadge = t('milestone-badge-upcoming');
  const el = document.getElementById('achieved-milestones');
  el.innerHTML = data.milestones.achieved.map((m, i) => `
    <div class="milestone-item">
      <div class="milestone-icon">${m.icon}</div>
      <div class="milestone-content">
        <div class="milestone-title">${m.title}</div>
        ${m.titleCn ? `<div class="milestone-title-cn">${m.titleCn}</div>` : ''}
        <div class="milestone-date">📅 ${m.date}</div>
        <span class="milestone-badge badge-achieved">✅ ${achievedBadge}</span>
      </div>
      <button class="btn-delete" onclick="deleteMilestone(${i})">×</button>
    </div>
  `).join('');

  const upEl = document.getElementById('upcoming-milestones');
  upEl.innerHTML = upcomingMilestones.map(m => `
    <div class="milestone-item">
      <div class="milestone-icon">${m.icon}</div>
      <div class="milestone-content">
        <div class="milestone-title">${m.title}</div>
        <div class="milestone-title-cn">${m.titleCn}</div>
        <div class="milestone-date">⏰ ${m.eta}</div>
        <span class="milestone-badge badge-upcoming">⏰ ${upcomingBadge}</span>
      </div>
    </div>
  `).join('');
}

// ── GROWTH ─────────────────────────────────────────────
function addGrowth() {
  const date = document.getElementById('growth-date').value;
  const weight = parseFloat(document.getElementById('growth-weight').value);
  const height = parseFloat(document.getElementById('growth-height').value);
  const head = parseFloat(document.getElementById('growth-head').value);
  if (!date) return;
  data.growth.push({ date, weight: weight || null, height: height || null, head: head || null });
  data.growth.sort((a, b) => a.date.localeCompare(b.date));
  document.getElementById('growth-weight').value = '';
  document.getElementById('growth-height').value = '';
  document.getElementById('growth-head').value = '';
  saveData();
  renderGrowthHistory();
}

function renderGrowthHistory() {
  const el = document.getElementById('growth-history');
  if (!data.growth.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📏</div><div class="empty-text">No measurements yet</div></div>';
    return;
  }
  el.innerHTML = [...data.growth].reverse().map(g => `
    <div class="growth-entry">
      <span class="growth-date">${g.date}${g.note ? ' · ' + g.note : ''}</span>
      <span class="growth-data">
        ${g.weight ? `⚖️ ${g.weight}kg` : ''}
        ${g.height ? `📏 ${g.height}cm` : ''}
        ${g.head ? `⭕ ${g.head}cm` : ''}
      </span>
    </div>
  `).join('');
}

// ── WEEKLY ─────────────────────────────────────────────
function renderWeekly() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0,0,0,0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  let totalFeeds = 0, totalAmount = 0, feedDays = 0, weeklyObs = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = dateKey(d);
    const feeds = data.feeds[key] || [];
    if (feeds.length) {
      feedDays++;
      totalFeeds += feeds.length;
      totalAmount += feeds.reduce((s, f) => s + f.amount, 0);
    }
    const note = data.dailyNotes[key];
    if (note) weeklyObs.push({ date: key, note });
  }

  const avgDailyAmount = feedDays ? Math.round(totalAmount / feedDays) : 0;
  const avgFeedsPerDay = feedDays ? Math.round(totalFeeds / feedDays) : 0;

  const el = document.getElementById('weekly-content');
  el.innerHTML = `
    <div class="week-summary-card">
      <div class="week-title">This Week · 本周</div>
      <div class="week-dates">${weekStart.toLocaleDateString('en-US', {month:'short',day:'numeric'})} – ${weekEnd.toLocaleDateString('en-US', {month:'short',day:'numeric'})}</div>
      <div class="week-stats">
        <div class="week-stat">
          <div class="week-stat-value">${avgDailyAmount || '—'}</div>
          <div class="week-stat-label">Avg ml/day</div>
        </div>
        <div class="week-stat">
          <div class="week-stat-value">${avgFeedsPerDay || '—'}</div>
          <div class="week-stat-label">Feeds/day</div>
        </div>
        <div class="week-stat">
          <div class="week-stat-value">${feedDays}</div>
          <div class="week-stat-label">Days logged</div>
        </div>
      </div>
      ${weeklyObs.length ? `<div class="week-insight"><strong>Notes this week:</strong><br>${weeklyObs.map(o => `<br><em>${o.date}:</em> ${o.note}`).join('')}</div>` : '<div class="week-insight">Add daily notes to see your weekly journal here.</div>'}
    </div>
    <div class="insight-box">
      <div class="insight-title">💡 Weekly Insight</div>
      <div class="insight-text">${avgDailyAmount >= 700 && avgDailyAmount <= 950 ? "Kian's feeding volume is in the ideal range this week!" : avgDailyAmount > 0 ? "Consider tracking more consistently for better insights." : "Start logging feeds to see weekly insights."}</div>
    </div>
  `;
}

// ── NOTES ──────────────────────────────────────────────
function addNote() {
  const date = document.getElementById('note-date').value;
  const category = document.getElementById('note-category').value;
  const content = document.getElementById('note-content').value;
  if (!content) return;
  data.notes.unshift({ date: date || dateKey(currentDate), category, content, id: Date.now() });
  document.getElementById('note-content').value = '';
  saveData();
  renderNotes();
}

function deleteNote(id) {
  data.notes = data.notes.filter(n => n.id !== id);
  saveData();
  renderNotes();
}

function renderNotes() {
  const el = document.getElementById('notes-list');
  if (!data.notes.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">No notes yet · 还没有备注</div></div>';
    return;
  }
  el.innerHTML = data.notes.map(n => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--charcoal)">${n.category}</div>
          <div style="font-size:11px;color:var(--light);margin-top:2px">${n.date}</div>
        </div>
        <button class="btn-delete" onclick="deleteNote(${n.id})">×</button>
      </div>
      <div style="font-size:14px;color:var(--mid);line-height:1.7">${n.content}</div>
    </div>
  `).join('');
}

// ── CALENDAR ───────────────────────────────────────────
var calYear = new Date().getFullYear();
var calMonth = new Date().getMonth();

function changeCalMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function renderCalendar() {
  var mN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var mC = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  var titleEl = document.getElementById('cal-month-title');
  var cnEl = document.getElementById('cal-month-cn');
  if (!titleEl) return;
  titleEl.textContent = mN[calMonth] + ' ' + calYear;
  cnEl.textContent = calYear + '年 ' + mC[calMonth];
  var today = new Date(); today.setHours(0,0,0,0);
  var firstDay = new Date(calYear, calMonth, 1);
  var lastDay = new Date(calYear, calMonth + 1, 0);
  var startDow = firstDay.getDay();
  var mDates = new Set(data.milestones.achieved.map(m => m.date));
  var html = '';
  for (var i = 0; i < startDow; i++) {
    var pd = new Date(calYear, calMonth, -startDow + i + 1);
    html += '<div class="cal-day other-month"><div class="cal-day-num">' + pd.getDate() + '</div></div>';
  }
  for (var d = 1; d <= lastDay.getDate(); d++) {
    var td = new Date(calYear, calMonth, d);
    var key = dateKey(td);
    var feeds = data.feeds[key] || [];
    var slps = data.sleeps[key] || [];
    var totalMl = feeds.reduce((s, f) => s + f.amount, 0);
    var naps = slps.filter(s => s.type === 'Nap' || s.type === 'Catnap').length;
    var hasData = feeds.length > 0 || slps.length > 0;
    var isToday = td.getTime() === today.getTime();
    var isSel = dateKey(currentDate) === key;
    var hasMile = mDates.has(key);
    var cls = 'cal-day' + (hasData ? ' has-data' : '') + (isToday ? ' is-today' : '') + (isSel ? ' is-selected' : '');
    var info = (totalMl ? 'Feed:' + totalMl + 'ml' : '') + (naps ? (totalMl ? '<br>' : '') + 'Naps:' + naps : '');
    html += '<div class="' + cls + '" onclick="jumpToDate(\'' + key + '\')">' +
      (hasMile ? '<div class="cal-milestone-dot">⭐</div>' : '') +
      '<div class="cal-day-num">' + d + '</div>' +
      '<div class="cal-day-info">' + info + '</div></div>';
  }
  var rem = (7 - (startDow + lastDay.getDate()) % 7) % 7;
  for (var j = 1; j <= rem; j++) html += '<div class="cal-day other-month"><div class="cal-day-num">' + j + '</div></div>';
  document.getElementById('cal-days').innerHTML = html;
}

function jumpToDate(key) {
  currentDate = new Date(key + 'T00:00:00');
  updateDateDisplay();
  renderAll();
  switchTab('daily');
}

