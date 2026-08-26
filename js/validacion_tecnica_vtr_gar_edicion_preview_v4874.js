/* ================================================================
   MI VISUAL V487.4 - Previsualización de edición VTR/GAR

   FASE DE PRUEBA / SIN ESCRITURA
   - Centralizado dentro de Validación Técnica.
   - Permite revisar cómo quedaría una corrección de PROPIA/ASIGNADA
     y BONO/NO BONO antes de habilitar el guardado real.
   - Motivo de corrección obligatorio.
   - Muestra la validación anterior para preservar trazabilidad.
   - NO modifica VALIDACION_TECNICA ni ninguna otra hoja.
================================================================ */
(function(){
  "use strict";
  if(window.MV4874_EDICION_VTR_GAR_PREVIEW_OK) return;
  window.MV4874_EDICION_VTR_GAR_PREVIEW_OK=true;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];});}
  function usuarioActual(){return localStorage.getItem("usuario")||"";}
  function perfilActual(){return norm(localStorage.getItem("perfil")||"");}
  function puedeEditar(){return ["JEFATURA","ADMIN","ADMINISTRADOR"].includes(perfilActual());}

  function registros(){
    return (Array.isArray(window.vtValidacionesActuales)?window.vtValidacionesActuales:[])
      .filter(function(x){return ["VTR","GAR"].includes(norm(x&&x.tipoValidacion));})
      .sort(function(a,b){return String(b.fechaRegistro||"").localeCompare(String(a.fechaRegistro||""));});
  }

  function estadoActual(x){return norm(x&&x.resultadoFinal)||norm(x&&x.estado)||"PENDIENTE";}
  function origenActual(x){
    const o=norm(x&&x.origenOrden);
    return o==="PROPIA"||o==="ASIGNADA"?o:"MANUAL";
  }

  function cerrar(){const m=document.getElementById("mv4874EditModal");if(m)m.remove();}
  window.mv4874CerrarEdicionVtrGar=cerrar;

  function buscarItem(id){return registros().find(function(x){return txt(x.id)===txt(id);})||null;}

  function pintarDetalle(id){
    const x=buscarItem(id),host=document.getElementById("mv4874Actual");
    if(!host)return;
    if(!x){host.innerHTML='<div class="mv4874-note">Seleccione una validación VTR/GAR.</div>';return;}
    const origen=origenActual(x),estado=estadoActual(x);
    const selOrigen=document.getElementById("mv4874OrigenNuevo");
    const selResultado=document.getElementById("mv4874ResultadoNuevo");
    if(selOrigen)selOrigen.value=origen;
    if(selResultado)selResultado.value=estado==="BONO"||estado==="NO BONO"?estado:"PENDIENTE";
    host.innerHTML=`<div class="mv4874-history"><b>Validación vigente</b><br>
      Tipo: <b>${esc(x.tipoValidacion||"-")}</b> · Código: <b>${esc(x.codigo||"-")}</b> · Ticket: <b>${esc(x.ticketFinal||"-")}</b><br>
      Origen actual: <b>${esc(origen)}</b> · Resultado actual: <b>${esc(estado)}</b><br>
      Validado por: <b>${esc(x.validadoPor||"-")}</b> · Fecha: <b>${esc(x.fechaValidacion||x.fechaRegistro||"-")}</b><br>
      Motivo anterior: <b>${esc(x.motivoValidacion||"-")}</b></div>`;
  }
  window.mv4874SeleccionarValidacion=function(id){pintarDetalle(id);};

  function previsualizar(){
    const id=document.getElementById("mv4874Registro")?.value||"";
    const x=buscarItem(id);
    if(!x){alert("Seleccione una validación VTR/GAR.");return;}
    const motivo=txt(document.getElementById("mv4874Motivo")?.value);
    if(!motivo){alert("Ingrese el motivo de la corrección.");return;}
    const origenNuevo=document.getElementById("mv4874OrigenNuevo")?.value||"MANUAL";
    const resultadoNuevo=document.getElementById("mv4874ResultadoNuevo")?.value||"PENDIENTE";
    const origenAnterior=origenActual(x),resultadoAnterior=estadoActual(x);
    const resumen=document.getElementById("mv4874Preview");
    resumen.innerHTML=`<div class="mv4874-preview"><b>Previsualización de corrección · NO GUARDADA</b><br>
      Registro: <b>${esc(x.id)}</b><br>
      Origen: <b>${esc(origenAnterior)}</b> → <b>${esc(origenNuevo)}</b><br>
      Resultado: <b>${esc(resultadoAnterior)}</b> → <b>${esc(resultadoNuevo)}</b><br>
      Motivo: <b>${esc(motivo)}</b><br>
      Corregiría: <b>${esc(usuarioActual()||"usuario actual")}</b> · la fecha/hora se registrará automáticamente al habilitar el guardado real.<br><br>
      <span>La validación anterior no se eliminará: quedará en el historial de correcciones.</span></div>`;
  }
  window.mv4874PrevisualizarCorreccion=previsualizar;

  function abrir(){
    if(!puedeEditar()){alert("La corrección VTR/GAR está reservada para Jefatura.");return;}
    const lista=registros();
    if(!lista.length){alert("No hay validaciones VTR/GAR cargadas. Pulse Actualizar en Validación Técnica.");return;}
    cerrar();
    const modal=document.createElement("div");modal.id="mv4874EditModal";modal.className="mv4874-back";
    modal.innerHTML=`<style>
      .mv4874-back{position:fixed;inset:0;z-index:12000;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:14px}.mv4874-modal{width:min(650px,100%);max-height:92vh;overflow:auto;background:#fff;color:#0f172a;border-radius:20px;padding:16px;box-shadow:0 22px 60px rgba(15,23,42,.35)}.mv4874-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.mv4874-head h3{margin:0}.mv4874-head p{margin:4px 0 0;color:#64748b;font-size:12px}.mv4874-close{border:0;background:#e2e8f0;border-radius:10px;width:34px;height:34px;font-weight:900;cursor:pointer}.mv4874-field{margin-top:11px}.mv4874-field label{display:block;font-size:11px;font-weight:900;text-transform:uppercase;color:#475569;margin-bottom:5px}.mv4874-field select,.mv4874-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:11px;padding:10px;background:#fff;color:#111827}.mv4874-field textarea{min-height:85px}.mv4874-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mv4874-history{margin-top:10px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:10px;font-size:12px;line-height:1.55}.mv4874-note{margin-top:10px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:12px;padding:10px;font-size:12px}.mv4874-preview{margin-top:10px;background:#eff6ff;border:1px solid #93c5fd;color:#1e3a8a;border-radius:12px;padding:10px;font-size:12px;line-height:1.55}.mv4874-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.mv4874-btn{border:0;border-radius:11px;padding:10px 13px;background:#2563eb;color:#fff;font-weight:900;cursor:pointer}.mv4874-btn.alt{background:#64748b}.mv4874-btn.disabled{background:#94a3b8;cursor:not-allowed}@media(max-width:620px){.mv4874-grid{grid-template-columns:1fr}.mv4874-btn{width:100%}}
    </style><div class="mv4874-modal"><div class="mv4874-head"><div><h3>✏️ Editar validación VTR/GAR</h3><p>Prueba V487.4. Permite revisar una corrección sin modificar la hoja.</p></div><button class="mv4874-close" onclick="mv4874CerrarEdicionVtrGar()">×</button></div>
    <div class="mv4874-note"><b>Regla de seguridad:</b> nunca se borra la validación anterior. Cuando activemos el guardado, toda corrección exigirá motivo y registrará usuario, fecha/hora, valor anterior y valor nuevo.</div>
    <div class="mv4874-field"><label>Validación a corregir</label><select id="mv4874Registro" onchange="mv4874SeleccionarValidacion(this.value)"><option value="">Seleccione...</option>${lista.map(function(x){return `<option value="${esc(x.id)}">${esc(x.tipoValidacion)} · ${esc(x.codigo||"-")} · ${esc(x.ticketFinal||"-")} · ${esc(estadoActual(x))}</option>`;}).join("")}</select></div>
    <div id="mv4874Actual"></div>
    <div class="mv4874-grid"><div class="mv4874-field"><label>Origen corregido</label><select id="mv4874OrigenNuevo"><option value="PROPIA">PROPIA</option><option value="ASIGNADA">ASIGNADA</option><option value="MANUAL">MANUAL</option></select></div><div class="mv4874-field"><label>Resultado corregido</label><select id="mv4874ResultadoNuevo"><option value="BONO">BONO</option><option value="NO BONO">NO BONO</option><option value="PENDIENTE">PENDIENTE</option></select></div></div>
    <div class="mv4874-field"><label>Motivo de la corrección *</label><textarea id="mv4874Motivo" placeholder="Ej.: Se validó como NO BONO por error; evidencia posterior confirma que corresponde BONO."></textarea></div>
    <div class="mv4874-actions"><button class="mv4874-btn" onclick="mv4874PrevisualizarCorreccion()">Previsualizar corrección</button><button class="mv4874-btn disabled" disabled>Guardar corrección · bloqueado en prueba</button><button class="mv4874-btn alt" onclick="mv4874CerrarEdicionVtrGar()">Cerrar</button></div><div id="mv4874Preview"></div></div>`;
    modal.addEventListener("click",function(e){if(e.target===modal)cerrar();});document.body.appendChild(modal);
  }
  window.mv4874AbrirEdicionVtrGar=abrir;

  function instalar(){
    if(!puedeEditar())return false;
    const entry=document.getElementById("mv4871VtrGarEntry");if(!entry)return false;
    if(document.getElementById("mv4874BtnEditar"))return true;
    const b=document.createElement("button");b.id="mv4874BtnEditar";b.type="button";b.textContent="✏️ Editar validación";b.style.marginLeft="8px";b.onclick=abrir;entry.appendChild(b);return true;
  }
  window.mv4874InstalarEdicion=function(){let n=0;const f=function(){if(instalar()||n++>30)return;setTimeout(f,120);};f();};
  setTimeout(window.mv4874InstalarEdicion,0);
})();
