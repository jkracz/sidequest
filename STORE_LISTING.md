# Chrome Web Store Listing Draft

Use this as the source copy for the Chrome Web Store Developer Dashboard. Keep the dashboard listing, screenshots, and privacy disclosures in sync with the current extension behavior.

## Name

SideQuest

## Short Description

Earn your distractions. Blocked sites cost a side quest.

## Full Description

SideQuest helps you interrupt distracting browsing by blocking chosen websites during scheduled focus blocks or ad hoc sessions. When you visit a blocked site, SideQuest redirects the tab to a quest page. Completing a configured quest earns a temporary pass back to that site.

Features:

- Create named block lists from website hostnames
- Schedule recurring blocks by day and time
- Start ad hoc blocking sessions from the popup when no block is already active
- Complete reflection, timer, or push-up quests to earn temporary access
- Review local quest history and focus stats
- Sweep already-open blocked tabs when a block starts or a pass expires

SideQuest stores data locally in Chrome extension storage. It does not require an account and does not operate a backend service.

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
