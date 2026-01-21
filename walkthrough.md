# Walkthrough - Team View ("Cardio 45")

I have added the **Team View** feature to your app!

## 1. New Tabbed Interface
You will now see two tabs at the top of your dashboard:
- **MY PIPELINE**: This is your private list (functionality is unchanged).
- **CARDIO 45 (TEAM)**: This loads **all** candidates from **all** recruiters that are available in the next 45 days.

## 2. Shared Editing & Audit Trails
- **Editing**: You can edit ANY candidate in the "Cardio 45" list.
- **Audit Note**: If you edit someone else's candidate, the system will automatically add a note to the bottom of their file: `[Last Edit: YourName - Date/Time]`.
- **Delete Protection**: You will notice the "Delete" button is **missing** if you are viewing a candidate you did not create.

## 3. Required Setup (One-Time)
To make this work, you must update your **Firestore Security Rules**.
Please follow the steps in this new file:
👉 **[Firestore Security Rules Update](file:///Users/bigredjunkiesstudio/Desktop/Pipeline%20Tracker/Published%20Version/firestore_rules_update.md)**

*(Note: When you first load the "Cardio 45" tab, check your browser console. Firebase might ask you to click a link to build a new index. This is normal!)*

## Deployment
1.  Drag & Drop `index.html`, `app.js`, and `style.css` to GitHub.
2.  Update your Firestore Rules (in Firebase Console).
