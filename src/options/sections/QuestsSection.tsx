import { setState } from '../../shared/storage';
import type {
  AppState,
  PushupSideQuest,
  ReflectionSideQuest,
  SideQuest,
  TimerSideQuest,
} from '../../shared/types';

export function QuestsSection({ state }: { state: AppState }) {
  async function updateQuest(updated: SideQuest) {
    await setState({ quests: state.quests.map((q) => (q.id === updated.id ? updated : q)) });
  }

  return (
    <section className="flex flex-col items-start gap-4">
      {state.quests.map((quest) => (
        <div key={quest.id} className="card flex w-full flex-col gap-3.5">
          <h3 className="font-semibold">
            {quest.name} <span className="text-[13px] font-normal text-dim">({quest.type})</span>
          </h3>
          {quest.type === 'reflection' && (
            <ReflectionQuestFields quest={quest} onChange={updateQuest} />
          )}
          {quest.type === 'timer' && <TimerQuestFields quest={quest} onChange={updateQuest} />}
          {quest.type === 'pushups' && <PushupQuestFields quest={quest} onChange={updateQuest} />}
          <label className="flex items-center gap-2">
            Completing it earns
            <NumberInput
              value={quest.passDurationMinutes}
              max={120}
              onChange={(v) => void updateQuest({ ...quest, passDurationMinutes: v })}
            />
            minutes on the blocked site
          </label>
        </div>
      ))}
      <p className="text-dim">More quest types coming soon.</p>
    </section>
  );
}

function ReflectionQuestFields({
  quest,
  onChange,
}: {
  quest: ReflectionSideQuest;
  onChange: (quest: SideQuest) => Promise<void>;
}) {
  const { prompts } = quest.config;

  function setPrompts(next: string[]) {
    void onChange({ ...quest, config: { ...quest.config, prompts: next } });
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span>
          Prompts{' '}
          <span className="text-[13px] text-dim">(served in rotation, one per visit)</span>
        </span>
        {prompts.map((prompt, i) => (
          <div key={i} className="flex items-start gap-2">
            <textarea
              rows={1}
              className="input flex-1 resize-y"
              value={prompt}
              onChange={(e) => setPrompts(prompts.map((p, j) => (j === i ? e.target.value : p)))}
            />
            <button
              className="btn btn-danger"
              title={prompts.length === 1 ? 'Keep at least one prompt' : 'Remove prompt'}
              disabled={prompts.length === 1}
              onClick={() => setPrompts(prompts.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <button className="btn self-start" onClick={() => setPrompts([...prompts, ''])}>
          + Add prompt
        </button>
      </div>
      <label className="flex items-center gap-2">
        Minimum length
        <NumberInput
          value={quest.config.minChars}
          max={2000}
          onChange={(v) => void onChange({ ...quest, config: { ...quest.config, minChars: v } })}
        />
        characters
      </label>
    </>
  );
}

function TimerQuestFields({
  quest,
  onChange,
}: {
  quest: TimerSideQuest;
  onChange: (quest: SideQuest) => Promise<void>;
}) {
  return (
    <label className="flex items-center gap-2">
      Countdown lasts
      <NumberInput
        value={quest.config.seconds}
        max={3600}
        onChange={(v) => void onChange({ ...quest, config: { seconds: v } })}
      />
      seconds before you can continue
    </label>
  );
}

function PushupQuestFields({
  quest,
  onChange,
}: {
  quest: PushupSideQuest;
  onChange: (quest: SideQuest) => Promise<void>;
}) {
  return (
    <label className="flex items-center gap-2">
      Count off
      <NumberInput
        value={quest.config.reps}
        max={500}
        onChange={(v) => void onChange({ ...quest, config: { reps: v } })}
      />
      push-ups before you can continue
    </label>
  );
}

function NumberInput({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      className="input w-[84px]"
      min={1}
      max={max}
      value={value}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v) && v >= 1) onChange(v);
      }}
    />
  );
}
