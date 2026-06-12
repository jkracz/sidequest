import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { normalizeSite } from '../../shared/match';
import { setState } from '../../shared/storage';
import type { AppState, BlockList } from '../../shared/types';

export function BlockListsSection({ state }: { state: AppState }) {
  async function createList() {
    const list: BlockList = { id: crypto.randomUUID(), name: 'New list', sites: [] };
    await setState({ blockLists: [...state.blockLists, list] });
  }

  async function updateList(updated: BlockList) {
    await setState({
      blockLists: state.blockLists.map((bl) => (bl.id === updated.id ? updated : bl)),
    });
  }

  async function deleteList(id: string) {
    await setState({
      blockLists: state.blockLists.filter((bl) => bl.id !== id),
      timeBlocks: state.timeBlocks.map((tb) => ({
        ...tb,
        blockListIds: tb.blockListIds.filter((blId) => blId !== id),
      })),
    });
  }

  return (
    <section className="flex flex-col items-start gap-4">
      {state.blockLists.length === 0 && (
        <p className="text-muted-foreground">
          No block lists yet. Create one and add the sites that eat your day.
        </p>
      )}
      {state.blockLists.map((list) => (
        <BlockListCard
          key={list.id}
          list={list}
          onChange={updateList}
          onDelete={() => void deleteList(list.id)}
        />
      ))}
      <Button variant="outline" onClick={() => void createList()}>
        + New block list
      </Button>
    </section>
  );
}

function BlockListCard({
  list,
  onChange,
  onDelete,
}: {
  list: BlockList;
  onChange: (list: BlockList) => Promise<void>;
  onDelete: () => void;
}) {
  const [siteInput, setSiteInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  function addSite() {
    const site = normalizeSite(siteInput);
    if (!site) {
      setError('Enter a site like twitter.com');
      return;
    }
    setError(null);
    setSiteInput('');
    if (!list.sites.includes(site)) {
      void onChange({ ...list, sites: [...list.sites, site] });
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          <Input
            className="border-transparent text-base font-semibold dark:bg-transparent dark:hover:bg-input/30"
            value={list.name}
            onChange={(e) => void onChange({ ...list, name: e.target.value })}
          />
        </CardTitle>
        <CardAction>
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {list.sites.map((site) => (
            <Badge key={site} variant="secondary">
              {site}
              <button
                title="Remove"
                className="text-muted-foreground hover:text-destructive"
                onClick={() =>
                  void onChange({ ...list, sites: list.sites.filter((s) => s !== site) })
                }
              >
                ✕
              </button>
            </Badge>
          ))}
          {list.sites.length === 0 && (
            <span className="text-muted-foreground">No sites yet.</span>
          )}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addSite();
          }}
        >
          <Input
            className="max-w-xs"
            placeholder="Add a site (e.g. youtube.com)"
            value={siteInput}
            onChange={(e) => setSiteInput(e.target.value)}
          />
          <Button type="submit" variant="outline">
            Add
          </Button>
        </form>
        {error && <p className="text-[13px] text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
