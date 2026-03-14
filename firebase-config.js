// firebase-config.js
// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsLHS2clx-yrEFuy42yYhCA56iKHkKx4o",
  authDomain: "smart-qr-portal.firebaseapp.com",
  projectId: "smart-qr-portal",
  storageBucket: "smart-qr-portal.firebasestorage.app",
  messagingSenderId: "143418993500",
  appId: "1:143418993500:web:f369844add1cd40cd0ef99"
};

// Initialize Firebase (using compat version for easy integration with static HTML)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Export as global for simplicity in this project's structure
window.db = db;
window.firebase = firebase;
