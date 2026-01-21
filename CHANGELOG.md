# Changelog

All notable changes to the "Pipeline Tracker" project will be documented in this file.

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
