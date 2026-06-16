import { initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/** True when a real Firebase config is present (env filled). */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/** Point the SDKs at the local emulators (functions/auth/firestore/storage). */
export const useEmulators = import.meta.env.VITE_USE_EMULATORS === "true";

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;
let functionsInstance: Functions | undefined;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
  functionsInstance = getFunctions(app);

  if (useEmulators) {
    // Ports must match firebase.json → "emulators" (Firestore is 8085 here).
    connectAuthEmulator(authInstance, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(dbInstance, "localhost", 8085);
    connectStorageEmulator(storageInstance, "localhost", 9199);
    connectFunctionsEmulator(functionsInstance, "localhost", 5001);
  }
}

export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
/** Shared Functions instance (wired to the emulator in local dev). */
export const functions = functionsInstance;
export const googleProvider = new GoogleAuthProvider();
export { app };
