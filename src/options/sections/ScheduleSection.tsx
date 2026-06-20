import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
      questIds: state.quests.map((q) => q.id),
    };
    await setState({ timeBlocks: [...state.timeBlocks, block] });
  }

  async function updateBlock(updated: TimeBlock) {
    await setState({
      timeBlocks: state.timeBlocks.map((tb) =>
        tb.id === updated.id ? updated : tb,
      ),
    });
  }

  async function deleteBlock(id: string) {
    await setState({
      timeBlocks: state.timeBlocks.filter((tb) => tb.id !== id),
    });
  }

  return (
    <section className="flex flex-col items-start gap-4">
      {state.timeBlocks.length === 0 && (
        <p className="text-muted-foreground">
          No time blocks yet. A time block is when a block list is enforced —
          outside of one, everything is open.
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
      <Button variant="outline" onClick={() => void createBlock()}>
        + New time block
      </Button>
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

  function setDays(values: string[]) {
    const days = values.map(Number).sort() as DayOfWeek[];
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          <Input
            className="border-transparent text-base font-semibold dark:bg-transparent dark:hover:bg-input/30"
            value={block.label}
            onChange={(e) => void onChange({ ...block, label: e.target.value })}
          />
        </CardTitle>
        <CardAction className="flex items-center gap-2">
          {active && (
            <Badge className="bg-mint text-mint-deep">Active now</Badge>
          )}
          <DeleteTimeBlockDialog block={block} onDelete={onDelete} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          spacing={1.5}
          value={block.days.map(String)}
          onValueChange={setDays}
        >
          {DAY_LABELS.map((label, i) => (
            <ToggleGroupItem
              key={label}
              value={String(i)}
              className="data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:font-semibold data-[state=on]:text-primary-foreground"
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex items-center gap-2">
          <Label className="font-normal">
            From
            <Input
              type="time"
              className="w-fit"
              value={block.startTime}
              onChange={(e) =>
                void onChange({ ...block, startTime: e.target.value })
              }
            />
          </Label>
          <Label className="font-normal">
            to
            <Input
              type="time"
              className="w-fit"
              value={block.endTime}
              onChange={(e) =>
                void onChange({ ...block, endTime: e.target.value })
              }
            />
          </Label>
          {overnight && (
            <span className="text-muted-foreground">spans midnight</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Enforces:</span>
          {state.blockLists.length === 0 && (
            <span className="text-muted-foreground">
              no block lists exist yet
            </span>
          )}
          {state.blockLists.map((bl) => (
            <Label
              key={bl.id}
              className="rounded-full border bg-input/30 px-2.5 py-1 text-[13px] font-normal"
            >
              <Checkbox
                checked={block.blockListIds.includes(bl.id)}
                onCheckedChange={() => toggleId('blockListIds', bl.id)}
              />
              {bl.name} ({bl.sites.length})
            </Label>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-muted-foreground">
            Quests offered:
          </span>
          {state.quests.map((q) => (
            <Label
              key={q.id}
              className="rounded-full border bg-input/30 px-2.5 py-1 text-[13px] font-normal"
            >
              <Checkbox
                checked={block.questIds.includes(q.id)}
                onCheckedChange={() => toggleId('questIds', q.id)}
              />
              {q.name}
            </Label>
          ))}
          {block.questIds.length === 0 && (
            <span className="text-muted-foreground">
              None selected. This block will deny access outright.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteTimeBlockDialog({
  block,
  onDelete,
}: {
  block: TimeBlock;
  onDelete: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete time block?</DialogTitle>
          <DialogDescription>
            This will delete "{block.label || 'Untitled time block'}" from your
            schedule. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onDelete}>
            Delete time block
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
