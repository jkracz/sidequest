import { hostnameMatches, hostnameOf } from './match';
import { activeTimeBlocks } from './schedule';
import type { AppState, SideQuest } from './types';

export interface BlockDecision {
  blocked: boolean;
  /** Quest ids eligible for the active time blocks that matched. */
  questIds: string[];
  /** Ad hoc sessions do not choose quests, so they allow any configured quest. */
  allowAnyQuest: boolean;
}

const NOT_BLOCKED: BlockDecision = { blocked: false, questIds: [], allowAnyQuest: false };

export function activeAdHocSessions(state: AppState, now: Date): AppState['adHocSessions'] {
  return state.adHocSessions.filter((s) => s.endsAt > now.getTime());
}

export function decideBlock(state: AppState, url: string, now: Date): BlockDecision {
  const hostname = hostnameOf(url);
  if (!hostname) return NOT_BLOCKED;

  const sources: { blockListIds: string[]; questIds: string[]; allowAnyQuest: boolean }[] = [
    ...activeTimeBlocks(state.timeBlocks, now).map((tb) => ({ ...tb, allowAnyQuest: false })),
    ...activeAdHocSessions(state, now).map((s) => ({
      blockListIds: s.blockListIds,
      questIds: [],
      allowAnyQuest: true,
    })),
  ];

  const questIds = new Set<string>();
  let allowAnyQuest = false;
  let matched = false;
  for (const source of sources) {
    const sites = state.blockLists
      .filter((bl) => source.blockListIds.includes(bl.id))
      .flatMap((bl) => bl.sites);
    if (sites.some((site) => hostnameMatches(hostname, site))) {
      matched = true;
      if (source.allowAnyQuest) allowAnyQuest = true;
      for (const q of source.questIds) questIds.add(q);
    }
  }
  if (!matched) return NOT_BLOCKED;

  const hasPass = state.passes.some(
    (p) => p.expiresAt > now.getTime() && hostnameMatches(hostname, p.hostname)
  );
  if (hasPass) return NOT_BLOCKED;

  return { blocked: true, questIds: [...questIds], allowAnyQuest };
}

/**
 * The quests the user may choose from for a block decision: every configured
 * quest for ad hoc sessions, or only the ones matching scheduled blocks named.
 */
export function eligibleQuests(state: AppState, decision: BlockDecision): SideQuest[] {
  if (decision.allowAnyQuest) return state.quests;
  const named = decision.questIds
    .map((id) => state.quests.find((q) => q.id === id))
    .filter((q): q is SideQuest => q !== undefined);
  return named;
}
