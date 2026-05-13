import { auth, db } from '../../js/database.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import {
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
    query, where, limit, writeBatch
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

let editId = null;
let ordenAscendente = true;

const inputEcon = document.getElementById('adminNumEcon');
const inputModelo = document.getElementById('adminModelo');
const inputSerie = document.getElementById('adminSerie');
const filtroInput = document.getElementById('filtroEcon');
const btnClear = document.getElementById('btnClearSearch');

// --- SEGURIDAD ---
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.replace("../login.html");
    else { cargarInventario(); llenarSelectorOrigen(); }
});

document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));

// --- 1. LÓGICA DE COLORES PARA CATEGORÍAS ---
function generarColorSuave(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
        hash = texto.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 45%, 92%)`;
}

function generarColorTexto(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
        hash = texto.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 60%, 30%)`;
}

// --- 2. CARGAR CATÁLOGO (VISTA TÉCNICA) ---
async function cargarInventario(filtro = "") {
    const tabla = document.getElementById('tablaAdmin');
    if (!tabla) return;
    tabla.innerHTML = '<tr><td colspan="5" class="text-center p-5"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        const snap = await getDocs(collection(db, "refacciones"));
        let datos = [];
        const f = filtro.toUpperCase().trim();

        snap.forEach(d => {
            const item = d.data();
            const coincideEcon = item.numEcon.toUpperCase().includes(f);
            const coincideParte = item.partes && item.partes.some(p => p.toUpperCase().includes(f));
            const coincidePieza = item.pieza && item.pieza.toUpperCase().includes(f);

            if (!f || coincideEcon || coincideParte || coincidePieza) {
                datos.push({ id: d.id, ...item });
            }
        });

        actualizarMetricasYSugerencias(datos);
        datos.sort((a, b) => ordenAscendente ? a.numEcon.localeCompare(b.numEcon) : b.numEcon.localeCompare(a.numEcon));

        tabla.innerHTML = "";
        datos.forEach(item => {
            const principal = (item.partes && item.partes.length > 0) ? item.partes[0] : "S/N";
            const conversiones = (item.partes && item.partes.length > 1) ? item.partes.slice(1) : [];
            const partesPipe = item.partes ? item.partes.join('|') : principal;

            const bgColor = generarColorSuave(item.subcategoria);
            const textColor = generarColorTexto(item.subcategoria);
            const esc = (t) => String(t || "").replace(/'/g, "\\'");

            tabla.innerHTML += `
                <tr class="align-middle">
                    <td>
                        <div class="fw-bold text-dark fs-5">${item.numEcon}</div>
                        <div class="text-muted small">${item.modelo}</div>
                    </td>
                    
                    <td>
                        <div class="text-uppercase text-muted fw-bold" style="font-size: 0.65rem;">${item.categoria}</div>
                        <div class="fw-bold text-primary" style="cursor:pointer" onclick="toggleConv('${item.id}')">
                            ${item.pieza} 
                            ${conversiones.length > 0 ? `<i id="icon-${item.id}" class="bi bi-info-circle ms-1 small"></i>` : ''}
                        </div>
                        <span class="badge" style="background-color: ${bgColor}; color: ${textColor}; font-size: 0.65rem; border: 1px solid ${textColor}22;">
                            ${item.subcategoria}
                        </span>
                        
                        <div id="conv-${item.id}" style="display:none;" class="mt-2 p-2 bg-light rounded border shadow-sm">
                            <small class="d-block text-muted fw-bold mb-1">Equivalencias:</small>
                            ${conversiones.map(c => `<div class="small text-dark font-monospace"><i class="bi bi-hash me-1"></i>${c}</div>`).join('')}
                        </div>
                    </td>
                    
                    <td>
                        <code class="px-2 py-1 bg-light border rounded text-dark fw-bold" style="font-size: 0.95rem;">
                            ${principal}
                        </code>
                    </td>
                    
                    <td class="text-center">
                        <div class="fw-bold fs-4 text-dark">${item.cantidad}</div>
                        <div class="text-muted fw-bold" style="font-size: 0.6rem; letter-spacing: 1px;">PZAS / UNI</div>
                    </td>
                    
                    <td class="text-end">
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-light text-primary border-0" onclick="copiarPiezaUnica('${item.id}')" title="Copiar a otra unidad">
                                <i class="bi bi-copy"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-light text-warning border-0" onclick="prepararEdicion('${item.id}','${esc(item.numEcon)}','${esc(item.modelo)}','${esc(item.serie)}','${esc(item.categoria)}','${esc(item.subcategoria)}','${esc(item.pieza)}','${esc(partesPipe)}',${item.cantidad})">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-light text-danger border-0" onclick="eliminarItem('${item.id}')">
                                <i class="bi bi-trash3"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) { console.error("Error al cargar catálogo:", e); }
}

// --- 3. FUNCIONES DE INTERFAZ Y EVENTOS ---

window.toggleConv = (id) => {
    const el = document.getElementById(`conv-${id}`);
    const icon = document.getElementById(`icon-${id}`);
    if (el.style.display === 'none') {
        el.style.display = 'block';
        if (icon) icon.className = "bi bi-info-circle-fill text-primary ms-1 small";
    } else {
        el.style.display = 'none';
        if (icon) icon.className = "bi bi-info-circle text-muted ms-1 small";
    }
};

function actualizarMetricasYSugerencias(datos) {
    const unidades = [...new Set(datos.map(d => d.numEcon))];
    document.getElementById('statUnidades').innerText = unidades.length;
    document.getElementById('statPiezas').innerText = datos.length;

    const fill = (id, list) => {
        const dl = document.getElementById(id);
        if (dl) dl.innerHTML = [...new Set(list)].sort().map(i => `<option value="${i}">`).join('');
    };
    fill('listaCategorias', datos.map(d => d.categoria));
    fill('listaSubcategorias', datos.map(d => d.subcategoria));
    fill('listaNombresPiezas', datos.map(d => d.pieza));
}

// Autocompletado de Unidad
inputEcon.addEventListener('blur', async () => {
    const ecoBusqueda = inputEcon.value.toUpperCase().trim();
    if (ecoBusqueda.length > 0 && !editId) {
        const q = query(collection(db, "refacciones"), where("numEcon", "==", ecoBusqueda), limit(1));
        const res = await getDocs(q);
        if (!res.empty) {
            const d = res.docs[0].data();
            inputModelo.value = d.modelo || "";
            inputSerie.value = d.serie || "";
        }
    }
});

// Gestión de Partes OEM
window.agregarCampoParte = (valor = "") => {
    const contenedor = document.getElementById('contenedorPartes');
    const div = document.createElement('div');
    div.className = "input-group input-group-sm mb-2";
    div.innerHTML = `
        <span class="input-group-text bg-light text-muted fw-bold">REF.</span>
        <input type="text" class="form-control adminParte" placeholder="Código OEM / Equivalencia" value="${valor}">
        <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()"><i class="bi bi-x"></i></button>
    `;
    contenedor.appendChild(div);
};

// --- 4. ACCIONES (GUARDAR, COPIAR, ELIMINAR) ---

document.getElementById('formAlta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const partes = Array.from(document.querySelectorAll('.adminParte'))
        .map(i => i.value.toUpperCase().trim())
        .filter(v => v !== "");

    const data = {
        numEcon: inputEcon.value.toUpperCase().trim(),
        modelo: inputModelo.value.toUpperCase().trim(),
        serie: inputSerie.value.toUpperCase().trim(),
        categoria: document.getElementById('adminCategoria').value.toUpperCase().trim(),
        subcategoria: document.getElementById('adminSubcat').value.toUpperCase().trim(),
        pieza: document.getElementById('adminPieza').value.toUpperCase().trim(),
        cantidad: parseInt(document.getElementById('adminCant').value),
        partes: partes
    };

    if (editId) {
        await updateDoc(doc(db, "refacciones", editId), data);
        cancelarEdicion();
    } else {
        await addDoc(collection(db, "refacciones"), data);
    }
    e.target.reset();
    resetFormPartes();
    cargarInventario();
});

window.copiarPiezaUnica = async (id) => {
    const dest = prompt("¿A qué N° Económico desea asignar esta pieza?");
    if (!dest) return;
    try {
        const snap = await getDocs(collection(db, "refacciones"));
        const base = snap.docs.find(d => d.id === id).data();
        await addDoc(collection(db, "refacciones"), {
            ...base,
            numEcon: dest.toUpperCase().trim()
        });
        alert(`Asignado correctamente a ${dest}`);
        cargarInventario();
    } catch (e) { alert("Error al asignar"); }
};

window.eliminarItem = async (id) => {
    if (confirm("¿Remover esta pieza del catálogo de esta unidad?")) {
        await deleteDoc(doc(db, "refacciones", id));
        cargarInventario();
    }
};

window.prepararEdicion = (id, econ, mod, ser, cat, sub, pie, partesPipe, cant) => {
    editId = id;
    inputEcon.value = econ; inputModelo.value = mod; inputSerie.value = ser;
    document.getElementById('adminCategoria').value = cat;
    document.getElementById('adminSubcat').value = sub;
    document.getElementById('adminPieza').value = pie;
    document.getElementById('adminCant').value = cant;

    const lista = partesPipe.split('|');
    const contenedor = document.getElementById('contenedorPartes');
    contenedor.innerHTML = "";
    lista.forEach((p, index) => {
        if (index === 0) {
            contenedor.innerHTML = `<div class="input-group input-group-sm mb-2"><span class="input-group-text bg-primary text-white fw-bold">PRINCIPAL</span><input type="text" class="form-control adminParte" value="${p}" required><button class="btn btn-primary" type="button" onclick="agregarCampoParte()"><i class="bi bi-plus"></i></button></div>`;
        } else { agregarCampoParte(p); }
    });

    document.getElementById('btnGuardar').innerText = "ACTUALIZAR FICHA";
    document.getElementById('editBadge').style.display = "block";
    document.getElementById('btnCancelarEdit').style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.cancelarEdicion = () => {
    editId = null;
    document.getElementById('formAlta').reset();
    resetFormPartes();
    document.getElementById('btnGuardar').innerText = "GUARDAR EN CATÁLOGO";
    document.getElementById('editBadge').style.display = "none";
    document.getElementById('btnCancelarEdit').style.display = "none";
};

function resetFormPartes() {
    document.getElementById('contenedorPartes').innerHTML = `<div class="input-group input-group-sm mb-2"><span class="input-group-text bg-primary text-white fw-bold">PRINCIPAL</span><input type="text" class="form-control adminParte" placeholder="Código OEM" required><button class="btn btn-primary" type="button" onclick="agregarCampoParte()"><i class="bi bi-plus"></i></button></div>`;
}

// Filtros y Utilidades
filtroInput.addEventListener('input', (e) => {
    btnClear.style.display = e.target.value ? 'block' : 'none';
    cargarInventario(e.target.value);
});

window.limpiarBusqueda = () => { filtroInput.value = ""; btnClear.style.display = 'none'; cargarInventario(); };
window.alternarOrden = () => {
    ordenAscendente = !ordenAscendente;
    document.getElementById('iconOrden').className = ordenAscendente ? "bi bi-sort-alpha-down" : "bi bi-sort-alpha-up";
    cargarInventario(filtroInput.value);
};

// --- CLONACIÓN MASIVA (Copiar catálogo completo de un equipo a otro) ---
async function llenarSelectorOrigen() {
    const sel = document.getElementById('copyOrigen');
    if (!sel) return;
    const snap = await getDocs(collection(db, "refacciones"));
    const ecos = [...new Set(snap.docs.map(d => d.data().numEcon))].sort();
    sel.innerHTML = '<option value="" disabled selected>Seleccione equipo origen...</option>';
    ecos.forEach(e => sel.innerHTML += `<option value="${e}">${e}</option>`);
}

document.getElementById('formCopiaMasiva').addEventListener('submit', async (e) => {
    e.preventDefault();
    const origen = document.getElementById('copyOrigen').value;
    const dest = document.getElementById('copyDestEcon').value.toUpperCase().trim();
    const q = query(collection(db, "refacciones"), where("numEcon", "==", origen));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach(d => {
        const ref = doc(collection(db, "refacciones"));
        batch.set(ref, {
            ...d.data(),
            numEcon: dest,
            modelo: document.getElementById('copyDestMod').value.toUpperCase(),
            serie: document.getElementById('copyDestSer').value.toUpperCase()
        });
    });
    await batch.commit();
    bootstrap.Modal.getInstance(document.getElementById('modalCopiaMasiva')).hide();
    cargarInventario(); e.target.reset();
});