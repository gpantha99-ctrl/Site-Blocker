const siteInput = document.getElementById('siteInput');
const addBtn = document.getElementById('addBtn');
const siteList = document.getElementById('siteList');
const searchInput = document.getElementById('searchInput');
const toggleBlocking = document.getElementById('toggleBlocking');
const statusText = document.getElementById('statusText');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const fileInput = document.getElementById('fileInput');
const scheduleToggle = document.getElementById('scheduleToggle');
const startTime = document.getElementById('startTime');
const endTime = document.getElementById('endTime');
const saveSchedule = document.getElementById('saveSchedule');
const clearStatsBtn = document.getElementById('clearStatsBtn')

let allSites = [];
let currentFilter = '';

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
   document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
    
    if (btn.dataset.tab === 'stats') {
      loadStats();
    }
  });
});

async function init() {
  const { blockingEnabled = true, scheduleEnabled = false, schedule } = 
    await chrome.storage.local.get(['blockingEnabled', 'scheduleEnabled', 'schedule']);
  
  toggleBlocking.checked = blockingEnabled;
  statusText.textContent = blockingEnabled ? 'Blocking Active' : 'Blocking Paused';
  
  scheduleToggle.checked = scheduleEnabled;
  if (schedule) {
    startTime.value = schedule.start;
    endTime.value = schedule.end;
  }
  
  loadSites();
}

toggleBlocking.addEventListener('change', async () => {
  const enabled = toggleBlocking.checked;
  await chrome.storage.local.set({ blockingEnabled: enabled });
  statusText.textContent = enabled ? 'Blocking Active' : 'Blocking Paused';
});

async function loadSites() {
  try {
    const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
    allSites = blockedSites;
    displaySites(allSites);
  } catch (error) {
    console.error('Error loading sites:', error);
    siteList.innerHTML = '<div class="empty-state">Error loading blocked sites</div>';
  }
}

function displaySites(sites) {
  const filtered = currentFilter 
    ? sites.filter(s => s.toLowerCase().includes(currentFilter.toLowerCase()))
    : sites;
  
  if (filtered.length === 0) {
    siteList.innerHTML = '<div class="empty-state">No blocked sites yet</div>';
    return;
  }
  
  siteList.innerHTML = filtered.map(site => `
    <div class="site-item">
      <span class="site-name">${escapeHtml(site)}</span>
      <button class="remove-btn" data-site="${escapeHtml(site)}">Remove</button>
    </div>
  `).join('');
  
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeSite(btn.dataset.site));
  });
}

searchInput.addEventListener('input', (e) => {
  currentFilter = e.target.value;
  displaySites(allSites);
});

async function addSite() {
  try {
    let site = siteInput.value.trim().toLowerCase();
    
    if (!site) {
      alert('Please enter a website URL');
      return;
    }
    
    site = site.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    
    if (!site.includes('.')) {
      alert('Please enter a valid website (e.g., example.com)');
      return;
    }
    
    const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
    
    if (blockedSites.includes(site)) {
      alert('This site is already blocked');
      siteInput.value = '';
      return;
    }
    
    blockedSites.push(site);
    await chrome.storage.local.set({ blockedSites });
    
    siteInput.value = '';
    siteInput.focus();
    loadSites();
  } catch (error) {
    console.error('Error adding site:', error);
    alert('Error adding site. Please try again.');
  }
}

exportBtn.addEventListener('click', async () => {
  const { blockedSites =[] } = await chrome.storage.local.get('blockedSites');
  const dataStr = JSON.stringify(blockedSites, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'blocked-sites.json';
  a.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        await chrome.storage.local.set({ blockedSites: imported });
        loadSites();
        alert('Sites imported successfully!');
      } else {
        alert('Invalid file format');
      }
    } catch (error) {
      alert('Error importing file');
    }
  };
  reader.readAsText(file);
  fileInput.value = '';
});

clearAllBtn.addEventListener('click', async () => {
  if (confirm('Are you sure you want to remove all blocked sites?')) {
    await chrome.storage.local.set({ blockedSites: [] });
    loadSites();
  }
});

saveSchedule.addEventListener('click', async () => {
  const schedule = {
    start: startTime.value,
    end: endTime.value
  };
  await chrome.storage.local.set({ schedule });
  alert('Schedule saved successfully!');
});

scheduleToggle.addEventListener('change', async () => {
  await chrome.storage.local.set({ scheduleEnabled: scheduleToggle.checked });
});

async function loadStats() {
  const { stats = {} } = await chrome.storage.local.get('stats');
  const today = new Date().toDateString();
  const todayStats = stats[today] || {};
  
  const statsContent = document.getElementById('statsContent');
  
  if (Object.keys(todayStats).length === 0) {
    statsContent.innerHTML = '<div class="no-stats">No blocked attempts today</div>';
    return;
  }
  
  const sorted = Object.entries(todayStats).sort((a, b) => b[1] - a[1]);
  
  statsContent.innerHTML = sorted.map(([site, count]) => `
    <div class="stat-item">
      <span class="stat-site">${escapeHtml(site)}</span>
      <span class="stat-count">${count} ${count === 1 ? 'attempt' : 'attempts'}</span>
    </div>
  `).join('');
}

clearStatsBtn.addEventListener('click', async () => {
  if (confirm('Clear all statistics?')) {
    await chrome.storage.local.set({ stats: {} });
    loadStats();
  }
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

addBtn.addEventListener('click', addSite);
siteInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addSite();
  }
});

init();
