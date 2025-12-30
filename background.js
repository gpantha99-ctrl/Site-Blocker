chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  
  const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
  const url = new URL(details.url);
  const hostname = url.hostname.replace('www.', '');
  
  const isBlocked = blockedSites.some(site => {
    const blocked = site.replace('www.', '');
    return hostname === blocked || hostname.endsWith('.' + blocked);
  });
  
  if (isBlocked) {
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(hostname)
    });
  }
});