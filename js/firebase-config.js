// ─────────────────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS
// ─────────────────────────────────────────────────────────────────────────────
// 1. Go to https://console.firebase.google.com and create a new project.
// 2. In the project, click "Build > Authentication > Get started"
//    and enable "Email/Password" as a sign-in method.
// 3. Click "Build > Firestore Database > Create database"
//    and start in production mode.
// 4. Go to Project Settings (gear icon) > "Your apps" > click </> (Web)
//    Register the app, then copy the firebaseConfig values below.
// 5. In Firestore, go to "Rules" and paste these security rules:
//
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /users/{userId} {
//          allow read: if request.auth != null &&
//            (request.auth.uid == userId ||
//             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
//          allow create: if request.auth != null && request.auth.uid == userId;
//          allow update, delete: if request.auth != null &&
//            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
//        }
//        match /events/{eventId} {
//          allow read: if request.auth != null;
//          allow write: if request.auth != null &&
//            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
//        }
//      }
//    }
//
// 6. Change ADMIN_CODE below to a secret code only your officers know.
//    Anyone with this code can register as admin.
// ─────────────────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
  authDomain:        "REPLACE_WITH_YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket:     "REPLACE_WITH_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId:             "REPLACE_WITH_YOUR_APP_ID"
};

// Secret code that grants admin role on registration — change this!
const ADMIN_CODE = "ZetaPsiClemson2025!";

// Active semesters for dues tracking — update each year
const DUES_SEMESTERS = [
  { key: "fall_2025",   label: "Fall 2025"   },
  { key: "spring_2026", label: "Spring 2026" }
];

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();
