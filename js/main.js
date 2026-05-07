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

    let resultados = [];
    snap.forEach(d => resultados.push(d.data()));
    resultados.sort((a, b) => a.subcategoria.localeCompare(b.subcategoria) || a.pieza.localeCompare(b.pieza));

    document.getElementById('txtBusqueda').innerText = resultados[0].numEcon;
    document.getElementById('txtModelo').innerText = resultados[0].modelo || "-";
    document.getElementById('txtSerie').innerText = resultados[0].serie || "-";

    tabla.innerHTML = "";
    resultados.forEach(d => {
        const color = obtenerColorPorTexto(d.subcategoria);
        tabla.innerHTML += `
            <tr>
                <td><span class="badge" style="background-color:${color}">${d.subcategoria}</span></td>
                <td class="fw-bold">${d.pieza}</td>
                <td><code>${d.numParte}</code></td>
                <td class="text-center"><span class="badge rounded-pill bg-dark px-3">${d.cantidad}</span></td>
            </tr>`;
    });
    document.getElementById('resultadosBusqueda').classList.remove('d-none');
});