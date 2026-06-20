# Chrome Web Store Listing Draft

Use this as the source copy for the Chrome Web Store Developer Dashboard. Keep the dashboard listing, screenshots, and privacy disclosures in sync with the current extension behavior.

## Name

SideQuest

## Short Description

Block distracting sites on a schedule. To get back in, complete a side quest.

## Full Description

SideQuest is a focus extension for people who do not want another all-or-nothing website blocker.

Instead of simply locking you out, SideQuest adds friction at the exact moment you are about to drift. You choose the sites that tend to pull you away from work, studying, reading, or sleep. When those sites are blocked, SideQuest redirects the tab to a quest page. To continue to the blocked site, you have to complete one of your configured side quests. Finishing a quest earns a temporary pass, so access is possible, but it is no longer effortless.

The goal is not to pretend distraction can be deleted. The goal is to turn impulsive browsing into a deliberate choice.

How SideQuest works:

1. Create block lists

Make named groups of websites, such as social media, video, news, shopping, or anything else that eats your day. SideQuest matches by hostname and includes subdomains, so a single entry can cover the site you actually mean to block.

2. Schedule focus blocks

Set recurring time blocks by day and time, then choose which block lists they enforce. Use them for deep work, class, bedtime, morning routines, or any other part of the week where you want distraction to be harder to reach. Overnight schedules are supported, so a block can start in the evening and continue into the next morning.

3. Start ad hoc sessions

When no scheduled block is active, you can start a temporary block session from the extension popup. Pick a block list, choose a duration, and SideQuest enforces it until the session ends. Ad hoc sessions are useful when you need a clean hour right now and do not want to edit your recurring schedule.

4. Complete side quests for temporary access

When you try to visit a blocked site, SideQuest offers the quests you allowed for that block. Completing a quest grants a temporary pass back to the site for the number of minutes you configured.

Current quest types include:

- Reflection prompts: pause and answer a prompt before continuing
- Timer quests: wait through a countdown before access is granted
- Counter quests: complete a configurable honor-system action
- Flashcards: review a deck before earning a pass

You decide which quests exist, how they are configured, and how long each completed quest should unlock access.

5. Track what happened

SideQuest keeps a local quest log so you can see completed quests, resisted visits, activity streaks, estimated time saved, and daily activity. The log is there to make your patterns visible without turning focus into a black box.

Why SideQuest is different:

- It adds intentional friction instead of relying only on hard blocking
- It lets you earn short passes instead of forcing a permanent yes or no
- It supports schedules and quick one-off sessions
- It lets different focus blocks use different quests
- It catches already-open blocked tabs when a block starts or a pass expires
- It works without accounts, subscriptions, or a remote service

SideQuest is built for people who want a practical middle ground: stricter than a reminder, less brittle than pure willpower, and more flexible than a blocker that only says no.

Privacy and data:

SideQuest stores your settings and activity locally in Chrome extension storage. That includes block lists, schedules, quest settings, temporary passes, quest history, resisted visit records, and app settings.

SideQuest does not require an account. It does not operate a backend service. It does not sell your data. Your SideQuest configuration and history stay on your device unless you choose to export them.

## Category

Productivity

## Suggested Support Text

For bugs, feature requests, or privacy questions, use the support contact listed on this Chrome Web Store page.

## Permission Justifications

### `storage`

Used to store block lists, schedules, quest settings, earned passes, quest history, resisted visit records, and app settings locally in Chrome extension storage.

### `tabs`

Used to redirect already-open tabs when a site becomes blocked, such as when a scheduled block starts or an earned pass expires.

### `alarms`

Used to wake the extension when enforcement can change, including scheduled block starts, pass expiration, and ad hoc session expiration.

### `webNavigation`

Used to detect top-level browser navigation and redirect visits to websites that match an active block.

### `<all_urls>` Host Access

Used because users can configure arbitrary website hostnames to block. SideQuest needs host access across websites in order to detect and redirect navigation to whichever sites the user has chosen.

## Privacy Disclosure Draft

### Single Purpose

SideQuest blocks user-configured distracting websites during scheduled or ad hoc focus sessions and grants temporary access after the user completes a side quest.

### Data Usage

SideQuest stores user configuration and activity data locally in `chrome.storage.local`, including blocked hostnames, schedules, quest settings, temporary passes, quest history, target URLs, timestamps, reflection text, resisted visit records, and app settings.

SideQuest does not create accounts, operate a backend service, sell data, or send SideQuest data to the developer.

### Privacy Policy URL

Publish `PRIVACY.md` somewhere stable before submission and use that URL in the Developer Dashboard.

## Screenshot Checklist

- Popup showing current focus status and ad hoc session controls
- Options page showing block lists
- Options page showing schedule configuration
- Quest page shown after visiting a blocked site
- Quest log or stats view

## Pre-Submission Checklist

- Run `pnpm build`
- Load `dist/` unpacked in Chrome and test the popup, options page, blocking, quest completion, passes, and schedule expiration
- Confirm the generated `dist/manifest.json` has the expected name, version, description, icons, permissions, and host permissions
- Zip the contents of `dist/` with `manifest.json` at the zip root
- Upload the zip to the Chrome Web Store Developer Dashboard
- Complete listing, privacy, distribution, and support fields
- Submit for review
