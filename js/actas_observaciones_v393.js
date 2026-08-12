/* ============================================================
   MI VISUAL V393 - Gestión de Actas: detalle de observaciones
   - Muestra motivo desplegable en todos los perfiles/vistas.
   - Diferencia observación Almacén y Jefatura de Almacén.
   - Conserva usuario/fecha/hora de la revisión cuando existen.
   - Elimina el bloque duplicado antiguo en tarjetas móviles.
   - No hace consultas adicionales: usa datos que ya llegaron en la carga.
   - Mejora render de listas largas con content-visibility.
============================================================ */
(function(){
  "use strict";
  if(window.MV393_ACTAS_OBSERVACIONES_OK) return;

  const badgeBase=window.badgeActa;
  if(typeof badgeBase!=="function") return;

  function n(v){
    return typeof normalizarActas==="function"
      ? normalizarActas(v||"")
      : String(v||"").toUpperCase().trim();
  }

  function h(v){
    return typeof limpiarHtmlActas==="function"
      ? limpiarHtmlActas(v||"")
      : String(v||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  }

  function fecha(v){
    if(typeof fechaVisibleActas==="function") return fechaVisibleActas(v||"");
    return String(v||"");
  }

  function hora(v){
    try{
      if(typeof formatearHoraPeruApp==="function"){
        return formatearHoraPeruApp(v||"",false)||"";
      }
    }catch(_){}
    return String(v||"");
  }

  function observaciones(a){
    const lista=[];

    if(n(a?.resultadoJefatura)==="OBSERVADO" || String(a?.motivoJefatura||"").trim()){
      lista.push({
        origen:"JEFATURA DE ALMACÉN",
        motivo:a.motivoJefatura||"Sin detalle registrado",
        por:a.validadoJefaturaPor||"",
        fecha:a.fechaValidacionJefatura||"",
        hora:a.horaValidacionJefatura||""
      });
    }

    if(n(a?.resultadoAlmacen)==="OBSERVADO" || String(a?.motivoAlmacen||"").trim()){
      lista.push({
        origen:"ALMACÉN",
        motivo:a.motivoAlmacen||"Sin detalle registrado",
        por:a.validadoAlmacenPor||"",
        fecha:a.fechaValidacionAlmacen||"",
        hora:a.horaValidacionAlmacen||""
      });
    }

    return lista;
  }

  function detalle(a){
    const obs=observaciones(a);
    if(!obs.length) return "";

    const bloques=obs.map(x=>{
      const meta=[
        x.por ? `Por: ${h(x.por)}` : "",
        x.fecha ? `Fecha: ${h(fecha(x.fecha))}` : "",
        x.hora ? `Hora: ${h(hora(x.hora))}` : ""
      ].filter(Boolean).join(" · ");

      return `
        <div class="mv393-acta-obs-item">
          <b>${h(x.origen)}</b>
          <div>${h(x.motivo)}</div>
          ${meta?`<small>${meta}</small>`:""}
        </div>`;
    }).join("");

    return `
      <details class="mv393-acta-obs">
        <summary>⚠ Ver detalle de la observación</summary>
        <div class="mv393-acta-obs-body">${bloques}</div>
      </details>`;
  }

  function estilos(){
    if(document.getElementById("mv393ActasObsCss")) return;
    const s=document.createElement("style");
    s.id="mv393ActasObsCss";
    s.textContent=`
      .mv393-acta-obs{
        margin-top:7px;border:1px solid #fecaca;border-radius:10px;
        background:#fff7f7;max-width:100%;
      }
      .mv393-acta-obs summary{
        cursor:pointer;padding:7px 9px;color:#991b1b;font-weight:900;
        font-size:11px;list-style:none;
      }
      .mv393-acta-obs summary::-webkit-details-marker{display:none}
      .mv393-acta-obs summary:after{content:" ▾";float:right}
      .mv393-acta-obs[open] summary:after{content:" ▴"}
      .mv393-acta-obs-body{padding:0 9px 9px}
      .mv393-acta-obs-item{
        border-top:1px solid #fecaca;padding-top:7px;margin-top:4px;
        color:#7f1d1d;font-size:11px;line-height:1.35;
      }
      .mv393-acta-obs-item b{display:block;font-size:10px;margin-bottom:3px}
      .mv393-acta-obs-item small{display:block;margin-top:4px;color:#9f1239}
      .actas-card{
        content-visibility:auto;
        contain-intrinsic-size:auto 190px;
      }
      .actas-sede-body .actas-card{
        content-visibility:auto;
        contain-intrinsic-size:auto 190px;
      }
      @media(max-width:720px){
        .mv393-acta-obs summary{font-size:11px;padding:8px}
        .mv393-acta-obs-item{font-size:11px}
      }
    `;
    document.head.appendChild(s);
  }

  function badgeV393(a){
    return badgeBase(a)+detalle(a);
  }

  // cardActaLecturaHtml ya imprimía el motivo como un bloque rojo plano.
  // Se anula solo ese helper para no duplicar el texto; ahora el motivo vive
  // en el desplegable del badge, que también llega a tablas y otras tarjetas.
  function motivoPlanoV393(){
    return "";
  }

  estilos();

  window.mv393DetalleObservacionActa=detalle;
  window.badgeActa=badgeV393;
  window.motivoVisibleActa=motivoPlanoV393;

  try{badgeActa=badgeV393}catch(_){}
  try{motivoVisibleActa=motivoPlanoV393}catch(_){}

  window.MV393_ACTAS_OBSERVACIONES_OK=true;
  console.log("MI VISUAL V393: detalle de observaciones de Actas habilitado.");
})();