# Firestore Security Rules Update (Corrected)

We need to make two changes:
1.  Allow the "User Map" feature to read the list of Recruiter Names.
2.  Allow the "Admin Delete" to work properly.

## Instructions
1.  Go to [Firebase Console](https://console.firebase.google.com/) -> **Firestore Database** -> **Rules**.
2.  **Replace** with this new version.
3.  Click **Publish**.

## New Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // USERS COLLECTION: 
    // - READ: Everyone (so we can see Recruiter Names).
    // - WRITE: Only own profile.
    match /artifacts/{appId}/users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      
        // CANDIDATES:
        // - READ/CREATE/UPDATE: Any logged-in user.
        // - DELETE: Owner OR Admin (ben.layher@gmail.com)
        match /candidates/{candidateId} {
            allow read: if request.auth != null; 
            allow create: if request.auth != null;
            allow update: if request.auth != null;
            allow delete: if request.auth != null && (
                request.auth.uid == userId || 
                request.auth.token.email == 'ben.layher@gmail.com'
            );
        }
    }

    // Allow collection group queries for 'candidates' (Team View)
    match /{path=**}/candidates/{candidate} {
      allow read: if request.auth != null;
    }
  }
}
```
