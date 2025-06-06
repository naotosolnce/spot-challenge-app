// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDTp1_ViC2yqorfhBlNqTnvpxvINvnIXh8",
  authDomain: "spot-challenge-app.firebaseapp.com",
  projectId: "spot-challenge-app",
  storageBucket: "spot-challenge-app.appspot.com",
  messagingSenderId: "295007057559",
  appId: "1:295007057559:web:d2ecc7cd40b1c2a61e5bd2"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
