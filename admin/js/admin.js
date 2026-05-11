import { auth, db } from '../../js/database.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, limit } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

let editId = null;
let ordenAscendente = true;

// --- CONTROL DE SESIÓN ---
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.replace("../login.html");
    else cargarInventario();
});

document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));

// --- FUNCIÓN DE CARGA PRINCIPAL (CON SKELETON) ---
async function cargarInventario(filtro = "") {
    const tabla = document.getElementById('tablaAdmin');
    if (!tabla) return;

    // 1. Mostrar Skeletons mientras carga
    tabla.innerHTML = ""; 
    for (let i = 0; i < 5; i++) {
        tabla.innerHTML += `
            <tr>
                <td><div class="skeleton" style="width: 70%"></div></td>
                <td><div class="skeleton" style="width: 80%"></div></td>
                <td><div class="skeleton" style="width: 90%"></div></td>
                <td><div class="skeleton" style="width: 60%"></div></td>
                <td><div class="skeleton" style="width: 40%"></div></td>
                <td><div class="skeleton" style="width: 50%"></div></td>
            </tr>`;
    }

    try {
        const snap = await getDocs(collection(db, "refacciones"));
        let datos = [];
        
        snap.forEach(d => {
            const item = d.data();
            // Filtrado por Número Económico (Unidad)
            if (filtro === "" || item.numEcon.toUpperCase().includes(filtro.toUpperCase())) {
                datos.push({ id: d.id, ...item });
            }
        });

        // Ordenamiento
        datos.sort((a, b) => {
            const econA = a.numEcon.toUpperCase();
            const econB = b.numEcon.toUpperCase();
            return ordenAscendente ? econA.localeCompare(econB) : econB.localeCompare(econA);
        });

        // 2. Renderizar Datos Reales
        tabla.innerHTML = ""; 

        if (datos.length === 0) {
            tabla.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-muted">No hay coincidencias</td></tr>`;
            return;
        }

        datos.forEach(item => {
            const colorSub = obtenerColorPorTexto(item.subcategoria);
            const ref = item.refOriginal || "";
            const esc = (t) => String(t || "").replace(/'/g, "\\'");
            const params = `'${esc(item.numEcon)}','${esc(item.modelo)}','${esc(item.serie)}','${esc(item.categoria)}','${esc(item.subcategoria)}','${esc(item.pieza)}','${esc(item.numParte)}',${item.cantidad},'${esc(ref)}'`;
            
            tabla.innerHTML += `
                <tr class="align-middle">
                    <td>
                        <span class="fw-bold text-primary fs-5">${item.numEcon}</span><br>
                        <small class="text-muted fw-bold">${item.modelo}</small>
                    </td>
                    <td>
                        <div class="text-uppercase text-muted fw-bold mb-1" style="font-size: 0.6rem; letter-spacing: 1px;">${item.categoria}</div>
                        <span class="badge shadow-sm" style="background-color:${colorSub}">${item.subcategoria}</span>
                    </td>
                    <td>
                        <span class="fw-bold d-block">${item.pieza}</span>
                        ${ref ? `<small class="text-primary italic">Conv. de ${ref}</small>` : ''}
                    </td>
                    <td><code class="text-dark fw-bold">${item.numParte}</code></td>
                    <td class="text-center">
                        <span class="fw-bold fs-5 text-secondary">${item.cantidad}</span>
                    </td>
                    <td class="text-end px-3">
                        <div class="btn-group border rounded bg-white shadow-sm">
                            <button class="btn btn-sm btn-white" onclick="prepararEdicion('${item.id}', ${params})"><i class="bi bi-pencil-square text-warning"></i></button>
                            <button class="btn btn-sm btn-white" onclick="eliminarItem('${item.id}')"><i class="bi bi-trash3-fill text-danger"></i></button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) { 
        console.error("Error al cargar:", e);
        tabla.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error de conexión</td></tr>`;
    }
}

// --- GESTIÓN DEL FILTRO Y BÚSQUEDA ---
const filtroInput = document.getElementById('filtroEcon');
const btnClear = document.getElementById('btnClearSearch');

if (filtroInput) {
    filtroInput.addEventListener('input', (e) => {
        const val = e.target.value;
        // Mostrar/ocultar botón X
        if (btnClear) btnClear.style.display = val.length > 0 ? 'block' : 'none';
        // Filtrar tabla
        cargarInventario(val);
    });
}

// HACER FUNCIONES GLOBALES (Para que el HTML las vea)
window.limpiarBusqueda = () => {
    if (filtroInput) {
        filtroInput.value = "";
        if (btnClear) btnClear.style.display = 'none';
        cargarInventario("");
        filtroInput.focus();
    }
};

window.alternarOrden = () => {
    ordenAscendente = !ordenAscendente;
    const icono = document.getElementById('iconOrden');
    if (icono) icono.className = ordenAscendente ? "bi bi-sort-alpha-down" : "bi bi-sort-alpha-up";
    cargarInventario(filtroInput ? filtroInput.value : "");
};

// --- RESTO DE FUNCIONES (Guardar, Editar, Eliminar) ---

const inputEcon = document.getElementById('adminNumEcon');
const inputModelo = document.getElementById('adminModelo');
const inputSerie = document.getElementById('adminSerie');

document.getElementById('formAlta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        numEcon: inputEcon.value.toUpperCase().trim(),
        modelo: inputModelo.value.toUpperCase().trim(),
        serie: inputSerie.value.toUpperCase().trim(),
        categoria: document.getElementById('adminCategoria').value.toUpperCase().trim(),
        subcategoria: document.getElementById('adminSubcat').value.toUpperCase().trim(),
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

window.prepararEdicion = (id, econ, mod, ser, cat, sub, pie, part, cant, ref) => {
    editId = id;
    inputEcon.value = econ;
    inputModelo.value = mod;
    inputSerie.value = ser;
    document.getElementById('adminCategoria').value = cat;
    document.getElementById('adminSubcat').value = sub;
    document.getElementById('adminPieza').value = pie;
    document.getElementById('adminParte').value = part;
    document.getElementById('adminCant').value = cant;
    document.getElementById('adminRefOriginal').value = ref;
    document.getElementById('btnGuardar').innerText = "ACTUALIZAR REGISTRO";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.eliminarItem = async (id) => {
    if (confirm("¿Eliminar registro?")) {
        await deleteDoc(doc(db, "refacciones", id));
        cargarInventario();
    }
};

function obtenerColorPorTexto(texto) {
    let hash = 0;
    const str = String(texto);
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 60%, 40%)`;
}