import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { resetAllState, setState } from '../../shared/storage';
import type { AppState, ThemePreference } from '../../shared/types';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsSection({ state }: { state: AppState }) {
  return (
    <section className="flex flex-col items-start gap-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>How SideQuest looks on every page.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">Theme</span>
              <span className="text-muted-foreground">
                System follows your operating system's light/dark preference.
              </span>
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              value={state.settings.theme}
              onValueChange={(value) => {
                if (!value) return;
                void setState({
                  settings: { ...state.settings, theme: value as ThemePreference },
                });
              }}
            >
              {THEME_OPTIONS.map((opt) => (
                <ToggleGroupItem
                  key={opt.value}
                  value={opt.value}
                  className="data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:font-semibold data-[state=on]:text-primary-foreground"
                >
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>These cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DangerRow
            title="Clear stats"
            description="Empties the quest log and resets every stat — quests completed, temptations resisted, time saved, and your streak."
            phrase="clear stats"
            onConfirm={() => void setState({ history: [], resists: [] })}
          />
          <DangerRow
            title="Reset extension"
            description="Deletes everything: block lists, schedule, quests, stats, active passes, and sessions. The extension starts over from scratch."
            phrase="reset extension"
            onConfirm={() => void resetAllState()}
          />
        </CardContent>
      </Card>
    </section>
  );
}

function DangerRow({
  title,
  description,
  phrase,
  onConfirm,
}: {
  title: string;
  description: string;
  phrase: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const ready = text.trim() === phrase;

  function confirm() {
    if (!ready) return;
    onConfirm();
    setOpen(false);
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground">{description}</span>
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setText('');
        }}
      >
        <DialogTrigger asChild>
          <Button variant="destructive" className="shrink-0">
            {title}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}?</DialogTitle>
            <DialogDescription>{description} This cannot be undone.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              confirm();
            }}
          >
            <Label htmlFor={`confirm-${phrase}`} className="font-normal text-muted-foreground">
              Type{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-foreground">{phrase}</code> to
              confirm
            </Label>
            <Input
              id={`confirm-${phrase}`}
              autoFocus
              autoComplete="off"
              placeholder={phrase}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" disabled={!ready} onClick={confirm}>
              {title}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
