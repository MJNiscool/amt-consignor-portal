import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDYUqZooxl3QTngKFp44d2GBRDtaoWX_ek",
  authDomain: "consign-demo-mjn.firebaseapp.com",
  projectId: "consign-demo-mjn",
  storageBucket: "consign-demo-mjn.firebasestorage.app",
  messagingSenderId: "389067563398",
  appId: "1:389067563398:web:6ba6c750048607813a8c07",
  measurementId: "G-WLPPT9YKNS"
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully.");
} else {
  app = getApp();
  console.log("Firebase already initialized.");
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const functions: Functions = getFunctions(app, 'us-central1');

export { app, auth, db, functions, httpsCallable };
