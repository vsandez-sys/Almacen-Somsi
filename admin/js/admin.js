import { auth, db } from '../../js/database.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, limit } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

let editId = null;

function obtenerColorPorTexto(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) hash = texto.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hash % 360}, 65%, 40%)`;
}

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.replace("../login.html");
    else cargarInventario();
});

document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));

// --- CARGAR TABLA ---
async function cargarInventario(filtro = "") {
    const snap = await getDocs(collection(db, "refacciones"));
    const tabla = document.getElementById('tablaAdmin');
    tabla.innerHTML = "";

    snap.forEach(d => {
        const item = d.data();
        if (filtro === "" || item.numEcon.includes(filtro)) {
            const color = obtenerColorPorTexto(item.subcategoria);
            const ref = item.refOriginal || "";
            // Escapamos comillas para los botones
            const esc = (t) => String(t || "").replace(/'/g, "\\'");
            const params = `'${esc(item.numEcon)}','${esc(item.modelo)}','${esc(item.serie)}','${esc(item.categoria)}','${esc(item.subcategoria)}','${esc(item.pieza)}','${esc(item.numParte)}',${item.cantidad},'${esc(ref)}'`;

            tabla.innerHTML += `
                <tr>
                    <td><b>${item.numEcon}</b></td>
                    <td><span class="badge" style="background-color:${color}">${item.subcategoria}</span></td>
                    <td>${item.pieza} ${ref ? `<br><small class="text-primary">Conv. de ${ref}</small>` : ''}</td>
                    <td><code>${item.numParte}</code></td>
                    <td class="text-center">${item.cantidad}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="prepararEdicion('${d.id}', ${params})"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="eliminarItem('${d.id}')"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
        }
    });
}

// --- GUARDAR / EDITAR ---
document.getElementById('formAlta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        numEcon: document.getElementById('adminNumEcon').value.toUpperCase().trim(),
        modelo: document.getElementById('adminModelo').value.toUpperCase().trim(),
        serie: document.getElementById('adminSerie').value.toUpperCase().trim(),
        categoria: document.getElementById('adminCategoria').value,
        subcategoria: document.getElementById('adminSubcat').value.trim(),
        pieza: document.getElementById('adminPieza').value.trim(),
        numParte: document.getElementById('adminParte').value.toUpperCase().trim(),
        cantidad: parseInt(document.getElementById('adminCant').value),
        refOriginal: document.getElementById('adminRefOriginal').value.toUpperCase().trim()
    };

    if (editId) {
        await updateDoc(doc(db, "refacciones", editId), data);
        editId = null;
        document.getElementById('btnGuardar').innerText = "GUARDAR EN CATÁLOGO";
    } else {
        await addDoc(collection(db, "refacciones"), data);
    }
    e.target.reset();
    cargarInventario();
});

// --- FUNCIONES GLOBALES ---
window.prepararEdicion = (id, econ, mod, ser, cat, sub, pie, part, cant, ref) => {
    editId = id;
    document.getElementById('adminNumEcon').value = econ;
    document.getElementById('adminModelo').value = mod;
    document.getElementById('adminSerie').value = ser;
    document.getElementById('adminCategoria').value = cat;
    document.getElementById('adminSubcat').value = sub;
    document.getElementById('adminPieza').value = pie;
    document.getElementById('adminParte').value = part;
    document.getElementById('adminCant').value = cant;
    document.getElementById('adminRefOriginal').value = ref;
    document.getElementById('btnGuardar').innerText = "ACTUALIZAR REGISTRO";
    window.scrollTo(0, 0);
};

window.eliminarItem = async (id) => {
    if (confirm("¿Eliminar?")) {
        await deleteDoc(doc(db, "refacciones", id));
        cargarInventario();
    }
};

// --- LÓGICA DE COPIADO MAESTRO ---
const modalEl = document.getElementById('modalCopiaMasiva');
if (modalEl) {
    modalEl.addEventListener('show.bs.modal', async () => {
        const snap = await getDocs(collection(db, "refacciones"));
        const econs = new Set();
        snap.forEach(d => econs.add(d.data().numEcon));
        const select = document.getElementById('copyOrigen');
        select.innerHTML = '<option value="">Seleccione...</option>';
        [...econs].sort().forEach(e => select.innerHTML += `<option value="${e}">${e}</option>`);
    });

    document.getElementById('formCopiaMasiva').addEventListener('submit', async (e) => {
        e.preventDefault();
        const origen = document.getElementById('copyOrigen').value;
        const dEcon = document.getElementById('copyDestEcon').value.toUpperCase().trim();
        const dMod = document.getElementById('copyDestMod').value.toUpperCase().trim();
        const dSer = document.getElementById('copyDestSer').value.toUpperCase().trim();
        const btn = document.getElementById('btnEjecutarCopia');

        btn.disabled = true;
        btn.innerText = "Copiando...";

        const q = query(collection(db, "refacciones"), where("numEcon", "==", origen));
        const snap = await getDocs(q);

        const promesas = snap.docs.map(dsnap => {
            const p = dsnap.data();
            return addDoc(collection(db, "refacciones"), { ...p, numEcon: dEcon, modelo: dMod, serie: dSer });
        });

        await Promise.all(promesas);
        alert("Copiado exitoso");
        btn.disabled = false;
        btn.innerText = "COPIAR TODO EL INVENTARIO";
        bootstrap.Modal.getInstance(modalEl).hide();
        cargarInventario(dEcon);
    });
}

document.getElementById('filtroEcon').addEventListener('input', (e) => cargarInventario(e.target.value.toUpperCase()));