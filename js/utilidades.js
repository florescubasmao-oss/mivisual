// MI VISUAL - archivo modularizado

function mostrarCard(id, estado){
    const el = document.getElementById(id);
    if (el) el.style.display = estado;
}

function mostrarPantalla(html){
    const pantalla = document.getElementById("pantalla");
    const resultado = document.getElementById("resultadoProduccion");
    const menu = document.getElementById("menuPrincipal");

    if (resultado) resultado.innerHTML = "";
    if (menu) menu.style.display = "none";
    if (pantalla) pantalla.innerHTML = html;
    if (typeof setBotonNavegacion === "function") setBotonNavegacion("modulo");

    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
}

function limpiarPantalla(){
    const pantalla = document.getElementById("pantalla");
    const resultado = document.getElementById("resultadoProduccion");
    if (pantalla) pantalla.innerHTML = "";
    if (resultado) resultado.innerHTML = "";
}

function toggleDetalle(id, btn){

    const div = document.getElementById(id);

    if(!div) return;

    const contenedor = btn ? btn.closest(".mv58-cuadrilla-card, .mv4-kpi-card, .mv4-sede-card") : null;

    const visible =
        window.getComputedStyle(div).display !== "none";

    if(visible){

        div.style.display = "none";
        if(contenedor) contenedor.classList.remove("detalle-abierto");

        if(btn){
            btn.classList.remove("detalle-abierto-btn");
            if(id.startsWith("puntos_")){
                btn.innerHTML = "⭐ Ver detalle de puntos";
            }else if(id.startsWith("kpi_")){
                btn.innerHTML = "▼ Ver cuadrillas";
            }else if(id.startsWith("sede_")){
                btn.innerHTML = "▼ Ver indicadores y cuadrillas";
            }else{
                btn.innerHTML = "▼ Ver detalle";
            }
        }

    }else{

        div.style.display = "block";
        if(contenedor) contenedor.classList.add("detalle-abierto");

        if(btn){
            btn.classList.add("detalle-abierto-btn");
            if(id.startsWith("puntos_")){
                btn.innerHTML = "⭐ Ocultar detalle de puntos";
            }else if(id.startsWith("kpi_")){
                btn.innerHTML = "▲ Ocultar cuadrillas";
            }else if(id.startsWith("sede_")){
                btn.innerHTML = "▲ Ocultar indicadores y cuadrillas";
            }else{
                btn.innerHTML = "▲ Ocultar detalle";
            }
        }

    }

}

/* =====================================================
   V291 - Fecha y hora visibles en formato Perú
   - Zona horaria: America/Lima
   - Hora: 1 a 12 con a. m. / p. m.
   - No modifica valores guardados ni usados en cálculos.
   ===================================================== */
function formatearHoraDesdePartesPeruApp(horas, minutos, segundos, incluirSegundos){
    const h24 = ((Number(horas) % 24) + 24) % 24;
    const periodo = h24 >= 12 ? "p. m." : "a. m.";
    const h12 = h24 % 12 || 12;
    const mm = String(Number(minutos) || 0).padStart(2, "0");
    const ss = String(Number(segundos) || 0).padStart(2, "0");
    return `${h12}:${mm}${incluirSegundos ? `:${ss}` : ""} ${periodo}`;
}

function formatearHoraPeruApp(valor, incluirSegundos){
    if(valor === undefined || valor === null || valor === "") return "";

    if(typeof valor === "number" && Number.isFinite(valor)){
        const total = Math.round((((valor % 1) + 1) % 1) * 86400) % 86400;
        return formatearHoraDesdePartesPeruApp(
            Math.floor(total / 3600),
            Math.floor((total % 3600) / 60),
            total % 60,
            !!incluirSegundos
        );
    }

    const texto = valor.toString ? valor.toString().trim() : "";
    if(!texto) return "";

    const horaSimple = texto.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|A\.?\s*M\.?|P\.?\s*M\.?)?$/i);
    if(horaSimple){
        let horas = Number(horaSimple[1]);
        const periodo = (horaSimple[4] || "").toUpperCase().replace(/[^APM]/g, "");
        if(periodo.startsWith("P") && horas < 12) horas += 12;
        if(periodo.startsWith("A") && horas === 12) horas = 0;
        return formatearHoraDesdePartesPeruApp(
            horas,
            Number(horaSimple[2]),
            Number(horaSimple[3] || 0),
            !!incluirSegundos
        );
    }

    const fecha = valor instanceof Date ? valor : new Date(texto);
    if(Number.isNaN(fecha.getTime())) return texto;

    if(fecha.getUTCFullYear() <= 1900){
        return formatearHoraDesdePartesPeruApp(
            fecha.getUTCHours(),
            fecha.getUTCMinutes(),
            fecha.getUTCSeconds(),
            !!incluirSegundos
        );
    }

    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Lima",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).formatToParts(fecha);
    const mapa = {};
    partes.forEach(p => mapa[p.type] = p.value);
    let horas = Number(mapa.hour || 0);
    if(horas === 24) horas = 0;
    return formatearHoraDesdePartesPeruApp(
        horas,
        Number(mapa.minute || 0),
        Number(mapa.second || 0),
        !!incluirSegundos
    );
}

function formatearFechaPeruApp(valor){
    if(valor === undefined || valor === null || valor === "") return "";
    const texto = valor.toString ? valor.toString().trim() : "";
    if(!texto) return "";

    let partes = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\D|$)/);
    if(partes) return `${partes[1].padStart(2, "0")}/${partes[2].padStart(2, "0")}/${partes[3]}`;

    partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(partes) return `${partes[3]}/${partes[2]}/${partes[1]}`;

    const fecha = valor instanceof Date ? valor : new Date(texto);
    if(Number.isNaN(fecha.getTime())) return texto;
    return new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(fecha);
}

function formatearFechaHoraPeruApp(fecha, hora, incluirSegundos){
    const fechaVisible = formatearFechaPeruApp(fecha);
    const usarFechaComoHora = fecha instanceof Date || (fecha && fecha.toString && fecha.toString().includes("T"));
    const horaVisible = formatearHoraPeruApp(hora || (usarFechaComoHora ? fecha : ""), incluirSegundos);
    if(fechaVisible && horaVisible) return `${fechaVisible} · ${horaVisible}`;
    return fechaVisible || horaVisible || "";
}

function formatearFechaHoraTextoPeruApp(valor, incluirSegundos){
    if(valor === undefined || valor === null || valor === "") return "";
    const texto = valor.toString().trim();
    const latam = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+|T|\s*·\s*)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(latam){
        const fecha = `${latam[1].padStart(2,"0")}/${latam[2].padStart(2,"0")}/${latam[3]}`;
        const hora = formatearHoraDesdePartesPeruApp(
            Number(latam[4]),
            Number(latam[5]),
            Number(latam[6] || 0),
            !!incluirSegundos
        );
        return `${fecha} · ${hora}${/hora\s+per[uú]/i.test(texto) ? " — Hora Perú" : ""}`;
    }
    if(texto.includes("T")) return formatearFechaHoraPeruApp(texto, texto, incluirSegundos);
    return texto;
}

function normalizarIsoVisiblePeruApp(texto){
    if(!texto || typeof texto !== "string" || !texto.includes("T")) return texto;
    return texto.replace(
        /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})\b/g,
        valor => formatearFechaHoraPeruApp(valor, valor, false)
    );
}

function normalizarFechasIsoEnVistaPeruApp(raiz){
    if(!raiz || typeof document === "undefined") return;
    const filtro = {
        acceptNode(nodo){
            const padre = nodo.parentElement;
            if(!padre || !nodo.nodeValue || !nodo.nodeValue.includes("T")) return NodeFilter.FILTER_REJECT;
            if(padre.closest("script,style,input,textarea,select,option,code,pre,[contenteditable='true']")) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    };
    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, filtro);
    const nodos = [];
    while(walker.nextNode()) nodos.push(walker.currentNode);
    nodos.forEach(nodo => {
        const corregido = normalizarIsoVisiblePeruApp(nodo.nodeValue);
        if(corregido !== nodo.nodeValue) nodo.nodeValue = corregido;
    });
}

function activarFormatoFechaHoraPeruApp(){
    if(typeof document === "undefined" || !document.body || typeof MutationObserver === "undefined") return;
    normalizarFechasIsoEnVistaPeruApp(document.body);
    const observador = new MutationObserver(cambios => {
        cambios.forEach(cambio => {
            cambio.addedNodes.forEach(nodo => {
                if(nodo.nodeType === 3){
                    const corregido = normalizarIsoVisiblePeruApp(nodo.nodeValue || "");
                    if(corregido !== nodo.nodeValue) nodo.nodeValue = corregido;
                }else if(nodo.nodeType === 1){
                    normalizarFechasIsoEnVistaPeruApp(nodo);
                }
            });
        });
    });
    observador.observe(document.body, {childList:true, subtree:true});
}

if(typeof document !== "undefined"){
    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", activarFormatoFechaHoraPeruApp, {once:true});
    }else{
        activarFormatoFechaHoraPeruApp();
    }
}

/* =====================================================
   MI VISUAL V336 - Transporte GET seguro y caché breve
   - Lecturas Apps Script por GET para evitar redirecciones POST.
   - Caché de textos publicados por 3 minutos.
   - Reutiliza datos anteriores si la red falla temporalmente.
===================================================== */
const MV336_CACHE_TEXTO_MEMORIA = new Map();

function mv336ClaveCache(texto){
    let h = 2166136261;
    const s = String(texto || "");
    for(let i=0;i<s.length;i++){
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return `MV336_${(h >>> 0).toString(16)}`;
}

function mv336EsHtmlExterno(texto){
    return /<!doctype|<html|<body|docs-drive-logo|google drive|accounts\.google/i.test(String(texto || ""));
}

async function mv336FetchConTiempo(url, opciones, tiempoMs){
    const controlador = typeof AbortController === "function" ? new AbortController() : null;
    const temporizador = controlador ? setTimeout(() => controlador.abort(), tiempoMs || 25000) : null;
    try{
        return await fetch(url, Object.assign({}, opciones || {}, controlador ? {signal:controlador.signal} : {}));
    }finally{
        if(temporizador) clearTimeout(temporizador);
    }
}

async function mv336ApiGet(apiUrl, payload, opciones){
    const config = Object.assign({intentos:2, tiempoMs:25000}, opciones || {});
    const parametros = new URLSearchParams();
    Object.entries(payload || {}).forEach(([clave, valor]) => {
        if(valor === undefined || valor === null || valor === "") return;
        parametros.set(clave, typeof valor === "object" ? JSON.stringify(valor) : String(valor));
    });
    const url = apiUrl + (apiUrl.includes("?") ? "&" : "?") + parametros.toString();
    let ultimoError = null;
    for(let intento=0; intento<config.intentos; intento++){
        try{
            const res = await mv336FetchConTiempo(url, {
                method:"GET",
                cache:"no-store",
                redirect:"follow",
                headers:{"Accept":"application/json"}
            }, config.tiempoMs);
            const texto = (await res.text()).trim();
            if(!res.ok) throw new Error(`No se pudo conectar con el servidor (${res.status}).`);
            if(/^MI VISUAL API OK$/i.test(texto)) throw new Error("La versión publicada de Apps Script no reconoce esta consulta.");
            if(mv336EsHtmlExterno(texto)) throw new Error("Google devolvió una página externa en lugar de los datos.");
            let data;
            try{ data = JSON.parse(texto); }
            catch(_){ throw new Error("La API no devolvió una respuesta válida."); }
            if(data && data.ok === false) throw new Error(data.error || "La consulta no pudo completarse.");
            return data;
        }catch(error){
            ultimoError = error && error.name === "AbortError"
                ? new Error("La consulta tardó demasiado. Intente nuevamente.")
                : error;
            if(intento + 1 < config.intentos) await new Promise(resolve => setTimeout(resolve, 550));
        }
    }
    throw ultimoError || new Error("No se pudo completar la consulta.");
}

async function mv336FetchTextoCache(url, ttlMs, forzar){
    const vigencia = Number(ttlMs) || 180000;
    const clave = mv336ClaveCache(url);
    const ahora = Date.now();
    const memoria = MV336_CACHE_TEXTO_MEMORIA.get(clave);
    if(!forzar && memoria && ahora - memoria.guardadoEn < vigencia) return memoria.texto;

    let respaldo = memoria || null;
    try{
        const guardado = sessionStorage.getItem(clave);
        if(guardado){
            const item = JSON.parse(guardado);
            if(item && typeof item.texto === "string"){
                respaldo = item;
                if(!forzar && ahora - Number(item.guardadoEn || 0) < vigencia){
                    MV336_CACHE_TEXTO_MEMORIA.set(clave, item);
                    return item.texto;
                }
            }
        }
    }catch(_){ }

    try{
        const res = await mv336FetchConTiempo(url, {method:"GET", cache:"default", redirect:"follow"}, 25000);
        if(!res.ok) throw new Error(`Error ${res.status}`);
        const texto = await res.text();
        if(mv336EsHtmlExterno(texto)) throw new Error("Respuesta externa no válida");
        const item = {guardadoEn:ahora, texto};
        MV336_CACHE_TEXTO_MEMORIA.set(clave, item);
        try{ sessionStorage.setItem(clave, JSON.stringify(item)); }catch(_){ }
        return texto;
    }catch(error){
        if(respaldo && typeof respaldo.texto === "string") return respaldo.texto;
        throw error && error.name === "AbortError"
            ? new Error("La carga tardó demasiado. Intente nuevamente.")
            : error;
    }
}
