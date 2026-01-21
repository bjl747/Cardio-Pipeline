# Firebase & Make.com Configuration Guide

To enable **Dynamic Email Routing** (where the app sends emails to the correct recruiter instead of a hardcoded address), you need to configure two things.

## 1. Firebase Configuration (Add Official Email)

You need to tell the system what "Official Email" each user should use.

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Firestore Database**.
3.  Go to the `users` collection: `artifacts` -> `default-app-id` -> `users`.
4.  Find the document for a specific user (e.g., your own UID).
5.  **Add a New Field**:
    *   **Field Name:** `officialEmail`
    *   **Type:** `string`
    *   **Value:** (Enter the email address they want to receive lists at, e.g., `ben.layher@gmail.com`).
6.  Repeat for any other recruiters who need a custom email.

*If you skip this, the app will just use their login email.*

## 2. Make.com Configuration (Update Webhook)

You need to tell Make.com to "listen" for this new email address.

1.  Open your **"Email Hot List"** scenario in Make.com.
2.  Click on the **Webhooks** module (the first one).
3.  Click **"Redetermine Data Structure"**.
4.  Go back to your App, click "Email List", and let it send a test request.
5.  Make.com will say "Successfully Determined".
6.  Now, open the **Gmail/Email module** in your scenario.
7.  In the **"To"** field, delete the hardcoded email.
8.  Select the purple `targetEmail` bubble from the Webhook steps.

*Result: Your automation now sends the list to whatever email address the app tells it to!*

## 3. Update "Welcome Email" Scenario (Make.com)

The "Trigger Welcome Email" feature now sends the `targetEmail` too.

1.  Open your **"Welcome Email"** scenario in Make.com.
2.  Click the **Webhooks** module.
3.  Click **"Redetermine Data Structure"**.
4.  Go to your app, create a new candidate, and check **"Trigger Welcome Email"**.
5.  Make.com will see the new `targetEmail` field.
6.  Update your **Gmail/Email Module** to use `targetEmail` as the recipient (or CC/BCC) if you want the recruiter to get a copy.
