/* ================================================================
   MI VISUAL V486 - Fuente completa por periodo
   - Mantiene intactos los meses distintos al detectado.
   - El archivo cargado reconstruye SOLO el periodo detectado.
   - Conserva exactamente las filas del archivo, incluidos duplicados
     exactos si la fuente los trae.
   - Activa el modo V486 sin reemplazar base_operativa.js.
================================================================ */
(function(){
  "use strict";
  if(window.MV486_FUENTE_PERIODO) return;
  window.MV486_FUENTE_PERIODO = true;

  function norm(v){
    return (v==null?"":String(v)).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }

  function activarModoApi(){
    if(typeof window.boApi!=="function" || window.boApi.__mv486) return;
    const original=window.boApi;
    const envuelta=function(payload){
      let p=payload;
      if(p && (p.accion==="previsualizarBaseOperativa" || p.accion==="procesarBaseOperativa")){
        p=Object.assign({},p,{modoReemplazoPeriodoV486:true,confirmarFuenteCompletaV486:true});
      }
      return original(p);
    };
    envuelta.__mv486=true;
    window.boApi=envuelta;
  }

  function conservarDuplicadosFuente(){
    try{
      if(typeof BO_DUPLICADOS_REVISION==="undefined" || !Array.isArray(BO_DUPLICADOS_REVISION)) return;
      if(!BO_DUPLICADOS_REVISION.length){
        BO_DUPLICADOS_REVISADOS=true;
        const btn=document.getElementById("boProcesar"); if(btn) btn.disabled=false;
        return;
      }

      BO_REGISTROS=BO_REGISTROS_ORIGINALES.map(r=>Object.assign({},r));
      const finalizadas=BO_REGISTROS
        .filter(r=>norm(r.estado)==="FINALIZADA" && r.fecha)
        .map(r=>r.fecha).sort();
      const corte=finalizadas[finalizadas.length-1]||"";
      const detectados=BO_DUPLICADOS_REVISION.reduce((s,g)=>s+Math.max((Number(g.cantidad)||1)-1,0),0);
      const control=boCalcularControlLectura(BO_REGISTROS,BO_CONTROL_LECTURA.finalizadasLeidas,corte);
      control.duplicadosDetectados=detectados;
      control.duplicadosExactos=detectados;
      control.duplicadosConservados=detectados;
      control.duplicadosOmitidos=0;
      control.duplicadosRevisados=true;
      control.decisionesDuplicados=BO_DUPLICADOS_REVISION.map(g=>({clave:g.clave,decision:"CONSERVAR_FUENTE_COMPLETA",cantidad:g.cantidad}));
      BO_CONTROL_LECTURA=control;
      BO_DUPLICADOS_REVISADOS=true;

      const rev=document.getElementById("boRevisionDuplicados"); if(rev) rev.remove();
      const resumen=document.getElementById("boResumen");
      if(resumen){
        resumen.innerHTML=boRenderResumenLectura(BO_REGISTROS,BO_FILAS_OMITIDAS,corte,control)+
          `<div class="bo-msg bo-ok"><b>V486 · Fuente completa del período</b><br>`+
          `${detectados?`La fuente contiene ${detectados} copia(s) exacta(s) y se conservarán tal como vienen en el archivo.<br>`:""}`+
          `Al actualizar se reconstruirá únicamente este período. Los demás meses no se tocarán.</div>`;
      }
      const msg=document.getElementById("boMensaje");
      if(msg){
        msg.className="bo-msg bo-ok";
        msg.textContent=`Archivo completo listo. Finalizadas del período: ${control.finalizadasPeriodo}. El sistema reemplazará únicamente el mes detectado y conservará los demás meses.`;
      }
      const btn=document.getElementById("boProcesar"); if(btn){btn.disabled=false;btn.textContent="Validar y actualizar período";}
    }catch(e){
      console.warn("V486 duplicados fuente",e);
    }
  }

  function envolverLectura(){
    if(typeof window.boAplicarLecturaLocal!=="function" || window.boAplicarLecturaLocal.__mv486) return;
    const original=window.boAplicarLecturaLocal;
    const envuelta=function(){
      const r=original.apply(this,arguments);
      setTimeout(conservarDuplicadosFuente,0);
      return r;
    };
    envuelta.__mv486=true;
    window.boAplicarLecturaLocal=envuelta;
  }

  function montarAviso(){
    const wrap=document.querySelector(".bo-wrap"); if(!wrap) return;
    ["mv483ConciliacionPanel","mv485ConciliacionPanel"].forEach(id=>{const el=document.getElementById(id);if(el)el.remove();});
    if(document.getElementById("mv486FuentePeriodoAviso")) return;
    const cards=wrap.querySelectorAll(":scope > .bo-card");
    const primera=cards&&cards.length?cards[0]:null;
    const div=document.createElement("div");
    div.id="mv486FuentePeriodoAviso";
    div.className="bo-card";
    div.innerHTML=`<h3 style="margin-top:0">✅ Fuente completa del período</h3>
      <p class="bo-note">Use un corte completo del mes. Al confirmar, MI VISUAL reconstruirá solamente ese período con las filas del archivo y conservará intactos los demás meses.</p>`;
    if(primera) primera.insertAdjacentElement("afterend",div); else wrap.appendChild(div);
    const btn=document.getElementById("boProcesar"); if(btn) btn.textContent="Validar y actualizar período";
  }

  activarModoApi();
  envolverLectura();
  montarAviso();
  setTimeout(function(){activarModoApi();envolverLectura();montarAviso();conservarDuplicadosFuente();},0);
})();
