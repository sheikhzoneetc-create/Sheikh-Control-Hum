// Firebase Web SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTAOFNVhvCBKCa4AsoJmN2KGKRZiPoEH0",
  authDomain: "sheikh-control-hub.firebaseapp.com",
  projectId: "sheikh-control-hub",
  storageBucket: "sheikh-control-hub.firebasestorage.app",
  messagingSenderId: "197517134186",
  appId: "1:197517134186:web:f36df2b659b5ac61773d13",
  measurementId: "G-XXS10FLEDG"
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot 
};
