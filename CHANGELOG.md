# Changelog

All notable changes to the "Pipeline Tracker" project will be documented in this file.

## [1.8.1] - 2026-01-22
### Fixed
- **Talked Button**: Fixed a crash when clicking "Talked" by importing the missing `serverTimestamp` function.

## [1.8.0] - 2026-01-22
### Added
- **Licenses Tab**: A new tab featuring a 50-state list of license requirements.
- **Quick License Logic**: Visual indicators for states with quick licensing processes.
- **Theme**: Purple neon styling for the new section.

## [1.7.0] - 2026-01-21
### Added
- **Geo Preferences**:
    - **Open Geo Toggle**: Added "Open Geo" checkbox above the map. Selecting it clears the map and sets the preference to "OPEN".
    - **Region Buttons**: Added a grid of region buttons (NW, NE, Midwest, etc.) below the map for quick selection of multiple states.
- **"Talked" Logger**: Added a "Talked" button to the candidate details panel. Clicking it logs the current timestamp and displays the "Last Talked" date/time immediately next to the button.
- **Pay Requirements**: Added "Pay Requirements" (`$/wk`) display to the expanded candidate profile.

### Changed
- **UI Colors**: Updated "Active Licenses" and "Certifications" badges to use **Amber/Yellow** styling (instead of Rose/Indigo) for better visibility and theme consistency.

### Fixed
- **Pay Data Usage**: Fixed an issue where Pay Requirements were saving under a legacy key (`pay`) but trying to display a new key (`payReq`). Unified logic to use `payReq` for all new saves and fallback to `pay` for existing records.

### Documentation
- **AI Handover**: Created `AI_INSTRUCTIONS.md`, a comprehensive guide for future AI assistants to understand the project architecture, workflow (GitHub deployment), and key features (Fire-to-Ice, Admin Mode, Geo Logic).

## [1.6.0] - 2026-01-21
### Added
- **Admin Team Email Button**: Added a dedicated "Admin Team List" button (visible only to admin) that emails the "Cardio 45" team list to the admin, with "Recruiter" as the first data column.
- **Login Error Handling**: Added a robust error catcher to the "Connecting..." state. If Firebase fails to load (permissions/network), it now prompts the user to "Logout and Retry" instead of freezing.
- **Fire-to-Ice Theme**: Refactored urgency colors:
    - **Hot (< 45 Days)**: Now **Red**.
    - **Warm (45-90 Days)**: **Yellow** (Unchanged).
    - **Cold (90+ Days)**: Now **Blue/Cyan** (Ice).
    - Updated glows and legend to match.

### Changed
- **Phone Interaction**: Clicking a phone number in the detailed view now **Copies to Clipboard** instead of attempting to open a call handler. A toast notification confirms success.

### Fixed
- **Make Automation Crash**: Added a fallback for `targetEmail` in the webhook payload. If the email is undefined, it defaults to a safe string to prevent `JSON.stringify` from stripping the key and causing a "Missing Value" error in Make.
## [1.5.0] - 2026-01-21
### Added
- **Dynamic Welcome Email**: The "Trigger Welcome Email" checkbox now dynamically routes the notification to the recruiter's `officialEmail` (or login email), matching the Hot List logic.
- **Webhook Payload Update**: Welcome email webhook now includes `targetEmail` and `ownerName`.

## [1.4.0] - 2026-01-21
### Added
- **Admin Privileges**: User `ben.layher@gmail.com` (BJ Layher) can now delete any candidate.
- **Recruiter Names**: Team View now displays the actual Recruiter Name instead of "Shared" (and "BJ Layher" for the admin).
- **User Map**: `app.js` now fetches all users on load to ensure accurate name attribution on historical records.

## [1.3.0] - 2026-01-21
### Added
- **Team View ("Cardio 45")**: 
    - Added tabbed navigation to switch between "My Pipeline" and "Cardio 45".
    - "Cardio 45" queries **all** candidates from all recruiters available within 45 days.
    - Added `collectionGroup` query logic to `app.js`.
- **Shared Editing**: 
    - Users can edit any candidate in the team view.
    - **Audit Trail**: Non-owner edits automatically append a timestamped note (e.g., `[Last Edit: Name - Date]`).
    - **Delete Protection**: Delete button is hidden for candidates not owned by the current user.
- **Documentation**: Added `firestore_rules_update.md` for required security rule changes.

## [1.2.1] - 2026-01-20
### Fixed
- **Email Hot List**: Added error handling for user profile fetching. If the app cannot read the `officialEmail` field (e.g., missing permissions or document), it now gracefully falls back to the logged-in user's email instead of throwing a Network Error.

## [1.2.0] - 2026-01-20
### Added
- **Dynamic Email Routing**: "Email Hot List" button now checks Firestore user profile for `officialEmail`.
- **Make.com Integration**: Updated webhook payload to include `targetEmail`.
- **Configuration Guide**: Added `firebase_make_guide.md` for external setup.

## [1.1.0] - 2026-01-20
### Added
- **Phone Formatting**: Input now auto-formats as `(XXX) XXX-XXXX`.
- **Clickable Links**: 
    - Emails are now `mailto:` links.
    - Phone numbers are now `tel:` links (Vonage compatible).
- **Persistent UI**: "Placed" status update no longer auto-closes the details panel.

### Changed
- **Defaults**: "Trigger Welcome Email" toggle now defaults to **OFF**.

## [1.0.0] - 2026-01-20
### Refactor
- Split monolithic `index-v3.html` into:
    - `index.html` (Structure)
    - `style.css` (Tailwind & Custom Styles)
    - `app.js` (Logic & Firebase)
- **Map Restoration**: Recovered missing US Map SVG visualization.
- **Deployment**: Established `Published Version` folder for GitHub Pages deployment.
