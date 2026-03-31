/* ═══════════════════════════════════════════════════════════
   IsItDown — Storage Helpers
   ═══════════════════════════════════════════════════════════ */

const HISTORY_KEY = 'iid_history';
const MAX_HISTORY = 50;

/* ─── History ───────────────────────────────────────────── */

async function getHistory() {
  const d = await chrome.storage.local.get(HISTORY_KEY);
  const entries = d[HISTORY_KEY] || [];
  return entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

async function addHistoryEntry(entry) {
  const d = await chrome.storage.local.get(HISTORY_KEY);
  const entries = d[HISTORY_KEY] || [];
  entries.unshift({
    domain: entry.domain,
    verdict: entry.verdict,
    label: entry.label,
    status: entry.local?.status || 0,
    ms: entry.local?.ms || null,
    dns: entry.dns?.ok ?? false,
    timestamp: entry.timestamp || Date.now()
  });
  await chrome.storage.local.set({ [HISTORY_KEY]: entries.slice(0, MAX_HISTORY) });
}

async function clearHistory() {
  await chrome.storage.local.remove(HISTORY_KEY);
}

function exportHistoryCsv(entries) {
  const header = 'Domain,Verdict,HTTP Status,Response (ms),DNS OK,Timestamp\n';
  const rows = entries.map(e =>
    `"${e.domain}","${e.verdict}",${e.status || ''},${e.ms || ''},${e.dns ? 'Yes' : 'No'},"${new Date(e.timestamp).toISOString()}"`
  ).join('\n');
  return header + rows;
}

/* ─── Expose ────────────────────────────────────────────── */

window.IIDStorage = { getHistory, addHistoryEntry, clearHistory, exportHistoryCsv };
