import { auth, db } from '../../js/database.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, limit } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

let editId = null;
let ordenAscendente = true;

// Referencias a los inputs del formulario
const inputEcon = document.getElementById('adminNumEcon');
const inputModelo = document.getElementById('adminModelo');
const inputSerie = document.getElementById('adminSerie');
const filtroInput = document.getElementById('filtroEcon');
const btnClear = document.getElementById('btnClearSearch');

// --- CONTROL DE SESIÓN ---
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.replace("../login.html");
    else cargarInventario();
});

document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));

// --- AUTOCOMPLETADO INTELIGENTE (CON LIMPIEZA) ---
if (inputEcon) {
    inputEcon.addEventListener('blur', async () => {
        const valorEcon = inputEcon.value.toUpperCase().trim();
        
        // 1. Siempre limpiamos primero para evitar "arrastrar" datos viejos
        if (!editId) { // Solo limpiamos automáticamente si NO estamos editando
            inputModelo.value = "";
            inputSerie.value = "";
        }

        if (valorEcon.length === 0 || editId) return;

        try {
            // Buscamos si el económico ya existe para copiar su Modelo y Serie
            const q = query(collection(db, "refacciones"), where("numEcon", "==", valorEcon), limit(1));
            const snap = await getDocs(q);

            if (!snap.empty) {
                const datos = snap.docs[0].data();
                inputModelo.value = datos.modelo || "";
                inputSerie.value = datos.serie || "";
                
                // Feedback visual de éxito
                inputModelo.classList.add('is-valid');
                inputSerie.classList.add('is-valid');
                setTimeout(() => {
                    inputModelo.classList.remove('is-valid');
                    inputSerie.classList.remove('is-valid');
                }, 1500);
            }
        } catch (e) {
            console.error("Error en autocompletado:", e);
        }
    });
}

// --- CARGAR TABLA (SKELETON + ORDENAMIENTO + FILTRO) ---
async function cargarInventario(filtro = "") {
    const tabla = document.getElementById('tablaAdmin');
    if (!tabla) return;

    tabla.innerHTML = ""; 
    for (let i = 0; i < 5; i++) {
        tabla.innerHTML += `<tr><td colspan="6"><div class="skeleton"></div></td></tr>`;
    }

    try {
        const snap = await getDocs(collection(db, "refacciones"));
        let datos = [];
        
        snap.forEach(d => {
            const item = d.data();
            if (filtro === "" || item.numEcon.toUpperCase().includes(filtro.toUpperCase())) {
                datos.push({ id: d.id, ...item });
            }
        });

        datos.sort((a, b) => {
            const econA = a.numEcon.toUpperCase();
            const econB = b.numEcon.toUpperCase();
            return ordenAscendente ? econA.localeCompare(econB) : econB.localeCompare(econA);
        });

        tabla.innerHTML = ""; 
        if (datos.length === 0) {
            tabla.innerHTML = `<tr><td colspan="6" class="text-center p-4">Sin resultados</td></tr>`;
            return;
        }

        datos.forEach(item => {
            const colorSub = obtenerColorPorTexto(item.subcategoria);
            const ref = item.refOriginal || "";
            const esc = (t) => String(t || "").replace(/'/g, "\\'");
            const params = `'${esc(item.numEcon)}','${esc(item.modelo)}','${esc(item.serie)}','${esc(item.categoria)}','${esc(item.subcategoria)}','${esc(item.pieza)}','${esc(item.numParte)}',${item.cantidad},'${esc(ref)}'`;
            
            tabla.innerHTML += `
                <tr class="align-middle">
                    <td><span class="fw-bold text-primary fs-5">${item.numEcon}</span><br><small>${item.modelo}</small></td>
                    <td>
                        <div class="small text-muted fw-bold">${item.categoria}</div>
                        <span class="badge" style="background-color:${colorSub}">${item.subcategoria}</span>
                    </td>
                    <td><span class="fw-bold">${item.pieza}</span><br>${ref ? `<small class="text-primary italic">Ref: ${ref}</small>` : ''}</td>
                    <td><code class="text-dark fw-bold">${item.numParte}</code></td>
                    <td class="text-center"><span class="fw-bold fs-5 text-secondary">${item.cantidad}</span></td>
                    <td class="text-end">
                        <div class="btn-group border rounded shadow-sm bg-white">
                            <button class="btn btn-sm btn-white" onclick="prepararEdicion('${item.id}', ${params})"><i class="bi bi-pencil-square text-warning"></i></button>
                            <button class="btn btn-sm btn-white" onclick="eliminarItem('${item.id}')"><i class="bi bi-trash3-fill text-danger"></i></button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}

// --- FUNCIONES GLOBALES (CONECTADAS AL HTML) ---

if (filtroInput) {
    filtroInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (btnClear) btnClear.style.display = val.length > 0 ? 'block' : 'none';
        cargarInventario(val);
    });
}

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
    cargarInventario(filtroInput.value);
};

// --- CRUD: GUARDAR / EDITAR / ELIMINAR ---

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
    return `hsl(${Math.abs(hash) % 360}, 65%, 40%)`;
}