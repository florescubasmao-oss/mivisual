/* MI VISUAL V402 - ACTAS: CORRECCIÓN INTEGRAL */
(function(){
"use strict";
if(window.MV402_ACTAS_CORRECCION_OK)return;

const mostrarBase=window.mostrarGestionActas;
const accionesBase=window.accionesEscaneoCompactas;

function esc(v){
  return typeof limpiarHtmlActas==="function"
    ? limpiarHtmlActas(v||"")
    : String(v||"");
}

function puedeEditar(){
  const u=usuarioActualActas();
  return esAlmacenActas(u.perfil)||esJefaturaAlmacenActas(u.perfil);
}

function actaPorId(id){
  return (window._actasTodas||[]).find(x=>String(x.id||"")===String(id||""))||null;
}

function css(){
  if(document.getElementById("mv402Css"))return;
  const s=document.createElement("style");
  s.id="mv402Css";
  s.textContent=`
    .mv402-modal{position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px}
    .mv402-box{width:min(520px,100%);background:#fff;border-radius:18px;padding:18px;color:#0f172a;box-shadow:0 24px 60px rgba(0,0,0,.3)}
    .mv402-box h3{margin:0 0 5px}.mv402-box p{margin:0 0 12px;color:#64748b;font-size:12px}
    .mv402-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .mv402-field label{display:block;font-size:11px;font-weight:900;margin-bottom:4px}
    .mv402-field input,.mv402-field select,.mv402-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px;background:#fff;color:#111827}
    .mv402-field textarea{min-height:76px;resize:vertical}
    .mv402-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
    .mv402-status{background:#eff6ff;border:1px solid #93c5fd;color:#1e3a8a;border-radius:10px;padding:9px;margin-top:10px;font-size:12px;font-weight:800}
    @media(max-width:520px){.mv402-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function insertarMantenimiento(){
  if(!puedeEditar())return;
  const acciones=document.querySelector(".actas-wrap .actas-actions");
  if(!acciones||document.getElementById("mv402BtnNormalizar"))return;

  const b=document.createElement("button");
  b.id="mv402BtnNormalizar";
  b.className="actas-btn warn";
  b.type="button";
  b.textContent="🧹 Corregir nombres PDF";
  b.onclick=mv402CorregirNombresHistoricos;
  acciones.appendChild(b);
}

function mostrarV402(){
  const r=mostrarBase.apply(this,arguments);
  setTimeout(()=>{css();insertarMantenimiento();},0);
  return r;
}

function accionesV402(a){
  let html=typeof accionesBase==="function"?accionesBase(a):"";
  if(puedeEditar()){
    const id=String(a?.id||"").replace(/'/g,"\\'");
    html+=` <button class="actas-btn sec" onclick="mv402AbrirEditarActa('${id}')">✏️ Editar datos</button>`;
  }
  return html;
}

function mv402AbrirEditarActa(id){
  css();
  const a=actaPorId(id);
  if(!a){alert("No se encontró el acta. Actualice la vista.");return;}

  const fecha=/^\d{4}-\d{2}-\d{2}$/.test(String(a.fechaGestion||""))
    ? a.fechaGestion:"";
  const tipo=normalizarActas(a.tipoEjecucion||"");

  const m=document.createElement("div");
  m.className="mv402-modal";
  m.id="mv402Modal";
  m.innerHTML=`
    <div class="mv402-box">
      <h3>✏️ Editar datos del Acta</h3>
      <p>Acta N.º <b>${esc(a.numeroActa||"-")}</b> · Pedido <b>${esc(a.codigoPedido||"-")}</b> · ${esc(a.cuadrilla||"-")}</p>
      <div class="mv402-grid">
        <div class="mv402-field">
          <label>FECHA DE ATENCIÓN</label>
          <input id="mv402Fecha" type="date" value="${esc(fecha)}">
        </div>
        <div class="mv402-field">
          <label>TIPO DE EJECUCIÓN</label>
          <select id="mv402Tipo">
            <option value="INSTALACION" ${tipo==="INSTALACION"?"selected":""}>INSTALACIÓN</option>
            <option value="VISITA TECNICA" ${tipo==="VISITA TECNICA"?"selected":""}>VISITA TÉCNICA</option>
          </select>
        </div>
      </div>
      <div class="mv402-field" style="margin-top:10px">
        <label>MOTIVO DE LA CORRECCIÓN</label>
        <textarea id="mv402Motivo" placeholder="Indique por qué se corrige la fecha o el tipo de trabajo."></textarea>
      </div>
      <div id="mv402Estado" class="mv402-status" style="display:none"></div>
      <div class="mv402-actions">
        <button class="actas-btn sec" onclick="document.getElementById('mv402Modal')?.remove()">Cancelar</button>
        <button id="mv402Guardar" class="actas-btn blue" onclick="mv402GuardarEdicion('${String(id).replace(/'/g,"\\'")}')">Guardar corrección</button>
      </div>
    </div>`;
  document.body.appendChild(m);
}

async function mv402GuardarEdicion(id){
  const u=usuarioActualActas();
  const fecha=document.getElementById("mv402Fecha")?.value||"";
  const tipo=document.getElementById("mv402Tipo")?.value||"";
  const motivo=document.getElementById("mv402Motivo")?.value?.trim()||"";
  const estado=document.getElementById("mv402Estado");
  const btn=document.getElementById("mv402Guardar");

  if(!motivo){alert("Debe indicar el motivo de la corrección.");return;}

  if(btn)btn.disabled=true;
  if(estado){estado.style.display="block";estado.textContent="Guardando corrección y ubicando el PDF...";}

  try{
    await apiActas({
      accion:"editarUbicacionActaV402",
      usuario:u.usuario,
      id:id,
      fechaGestion:fecha,
      tipoEjecucion:tipo,
      motivo:motivo
    });

    if(estado)estado.textContent="✅ Corrección guardada.";
    setTimeout(()=>{
      document.getElementById("mv402Modal")?.remove();
      cargarActas({forzar:true});
    },600);
  }catch(e){
    if(estado)estado.textContent="❌ "+(e?.message||"No se pudo guardar.");
    if(btn)btn.disabled=false;
  }
}

async function mv402CorregirNombresHistoricos(){
  if(!puedeEditar())return;

  if(!confirm(
    "Se corregirán los nombres de los PDFs existentes a CÓDIGO_PEDIDO.pdf.\n\n"+
    "No se cambiarán Código de Orden, N.º de Acta, estados ni validaciones.\n"+
    "No se eliminarán archivos por tener el mismo nombre.\n\n¿Continuar?"
  ))return;

  const u=usuarioActualActas();
  const btn=document.getElementById("mv402BtnNormalizar");
  let fila=2, procesadas=0, renombradas=0, errores=0;

  if(btn){btn.disabled=true;btn.textContent="🧹 Corrigiendo...";}

  try{
    while(true){
      const d=await apiActas({
        accion:"normalizarNombresPdfActasV402",
        usuario:u.usuario,
        filaInicio:fila,
        lote:40
      });

      procesadas+=Number(d.procesadas||0);
      renombradas+=Number(d.renombradas||0);
      errores+=Number(d.errores||0);

      if(btn){
        btn.textContent=`🧹 ${Math.min(procesadas,Number(d.totalFilas||procesadas))}/${Number(d.totalFilas||procesadas)} · ${renombradas} corregidos`;
      }

      if(d.finalizado)break;
      fila=Number(d.siguienteFila||fila+40);
      await new Promise(r=>setTimeout(r,300));
    }

    alert(
      "Corrección terminada.\n\n"+
      "Revisados: "+procesadas+"\n"+
      "Renombrados: "+renombradas+"\n"+
      "Errores: "+errores
    );
    cargarActas({forzar:true});
  }catch(e){
    alert("La corrección se detuvo: "+(e?.message||"Error desconocido")+
      "\n\nPuede ejecutar nuevamente el botón; los ya corregidos no se duplican.");
  }finally{
    if(btn){btn.disabled=false;btn.textContent="🧹 Corregir nombres PDF";}
  }
}

css();

if(typeof mostrarBase==="function"){
  window.mostrarGestionActas=mostrarV402;
  try{mostrarGestionActas=mostrarV402}catch(_){}
}

if(typeof accionesBase==="function"){
  window.accionesEscaneoCompactas=accionesV402;
  try{accionesEscaneoCompactas=accionesV402}catch(_){}
}

window.mv402AbrirEditarActa=mv402AbrirEditarActa;
window.mv402GuardarEdicion=mv402GuardarEdicion;
window.mv402CorregirNombresHistoricos=mv402CorregirNombresHistoricos;

window.MV402_ACTAS_CORRECCION_OK=true;
})();