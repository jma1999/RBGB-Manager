// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD9JSB9s-xV-IMWmKNbuij6yJ-swo3dlZ0",
  authDomain: "rbgb-manager.firebaseapp.com",
  projectId: "rbgb-manager",
  storageBucket: "rbgb-manager.firebasestorage.app",
  messagingSenderId: "69292993076",
  appId: "1:69292993076:web:2ed8e9959999202ad4b861",
  measurementId: "G-SS1XF5W3ZT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);