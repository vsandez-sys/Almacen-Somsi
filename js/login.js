import { auth } from './database.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

// --- LÓGICA DE LOGIN ---
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

// --- SINCRONIZACIÓN DE VIDEO (REVELAR LOGO) ---
const video = document.getElementById('videoLogin');
const glassContent = document.getElementById('glassContent');

if (video && glassContent) {
    video.addEventListener('timeupdate', () => {
        // Al segundo 4.5 se desvanece el cristal para ver el logo del video
        if (video.currentTime >= 4.5) {
            glassContent.classList.add('hide-content');
        } else {
            // Reaparece cuando el video hace loop (segundo 0)
            glassContent.classList.remove('hide-content');
        }
    });
}