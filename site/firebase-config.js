// TOE — Firebase web config (public by design, protected by Firestore rules).
// Images use Cloudinary (no Firebase Storage needed).
// 1) Create a Firebase project at https://console.firebase.google.com
// 2) Enable Auth (Email/Password) + Firestore (Storage NOT required).
// 3) Paste your web-app config below.
// 4) Set ADMIN_UID to your admin user's UID (Auth > Users).

window.TOE_FIREBASE_CONFIG = {
  apiKey: "AIzaSyB7YFI-rQNOOaWFieD3LSaLC6pQvnV3s6g",
  authDomain: "toepage-27ce5.firebaseapp.com",
  projectId: "toepage-27ce5",
  storageBucket: "toepage-27ce5.firebasestorage.app",
  messagingSenderId: "713170331453",
  appId: "1:713170331453:web:ebdf903c10843f46cac754"
};

// Firebase Auth UID allowed to write stories.
// Find it in Firebase Console > Authentication > Users > UID.
window.TOE_ADMIN_UID = "YVhdpK9UglTwKCg1QlVl7SJTRmT2";

// Set to true once the config above is real. Keeps the site on local seed data until then.
window.TOE_USE_FIREBASE = true;

// Cloudinary unsigned upload for story covers (replaces Firebase Storage).
// Create free account → Settings → Upload → Upload preset (Unsigned, folder: toe-stories).
window.TOE_CLOUDINARY = {
  cloudName: "cf1n27id",
  uploadPreset: "toe-stories",
  folder: "toe-stories"
};
