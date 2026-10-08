# Black Rabbit Logistics — Shared Cloud Data Setup

This adds shared cloud storage to the existing dashboard so a delivery entered on a phone is visible on a PC and vice versa.

## What is synchronized

- Rider registrations
- Deliveries
- Delivery status/history
- Rider attendance/check-in/check-out
- Rider earnings/payment records
- Weekly rider performance data derived from those records

The existing dashboard code continues to use its current functions (`getRiders()`, `getDeliveries()`, `getAttendance()`, etc.). The sync layer mirrors those local records to Firebase Firestore.

## 1. Create the Firebase project

1. Open Firebase Console.
2. Create a new project, for example `black-rabbit-logistics`.
3. Add a Web App to the project.
4. Copy the Firebase Web App configuration.
5. Create a Firestore Database.

## 2. Add Firebase SDKs to index.html

Place these immediately BEFORE your existing `script.js` tag:

```html
<script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js"></script>
<script src="firebase-sync.js"></script>
<script src="script.js"></script>
```

If your current page already loads `script.js`, replace that one script tag with the four lines above.

## 3. Configure firebase-sync.js

Open `firebase-sync.js` and replace the placeholder values in `FIREBASE_CONFIG` with the configuration from your Firebase Web App.

Do not change the rest of the file.

## 4. Firestore rules for initial testing

For a prototype/testing deployment, you can temporarily use:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /blackRabbit/{document} {
      allow read, write: if true;
    }
  }
}
```

**Important:** these rules are intentionally permissive for testing and are NOT suitable for a production logistics system. Once synchronization is confirmed, move the dashboard to Firebase Authentication and role-based Firestore rules.

## 5. First synchronization

Use the device that currently contains the correct delivery/rider/attendance data as the first device to connect.

Recommended order:

1. Open the dashboard on the phone that already has the records.
2. Confirm the dashboard says `Cloud sync connected`.
3. Wait a few seconds for the first upload.
4. Open the same dashboard on the PC.
5. Sign in.
6. The same riders, deliveries, attendance and earnings should appear.

## Important note about the existing login

Your current rider accounts are stored locally and passwords are handled by the existing dashboard code. The sync layer makes the rider records available on other devices, but this is not the same as implementing secure cloud authentication.

For production, the next upgrade should be:

- Firebase Authentication for rider/admin sign-in
- Firestore security rules based on authenticated roles
- Server-side protection for admin operations
- No plaintext passwords in Firestore/localStorage

## Existing dashboard features preserved

The cloud layer does not remove or change:

- 200-meter office GPS geofence
- ₦1,000 check-in fee
- Rider check-in/check-out
- Weekly rider earnings
- Delivered-only revenue calculation
- Rider performance/top-rider calculations
- Delivery permissions
- Super Admin dashboard
- Rider dashboard
