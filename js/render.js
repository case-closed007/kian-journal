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

  el.innerHTML = '<div class="vtl-list">' + all.map((entry, idx) => {
    const { kind, data: d } = entry;
    const isLast = idx === all.length - 1;
    const dotClass = kind === 'feed' ? 'vtl-dot-feed' : kind === 'sleep' ? 'vtl-dot-sleep' : 'vtl-dot-act';
    let timeStr, mainHtml, subHtml, deleteCall;
    if (kind === 'feed') {
      timeStr = d.time;
      const lbl = t('feed-type-' + d.type) || d.type;
      mainHtml = `🍼 <strong>${lbl}</strong>`;
      subHtml = `${d.amount}ml`;
      deleteCall = `deleteFeed('${key}', ${d.id})`;
    } else if (kind === 'sleep') {
      timeStr = d.start;
      const lbl = t('sleep-type-' + d.type) || d.type;
      mainHtml = `😴 <strong>${lbl}</strong>`;
      subHtml = `${d.start} → ${d.end} · ${d.duration}`;
      deleteCall = `deleteSleep('${key}', ${d.id})`;
    } else {
      timeStr = d.time;
      const lbl = t('activity-type-' + d.type) || d.type;
      mainHtml = `🎯 <strong>${lbl}</strong>`;
      subHtml = d.note || '';
      deleteCall = `deleteActivity('${key}', ${d.id})`;
    }
    return `<div class="vtl-entry" data-id="${d.id}" data-kind="${kind}">
      <div class="vtl-time">${timeStr}</div>
      <div class="vtl-rail">
        <div class="vtl-dot ${dotClass}"></div>
        ${!isLast ? '<div class="vtl-line"></div>' : ''}
      </div>
      <div class="vtl-content">
        <div class="vtl-main">${mainHtml}</div>
        ${subHtml ? `<div class="vtl-sub">${subHtml}</div>` : ''}
      </div>
      <button class="vtl-delete" onclick="${deleteCall}">×</button>
    </div>`;
  }).join('') + '</div>';

  // Swipe-to-delete on mobile
  el.querySelectorAll('.vtl-entry').forEach(entry => {
    let startX = 0;
    entry.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    entry.addEventListener('touchmove', e => {
      const dx = e.touches[0].clientX - startX;
      if (dx < 0) entry.style.transform = `translateX(${Math.max(dx, -64)}px)`;
    }, { passive: true });
    entry.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      entry.style.transform = dx < -40 ? 'translateX(-64px)' : '';
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
  const el = document.getElementById('achieved-milestones');
  if (!data.milestones.achieved.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🌟</div><div class="empty-text">还没有达成的里程碑</div></div>';
  } else {
    el.innerHTML = data.milestones.achieved.map((m, i) => `
      <div class="ms-card">
        <button class="ms-card-delete" onclick="deleteMilestone(${i})">×</button>
        <div class="ms-card-icon">${m.icon}</div>
        <div class="ms-card-title">${m.title}</div>
        ${m.titleCn ? `<div class="ms-card-cn">${m.titleCn}</div>` : ''}
        <div class="ms-card-date">${m.date}</div>
      </div>
    `).join('');
  }

  const upEl = document.getElementById('upcoming-milestones');
  upEl.innerHTML = upcomingMilestones.map(m => `
    <div class="ms-upcoming-item">
      <div class="ms-upcoming-icon">${m.icon}</div>
      <div class="ms-upcoming-body">
        <div class="ms-upcoming-title">${m.title}</div>
        <div class="ms-upcoming-cn">${m.titleCn}</div>
        <div class="ms-upcoming-eta">⏰ ${m.eta}</div>
      </div>
    </div>
  `).join('');

  // Load AI milestone insight
  renderMilestoneInsight();
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

// WHO Boys weight/height percentile tables [p3, p15, p50, p85, p97]
const WHO_W = {
  0:[2.5,2.9,3.3,3.9,4.3], 1:[3.4,3.9,4.5,5.1,5.7], 2:[4.4,5.0,5.6,6.3,7.0],
  3:[5.1,5.7,6.4,7.2,7.9], 4:[5.6,6.2,7.0,7.8,8.6], 5:[6.1,6.7,7.5,8.4,9.2],
  6:[6.4,7.1,7.9,8.9,9.7], 9:[7.1,8.0,9.0,10.1,11.0], 12:[7.7,8.6,9.6,10.8,11.8]
};
const WHO_H = {
  0:[46.1,48.0,49.9,51.8,53.7], 1:[50.8,52.8,54.7,56.7,58.6], 2:[54.4,56.4,58.4,60.4,62.4],
  3:[57.3,59.4,61.4,63.5,65.5], 4:[59.7,61.8,63.9,66.0,68.0], 5:[61.7,63.8,65.9,68.0,70.1],
  6:[63.3,65.5,67.6,69.8,71.9], 9:[68.0,70.1,72.3,74.5,76.5], 12:[71.7,73.9,76.1,78.3,80.5]
};

function whoPercentile(val, table, ageMonths) {
  const keys = Object.keys(table).map(Number).sort((a,b)=>a-b);
  let ageKey = keys[0];
  for (const k of keys) { if (k <= ageMonths) ageKey = k; }
  const [p3,p15,p50,p85,p97] = table[ageKey];
  if (val < p3) return '<3';
  if (val > p97) return '>97';
  const segs = [[p3,p15,3,15],[p15,p50,15,50],[p50,p85,50,85],[p85,p97,85,97]];
  for (const [lo,hi,plo,phi] of segs) {
    if (val >= lo && val <= hi) return Math.round(plo + (val-lo)/(hi-lo)*(phi-plo)) + '';
  }
  return '50';
}

function renderGrowthHistory() {
  const el = document.getElementById('growth-history');
  if (!data.growth.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📏</div><div class="empty-text">No measurements yet</div></div>';
    return;
  }
  const ageDays = Math.floor((new Date() - BIRTH_DATE) / 86400000);
  const ageMonths = Math.floor(ageDays / 30.44);
  el.innerHTML = [...data.growth].reverse().map(g => {
    const wPct = g.weight ? whoPercentile(g.weight, WHO_W, ageMonths) : null;
    const hPct = g.height ? whoPercentile(g.height, WHO_H, ageMonths) : null;
    return `<div class="growth-entry">
      <span class="growth-date">${g.date}</span>
      <span class="growth-data">
        ${g.weight ? `⚖️ ${g.weight}kg${wPct ? `<span class="growth-pct">P${wPct}</span>` : ''}` : ''}
        ${g.height ? `<br>📏 ${g.height}cm${hPct ? `<span class="growth-pct">P${hPct}</span>` : ''}` : ''}
        ${g.head ? `<br>⭕ ${g.head}cm` : ''}
      </span>
    </div>`;
  }).join('');

  // Show AI insight if there's data
  const latest = data.growth[data.growth.length - 1];
  if (latest) renderGrowthInsight(latest);
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

let _notesMonthFilter = null;

function renderNotes() {
  renderNotesMonthFilter();
  const el = document.getElementById('notes-list');
  let notes = data.notes;
  if (_notesMonthFilter !== null) {
    notes = notes.filter(n => {
      const noteDate = new Date(n.date + 'T00:00:00');
      const noteMonths = Math.floor((noteDate - BIRTH_DATE) / (86400000 * 30.44));
      return noteMonths === _notesMonthFilter;
    });
  }
  if (!notes.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">暂无备忘 · No notes</div></div>';
    return;
  }
  el.innerHTML = notes.map(n => `
    <div class="note-tl-item">
      <div class="note-tl-left">
        <div class="note-tl-date">${n.date}</div>
        <div class="note-tl-cat">${(n.category || '').split(' ')[0]}</div>
      </div>
      <div class="note-tl-body">
        <div class="note-tl-content" onclick="this.classList.toggle('expanded')">${n.content}</div>
      </div>
      <button class="note-tl-delete" onclick="deleteNote(${n.id})">×</button>
    </div>
  `).join('');
}

function renderNotesMonthFilter() {
  const el = document.getElementById('notes-month-filter');
  if (!el) return;
  const ageDays = Math.floor((new Date() - BIRTH_DATE) / 86400000);
  const totalMonths = Math.floor(ageDays / 30.44);
  let html = `<button class="notes-month-btn${_notesMonthFilter === null ? ' active' : ''}" onclick="setNotesMonthFilter(null)">全部</button>`;
  for (let m = 0; m <= totalMonths; m++) {
    html += `<button class="notes-month-btn${_notesMonthFilter === m ? ' active' : ''}" onclick="setNotesMonthFilter(${m})">${m}个月</button>`;
  }
  el.innerHTML = html;
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

