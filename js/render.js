// ── MIXED TIMELINE ─────────────────────────────────────
function renderTimeline() {
  const listEl = document.getElementById('mixed-timeline');
  const dayEl = document.getElementById('day-view-container');
  if (_timelineView === 'day') {
    if (listEl) listEl.style.display = 'none';
    if (dayEl) dayEl.style.display = 'block';
    renderDayView();
    return;
  }
  if (listEl) listEl.style.display = '';
  if (dayEl) dayEl.style.display = 'none';

  const key = dateKey(currentDate);

  // Night feeds/sleeps (19:00-23:59) belong to the previous night window.
  // Subtract 1440 from their minutes so they sort BELOW all daytime entries.
  function toSortMin(timeStr, isNightType) {
    const [h, m] = timeStr.split(':').map(Number);
    const mins = h * 60 + m;
    return (isNightType && mins >= 19 * 60) ? mins - 1440 : mins;
  }

  let feeds = (data.feeds[key] || []).map(f => ({
    sortMin: toSortMin(f.time, f.type === 'Dream Feed' || f.type === 'Night Feed'),
    sortTime: f.time, kind: 'feed', id: f.id, data: f
  }));
  let sleeps = (data.sleeps[key] || []).map(s => ({
    sortMin: toSortMin(s.start, s.type === 'Night'),
    sortTime: s.start, kind: 'sleep', id: s.id, data: s
  }));
  let acts = (data.activities[key] || []).map(a => ({
    sortMin: toSortMin(a.time, false),
    sortTime: a.time, kind: 'activity', id: a.id, data: a
  }));

  let all;
  if (_timelineFilter === 'feed') all = feeds;
  else if (_timelineFilter === 'sleep') all = sleeps;
  else if (_timelineFilter === 'activity') all = acts;
  else all = [...feeds, ...sleeps, ...acts];
  all.sort((a, b) => b.sortMin - a.sortMin); // newest first; night feeds (negative) at bottom

  if (!listEl) return;

  if (!all.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">${t('empty-timeline')}</div></div>`;
    return;
  }

  listEl.innerHTML = '<div class="vtl-list">' + all.map((entry, idx) => {
    const { kind, data: d } = entry;
    const isLast = idx === all.length - 1;
    const hour = parseInt(entry.sortTime.split(':')[0]);
    const isNight = hour < 7 || hour >= 19;
    const entryBg = isNight ? 'vtl-entry-night' : 'vtl-entry-day';
    let timeStr, mainHtml, subHtml, deleteCall;
    if (kind === 'feed') {
      timeStr = d.time;
      const lbl = t('feed-type-' + d.type) || d.type;
      mainHtml = `<span class="vtl-type">${lbl}</span><span class="vtl-detail"> · ${d.amount}ml</span>`;
      subHtml = '';
      deleteCall = `deleteFeed('${key}', ${d.id})`;
    } else if (kind === 'sleep') {
      timeStr = d.start;
      const lbl = t('sleep-type-' + d.type) || d.type;
      const durStr = (d.duration && d.duration !== 'undefined') ? d.duration : (currentLang === 'zh' ? '进行中' : 'Ongoing');
      mainHtml = `<span class="vtl-type">${lbl}</span><span class="vtl-detail"> · ${durStr}</span>`;
      subHtml = `${d.start} → ${d.end || '?'}`;
      deleteCall = `deleteSleep('${key}', ${d.id})`;
    } else {
      timeStr = d.time;
      const lbl = t('activity-type-' + d.type) || d.type;
      mainHtml = `<span class="vtl-type">${lbl}</span>`;
      subHtml = d.note || '';
      deleteCall = `deleteActivity('${key}', ${d.id})`;
    }
    const dotIcons = {
      feed:     `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c9547a" stroke-width="1.8" stroke-linecap="round"><path d="M9 2v6l-2 4v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-8l-2-4V2"/><line x1="9" y1="2" x2="15" y2="2"/></svg>`,
      sleep:    `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c5cbf" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
      activity: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2a9d8f" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/></svg>`
    };
    return `<div class="vtl-entry ${entryBg}" data-id="${d.id}" data-kind="${kind}">
      <div class="vtl-time">${timeStr}</div>
      <div class="vtl-rail">
        <div class="vtl-dot">${dotIcons[kind] || ''}</div>
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
  listEl.querySelectorAll('.vtl-entry').forEach(entry => {
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

// ── DAY VIEW ───────────────────────────────────────────
function renderDayView() {
  const key = dateKey(currentDate);
  const toArr = v => Array.isArray(v) ? v : (v ? Object.values(v) : []);
  const feeds = toArr(data.feeds[key]);
  const sleeps = toArr(data.sleeps[key]);
  const acts = toArr(data.activities[key]);
  const el = document.getElementById('day-view-container');
  if (!el) return;

  function toPx(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m; // 1px per minute
  }

  const bgBands = `
    <div class="dv-band dv-band-night" style="top:0;height:420px"></div>
    <div class="dv-band dv-band-day" style="top:420px;height:720px"></div>
    <div class="dv-band dv-band-night" style="top:1140px;height:300px"></div>`;

  let hours = '';
  for (let h = 0; h < 24; h++) {
    hours += `<div class="dv-hour-label" style="top:${h*60}px">${String(h).padStart(2,'0')}:00</div>
              <div class="dv-hour-line" style="top:${h*60}px"></div>`;
  }

  let events = '';
  sleeps.forEach(s => {
    const top = toPx(s.start);
    const endPx = toPx(s.end);
    const height = Math.max(20, endPx > top ? endPx - top : endPx + 1440 - top);
    const lbl = t('sleep-type-' + s.type) || s.type;
    events += `<div class="dv-event dv-event-sleep" style="top:${top}px;height:${Math.min(height, 1440 - top)}px" title="${lbl} ${s.start}–${s.end}">
      <span class="dv-event-label">😴 ${lbl}${s.duration ? ' · ' + s.duration : ''}</span></div>`;
  });
  feeds.forEach(f => {
    const top = toPx(f.time);
    const lbl = t('feed-type-' + f.type) || f.type;
    events += `<div class="dv-event dv-event-feed" style="top:${top}px;height:20px" title="${lbl} ${f.amount}ml">
      <span class="dv-event-label">🍼 ${f.amount}ml</span></div>`;
  });
  acts.forEach(a => {
    const top = toPx(a.time);
    const lbl = t('activity-type-' + a.type) || a.type;
    events += `<div class="dv-event dv-event-activity" style="top:${top}px;height:40px" title="${lbl}">
      <span class="dv-event-label">🎯 ${lbl}</span></div>`;
  });

  el.innerHTML = `<div class="dv-scroll"><div class="dv-inner">${bgBands}<div class="dv-rail"></div>${hours}${events}</div></div>`;

  const scrollEl = el.querySelector('.dv-scroll');
  if (scrollEl) {
    const isToday = key === dateKey(new Date());
    const scrollTo = isToday ? Math.max(0, new Date().getHours() * 60 + new Date().getMinutes() - 60) : 7 * 60 - 30;
    setTimeout(() => { scrollEl.scrollTop = scrollTo; }, 50);
  }
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

  // Exclude Dream Feed / Night Feed from prediction (distorts daytime interval)
  const todayFeeds = (data.feeds[key] || [])
    .filter(f => f.type !== 'Dream Feed' && f.type !== 'Night Feed' && f.time < '19:00')
    .slice().sort((a, b) => a.time.localeCompare(b.time));
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
  if (!el) return;
  // Defensive: Firebase may return array as object
  const toArr = v => Array.isArray(v) ? v : (v ? Object.values(v) : []);
  const achieved = toArr(data.milestones && data.milestones.achieved);
  if (!achieved.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🌟</div><div class="empty-text">还没有达成的里程碑</div></div>';
  } else {
    el.innerHTML = achieved.map((m, i) => `
      <div class="ms-card">
        <button class="ms-card-delete" onclick="deleteMilestone(${i})">×</button>
        <div class="ms-card-emoji">${m.icon}</div>
        <div class="ms-card-en">${m.title}</div>
        ${m.titleCn ? `<div class="ms-card-cn">${m.titleCn}</div>` : ''}
        <div class="ms-card-date">${m.date}</div>
      </div>
    `).join('');
  }

  const upEl = document.getElementById('upcoming-milestones');
  upEl.innerHTML = '<div class="ms-card-wall">' + upcomingMilestones.map(m => `
    <div class="ms-card ms-card-upcoming">
      <div class="ms-card-emoji">${m.icon}</div>
      <div class="ms-card-en">${currentLang === 'en' ? m.title : m.titleCn}</div>
      ${currentLang === 'zh' ? `<div class="ms-card-cn">${m.title}</div>` : ''}
      <div class="ms-upcoming-eta">⏰ ${m.eta}</div>
    </div>
  `).join('') + '</div>';

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
  const wLabel = currentLang === 'zh' ? '体重' : 'Weight';
  const hLabel = currentLang === 'zh' ? '身高' : 'Height';
  const hdLabel = currentLang === 'zh' ? '头围' : 'Head';
  // WHO ranges lookup (p3–p97)
  const whoKeys = Object.keys(WHO_W).map(Number).sort((a,b)=>a-b);
  function getAgeKey(months) {
    let k = whoKeys[0];
    for (const wk of whoKeys) { if (wk <= months) k = wk; }
    return k;
  }
  el.innerHTML = [...data.growth].reverse().map(g => {
    const entryDate = new Date(g.date);
    const ageMonths = Math.floor((entryDate - BIRTH_DATE) / (30.44 * 86400000));
    const ageDays = Math.round((entryDate - BIRTH_DATE) / 86400000);
    const ageKey = getAgeKey(ageMonths);
    const wRef = `${WHO_W[ageKey][0]}–${WHO_W[ageKey][4]}`;
    const hRef = `${WHO_H[ageKey][0]}–${WHO_H[ageKey][4]}`;
    const ageLabel = ageMonths > 0
      ? `${ageMonths}${currentLang === 'zh' ? '个月' : 'mo'}`
      : `${ageDays}${currentLang === 'zh' ? '天' : 'd'}`;
    const wPct = g.weight ? whoPercentile(g.weight, WHO_W, ageMonths) : null;
    const hPct = g.height ? whoPercentile(g.height, WHO_H, ageMonths) : null;
    const metrics = [];
    if (g.weight) metrics.push(`<div class="growth-metric">
      <span class="growth-metric-label">${wLabel}</span>
      <span class="growth-metric-value">${g.weight}<span class="growth-unit">kg</span>${wPct ? `<span class="growth-metric-pct">P${wPct}</span>` : ''}</span>
    </div>`);
    if (g.height) metrics.push(`<div class="growth-metric">
      <span class="growth-metric-label">${hLabel}</span>
      <span class="growth-metric-value">${g.height}<span class="growth-unit">cm</span>${hPct ? `<span class="growth-metric-pct">P${hPct}</span>` : ''}</span>
    </div>`);
    if (g.head) metrics.push(`<div class="growth-metric">
      <span class="growth-metric-label">${hdLabel}</span>
      <span class="growth-metric-value">${g.head}<span class="growth-unit">cm</span></span>
    </div>`);
    const whoRef = currentLang === 'zh'
      ? `WHO参考 · ${ageLabel}: 体重 ${wRef}kg · 身高 ${hRef}cm`
      : `WHO ref · ${ageLabel}: weight ${wRef}kg · height ${hRef}cm`;
    return `<div class="growth-entry">
      <div class="growth-date">${g.date}</div>
      <div class="growth-metrics-row">${metrics.join('')}</div>
      <div class="growth-who-ref">${whoRef}</div>
    </div>`;
  }).join('');

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
  el.innerHTML = notes.map(n => {
    const isLong = n.content.length > 60;
    return `
    <div class="note-tl-item">
      <div class="note-tl-left">
        <div class="note-tl-date">${n.date}</div>
        <div class="note-tl-cat">${(n.category || '').split(' ')[0]}</div>
      </div>
      <div class="note-tl-body">
        <div class="note-tl-content" id="note-cnt-${n.id}">${n.content}</div>
        ${isLong ? `<span class="note-expand-btn" onclick="toggleNoteExpand(${n.id}, this)">${currentLang === 'zh' ? '展开' : 'Expand'}</span>` : ''}
      </div>
      <button class="note-tl-delete" onclick="deleteNote(${n.id})">×</button>
    </div>`;
  }).join('');
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
    var hasData = feeds.length > 0 || slps.length > 0;
    var isToday = td.getTime() === today.getTime();
    var isSel = dateKey(currentDate) === key;
    var hasMile = mDates.has(key);
    var timeClass = isToday ? 'cal-today' : (td < today ? 'cal-past' : 'cal-future');
    var cls = 'cal-day ' + timeClass + (hasData ? ' has-data' : '') + (isToday ? ' is-today' : '') + (isSel ? ' is-selected' : '');
    html += '<div class="' + cls + '" onclick="jumpToDate(\'' + key + '\')">' +
      (hasMile ? '<div class="cal-milestone-dot">⭐</div>' : '') +
      '<span class="cal-day-num">' + d + '</span>' +
      (totalMl ? '<span class="cal-day-data">' + totalMl + 'ml</span>' : '') +
      '</div>';
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

