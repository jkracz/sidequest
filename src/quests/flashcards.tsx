import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Layers, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { NumberInput } from './fields';
import { type Grade, initRound, reduceRound } from './flashcard-round';
import type { QuestKindUi, QuestRuntimeProps } from './types';
import type {
  FlashcardItem,
  FlashcardSideQuest,
  QuestResult,
  SideQuest,
} from '../shared/types';

/** Beyond this a single deck is probably better split up; warn but don't block. */
const SOFT_CARD_LIMIT = 5000;
/** Horizontal drag past this (px) commits a grade; below it the card springs back. */
const SWIPE_THRESHOLD = 90;
/** How far a graded card flies off screen. */
const THROW_X = 800;
/** Card fly-off duration; kept in sync with the CSS transition below. */
const THROW_MS = 300;

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The cards shown this visit. Deterministic in `seed` (the prior completion
 * count) so a reload mid-quest keeps the same cards in the same order.
 */
function pickCards(
  cards: FlashcardItem[],
  n: number,
  order: 'random' | 'sequential',
  seed: number,
): FlashcardItem[] {
  if (cards.length === 0) return [];
  const count = Math.min(Math.max(1, n), cards.length);
  if (order === 'sequential') {
    const offset = (seed * count) % cards.length;
    return Array.from(
      { length: count },
      (_, i) => cards[(offset + i) % cards.length],
    );
  }
  return cards
    .map((c) => ({ c, k: hashString(`${seed}:${c.id}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, count)
    .map((x) => x.c);
}

/** Parse pasted "front<tab>back" (or "front,back") lines into cards. */
export function parseFlashcards(text: string): FlashcardItem[] {
  const out: FlashcardItem[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let sep = trimmed.indexOf('\t');
    if (sep === -1) sep = trimmed.indexOf(',');
    if (sep === -1) continue;
    const front = trimmed.slice(0, sep).trim();
    const back = trimmed.slice(sep + 1).trim();
    if (front && back) out.push({ id: crypto.randomUUID(), front, back });
  }
  return out;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function EmptyDeckNotice() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 py-2">
        <p className="text-muted-foreground">This deck has no cards yet.</p>
        <Button
          size="lg"
          onClick={() => {
            window.location.href = chrome.runtime.getURL(
              'src/options/index.html?tab=quests',
            );
          }}
        >
          <Settings2 aria-hidden="true" />
          Add cards
        </Button>
      </CardContent>
    </Card>
  );
}

function CardFace({
  children,
  back = false,
}: {
  children: ReactNode;
  back?: boolean;
}) {
  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-border bg-card"
      style={{
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : undefined,
        // Lift the active card off the pile beneath it.
        boxShadow:
          '0 14px 30px -12px rgb(0 0 0 / 0.45), 0 3px 8px -3px rgb(0 0 0 / 0.25)',
      }}
    >
      {/* A faint header rule, like an index card. */}
      <div className="mx-6 mt-6 border-b border-border/60" />
      <div className="flex flex-1 items-center justify-center px-7 pb-7 text-center">
        <span className="text-[1.6rem] leading-snug font-semibold break-words">
          {children}
        </span>
      </div>
    </div>
  );
}

function GradeHint({
  side,
  strength,
}: {
  side: 'left' | 'right';
  strength: number;
}) {
  const right = side === 'right';
  return (
    <span
      aria-hidden="true"
      className={`absolute top-6 rounded-md border-2 px-2.5 py-1 text-sm font-bold tracking-wide uppercase ${
        right
          ? 'right-6 rotate-6 border-mint text-mint'
          : 'left-6 -rotate-6 border-destructive text-destructive'
      }`}
      style={{ opacity: Math.max(0, Math.min(strength, 1)) }}
    >
      {right ? 'Got it' : 'Missed'}
    </span>
  );
}

function FlashcardRuntime({
  quest,
  state,
  onComplete,
}: QuestRuntimeProps<FlashcardSideQuest>) {
  const { cards, cardsPerPass, order, requiredCorrect } = quest.config;
  const completions = state.history.filter(
    (h) => h.questId === quest.id,
  ).length;
  const selected = useMemo(
    () => pickCards(cards, cardsPerPass, order, completions),
    [cards, cardsPerPass, order, completions],
  );
  const numCards = selected.length;
  const required = requiredCorrect
    ? Math.max(1, Math.min(requiredCorrect, numCards))
    : null;
  const reduceMotion = useMemo(prefersReducedMotion, []);

  const [round, dispatch] = useReducer(reduceRound, selected, initRound);
  const [flipped, setFlipped] = useState(false);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<Grade | null>(null);

  const throwTimer = useRef<number | null>(null);
  const pointerStart = useRef<number | null>(null);

  const current = round.pending[0];
  const busy = leaving !== null;

  useEffect(
    () => () => window.clearTimeout(throwTimer.current ?? undefined),
    [],
  );

  const finish = useCallback(() => {
    onComplete({
      questType: 'flashcards',
      reviewed: round.seen.length,
      correct: round.correct,
      cards: round.seen.map((c) => ({
        front: c.front,
        back: c.back,
        missed: round.everMissed.includes(c.id),
      })),
    });
  }, [onComplete, round.seen, round.correct, round.everMissed]);

  const grade = useCallback(
    (result: Grade) => {
      if (busy || !flipped || round.finished) return;
      setDragging(false);
      setLeaving(result);
      if (!reduceMotion) setDrag(result === 'correct' ? THROW_X : -THROW_X);
      const commit = () => {
        dispatch({ result, required });
        setLeaving(null);
        setDrag(0);
        setFlipped(false);
      };
      if (reduceMotion) commit();
      else throwTimer.current = window.setTimeout(commit, THROW_MS);
    },
    [busy, flipped, round.finished, reduceMotion, required],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (round.finished) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          finish();
        }
        return;
      }
      if (!flipped) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          setFlipped(true);
        }
        return;
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        grade('correct');
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        grade('missed');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, round.finished, grade, finish]);

  function onPointerDown(e: ReactPointerEvent) {
    if (!flipped || busy) return;
    pointerStart.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (pointerStart.current === null) return;
    setDrag(e.clientX - pointerStart.current);
  }

  function onPointerUp() {
    if (pointerStart.current === null) return;
    pointerStart.current = null;
    setDragging(false);
    if (Math.abs(drag) > SWIPE_THRESHOLD)
      grade(drag > 0 ? 'correct' : 'missed');
    else setDrag(0);
  }

  if (numCards === 0) return <EmptyDeckNotice />;

  const ease = reduceMotion
    ? 'none'
    : 'transform .3s ease-out, opacity .3s ease-out';
  const behind = round.pending.slice(1, 3);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 py-2">
        {!round.finished && (
          <p className="text-[13px] text-muted-foreground">
            {required != null ? (
              <>
                <strong className="text-mint">{round.correct}</strong> /{' '}
                {required} correct
              </>
            ) : (
              <>
                Card {Math.min(round.faced + 1, numCards)} of {numCards}
              </>
            )}
          </p>
        )}

        {round.finished ? (
          <Results
            correct={round.correct}
            total={round.seen.length}
            cleared={required != null}
            missed={round.everMissed
              .map((id) => selected.find((c) => c.id === id))
              .filter((c): c is FlashcardItem => c !== undefined)}
            passMinutes={quest.passDurationMinutes}
            onFinish={finish}
          />
        ) : (
          <>
            <div
              className="relative h-64 w-full select-none"
              style={{ perspective: '1400px' }}
            >
              {behind
                .map((c, i) => ({ c, depth: i + 1 }))
                .reverse()
                .map(({ c, depth }) => (
                  <div
                    key={c.id}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-xl border border-border bg-card"
                    style={{
                      // A slightly messy pile: each card offset, shrunk, and tilted.
                      transform: `translateY(${depth * 7}px) scale(${1 - depth * 0.045}) rotate(${
                        depth % 2 ? 2.5 : -3
                      }deg)`,
                      opacity: 1 - depth * 0.25,
                      transition: ease,
                      boxShadow: '0 10px 24px -14px rgb(0 0 0 / 0.45)',
                      zIndex: 0,
                    }}
                  />
                ))}

              {current && (
                <div
                  key={current.id}
                  className="absolute inset-0"
                  style={{
                    transform: `translateX(${drag}px) rotate(${drag * 0.035}deg)`,
                    opacity: leaving ? 0 : 1,
                    transition: dragging ? 'none' : ease,
                    touchAction: 'none',
                    cursor: flipped ? 'grab' : 'pointer',
                    zIndex: 2,
                  }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onClick={() => {
                    if (!flipped && !busy) setFlipped(true);
                  }}
                >
                  <div
                    className="relative h-full w-full"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: `rotateY(${flipped ? 180 : 0}deg)`,
                      transition: reduceMotion
                        ? 'none'
                        : 'transform .55s cubic-bezier(0.2, 0.7, 0.2, 1)',
                    }}
                  >
                    <CardFace>{current.front}</CardFace>
                    <CardFace back>{current.back}</CardFace>
                  </div>
                  {/* Tint toward the grade you're swiping into — green right, red left. */}
                  {drag !== 0 && (
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 rounded-xl ${
                        drag > 0 ? 'bg-mint' : 'bg-destructive'
                      }`}
                      style={{
                        opacity:
                          Math.min(Math.abs(drag) / SWIPE_THRESHOLD, 1) * 0.22,
                      }}
                    />
                  )}
                  {flipped && (
                    <>
                      <GradeHint
                        side="right"
                        strength={drag / SWIPE_THRESHOLD}
                      />
                      <GradeHint
                        side="left"
                        strength={-drag / SWIPE_THRESHOLD}
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            {flipped ? (
              <div className="flex gap-3">
                <Button
                  size="lg"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => grade('missed')}
                >
                  Missed
                </Button>
                <Button
                  size="lg"
                  disabled={busy}
                  className="bg-mint text-mint-deep hover:bg-mint/90"
                  onClick={() => grade('correct')}
                >
                  Got it
                </Button>
              </div>
            ) : (
              <Button size="lg" onClick={() => setFlipped(true)}>
                Reveal answer
              </Button>
            )}
            <p className="text-[13px] text-muted-foreground">
              {flipped
                ? 'Swipe, or use ← / → to grade'
                : 'Tap the card or press space to flip'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Results({
  correct,
  total,
  cleared,
  missed,
  passMinutes,
  onFinish,
}: {
  correct: number;
  total: number;
  cleared: boolean;
  missed: FlashcardItem[];
  passMinutes: number;
  onFinish: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-4 py-2">
      <div className="text-center">
        <p className="text-5xl font-bold tabular-nums">
          <span className="text-mint">{correct}</span> / {total}
        </p>
        <p className="mt-1 text-muted-foreground">
          {cleared ? 'Quest cleared' : 'Deck reviewed'}
        </p>
      </div>
      {missed.length > 0 && (
        <div className="w-full rounded-lg border border-border p-3 text-left">
          <p className="mb-1.5 text-[13px] font-semibold text-muted-foreground">
            Worth another look
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {missed.slice(0, 8).map((c) => (
              <li key={c.id} className="flex justify-between gap-3">
                <span>{c.front}</span>
                <span className="text-muted-foreground">{c.back}</span>
              </li>
            ))}
            {missed.length > 8 && (
              <li className="text-[13px] text-muted-foreground">
                +{missed.length - 8} more
              </li>
            )}
          </ul>
        </div>
      )}
      <Button size="lg" onClick={onFinish}>
        Earn {passMinutes} minutes
      </Button>
    </div>
  );
}

function FlashcardEditor({
  quest,
  onChange,
}: {
  quest: FlashcardSideQuest;
  onChange: (quest: SideQuest) => void;
}) {
  const { cards, cardsPerPass, order, requiredCorrect } = quest.config;
  const [importText, setImportText] = useState('');

  function setConfig(patch: Partial<FlashcardSideQuest['config']>) {
    onChange({ ...quest, config: { ...quest.config, ...patch } });
  }

  function setCard(i: number, patch: Partial<FlashcardItem>) {
    setConfig({
      cards: cards.map((c, j) => (j === i ? { ...c, ...patch } : c)),
    });
  }

  function runImport() {
    const parsed = parseFlashcards(importText);
    if (parsed.length === 0) return;
    setConfig({ cards: [...cards, ...parsed] });
    setImportText('');
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Label className="font-normal">
          Cards per pass
          <NumberInput
            value={cardsPerPass}
            max={100}
            onChange={(v) =>
              setConfig({
                cardsPerPass: v,
                requiredCorrect:
                  requiredCorrect != null
                    ? Math.min(requiredCorrect, v)
                    : undefined,
              })
            }
          />
        </Label>
        <div className="flex items-center gap-2 text-sm">
          Order
          <ToggleGroup
            type="single"
            variant="outline"
            value={order}
            onValueChange={(v) => {
              if (v === 'random' || v === 'sequential') setConfig({ order: v });
            }}
          >
            <ToggleGroupItem value="random">Random</ToggleGroupItem>
            <ToggleGroupItem value="sequential">In order</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <Label className="font-normal">
        <Checkbox
          checked={requiredCorrect != null}
          onCheckedChange={(c) =>
            setConfig({
              requiredCorrect: c === true ? cardsPerPass : undefined,
            })
          }
        />
        Require
        <NumberInput
          value={requiredCorrect ?? cardsPerPass}
          max={cardsPerPass}
          disabled={requiredCorrect == null}
          onChange={(v) =>
            setConfig({ requiredCorrect: Math.min(v, cardsPerPass) })
          }
        />
        of {cardsPerPass} correct to pass
      </Label>

      <div className="flex flex-col gap-1.5">
        <span>
          Deck{' '}
          <span className="text-[13px] text-muted-foreground">
            ({cards.length} card{cards.length === 1 ? '' : 's'})
          </span>
        </span>
        {cards.length > SOFT_CARD_LIMIT && (
          <span className="text-[13px] text-destructive">
            Large decks may approach the browser's local storage limit. Consider
            splitting this up.
          </span>
        )}
        {cards.map((c, i) => (
          <div key={c.id} className="flex items-start gap-2">
            <Input
              className="flex-1"
              placeholder="Front"
              value={c.front}
              onChange={(e) => setCard(i, { front: e.target.value })}
            />
            <Input
              className="flex-1"
              placeholder="Back"
              value={c.back}
              onChange={(e) => setCard(i, { back: e.target.value })}
            />
            <Button
              variant="destructive"
              size="icon"
              title="Remove card"
              onClick={() =>
                setConfig({ cards: cards.filter((_, j) => j !== i) })
              }
            >
              ✕
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          className="self-start"
          onClick={() =>
            setConfig({
              cards: [
                ...cards,
                { id: crypto.randomUUID(), front: '', back: '' },
              ],
            })
          }
        >
          + Add card
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted-foreground">
          Import: one card per line, front and back separated by a tab or comma.
        </span>
        <Textarea
          rows={3}
          className="resize-y font-mono text-[13px]"
          placeholder={'Capital of France\tParis\nLargest planet, Jupiter'}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <Button
          variant="outline"
          className="self-start"
          disabled={parseFlashcards(importText).length === 0}
          onClick={runImport}
        >
          Import {parseFlashcards(importText).length || ''} cards
        </Button>
      </div>
    </>
  );
}

function FlashcardLogDetail({
  result,
}: {
  result: Extract<QuestResult, { questType: 'flashcards' }>;
}) {
  const cards = result.cards ?? [];
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-muted-foreground">
        {result.correct === undefined
          ? `Reviewed ${result.reviewed} card${result.reviewed === 1 ? '' : 's'}.`
          : `${result.correct} of ${result.reviewed} correct.`}
      </p>
      {cards.length > 0 && (
        <ul className="flex flex-col gap-1 text-[13px]">
          {cards.map((c, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3">
              <span className="flex items-baseline gap-1.5">
                <span
                  aria-hidden="true"
                  className={`size-1.5 translate-y-[-1px] rounded-full ${
                    c.missed ? 'bg-destructive' : 'bg-mint'
                  }`}
                />
                <span>{c.front}</span>
              </span>
              <span className="text-right text-muted-foreground">{c.back}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const flashcardsUi: QuestKindUi<FlashcardSideQuest> = {
  icon: Layers,
  Editor: FlashcardEditor,
  Runtime: FlashcardRuntime,
  LogDetail: FlashcardLogDetail,
};
