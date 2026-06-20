import type { FC } from 'react';
import { kindOf } from './registry';
import type { QuestRuntimeContext, QuestRuntimeProps } from './types';
import type { AppState, QuestResult, SideQuest } from '../shared/types';

/** URL params that hold a quest's in-progress state, cleared when the quest changes. */
const PROGRESS_PARAMS = ['startedAt', 'count', 'card'];

function numberParam(name: string): number | undefined {
  const raw = new URLSearchParams(window.location.search).get(name);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function updateUrlParams(updates: Record<string, string | number | null>): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  }
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

/** Drop any leftover progress so a freshly chosen quest starts clean. */
export function resetQuestProgress(): void {
  updateUrlParams(Object.fromEntries(PROGRESS_PARAMS.map((p) => [p, null])));
}

function getDraft(key: string): string {
  try {
    return window.sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function setDraft(key: string, text: string): void {
  try {
    if (text) window.sessionStorage.setItem(key, text);
    else window.sessionStorage.removeItem(key);
  } catch {
    // Draft persistence is best-effort; the quest still works without it.
  }
}

const runtimeContext: QuestRuntimeContext = {
  num: numberParam,
  setNum: (name, value) => updateUrlParams({ [name]: value }),
  draft: getDraft,
  setDraft,
};

/** Renders the chosen quest's Runtime by looking it up in the registry. */
export function QuestRunner({
  quest,
  state,
  target,
  onComplete,
}: {
  quest: SideQuest;
  state: AppState;
  target: string;
  onComplete: (result: QuestResult) => void;
}) {
  const { Runtime } = kindOf(quest);
  // The registry is keyed to the SideQuest union; `quest` is the matching arm.
  const Render = Runtime as FC<QuestRuntimeProps>;
  return (
    <Render
      key={quest.id}
      quest={quest}
      state={state}
      target={target}
      ctx={runtimeContext}
      onComplete={onComplete}
    />
  );
}
