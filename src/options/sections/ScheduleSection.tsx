import { DAY_LABELS, isTimeBlockActive } from '../../shared/schedule';
import { setState } from '../../shared/storage';
import type { AppState, DayOfWeek, TimeBlock } from '../../shared/types';

const WEEKDAYS: DayOfWeek[] = [1, 2, 3, 4, 5];

export function ScheduleSection({ state }: { state: AppState }) {
  async function createBlock() {
    const block: TimeBlock = {
      id: crypto.randomUUID(),
      label: 'Focus time',
      days: WEEKDAYS,
      startTime: '09:00',
      endTime: '17:00',
      blockListIds: state.blockLists.map((bl) => bl.id),
      questIds: [],
    };
    await setState({ timeBlocks: [...state.timeBlocks, block] });
  }

  async function updateBlock(updated: TimeBlock) {
    await setState({
      timeBlocks: state.timeBlocks.map((tb) => (tb.id === updated.id ? updated : tb)),
    });
  }

  async function deleteBlock(id: string) {
    await setState({ timeBlocks: state.timeBlocks.filter((tb) => tb.id !== id) });
  }

  return (
    <section className="flex flex-col items-start gap-4">
      {state.timeBlocks.length === 0 && (
        <p className="text-dim">
          No time blocks yet. A time block is when a block list is enforced — outside of one,
          everything is open.
        </p>
      )}
      {state.timeBlocks.map((tb) => (
        <TimeBlockCard
          key={tb.id}
          block={tb}
          state={state}
          onChange={updateBlock}
          onDelete={() => void deleteBlock(tb.id)}
        />
      ))}
      <button className="btn" onClick={() => void createBlock()}>
        + New time block
      </button>
    </section>
  );
}

function TimeBlockCard({
  block,
  state,
  onChange,
  onDelete,
}: {
  block: TimeBlock;
  state: AppState;
  onChange: (block: TimeBlock) => Promise<void>;
  onDelete: () => void;
}) {
  const active = isTimeBlockActive(block, new Date());

  function toggleDay(day: DayOfWeek) {
    const days = block.days.includes(day)
      ? block.days.filter((d) => d !== day)
      : [...block.days, day].sort();
    void onChange({ ...block, days });
  }

  function toggleId(field: 'blockListIds' | 'questIds', id: string) {
    const ids = block[field].includes(id)
      ? block[field].filter((x) => x !== id)
      : [...block[field], id];
    void onChange({ ...block, [field]: ids });
  }

  const overnight = block.endTime <= block.startTime;

  return (
    <div className="card flex w-full flex-col gap-3.5">
      <div className="flex items-center justify-between gap-2">
        <input
          className="input flex-1 border-transparent bg-transparent text-base font-semibold hover:bg-inset"
          value={block.label}
          onChange={(e) => void onChange({ ...block, label: e.target.value })}
        />
        {active && (
          <span className="rounded-full bg-mint px-2.5 py-[3px] text-xs font-semibold whitespace-nowrap text-[#08240f]">
            Active now
          </span>
        )}
        <button className="btn btn-danger" onClick={onDelete}>
          Delete
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {DAY_LABELS.map((label, i) => (
          <button
            key={label}
            className={`cursor-pointer rounded-[10px] border px-2.5 py-1 text-[13px] ${
              block.days.includes(i as DayOfWeek)
                ? 'border-gold bg-gold font-semibold text-gold-deep'
                : 'border-edge bg-surface text-dim hover:border-dim'
            }`}
            onClick={() => toggleDay(i as DayOfWeek)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          From
          <input
            type="time"
            className="input"
            value={block.startTime}
            onChange={(e) => void onChange({ ...block, startTime: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2">
          to
          <input
            type="time"
            className="input"
            value={block.endTime}
            onChange={(e) => void onChange({ ...block, endTime: e.target.value })}
          />
        </label>
        {overnight && <span className="text-dim">spans midnight</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-dim">Enforces:</span>
        {state.blockLists.length === 0 && (
          <span className="text-dim">no block lists exist yet</span>
        )}
        {state.blockLists.map((bl) => (
          <label key={bl.id} className="chip cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-gold"
              checked={block.blockListIds.includes(bl.id)}
              onChange={() => toggleId('blockListIds', bl.id)}
            />
            {bl.name} ({bl.sites.length})
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-dim">Quests offered:</span>
        {state.quests.map((q) => (
          <label key={q.id} className="chip cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-gold"
              checked={block.questIds.includes(q.id)}
              onChange={() => toggleId('questIds', q.id)}
            />
            {q.name}
          </label>
        ))}
        {block.questIds.length === 0 && (
          <span className="text-dim">(none selected — any quest)</span>
        )}
      </div>
    </div>
  );
}
