import { auth, db } from '../../js/database.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, limit } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

let editId = null;

// --- COLORES POR TEXTO ---
function obtenerColorPorTexto(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) hash = texto.charCodeAt(i) + ((hash << 5) - hash);
    const h = hash % 360;
    return `hsl(${h}, 65%, 40%)`;
}

// --- SEGURIDAD Y CARGA ---
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.replace("../login.html");
    else cargarInventario();
});

document.getElementById('btnLogout').addEventListener('click', async () => {
    await signOut(auth);
    window.location.replace("../index.html");
});

// --- 1. AUTOCOMPLETADO (MEMORIA) ---
const inputEcon = document.getElementById('adminNumEcon');
inputEcon.addEventListener('change', async () => {
    const valor = inputEcon.value.toUpperCase().trim();
    if (valor === "" || editId) return;

    const q = query(collection(db, "refacciones"), where("numEcon", "==", valor), limit(1));
    const snap = await getDocs(q);

    if (!snap.empty) {
        const d = snap.docs[0].data();
        document.getElementById('adminModelo').value = d.modelo || "";
        document.getElementById('adminSerie').value = d.serie || "";
        const msg = document.getElementById('msgAviso');
        msg.style.display = "block";
        setTimeout(() => msg.style.display = "none", 2000);
    }
});

// --- 2. FILTRO EN TABLA ---
document.getElementById('filtroEcon').addEventListener('input', (e) => {
    cargarInventario(e.target.value.toUpperCase().trim());
});

// --- 3. GUARDAR / ACTUALIZAR ---
document.getElementById('formAlta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnGuardar');
    const data = {
        numEcon: inputEcon.value.toUpperCase().trim(),
        modelo: document.getElementById('adminModelo').value.toUpperCase().trim(),
        serie: document.getElementById('adminSerie').value.toUpperCase().trim(),
        categoria: document.getElementById('adminCategoria').value.trim(),
        subcategoria: document.getElementById('adminSubcat').value.trim(),
        pieza: document.getElementById('adminPieza').value.trim(),
        numParte: document.getElementById('adminParte').value.toUpperCase().trim(),
        cantidad: parseInt(document.getElementById('adminCant').value)
    };

    try {
        if (editId) {
            await updateDoc(doc(db, "refacciones", editId), data);
            editId = null;
            btn.innerText = "GUARDAR EN CATÁLOGO";
            btn.className = "btn btn-success w-100 fw-bold shadow-sm";
        } else {
            await addDoc(collection(db, "refacciones"), data);
        }
        document.getElementById('formAlta').reset();
        const filtro = document.getElementById('filtroEcon').value.toUpperCase().trim();
        cargarInventario(filtro);
    } catch (err) { alert("Error: " + err.message); }
});

// --- 4. CARGAR TABLA ---
async function cargarInventario(filtro = "") {
    const snap = await getDocs(collection(db, "refacciones"));
    const tabla = document.getElementById('tablaAdmin');
    let items = [];

    snap.forEach(d => {
        const item = d.data();
        if (filtro === "" || item.numEcon.includes(filtro)) {
            items.push({ id: d.id, ...item });
        }
    });

    items.sort((a, b) => a.subcategoria.localeCompare(b.subcategoria) || a.pieza.localeCompare(b.pieza));
    tabla.innerHTML = "";

    items.forEach(item => {
        const color = obtenerColorPorTexto(item.subcategoria);
        // Escapar datos para los botones
        const params = `'${item.numEcon}', '${item.modelo}', '${item.serie}', '${item.categoria}', '${item.subcategoria}', '${item.pieza}', '${item.numParte}', ${item.cantidad}`;
        
        tabla.innerHTML += `
            <tr>
                <td><strong>${item.numEcon}</strong><br><small class="text-muted">M: ${item.modelo || '-'}</small></td>
                <td><div class="small text-muted">${item.categoria}</div><span class="badge" style="background-color:${color}">${item.subcategoria}</span></td>
                <td>${item.pieza}</td>
                <td><code>${item.numParte}</code></td>
                <td class="text-center fw-bold">${item.cantidad}</td>
                <td style="white-space: nowrap;">
                    <button class="btn btn-sm btn-info text-white" title="Clonar" onclick="clonarItem(${params})"><i class="bi bi-copy"></i></button>
                    <button class="btn btn-sm btn-warning mx-1" title="Editar" onclick="prepararEdicion('${item.id}', ${params})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" title="Eliminar" onclick="eliminarItem('${item.id}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
    });
}

// --- 5. FUNCIONES GLOBALES (ACCIONES) ---

window.clonarItem = (econ, mod, ser, cat, sub, pie, part, cant) => {
    editId = null;
    document.getElementById('adminNumEcon').value = econ;
    document.getElementById('adminModelo').value = mod;
    document.getElementById('adminSerie').value = ser;
    document.getElementById('adminCategoria').value = cat;
    document.getElementById('adminSubcat').value = sub;
    document.getElementById('adminPieza').value = pie;
    document.getElementById('adminParte').value = part;
    document.getElementById('adminCant').value = cant;

    const btn = document.getElementById('btnGuardar');
    btn.innerText = "GUARDAR (COPIA)";
    btn.className = "btn btn-info w-100 fw-bold text-white shadow-sm";
    window.scrollTo(0,0);
    document.getElementById('adminPieza').focus();
};

window.prepararEdicion = (id, econ, mod, ser, cat, sub, pie, part, cant) => {
    editId = id;
    document.getElementById('adminNumEcon').value = econ;
    document.getElementById('adminModelo').value = mod;
    document.getElementById('adminSerie').value = ser;
    document.getElementById('adminCategoria').value = cat;
    document.getElementById('adminSubcat').value = sub;
    document.getElementById('adminPieza').value = pie;
    document.getElementById('adminParte').value = part;
    document.getElementById('adminCant').value = cant;

    const btn = document.getElementById('btnGuardar');
    btn.innerText = "ACTUALIZAR REGISTRO";
    btn.className = "btn btn-warning w-100 fw-bold shadow-sm";
    window.scrollTo(0,0);
};

window.eliminarItem = async (id) => {
    if (confirm("¿Eliminar este registro?")) {
        await deleteDoc(doc(db, "refacciones", id));
        cargarInventario(document.getElementById('filtroEcon').value.toUpperCase().trim());
    }
};