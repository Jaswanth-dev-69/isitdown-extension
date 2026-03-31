/* ═══════════════════════════════════════════════════════════
   IsItDown — Popup Controller
   ═══════════════════════════════════════════════════════════ */
(function () {
  /* ─── State ───────────────────────────────────────────── */
  let currentDomain = '';
  let currentResult = null;
  let checkTimestamp = null;
  let agoInterval = null;

  /* ─── DOM Refs ────────────────────────────────────────── */
  const $ = (s) => document.querySelector(s);
  const body = document.body;
  const statusDot = $('#status-dot');
  const domainText = $('#domain-text');
  const checkAgo = $('#check-ago');
  const verdictIcon = $('#verdict-icon');
  const verdictLabel = $('#verdict-label');
  const verdictSub = $('#verdict-sub');
  const checkBtn = $('#check-btn');
  const statsGrid = $('#stats-grid');
  const statResponse = $('#stat-response');
  const statHttp = $('#stat-http');
  const statDns = $('#stat-dns');
  const fixesPanel = $('#fixes-panel');
  const fixList = $('#fix-list');
  const copyFixesBtn = $('#copy-fixes-btn');
  const incognitoBtn = $('#incognito-btn');
  const proActions = $('#pro-actions');
  const watchBtn = $('#watch-btn');
  const copyReportBtn = $('#copy-report-btn');
  const historyPanel = $('#history-panel');
  const historyList = $('#history-list');
  const clearHistoryBtn = $('#clear-history-btn');
  const exportCsvBtn = $('#export-csv-btn');
  const monitorPanel = $('#monitor-panel');
  const monitorList = $('#monitor-list');
  const addMonitorBtn = $('#add-monitor-btn');
  const toast = $('#toast');

  /* ─── Icons ───────────────────────────────────────────── */
  const icons = {
    idle: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    checking: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>',
    up: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    down: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    slow: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>'
  };

  /* ─── Helpers ─────────────────────────────────────────── */
  function show(el) { if (el) el.removeAttribute('hidden'); }
  function hide(el) { if (el) el.setAttribute('hidden', ''); }

  function showToast(msg, duration = 2500) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  }

  function timeAgo(ts) {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return s + 's ago';
    const m = Math.round(s / 60);
    if (m < 60) return m + 'm ago';
    return Math.round(m / 60) + 'h ago';
  }

  function startAgoTimer() {
    if (agoInterval) clearInterval(agoInterval);
    agoInterval = setInterval(() => {
      if (checkTimestamp) checkAgo.textContent = timeAgo(checkTimestamp);
    }, 5000);
  }

  function normalizeDomain(url) {
    try {
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      return u.hostname.toLowerCase().replace(/\.+$/, '') || null;
    } catch { return null; }
  }

  /* ─── Fix Suggestions ────────────────────────────────── */
  function getFixSuggestions(result) {
    const fixes = [];
    const err = (result.local?.error || '').toLowerCase();

    if (err.includes('name') || err.includes('dns')) {
      fixes.push({ text: 'Check your DNS settings', detail: 'Try 8.8.8.8 or 1.1.1.1' });
      fixes.push({ text: 'Flush DNS cache', detail: 'ipconfig /flushdns' });
    }
    if (err.includes('timeout') || err.includes('abort')) {
      fixes.push({ text: 'Check your VPN or proxy', detail: 'Disconnect and retry' });
    }
    if (result.local?.status === 403) {
      fixes.push({ text: 'Try incognito mode', detail: 'Cookies or extensions may be blocking' });
    }
    if (result.local?.status === 401) {
      fixes.push({ text: 'Check your login credentials' });
    }

    // Always-relevant fixes
    const always = [
      { text: 'Hard refresh', detail: 'Ctrl + Shift + R' },
      { text: 'Clear cache for this site' },
      { text: 'Try incognito mode', detail: 'Rules out extensions/cookies' },
      { text: 'Check your VPN or proxy' },
      { text: 'Disable other browser extensions' },
      { text: 'Restart your browser' }
    ];

    for (const f of always) {
      if (!fixes.some(x => x.text === f.text)) fixes.push(f);
    }

    return fixes.slice(0, 6);
  }

  function renderFixes(result) {
    fixList.innerHTML = '';
    const fixes = getFixSuggestions(result);

    fixes.forEach((f, i) => {
      const item = document.createElement('div');
      item.className = 'fix-item';

      const num = document.createElement('span');
      num.className = 'fix-num';
      num.textContent = i + 1;

      const textWrap = document.createElement('div');
      const text = document.createElement('div');
      text.className = 'fix-text';
      text.textContent = f.text;
      textWrap.appendChild(text);

      if (f.detail) {
        const detail = document.createElement('div');
        detail.className = 'fix-detail';
        detail.textContent = f.detail;
        textWrap.appendChild(detail);
      }

      item.appendChild(num);
      item.appendChild(textWrap);
      fixList.appendChild(item);
    });

    window._currentFixes = fixes;
  }

  /* ─── Render Result ──────────────────────────────────── */
  function renderResult(result) {
    currentResult = result;
    checkTimestamp = result.timestamp;
    body.dataset.state = result.verdict;
    checkAgo.textContent = timeAgo(result.timestamp);

    // Dot
    statusDot.className = 'status-dot dot-' + result.verdict;

    // Icon
    verdictIcon.innerHTML = icons[result.verdict] || icons.idle;

    // Labels
    verdictLabel.textContent = result.label;
    verdictSub.textContent = result.sublabel;

    // Stats
    show(statsGrid);
    statsGrid.classList.add('fade-in');
    const ms = result.local?.ms;
    const code = result.local?.status;
    const dnsOk = result.dns?.ok;

    statResponse.textContent = ms != null ? ms + 'ms' : 'Timeout';
    statResponse.className = 'stat-value ' + (result.verdict === 'up' ? 'val-up' : result.verdict === 'slow' ? 'val-slow' : 'val-down');

    statHttp.textContent = code && code > 0 ? code : '—';
    statHttp.className = 'stat-value ' + (code >= 200 && code < 400 ? 'val-up' : code >= 500 ? 'val-down' : '');

    statDns.textContent = dnsOk ? 'OK' : 'Fail';
    statDns.className = 'stat-value ' + (dnsOk ? 'val-up' : 'val-down');

    // Fixes
    if (result.verdict === 'down' || result.verdict === 'slow') {
      renderFixes(result);
      show(fixesPanel);
      fixesPanel.classList.add('fade-in');
    } else {
      hide(fixesPanel);
    }

    // Actions — always available
    show(proActions);
    watchBtn.disabled = result.verdict === 'up';
    copyReportBtn.disabled = false;

    checkBtn.textContent = 'Check again';
    checkBtn.disabled = false;
  }

  /* ─── Build Report ───────────────────────────────────── */
  function buildReport() {
    if (!currentResult) return '';
    const lines = [
      `IsItDown Report`,
      `Domain: ${currentDomain}`,
      `Verdict: ${currentResult.label}`,
      `HTTP: ${currentResult.local?.status || '—'}`,
      `Response: ${currentResult.local?.ms != null ? currentResult.local.ms + 'ms' : 'Timeout'}`,
      `DNS: ${currentResult.dns?.ok ? 'OK' : 'Fail'}`,
      `Checked: ${new Date(currentResult.timestamp).toLocaleString()}`
    ];
    return lines.join('\n');
  }

  /* ─── History ────────────────────────────────────────── */
  async function renderHistory() {
    if (!window.IIDStorage) return;
    const entries = await window.IIDStorage.getHistory();
    historyList.innerHTML = '';

    if (entries.length === 0) {
      historyList.innerHTML = '<div class="history-empty">No checks yet</div>';
      return;
    }

    entries.slice(0, 10).forEach(e => {
      const row = document.createElement('div');
      row.className = 'history-entry';

      const dot = document.createElement('span');
      dot.className = 'history-dot h-' + (e.verdict || 'down');

      const domain = document.createElement('span');
      domain.className = 'history-domain';
      domain.textContent = e.domain;

      const meta = document.createElement('span');
      meta.className = 'history-meta';
      meta.textContent = (e.label || e.verdict) + ' · ' + timeAgo(e.timestamp);

      row.appendChild(dot);
      row.appendChild(domain);
      row.appendChild(meta);
      historyList.appendChild(row);
    });
  }

  /* ─── Monitor List ───────────────────────────────────── */
  async function renderMonitors() {
    try {
      const data = await chrome.runtime.sendMessage({ type: 'getMonitors' });
      const monitors = data?.monitors || [];
      const results = data?.results || [];
      monitorList.innerHTML = '';

      if (monitors.length === 0) {
        monitorList.innerHTML = '<div class="monitor-empty">No sites monitored</div>';
        addMonitorBtn.disabled = !currentDomain;
        return;
      }

      addMonitorBtn.disabled = monitors.length >= 10 || monitors.some(m => m.domain === currentDomain);

      monitors.forEach(m => {
        const r = results.find(x => x.domain === m.domain);
        const row = document.createElement('div');
        row.className = 'monitor-entry';

        const dot = document.createElement('span');
        dot.className = 'history-dot h-' + (r?.lastCheck?.verdict || 'up');

        const domain = document.createElement('span');
        domain.className = 'monitor-domain';
        domain.textContent = m.domain;

        const status = document.createElement('span');
        status.className = 'monitor-status m-' + (r?.lastCheck?.verdict || 'up');
        status.textContent = r?.lastCheck?.label || 'Pending';

        const rmBtn = document.createElement('button');
        rmBtn.className = 'btn-remove';
        rmBtn.textContent = '×';
        rmBtn.title = 'Remove';
        rmBtn.addEventListener('click', async () => {
          await chrome.runtime.sendMessage({ type: 'removeMonitor', domain: m.domain });
          showToast('Removed ' + m.domain);
          renderMonitors();
        });

        row.appendChild(dot);
        row.appendChild(domain);
        row.appendChild(status);
        row.appendChild(rmBtn);
        monitorList.appendChild(row);
      });
    } catch { monitorList.innerHTML = '<div class="monitor-empty">Error loading monitors</div>'; }
  }

  /* ─── Run Check ──────────────────────────────────────── */
  async function runCheck() {
    if (!currentDomain) return;

    checkBtn.disabled = true;
    checkBtn.textContent = 'Checking…';
    body.dataset.state = 'checking';
    statusDot.className = 'status-dot dot-checking';
    verdictIcon.innerHTML = icons.checking;
    verdictLabel.textContent = 'Checking…';
    verdictSub.textContent = 'Contacting ' + currentDomain;
    hide(fixesPanel);

    try {
      const result = await chrome.runtime.sendMessage({ type: 'check', domain: currentDomain });

      if (result?.error && !result.verdict) {
        throw new Error(result.error);
      }

      renderResult(result);

      // Save to history
      if (window.IIDStorage) {
        await window.IIDStorage.addHistoryEntry(result);
        renderHistory();
      }
    } catch (err) {
      body.dataset.state = 'down';
      statusDot.className = 'status-dot dot-down';
      verdictIcon.innerHTML = icons.down;
      verdictLabel.textContent = 'Check Failed';
      verdictSub.textContent = err.message || 'Could not complete the check';
      checkBtn.textContent = 'Try again';
      checkBtn.disabled = false;
    }
  }

  /* ─── Event Binding ──────────────────────────────────── */
  function bindEvents() {
    checkBtn.addEventListener('click', () => runCheck());

    // Fix actions
    copyFixesBtn.addEventListener('click', async () => {
      const fixes = window._currentFixes || [];
      const text = fixes.map((f, i) => `${i + 1}. ${f.text}${f.detail ? ' — ' + f.detail : ''}`).join('\n');
      try { await navigator.clipboard.writeText(text); showToast('Fix steps copied!'); }
      catch { showToast('Could not copy'); }
    });

    incognitoBtn.addEventListener('click', async () => {
      if (!currentDomain) return;
      try { await chrome.windows.create({ url: 'https://' + currentDomain, incognito: true }); }
      catch { showToast('Could not open incognito'); }
    });

    // Actions
    watchBtn.addEventListener('click', async () => {
      if (!currentDomain) return;
      if (watchBtn.classList.contains('watching')) {
        await chrome.runtime.sendMessage({ type: 'stopWatchRecovery', domain: currentDomain });
        watchBtn.classList.remove('watching');
        watchBtn.textContent = '🔔 Watch for recovery';
        showToast('Stopped watching ' + currentDomain);
      } else {
        await chrome.runtime.sendMessage({ type: 'watchRecovery', domain: currentDomain });
        watchBtn.classList.add('watching');
        watchBtn.textContent = '🔔 Watching…';
        showToast('Watching ' + currentDomain + ' for recovery');
      }
    });

    copyReportBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(buildReport()); showToast('Report copied!'); }
      catch { showToast('Could not copy'); }
    });

    // History
    clearHistoryBtn.addEventListener('click', async () => {
      if (window.IIDStorage) {
        await window.IIDStorage.clearHistory();
        renderHistory();
        showToast('History cleared');
      }
    });

    exportCsvBtn.addEventListener('click', async () => {
      if (!window.IIDStorage) return;
      const entries = await window.IIDStorage.getHistory();
      const csv = window.IIDStorage.exportHistoryCsv(entries);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'isitdown-history.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      showToast('CSV exported');
    });

    // Monitor
    addMonitorBtn.addEventListener('click', async () => {
      if (!currentDomain) return;
      const result = await chrome.runtime.sendMessage({ type: 'addMonitor', domain: currentDomain });
      if (result?.success) {
        showToast('Added ' + currentDomain + ' to monitor list');
        renderMonitors();
      } else {
        showToast('Already monitoring or limit reached');
      }
    });
  }

  /* ─── Init ────────────────────────────────────────────── */
  async function init() {
    bindEvents();
    startAgoTimer();

    // Show all panels unconditionally
    show(historyPanel);
    show(monitorPanel);
    renderHistory();
    renderMonitors();

    // Get active tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const domain = tab?.url ? normalizeDomain(tab.url) : null;

      if (!domain) {
        domainText.textContent = 'Not a checkable page';
        verdictLabel.textContent = 'Not supported';
        verdictSub.textContent = 'Open a website to check its status';
        return;
      }

      currentDomain = domain;
      domainText.textContent = domain;
      checkBtn.disabled = false;
      addMonitorBtn.disabled = false;

      // Check watch status
      const watching = await chrome.runtime.sendMessage({ type: 'getWatching' });
      if (watching?.some?.(w => w.domain === domain)) {
        watchBtn.classList.add('watching');
        watchBtn.textContent = '🔔 Watching…';
      }
    } catch {
      domainText.textContent = 'Cannot read tab';
      verdictSub.textContent = 'Unable to access the current tab';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
