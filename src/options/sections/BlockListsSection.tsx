import { useState } from 'react';
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
        <p className="text-dim">
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
      <button className="btn" onClick={() => void createList()}>
        + New block list
      </button>
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
    <div className="card flex w-full flex-col gap-3.5">
      <div className="flex items-center justify-between gap-2">
        <input
          className="input flex-1 border-transparent bg-transparent text-base font-semibold hover:bg-inset"
          value={list.name}
          onChange={(e) => void onChange({ ...list, name: e.target.value })}
        />
        <button className="btn btn-danger" onClick={onDelete}>
          Delete
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {list.sites.map((site) => (
          <span key={site} className="chip">
            {site}
            <button
              title="Remove"
              className="cursor-pointer text-[13px] leading-none text-dim hover:text-danger"
              onClick={() => void onChange({ ...list, sites: list.sites.filter((s) => s !== site) })}
            >
              ✕
            </button>
          </span>
        ))}
        {list.sites.length === 0 && <span className="text-dim">No sites yet.</span>}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addSite();
        }}
      >
        <input
          className="input"
          placeholder="Add a site (e.g. youtube.com)"
          value={siteInput}
          onChange={(e) => setSiteInput(e.target.value)}
        />
        <button type="submit" className="btn">
          Add
        </button>
      </form>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
