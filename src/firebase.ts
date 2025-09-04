// Firebase config and helper for raise hand feature
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove } from 'firebase/database';

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  databaseURL: 'YOUR_DATABASE_URL',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, onValue, remove };