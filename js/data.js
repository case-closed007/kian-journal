// ── STATE ──────────────────────────────────────────────
let currentDate = new Date();
currentDate.setHours(0,0,0,0);

const STORAGE_KEY = 'kian_journal_v1';
const BIRTH_DATE = new Date('2025-12-02');

const DEFAULT_DATA = {
  feeds: {
    '2026-03-14': [
      { time: '00:25', amount: 210, type: 'Night Feed', id: 1 },
      { time: '05:25', amount: 210, type: 'Night Feed', id: 2 },
      { time: '10:30', amount: 165, type: 'Formula', id: 3 },
      { time: '14:16', amount: 170, type: 'Formula', id: 4 },
      { time: '18:05', amount: 180, type: 'Formula', id: 5 },
      { time: '23:40', amount: 210, type: 'Dream Feed', id: 6 },
    ],
    '2026-03-15': [
      { time: '05:45', amount: 120, type: 'Night Feed', id: 7 },
      { time: '09:15', amount: 130, type: 'Formula', id: 8 },
      { time: '11:40', amount: 150, type: 'Formula', id: 9 },
      { time: '15:50', amount: 210, type: 'Formula', id: 10 },
      { time: '18:05', amount: 180, type: 'Formula', id: 11 },
      { time: '23:40', amount: 210, type: 'Dream Feed', id: 12 },
    ],
    '2026-03-16': [
      { time: '05:45', amount: 120, type: 'Night Feed', id: 13 },
      { time: '08:20', amount: 150, type: 'Formula', id: 14 },
    ],
  },
  sleeps: {
    '2026-03-14': [
      { start: '11:30', end: '12:20', type: 'Nap', duration: '50m', id: 101 },
      { start: '14:50', end: '15:30', type: 'Nap', duration: '40m', id: 102 },
      { start: '17:00', end: '17:45', type: 'Catnap', duration: '45m', id: 103 },
      { start: '19:20', end: '23:59', type: 'Night', duration: '4h 39m', id: 104 },
    ],
    '2026-03-15': [
      { start: '09:45', end: '11:10', type: 'Nap', duration: '1h 25m', id: 105 },
      { start: '13:50', end: '15:00', type: 'Nap', duration: '1h 10m', id: 106 },
      { start: '16:30', end: '17:45', type: 'Catnap', duration: '1h 15m', id: 107 },
      { start: '19:00', end: '23:59', type: 'Night', duration: '4h 59m', id: 108 },
    ],
    '2026-03-16': [
      { start: '07:00', end: '08:45', type: 'Nap', duration: '1h 45m', id: 109 },
      { start: '09:50', end: '11:10', type: 'Nap', duration: '1h 20m', id: 110 },
    ],
  },
  activities: {
    '2026-03-14': [
      { time: '09:30', type: 'Play 玩耍', note: 'Mobile play, cooing and vocalizing · 看mobile，咿呀发声', id: 201 },
      { time: '16:00', type: 'Outing 外出', note: 'Walk in Flatiron area · 在Flatiron散步', id: 202 },
      { time: '18:15', type: 'Swimming 游泳', note: 'Bath swim with neck ring · 颈圈游泳', id: 203 },
    ],
    '2026-03-15': [
      { time: '10:30', type: 'Play 玩耍', note: 'Intentional grasping on gym bar! · 第一次有意识抓健身架！', id: 204 },
      { time: '12:50', type: 'Outing 外出', note: 'Brunch outing · 外出吃brunch', id: 205 },
      { time: '17:30', type: 'Play 玩耍', note: 'Tummy time with mirror · 趴着照镜子，想往前爬', id: 206 },
    ],
    '2026-03-16': [
      { time: '09:00', type: 'Play 玩耍', note: 'Mobile play, mirror interest · 看mobile，对镜子感兴趣', id: 207 },
    ],
  },
  dailyNotes: {
    '2026-03-14': 'First day tracking! Kian went for a walk in Flatiron — very happy and alert outside. First dream feed tonight. · 第一天记录！Kian去Flatiron散步，户外很开心活跃。今晚第一次dream feed。',
    '2026-03-15': 'Big milestone: intentional grasping on gym bar! Also trying to "crawl" toward mirror during tummy time. Dream feed working well — second sleep stretch was 6hrs+. · 重大里程碑：有意识抓健身架！趴着照镜子时想往前爬。Dream feed效果很好，第二段夜间睡了6小时以上。',
    '2026-03-16': 'Kian communicating more and more — gestures for pacifier and more milk. Makes a funny "哎" sound after sneezing. Very socially engaged today. · Kian越来越会表达——用肢体语言要奶嘴和奶。打喷嚏后会发出有趣的"哎"声。今天社交互动很积极。',
  },
  milestones: {
    achieved: [
      { title: "Social Smile", titleCn: "社交微笑", date: "2026-01-15", icon: "😊" },
      { title: "Holds Head Up During Tummy Time", titleCn: "俯卧时能抬头", date: "2026-01-20", icon: "💪" },
      { title: "Tracks Moving Objects", titleCn: "追视移动物体", date: "2026-01-28", icon: "👁️" },
      { title: "Vocalizing / Cooing", titleCn: "咿呀发声", date: "2026-02-01", icon: "🗣️" },
      { title: "Self-Soothing to Sleep", titleCn: "自主入睡", date: "2026-02-10", icon: "😴" },
      { title: "Interested in Mirror", titleCn: "对镜子感兴趣", date: "2026-03-10", icon: "🪞" },
      { title: "Communicates with Gestures", titleCn: "用肢体语言表达需求", date: "2026-03-14", icon: "🤲" },
      { title: "Intentional Grasping", titleCn: "有意识地抓握", date: "2026-03-15", icon: "✋" },
      { title: "First Dream Feed Success", titleCn: "第一次成功Dream Feed", date: "2026-03-15", icon: "🌙" },
    ]
  },
  growth: [
    { date: "2025-12-02", weight: 2.59, height: 47, head: null, note: "Birth · 出生 (37w+1d)" },
    { date: "2026-03-15", weight: 6.6, height: 60, head: null, note: "3 months · 3个月 (104 days)" },
  ],
  notes: [
    { date: '2026-03-16', category: '💡 Insight', content: 'Kian says "哎" after sneezing — startled by his own sneeze, then vocalizes. Also uses fake cough to get attention. Very communicative for 3 months. · Kian打喷嚏后说"哎"——被自己的喷嚏吓到了，然后发声。也会用假咳嗽吸引注意力。3个月能有这样的表达能力很厉害。', id: 301 },
    { date: '2026-03-15', category: '🌟 Observation', content: 'During tummy time, Kian actively tries to move toward the mirror — early goal-directed movement. Also intentionally grasped the gym bar handle. Bone structure already visible in profile shots — good nasal bridge definition. · 趴着的时候，Kian会主动尝试往镜子方向移动——早期目标导向行为。也有意识地抓了健身架把手。侧脸照片已经可以看出骨相——鼻梁轮廓很好。', id: 302 },
    { date: '2026-03-14', category: '❤️ Memory', content: 'Kian loves looking at mom and lights up every single time. When mom enters his field of view he smiles immediately and starts "talking." Today outside he was alert and happy the whole time. · Kian喜欢看妈妈，每次看到都会立刻发光。妈妈进入视野他马上笑并开始"说话"。今天外出全程都很警觉开心。', id: 303 },
  ],
  aiInsights: {}
};

// ── STORAGE ────────────────────────────────────────────
// Normalize all data arrays/keys after any load (Firebase converts arrays→objects)
function _normalizeData() {
  const toArr = v => Array.isArray(v) ? v : (v ? Object.values(v) : []);
  // Sanitize aiInsights dot keys — update IN MEMORY so localStorage stays clean too
  if (data.aiInsights) {
    const clean = {};
    Object.keys(data.aiInsights).forEach(k => { clean[k.replace(/\./g,'_')] = data.aiInsights[k]; });
    data.aiInsights = clean;
  }
  // Normalize array fields that Firebase may return as objects
  if (data.milestones && data.milestones.achieved) data.milestones.achieved = toArr(data.milestones.achieved);
  if (data.growth) data.growth = toArr(data.growth);
  if (data.notes) data.notes = toArr(data.notes);
  ['feeds','sleeps','activities'].forEach(field => {
    Object.keys(data[field] || {}).forEach(k => {
      if (!Array.isArray(data[field][k])) data[field][k] = Object.values(data[field][k] || {});
    });
  });
}

function saveData() {
  _normalizeData(); // sanitize in-memory first (so localStorage is always clean)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
  if (window.firebaseReady) {
    showSyncStatus('syncing');
    window.fbSet('kian_data', {
      feeds: data.feeds, sleeps: data.sleeps, activities: data.activities,
      dailyNotes: data.dailyNotes, milestones: data.milestones,
      growth: data.growth, notes: data.notes, aiInsights: data.aiInsights
    }).then(() => showSyncStatus('synced')).catch(err => {
      console.warn('Firebase save failed:', err);
      showSyncStatus('offline');
    });
  }
}

function showSyncStatus(status) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  el.className = 'sync-status show ' + status;
  const msgs = { syncing: '☁️ Saving...', synced: '✅ Saved', offline: '⚠️ Offline' };
  el.textContent = msgs[status] || '';
  clearTimeout(window._syncTimer);
  if (status === 'synced') window._syncTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { Object.assign(data, JSON.parse(saved)); _normalizeData(); return true; }
  } catch(e) {}
  return false;
}

function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(data, JSON.parse(JSON.stringify(DEFAULT_DATA)));
  saveData();
  renderAll();
}

function openSettings() {
  if (confirm('Reset all data to defaults?\n确定要重置所有数据吗？')) resetData();
}

let data = JSON.parse(JSON.stringify(DEFAULT_DATA));

