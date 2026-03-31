/* ═══════════════════════════════════════════════════════════
   IsItDown — Background Service Worker
   Passive badge · Site check · Recovery watcher · Monitor list
   ═══════════════════════════════════════════════════════════ */

const CHECK_TIMEOUT = 8000;
const SLOW_THRESHOLD = 3000;
const BADGE_SLOW_THRESHOLD = 4000;
const MONITOR_INTERVAL = 5;
const RECOVERY_INTERVAL = 0.5;

/* ─── Passive Toolbar Badge ─────────────────────────────── */

const tabTimings = new Map();

chrome.webNavigation.onCommitted.addListener((details) => {     //Tracks the tabe timings 
  if (details.frameId !== 0) return;
  tabTimings.set(details.tabId, Date.now());
  chrome.action.setBadgeText({ text: '', tabId: details.tabId });
});

chrome.webNavigation.onCompleted.addListener((details) => {             //Checks the time taken for the page to load and sets badge if it exceeds threshold
  if (details.frameId !== 0) return;
  const start = tabTimings.get(details.tabId);
  if (!start) return;
  const elapsed = Date.now() - start;
  tabTimings.delete(details.tabId);
  if (elapsed > BADGE_SLOW_THRESHOLD) {
    chrome.action.setBadgeText({ text: '!', tabId: details.tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#EF9F27', tabId: details.tabId });
  }
});

chrome.webNavigation.onErrorOccurred.addListener((details) => {
  if (details.frameId !== 0) return;
  tabTimings.delete(details.tabId);
  chrome.action.setBadgeText({ text: '?', tabId: details.tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#E24B4A', tabId: details.tabId });
});

chrome.tabs.onRemoved.addListener((tabId) => tabTimings.delete(tabId));

/* ─── Site Check Engine ─────────────────────────────────── */

async function checkSite(domain) {
  const [localRes, dnsRes] = await Promise.allSettled([
    performLocalCheck(domain),
    performDnsCheck(domain)
  ]);
  const local = localRes.status === 'fulfilled' ? localRes.value : { ok: false, status: 0, ms: null, error: 'check failed' };
  const dns = dnsRes.status === 'fulfilled' ? dnsRes.value : { ok: false };
  return buildVerdict(domain, local, dns);
}

async function performLocalCheck(domain) {
  const overallStart = Date.now();
  const methods = ['HEAD', 'GET'];
  let lastError = null;

  for (const method of methods) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), CHECK_TIMEOUT);
      const res = await fetch(`https://${domain}`, {
        method, cache: 'no-store', credentials: 'omit',
        referrerPolicy: 'no-referrer', signal: controller.signal
      });
      clearTimeout(tid);
      return { ok: true, status: res.status, ms: Date.now() - start, error: null };
    } catch (e) {
      lastError = e.message || 'Unknown error';
    }
  }
  return { ok: false, status: 0, ms: Date.now() - overallStart, error: lastError };
}

async function performDnsCheck(domain) {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
      { signal: controller.signal }
    );
    clearTimeout(tid);
    const data = await res.json();
    return { ok: data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0 };
  } catch { return { ok: false }; }
}

function buildVerdict(domain, local, dns) {
  const base = { domain, timestamp: Date.now(), local, dns };

  if (local.ok && local.status >= 500) {
    return { ...base, verdict: 'down', label: 'Server Error', sublabel: `Returned HTTP ${local.status}` };
  }
  if (local.ok && local.ms > SLOW_THRESHOLD) {
    return { ...base, verdict: 'slow', label: 'Degraded Performance', sublabel: `Responding slowly — ${local.ms}ms` };
  }
  if (local.ok) {
    return { ...base, verdict: 'up', label: 'All Good', sublabel: `Responded in ${local.ms}ms` };
  }
  // Site unreachable
  if (dns.ok) {
    return { ...base, verdict: 'down', label: 'Appears Down', sublabel: 'DNS resolves but server is not responding' };
  }
  return { ...base, verdict: 'down', label: 'Site Unreachable', sublabel: 'Could not reach the site or resolve DNS' };
}

/* ─── Recovery Watcher ──────────────────────────────────── */

async function startRecoveryWatch(domain) {
  await chrome.storage.local.set({ [`watch_${domain}`]: { domain, startedAt: Date.now() } });
  chrome.alarms.create(`recovery_${domain}`, { delayInMinutes: RECOVERY_INTERVAL, periodInMinutes: RECOVERY_INTERVAL });
  return { success: true };
}

async function stopRecoveryWatch(domain) {
  await chrome.alarms.clear(`recovery_${domain}`);
  await chrome.storage.local.remove(`watch_${domain}`);
  return { success: true };
}

async function getWatchingDomains() {
  const all = await chrome.storage.local.get(null);
  return Object.entries(all).filter(([k]) => k.startsWith('watch_')).map(([, v]) => v);
}

/* ─── Monitor List ──────────────────────────────────────── */

async function checkMonitoredSites() {
  const data = await chrome.storage.local.get('iid_monitors');
  const monitors = data.iid_monitors || [];
  if (!monitors.length) return;

  let anyDown = false;
  const results = [];
  for (const site of monitors) {
    try {
      const r = await checkSite(site.domain);
      results.push({ domain: site.domain, lastCheck: r });
      if (r.verdict === 'down') anyDown = true;
    } catch (e) {
      results.push({ domain: site.domain, lastCheck: { verdict: 'error', error: e.message } });
    }
  }
  await chrome.storage.local.set({ iid_monitor_results: results });

  if (anyDown) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#E24B4A' });
  }
}

async function setupMonitorAlarm() {
  const data = await chrome.storage.local.get('iid_monitors');
  if ((data.iid_monitors || []).length > 0) {
    chrome.alarms.create('monitor_check', { delayInMinutes: 1, periodInMinutes: MONITOR_INTERVAL });
  }
}

/* ─── Alarm Router ──────────────────────────────────────── */

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('recovery_')) {
    const domain = alarm.name.replace('recovery_', '');
    try {
      const result = await checkSite(domain);
      if (result.verdict === 'up' || result.verdict === 'slow') {
        const d = await chrome.storage.local.get(`watch_${domain}`);
        const state = d[`watch_${domain}`];
        const mins = state ? Math.round((Date.now() - state.startedAt) / 60000) : 0;
        chrome.notifications.create(`recovery_${domain}`, {
          type: 'basic', iconUrl: 'assets/icons/icon128.png',
          title: `${domain} is back online`,
          message: `Was down for ${mins} minute(s). All systems normal.`
        });
        await stopRecoveryWatch(domain);
      }
    } catch { /* retry next tick */ }
  }
  if (alarm.name === 'monitor_check') {
    checkMonitoredSites().catch(() => {});
  }
});

/* ─── Message Handler ───────────────────────────────────── */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handlers = {
    check: () => checkSite(msg.domain),
    watchRecovery: () => startRecoveryWatch(msg.domain),
    stopWatchRecovery: () => stopRecoveryWatch(msg.domain),
    getWatching: () => getWatchingDomains(),
    addMonitor: async () => {
      const d = await chrome.storage.local.get('iid_monitors');
      const list = d.iid_monitors || [];
      if (list.length >= 10 || list.some(m => m.domain === msg.domain)) return { success: false };
      list.push({ domain: msg.domain, addedAt: Date.now() });
      await chrome.storage.local.set({ iid_monitors: list });
      await setupMonitorAlarm();
      return { success: true };
    },
    removeMonitor: async () => {
      const d = await chrome.storage.local.get('iid_monitors');
      const list = (d.iid_monitors || []).filter(m => m.domain !== msg.domain);
      await chrome.storage.local.set({ iid_monitors: list });
      if (!list.length) chrome.alarms.clear('monitor_check');
      return { success: true };
    },
    getMonitors: async () => {
      const d = await chrome.storage.local.get(['iid_monitors', 'iid_monitor_results']);
      return { monitors: d.iid_monitors || [], results: d.iid_monitor_results || [] };
    }
  };

  const handler = handlers[msg.type];
  if (handler) {
    handler().then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

/* ─── Startup ───────────────────────────────────────────── */

chrome.runtime.onInstalled.addListener(() => setupMonitorAlarm());
chrome.runtime.onStartup.addListener(() => setupMonitorAlarm());
