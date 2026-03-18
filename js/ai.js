// ── GEMINI AI CONFIG ────────────────────────────────────
const GEMINI_URL = 'https://kian-gemini-proxy.xinan400.workers.dev';

async function callGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
    })
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error('Gemini error ' + res.status + ': ' + (errBody?.error?.message || ''));
  }
  const json = await res.json();
  // gemini-2.5-flash may include thought parts; find actual text part
  const parts = json.candidates?.[0]?.content?.parts || [];
  return (parts.find(p => !p.thought) || parts[0])?.text || '';
}

// ── I18N ───────────────────────────────────────────────
let currentLang = 'zh';

const i18n = {
  zh: {
    'topbar-age-unit': '天',
    'tab-daily': '今日', 'tab-milestones': '里程碑', 'tab-growth': '成长', 'tab-notes': '笔记',
    'summary-title': '今日概览', 'label-total-feed': '总奶量', 'label-feedings': '喂奶次数', 'label-naps': '小觉', 'label-night': '夜间',
    'insight-title': '💡 今日观察',
    'timeline-title': '今日时间线', 'timeline-sub': '喂奶 · 睡眠 · 活动',
    'tab-btn-feed': '🍼 喂奶', 'tab-btn-sleep': '😴 睡眠', 'tab-btn-activity': '🎯 活动',
    'btn-add-feed': '+ 添加喂奶', 'btn-add-sleep': '+ 添加睡眠', 'btn-add-activity': '+ 添加活动',
    'daily-note-title': '今日备注', 'btn-save-note': '保存', 'btn-today': '今',
    'cal-header': '日历视图', 'milestone-header': '里程碑', 'milestone-achieved': '已达成', 'milestone-upcoming': '即将到来',
    'growth-header': '成长记录', 'growth-add': '添加数据', 'growth-date-label': '日期', 'growth-history': '成长历史',
    'notes-header': '日记备忘', 'notes-new': '新建备忘', 'btn-save-note2': '+ 保存备忘',
    'empty-timeline': '今日暂无记录，快来添加吧 ↑',
    'feed-type-Formula': '配方奶', 'feed-type-Dream Feed': '梦中喂', 'feed-type-Night Feed': '夜间喂',
    'sleep-type-Nap': '小觉', 'sleep-type-Night': '夜间', 'sleep-type-Catnap': '打盹',
    'activity-type-Tummy Time 趴趴时间': '趴趴时间', 'activity-type-Outing 外出': '外出',
    'activity-type-Swimming 游泳': '游泳', 'activity-type-Play 玩耍': '玩耍',
    'activity-type-Bath 洗澡': '洗澡', 'activity-type-Massage 抚触': '抚触',
    'count-unit': '次', 'feeds-unit': '次',
    'milestone-badge-achieved': '已达成', 'milestone-badge-upcoming': '即将到来',
    'ai-card-title': 'AI 快速录入', 'ai-card-sub': '用中文描述刚发生的事',
    'btn-ai-send': '✨ AI 解析并添加',
    'pred-feed-label': '下次喂奶', 'pred-sleep-label': '下次小觉',
  },
  en: {
    'topbar-age-unit': ' days',
    'tab-daily': 'Today', 'tab-milestones': 'Milestones', 'tab-growth': 'Growth', 'tab-notes': 'Notes',
    'summary-title': "Today's Overview", 'label-total-feed': 'Total Formula', 'label-feedings': 'Feedings', 'label-naps': 'Naps', 'label-night': 'Night Sleep',
    'insight-title': "💡 Today's Insight",
    'timeline-title': 'Daily Timeline', 'timeline-sub': 'Feeds · Sleep · Activities',
    'tab-btn-feed': '🍼 Feed', 'tab-btn-sleep': '😴 Sleep', 'tab-btn-activity': '🎯 Activity',
    'btn-add-feed': '+ Add Feed', 'btn-add-sleep': '+ Add Sleep', 'btn-add-activity': '+ Add Activity',
    'daily-note-title': 'Daily Note', 'btn-save-note': 'Save', 'btn-today': 'Now',
    'cal-header': 'Calendar View', 'milestone-header': 'Milestones', 'milestone-achieved': 'Achieved', 'milestone-upcoming': 'Coming Up',
    'growth-header': 'Growth Tracking', 'growth-add': 'Add Measurement', 'growth-date-label': 'Date', 'growth-history': 'Growth History',
    'notes-header': 'Journal Notes', 'notes-new': 'New Note', 'btn-save-note2': '+ Save Note',
    'empty-timeline': 'No entries today. Start logging! ↑',
    'feed-type-Formula': 'Formula', 'feed-type-Dream Feed': 'Dream Feed', 'feed-type-Night Feed': 'Night Feed',
    'sleep-type-Nap': 'Nap', 'sleep-type-Night': 'Night', 'sleep-type-Catnap': 'Catnap',
    'activity-type-Tummy Time 趴趴时间': 'Tummy Time', 'activity-type-Outing 外出': 'Outing',
    'activity-type-Swimming 游泳': 'Swimming', 'activity-type-Play 玩耍': 'Play',
    'activity-type-Bath 洗澡': 'Bath', 'activity-type-Massage 抚触': 'Massage',
    'count-unit': '', 'feeds-unit': 'x',
    'milestone-badge-achieved': 'Achieved', 'milestone-badge-upcoming': 'Coming Soon',
    'ai-card-title': 'AI Quick Log', 'ai-card-sub': 'Describe what just happened',
    'btn-ai-send': '✨ Parse & Add',
    'pred-feed-label': 'Next Feed', 'pred-sleep-label': 'Next Nap',
  }
};

function t(key) {
  return (i18n[currentLang] && i18n[currentLang][key] !== undefined) ? i18n[currentLang][key] : key;
}

function toggleLang() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  // Invalidate current date's insight so it regenerates in new language
  const key = dateKey(currentDate);
  const today = new Date(); today.setHours(0,0,0,0);
  const isToday = currentDate.getTime() === today.getTime();
  const slot = isToday ? getTimeSlot() : 'summary';
  const cacheKey = key + '_' + slot;
  if (data.aiInsights && data.aiInsights[cacheKey]) {
    delete data.aiInsights[cacheKey];
  }
  _aiInsightPending = false;
  applyLang();
  renderInsight();
}

function applyLang() {
  const btn = document.getElementById('lang-btn');
  if (btn) btn.textContent = currentLang === 'zh' ? 'EN' : '中';

  // Static elements
  const map = {
    'topbar-age-unit': 'topbar-age-unit',
    'tab-daily': 'tab-label-daily', 'tab-calendar': 'tab-label-calendar',
    'tab-milestones': 'tab-label-milestones', 'tab-growth': 'tab-label-growth', 'tab-notes': 'tab-label-notes',
    'summary-title': 'summary-title-text', 'label-total-feed': 'label-total-feed',
    'label-feedings': 'label-feedings', 'label-naps': 'label-naps', 'label-night': 'label-night',
    'insight-title': 'insight-title-text',
    'timeline-title': 'timeline-title-text', 'timeline-sub': 'timeline-sub-text',
    'tab-btn-feed': 'tab-btn-feed', 'tab-btn-sleep': 'tab-btn-sleep', 'tab-btn-activity': 'tab-btn-activity',
    'btn-add-feed': 'btn-add-feed', 'btn-add-sleep': 'btn-add-sleep', 'btn-add-activity': 'btn-add-activity',
    'daily-note-title': 'daily-note-title', 'btn-save-note': 'btn-save-note',
    'btn-today': 'btn-today',
    'cal-header': 'cal-header-text', 'milestone-header': 'milestone-header-text',
    'milestone-achieved': 'milestone-achieved-title', 'milestone-upcoming': 'milestone-upcoming-title',
    'growth-header': 'growth-header-text', 'growth-add': 'growth-add-title',
    'growth-date-label': 'growth-date-label', 'growth-history': 'growth-history-title',
    'notes-header': 'notes-header-text', 'notes-new': 'notes-new-title', 'btn-save-note2': 'btn-save-note2',
    'ai-card-title': 'ai-card-title', 'ai-card-sub': 'ai-card-sub', 'btn-ai-send': 'btn-ai-send',
    'pred-feed-label': 'pred-feed-label', 'pred-sleep-label': 'pred-sleep-label',
  };
  Object.entries(map).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });

  // Daily note placeholder
  const noteEl = document.getElementById('daily-note');
  if (noteEl) noteEl.placeholder = currentLang === 'zh' ? '今天怎么样？有没有观察到什么新的变化？' : "How was today? Any new things you noticed about Kian?";
  const noteContentEl = document.getElementById('note-content');
  if (noteContentEl) noteContentEl.placeholder = currentLang === 'zh' ? '在这里写下你的备忘...' : 'Write your note here...';

  // Re-render dynamic content
  renderTimeline();
  renderDailySummary();
  renderPredictions();
  renderInsight();
  renderMilestones();
}

// ── AI INSIGHT ─────────────────────────────────────────
let _aiInsightPending = false;

function getTimeSlot() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

function renderInsight() {
  const key = dateKey(currentDate);
  const el = document.getElementById('daily-insight');
  const textEl = document.getElementById('insight-text');
  if (!el || !textEl) return;

  const feeds = data.feeds[key] || [];
  const sleeps = data.sleeps[key] || [];
  const activities = data.activities[key] || [];
  if (!feeds.length && !sleeps.length && !activities.length) {
    el.style.display = 'none'; return;
  }

  const today = new Date(); today.setHours(0,0,0,0);
  const isToday = currentDate.getTime() === today.getTime();
  const slot = isToday ? getTimeSlot() : 'summary';
  const cacheKey = isToday ? key + '_' + slot : key + '_summary';

  if (data.aiInsights && data.aiInsights[cacheKey]) {
    const cached = data.aiInsights[cacheKey];
    el.style.display = 'block';
    textEl.innerHTML = renderInsightSlots(cached, slot);
    return;
  }

  if (_aiInsightPending) return;
  el.style.display = 'block';
  textEl.innerHTML = '<span class="insight-loading">✨ AI 正在分析…</span>';
  _generateAIInsight(key, cacheKey, slot, feeds, sleeps, activities, isToday);
}

function renderInsightSlots(cached, slot) {
  const lang = currentLang;
  const text = (cached[lang] || cached.zh || '').trim();
  if (!text) return '';
  return `<div class="insight-slot-text">${text.replace(/\n/g, '<br>')}</div>`;
}

async function _generateAIInsight(key, cacheKey, slot, feeds, sleeps, activities, isToday) {
  _aiInsightPending = true;
  try {
    const age = getDayAge();
    const total = feeds.reduce((s, f) => s + f.amount, 0);
    const naps = sleeps.filter(s => s.type === 'Nap' || s.type === 'Catnap').length;
    const nightSleep = sleeps.find(s => s.type === 'Night');
    const now = new Date().toTimeString().slice(0, 5);
    const feedSummary = feeds.map(f => `${f.time}: ${f.amount}ml (${f.type})`).join(', ') || 'none';
    const sleepSummary = sleeps.map(s => `${s.start}-${s.end} ${s.type} (${s.duration})`).join(', ') || 'none';
    const actSummary = activities.map(a => `${a.time} ${a.type}${a.note ? ': ' + a.note : ''}`).join(', ') || 'none';

    // Recent activities for suggestions
    const recentActs = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(currentDate); d.setDate(d.getDate() - i);
      const k = dateKey(d);
      (data.activities[k] || []).forEach(a => recentActs.push({ daysAgo: i, type: a.type }));
    }
    const lastSwim = recentActs.find(a => a.type.includes('Swimming'));
    const lastOuting = recentActs.find(a => a.type.includes('Outing'));

    let promptZh, promptEn;

    if (!isToday) {
      // Past date: warm diary-style summary
      promptZh = `你是Kian的成长日记助手。Kian（2025年12月2日出生，${age}天，约${Math.floor(age/30)}个月大）。
日期：${key}
当日数据：
- 喂奶：${feedSummary}｜共${total}ml（${feeds.length}次）
- 睡眠：${sleepSummary}｜小觉${naps}次${nightSleep ? '，夜间：'+nightSleep.duration : ''}
- 活动：${actSummary}

请用温暖的日记体写一段今日总结（3-4句），像在给宝宝写成长日记，包含喂养、睡眠、活动的完整回顾。用"今天"开头。每句话前加一个相关emoji。只输出中文版本。`;
      promptEn = `You are Kian's baby journal assistant. Kian (born 2025-12-02, age ${age} days, ~${Math.floor(age/30)} months).
Date: ${key}
Data: Feeds: ${feedSummary} | Total: ${total}ml (${feeds.length} feeds). Sleep: ${sleepSummary} | Naps: ${naps}${nightSleep ? ', Night: '+nightSleep.duration : ''}. Activities: ${actSummary}.
Write a warm 3-4 sentence diary entry summarizing the day (feeding, sleep, activities). Start with "Today". Each sentence starts with a relevant emoji. Output English only.`;
    } else if (slot === 'morning') {
      promptZh = `你是Kian的成长顾问。Kian（${age}天，约${Math.floor(age/30)}个月大）。当前时间：${now}。
今晨数据：喂奶${feedSummary}，睡眠${sleepSummary}
用宝宝第一人称口吻（"我..."）写2-3条发育洞察，分享Kian现在的发展特点和接下来可能出现的里程碑提示。每条前加emoji。只输出中文。`;
      promptEn = `Baby journal for Kian (${age} days, ~${Math.floor(age/30)} months). Time: ${now}. Morning feeds: ${feedSummary}. Sleep: ${sleepSummary}.
Write 2-3 development insights in baby's first-person voice ("I love...", "I'm learning to..."), covering current developmental stage and upcoming milestones. Each point starts with an emoji. English only.`;
    } else if (slot === 'afternoon') {
      promptZh = `你是Kian的成长顾问。Kian（${age}天，约${Math.floor(age/30)}个月大）。当前时间：${now}。
今日数据：喂奶${feedSummary}，睡眠${sleepSummary}，活动${actSummary}
近期活动情况：${lastSwim ? `上次游泳${lastSwim.daysAgo}天前` : '近期没有游泳记录'}，${lastOuting ? `上次外出${lastOuting.daysAgo}天前` : '近期没有外出记录'}
根据今日数据给出2-3条下午活动建议，具体可行。每条前加emoji。只输出中文。`;
      promptEn = `Baby journal for Kian (${age} days). Time: ${now}. Today: Feeds: ${feedSummary}. Sleep: ${sleepSummary}. Activities: ${actSummary}. Recent: ${lastSwim ? `last swim ${lastSwim.daysAgo}d ago` : 'no recent swim'}, ${lastOuting ? `last outing ${lastOuting.daysAgo}d ago` : 'no recent outing'}.
Give 2-3 specific afternoon activity suggestions based on the data. Each starts with emoji. English only.`;
    } else {
      promptZh = `你是Kian的成长日记助手。Kian（${age}天，约${Math.floor(age/30)}个月大）。当前时间：${now}。
今日完整数据：喂奶${feedSummary}（共${total}ml），睡眠${sleepSummary}，活动${actSummary}
写2条今日总结+1条明日建议，语气温暖，每条前加emoji。只输出中文。`;
      promptEn = `Baby journal for Kian (${age} days). Time: ${now}. Full day: Feeds: ${feedSummary} (${total}ml total). Sleep: ${sleepSummary}. Activities: ${actSummary}.
Write 2 today summary points + 1 tomorrow suggestion, warm tone, each starts with emoji. English only.`;
    }

    // Call for current language first, then the other
    const [zhResult, enResult] = await Promise.all([
      callGemini(promptZh),
      callGemini(promptEn)
    ]);

    const parsed = { zh: zhResult.trim(), en: enResult.trim() };
    if (!data.aiInsights) data.aiInsights = {};
    data.aiInsights[cacheKey] = parsed;
    saveData();

    const textEl = document.getElementById('insight-text');
    if (textEl) textEl.innerHTML = renderInsightSlots(parsed, slot);
  } catch (err) {
    console.warn('AI insight failed:', err);
    const feeds2 = data.feeds[dateKey(currentDate)] || [];
    const total2 = feeds2.reduce((s, f) => s + f.amount, 0);
    const textEl = document.getElementById('insight-text');
    const el = document.getElementById('daily-insight');
    let msg = total2 >= 700 && total2 <= 950
      ? (currentLang === 'zh' ? '🍼 今日奶量很理想！' : '🍼 Feeding volume looks great today!')
      : total2 > 0 ? (currentLang === 'zh' ? `🍼 今日总奶量 ${total2}ml。` : `🍼 Total formula today: ${total2}ml.`) : '';
    if (msg && textEl) textEl.innerHTML = `<div class="insight-slot-text">${msg}</div>`;
    else if (el) el.style.display = 'none';
    setTimeout(renderInsight, 10000);
  } finally {
    _aiInsightPending = false;
  }
}

// ── MILESTONE AI INSIGHT ────────────────────────────────
let _milestoneInsightPending = false;

async function renderMilestoneInsight() {
  const textEl = document.getElementById('milestone-insight-text');
  if (!textEl) return;
  const ageDays = Math.floor((new Date() - BIRTH_DATE) / 86400000);
  const ageMonths = Math.floor(ageDays / 30.44);
  const cacheKey = 'milestone_insight_' + ageMonths;
  if (data.aiInsights && data.aiInsights[cacheKey]) {
    textEl.innerHTML = `<div class="insight-slot-text">${data.aiInsights[cacheKey].replace(/\n/g,'<br>')}</div>`;
    return;
  }
  if (_milestoneInsightPending) return;
  _milestoneInsightPending = true;
  const achieved = data.milestones.achieved.map(m => m.title).join('、') || '无';
  const lang = currentLang;
  let prompt;
  if (lang === 'en') {
    prompt = `Kian is a ${ageMonths}-month-old baby boy. Achieved milestones: ${achieved}. Write 2-3 warm sentences in English: (1) current developmental highlights, (2) one upcoming milestone to watch. Be encouraging and specific.`;
  } else {
    prompt = `Kian是${ageMonths}个月大的男宝宝。已达成里程碑：${achieved}。请用温暖中文写2-3句话：(1)当前月龄发育亮点，(2)接下来值得关注的一个里程碑。语气温暖鼓励。`;
  }
  try {
    const result = await callGemini(prompt);
    if (!data.aiInsights) data.aiInsights = {};
    data.aiInsights[cacheKey] = result;
    saveData(); // use saveData() which sanitizes keys properly
    textEl.innerHTML = `<div class="insight-slot-text">${result.replace(/\n/g,'<br>')}</div>`;
  } catch(e) {
    textEl.innerHTML = `<div class="insight-slot-text" style="color:var(--light)">暂时无法获取AI分析</div>`;
  } finally {
    _milestoneInsightPending = false;
  }
}

// ── GROWTH AI INSIGHT ───────────────────────────────────
let _growthInsightPending = false;

async function renderGrowthInsight(latestRecord) {
  const card = document.getElementById('growth-insight-card');
  const textEl = document.getElementById('growth-insight-text');
  if (!card || !textEl || !latestRecord) return;
  card.style.display = 'block';
  const ageDays = Math.floor((new Date() - BIRTH_DATE) / 86400000);
  const ageMonths = Math.floor(ageDays / 30.44);
  const cacheKey = `growth_insight_${ageMonths}_${String(latestRecord.weight||'').replace(/\./g,'_')}_${String(latestRecord.height||'').replace(/\./g,'_')}`;
  if (data.aiInsights && data.aiInsights[cacheKey]) {
    textEl.innerHTML = `<div class="insight-slot-text">${data.aiInsights[cacheKey].replace(/\n/g,'<br>')}</div>`;
    return;
  }
  if (_growthInsightPending) return;
  _growthInsightPending = true;
  const w = latestRecord.weight ? latestRecord.weight + 'kg' : '未知';
  const h = latestRecord.height ? latestRecord.height + 'cm' : '未知';
  const hd = latestRecord.head ? latestRecord.head + 'cm' : '未知';
  const lang = currentLang;
  let prompt;
  if (lang === 'en') {
    prompt = `Kian is a ${ageMonths}-month-old baby boy. Weight: ${w}, Height: ${h}, Head: ${hd}. Write 2-3 warm sentences in English assessing his growth compared to WHO standards, and one practical tip.`;
  } else {
    prompt = `Kian是${ageMonths}个月大男宝宝。体重${w}，身高${h}，头围${hd}。请用温暖中文2-3句评估生长发育（对比WHO标准），并给一条实用建议。`;
  }
  try {
    const result = await callGemini(prompt);
    if (!data.aiInsights) data.aiInsights = {};
    data.aiInsights[cacheKey] = result;
    saveData(); // use saveData() which sanitizes keys properly
    textEl.innerHTML = `<div class="insight-slot-text">${result.replace(/\n/g,'<br>')}</div>`;
  } catch(e) {
    textEl.innerHTML = `<div class="insight-slot-text" style="color:var(--light)">暂时无法获取AI分析</div>`;
  } finally {
    _growthInsightPending = false;
  }
}

// ── AI DIARY GENERATOR ──────────────────────────────────
let _diaryPending = false;

async function generateAIDiary() {
  if (_diaryPending) return;
  const key = dateKey(currentDate);
  const feeds = data.feeds[key] || [];
  const sleeps = data.sleeps[key] || [];
  const activities = data.activities[key] || [];
  const ageDays = Math.floor((new Date() - BIRTH_DATE) / 86400000);
  const ageMonths = Math.floor(ageDays / 30.44);
  const feedStr = feeds.map(f => `${f.time} ${f.type} ${f.amount}ml`).join('、') || '无记录';
  const sleepStr = sleeps.map(s => `${s.type} ${s.start}-${s.end}`).join('、') || '无记录';
  const actStr = activities.map(a => `${a.time} ${a.type}${a.note ? ' ' + a.note : ''}`).join('、') || '无记录';
  _diaryPending = true;
  const formPanel = document.getElementById('note-form-panel');
  const contentEl = document.getElementById('note-content');
  if (formPanel) formPanel.style.display = 'block';
  if (contentEl) contentEl.value = '✨ AI 正在生成日记...';
  const lang = currentLang;
  let prompt;
  if (lang === 'en') {
    prompt = `Write a warm, personal baby journal entry (150-200 words) from a parent's perspective for ${key}. Baby Kian is ${ageMonths} months old. Feeds: ${feedStr}. Sleep: ${sleepStr}. Activities: ${actStr}. Write naturally in English, focusing on small joys and observations. No title needed.`;
  } else {
    prompt = `请以妈妈视角，根据以下记录为${key}写一篇温暖感性的育儿日记（150-200字）。宝宝Kian ${ageMonths}个月大。喂奶：${feedStr}。睡眠：${sleepStr}。活动：${actStr}。文字温暖真实，关注细节和小惊喜，不需要标题，直接写正文。`;
  }
  try {
    const result = await callGemini(prompt);
    if (contentEl) contentEl.value = result;
  } catch(e) {
    if (contentEl) contentEl.value = '';
    alert('AI生成失败，请重试');
  } finally {
    _diaryPending = false;
  }
}

// ── NATURAL LANGUAGE AI INPUT ──────────────────────────
async function parseNaturalInput() {
  const textEl = document.getElementById('ai-input-text');
  const feedbackEl = document.getElementById('ai-feedback');
  const btnEl = document.getElementById('btn-ai-send');
  const text = (textEl && textEl.value.trim()) || '';
  if (!text) return;

  btnEl.disabled = true;
  btnEl.textContent = '⏳ 解析中…';
  feedbackEl.style.display = 'block';
  feedbackEl.style.color = 'var(--mid)';
  feedbackEl.textContent = '正在解析…';

  const now = new Date().toTimeString().slice(0, 5);
  const age = getDayAge();
  const prompt = `You are a baby journal assistant for Kian (age: ${age} days, born 2025-12-02).
Current time: ${now}. Today's date: ${dateKey(currentDate)}.

Parse the following text describing baby events. Extract ALL events mentioned.
Return ONLY valid JSON (no markdown, no explanation):
{"events":[
  {"type":"feed","time":"HH:MM","amount":180,"feedType":"Formula"},
  {"type":"sleep","start":"HH:MM","end":"HH:MM","sleepType":"Nap"},
  {"type":"activity","time":"HH:MM","activityType":"Play 玩耍","note":"description"}
]}

Rules:
- feedType options: "Formula","Dream Feed","Night Feed"
- sleepType options: "Nap","Night","Catnap"
- activityType options: "Tummy Time 趴趴时间","Outing 外出","Swimming 游泳","Play 玩耍","Bath 洗澡","Massage 抚触"
- If no time mentioned, use current time ${now}
- If sleep end not mentioned, estimate based on context or omit (use start=end)
- Return empty events array if nothing clear found

Text: "${text}"`;

  try {
    const result = await callGemini(prompt);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    const events = parsed.events || [];

    if (!events.length) {
      feedbackEl.textContent = '未识别到事件，请重新描述。';
      return;
    }

    const key = dateKey(currentDate);
    const added = [];

    for (const e of events) {
      if (e.type === 'feed' && e.time && e.amount) {
        let feedKey = key;
        if (e.feedType === 'Dream Feed' && e.time >= '19:00') {
          const nextDay = new Date(currentDate); nextDay.setDate(nextDay.getDate() + 1);
          feedKey = dateKey(nextDay);
        }
        if (!data.feeds[feedKey]) data.feeds[feedKey] = [];
        data.feeds[feedKey].push({ time: e.time, amount: parseInt(e.amount), type: e.feedType || 'Formula', id: Date.now() + Math.random() });
        data.feeds[feedKey].sort((a, b) => a.time.localeCompare(b.time));
        added.push('🍼 ' + e.amount + 'ml @' + e.time);
      } else if (e.type === 'sleep' && e.start) {
        if (!data.sleeps[key]) data.sleeps[key] = [];
        const end = e.end || e.start;
        data.sleeps[key].push({ start: e.start, end, type: e.sleepType || 'Nap', duration: calcSleepDuration(e.start, end), id: Date.now() + Math.random() });
        data.sleeps[key].sort((a, b) => a.start.localeCompare(b.start));
        added.push('😴 ' + (e.sleepType || 'Nap') + ' @' + e.start);
      } else if (e.type === 'activity' && e.time) {
        if (!data.activities[key]) data.activities[key] = [];
        data.activities[key].push({ time: e.time, type: e.activityType || 'Play 玩耍', note: e.note || '', id: Date.now() + Math.random() });
        data.activities[key].sort((a, b) => a.time.localeCompare(b.time));
        added.push('🎯 ' + (e.activityType || 'Activity') + ' @' + e.time);
      }
    }

    if (added.length) {
      saveData();
      renderTimeline();
      renderDailySummary();
      renderPredictions();
      feedbackEl.style.color = 'var(--sage-dark)';
      feedbackEl.textContent = '✅ 已添加：' + added.join(' · ');
      textEl.value = '';
      // Collapse after success
      setTimeout(() => {
        feedbackEl.style.display = 'none'; feedbackEl.style.color = 'var(--mid)';
        const body = document.getElementById('ai-expanded-body');
        const arrow = document.getElementById('ai-quick-arrow');
        if (body) body.classList.remove('open');
        if (arrow) arrow.classList.remove('open');
      }, 2000);
    } else {
      feedbackEl.textContent = '解析成功但无法提取有效数据，请更具体描述。';
    }
  } catch (err) {
    feedbackEl.style.color = '#C62828';
    feedbackEl.textContent = '解析失败，请检查网络连接。';
    console.warn('parseNaturalInput error:', err);
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = t('btn-ai-send');
  }
}

