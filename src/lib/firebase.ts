import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAmmbHqmisXNigdvBufrUgOgF2qON7T3FU",
  authDomain: "lugotechbi.firebaseapp.com",
  projectId: "lugotechbi",
  storageBucket: "lugotechbi.firebasestorage.app",
  messagingSenderId: "16387349857",
  appId: "1:16387349857:web:44cb1e462abadcd5bdb920"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
