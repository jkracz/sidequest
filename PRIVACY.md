# SideQuest Privacy Policy

Last updated: June 12, 2026

SideQuest is a Chrome extension for blocking distracting websites on a schedule and granting temporary access after a user completes a side quest.

## Data SideQuest Stores

SideQuest stores its data locally in Chrome extension storage on your device. This may include:

- Block lists and website hostnames you choose to block
- Time block schedules
- Ad hoc blocking sessions
- Quest settings and prompts
- Temporary passes earned by completing quests
- Quest history, including completed quest type, blocked hostname, target URL, timestamps, minutes earned, and reflection text when you complete a reflection quest
- Resisted visit records used for local dashboard statistics
- App settings, such as theme preference and estimated time saved per resisted visit

## Data Collection and Transmission

SideQuest does not create accounts, operate a backend service, sell data, or send your SideQuest data to the developer.

The extension uses Chrome APIs to detect navigation to configured blocked sites, redirect blocked tabs, keep local schedules, and save local state. SideQuest data remains in `chrome.storage.local` unless you export it, inspect it, sync it through browser-level tools, or otherwise share it yourself.

## Permissions

SideQuest requests Chrome permissions for the following reasons:

- `storage`: save block lists, schedules, quests, passes, history, and settings locally
- `tabs`: redirect already-open tabs that match an active block
- `alarms`: enforce scheduled blocks, pass expiration, and session expiration
- `webNavigation`: detect navigation to blocked sites
- `<all_urls>` host access: allow users to configure any website hostname as a blocked site

## Third Parties

SideQuest does not intentionally share SideQuest data with third parties.

Chrome, the Chrome Web Store, and the browser environment may process extension installation, update, crash, diagnostic, or browser-level sync data under Google's own policies. SideQuest does not control those browser or store services.

## Data Removal

You can remove locally stored SideQuest data by uninstalling the extension or by using any in-app reset controls if available in the installed version. Removing the extension from Chrome removes the extension's local storage data according to Chrome's extension storage behavior.

## Contact

For privacy questions, use the support contact listed on the Chrome Web Store listing.
