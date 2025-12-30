let blockingEnabled = true;
let scheduleEnabled = false;
let stats = {};

chrome.storage.local.get(['blockingEnabled', 'scheduleEnabled', 'stats'], (result) => {
  blockingEnabled = result.blockingEnabled !== false;
  scheduleEnabled = result.scheduleEnabled || false;
  stats = result.stats || {};
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockingEnabled) {
    blockingEnabled = changes.blockingEnabled.newValue;
  }
  if (changes.scheduleEnabled) {
    scheduleEnabled = changes.scheduleEnabled.newValue;
  }
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  if (!blockingEnabled) return;

  if (scheduleEnabled) {
    const { schedule } = await chrome.storage.local.get('schedule');
    if (schedule && !isInSchedule(schedule)) return;
  }
  
  const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
  const url = new URL(details.url);
  const hostname = url.hostname.replace('www.', '');
  
  const isBlocked = blockedSites.some(site => {
    const blocked = site.replace('www.', '');
    return hostname === blocked || hostname.endsWith('.' + blocked);
  });
  
  if (isBlocked) {
    updateStats(hostname);
    
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(hostname)
    });
  }
});

function isInSchedule(schedule) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = schedule.start.split(':').map(Number);
  const [endHour, endMinute] = schedule.end.split(':').map(number);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  return currentTime >= startTime && currentTime <= endTime;
}

async function updateStats(site) {
  const { stats = {} } = await chrome.storage.local.get('stats');
  const today = new Date().toDateString();

  if (!stats[today]) {
    stats[today] = {};
  }

  stats[today][site] = (stats[today][site] || 0) + 1;

  await chrome.storage.local.set({ stats });
}
