import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDhXeRbvpDkopzZNo8bzEo31hZoI7G-Gi4",
    authDomain: "almacen-somsi.firebaseapp.com",
    projectId: "almacen-somsi",
    storageBucket: "almacen-somsi.firebasestorage.app",
    messagingSenderId: "342995844969",
    appId: "1:342995844969:web:6c095311e5648644aa87f8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);