import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Download, FileJson, FileSpreadsheet, Upload } from 'lucide-react';
import {
  applyImportedData,
  createQuestExport,
  createQuestLogCsv,
  createQuestLogExport,
  describeAppliedImport,
  describeImportSummary,
  exportFileName,
  parseSideQuestImport,
  stringifyExport,
  type ImportMode,
  type ParsedImport,
} from '../../shared/importExport';
import { resetAllState, setState } from '../../shared/storage';
import type { AppState, ThemePreference } from '../../shared/types';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsSection({ state }: { state: AppState }) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<ParsedImport | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importError, setImportError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  function exportQuests() {
    const now = new Date();
    downloadTextFile(
      exportFileName('quests', now),
      stringifyExport(createQuestExport(state, now)),
      'application/json;charset=utf-8'
    );
  }

  function exportQuestLogJson() {
    const now = new Date();
    downloadTextFile(
      exportFileName('quest-log', now),
      stringifyExport(createQuestLogExport(state, now)),
      'application/json;charset=utf-8'
    );
  }

  function exportQuestLogCsv() {
    downloadTextFile(
      exportFileName('quest-log-csv'),
      createQuestLogCsv(state),
      'text/csv;charset=utf-8'
    );
  }

  async function chooseImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    try {
      const parsed = parseSideQuestImport(await file.text());
      setPendingImport(parsed);
      setImportMode('merge');
      setImportError(null);
      setImportMessage(null);
    } catch (error) {
      setPendingImport(null);
      setImportError(error instanceof Error ? error.message : 'Could not import that file.');
      setImportMessage(null);
    }
  }

  async function confirmImport() {
    if (!pendingImport) return;
    const result = applyImportedData(state, pendingImport, importMode);
    await setState(result.changes);
    setImportMessage(describeAppliedImport(result));
    setImportError(null);
    setPendingImport(null);
  }

  return (
    <section className="flex flex-col items-start gap-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
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
          <CardTitle>Quest Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">Time saved per resisted visit</span>
              <span className="text-muted-foreground">
                A resisted visit is one where you hit the wall and walked away without earning a
                pass. The quest log's time-saved estimate counts this many minutes for each.
              </span>
            </div>
            <Label className="shrink-0 gap-1.5 font-normal text-muted-foreground">
              <Input
                type="number"
                className="w-16"
                min={1}
                max={120}
                value={state.settings.minutesPerResistedVisit}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 1) {
                    void setState({
                      settings: { ...state.settings, minutesPerResistedVisit: v },
                    });
                  }
                }}
              />
              min
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Backup &amp; Restore</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <BackupRow
            title="Quest setup"
            description="Save the quests you have configured so they can be restored later."
          >
            <Button variant="outline" onClick={exportQuests}>
              <Download aria-hidden="true" />
              Export JSON
            </Button>
          </BackupRow>

          <BackupRow
            title="Quest log"
            description="Save completed quests and resisted visits for backup or spreadsheet review."
          >
            <Button variant="outline" onClick={exportQuestLogJson}>
              <FileJson aria-hidden="true" />
              JSON
            </Button>
            <Button variant="outline" onClick={exportQuestLogCsv}>
              <FileSpreadsheet aria-hidden="true" />
              CSV
            </Button>
          </BackupRow>

          <BackupRow
            title="Import from backup"
            description="Restore a SideQuest JSON export into your current history or quest setup."
          >
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void chooseImportFile(event)}
            />
            <Button variant="outline" onClick={() => importInputRef.current?.click()}>
              <Upload aria-hidden="true" />
              Import JSON
            </Button>
          </BackupRow>

          {importError && <p className="text-[13px] text-destructive">{importError}</p>}
          {importMessage && <p className="text-[13px] text-mint">{importMessage}</p>}
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
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

      <Dialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null);
        }}
      >
        <DialogContent>
          {pendingImport && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Import {pendingImport.kind === 'quests' ? 'quests' : 'quest log'}?
                </DialogTitle>
                <DialogDescription>{describeImportSummary(pendingImport.summary)}</DialogDescription>
              </DialogHeader>

              <RadioGroup
                value={importMode}
                onValueChange={(value) => setImportMode(value as ImportMode)}
                className="grid gap-2"
              >
                <Label
                  htmlFor="import-merge"
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal"
                >
                  <RadioGroupItem id="import-merge" value="merge" className="mt-0.5" />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">Merge with current data</span>
                    <span className="text-muted-foreground">
                      Existing records are kept and duplicates are skipped.
                    </span>
                  </span>
                </Label>
                <Label
                  htmlFor="import-replace"
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal"
                >
                  <RadioGroupItem id="import-replace" value="replace" className="mt-0.5" />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">
                      Replace current {pendingImport.kind === 'quests' ? 'quests' : 'quest log'}
                    </span>
                    <span className="text-muted-foreground">
                      {pendingImport.kind === 'quests'
                        ? 'Schedules keep only quest IDs that exist in the import.'
                        : 'Current completed quests and resisted visits are cleared first.'}
                    </span>
                  </span>
                </Label>
              </RadioGroup>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={() => void confirmImport()}>Import</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function BackupRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground">{description}</span>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{children}</div>
    </div>
  );
}

function downloadTextFile(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
