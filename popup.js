const siteInput = document.getElementById('siteInput');
const addBtn = document.getElementById('addBtn');
const siteList = document.getElementById('siteList');

async function loadSites() {
  try {
    const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
    
    if (blockedSites.length === 0) {
      siteList.innerHTML = '<div class="empty-state">No blocked sites yet</div>';
      return;
    }
    
    siteList.innerHTML = blockedSites.map(site => `
      <div class="site-item">
        <span class="site-name">${escapeHtml(site)}</span>
        <button class="remove-btn" data-site="${escapeHtml(site)}">Remove</button>
      </div>
    `).join('');
    
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => removeSite(btn.dataset.site));
    });
  } catch (error) {
    console.error('Error loading sites:', error);
    siteList.innerHTML = '<div class="empty-state">Error loading blocked sites</div>';
  }
}

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

async function removeSite(site) {
  try {
    const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
    const updated = blockedSites.filter(s => s !== site);
    await chrome.storage.local.set({ blockedSites: updated });
    loadSites();
  } catch (error) {
    console.error('Error removing site:', error);
    alert('Error removing site. Please try again.');
  }
}

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

loadSites();