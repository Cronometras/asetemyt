// Public Firebase Web configuration shared by browser and server.
// These identifiers are public; service-account secrets must never go here.
export const firebaseConfig = {
  apiKey: import.meta.env?.PUBLIC_FIREBASE_API_KEY || 'AIzaSyCVYS2LxwErdPuotup7fC5_qM8p2mXkcK0',
  authDomain: import.meta.env?.PUBLIC_FIREBASE_AUTH_DOMAIN || 'asetemyt-ec205.firebaseapp.com',
  projectId: import.meta.env?.PUBLIC_FIREBASE_PROJECT_ID || 'asetemyt-ec205',
  storageBucket: import.meta.env?.PUBLIC_FIREBASE_STORAGE_BUCKET || 'asetemyt-ec205.firebasestorage.app',
  messagingSenderId: import.meta.env?.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '267270254597',
  appId: import.meta.env?.PUBLIC_FIREBASE_APP_ID || '1:267270254597:web:aa61aef2c4c9ee77d26c6c',
};
