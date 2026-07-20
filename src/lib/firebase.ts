import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, runTransaction } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Use the specific custom database ID provisioned if available
export const dbCustom = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : db;
