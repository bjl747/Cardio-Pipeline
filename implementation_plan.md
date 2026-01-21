# Implementation Plan - Admin & Names

## Goal Description
1.  **Admin Access**: Grant `ben.layher@gmail.com` full delete privileges on all candidates.
2.  **Recruiter Attribution**: Replace the "Shared" badge with the actual Recruiter Name in the Team View.

## Proposed Changes

### [MODIFY] [app.js](file:///Users/bigredjunkiesstudio/Desktop/Pipeline%20Tracker/Published%20Version/app.js)
- **User Lookup**: On load, fetch ALL users from `users` collection to create a `uid -> displayName` map. This ensures even old records show a name.
- **Render Logic**:
    - Replace "Shared" badge with `<span ...>${ownerName}</span>`.
    - Show "Delete" button if `currentUser.email === 'ben.layher@gmail.com'`.
- **Edit Logic**:
    - When editing, do NOT overwrite `ownerName` unless it's a new record. Use the map to fill it in if missing.

### [MODIFY] [firestore_rules_update.md](file:///Users/bigredjunkiesstudio/Desktop/Pipeline%20Tracker/Published%20Version/firestore_rules_update.md)
- Update Delete Rule: Allow delete if `request.auth.uid == userId` OR `request.auth.token.email == 'ben.layher@gmail.com'`.

## Verification Plan
1.  **Admin Check**: Login as Ben. Confirm "Delete" button appears on others' candidates.
2.  **Name Check**: Confirm "Shared" is gone and names appear (even for old records).
