
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ------------------------------------------------------------------
// 🛑 IMPORTANT: PASTE YOUR FIREBASE CONFIGURATION BELOW
// You can find this in Firebase Console -> Project Settings -> General
// ------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "AIzaSyDidxY8oSQH86s6dTxjce2Ndt06yTySe0U",
  authDomain: "finmate-b86d0.firebaseapp.com",
  projectId: "finmate-b86d0",
  storageBucket: "finmate-b86d0.firebasestorage.app",
  messagingSenderId: "572089235354",
  appId: "1:572089235354:web:c5be5e360a8e72e13eec23",
  measurementId: "G-38G634FKWP"
};

// Initialize Firebase using Modular Syntax
const app = initializeApp(firebaseConfig);

// Export Modular Instances
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
