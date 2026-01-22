# AI Assistant Instructions - Pipeline Tracker Project

## Project Overview
This is a **Pipeline Tracker** web application for recruiters (specifically "Cardio 45"). It allows tracking of candidates, their availability, and urgency statuses.

## Tech Stack & Architecture
-   **Frontend**: Vanilla HTML (`index.html`), Tailwind CSS + Custom CSS (`style.css`), Vanilla JS (`app.js`).
-   **Backend**: Firebase Firestore (NoSQL).
-   **Hosting**: GitHub Pages (served from the `Published Version/` folder).

## Workflow (CRITICAL)
**We do NOT have direct Git/Command Line access to push code.**
1.  **Work Locally**: All changes are made to the files in `/Users/bigredjunkiesstudio/Desktop/Pipeline Tracker/Published Version/`.
2.  **Manual Deployment**: The user **manually uploads** the modified files to GitHub via the web interface.
3.  **Your Responsibility**:
    -   After completing a task, **you MUST explicitly list the files** that need to be uploaded.
    -   Tell the user clearly: "Please upload [list of files] to GitHub."
    -   Advise them to perform a **Hard Refresh** (Shift+Cmd+R) after deployment to clear browser cache.

## Key Features / Logic
-   **Urgency Colors (Fire-to-Ice)**:
    -   **Red (< 45 Days)**: Hot/ASAP.
    -   **Yellow (45-90 Days)**: Warm.
    -   **Blue (90+ Days)**: Cold.
-   **Admin**: `ben.layher@gmail.com` has special privileges (Admin Email Button, Delete any record).
-   **Geo Preferences**: Includes an "Open Geo" toggle and Region Buttons that manipulate the map SVG.
-   **Phone Numbers**: Clicking a phone number copies it to the clipboard (`window.copyToClipboard`).

## Artifacts
-   `CHANGELOG.md`: Always update this file with a new version number and list of changes for every batch of work.
-   `task.md`: Maintain the current task list.

## Common Issues
-   **Browser Cache**: If the user says a change "didn't work" immediately after deployment, it is almost always cache. Ask for a hard refresh.
-   **Formatting**: Pay data can be messy. Use the regex stripper in `app.js` to keep it clean.
