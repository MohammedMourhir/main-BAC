// FOCUS HUB — persistence fix + JSON import + Bac panel + charts + focus mode
// Uses Chart.js (loaded in index.html)

/* ===== Constants ===== */
const STORAGE_KEY = 'focusHubState_final_v1'; // keep same key so old data stays
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/* ===== Default state ===== */
let state = {
  tasks: [],
  focusTime: 0,       // minutes (sum of completed task durations)
  streak: 0,
  bestStreak: 0,
  lastActiveDate: null,
  xp: 0,
  dailyGoal: 240,     // minutes
  xpPerMinute: 1,
  logs: [],
  dailyHistory: {}    // { "YYYY-MM-DD": minutes }
};

let weeklyChart = null;
let subjectChart = null;

/* ===== Subjects (Bac Sciences Physiques) ===== */
const BAC_SUBJECTS = [
  { key: 'math', label: 'Mathématiques (BIOF)', watani: true },
  { key: 'science', label: 'Physique et Chimie (BIOF)', watani: true },
  { key: 'svt', label: 'Sciences de la Vie et de la Terre (SVT BIOF)', watani: true },
  { key: 'arabe', label: 'Arabe', watani: false },
  { key: 'francais', label: 'Français', watani: false },
  { key: 'anglais', label: 'Anglais', watani: true },
  { key: 'islam', label: 'Education Islamique', watani: false },
  { key: 'philo', label: 'Philosophie', watani: true }
];

/* ===== Elements ===== */
const el = {
  time: $('#current-time'),
  date: $('#current-date'),
  focusTime: $('#focus-time'),
  tasksCompleted: $('#tasks-completed'),
  currentStreak: $('#current-streak'),
  bestStreak: $('#best-streak'),
  focusProgress: $('#focus-progress'),
  tasksProgress: $('#tasks-progress'),
  streakProgress: $('#streak-progress'),
  xpText: $('#xp-text'),
  xpProgress: $('#xp-progress'),
  levelBubble: $('#level-bubble'),
  dailyGoalDisplay: $('#daily-goal-display'),
  extraCount: $('#extra-count'),
  // tasks
  taskList: $('#task-list'),
  addTaskBtn: $('#add-task-btn'),
  importTasksJsonBtn: $('#import-tasks-json'),
  taskModal: $('#task-modal'),
  closeModal: $('.close-modal'),
  taskForm: $('#task-form'),
  filterSubject: $('#filter-subject'),
  archiveBtn: $('#archive-btn'),
  clearBtn: $('#clear-btn'),
  // progress
  exportBtn: $('#export-btn'),
  importBtn: $('#import-btn'),
  logs: $('#logs'),
  // settings
  dailyGoalInput: $('#daily-goal'),
  xpPerMinuteInput: $('#xp-per-minute'),
  resetDataBtn: $('#reset-data'),
  focusModeBtn: $('#focus-mode'),
  // bac
  bacSubjectsContainer: $('#bac-subjects')
};

/* ===== Quotes ===== */
const quotes = [
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The future belongs to those who prepare for it today.", author: "Malcolm X" }
];

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  bindUI();
  tickClock();
  setInterval(tickClock, 1000);
  rotateQuote();
  setInterval(rotateQuote, 30000);
  renderAll();
});

/* ===== Persistence ===== */
function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw){
    try {
      const parsed = JSON.parse(raw);
      // defensive merge
      state = { ...state, ...parsed };
      // fix types
      if(!state.tasks) state.tasks = [];
      if(!state.dailyHistory) state.dailyHistory = {};
    } catch (e){
      console.warn('Failed to parse saved state', e);
    }
  }
  if(!state.lastActiveDate) state.lastActiveDate = new Date().toDateString();

  // migrate any legacy subject names (like "language") => map to real keys
  state.tasks.forEach(t=>{
    if(t.subject === 'language') t.subject = guessLanguageSubject(t.title||'');
    if(!BAC_SUBJECTS.find(s=>s.key===t.subject)) t.subject = 'other';
  });

  // reflect settings inputs
  el.dailyGoalInput.value = state.dailyGoal;
  el.dailyGoalDisplay.textContent = `${Math.round((state.dailyGoal||240)/60)}h`;
  el.xpPerMinuteInput.value = state.xpPerMinute;
}

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(e){
    console.warn('localStorage save failed', e);
  }
}

// safety: persist on page unload too
window.addEventListener('beforeunload', saveState);

/* ===== UI Bindings ===== */
function bindUI(){
  // sidebar tabs
  $$('.sidebar nav li').forEach(li=>{
    li.addEventListener('click', ()=>{
      $$('.sidebar nav li').forEach(n=>n.classList.remove('active'));
      li.classList.add('active');
      const tab = li.getAttribute('data-tab');
      $$('.tab-section').forEach(s=> s.style.display = 'none');
      document.getElementById(tab).style.display = 'block';
      if(tab === 'progress') buildChartsAnimated();
    });
  });

  // task controls
  el.addTaskBtn.addEventListener('click', () => openTaskModal());
  el.importTasksJsonBtn.addEventListener('click', onImportTasksJSON);
  el.closeModal.addEventListener('click', closeTaskModal);
  el.taskForm.addEventListener('submit', onSaveTask);
  el.filterSubject.addEventListener('change', renderTasks);
  el.archiveBtn.addEventListener('click', archiveCompleted);
  el.clearBtn.addEventListener('click', clearAll);

  // progress
  el.exportBtn.addEventListener('click', exportJSON);
  el.importBtn.addEventListener('click', importPrompt);

  // settings
  el.dailyGoalInput.addEventListener('change', e=>{
    state.dailyGoal = Math.max(30, parseInt(e.target.value)||240);
    el.dailyGoalDisplay.textContent = `${Math.round(state.dailyGoal/60)}h`;
    saveState(); updateStats();
  });
  el.xpPerMinuteInput.addEventListener('change', e=>{
    state.xpPerMinute = parseFloat(e.target.value)||1;
    saveState();
  });
  el.resetDataBtn.addEventListener('click', resetData);

  // focus mode
  el.focusModeBtn.addEventListener('click', toggleFocusMode);
}

/* ===== Clock & Quotes ===== */
function tickClock(){
  const now = new Date();
  el.time.textContent = now.toLocaleTimeString('en-GB', { hour12:false });
  el.date.textContent = now.toLocaleDateString('en-GB', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
}
function rotateQuote(){
  const q = quotes[Math.floor(Math.random()*quotes.length)];
  $('#quote-text').textContent = `"${q.text}"`;
  $('#quote-author').textContent = `- ${q.author}`;
}

/* ===== Task Modal ===== */
function openTaskModal(task=null){
  el.taskModal.style.display = 'flex';
  const set = (id,val)=>{ const x = document.getElementById(id); if(x) x.value = val; };
  const setChk = (id,val)=>{ const x=document.getElementById(id); if(x) x.checked = !!val; };

  if(task){
    $('#modal-title').textContent = 'Edit Task';
    set('task-id', task.id);
    set('task-title', task.title||'');
    set('task-description', task.description||'');
    set('task-duration', task.duration||30);
    set('task-subject', task.subject||'other');
    setChk('task-urgent', task.urgent);
    setChk('task-extra', task.extra);
    setChk('task-completed', task.completed);
    set('task-completedAt', task.completedAt||'');
  } else {
    $('#modal-title').textContent = 'Add New Task';
    el.taskForm.reset();
    set('task-id','');
    set('task-duration',30);
    set('task-completedAt','');
  }
}
function closeTaskModal(){ el.taskModal.style.display = 'none'; }

/* ===== Task Save ===== */
function onSaveTask(e){
  e.preventDefault();
  const id = $('#task-id').value;
  const title = ($('#task-title').value||'').trim();
  if(!title) return;
  const description = ($('#task-description').value||'').trim();
  const duration = Math.max(1, parseInt($('#task-duration').value)||30);
  const subject = $('#task-subject').value;
  const urgent = $('#task-urgent').checked;
  const extra = $('#task-extra').checked;
  const completed = $('#task-completed').checked;
  const completedAtInput = ($('#task-completedAt').value||'').trim();

  const completedAt = completed ? (completedAtInput || new Date().toISOString()) : null;

  if(id){
    const idx = state.tasks.findIndex(t=>t.id===id);
    if(idx>-1){
      const wasCompleted = !!state.tasks[idx].completed;
      state.tasks[idx] = { ...state.tasks[idx], title, description, duration, subject, urgent, extra, completed, completedAt };
      if(!wasCompleted && completed) applyCompletionRewards(state.tasks[idx]);
      if(wasCompleted && !completed) undoCompletionRewards(state.tasks[idx]);
      pushLog(`Edited task "${title}"`);
    }
  } else {
    const task = {
      id: genId(),
      title, description, duration, subject, urgent, extra,
      completed, createdAt: new Date().toISOString(),
      completedAt
    };
    state.tasks.push(task);
    if(task.completed) applyCompletionRewards(task);
    pushLog(`Added task "${title}"`);
  }

  saveState();
  closeTaskModal();
  renderAll();
}

/* ===== Task List Render ===== */
function renderTasks(){
  const filter = el.filterSubject.value || 'all';
  el.taskList.innerHTML = '';
  const sorted = [...state.tasks].sort((a,b)=>{
    if(a.completed !== b.completed) return a.completed ? 1 : -1;
    if(a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    return new Date(b.createdAt||0) - new Date(a.createdAt||0);
  });

  let shown = 0;
  sorted.forEach(task=>{
    if(filter !== 'all' && task.subject !== filter) return;
    shown++;
    const div = document.createElement('div');
    div.className = 'task-item' + (task.completed ? ' completed' : '');
    div.innerHTML = `
      <label class="task-checkbox">
        <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
        <span class="checkmark"></span>
      </label>
      <div class="task-content">
        <h3>${escapeHtml(task.title)}</h3>
        ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
        <div class="task-tags">
          <span class="tag ${task.subject}">${labelForSubject(task.subject)}</span>
          ${task.urgent ? '<span class="tag urgent">Urgent</span>' : ''}
          ${task.extra ? '<span class="tag other">Extra</span>' : ''}
        </div>
      </div>
      <div class="task-meta">${fmtDuration(task.duration)}</div>
      <div class="task-actions">
        <button class="icon-btn edit-btn" data-id="${task.id}" title="Edit">✎</button>
        <button class="icon-btn delete-btn" data-id="${task.id}" title="Delete">🗑</button>
      </div>
    `;

    div.querySelector('input[type="checkbox"]').addEventListener('change', e=>{
      toggleComplete(e.target.dataset.id);
    });
    div.querySelector('.edit-btn').addEventListener('click', e=>{
      const t = state.tasks.find(x=>x.id===e.target.dataset.id);
      if(t) openTaskModal(t);
    });
    div.querySelector('.delete-btn').addEventListener('click', e=>{
      deleteTask(e.target.dataset.id);
    });

    el.taskList.appendChild(div);
  });

  if(shown===0){
    el.taskList.innerHTML = `<div class="task-item" style="justify-content:center;opacity:0.65">No tasks to show</div>`;
  }
}

/* ===== Complete / Undo + Rewards ===== */
function toggleComplete(taskId){
  const idx = state.tasks.findIndex(t=>t.id===taskId);
  if(idx===-1) return;
  const t = state.tasks[idx];
  const was = !!t.completed;
  t.completed = !was;

  if(t.completed){
    t.completedAt = new Date().toISOString();
    applyCompletionRewards(t);
    pushLog(`Completed "${t.title}" (+${calcXpForTask(t)} XP, +${t.duration}m)`);
  } else {
    undoCompletionRewards(t);
    t.completedAt = null;
    pushLog(`Marked incomplete "${t.title}"`);
  }
  saveState(); renderAll();
}

function applyCompletionRewards(task){
  state.focusTime = (state.focusTime||0) + (task.duration||0);
  const day = dayKey(new Date(task.completedAt||new Date()));
  state.dailyHistory[day] = (state.dailyHistory[day]||0) + (task.duration||0);

  state.xp = (state.xp||0) + calcXpForTask(task);

  // streak
  const today = new Date().toDateString();
  const yest = new Date(); yest.setDate(yest.getDate()-1);
  if(state.lastActiveDate !== today){
    if(state.lastActiveDate === yest.toDateString()) state.streak = (state.streak||0) + 1;
    else state.streak = 1;
    state.lastActiveDate = today;
    if(state.streak > (state.bestStreak||0)) state.bestStreak = state.streak;
  }
  saveState();
}

function undoCompletionRewards(task){
  const minutes = task.duration||0;
  const xpLoss = calcXpForTask(task);
  state.focusTime = Math.max(0, (state.focusTime||0) - minutes);
  if(task.completedAt){
    const day = dayKey(new Date(task.completedAt));
    state.dailyHistory[day] = Math.max(0, (state.dailyHistory[day]||0) - minutes);
  }
  state.xp = Math.max(0, (state.xp||0) - xpLoss);
  saveState();
}

function calcXpForTask(task){
  return Math.round((task.duration||0) * (state.xpPerMinute||1)) + (task.urgent?5:0) + (task.extra?10:0);
}

/* ===== Delete / Archive / Clear ===== */
function deleteTask(taskId){
  if(!confirm('Delete this task?')) return;
  const idx = state.tasks.findIndex(t=>t.id===taskId);
  if(idx>-1){
    pushLog(`Deleted "${state.tasks[idx].title}"`);
    state.tasks.splice(idx,1);
    saveState(); renderAll();
  }
}
function archiveCompleted(){
  const before = state.tasks.length;
  state.tasks = state.tasks.filter(t=>!t.completed);
  pushLog(`Archived ${before - state.tasks.length} completed tasks`);
  saveState(); renderAll();
}
function clearAll(){
  if(!confirm('Clear ALL tasks and reset stats?')) return;
  state = {
    tasks: [], focusTime:0, streak:0, bestStreak:0, lastActiveDate:new Date().toDateString(),
    xp:0, dailyGoal:240, xpPerMinute:1, logs:[], dailyHistory:{}
  };
  saveState(); renderAll();
}

/* ===== Export / Import (full app state) ===== */
function exportJSON(){
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'focushub-export.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function importPrompt(){
  const raw = prompt('Paste exported JSON here (full app state)');
  if(!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state = { ...state, ...parsed };
    if(!state.tasks) state.tasks = [];
    if(!state.dailyHistory) state.dailyHistory = {};
    saveState(); renderAll(); pushLog('Imported app state');
  } catch(e){
    alert('Invalid JSON');
  }
}

/* ===== Import Tasks JSON (bulk) ===== */
function onImportTasksJSON(){
  const raw = prompt('Paste JSON array of tasks (title,duration,subject,urgent,extra,completed,completedAt optional)');
  if(!raw) return;
  try {
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr)) throw new Error('Not an array');
    let added = 0;
    arr.forEach(item=>{
      if(!item || !item.title) return;
      const subject = normalizeSubject(item.subject || guessLanguageSubject(item.title||''));
      const t = {
        id: genId(),
        title: String(item.title),
        description: item.description ? String(item.description) : '',
        duration: Math.max(1, parseInt(item.duration)||30),
        subject,
        urgent: !!item.urgent,
        extra: !!item.extra,
        completed: !!item.completed,
        createdAt: item.createdAt || new Date().toISOString(),
        completedAt: item.completed ? (item.completedAt || new Date().toISOString()) : null
      };
      state.tasks.push(t);
      if(t.completed) applyCompletionRewards(t);
      added++;
    });
    if(added){
      pushLog(`Imported ${added} tasks from JSON`);
      saveState(); renderAll();
    } else alert('No valid tasks found.');
  } catch(e){
    alert('Invalid JSON or format.\nExample: [{"title":"Math","duration":60,"subject":"math"}]');
  }
}

/* ===== Stats & Rendering ===== */
function renderAll(){
  renderTasks();
  updateStats();
  renderSubjectBars();
  renderBacSubjectsPanel();
  renderLogs();
}

function updateStats(){
  const completed = state.tasks.filter(t=>t.completed).length;
  const total = state.tasks.length;
  const extra = state.tasks.filter(t=>t.completed && t.extra).length;
  el.tasksCompleted.textContent = `${completed}/${total}`;
  el.extraCount.textContent = extra;

  const fh = Math.floor((state.focusTime||0)/60);
  const fm = (state.focusTime||0)%60;
  el.focusTime.textContent = `${fh}h ${fm}m`;

  const focusPct = Math.min(100, Math.round(((state.focusTime||0) / (state.dailyGoal||240)) * 100));
  el.focusProgress.style.width = `${focusPct}%`;

  const completionPct = total ? Math.round((completed/total)*100) : 0;
  el.tasksProgress.style.width = `${completionPct}%`;

  el.currentStreak.textContent = `${state.streak||0} day${(state.streak||0)!==1?'s':''}`;
  el.bestStreak.textContent = state.bestStreak||0;

  const level = calcLevel(state.xp||0);
  const xpInto = (state.xp||0) - xpForLevel(level);
  const xpNext = xpToNext(level);
  el.xpText.textContent = `XP: ${state.xp||0} • L${level}`;
  el.xpProgress.style.width = `${xpNext?Math.min(100,Math.round((xpInto/xpNext)*100)):100}%`;

  saveState();
}

/* ===== Subject bars ===== */
function renderSubjectBars(){
  const container = $('#subject-bars');
  container.innerHTML = '';
  BAC_SUBJECTS.forEach(s=>{
    const tasks = state.tasks.filter(t=>t.subject===s.key);
    const totalMin = tasks.reduce((n,t)=>n+(t.duration||0),0);
    const doneMin = tasks.filter(t=>t.completed).reduce((n,t)=>n+(t.duration||0),0);
    const pct = totalMin ? Math.round((doneMin/totalMin)*100) : 0;
    const row = document.createElement('div');
    row.className = 'subject-row';
    row.innerHTML = `
      <div class="subject-name">${s.label.split(' (')[0]}</div>
      <div class="subject-progress"><div class="progress-bar" style="width:${pct}%"></div></div>
      <div style="width:72px;text-align:right;font-size:0.9rem">${doneMin}m</div>
    `;
    container.appendChild(row);
  });
}

/* ===== Bac subjects panel ===== */
function renderBacSubjectsPanel(){
  const c = el.bacSubjectsContainer;
  c.innerHTML = '';
  BAC_SUBJECTS.forEach(s=>{
    const doneMin = state.tasks.filter(t=>t.subject===s.key && t.completed).reduce((n,t)=>n+(t.duration||0),0);
    const row = document.createElement('div');
    row.className = 'subject-row';
    row.innerHTML = `
      <div class="subject-name">${s.label}</div>
      <div style="width:110px;text-align:right">${Math.floor(doneMin/60)}h ${doneMin%60}m</div>
      <div style="margin-left:8px">${s.watani ? '<span class="watani-badge">Watani 2026</span>' : ''}</div>
    `;
    c.appendChild(row);
  });
}

/* ===== Logs ===== */
function pushLog(text){
  state.logs.unshift({ id: genId(), text, at: new Date().toISOString() });
  if(state.logs.length>500) state.logs.pop();
  saveState();
}
function renderLogs(){
  const c = el.logs;
  c.innerHTML = '';
  (state.logs||[]).slice(0,200).forEach(log=>{
    const div = document.createElement('div');
    div.className = 'log-item';
    div.textContent = `${new Date(log.at).toLocaleString()}: ${log.text}`;
    c.appendChild(div);
  });
}

/* ===== Charts ===== */
function buildChartsAnimated(){
  const { labels, values } = getLastNDaysData(7);

  if(weeklyChart) weeklyChart.destroy();
  if(subjectChart) subjectChart.destroy();

  const wkCtx = document.getElementById('weeklyChart').getContext('2d');
  weeklyChart = new Chart(wkCtx, {
    type: 'bar',
    data: { labels, datasets: [{ label:'Minutes', data: values, borderRadius:6, barThickness:20 }] },
    options: {
      animation:{ duration:900, easing:'easeOutQuart' },
      plugins:{ legend:{ display:false }},
      scales:{ y:{ beginAtZero:true } }
    }
  });

  const labelsSub = BAC_SUBJECTS.map(s=>s.label.split(' (')[0]);
  const dataSub = BAC_SUBJECTS.map(s=> state.tasks.filter(t=>t.subject===s.key && t.completed).reduce((n,t)=>n+(t.duration||0),0));

  const subCtx = document.getElementById('subjectChart').getContext('2d');
  subjectChart = new Chart(subCtx, {
    type: 'doughnut',
    data: { labels: labelsSub, datasets: [{ data: dataSub }] },
    options: {
      animation:{ duration:900, easing:'easeOutQuart' },
      plugins:{ legend:{ position:'bottom' }, tooltip:{ callbacks:{ label: c=>`${c.label}: ${c.formattedValue}m` }} }
    }
  });
}
function getLastNDaysData(n){
  const labels=[], values=[];
  for(let i=n-1;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    labels.push(d.toLocaleDateString('en-GB',{ weekday:'short', month:'short', day:'numeric' }));
    values.push(state.dailyHistory[dayKey(d)]||0);
  }
  return { labels, values };
}

/* ===== Focus Mode ===== */
function toggleFocusMode(){
  document.body.classList.toggle('focus-mode');
  const on = document.body.classList.contains('focus-mode');
  el.focusModeBtn.textContent = on ? 'EXIT FOCUS' : 'FOCUS MODE';
}

/* ===== Leveling ===== */
function xpForLevel(L){ return 50*(L-1)*L; }
function xpToNext(L){ return 100*L; }
function calcLevel(xp){ let L=1; while(xp>=xpForLevel(L+1)) L++; return L; }

/* ===== Utils ===== */
function genId(){ return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function dayKey(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; }
function fmtDuration(mins){ const h=Math.floor(mins/60), m=mins%60; return h?`${h}h ${m}m`:`${m}m`; }
function escapeHtml(t){ return String(t).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function labelForSubject(key){
  const f=BAC_SUBJECTS.find(s=>s.key===key);
  if(f) return f.label.split(' (')[0];
  const map={ math:'Mathématiques', science:'Physique', svt:'SVT', arabe:'Arabe', francais:'Français', anglais:'Anglais', islam:'Education Islamique', philo:'Philosophie', other:'Other' };
  return map[key]||'Other';
}
function normalizeSubject(s){
  s = (s||'').toLowerCase();
  if(['math','maths','mathematiques','mathématiques'].includes(s)) return 'math';
  if(['physique','chimie','pc','science','physique & chimie','physique et chimie'].includes(s)) return 'science';
  if(['svt','bio','biologie'].includes(s)) return 'svt';
  if(['ar','arabe'].includes(s)) return 'arabe';
  if(['fr','francais','français'].includes(s)) return 'francais';
  if(['en','anglais','english'].includes(s)) return 'anglais';
  if(['islam','education islamique','éducation islamique'].includes(s)) return 'islam';
  if(['philo','philosophie'].includes(s)) return 'philo';
  return 'other';
}
function guessLanguageSubject(title){
  const t = (title||'').toLowerCase();
  if(t.includes('fran')) return 'francais';
  if(t.includes('angl')||t.includes('essay')) return 'anglais';
  if(t.includes('arabe')||t.includes('nahw')) return 'arabe';
  return 'other';
}

/* ===== Reset ===== */
function resetData(){
  if(!confirm('Reset all local data? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = {
    tasks: [], focusTime:0, streak:0, bestStreak:0, lastActiveDate:new Date().toDateString(),
    xp:0, dailyGoal:240, xpPerMinute:1, logs:[], dailyHistory:{}
  };
  saveState(); renderAll();
}

/* ===== Kickoff ===== */
function renderAll(){
  renderTasks();
  updateStats();
  renderSubjectBars();
  renderBacSubjectsPanel();
  renderLogs();
}
