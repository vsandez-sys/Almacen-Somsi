import { db } from './database.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

function obtenerColorPorTexto(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) hash = texto.charCodeAt(i) + ((hash << 5) - hash);
    const h = hash % 360;
    return `hsl(${h}, 70%, 40%)`; 
}

async function inicializarBuscador() {
    const snap = await getDocs(collection(db, "refacciones"));
    const cats = new Set();
    const econs = new Set();
    
    snap.forEach(d => {
        cats.add(d.data().categoria);
        econs.add(d.data().numEcon);
    });

    const select = document.getElementById('categoria');
    select.innerHTML = '<option value="" disabled selected>Seleccione Categoría...</option>';
    [...cats].sort().forEach(c => select.innerHTML += `<option value="${c}">${c}</option>`);

    const dl = document.getElementById('listaEcons');
    econs.forEach(e => dl.innerHTML += `<option value="${e}">`);
}
inicializarBuscador();

document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const econ = document.getElementById('numEcon').value.toUpperCase().trim();
    const cat = document.getElementById('categoria').value;
    const tabla = document.getElementById('tablaCuerpo');

    const q = query(collection(db, "refacciones"), where("numEcon", "==", econ), where("categoria", "==", cat));
    const snap = await getDocs(q);

    if (snap.empty) { alert("Sin resultados."); return; }

    let crudos = [];
    snap.forEach(d => crudos.push(d.data()));

    // --- LÓGICA DE AGRUPACIÓN ---
    // 1. Separamos originales de conversiones
    let principales = crudos.filter(item => !item.refOriginal);
    let conversiones = crudos.filter(item => item.refOriginal);

    // 2. Si una conversión no encuentra a su "padre" en los resultados, la tratamos como principal
    conversiones.forEach(conv => {
        const padreExiste = principales.some(p => p.numParte === conv.refOriginal);
        if (!padreExiste) principales.push(conv);
    });

    // Ordenar principales
    principales.sort((a, b) => a.subcategoria.localeCompare(b.subcategoria) || a.pieza.localeCompare(b.pieza));

    // Renderizar
    tabla.innerHTML = "";
    principales.forEach((p, index) => {
        const color = obtenerColorPorTexto(p.subcategoria);
        const misConversiones = conversiones.filter(c => c.refOriginal === p.numParte);
        const hasConvs = misConversiones.length > 0;
        const idCollapse = `coll${index}`;

        // Fila Principal
        tabla.innerHTML += `
            <tr class="${hasConvs ? 'table-light' : ''}" style="${hasConvs ? 'cursor:pointer' : ''}" 
                ${hasConvs ? `data-bs-toggle="collapse" data-bs-target=".${idCollapse}"` : ''}>
                <td><span class="badge" style="background-color:${color}">${p.subcategoria}</span></td>
                <td class="fw-bold">
                    ${p.pieza}
                    ${hasConvs ? `<i class="bi bi-chevron-down ms-2 text-primary small"></i>` : ''}
                </td>
                <td><code>${p.numParte}</code></td>
                <td class="text-center"><span class="badge rounded-pill bg-dark px-3">${p.cantidad}</span></td>
            </tr>`;

        // Filas de Conversiones (Ocultas)
        misConversiones.forEach(c => {
            tabla.innerHTML += `
                <tr class="collapse ${idCollapse} bg-white shadow-sm">
                    <td class="ps-4 text-muted small italic"><i class="bi bi-arrow-return-right me-2"></i>Conversión</td>
                    <td class="text-muted small">${c.pieza} (Cross Reference)</td>
                    <td><code class="text-primary">${c.numParte}</code></td>
                    <td class="text-center"><span class="badge rounded-pill bg-secondary px-3">${c.cantidad}</span></td>
                </tr>`;
        });
    });

    // Actualizar encabezados
    document.getElementById('txtBusqueda').innerText = crudos[0].numEcon;
    document.getElementById('txtModelo').innerText = crudos[0].modelo || "-";
    document.getElementById('txtSerie').innerText = crudos[0].serie || "-";
    document.getElementById('resultadosBusqueda').classList.remove('d-none');
});