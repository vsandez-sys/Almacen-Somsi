import { db } from './database.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// --- 1. UTILIDADES ---
window.generarColorSuave = (t) => {
    if (!t) return '#f8f9fa';
    let h = 0; for (let i = 0; i < t.length; i++) h = t.charCodeAt(i) + ((h << 5) - h);
    return `hsl(${Math.abs(h % 360)}, 60%, 94%)`;
};
window.generarColorTexto = (t) => {
    if (!t) return '#333';
    let h = 0; for (let i = 0; i < t.length; i++) h = t.charCodeAt(i) + ((h << 5) - h);
    return `hsl(${Math.abs(h % 360)}, 70%, 25%)`;
};
window.toggleConv = (id) => document.getElementById(`conv-${id}`)?.classList.toggle('d-none');

// --- 2. CARGAR CATEGORÍAS REALES ---
async function inicializarCategorias() {
    const select = document.getElementById('selectCategoria');
    try {
        const querySnapshot = await getDocs(collection(db, "refacciones"));
        const categoriasSet = new Set();
        
        querySnapshot.forEach(doc => {
            const cat = doc.data().categoria; // JALAMOS EL CAMPO CATEGORIA
            if (cat) categoriasSet.add(cat.trim());
        });

        const lista = Array.from(categoriasSet).sort();
        select.innerHTML = '<option value="">Todas las Categorías</option>';
        lista.forEach(c => {
            select.innerHTML += `<option value="${c}">${c.toUpperCase()}</option>`;
        });
    } catch (e) {
        console.error("Error al cargar categorías", e);
    }
}

// --- 3. PROCESO DE BÚSQUEDA ---
async function ejecutarBusqueda() {
    const texto = document.getElementById('filtroEcon').value.toUpperCase().trim();
    const catSeleccionada = document.getElementById('selectCategoria').value;
    const tabla = document.getElementById('tablaResultados');
    const seccion = document.getElementById('resultadosSeccion');

    if (!texto && !catSeleccionada) {
        seccion.style.display = 'none';
        return;
    }

    seccion.style.display = 'block';
    tabla.innerHTML = '<tr><td colspan="4" class="text-center p-5"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        const snap = await getDocs(collection(db, "refacciones"));
        let resultados = [];

        snap.forEach(doc => {
            const d = doc.data();
            const partes = Array.isArray(d.partes) ? d.partes : [];
            
            const coincideTexto = !texto || 
                (d.numEcon || "").toUpperCase().includes(texto) || 
                (d.pieza || "").toUpperCase().includes(texto) ||
                partes.some(p => String(p).toUpperCase().includes(texto));

            const coincideCat = !catSeleccionada || (d.categoria || "") === catSeleccionada;

            if (coincideTexto && coincideCat) {
                resultados.push({ id: doc.id, ...d });
            }
        });

        if (resultados.length === 0) {
            tabla.innerHTML = '<tr><td colspan="4" class="text-center p-5 text-muted">No se encontraron piezas.</td></tr>';
            return;
        }

        tabla.innerHTML = "";
        resultados.sort((a,b) => (a.numEcon || "").localeCompare(b.numEcon || ""));

        resultados.forEach(item => {
            const p = Array.isArray(item.partes) ? item.partes : [];
            const principal = p[0] || "S/N";
            const resto = p.slice(1);

            tabla.innerHTML += `
                <tr class="align-middle">
                    <td>
                        <span class="badge" style="background-color: ${window.generarColorSuave(item.subcategoria)}; color: ${window.generarColorTexto(item.subcategoria)}">
                            ${item.subcategoria || 'GENERAL'}
                        </span>
                    </td>
                    <td>
                        <div class="fw-bold text-dark">${item.pieza}</div>
                        <div class="text-muted small">Equipo: <b>${item.numEcon}</b></div>
                        ${resto.length > 0 ? `
                            <button class="btn btn-sm p-0 text-success fw-bold mt-1" onclick="window.toggleConv('${item.id}')">+ Equivalencias</button>
                            <div id="conv-${item.id}" class="d-none bg-light p-2 rounded border mt-1 small">
                                ${resto.map(c => `<div>• ${c}</div>`).join('')}
                            </div>
                        ` : ''}
                    </td>
                    <td><code class="text-clark-verde bg-dark px-2 py-1 rounded">${principal}</code></td>
                    <td class="text-center"><span class="badge bg-dark rounded-pill px-3">${item.cantidad}</span></td>
                </tr>`;
        });
    } catch (e) {
        tabla.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al consultar datos.</td></tr>';
    }
}

// --- 4. LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    inicializarCategorias();
    document.getElementById('btnBuscar').addEventListener('click', ejecutarBusqueda);
    document.getElementById('selectCategoria').addEventListener('change', ejecutarBusqueda);
    document.getElementById('filtroEcon').addEventListener('keypress', (e) => { if(e.key === 'Enter') ejecutarBusqueda(); });
});