import { DEFAULT_PROMPTS } from '../quests/kinds';
import type {
  AppState,
  CounterConfig,
  FlashcardConfig,
  FlashcardItem,
  HistoryEntry,
  QuestType,
  ReflectionConfig,
  ResistedVisit,
  SideQuest,
  TimerConfig,
} from './types';

export const SIDEQUEST_EXPORT_APP = 'sidequest';
export const SIDEQUEST_EXPORT_VERSION = 1;

export type ExportKind = 'quests' | 'quest-log';
export type ImportMode = 'merge' | 'replace';

interface ExportEnvelopeBase<TKind extends ExportKind, TData> {
  app: typeof SIDEQUEST_EXPORT_APP;
  kind: TKind;
  version: typeof SIDEQUEST_EXPORT_VERSION;
  exportedAt: string;
  data: TData;
}

export type QuestExportEnvelope = ExportEnvelopeBase<'quests', { quests: SideQuest[] }>;
export type QuestLogExportEnvelope = ExportEnvelopeBase<
  'quest-log',
  { history: HistoryEntry[]; resists: ResistedVisit[] }
>;
export type SideQuestExportEnvelope = QuestExportEnvelope | QuestLogExportEnvelope;

export interface ParsedImport {
  kind: ExportKind;
  quests: SideQuest[];
  history: HistoryEntry[];
  resists: ResistedVisit[];
  summary: ImportSummary;
}

export interface ImportSummary {
  kind: ExportKind;
  quests: number;
  history: number;
  resists: number;
  firstActivityAt: number | null;
  lastActivityAt: number | null;
}

export interface AppliedImport {
  changes: Partial<AppState>;
  kind: ExportKind;
  mode: ImportMode;
  addedQuests: number;
  replacedQuests: number;
  skippedQuests: number;
  addedHistory: number;
  replacedHistory: number;
  skippedHistory: number;
  addedResists: number;
  replacedResists: number;
  skippedResists: number;
  reassignedQuestIds: number;
}

class ImportFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportFormatError';
  }
}

const CSV_COLUMNS = [
  'event_type',
  'created_at',
  'created_at_ms',
  'hostname',
  'target_url',
  'quest_id',
  'quest_name',
  'quest_type',
  'minutes_earned',
  'result_summary',
  'reflection_prompt',
  'reflection_text',
  'timer_seconds',
  'counter_count',
  'counter_unit',
  'flashcards_reviewed',
  'flashcards_correct',
  'flashcards_missed',
  'flashcards_cards',
] as const;

type CsvColumn = (typeof CSV_COLUMNS)[number];
type CsvRow = Record<CsvColumn, string>;

export function createQuestExport(state: AppState, now = new Date()): QuestExportEnvelope {
  return {
    app: SIDEQUEST_EXPORT_APP,
    kind: 'quests',
    version: SIDEQUEST_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    data: {
      quests: cloneJson(state.quests),
    },
  };
}

export function createQuestLogExport(state: AppState, now = new Date()): QuestLogExportEnvelope {
  return {
    app: SIDEQUEST_EXPORT_APP,
    kind: 'quest-log',
    version: SIDEQUEST_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    data: {
      history: cloneJson(state.history),
      resists: cloneJson(state.resists),
    },
  };
}

export function stringifyExport(envelope: SideQuestExportEnvelope): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

export function exportFileName(kind: ExportKind | 'quest-log-csv', now = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  if (kind === 'quests') return `sidequest-quests-${date}.json`;
  if (kind === 'quest-log') return `sidequest-quest-log-${date}.json`;
  return `sidequest-quest-log-${date}.csv`;
}

export function createQuestLogCsv(state: AppState): string {
  const rows = [
    ...state.history.map(historyEntryToCsvRow),
    ...state.resists.map(resistedVisitToCsvRow),
  ].sort((a, b) => Number(b.created_at_ms) - Number(a.created_at_ms));

  return [
    CSV_COLUMNS.join(','),
    ...rows.map((row) => CSV_COLUMNS.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n');
}

export function parseSideQuestImport(jsonText: string): ParsedImport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new ImportFormatError('The selected file is not valid JSON.');
  }

  if (!isRecord(parsed)) {
    throw new ImportFormatError('The selected file is not a SideQuest export.');
  }
  if (parsed.app !== SIDEQUEST_EXPORT_APP) {
    throw new ImportFormatError('The selected file is not a SideQuest export.');
  }
  if (parsed.version !== SIDEQUEST_EXPORT_VERSION) {
    throw new ImportFormatError('This SideQuest export version is not supported.');
  }
  if (parsed.kind !== 'quests' && parsed.kind !== 'quest-log') {
    throw new ImportFormatError('This SideQuest export type is not supported.');
  }
  if (!isRecord(parsed.data)) {
    throw new ImportFormatError('This SideQuest export is missing its data.');
  }

  if (parsed.kind === 'quests') {
    const quests = parseArray(parsed.data.quests, normalizeQuest, 'quests');
    return {
      kind: 'quests',
      quests,
      history: [],
      resists: [],
      summary: summarizeImport('quests', quests, [], []),
    };
  }

  const history = parseArray(parsed.data.history, normalizeHistoryEntry, 'history');
  const resists = parseArray(parsed.data.resists, normalizeResistedVisit, 'resists');
  return {
    kind: 'quest-log',
    quests: [],
    history,
    resists,
    summary: summarizeImport('quest-log', [], history, resists),
  };
}

export function applyImportedData(
  state: AppState,
  parsed: ParsedImport,
  mode: ImportMode
): AppliedImport {
  if (parsed.kind === 'quests') return applyImportedQuests(state, parsed.quests, mode);
  return applyImportedQuestLog(state, parsed.history, parsed.resists, mode);
}

export function describeImportSummary(summary: ImportSummary): string {
  if (summary.kind === 'quests') {
    return `${summary.quests} ${pluralize('quest', summary.quests)}`;
  }

  const parts = [
    `${summary.history} completed ${pluralize('quest', summary.history)}`,
    `${summary.resists} resisted ${pluralize('visit', summary.resists)}`,
  ];
  const range = formatActivityRange(summary);
  return range ? `${parts.join(', ')} from ${range}` : parts.join(', ');
}

export function describeAppliedImport(result: AppliedImport): string {
  if (result.kind === 'quests') {
    if (result.mode === 'replace') {
      return `Replaced quests with ${result.replacedQuests} ${pluralize(
        'imported quest',
        result.replacedQuests
      )}.`;
    }

    const suffix =
      result.reassignedQuestIds > 0
        ? ` ${result.reassignedQuestIds} ${pluralize(
            'ID was',
            result.reassignedQuestIds,
            'IDs were'
          )} changed to avoid conflicts.`
        : '';
    return `Added ${result.addedQuests} ${pluralize(
      'quest',
      result.addedQuests
    )}; skipped ${result.skippedQuests} existing ${pluralize(
      'quest',
      result.skippedQuests
    )}.${suffix}`;
  }

  if (result.mode === 'replace') {
    return `Replaced the quest log with ${result.replacedHistory} completed ${pluralize(
      'quest',
      result.replacedHistory
    )} and ${result.replacedResists} resisted ${pluralize('visit', result.replacedResists)}.`;
  }

  return `Added ${result.addedHistory} completed ${pluralize(
    'quest',
    result.addedHistory
  )} and ${result.addedResists} resisted ${pluralize(
    'visit',
    result.addedResists
  )}; skipped ${result.skippedHistory + result.skippedResists} existing ${pluralize(
    'record',
    result.skippedHistory + result.skippedResists
  )}.`;
}

function applyImportedQuests(
  state: AppState,
  quests: SideQuest[],
  mode: ImportMode
): AppliedImport {
  if (mode === 'replace') {
    const questIds = new Set(quests.map((quest) => quest.id));
    return {
      changes: {
        quests: cloneJson(quests),
        timeBlocks: state.timeBlocks.map((block) => ({
          ...block,
          questIds: block.questIds.filter((id) => questIds.has(id)),
        })),
      },
      kind: 'quests',
      mode,
      addedQuests: 0,
      replacedQuests: quests.length,
      skippedQuests: 0,
      addedHistory: 0,
      replacedHistory: 0,
      skippedHistory: 0,
      addedResists: 0,
      replacedResists: 0,
      skippedResists: 0,
      reassignedQuestIds: 0,
    };
  }

  const nextQuests = cloneJson(state.quests);
  const existingIds = new Set(nextQuests.map((quest) => quest.id));
  let addedQuests = 0;
  let skippedQuests = 0;
  let reassignedQuestIds = 0;

  for (const imported of quests) {
    const existing = nextQuests.find((quest) => quest.id === imported.id);
    if (!existing) {
      nextQuests.push(cloneJson(imported));
      existingIds.add(imported.id);
      addedQuests++;
      continue;
    }

    if (sameJson(existing, imported)) {
      skippedQuests++;
      continue;
    }

    const reassigned = { ...cloneJson(imported), id: uniqueId(imported.id, existingIds) };
    existingIds.add(reassigned.id);
    nextQuests.push(reassigned);
    addedQuests++;
    reassignedQuestIds++;
  }

  return {
    changes: { quests: nextQuests },
    kind: 'quests',
    mode,
    addedQuests,
    replacedQuests: 0,
    skippedQuests,
    addedHistory: 0,
    replacedHistory: 0,
    skippedHistory: 0,
    addedResists: 0,
    replacedResists: 0,
    skippedResists: 0,
    reassignedQuestIds,
  };
}

function applyImportedQuestLog(
  state: AppState,
  history: HistoryEntry[],
  resists: ResistedVisit[],
  mode: ImportMode
): AppliedImport {
  if (mode === 'replace') {
    return {
      changes: {
        history: cloneJson(history),
        resists: cloneJson(resists),
      },
      kind: 'quest-log',
      mode,
      addedQuests: 0,
      replacedQuests: 0,
      skippedQuests: 0,
      addedHistory: 0,
      replacedHistory: history.length,
      skippedHistory: 0,
      addedResists: 0,
      replacedResists: resists.length,
      skippedResists: 0,
      reassignedQuestIds: 0,
    };
  }

  const nextHistory = cloneJson(state.history);
  const historyIds = new Set(nextHistory.map((entry) => entry.id));
  let addedHistory = 0;
  let skippedHistory = 0;

  for (const entry of history) {
    if (historyIds.has(entry.id)) {
      skippedHistory++;
      continue;
    }
    nextHistory.push(cloneJson(entry));
    historyIds.add(entry.id);
    addedHistory++;
  }

  const nextResists = cloneJson(state.resists);
  const resistKeys = new Set(nextResists.map(resistedVisitKey));
  let addedResists = 0;
  let skippedResists = 0;

  for (const resist of resists) {
    const key = resistedVisitKey(resist);
    if (resistKeys.has(key)) {
      skippedResists++;
      continue;
    }
    nextResists.push(cloneJson(resist));
    resistKeys.add(key);
    addedResists++;
  }

  return {
    changes: {
      history: nextHistory,
      resists: nextResists,
    },
    kind: 'quest-log',
    mode,
    addedQuests: 0,
    replacedQuests: 0,
    skippedQuests: 0,
    addedHistory,
    replacedHistory: 0,
    skippedHistory,
    addedResists,
    replacedResists: 0,
    skippedResists,
    reassignedQuestIds: 0,
  };
}

function historyEntryToCsvRow(entry: HistoryEntry): CsvRow {
  const base: CsvRow = {
    event_type: 'quest_completed',
    created_at: new Date(entry.createdAt).toISOString(),
    created_at_ms: String(entry.createdAt),
    hostname: entry.hostname,
    target_url: entry.targetUrl,
    quest_id: entry.questId,
    quest_name: entry.questName,
    quest_type: entry.questType,
    minutes_earned: String(entry.minutesEarned),
    result_summary: resultSummary(entry),
    reflection_prompt: '',
    reflection_text: '',
    timer_seconds: '',
    counter_count: '',
    counter_unit: '',
    flashcards_reviewed: '',
    flashcards_correct: '',
    flashcards_missed: '',
    flashcards_cards: '',
  };

  switch (entry.questType) {
    case 'reflection':
      return {
        ...base,
        reflection_prompt: entry.prompt ?? '',
        reflection_text: entry.text,
      };
    case 'timer':
      return {
        ...base,
        timer_seconds: String(entry.seconds),
      };
    case 'counter':
      return {
        ...base,
        counter_count: String(entry.count),
        counter_unit: entry.unit,
      };
    case 'flashcards':
      return {
        ...base,
        flashcards_reviewed: String(entry.reviewed),
        flashcards_correct: entry.correct === undefined ? '' : String(entry.correct),
        flashcards_missed: entry.cards
          ? String(entry.cards.filter((card) => card.missed).length)
          : '',
        flashcards_cards:
          entry.cards
            ?.map((card) => `${card.front} -> ${card.back}${card.missed ? ' (missed)' : ''}`)
            .join('; ') ?? '',
      };
  }
}

function resistedVisitToCsvRow(resist: ResistedVisit): CsvRow {
  return {
    event_type: 'resisted_visit',
    created_at: new Date(resist.at).toISOString(),
    created_at_ms: String(resist.at),
    hostname: resist.hostname,
    target_url: '',
    quest_id: '',
    quest_name: '',
    quest_type: '',
    minutes_earned: '',
    result_summary: 'Resisted visit',
    reflection_prompt: '',
    reflection_text: '',
    timer_seconds: '',
    counter_count: '',
    counter_unit: '',
    flashcards_reviewed: '',
    flashcards_correct: '',
    flashcards_missed: '',
    flashcards_cards: '',
  };
}

function resultSummary(entry: HistoryEntry): string {
  switch (entry.questType) {
    case 'reflection':
      return entry.prompt ? `Reflection: ${entry.prompt}` : 'Reflection completed';
    case 'timer':
      return `Waited ${entry.seconds} ${pluralize('second', entry.seconds)}`;
    case 'counter':
      return `${entry.count} ${entry.unit}`;
    case 'flashcards':
      if (entry.correct === undefined) {
        return `${entry.reviewed} ${pluralize('card', entry.reviewed)} reviewed`;
      }
      return `${entry.correct}/${entry.reviewed} correct`;
  }
}

function normalizeQuest(raw: unknown): SideQuest | null {
  if (!isRecord(raw)) return null;
  const type = normalizeQuestType(raw.type);
  const id = normalizeNonEmptyString(raw.id);
  const name = normalizeNonEmptyString(raw.name);
  const passDurationMinutes = normalizePositiveNumber(raw.passDurationMinutes);
  if (!type || !id || !name || passDurationMinutes === null) return null;

  const base = { id, name, passDurationMinutes };
  switch (type) {
    case 'reflection':
      return { ...base, type, config: normalizeReflectionConfig(raw.config) };
    case 'timer':
      return { ...base, type, config: normalizeTimerConfig(raw.config) };
    case 'counter':
      return { ...base, type, config: normalizeCounterConfig(raw.config) };
    case 'flashcards':
      return { ...base, type, config: normalizeFlashcardConfig(raw.config) };
  }
}

function normalizeHistoryEntry(raw: unknown): HistoryEntry | null {
  if (!isRecord(raw)) return null;
  const type = normalizeQuestType(raw.questType);
  const id = normalizeNonEmptyString(raw.id);
  const questId = normalizeNonEmptyString(raw.questId);
  const questName = normalizeNonEmptyString(raw.questName);
  const hostname = normalizeNonEmptyString(raw.hostname);
  const targetUrl = normalizeString(raw.targetUrl);
  const createdAt = normalizeFiniteNumber(raw.createdAt);
  const minutesEarned = normalizePositiveNumber(raw.minutesEarned);
  if (
    !type ||
    !id ||
    !questId ||
    !questName ||
    !hostname ||
    targetUrl === null ||
    createdAt === null ||
    minutesEarned === null
  ) {
    return null;
  }

  const base = { id, questId, questName, hostname, targetUrl, createdAt, minutesEarned };
  switch (type) {
    case 'reflection': {
      const text = normalizeString(raw.text);
      if (text === null) return null;
      const prompt = normalizeOptionalString(raw.prompt);
      return prompt === undefined
        ? { ...base, questType: type, text }
        : { ...base, questType: type, text, prompt };
    }
    case 'timer': {
      const seconds = normalizePositiveNumber(raw.seconds);
      return seconds === null ? null : { ...base, questType: type, seconds };
    }
    case 'counter': {
      const count = normalizePositiveNumber(raw.count);
      const unit = normalizeNonEmptyString(raw.unit);
      return count === null || !unit ? null : { ...base, questType: type, count, unit };
    }
    case 'flashcards': {
      const reviewed = normalizePositiveNumber(raw.reviewed);
      if (reviewed === null) return null;
      const correct = normalizeOptionalNonNegativeNumber(raw.correct);
      const cards = normalizeOptionalFlashcardResults(raw.cards);
      return {
        ...base,
        questType: type,
        reviewed,
        ...(correct === undefined ? {} : { correct }),
        ...(cards === undefined ? {} : { cards }),
      };
    }
  }
}

function normalizeResistedVisit(raw: unknown): ResistedVisit | null {
  if (!isRecord(raw)) return null;
  const hostname = normalizeNonEmptyString(raw.hostname);
  const at = normalizeFiniteNumber(raw.at);
  if (!hostname || at === null) return null;
  return { hostname, at };
}

function normalizeReflectionConfig(raw: unknown): ReflectionConfig {
  const cfg = isRecord(raw) ? raw : {};
  const prompts = Array.isArray(cfg.prompts)
    ? cfg.prompts.filter((prompt): prompt is string => typeof prompt === 'string')
    : typeof cfg.prompt === 'string'
      ? [cfg.prompt]
      : [...DEFAULT_PROMPTS];
  return {
    prompts: prompts.length > 0 ? prompts : [...DEFAULT_PROMPTS],
    minChars: normalizePositiveNumber(cfg.minChars) ?? 150,
  };
}

function normalizeTimerConfig(raw: unknown): TimerConfig {
  const cfg = isRecord(raw) ? raw : {};
  return {
    seconds: normalizePositiveNumber(cfg.seconds) ?? 60,
  };
}

function normalizeCounterConfig(raw: unknown): CounterConfig {
  const cfg = isRecord(raw) ? raw : {};
  return {
    target: normalizePositiveNumber(cfg.target) ?? normalizePositiveNumber(cfg.reps) ?? 10,
    unit: normalizeNonEmptyString(cfg.unit) ?? 'push-up',
    prompt: normalizeNonEmptyString(cfg.prompt) ?? 'Drop and give yourself',
  };
}

function normalizeFlashcardConfig(raw: unknown): FlashcardConfig {
  const cfg = isRecord(raw) ? raw : {};
  const cards = Array.isArray(cfg.cards)
    ? cfg.cards
        .map((card, index) => normalizeFlashcardItem(card, index))
        .filter((card): card is FlashcardItem => card !== null)
    : [];
  return {
    cards,
    cardsPerPass: normalizePositiveNumber(cfg.cardsPerPass) ?? 5,
    order: cfg.order === 'sequential' ? 'sequential' : 'random',
    requiredCorrect: normalizeOptionalPositiveNumber(cfg.requiredCorrect),
  };
}

function normalizeFlashcardItem(raw: unknown, index: number): FlashcardItem | null {
  if (!isRecord(raw)) return null;
  const front = normalizeString(raw.front);
  const back = normalizeString(raw.back);
  if (front === null || back === null) return null;
  return {
    id: normalizeNonEmptyString(raw.id) ?? `imported-card-${index + 1}`,
    front,
    back,
  };
}

function normalizeOptionalFlashcardResults(
  raw: unknown
): { front: string; back: string; missed: boolean }[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return undefined;

  const cards = raw
    .map((card) => {
      if (!isRecord(card)) return null;
      const front = normalizeString(card.front);
      const back = normalizeString(card.back);
      if (front === null || back === null || typeof card.missed !== 'boolean') return null;
      return { front, back, missed: card.missed };
    })
    .filter((card): card is { front: string; back: string; missed: boolean } => card !== null);

  return cards.length > 0 ? cards : undefined;
}

function parseArray<T>(
  raw: unknown,
  normalize: (value: unknown) => T | null,
  label: string
): T[] {
  if (!Array.isArray(raw)) {
    throw new ImportFormatError(`This SideQuest export has invalid ${label} data.`);
  }
  const normalized = raw.map(normalize);
  if (normalized.some((value) => value === null)) {
    throw new ImportFormatError(`This SideQuest export has invalid ${label} data.`);
  }
  return normalized as T[];
}

function summarizeImport(
  kind: ExportKind,
  quests: SideQuest[],
  history: HistoryEntry[],
  resists: ResistedVisit[]
): ImportSummary {
  const activityTimes = [...history.map((entry) => entry.createdAt), ...resists.map((r) => r.at)];
  return {
    kind,
    quests: quests.length,
    history: history.length,
    resists: resists.length,
    firstActivityAt: activityTimes.length === 0 ? null : Math.min(...activityTimes),
    lastActivityAt: activityTimes.length === 0 ? null : Math.max(...activityTimes),
  };
}

function formatActivityRange(summary: ImportSummary): string | null {
  if (summary.firstActivityAt === null || summary.lastActivityAt === null) return null;
  const first = new Date(summary.firstActivityAt).toLocaleDateString();
  const last = new Date(summary.lastActivityAt).toLocaleDateString();
  return first === last ? first : `${first} - ${last}`;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function uniqueId(baseId: string, existingIds: Set<string>): string {
  let suffix = 1;
  let candidate = `${baseId}-imported`;
  while (existingIds.has(candidate)) {
    suffix++;
    candidate = `${baseId}-imported-${suffix}`;
  }
  return candidate;
}

function resistedVisitKey(resist: ResistedVisit): string {
  return `${resist.hostname}\u0000${resist.at}`;
}

function csvEscape(value: string): string {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

function pluralize(singular: string, count: number, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function normalizeQuestType(value: unknown): QuestType | null {
  return value === 'reflection' || value === 'timer' || value === 'counter' || value === 'flashcards'
    ? value
    : null;
}

function normalizeNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function normalizeFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizePositiveNumber(value: unknown): number | null {
  const number = normalizeFiniteNumber(value);
  return number !== null && number > 0 ? number : null;
}

function normalizeNonNegativeNumber(value: unknown): number | null {
  const number = normalizeFiniteNumber(value);
  return number !== null && number >= 0 ? number : null;
}

function normalizeOptionalPositiveNumber(value: unknown): number | undefined {
  return value === undefined ? undefined : normalizePositiveNumber(value) ?? undefined;
}

function normalizeOptionalNonNegativeNumber(value: unknown): number | undefined {
  return value === undefined ? undefined : normalizeNonNegativeNumber(value) ?? undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
