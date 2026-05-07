import { auth } from './database.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginUser').value;
        const pass = document.getElementById('loginPass').value;

        try {
            await signInWithEmailAndPassword(auth, email, pass);
            window.location.href = 'admin/dashboard.html';
        } catch (err) {
            alert("Acceso denegado: Credenciales incorrectas.");
        }
    });
}