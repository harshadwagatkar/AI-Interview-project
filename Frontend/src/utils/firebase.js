
import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "interviewmate-dda36.firebaseapp.com",
  projectId: "interviewmate-dda36",
  storageBucket: "interviewmate-dda36.firebasestorage.app",
  messagingSenderId: "83285665021",
  appId: "1:83285665021:web:480601fcda49d39d2d0a94"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app)

const provider = new GoogleAuthProvider()

export {auth, provider}