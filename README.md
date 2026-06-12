# SideQuest ⚔️

Earn your distractions. A Chrome extension that blocks sites on a schedule — and the only way through is to complete a side quest.

## How it works

- **Block lists** — named groups of sites (matched by hostname, subdomains included).
- **Time blocks** — days + a time range during which one or more block lists are enforced. Ranges that end at or before they start span midnight.
- **Ad hoc sessions** — start a block on any list right from the popup for a chosen duration. No ending it early; the only way through is a quest.
- **Side quests** — challenges that earn a temporary pass (minutes configured per quest). Three types so far: a reflection prompt pool served in rotation, a countdown timer, and an honor-system push-up counter.
- **Quest log** — a day-grouped feed of completed quests plus dashboard stats: quests completed, temptations resisted, estimated time saved, and your activity streak.
- When a time block starts or a pass expires, already-open offending tabs are swept to the quest page too. No loopholes.

Everything is stored locally in `chrome.storage.local`. No accounts, no servers.

## Publishing

- [Privacy policy](PRIVACY.md)
- [Chrome Web Store listing draft](STORE_LISTING.md)

## Development

```sh
pnpm install
pnpm build   # typecheck + production build into dist/
pnpm dev     # vite dev server with hot reload (CRXJS)
```

Styling is Tailwind CSS v4 (via `@tailwindcss/vite`); theme tokens and the few shared component classes live in `src/styles/global.css`.

## Install (unpacked)

1. `pnpm build`
2. Open `chrome://extensions`, enable **Developer mode**
3. **Load unpacked** → select the `dist/` folder
4. Open the extension's options page to create a block list and a time block

## Project layout

- `src/background/` — MV3 service worker: navigation interception, tab sweeps, alarm scheduling
- `src/shared/` — types, storage, hostname matching, schedule math, block decision logic
- `src/blocked/` — the SideQuest page shown in place of a blocked site
- `src/options/` — settings UI (block lists, schedule, quests, reflection log)
- `src/popup/` — toolbar popup with current status
