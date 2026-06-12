import { hostnameMatches, hostnameOf } from './match';
import { activeTimeBlocks } from './schedule';
import type { AppState, SideQuest } from './types';

export interface BlockDecision {
  blocked: boolean;
  /** Quest ids eligible for the active time blocks that matched. */
  questIds: string[];
}

const NOT_BLOCKED: BlockDecision = { blocked: false, questIds: [] };

export function activeAdHocSessions(state: AppState, now: Date): AppState['adHocSessions'] {
  return state.adHocSessions.filter((s) => s.endsAt > now.getTime());
}

export function decideBlock(state: AppState, url: string, now: Date): BlockDecision {
  const hostname = hostnameOf(url);
  if (!hostname) return NOT_BLOCKED;

  // Enforcement comes from scheduled time blocks and from user-started ad hoc
  // sessions; sessions don't restrict quests, so any quest may be offered.
  const sources: { blockListIds: string[]; questIds: string[] }[] = [
    ...activeTimeBlocks(state.timeBlocks, now),
    ...activeAdHocSessions(state, now).map((s) => ({
      blockListIds: s.blockListIds,
      questIds: [],
    })),
  ];

  const questIds = new Set<string>();
  let matched = false;
  for (const source of sources) {
    const sites = state.blockLists
      .filter((bl) => source.blockListIds.includes(bl.id))
      .flatMap((bl) => bl.sites);
    if (sites.some((site) => hostnameMatches(hostname, site))) {
      matched = true;
      for (const q of source.questIds) questIds.add(q);
    }
  }
  if (!matched) return NOT_BLOCKED;

  const hasPass = state.passes.some(
    (p) => p.expiresAt > now.getTime() && hostnameMatches(hostname, p.hostname)
  );
  if (hasPass) return NOT_BLOCKED;

  return { blocked: true, questIds: [...questIds] };
}

/**
 * The quests the user may choose from for a block decision: the ones the
 * matching time blocks named, or every configured quest if none were.
 */
export function eligibleQuests(state: AppState, questIds: string[]): SideQuest[] {
  const named = questIds
    .map((id) => state.quests.find((q) => q.id === id))
    .filter((q): q is SideQuest => q !== undefined);
  return named.length > 0 ? named : state.quests;
}
