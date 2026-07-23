// MI VISUAL - Actividad en Campo V263 · Auditorías con autocompletado y vista gerencial

const API_ACTIVIDAD_CAMPO = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

const TIPOS_ACTIVIDAD_CAMPO = [
    "AUDITORIA EN FRIO",
    "AUDITORIA EN CALIENTE",
    "SEGUIMIENTO",
    "VALIDACION DE OBSERVACION",
    "CAPACITACION",
    "CHECKLIST"
];

function usuarioActualActividad(){
    return {
        usuario: localStorage.getItem("usuario") || "",
        perfil: (localStorage.getItem("perfil") || "").toUpperCase(),
        cuadrilla: localStorage.getItem("cuadrilla") || "",
        sede: localStorage.getItem("sede") || "",
        plataforma: localStorage.getItem("plataforma") || ""
    };
}

function esJefaturaActividad(perfil){
    const p = (perfil || "").toUpperCase();
    return p === "JEFATURA" || p === "ADMIN" || p === "ADMINISTRADOR" || p === "OPERACIONES LIMA" || p === "GERENCIA LIMA";
}

async function apiActividadCampo(payload){
    const res = await fetch(API_ACTIVIDAD_CAMPO, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    const txt = await res.text();
    try { return JSON.parse(txt); } catch(e){ throw new Error(txt); }
}

function mostrarCargandoActividad(texto){
    let overlay = document.getElementById("actLoadingOverlay");
    if(!overlay){
        overlay = document.createElement("div");
        overlay.id = "actLoadingOverlay";
        overlay.className = "act-loading-overlay";
        overlay.innerHTML = `<div class="act-loading-box"><div class="act-spinner"></div><b id="actLoadingTexto">Procesando...</b></div>`;
        document.body.appendChild(overlay);
    }
    const t = document.getElementById("actLoadingTexto");
    if(t) t.textContent = texto || "Procesando...";
    overlay.style.display = "flex";
}

function ocultarCargandoActividad(){
    const overlay = document.getElementById("actLoadingOverlay");
    if(overlay) overlay.style.display = "none";
}

function estiloActividadCampo(){
    return `<style id="styleActividadCampo">
        .act-wrap{width:100%;max-width:760px;margin:0 auto;padding:14px 14px 96px;color:#fff;box-sizing:border-box;overflow-x:hidden;text-align:left;}
        .act-head{background:linear-gradient(135deg,#172946,#203a63);border-radius:20px;padding:18px;margin-bottom:14px;box-shadow:0 12px 28px rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.08);text-align:left;}
        .act-head h2{margin:0 0 7px;font-size:24px;line-height:1.15;}
        .act-sub{margin:0;color:#c9d7ef;font-size:13px;line-height:1.35;}
        .act-actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;}
        .act-btn{border:none;border-radius:12px;padding:12px 15px;color:#fff;background:#0d6efd;font-weight:900;cursor:pointer;min-height:44px;box-shadow:0 5px 12px rgba(0,0,0,.18);}
        .act-btn:disabled{opacity:.65;cursor:not-allowed;}
        .act-btn.sec{background:#243855;}
        .act-btn.ok{background:#16a34a;}
        .act-btn.warn{background:#0ea5e9;}
        .act-btn.danger{background:#dc3545;}
        .act-card{background:#20314e;border-radius:18px;padding:16px;margin:12px 0;border:1px solid rgba(255,255,255,.08);box-shadow:0 8px 22px rgba(0,0,0,.18);}
        .act-card h3{margin:0 0 12px;font-size:18px;}
        .act-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:end;width:100%;}
        .act-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:end;width:100%;}
        .act-field{display:flex;flex-direction:column;gap:7px;min-width:0;}
        .act-field label{font-size:12px;font-weight:900;color:#d9e7ff;line-height:1.25;text-transform:uppercase;letter-spacing:.2px;}
        .act-field input,.act-field select,.act-field textarea{width:100%!important;box-sizing:border-box;border:1px solid #3c5d81;background:#0c1d34;color:#fff;border-radius:12px;padding:12px;font-size:15px;outline:none;min-height:44px;margin:0!important;}
        .act-field input:focus,.act-field select:focus,.act-field textarea:focus{border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.18);}
        .act-field input[disabled]{opacity:.8;background:#13243f;}
        .act-field textarea{min-height:96px;resize:vertical;line-height:1.35;}
        .act-wide{grid-column:1/-1;}
        .act-section-title{display:flex;align-items:center;gap:8px;margin:4px 0 12px;font-size:18px;font-weight:900;}
        .act-note{background:#0f2d4f;border:1px solid rgba(56,189,248,.32);padding:12px;border-radius:14px;color:#d8ecff;font-size:13px;line-height:1.35;margin:10px 0;}
        .act-msg{margin-top:10px;font-weight:900;line-height:1.35;}
        .act-vacio{background:#20314e;padding:18px;border-radius:14px;text-align:center;color:#c9d7ef;}
        .act-error{background:#7f1d1d;padding:14px;border-radius:14px;line-height:1.35;}
        .act-ok-msg{background:#14532d;padding:14px;border-radius:14px;line-height:1.35;}
        .act-filter{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:10px 0;}
        .act-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0;}
        .act-kpi{background:#13243f;border-radius:16px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,.07);}
        .act-kpi span{display:block;font-size:12px;color:#c9d7ef;line-height:1.2;}
        .act-kpi b{font-size:26px;}
        .act-table-wrap{overflow:auto;margin-top:10px;border-radius:14px;border:1px solid rgba(255,255,255,.08);}
        .act-table{width:100%;border-collapse:collapse;font-size:12px;min-width:820px;}
        .act-table th,.act-table td{border-bottom:1px solid rgba(255,255,255,.1);padding:10px;text-align:left;vertical-align:top;}
        .act-table th{color:#9ec5ff;background:#172946;position:sticky;top:0;}
        .act-links a{display:inline-block;margin:3px 5px 3px 0;color:#fff;background:#0d6efd;border-radius:10px;padding:8px 10px;font-weight:900;text-decoration:none;}
        .act-links a:hover{filter:brightness(1.12);}
        .act-note strong{color:#fff;}
        .act-detail{display:none;background:#0c1d34;border-radius:14px;padding:14px;margin-top:8px;white-space:pre-wrap;line-height:1.38;}
        .act-mobile-card{display:none;background:#13243f;border-radius:16px;padding:14px;margin:10px 0;border:1px solid rgba(255,255,255,.08);}
        .act-mobile-card b{color:#fff;}
        .act-mobile-card small{color:#c9d7ef;}
        .act-file input{padding:10px;background:#0c1d34;color:#dbeafe;}
        /* V142: contraste del Checklist ejecutado en campo */
        .act-card .ck-field label{color:#f8fafc!important;font-size:12px!important;font-weight:900!important;line-height:1.25!important;margin-bottom:7px!important;text-transform:uppercase;letter-spacing:.2px;}
        .act-card .ck-sec,.act-card #ckFormularioTipo h3,.act-card #ckFormularioTipo h4{color:#ffffff!important;font-weight:900!important;}
        .act-card .ck-sec{margin:12px 0 10px!important;}
        .act-card .ck-grid{gap:14px!important;}
        .act-card .ck-field input,.act-card .ck-field select,.act-card .ck-field textarea{border-color:#55779d!important;}
        .act-card .ck-field input:focus,.act-card .ck-field select:focus,.act-card .ck-field textarea:focus{border-color:#38bdf8!important;box-shadow:0 0 0 3px rgba(56,189,248,.18)!important;}
        .act-loading-overlay{position:fixed;inset:0;background:rgba(0,0,0,.58);display:none;align-items:center;justify-content:center;z-index:9999;}
        .act-loading-box{background:#10213b;color:white;padding:20px;border-radius:16px;text-align:center;box-shadow:0 15px 35px rgba(0,0,0,.35);}
        .act-spinner{width:34px;height:34px;border:4px solid rgba(255,255,255,.25);border-top-color:white;border-radius:50%;animation:actSpin 1s linear infinite;margin:0 auto 10px;}
        @keyframes actSpin{to{transform:rotate(360deg)}}

        .act-audit-card{border-color:rgba(56,189,248,.28);}
        .act-tipo-orden{display:flex;gap:12px;flex-wrap:wrap;background:#0c1d34;border:1px solid #3c5d81;border-radius:12px;padding:12px;}
        .act-tipo-orden label{display:flex;align-items:center;gap:7px;color:#fff;font-weight:800;cursor:pointer;}
        .act-tipo-orden input{width:20px!important;min-height:20px!important;margin:0!important;}
        .act-audit-group{margin:14px 0 18px;}
        .act-audit-group-title{font-weight:900;color:#fff;background:#172946;border-left:4px solid #38bdf8;padding:10px 12px;border-radius:8px 8px 0 0;}
        .act-audit-table-wrap{overflow:auto;border:1px solid #3c5d81;border-radius:0 0 12px 12px;}
        .act-audit-table{width:100%;border-collapse:collapse;min-width:720px;background:#0c1d34;}
        .act-audit-table th,.act-audit-table td{padding:9px;border-bottom:1px solid rgba(255,255,255,.12);border-right:1px solid rgba(255,255,255,.08);vertical-align:middle;}
        .act-audit-table th{background:#13243f;color:#d9e7ff;font-size:12px;}
        .act-audit-table td:first-child{min-width:230px;}
        .act-audit-choice{text-align:center;width:72px;}
        .act-audit-choice input{width:21px!important;height:21px!important;min-height:21px!important;margin:auto!important;}
        .act-audit-observacion{min-width:170px!important;min-height:40px!important;padding:8px!important;font-size:13px!important;}
        .act-critical-mini{display:inline-block;background:#7f1d1d;color:#fff;border-radius:999px;padding:2px 6px;font-size:9px;margin-left:5px;}
        .act-score-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin:12px 0;}
        .act-score-grid>div{background:#0c1d34;border:1px solid #3c5d81;border-radius:12px;padding:12px;text-align:center;}
        .act-score-grid span{display:block;color:#c9d7ef;font-size:11px;}.act-score-grid b{font-size:18px;}
        .act-score-total{border-color:#facc15!important;}
        .act-audit-class,.act-badge{display:inline-block;border-radius:999px;padding:7px 12px;font-weight:900;font-size:11px;}
        .act-class-excelente,.act-badge-excelente,.act-badge-conforme{background:#166534;color:#fff;}.act-class-conforme{background:#15803d;color:#fff;}.act-class-observado,.act-badge-observado{background:#a16207;color:#fff;}.act-class-critico,.act-badge-critico{background:#b91c1c;color:#fff;}.act-class-pendiente{background:#475569;color:#fff;}
        .act-evidence-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
        .act-evidence-box{background:#13243f;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;}
        .act-evidence-box input[type=file]{width:100%;box-sizing:border-box;}
        .act-audit-detail{white-space:normal;}
        .act-detail-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px;}.act-detail-head small{display:block;color:#c9d7ef;margin-top:4px;}
        .act-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
        .act-detail-box,.act-detail-group{background:#13243f;border-radius:12px;padding:12px;margin:10px 0;}.act-detail-box h4,.act-detail-group h4{margin:0 0 9px;color:#9ec5ff;}
        .act-detail-criterion{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08);}.act-detail-criterion small{grid-column:1/-1;color:#fcd34d;}.act-resp-cumple{color:#4ade80}.act-resp-no-cumple{color:#f87171}.act-resp-na{color:#cbd5e1}
        .act-manager-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:12px 0;}
        .act-auto-msg{background:#102a46;border:1px solid #3c5d81;border-radius:12px;padding:10px 12px;color:#cbd5e1;font-size:12px;line-height:1.35;}
        .act-auto-msg.buscando{border-color:#38bdf8;color:#e0f2fe;}.act-auto-msg.encontrado{border-color:#22c55e;background:#123d2a;color:#dcfce7;}.act-auto-msg.manual{border-color:#f59e0b;background:#473515;color:#fef3c7;}.act-auto-msg.error{border-color:#ef4444;background:#4b1f24;color:#fee2e2;}
        .act-manager-records{display:grid;gap:14px;margin-top:12px;}
        .act-manager-record{background:#10213b;border:1px solid rgba(148,163,184,.26);border-radius:16px;padding:14px;box-shadow:0 8px 18px rgba(0,0,0,.16);}
        .act-manager-record-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:10px;margin-bottom:10px;}
        .act-manager-record-head h3{margin:4px 0 0;font-size:17px;}.act-manager-record-head small{color:#c9d7ef;}
        .act-manager-record-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;}
        .act-manager-record-grid>div{background:#13243f;border-radius:10px;padding:9px;min-width:0;}.act-manager-record-grid span{display:block;color:#9fb3cc;font-size:10px;text-transform:uppercase;margin-bottom:3px;}.act-manager-record-grid b{display:block;overflow-wrap:anywhere;}
        .act-manager-evidencias{margin-top:10px;}.act-manager-ver{margin-top:10px;display:block;}
        @media(max-width:760px){
            .act-wrap{width:100vw;max-width:100vw;padding:10px 12px 100px;margin:0;overflow-x:hidden;}
            #pantalla{width:100%;overflow-x:hidden;}
            .act-head{padding:16px;border-radius:18px;}
            .act-head h2{font-size:20px;}
            .act-sub{font-size:12px;}
            .act-card{padding:14px;border-radius:16px;margin:10px 0;width:100%;box-sizing:border-box;}
            .act-grid,.act-grid-3,.act-filter,.act-kpis,.act-manager-kpis,.act-score-grid,.act-evidence-grid,.act-detail-grid,.act-manager-record-grid{grid-template-columns:1fr;gap:12px;}
            .act-actions{display:grid;grid-template-columns:1fr;gap:10px;}
            .act-btn{width:100%;font-size:14px;}
            .act-field input,.act-field select,.act-field textarea{font-size:16px;min-height:46px;width:100%!important;max-width:100%;}
            .act-table-wrap{display:none;}
            .act-summary-wrap{display:block!important;overflow:auto;}
            .act-mobile-card{display:block;}
            .act-kpi b{font-size:23px;}
            .act-manager-record-head{flex-direction:column;}
        }
    </style>`;
}

const AUDITORIA_MAXIMOS_CAMPO = {
    "CALIDAD TECNICA": 40,
    "SEGURIDAD": 20,
    "ATENCION AL CLIENTE": 20,
    "ORDEN Y LIMPIEZA": 20
};

const AUDITORIA_CRITERIOS_CAMPO = [
    {id:"instalacion_estandar",categoria:"CALIDAD TECNICA",criterio:"Instalación según estándar WIN",tipos:["ALTA","VT","GARANTIA","PEXT","VTR"]},
    {id:"cableado_fijado",categoria:"CALIDAD TECNICA",criterio:"Cableado correctamente fijado",tipos:["ALTA","VT","GARANTIA","PEXT","VTR"]},
    {id:"grapas_correctas",categoria:"CALIDAD TECNICA",criterio:"Grapas instaladas correctamente",tipos:["ALTA","VT","GARANTIA","VTR"]},
    {id:"curvatura_adecuada",categoria:"CALIDAD TECNICA",criterio:"Curvatura del cable adecuada",tipos:["ALTA","VT","GARANTIA","PEXT","VTR"]},
    {id:"cable_sin_empalmes",categoria:"CALIDAD TECNICA",criterio:"Cable sin empalmes",tipos:["ALTA","VT","GARANTIA","PEXT","VTR"]},
    {id:"conectores_correctos",categoria:"CALIDAD TECNICA",criterio:"Conectores correctamente instalados",tipos:["ALTA","VT","GARANTIA","PEXT","VTR"]},
    {id:"roseta_correcta",categoria:"CALIDAD TECNICA",criterio:"Roseta correctamente instalada",tipos:["ALTA","VT","GARANTIA","VTR"]},
    {id:"equipo_correcto",categoria:"CALIDAD TECNICA",criterio:"Equipo instalado correctamente",tipos:["ALTA","VT","GARANTIA","VTR"]},
    {id:"etiquetado_correcto",categoria:"CALIDAD TECNICA",criterio:"Etiquetado correcto",tipos:["ALTA","VT","GARANTIA","PEXT","VTR"]},
    {id:"servicio_operativo",categoria:"CALIDAD TECNICA",criterio:"Servicio operativo",tipos:["ALTA","VT","GARANTIA","VTR"]},
    {id:"navegacion_correcta",categoria:"CALIDAD TECNICA",criterio:"Navegación correcta",tipos:["ALTA","VT","GARANTIA","VTR"]},
    {id:"velocidad_plan",categoria:"CALIDAD TECNICA",criterio:"Velocidad acorde al plan",tipos:["ALTA","VT","GARANTIA","VTR"]},
    {id:"wifi_adecuado",categoria:"CALIDAD TECNICA",criterio:"Señal WiFi adecuada",tipos:["ALTA","VT","GARANTIA","VTR"]},
    {id:"uso_epp",categoria:"SEGURIDAD",criterio:"Uso correcto de EPP",tipos:["ALTA","VT","GARANTIA","PEXT","VTR"],critico:true},
    {id:"trabajo_seguro",categoria:"SEGURIDAD",criterio:"Trabajo seguro",tipos:["ALTA","VT","GARANTIA","PEXT","VTR"],critico:true},
    {id:"herramientas_estado",categoria:"SEGURIDAD",criterio:"Herramientas en buen estado",tipos:["ALTA","VT","GARANTIA","PEXT","VTR"]},
    {id:"escalera_estado",categoria:"SEGURIDAD",criterio:"Escalera en buen estado (si aplica)",tipos:["ALTA","VT","GARANTIA","PEXT","VTR"]},
    {id:"cliente_equipo",categoria:"ATENCION AL CLIENTE",criterio:"Cliente conoce funcionamiento del equipo",tipos:["ALTA","VT","GARANTIA","VTR"]},
    {id:"trato_cordial",categoria:"ATENCION AL CLIENTE",criterio:"Trato cordial",tipos:["ALTA","VT","GARANTIA","VTR"]},
    {id:"explico_trabajo",categoria:"ATENCION AL CLIENTE",criterio:"Explicó el trabajo realizado",tipos:["ALTA","VT","GARANTIA","VTR"]},
    {id:"cliente_conforme",categoria:"ATENCION AL CLIENTE",criterio:"Cliente conforme",tipos:["ALTA","VT","GARANTIA","VTR"]},
    {id:"orden_limpieza",categoria:"ORDEN Y LIMPIEZA",criterio:"Orden y limpieza",tipos:["ALTA","VT","GARANTIA","PEXT","VTR"]},
    {id:"sin_sobrantes",categoria:"ORDEN Y LIMPIEZA",criterio:"No quedaron materiales sobrantes",tipos:["ALTA","VT","GARANTIA","PEXT","VTR"]},
    {id:"reserva_adecuada",categoria:"ORDEN Y LIMPIEZA",criterio:"Reserva de cable adecuada",tipos:["ALTA","VT","GARANTIA","PEXT","VTR"]}
];

function actEsc(valor){
    return (valor ?? "").toString().replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function nombreTipoActividadCampo(tipo){
    return (tipo || "").toUpperCase() === "SUPERVISION EN CALIENTE" ? "AUDITORIA EN CALIENTE" : (tipo || "");
}

function esTipoAuditoriaCampo(tipo){
    const t = nombreTipoActividadCampo(tipo).toUpperCase();
    return t === "AUDITORIA EN FRIO" || t === "AUDITORIA EN CALIENTE";
}

function tipoOrdenAuditoriaSeleccionado(){
    return document.querySelector('input[name="actTipoOrden"]:checked')?.value || "ALTA";
}

function criteriosAplicablesAuditoriaCampo(tipoOrden){
    return AUDITORIA_CRITERIOS_CAMPO.filter(c => c.tipos.includes(tipoOrden));
}

let audBusquedaTimer = null;
let audBusquedaSecuencia = 0;

function formularioDatosGeneralesAuditoriaCampo(){
    return `<div class="act-card act-audit-card">
        <div class="act-section-title">1. Información general de auditoría</div>
        <div class="act-field act-wide"><label>Tipo de orden</label>
            <div class="act-tipo-orden" onchange="renderChecklistAuditoriaCampo()">
                ${["ALTA","VT","GARANTIA","PEXT","VTR"].map((x,i)=>`<label><input type="radio" name="actTipoOrden" value="${x}" ${i===0?'checked':''}> <span>${x}</span></label>`).join("")}
            </div>
        </div>
        <div class="act-grid" style="margin-top:14px;">
            <div class="act-field"><label>Código de pedido</label><input id="audCodigoPedido" placeholder="Ejemplo: 3030002" inputmode="numeric" autocomplete="off" oninput="programarBusquedaAuditoriaCampo()"></div>
            ${campoTexto("audTicket","Ticket","GAR-, VTR-, AT- u otro")}
            ${campoTexto("audDniCliente","DNI del cliente","Documento de identidad")}
            ${campoTexto("audCliente","Cliente","Nombre del cliente")}
            ${campoTexto("audDireccion","Dirección","Dirección donde se realizó la auditoría")}
            <div id="audAutoMsg" class="act-auto-msg act-wide">Ingrese el código para buscar datos en Mapa Operativo y la base de Producción. Si no existe coincidencia, complete los campos manualmente.</div>
        </div>
    </div>`;
}

function programarBusquedaAuditoriaCampo(inmediata=false){
    clearTimeout(audBusquedaTimer);
    audBusquedaTimer = setTimeout(buscarDatosAuditoriaCampo, inmediata ? 0 : 650);
}

function seleccionarTipoOrdenAuditoriaCampo(tipo){
    const valor=(tipo||"").toUpperCase();
    const radio=document.querySelector(`input[name="actTipoOrden"][value="${valor}"]`);
    if(radio){ radio.checked=true; renderChecklistAuditoriaCampo(); }
}

async function buscarDatosAuditoriaCampo(){
    const codigo=(document.getElementById("audCodigoPedido")?.value||"").trim();
    const msg=document.getElementById("audAutoMsg");
    if(!codigo || codigo.length<4){
        if(msg){msg.className="act-auto-msg act-wide";msg.textContent="Ingrese al menos 4 caracteres para buscar la orden.";}
        return;
    }
    const secuencia=++audBusquedaSecuencia;
    if(msg){msg.className="act-auto-msg act-wide buscando";msg.textContent="Buscando coincidencias del código...";}
    try{
        const data=await apiActividadCampo({accion:"buscarDatosAuditoriaCampo",usuario:usuarioActualActividad().usuario,codigoPedido:codigo,cuadrilla:document.getElementById("actCuadrilla")?.value||""});
        if(secuencia!==audBusquedaSecuencia)return;
        if(!data.ok)throw new Error(data.error||"No se pudo consultar la orden");
        if(!data.encontrado){
            if(msg){msg.className="act-auto-msg act-wide manual";msg.textContent="Sin coincidencia. Complete los datos manualmente.";}
            return;
        }
        const asignar=(id,valor)=>{const e=document.getElementById(id);if(e&&valor!==undefined&&valor!==null&&String(valor).trim()!=="")e.value=valor;};
        asignar("audTicket",data.ticket);
        asignar("audDniCliente",data.dniCliente);
        asignar("audCliente",data.cliente);
        asignar("audDireccion",data.direccion);
        if(data.tipoOrden)seleccionarTipoOrdenAuditoriaCampo(data.tipoOrden);
        if(msg){msg.className="act-auto-msg act-wide encontrado";msg.textContent=`Datos encontrados en ${data.fuente||"la base operativa"}. Puede revisarlos o corregirlos antes de guardar.`;}
    }catch(err){
        if(secuencia!==audBusquedaSecuencia)return;
        if(msg){msg.className="act-auto-msg act-wide error";msg.textContent=`No se pudo completar automáticamente: ${err.message}. Puede continuar manualmente.`;}
    }
}

function htmlChecklistAuditoriaCampo(){
    return `<div class="act-card act-audit-card">
        <div class="act-section-title">2. Lista de verificación</div>
        <div class="act-note">Marque Cumple, No cumple o N/A. Cuando marque No cumple, la observación será obligatoria.</div>
        <div id="audChecklistContenedor"></div>
    </div>`;
}

function renderChecklistAuditoriaCampo(){
    const cont = document.getElementById("audChecklistContenedor");
    if(!cont) return;
    const tipoOrden = tipoOrdenAuditoriaSeleccionado();
    const criterios = criteriosAplicablesAuditoriaCampo(tipoOrden);
    const grupos = Object.keys(AUDITORIA_MAXIMOS_CAMPO);
    cont.innerHTML = grupos.map(cat => {
        const lista = criterios.filter(c=>c.categoria===cat);
        if(!lista.length) return "";
        return `<div class="act-audit-group">
            <div class="act-audit-group-title">${actEsc(cat)}</div>
            <div class="act-audit-table-wrap"><table class="act-audit-table">
                <thead><tr><th>Criterio de evaluación</th><th>Cumple</th><th>No cumple</th><th>N/A</th><th>Observación</th></tr></thead>
                <tbody>${lista.map(c=>`<tr data-criterio="${c.id}">
                    <td>${actEsc(c.criterio)}${c.critico?` <span class="act-critical-mini">SEGURIDAD CRÍTICA</span>`:""}</td>
                    ${["CUMPLE","NO CUMPLE","N/A"].map(r=>`<td class="act-audit-choice"><input type="radio" name="aud_${c.id}" value="${r}" onchange="recalcularAuditoriaCampo()"></td>`).join("")}
                    <td><input id="audObs_${c.id}" class="act-audit-observacion" placeholder="Observación..."></td>
                </tr>`).join("")}</tbody>
            </table></div>
        </div>`;
    }).join("");
    recalcularAuditoriaCampo();
}

function calcularAuditoriaCampoDesdeFormulario(validar=false){
    const tipoOrden = tipoOrdenAuditoriaSeleccionado();
    const criteriosBase = criteriosAplicablesAuditoriaCampo(tipoOrden);
    const criterios = [];
    const acumulado = {};
    Object.keys(AUDITORIA_MAXIMOS_CAMPO).forEach(k=>acumulado[k]={cumple:0,aplica:0});
    let seguridadCritica = false;
    criteriosBase.forEach(c=>{
        const respuesta = document.querySelector(`input[name="aud_${c.id}"]:checked`)?.value || "";
        const observacion = document.getElementById(`audObs_${c.id}`)?.value.trim() || "";
        if(validar && !respuesta) throw new Error(`Complete el criterio: ${c.criterio}`);
        if(validar && respuesta === "NO CUMPLE" && !observacion) throw new Error(`Ingrese observación en: ${c.criterio}`);
        criterios.push({id:c.id,categoria:c.categoria,criterio:c.criterio,respuesta,observacion});
        if(respuesta && respuesta !== "N/A"){
            acumulado[c.categoria].aplica++;
            if(respuesta === "CUMPLE") acumulado[c.categoria].cumple++;
        }
        if(c.critico && respuesta === "NO CUMPLE") seguridadCritica = true;
    });
    const puntajes = {};
    Object.keys(AUDITORIA_MAXIMOS_CAMPO).forEach(cat=>{
        const x=acumulado[cat];
        const delGrupo=criterios.filter(c=>c.categoria===cat);
        const todosRespondidos=delGrupo.every(c=>c.respuesta);
        puntajes[cat]=x.aplica ? Math.round((AUDITORIA_MAXIMOS_CAMPO[cat]*x.cumple/x.aplica)*100)/100 : (delGrupo.length===0 || todosRespondidos ? AUDITORIA_MAXIMOS_CAMPO[cat] : 0);
    });
    const respondidos = criterios.filter(c=>c.respuesta).length;
    const total = Math.round(Object.values(puntajes).reduce((s,x)=>s+x,0)*100)/100;
    let clasificacion = total>=90?"EXCELENTE":total>=80?"CONFORME":total>=70?"OBSERVADO":"CRITICO";
    if(seguridadCritica) clasificacion="CRITICO";
    return {tipoOrden,criterios,puntajes,total,clasificacion,seguridadCritica,respondidos,totalCriterios:criterios.length};
}

function recalcularAuditoriaCampo(){
    const r = calcularAuditoriaCampoDesdeFormulario(false);
    const mapa={audPuntajeCalidad:r.puntajes["CALIDAD TECNICA"],audPuntajeSeguridad:r.puntajes["SEGURIDAD"],audPuntajeCliente:r.puntajes["ATENCION AL CLIENTE"],audPuntajeOrden:r.puntajes["ORDEN Y LIMPIEZA"],audPuntajeTotal:r.total};
    Object.keys(mapa).forEach(id=>{const el=document.getElementById(id);if(el)el.value=mapa[id].toFixed(2);});
    const clas=document.getElementById("audClasificacion");
    if(clas){ clas.textContent=r.respondidos===r.totalCriterios?r.clasificacion:"PENDIENTE"; clas.className=`act-audit-class act-class-${r.respondidos===r.totalCriterios?r.clasificacion.toLowerCase():"pendiente"}`; }
}

function datosTecnicosAuditoriaCampo(tipo){
    if(nombreTipoActividadCampo(tipo)==="AUDITORIA EN FRIO"){
        return {
            clientePresente:obtenerValor("actClientePresente"),dniValidado:obtenerValor("actDniValidado"),estadoInstalacion:obtenerValor("actEstadoInstalacion"),
            dropMetraje:obtenerValor("actDropMetraje"),templadores:obtenerValor("actTempladores"),reservaCable:obtenerValor("actReservaCable"),
            potenciaConforme:obtenerValor("actPotenciaConforme"),velocidadConforme:obtenerValor("actVelocidadConforme"),limpiezaTrabajo:obtenerValor("actLimpiezaTrabajo"),clienteConforme:obtenerValor("actClienteConforme")
        };
    }
    return {
        tecnicoLlegoHora:obtenerValor("supLlegadaHora"),usoEpp:obtenerValor("supUsoEpp"),uniformeCompleto:obtenerValor("supUniforme"),identificacionVisible:obtenerValor("supIdentificacion"),
        explicoTrabajo:obtenerValor("supExplicoTrabajo"),procedimientoCorrecto:obtenerValor("supProcedimiento"),usoMateriales:obtenerValor("supMateriales"),pruebasRealizadas:obtenerValor("supPruebas"),clienteConforme:obtenerValor("supClienteConforme")
    };
}

function construirAuditoriaCampo(tipo){
    const calculo = calcularAuditoriaCampoDesdeFormulario(true);
    const requiere = obtenerValor("audRequiereSeguimiento") || "NO";
    const fechaCompromiso = obtenerValor("audFechaCompromiso");
    if(requiere==="SI" && !fechaCompromiso) throw new Error("Ingrese la fecha de compromiso para el seguimiento");
    return {
        version:1,tipoAuditoria:nombreTipoActividadCampo(tipo),tipoOrden:calculo.tipoOrden,
        codigoPedido:obtenerValor("audCodigoPedido"),ticket:obtenerValor("audTicket"),dniCliente:obtenerValor("audDniCliente"),cliente:obtenerValor("audCliente"),direccion:obtenerValor("audDireccion"),
        datosTecnicos:datosTecnicosAuditoriaCampo(tipo),criterios:calculo.criterios,
        puntajes:{calidad:calculo.puntajes["CALIDAD TECNICA"],seguridad:calculo.puntajes["SEGURIDAD"],cliente:calculo.puntajes["ATENCION AL CLIENTE"],ordenLimpieza:calculo.puntajes["ORDEN Y LIMPIEZA"],total:calculo.total},
        clasificacion:calculo.clasificacion,seguridadCritica:calculo.seguridadCritica,
        observacionesGenerales:obtenerValor("actObservacionesGenerales"),accionesCorrectivas:obtenerValor("audAccionesCorrectivas"),
        requiereSeguimiento:requiere,fechaCompromiso,responsableSubsanar:obtenerValor("audResponsableSubsanar")
    };
}

function badgeClasificacionActividad(clasificacion){
    const c=(clasificacion||"").toUpperCase();
    if(!c)return "";
    return `<span class="act-badge act-badge-${c.toLowerCase()}">${actEsc(c)}</span>`;
}

function fechaVisiblePeruActividad(valor){
    if(!valor)return "-";
    const texto=String(valor).trim();
    const directa=texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if(directa)return `${directa[1].padStart(2,"0")}/${directa[2].padStart(2,"0")}/${directa[3]}`;
    const d=new Date(valor);
    if(Number.isNaN(d.getTime()))return texto;
    return new Intl.DateTimeFormat("es-PE",{timeZone:"America/Lima",day:"2-digit",month:"2-digit",year:"numeric"}).format(d);
}

function horaVisiblePeruActividad(valor,fechaValor){
    const texto=String(valor||"").trim();
    const directa=texto.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
    if(directa)return `${directa[1].padStart(2,"0")}:${directa[2]}`;
    let d=texto?new Date(texto):null;
    if((!d||Number.isNaN(d.getTime()))&&fechaValor)d=new Date(fechaValor);
    if(!d||Number.isNaN(d.getTime()))return "";
    return new Intl.DateTimeFormat("es-PE",{timeZone:"America/Lima",hour:"2-digit",minute:"2-digit",hour12:false}).format(d);
}

function fechaHoraPeruActividad(a){
    const fecha=fechaVisiblePeruActividad(a?.fecha),hora=horaVisiblePeruActividad(a?.hora,a?.fecha);
    return `${fecha}${hora?` · ${hora}`:""} — Hora Perú`;
}

function detalleAuditoriaActividadHtml(a){
    const au=a.auditoria||{};
    const p=au.puntajes||{};
    const criterios=Array.isArray(au.criterios)?au.criterios:[];
    const tecnicos=au.datosTecnicos||{};
    const infoTecnica=Object.keys(tecnicos).map(k=>`<div><b>${actEsc(k.replace(/([A-Z])/g,' $1').toUpperCase())}:</b> ${actEsc(tecnicos[k]||'-')}</div>`).join("");
    const grupos=Object.keys(AUDITORIA_MAXIMOS_CAMPO).map(cat=>{
        const lista=criterios.filter(c=>(c.categoria||"").toUpperCase()===cat);
        if(!lista.length)return "";
        return `<div class="act-detail-group"><h4>${actEsc(cat)}</h4>${lista.map(c=>`<div class="act-detail-criterion"><span>${actEsc(c.criterio)}</span><b class="act-resp-${(c.respuesta||'').replace(/\s+/g,'-').replace('/','').toLowerCase()}">${actEsc(c.respuesta||'SIN REGISTRO')}</b>${c.observacion?`<small>${actEsc(c.observacion)}</small>`:""}</div>`).join("")}</div>`;
    }).join("");
    return `<div class="act-audit-detail">
        <div class="act-detail-head"><div><b>${actEsc(nombreTipoActividadCampo(a.tipoActividad))}</b><small>${actEsc(a.tipoOrden||au.tipoOrden||'-')} · ${actEsc(a.codigoPedido||au.codigoPedido||'Sin código')}</small></div>${badgeClasificacionActividad(a.clasificacion||au.clasificacion)}</div>
        <div class="act-detail-grid">
            <div><b>Cliente:</b> ${actEsc(a.cliente||au.cliente||'-')}</div><div><b>DNI:</b> ${actEsc(a.dniCliente||au.dniCliente||'-')}</div>
            <div><b>Ticket:</b> ${actEsc(a.ticket||au.ticket||'-')}</div><div><b>Dirección:</b> ${actEsc(a.direccion||au.direccion||'-')}</div>
        </div>
        ${infoTecnica?`<div class="act-detail-box"><h4>Información técnica</h4><div class="act-detail-grid">${infoTecnica}</div></div>`:""}
        <div class="act-score-grid"><div><span>Calidad técnica</span><b>${Number(a.puntajeCalidad??p.calidad??0).toFixed(2)} / 40</b></div><div><span>Seguridad</span><b>${Number(a.puntajeSeguridad??p.seguridad??0).toFixed(2)} / 20</b></div><div><span>Atención al cliente</span><b>${Number(a.puntajeCliente??p.cliente??0).toFixed(2)} / 20</b></div><div><span>Orden y limpieza</span><b>${Number(a.puntajeOrdenLimpieza??p.ordenLimpieza??0).toFixed(2)} / 20</b></div><div class="act-score-total"><span>Total</span><b>${Number(a.puntajeTotal??p.total??0).toFixed(2)} / 100</b></div></div>
        ${grupos}
        <div class="act-detail-box"><h4>Cierre y seguimiento</h4><p><b>Observaciones:</b> ${actEsc(au.observacionesGenerales||a.observaciones||'-')}</p><p><b>Acciones correctivas:</b> ${actEsc(a.accionesCorrectivas||au.accionesCorrectivas||'-')}</p><p><b>Requiere seguimiento:</b> ${actEsc(a.requiereSeguimiento||au.requiereSeguimiento||'NO')} ${a.fechaCompromiso||au.fechaCompromiso?`· <b>Compromiso:</b> ${actEsc(a.fechaCompromiso||au.fechaCompromiso)}`:""}</p><p><b>Responsable:</b> ${actEsc(a.responsableSubsanar||au.responsableSubsanar||'-')}</p></div>
    </div>`;
}


function mostrarActividadCampo(){
    const u = usuarioActualActividad();
    if(typeof pmPuedeVer === "function" ? !pmPuedeVer("ACTIVIDAD CAMPO") : !(u.perfil === "SUPERVISOR" || esJefaturaActividad(u.perfil))){
        mostrarPantalla(`${estiloActividadCampo()}<div class="act-wrap"><div class="act-error">No tienes permiso para acceder a Actividad en Campo.</div></div>`);
        return;
    }

    mostrarPantalla(`
        ${estiloActividadCampo()}
        ${typeof ckStyle === "function" ? ckStyle() : ""}
        <div class="act-wrap">
            <div class="act-head">
                <h2>📍 Registro de Actividad en Campo</h2>
                <p class="act-sub">Registro de auditorías en Frío y Caliente, seguimiento, validaciones, capacitaciones y checklist.</p>
            </div>
            <div class="act-actions">
                ${(typeof pmPuede==="function" ? pmPuede("ACTIVIDAD CAMPO","REGISTRAR") : u.perfil === "SUPERVISOR") ? `<button class="act-btn ok" onclick="mostrarFormularioActividadCampo()">+ Nueva actividad</button>` : ""}
                <button class="act-btn sec" onclick="cargarActividadCampo()">🔄 Actualizar lista</button>
            </div>
            ${esJefaturaActividad(u.perfil) ? `<div class="act-note">Vista Jefatura: consulta y validación visual de registros realizados por supervisores. El registro de nuevas actividades queda habilitado solo para Supervisores.</div>` : ""}
            <div id="resumenActividadCampo"></div>
            <div id="filtrosActividadCampo"></div>
            <div id="listaActividadCampo">Cargando...</div>
        </div>
    `);

    prepararFiltrosActividadCampo();
    cargarActividadCampo();
}

function prepararFiltrosActividadCampo(){
    const u = usuarioActualActividad();
    const cont = document.getElementById("filtrosActividadCampo");
    if(!cont) return;
    const esGestion = esJefaturaActividad(u.perfil);
    cont.innerHTML = `
        <div class="act-card">
            <b>Filtros</b>
            <div class="act-filter">
                <div class="act-field"><label>Desde</label><input type="date" id="actFechaDesde"></div>
                <div class="act-field"><label>Hasta</label><input type="date" id="actFechaHasta"></div>
                <div class="act-field"><label>Tipo</label><select id="actFiltroTipo"><option value="">Todos</option>${TIPOS_ACTIVIDAD_CAMPO.map(t => `<option>${t}</option>`).join("")}</select></div>
                ${esGestion ? `<div class="act-field"><label>Sede</label><select id="actFiltroSede"><option value="">Todas</option><option>CHICLAYO</option><option>PIURA</option><option>TRUJILLO</option></select></div><div class="act-field"><label>Supervisor</label><input id="actFiltroSupervisor" placeholder="Usuario supervisor"></div>` : ""}
                <div class="act-field"><label>Cuadrilla</label><input id="actFiltroCuadrilla" placeholder="Nombre de cuadrilla"></div>
                ${esGestion ? `<div class="act-field"><label>Tipo de orden</label><select id="actFiltroTipoOrden"><option value="">Todos</option><option>ALTA</option><option>VT</option><option>GARANTIA</option><option>PEXT</option><option>VTR</option></select></div><div class="act-field"><label>Clasificación</label><select id="actFiltroClasificacion"><option value="">Todas</option><option>EXCELENTE</option><option>CONFORME</option><option>OBSERVADO</option><option>CRITICO</option></select></div><div class="act-field"><label>Estado auditoría</label><select id="actFiltroEstado"><option value="">Todos</option><option>EXCELENTE</option><option>CONFORME</option><option>OBSERVADO</option><option>CRITICO</option><option>EN SEGUIMIENTO</option></select></div>` : ""}
            </div>
            <button class="act-btn warn" onclick="cargarActividadCampo()">Aplicar filtros</button>
        </div>`;
}

async function cargarActividadCampo(){
    const u = usuarioActualActividad();
    const cont = document.getElementById("listaActividadCampo");
    if(!cont) return;
    cont.innerHTML = "Cargando actividades...";
    try{
        const filtros = {
            accion:"listarActividadCampo",usuario:u.usuario,
            fechaDesde:document.getElementById("actFechaDesde")?.value||"",fechaHasta:document.getElementById("actFechaHasta")?.value||"",
            tipoActividad:document.getElementById("actFiltroTipo")?.value||"",sede:document.getElementById("actFiltroSede")?.value||"",
            supervisor:document.getElementById("actFiltroSupervisor")?.value||"",cuadrilla:document.getElementById("actFiltroCuadrilla")?.value||"",
            tipoOrden:document.getElementById("actFiltroTipoOrden")?.value||"",clasificacion:document.getElementById("actFiltroClasificacion")?.value||"",
            estadoAuditoria:document.getElementById("actFiltroEstado")?.value||""
        };
        await cargarResumenActividadCampo(filtros);
        const data=await apiActividadCampo(filtros);
        if(!data.ok)throw new Error(data.error||"Error al listar actividades");
        if(!data.actividades||!data.actividades.length){cont.innerHTML=`<div class="act-vacio">No hay actividades registradas.</div>`;return;}
        if(esJefaturaActividad(u.perfil)){
            cont.innerHTML=`<div class="act-card"><b>Registros encontrados: ${data.actividades.length}</b><div class="act-manager-records">${data.actividades.map((a,i)=>tarjetaGestionActividadCampo(a,i)).join("")}</div></div>`;
        }else{
            cont.innerHTML=`<div class="act-card"><b>Registros encontrados: ${data.actividades.length}</b><div class="act-table-wrap"><table class="act-table"><thead><tr><th>Fecha</th><th>Supervisor</th><th>Sede</th><th>Cuadrilla</th><th>Tipo</th><th>Resultado</th><th>Evidencias</th><th>Detalle</th></tr></thead><tbody>${data.actividades.map((a,i)=>filaActividadCampo(a,i)).join("")}</tbody></table></div><div class="act-mobile-list">${data.actividades.map((a,i)=>cardMovilActividadCampo(a,i)).join("")}</div></div>`;
        }
    }catch(err){cont.innerHTML=`<div class="act-error">❌ ${actEsc(err.message)}</div>`;}
}

async function cargarResumenActividadCampo(filtros){
    const cont=document.getElementById("resumenActividadCampo");if(!cont)return;
    const u=usuarioActualActividad();
    const data=await apiActividadCampo(Object.assign({},filtros,{accion:"obtenerResumenActividadCampo"}));
    if(!data.ok)throw new Error(data.error||"Error al obtener resumen");
    const t=data.totales||{},a=data.auditorias||{};
    const resumenGestion=esJefaturaActividad(u.perfil)?`<div class="act-manager-kpis">
        <div class="act-kpi"><span>Total actividades</span><b>${t.TOTAL||0}</b></div><div class="act-kpi"><span>Auditorías en Frío</span><b>${t["AUDITORIA EN FRIO"]||0}</b></div><div class="act-kpi"><span>Auditorías en Caliente</span><b>${t["AUDITORIA EN CALIENTE"]||0}</b></div><div class="act-kpi"><span>Promedio auditorías</span><b>${a.promedioGeneral!==""&&a.promedioGeneral!==undefined?Number(a.promedioGeneral).toFixed(2):"-"}</b></div>
        <div class="act-kpi"><span>Conformes / excelentes</span><b>${(a.conforme||0)+(a.excelente||0)}</b></div><div class="act-kpi"><span>Observadas</span><b>${a.observado||0}</b></div><div class="act-kpi"><span>Críticas</span><b>${a.critico||0}</b></div><div class="act-kpi"><span>Pendientes seguimiento</span><b>${a.pendientesSeguimiento||0}</b></div>
        <div class="act-kpi"><span>Cuadrillas auditadas</span><b>${a.cuadrillasAuditadas||0}</b></div>
    </div>
    <div class="act-card"><b>Resumen de auditorías por sede</b><div class="act-table-wrap act-summary-wrap"><table class="act-table"><thead><tr><th>Sede</th><th>Auditorías</th><th>Promedio</th><th>Observadas</th><th>Críticas</th></tr></thead><tbody>${(a.porSede||[]).map(r=>`<tr><td>${actEsc(r.sede)}</td><td>${r.total||0}</td><td>${r.promedio!==""?Number(r.promedio).toFixed(2):"-"}</td><td>${r.observado||0}</td><td>${r.critico||0}</td></tr>`).join("")||`<tr><td colspan="5">Sin auditorías calificadas</td></tr>`}</tbody></table></div></div>
    <div class="act-card"><b>Criterios con mayor incumplimiento</b>${(a.criteriosIncumplidos||[]).length?`<div class="act-table-wrap act-summary-wrap"><table class="act-table"><thead><tr><th>Criterio</th><th>No cumple</th></tr></thead><tbody>${a.criteriosIncumplidos.map(r=>`<tr><td>${actEsc(r.criterio)}</td><td>${r.cantidad}</td></tr>`).join("")}</tbody></table></div>`:`<div class="act-vacio" style="margin-top:10px;">Sin incumplimientos registrados.</div>`}</div>`:"";
    cont.innerHTML=`${resumenGestion||`<div class="act-kpis"><div class="act-kpi"><span>Auditoría en Frío</span><b>${t["AUDITORIA EN FRIO"]||0}</b></div><div class="act-kpi"><span>Auditoría en Caliente</span><b>${t["AUDITORIA EN CALIENTE"]||0}</b></div><div class="act-kpi"><span>Seguimiento</span><b>${t["SEGUIMIENTO"]||0}</b></div><div class="act-kpi"><span>Total</span><b>${t.TOTAL||0}</b></div></div>`}
    <div class="act-card"><b>Resumen por supervisor</b><div class="act-table-wrap act-summary-wrap"><table class="act-table"><thead><tr><th>Supervisor</th><th>Aud. Frío</th><th>Aud. Caliente</th><th>Seguimiento</th><th>Val. Obs.</th><th>Capacitación</th><th>Checklist</th><th>Promedio audit.</th><th>Total</th></tr></thead><tbody>${(data.resumen||[]).map(r=>`<tr><td>${actEsc(r.supervisor||"-")}</td><td>${r["AUDITORIA EN FRIO"]||0}</td><td>${r["AUDITORIA EN CALIENTE"]||0}</td><td>${r["SEGUIMIENTO"]||0}</td><td>${r["VALIDACION DE OBSERVACION"]||0}</td><td>${r["CAPACITACION"]||0}</td><td>${r["CHECKLIST"]||0}</td><td>${r.promedioAuditoria!==""&&r.promedioAuditoria!==undefined?Number(r.promedioAuditoria).toFixed(2):"-"}</td><td><b>${r.TOTAL||0}</b></td></tr>`).join("")}</tbody></table></div></div>`;
}

function evidenciasActividadHtml(a){
    const fotos=[{url:a.foto1,desc:a.descFoto1,n:1},{url:a.foto2,desc:a.descFoto2,n:2},{url:a.foto3||a.fotoActa,desc:a.descFoto3,n:3},{url:a.foto4,desc:a.descFoto4,n:4}];
    return fotos.filter(x=>x.url).map(x=>`<a href="${actEsc(x.url)}" target="_blank" title="${actEsc(x.desc||'')}">Evidencia ${x.n}</a>`).join(" ")||"-";
}

function detalleActividadTexto(a){
    if(esTipoAuditoriaCampo(a.tipoActividad)&&a.auditoria)return detalleAuditoriaActividadHtml(a);
    return `<div style="white-space:pre-wrap;">${actEsc(`Tipo: ${nombreTipoActividadCampo(a.tipoActividad)||"-"}\n\n${a.observaciones||"Sin detalle."}`)}</div>`;
}

function tarjetaGestionActividadCampo(a,i){
    const idDetalle=`actDetalleGestion_${i}`;
    const resultado=esTipoAuditoriaCampo(a.tipoActividad)?`${a.puntajeTotal!==""&&a.puntajeTotal!==undefined?`<b>${Number(a.puntajeTotal).toFixed(2)} pts</b> `:""}${badgeClasificacionActividad(a.clasificacion)}`:actEsc(a.estadoInstalacion||"-");
    return `<article class="act-manager-record">
        <div class="act-manager-record-head"><div><small>${actEsc(fechaHoraPeruActividad(a))}</small><h3>${actEsc(nombreTipoActividadCampo(a.tipoActividad)||"Actividad")}</h3></div><div>${resultado}</div></div>
        <div class="act-manager-record-grid"><div><span>Supervisor</span><b>${actEsc(a.supervisor||"-")}</b></div><div><span>Sede</span><b>${actEsc(a.sede||"-")}</b></div><div><span>Cuadrilla</span><b>${actEsc(a.cuadrilla||"-")}</b></div><div><span>Tipo de orden</span><b>${actEsc(a.tipoOrden||"-")}</b></div></div>
        <div class="act-links act-manager-evidencias">${evidenciasActividadHtml(a)}</div>
        <button class="act-btn sec act-manager-ver" onclick="toggleActividadDetalle('${idDetalle}')">Ver detalle</button>
        <div id="${idDetalle}" class="act-detail">${detalleActividadTexto(a)}</div>
    </article>`;
}

function filaActividadCampo(a,i){
    const idDetalle=`actDetalle_${i}`;
    const resultado=esTipoAuditoriaCampo(a.tipoActividad)?`${a.puntajeTotal!==""&&a.puntajeTotal!==undefined?`${Number(a.puntajeTotal).toFixed(2)} pts `:""}${badgeClasificacionActividad(a.clasificacion)}`:(a.estadoInstalacion||"-");
    return `<tr><td>${actEsc(fechaVisiblePeruActividad(a.fecha))}<br><small>${actEsc(horaVisiblePeruActividad(a.hora,a.fecha))} · Hora Perú</small></td><td>${actEsc(a.supervisor||"-")}</td><td>${actEsc(a.sede||"-")}</td><td>${actEsc(a.cuadrilla||"-")}</td><td>${actEsc(nombreTipoActividadCampo(a.tipoActividad)||"-")}${a.tipoOrden?`<br><small>${actEsc(a.tipoOrden)}</small>`:""}</td><td>${resultado}</td><td class="act-links">${evidenciasActividadHtml(a)}</td><td><button class="act-btn sec" onclick="toggleActividadDetalle('${idDetalle}')">Ver</button></td></tr><tr><td colspan="8"><div id="${idDetalle}" class="act-detail">${detalleActividadTexto(a)}</div></td></tr>`;
}

function cardMovilActividadCampo(a,i){
    const idDetalle=`actDetalleMovil_${i}`;
    const resultado=esTipoAuditoriaCampo(a.tipoActividad)?`${a.puntajeTotal!==""&&a.puntajeTotal!==undefined?`${Number(a.puntajeTotal).toFixed(2)} pts `:""}${badgeClasificacionActividad(a.clasificacion)}`:(a.estadoInstalacion||"-");
    return `<div class="act-mobile-card"><b>${actEsc(nombreTipoActividadCampo(a.tipoActividad)||"Actividad")}</b><br><small>${actEsc(fechaHoraPeruActividad(a))}</small><br><br><b>Supervisor:</b> ${actEsc(a.supervisor||"-")}<br><b>Sede:</b> ${actEsc(a.sede||"-")}<br><b>Cuadrilla:</b> ${actEsc(a.cuadrilla||"-")}<br><b>Resultado:</b> ${resultado}<br><div class="act-links" style="margin-top:8px;">${evidenciasActividadHtml(a)}</div><button class="act-btn sec" style="margin-top:10px;" onclick="toggleActividadDetalle('${idDetalle}')">Ver detalle</button><div id="${idDetalle}" class="act-detail">${detalleActividadTexto(a)}</div></div>`;
}

function toggleActividadDetalle(id){
    const el = document.getElementById(id);
    if(!el) return;
    el.style.display = el.style.display === "block" ? "none" : "block";
}

async function mostrarFormularioActividadCampo(){
    const u=usuarioActualActividad();
    if(u.perfil!=="SUPERVISOR"){mostrarPantalla(`${estiloActividadCampo()}<div class="act-wrap"><div class="act-error">El registro de nuevas actividades está habilitado solo para Supervisores. Jefatura puede revisar los registros desde la vista principal.</div><button class="act-btn sec" onclick="mostrarActividadCampo()">Volver</button></div>`);return;}
    mostrarPantalla(`${estiloActividadCampo()}${typeof ckStyle==="function"?ckStyle():""}<div class="act-wrap"><div class="act-head"><h2>📍 Nueva Actividad en Campo</h2><p class="act-sub">Auditoría en Frío y Auditoría en Caliente incluyen calificación completa. Las demás actividades conservan su funcionamiento.</p></div><div class="act-card"><div class="act-grid"><div class="act-field"><label>Supervisor</label><input value="${actEsc(u.usuario)}" disabled></div><div class="act-field"><label>Sede</label><input value="${actEsc(u.sede)}" disabled></div><div class="act-field"><label>Cuadrilla visitada</label><select id="actCuadrilla" onchange="programarBusquedaAuditoriaCampo(true)"><option value="">Cargando cuadrillas...</option></select></div><div class="act-field"><label>Tipo de actividad</label><select id="actTipoActividad" onchange="renderFormularioTipoActividad()">${TIPOS_ACTIVIDAD_CAMPO.map(t=>`<option>${t}</option>`).join("")}</select></div></div></div><form id="formActividadCampo" onsubmit="event.preventDefault(); guardarActividadCampo(this.querySelector('[data-guardar]')); "><div id="camposTipoActividad"></div><div class="act-card"><div class="act-section-title">📝 Cierre de actividad</div><div id="camposCierreActividad" class="act-grid"></div><div id="actEvidenciasGenerales" style="margin-top:12px;"></div><div id="actNotaEvidencias" class="act-note">Las evidencias se comprimen antes de enviarse y quedan vinculadas al registro.</div><div class="act-actions"><button type="submit" data-guardar class="act-btn ok">💾 Guardar actividad</button><button type="button" class="act-btn sec" onclick="mostrarActividadCampo()">Cancelar</button></div><div id="actMsgGuardar" class="act-msg"></div></div></form></div>`);
    await cargarCuadrillasActividadCampo();renderFormularioTipoActividad();
}

function selectSiNo(id, label){
    return `<div class="act-field"><label>${label}</label><select id="${id}"><option>SI</option><option>NO</option><option>NO APLICA</option></select></div>`;
}

function campoTexto(id, label, placeholder=""){
    return `<div class="act-field"><label>${label}</label><input id="${id}" placeholder="${placeholder}"></div>`;
}

function campoNumero(id, label, placeholder=""){
    return `<div class="act-field"><label>${label}</label><input type="number" id="${id}" placeholder="${placeholder}"></div>`;
}

function campoFecha(id, label){
    return `<div class="act-field"><label>${label}</label><input type="date" id="${id}"></div>`;
}

function campoArea(id, label, placeholder=""){
    return `<div class="act-field act-wide"><label>${label}</label><textarea id="${id}" placeholder="${placeholder}"></textarea></div>`;
}

function renderEvidenciasActividadCampo(tipo){
    const cont=document.getElementById("actEvidenciasGenerales");if(!cont)return;
    if(tipo==="CHECKLIST"){cont.innerHTML="";return;}
    const cantidad=esTipoAuditoriaCampo(tipo)?4:2;
    cont.innerHTML=`<div class="act-section-title">${esTipoAuditoriaCampo(tipo)?"4. Evidencias fotográficas":"📷 Evidencias"}</div><div class="act-evidence-grid">${Array.from({length:cantidad},(_,i)=>`<div class="act-evidence-box"><div class="act-field act-file"><label>Evidencia ${i+1}</label><input type="file" id="actFoto${i+1}" accept="image/*" capture="environment"></div><div class="act-field" style="margin-top:8px;"><input id="actDescFoto${i+1}" placeholder="Título / descripción de la foto"></div></div>`).join("")}</div>`;
}

function renderCierreActividad(tipo){
    const cont=document.getElementById("camposCierreActividad");if(!cont)return;
    if(esTipoAuditoriaCampo(tipo)){
        cont.innerHTML=`${campoArea("actObservacionesGenerales","Observaciones generales","Hallazgos generales de la auditoría.")}${campoArea("audAccionesCorrectivas","Acciones correctivas inmediatas","Acciones realizadas o indicadas en campo.")}<div class="act-field"><label>Requiere seguimiento</label><select id="audRequiereSeguimiento" onchange="document.getElementById('audFechaCompromiso').disabled=this.value!=='SI'"><option>NO</option><option>SI</option></select></div>${campoFecha("audFechaCompromiso","Fecha de compromiso")}${campoTexto("audResponsableSubsanar","Responsable de subsanar","Cuadrilla, técnico u otro responsable")}`;
        setTimeout(()=>{const f=document.getElementById('audFechaCompromiso');if(f)f.disabled=true;},0);return;
    }
    if(tipo==="VALIDACION DE OBSERVACION"){cont.innerHTML=`<div class="act-note act-wide">Para Validación de Observación se registran únicamente los datos propios de la validación y sus evidencias.</div>`;return;}
    if(tipo==="CAPACITACION"){cont.innerHTML=`${campoArea("actConclusion","Comentario final","Comentario final de la capacitación realizada.")}`;return;}
    if(tipo==="CHECKLIST"){cont.innerHTML=`${campoArea("actConclusion","Comentario final","Detalle del checklist ejecutado en campo, hallazgos y acciones indicadas.")}`;return;}
    cont.innerHTML=`${campoArea("actObservacionesGenerales","Observaciones generales","Resumen general, hallazgos o comentarios finales.")}${campoArea("actConclusion","Conclusión","Conclusión de la actividad y próximos pasos.")}`;
}

function renderFormularioTipoActividad(){
    const tipo=nombreTipoActividadCampo(document.getElementById("actTipoActividad")?.value||"AUDITORIA EN FRIO");
    const cont=document.getElementById("camposTipoActividad");if(!cont)return;
    const formularios={"AUDITORIA EN FRIO":formularioAuditoriaFrio(),"AUDITORIA EN CALIENTE":formularioSupervisionCaliente(),"SEGUIMIENTO":formularioSeguimiento(),"VALIDACION DE OBSERVACION":formularioValidacionObservacion(),"CAPACITACION":formularioCapacitacion(),"CHECKLIST":formularioChecklist()};
    cont.innerHTML=formularios[tipo]||formularioAuditoriaFrio();renderCierreActividad(tipo);renderEvidenciasActividadCampo(tipo);if(esTipoAuditoriaCampo(tipo))renderChecklistAuditoriaCampo();if(tipo==="CHECKLIST")inicializarChecklistActividadCampo();
}

function formularioAuditoriaFrio(){
    return `${formularioDatosGeneralesAuditoriaCampo()}<div class="act-card act-audit-card"><div class="act-section-title">🔎 Auditoría en Frío · Información técnica</div><div class="act-grid">${selectSiNo("actClientePresente","Cliente presente")}${selectSiNo("actDniValidado","DNI validado")}<div class="act-field"><label>Estado de instalación</label><select id="actEstadoInstalacion"><option>FINALIZADA</option><option>CANCELADA</option><option>REPROGRAMADA</option></select></div>${campoNumero("actDropMetraje","DROP / Fibra - metraje","Ejemplo: 120")}${campoNumero("actTempladores","Templadores","Ejemplo: 4")}${selectSiNo("actReservaCable","Reserva de cable")}${selectSiNo("actPotenciaConforme","Potencia conforme")}${selectSiNo("actVelocidadConforme","Velocidad conforme")}${selectSiNo("actLimpiezaTrabajo","Limpieza del trabajo")}${selectSiNo("actClienteConforme","Cliente conforme")}</div></div>${htmlChecklistAuditoriaCampo()}`;
}

function formularioSupervisionCaliente(){
    return `${formularioDatosGeneralesAuditoriaCampo()}<div class="act-card act-audit-card"><div class="act-section-title">🔥 Auditoría en Caliente · Información de ejecución</div><div class="act-grid">${selectSiNo("supLlegadaHora","Técnico llegó a la hora")}${selectSiNo("supUsoEpp","Uso de EPP")}${selectSiNo("supUniforme","Uniforme completo")}${selectSiNo("supIdentificacion","Identificación visible")}${selectSiNo("supExplicoTrabajo","Explicó el trabajo al cliente")}${selectSiNo("supProcedimiento","Procedimiento correcto")}${selectSiNo("supMateriales","Uso correcto de materiales")}${selectSiNo("supPruebas","Pruebas realizadas")}${selectSiNo("supClienteConforme","Cliente conforme")}</div></div>${htmlChecklistAuditoriaCampo()}`;
}

function formularioSeguimiento(){
    return `<div class="act-card">
        <div class="act-section-title">📌 Seguimiento</div>
        <div class="act-grid">
            <div class="act-field"><label>Motivo del seguimiento</label><select id="segMotivo"><option>BAJA PRODUCCION</option><option>BAJA EFECTIVIDAD</option><option>ALTO RECABLEADO</option><option>ALTO VTR/GAR</option><option>OBSERVACIONES RECURRENTES</option><option>REINCORPORACION</option><option>OTRO</option></select></div>
            ${campoFecha("segFechaSeguimiento","Fecha de seguimiento")}
        </div>
    </div>`;
}

function formularioValidacionObservacion(){
    return `<div class="act-card">
        <div class="act-section-title">✅ Validación de Observación</div>
        <div class="act-grid">
            ${campoTexto("valCodigo","Código de observación","Ejemplo: 3030002")}
            ${campoTexto("valTipo","Tipo de observación","Seguridad, implementación, gestión técnica...")}
            ${selectSiNo("valCorregida","Observación corregida")}
            ${selectSiNo("valEvidencia","Evidencia encontrada")}
            ${selectSiNo("valCumple","Cumple subsanación")}
            ${selectSiNo("valNuevaVisita","Requiere nueva visita")}
            ${campoArea("valComentarios","Comentarios","Detalle de la validación realizada.")}
        </div>
    </div>`;
}

function formularioCapacitacion(){
    return `<div class="act-card">
        <div class="act-section-title">🎓 Capacitación</div>
        <div class="act-grid">
            <div class="act-field"><label>Tema</label><select id="capTema"><option>INSTALACION</option><option>AVERIAS</option><option>RECABLEADO</option><option>ATENCION AL CLIENTE</option><option>SEGURIDAD</option><option>MATERIALES</option><option>PROCEDIMIENTOS WIN</option><option>OTRO</option></select></div>
            ${campoTexto("capTiempo","Tiempo","Ejemplo: 30 minutos")}
            ${campoArea("capParticipantes","Participantes","Nombres o cantidad de participantes.")}
        </div>
    </div>`;
}

function formularioChecklist(){
    if(typeof CK_EQUIPOS === "undefined" || typeof ckEquipoBlock !== "function" || typeof ckField !== "function"){
        return `<div class="act-card"><div class="act-error">No se pudo cargar el formulario de Checklist Almacén.</div></div>`;
    }
    const hoy = new Date().toISOString().slice(0,10);
    return `<div class="act-card">
        <div class="act-section-title">📋 Checklist ejecutado en campo</div>
        <div class="act-note">Este registro ingresará directamente al módulo Checklist Almacén de la cuadrilla seleccionada y conservará el flujo de validación existente.</div>
        <div class="ck-grid">
            <div class="ck-field"><label>Fecha de gestión</label><input id="ckFecha" type="date" value="${hoy}"></div>
            <div class="ck-field"><label>Origen</label><input value="Ejecutado en campo por Supervisor" disabled></div>
        </div>
        <h3 class="ck-sec">Equipos y evidencias</h3>
        <div class="ck-grid ck-equipos-grid">${Object.keys(CK_EQUIPOS).map(ckEquipoBlock).join("")}</div>
        <h3 class="ck-sec">Materiales</h3>
        <div class="ck-grid">
            ${ckField('ckCableDrop','Cable Drop/Bobina','metros')}${ckField('ckPre50','Preconectorizado 50 m','cantidad')}${ckField('ckPre100','Preconectorizado 100 m','cantidad')}${ckField('ckPre150','Preconectorizado 150 m','cantidad')}${ckField('ckPre200','Preconectorizado 200 m','cantidad')}${ckField('ckAnclaje','Anclaje P','cantidad')}${ckField('ckBand','Cinta Band-It','metros')}${ckField('ckHebilla','Hebilla 3/4','unidades')}${ckField('ckAcoplador','Acoplador','unidades')}${ckField('ckRoseta','Roseta','unidades')}${ckField('ckConectores','Conectores ópticos','unidades')}${ckField('ckTempladores','Templadores','unidades')}${ckField('ckSplitter','Splitter','unidades')}${ckField('ckClevis','Clevis','unidades')}${ckField('ckCat5','Cable UTP CAT5','unidades')}${ckField('ckCat6','Cable UTP CAT6','unidades')}${ckField('ckApc','Patchcord APC-APC','unidades')}${ckField('ckUpc','Patchcord UPC-APC','unidades')}${ckField('ckRj45','Conector RJ45','unidades')}
        </div>
    </div>`;
}

function inicializarChecklistActividadCampo(){
    if(typeof CK_EQUIPOS === "undefined" || typeof ckAddEquipo !== "function") return;
    Object.keys(CK_EQUIPOS).forEach(key => ckAddEquipo(key));
}

async function armarChecklistActividadCampo(cuadrilla, comentarioFinal){
    if(typeof ckCollectEquipos !== "function") throw new Error("No se cargaron las funciones del Checklist Almacén");
    const payload={
        fechaGestion:obtenerValor("ckFecha"),
        cuadrilla,
        origenRegistro:"ACTIVIDAD_CAMPO",
        comentarioFinal,
        cableDrop:ckNum('ckCableDrop'),pre50:ckNum('ckPre50'),pre100:ckNum('ckPre100'),pre150:ckNum('ckPre150'),pre200:ckNum('ckPre200'),
        anclajeP:ckNum('ckAnclaje'),cintaBandIt:ckNum('ckBand'),hebilla:ckNum('ckHebilla'),acoplador:ckNum('ckAcoplador'),roseta:ckNum('ckRoseta'),
        conectoresOpticos:ckNum('ckConectores'),templadores:ckNum('ckTempladores'),splitter:ckNum('ckSplitter'),clevis:ckNum('ckClevis'),
        utpCat5:ckNum('ckCat5'),utpCat6:ckNum('ckCat6'),patchApcApc:ckNum('ckApc'),patchUpcApc:ckNum('ckUpc'),rj45:ckNum('ckRj45')
    };
    payload.ontZteEquipos=await ckCollectEquipos('ontZte');
    payload.ontHuaweiEquipos=await ckCollectEquipos('ontHuawei');
    payload.meshZteEquipos=await ckCollectEquipos('meshZte');
    payload.meshHuaweiEquipos=await ckCollectEquipos('meshHuawei');
    payload.winboxEquipos=await ckCollectEquipos('winbox');
    payload.fonowinEquipos=await ckCollectEquipos('fonowin');
    payload.equipos={ontZte:payload.ontZteEquipos,ontHuawei:payload.ontHuaweiEquipos,meshZte:payload.meshZteEquipos,meshHuawei:payload.meshHuaweiEquipos,winbox:payload.winboxEquipos,fonowin:payload.fonowinEquipos};
    return payload;
}

function obtenerValor(id){ return document.getElementById(id)?.value || ""; }

function armarDetalleActividad(tipo){
    const t=nombreTipoActividadCampo(tipo),lineas=[`TIPO DE ACTIVIDAD: ${t}`];
    if(esTipoAuditoriaCampo(t)){
        lineas.push(`TIPO DE ORDEN: ${tipoOrdenAuditoriaSeleccionado()}`);lineas.push(`CODIGO DE PEDIDO: ${obtenerValor("audCodigoPedido")}`);lineas.push(`TICKET: ${obtenerValor("audTicket")}`);lineas.push(`DNI CLIENTE: ${obtenerValor("audDniCliente")}`);lineas.push(`CLIENTE: ${obtenerValor("audCliente")}`);lineas.push(`DIRECCION: ${obtenerValor("audDireccion")}`);
        if(t==="AUDITORIA EN FRIO"){lineas.push(`CLIENTE PRESENTE: ${obtenerValor("actClientePresente")}`,`DNI VALIDADO: ${obtenerValor("actDniValidado")}`,`ESTADO INSTALACION: ${obtenerValor("actEstadoInstalacion")}`,`DROP METRAJE: ${obtenerValor("actDropMetraje")}`,`TEMPLADORES: ${obtenerValor("actTempladores")}`,`RESERVA CABLE: ${obtenerValor("actReservaCable")}`,`POTENCIA CONFORME: ${obtenerValor("actPotenciaConforme")}`,`VELOCIDAD CONFORME: ${obtenerValor("actVelocidadConforme")}`,`LIMPIEZA TRABAJO: ${obtenerValor("actLimpiezaTrabajo")}`,`CLIENTE CONFORME: ${obtenerValor("actClienteConforme")}`);}else{lineas.push(`TECNICO LLEGO A LA HORA: ${obtenerValor("supLlegadaHora")}`,`USO DE EPP: ${obtenerValor("supUsoEpp")}`,`UNIFORME COMPLETO: ${obtenerValor("supUniforme")}`,`IDENTIFICACION VISIBLE: ${obtenerValor("supIdentificacion")}`,`EXPLICO EL TRABAJO AL CLIENTE: ${obtenerValor("supExplicoTrabajo")}`,`PROCEDIMIENTO CORRECTO: ${obtenerValor("supProcedimiento")}`,`USO CORRECTO DE MATERIALES: ${obtenerValor("supMateriales")}`,`PRUEBAS REALIZADAS: ${obtenerValor("supPruebas")}`,`CLIENTE CONFORME: ${obtenerValor("supClienteConforme")}`);}
        lineas.push(`OBSERVACIONES GENERALES: ${obtenerValor("actObservacionesGenerales")}`,`ACCIONES CORRECTIVAS: ${obtenerValor("audAccionesCorrectivas")}`,`REQUIERE SEGUIMIENTO: ${obtenerValor("audRequiereSeguimiento")}`,`FECHA COMPROMISO: ${obtenerValor("audFechaCompromiso")}`,`RESPONSABLE: ${obtenerValor("audResponsableSubsanar")}`);return lineas.join("\n");
    }
    if(t==="SEGUIMIENTO")lineas.push(`MOTIVO: ${obtenerValor("segMotivo")}`,`FECHA DE SEGUIMIENTO: ${obtenerValor("segFechaSeguimiento")}`);
    if(t==="VALIDACION DE OBSERVACION")lineas.push(`CODIGO DE OBSERVACION: ${obtenerValor("valCodigo")}`,`TIPO DE OBSERVACION: ${obtenerValor("valTipo")}`,`OBSERVACION CORREGIDA: ${obtenerValor("valCorregida")}`,`EVIDENCIA ENCONTRADA: ${obtenerValor("valEvidencia")}`,`CUMPLE SUBSANACION: ${obtenerValor("valCumple")}`,`REQUIERE NUEVA VISITA: ${obtenerValor("valNuevaVisita")}`,`COMENTARIOS: ${obtenerValor("valComentarios")}`);
    if(t==="CAPACITACION")lineas.push(`TEMA: ${obtenerValor("capTema")}`,`PARTICIPANTES: ${obtenerValor("capParticipantes")}`,`TIEMPO: ${obtenerValor("capTiempo")}`,`COMENTARIO FINAL: ${obtenerValor("actConclusion")}`);
    if(t==="CHECKLIST")lineas.push(`ORIGEN: EJECUTADO EN CAMPO POR SUPERVISOR`,`FECHA DE GESTION: ${obtenerValor("ckFecha")}`,`COMENTARIO FINAL: ${obtenerValor("actConclusion")}`);
    if(t!=="VALIDACION DE OBSERVACION"&&t!=="CAPACITACION"&&t!=="CHECKLIST")lineas.push(`OBSERVACIONES GENERALES: ${obtenerValor("actObservacionesGenerales")}`,`CONCLUSION: ${obtenerValor("actConclusion")}`);
    return lineas.join("\n");
}

async function cargarCuadrillasActividadCampo(){
    const u = usuarioActualActividad();
    const select = document.getElementById("actCuadrilla");
    if(!select) return;
    try{
        const data = await apiActividadCampo({ accion:"listarCuadrillasActividadCampo", usuario:u.usuario });
        if(!data.ok) throw new Error(data.error || "Error al listar cuadrillas");
        const lista = data.cuadrillas || [];
        select.innerHTML = `<option value="">Seleccione cuadrilla</option>` + lista.map(x => `<option value="${x.cuadrilla}">${x.cuadrilla} - ${x.sede || ""}</option>`).join("");
    }catch(err){
        select.innerHTML = `<option value="">Error cargando cuadrillas</option>`;
        const msg = document.getElementById("actMsgGuardar");
        if(msg) msg.innerHTML = `❌ ${err.message}`;
    }
}

function leerArchivoActividad(file){
    return new Promise((resolve, reject) => {
        if(!file) return resolve(null);

        if(!file.type || !file.type.startsWith("image/")){
            return reject(new Error("Solo se permiten imágenes como evidencia"));
        }

        const reader = new FileReader();

        reader.onload = e => {
            const img = new Image();

            img.onload = () => {
                const maxLado = 1280;
                let { width, height } = img;

                if(width > height && width > maxLado){
                    height = Math.round(height * (maxLado / width));
                    width = maxLado;
                }else if(height >= width && height > maxLado){
                    width = Math.round(width * (maxLado / height));
                    height = maxLado;
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL("image/jpeg", 0.72);

                resolve({
                    base64: dataUrl.split(",")[1] || "",
                    nombre: (file.name || "evidencia.jpg").replace(/\.[^.]+$/, "") + ".jpg",
                    mime: "image/jpeg"
                });
            };

            img.onerror = () => reject(new Error("No se pudo procesar la imagen seleccionada"));
            img.src = e.target.result;
        };

        reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
        reader.readAsDataURL(file);
    });
}

async function guardarActividadCampo(btn){
    const u=usuarioActualActividad(),msg=document.getElementById("actMsgGuardar");if(msg)msg.innerHTML="";
    const tipo=nombreTipoActividadCampo(document.getElementById("actTipoActividad")?.value||"AUDITORIA EN FRIO"),cuadrilla=document.getElementById("actCuadrilla")?.value||"";
    if(!cuadrilla){if(msg)msg.innerHTML=`<div class="act-error">❌ Selecciona una cuadrilla.</div>`;return;}
    if(btn){btn.disabled=true;btn.innerHTML="Guardando...";}mostrarCargandoActividad("Subiendo evidencias y guardando registro...");
    try{
        const comentarioFinal=obtenerValor("actConclusion").trim();if(tipo==="CHECKLIST"&&!comentarioFinal)throw new Error("Debe ingresar el comentario final");
        const audit=esTipoAuditoriaCampo(tipo);const auditoria=audit?construirAuditoriaCampo(tipo):null;
        const foto1=tipo==="CHECKLIST"?null:await leerArchivoActividad(document.getElementById("actFoto1")?.files[0]);
        const foto2=tipo==="CHECKLIST"?null:await leerArchivoActividad(document.getElementById("actFoto2")?.files[0]);
        const foto3=audit?await leerArchivoActividad(document.getElementById("actFoto3")?.files[0]):null;
        const foto4=audit?await leerArchivoActividad(document.getElementById("actFoto4")?.files[0]):null;
        const checklist=tipo==="CHECKLIST"?await armarChecklistActividadCampo(cuadrilla,comentarioFinal):null;
        const payload={accion:"registrarActividadCampo",usuario:u.usuario,cuadrilla,tipoActividad:tipo,
            clientePresente:tipo==="AUDITORIA EN FRIO"?obtenerValor("actClientePresente"):"",dniValidado:tipo==="AUDITORIA EN FRIO"?obtenerValor("actDniValidado"):"",
            estadoInstalacion:tipo==="AUDITORIA EN FRIO"?obtenerValor("actEstadoInstalacion"):obtenerEstadoResumenActividad(tipo),dropMetraje:tipo==="AUDITORIA EN FRIO"?obtenerValor("actDropMetraje"):"",templadores:tipo==="AUDITORIA EN FRIO"?obtenerValor("actTempladores"):"",reservaCable:tipo==="AUDITORIA EN FRIO"?obtenerValor("actReservaCable"):"",potenciaConforme:tipo==="AUDITORIA EN FRIO"?obtenerValor("actPotenciaConforme"):"",velocidadConforme:tipo==="AUDITORIA EN FRIO"?obtenerValor("actVelocidadConforme"):"",limpiezaTrabajo:tipo==="AUDITORIA EN FRIO"?obtenerValor("actLimpiezaTrabajo"):"",clienteConforme:tipo==="AUDITORIA EN FRIO"?obtenerValor("actClienteConforme"):obtenerClienteConformeGenerico(tipo),
            observaciones:armarDetalleActividad(tipo),foto1,foto2,foto3,foto4,auditoria,checklist,
            descFoto1:obtenerValor("actDescFoto1"),descFoto2:obtenerValor("actDescFoto2"),descFoto3:obtenerValor("actDescFoto3"),descFoto4:obtenerValor("actDescFoto4")};
        const data=await apiActividadCampo(payload);if(!data.ok)throw new Error(data.error||"Error al guardar actividad");
        if(msg)msg.innerHTML=`<div class="act-ok-msg">✅ Actividad registrada correctamente.<br>ID: ${actEsc(data.id)}</div>`;setTimeout(mostrarActividadCampo,1200);
    }catch(err){if(msg)msg.innerHTML=`<div class="act-error">❌ ${actEsc(err.message)}</div>`;}finally{ocultarCargandoActividad();if(btn){btn.disabled=false;btn.innerHTML="💾 Guardar actividad";}}
}

function obtenerEstadoResumenActividad(tipo){
    if(tipo === "SEGUIMIENTO") return obtenerValor("segMotivo") || "REGISTRADO";
    if(tipo === "VALIDACION DE OBSERVACION") return obtenerValor("valCumple") === "SI" ? "CUMPLE" : "REVISAR";
    if(tipo === "CAPACITACION") return obtenerValor("capTema") || "REGISTRADO";
    if(tipo === "CHECKLIST") return "CHECKLIST ALMACEN";
    return "REGISTRADO";
}

function obtenerClienteConformeGenerico(tipo){
    if(nombreTipoActividadCampo(tipo)==="AUDITORIA EN CALIENTE")return obtenerValor("supClienteConforme");return "";
}

// El Checklist de Actividad en Campo reutiliza el formulario completo de Checklist Almacén.


/* CHECKLIST POR TIPO EN ACTIVIDAD DE CAMPO V140 */
function formularioChecklist(){const hoy=new Date().toISOString().slice(0,10);return `<div class="act-card"><div class="act-section-title">📋 Checklist ejecutado en campo</div><div class="act-note">Seleccione el tipo. Materiales conserva exactamente el formulario actual.</div><div class="ck-grid"><div class="ck-field"><label>Tipo de checklist</label><select id="ckTipoChecklist" onchange="ckCambioTipoChecklist()">${CK_TIPOS_V140.map(t=>`<option>${t}</option>`).join('')}</select></div><div class="ck-field"><label>Fecha de gestión</label><input id="ckFecha" type="date" value="${hoy}"></div></div><div id="ckFormularioTipo">${ckFormularioPorTipo('MATERIALES')}</div></div>`;}
function inicializarChecklistActividadCampo(){if(typeof CK_EQUIPOS==='undefined'||typeof ckAddEquipo!=='function')return;Object.keys(CK_EQUIPOS).forEach(ckAddEquipo);}
async function armarChecklistActividadCampo(cuadrilla,comentarioFinal){const tipo=document.getElementById('ckTipoChecklist')?.value||'MATERIALES';const payload={fechaGestion:obtenerValor('ckFecha'),cuadrilla,origenRegistro:'ACTIVIDAD_CAMPO',comentarioFinal,tipoChecklist:tipo};Object.assign(payload,await ckConstruirPayloadTipo(tipo));payload.comentarioFinal=comentarioFinal;return payload;}
