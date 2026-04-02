// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  // @ts-ignore
  getReactNativePersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFn7cGtZjFl1vCAWUMGfWqUZb1uoZfiRk",
  authDomain: "wallet-plus-database.firebaseapp.com",
  projectId: "wallet-plus-database",
  storageBucket: "wallet-plus-database.firebasestorage.app",
  messagingSenderId: "328127035725",
  appId: "1:328127035725:web:206dd6aa7690722e5d9f04"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Auth with Persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore
export const db = getFirestore(app);