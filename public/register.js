// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Your Firebase config (paste yours here)
const firebaseConfig = {
  apiKey: "AIzaSyDcmN6fevwByDdUBPvp0G2kypeGjxd93bQ",
    authDomain: "shelfie-93cb0.firebaseapp.com",
    projectId: "shelfie-93cb0",
    storageBucket: "shelfie-93cb0.firebasestorage.app",
    messagingSenderId: "381959208222",
    appId: "1:381959208222:web:a95ec154e6cd8f16b29d0f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ===== SIGNUP FUNCTION =====
window.signup = function() {
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert("Signup successful!");
      window.location.href = "index.html";  // redirect to login
    })
    .catch((error) => {
      alert(error.message);
    });
};

// ===== LOGIN FUNCTION =====
window.login = function() {
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert("Login successful!");
      window.location.href = "home.html";  // redirect to home
    })
    .catch((error) => {
      alert(error.message);
    });
};
