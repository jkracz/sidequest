import { decideBlock } from '../shared/blocking';
import { hostnameOf } from '../shared/match';
import { nextBlockStart } from '../shared/schedule';
import { getState, persistMigrationIfNeeded, setState } from '../shared/storage';
import type { AppState } from '../shared/types';

const WAKE_ALARM = 'sidequest-wake';

/** Repeat hits on the same hostname within this window log a single intercept. */
const INTERCEPT_DEDUPE_MS = 30_000;

void persistMigrationIfNeeded();

function blockedPageUrl(target: string): string {
  return chrome.runtime.getURL(`src/blocked/index.html?target=${encodeURIComponent(target)}`);
}

// Intercepts are appended read-modify-write; a sweep can block many tabs at
// once, so the writes are chained to keep them from clobbering each other.
let interceptWrites: Promise<unknown> = Promise.resolve();

function logIntercept(hostname: string): void {
  interceptWrites = interceptWrites
    .then(async () => {
      const state = await getState();
      const now = Date.now();
      const recent = state.intercepts.some(
        (i) => i.hostname === hostname && now - i.at < INTERCEPT_DEDUPE_MS
      );
      if (!recent) {
        await setState({ intercepts: [...state.intercepts, { hostname, at: now }] });
      }
    })
    .catch(() => {});
}

async function redirectIfBlocked(tabId: number, url: string, state?: AppState): Promise<void> {
  const s = state ?? (await getState());
  if (decideBlock(s, url, new Date()).blocked) {
    const hostname = hostnameOf(url);
    if (hostname) logIntercept(hostname);
    try {
      await chrome.tabs.update(tabId, { url: blockedPageUrl(url) });
    } catch {
      // Tab may have closed or navigated away; nothing to do.
    }
  }
}

/** Redirect any open tab that is currently in violation. */
async function sweepTabs(): Promise<void> {
  const [state, tabs] = await Promise.all([getState(), chrome.tabs.query({})]);
  await Promise.all(
    tabs
      .filter((tab) => tab.id !== undefined && tab.url)
      .map((tab) => redirectIfBlocked(tab.id!, tab.url!, state))
  );
}

async function pruneExpired(): Promise<void> {
  const state = await getState();
  const now = Date.now();
  const passes = state.passes.filter((p) => p.expiresAt > now);
  const adHocSessions = state.adHocSessions.filter((s) => s.endsAt > now);
  if (
    passes.length !== state.passes.length ||
    adHocSessions.length !== state.adHocSessions.length
  ) {
    await setState({ passes, adHocSessions });
  }
}

/**
 * Schedule a single alarm for the next moment enforcement could change: the
 * next time-block start, the next pass expiry, or the next ad hoc session
 * end, whichever comes first.
 */
async function scheduleWake(): Promise<void> {
  const state = await getState();
  const now = Date.now();
  const candidates: number[] = [];
  const blockStart = nextBlockStart(state.timeBlocks, new Date());
  if (blockStart !== null) candidates.push(blockStart);
  for (const p of state.passes) {
    if (p.expiresAt > now) candidates.push(p.expiresAt);
  }
  for (const s of state.adHocSessions) {
    if (s.endsAt > now) candidates.push(s.endsAt);
  }
  await chrome.alarms.clear(WAKE_ALARM);
  if (candidates.length > 0) {
    chrome.alarms.create(WAKE_ALARM, { when: Math.min(...candidates) + 1000 });
  }
}

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  void redirectIfBlocked(details.tabId, details.url);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) return;
  void redirectIfBlocked(details.tabId, details.url);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== WAKE_ALARM) return;
  void (async () => {
    await pruneExpired();
    await sweepTabs();
    await scheduleWake();
  })();
});

// Config edits, newly earned passes, and ad hoc sessions all change what
// should be enforced and when the next wake is due.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.blockLists || changes.timeBlocks || changes.passes || changes.adHocSessions) {
    void sweepTabs();
    void scheduleWake();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  void sweepTabs();
  void scheduleWake();
});

chrome.runtime.onStartup.addListener(() => {
  void (async () => {
    await pruneExpired();
    await sweepTabs();
    await scheduleWake();
  })();
});
