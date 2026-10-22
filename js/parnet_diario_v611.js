/* V611: carga PARNET separada del reemplazo histórico V486. */
(function(){
  'use strict';
  if(window.MV611_PARNET_UI)return;window.MV611_PARNET_UI=true;
  let records=[],preview=null,busy=false,generation=0;
  const $=id=>document.getElementById(id),esc=v=>boEsc(v);
  const estados={BASE_V610_7:'Fuente inicial vigente',PENDIENTE_PUBLICACION:'Guardada, pendiente de publicar',PUBLICANDO:'Publicación iniciada; consulte el estado',PUBLICADO:'Publicada',PUBLICACION_INCOMPLETA:'Publicación incompleta',ERROR_PUBLICACION:'Error de publicación'};
  const api=(accion,extra={})=>boApi(Object.assign({accion,usuario:boUsuario(),periodo:'2026-10'},extra));
  function message(t,error=false){const e=$('pnMensaje');if(e){e.className='bo-msg '+(error?'bo-error':'');e.textContent=t;}}
  function disable(v){busy=v;['pnArchivo','pnRevisar','pnVolver','pnPublicar'].forEach(id=>{if($(id))$(id).disabled=v;});if($('pnAplicar'))$('pnAplicar').disabled=v||!preview;}
  function invalidate(){generation++;records=[];preview=null;if($('pnResultado'))$('pnResultado').replaceChildren();if($('pnAplicar'))$('pnAplicar').disabled=true;}
  function renderStatus(r){
    const e=$('pnEstado');if(!e)return;const f=r.fuente||{},t=f.resultado;
    e.innerHTML=(f.estado==='PUBLICADO'?'<div role="status" aria-live="polite" style="background:#064e3b;border:2px solid #34d399;border-radius:14px;padding:22px;margin-bottom:18px;color:#ecfdf5"><div style="font-size:clamp(26px,5vw,38px);font-weight:800;line-height:1.15;margin-bottom:8px">✓ LISTO</div><div style="font-size:clamp(18px,3vw,24px);font-weight:700">CORRECCIONES PUBLICADAS</div><p style="margin:10px 0 0;line-height:1.5">La publicación terminó correctamente. Ya puedes volver al dashboard y actualizar sus datos.</p></div>':'')+'<b>Última carga:</b> '+esc(f.archivo||'-')+'<br><b>Estado:</b> '+esc(estados[f.estado]||f.estado||'-')+(f.corte?'<br>Corte: '+esc(f.corte):'')+(f.publicadoAl?'<br>Publicada: '+esc(f.publicadoAl):'')+(f.error?'<br>'+esc(f.error):'')+(t?'<br>Producción: '+esc(t.ordenes)+' órdenes · '+esc(t.puntos)+' puntos<br>Resumen: '+esc(t.cuadrillasResumen)+' cuadrillas · Ranking: '+esc(t.cuadrillasRanking):'');
    if(f.estado!=='BASE_V610_7'&&f.estado!=='PUBLICADO'){
      const b=document.createElement('button');b.id='pnPublicar';b.className='bo-btn';b.textContent='Publicar correcciones guardadas';b.disabled=busy;b.onclick=publish;e.appendChild(document.createElement('br'));e.appendChild(b);
    }
  }
  async function status(){try{renderStatus(await api('estadoParnetV611'));}catch(e){message('No se pudo consultar el estado: '+e.message,true);}}
  async function parseFile(file){
    if(!file)throw new Error('Seleccione el archivo PARNET.');if(file.size>15000000)throw new Error('El archivo supera 15 MB.');
    const X=await boCargarXlsx(),book=X.read(await file.arrayBuffer(),{type:'array',cellDates:true});let out=[],matched=0;
    book.SheetNames.forEach(name=>{
      const rows=X.utils.sheet_to_json(book.Sheets[name],{header:1,defval:'',raw:true});let at=-1,heads;
      for(let i=0;i<Math.min(50,rows.length);i++){const h=rows[i].map(boNorm),idx=boIndiceEncabezados(h);if(['fecha','cuadrilla','estado','tipoPartida','codigoLiquidacion','sede'].every(k=>idx[k]>=0)){at=i;heads=h;break;}}
      if(at<0)return;
      const parsed=boExtraerRegistros(rows,at,heads);matched++;
      out.push(...parsed.registros.map(r=>({fecha:r.fecha,cuadrilla:r.cuadrilla,estado:r.estado,codigoLiquidacion:r.codigoLiquidacion,tipoPartida:r.tipoPartida,tipoAtencion:r.tipoAtencion,ticket:r.ticket,tipoTrabajo:r.tipoTrabajo,sede:r.sede})));
    });
    if(!matched)throw new Error('No se encontró una tabla con Fecha, Cuadrilla, Estado, Sede, Código de liquidación y Tipo de partida. Si es HTML, seleccione la hoja con datos (sheet001.htm).');
    return out;
  }
  function renderPreview(p){
    const t=p.totales,d=p.diagnostico||{},pending=d.pendientes||[];
    $('pnResultado').innerHTML='<h3>Revisión de octubre 2026</h3><p>Resultado propuesto: <b>'+esc(t.ordenes)+' órdenes · '+esc(t.puntos)+' puntos</b>. Finalizadas: '+esc(t.finalizadas)+' / '+esc(t.total)+'. Recableados: '+esc(t.recableados)+' / '+esc(t.losRojo)+'.</p><p>'+esc(p.cambios.length)+' cambios en PARNET; '+esc(p.duplicadosOmitidos)+' copias idénticas omitidas. Las órdenes de WIN ausentes del archivo se conservan.</p><div class="bo-table-wrap"><table class="bo-table"><thead><tr><th>Orden</th><th>PARNET anterior</th><th>Archivo nuevo</th></tr></thead><tbody>'+p.cambios.map(x=>'<tr><td>'+esc(x.id)+'</td><td>'+esc(x.anterior?x.anterior.cuadrilla+' · '+x.anterior.tipoPartida:'Nueva en PARNET guardado')+'</td><td>'+esc(x.nuevo.cuadrilla+' · '+x.nuevo.tipoPartida)+'</td></tr>').join('')+'</tbody></table></div><p>Altas respecto a WIN: '+esc((d.altas||[]).length)+' · Partidas/puntos distintos de WIN: '+esc((d.cambiosPartida||[]).length)+'.</p><details><summary>Diferencias por orden respecto a WIN</summary><pre style="white-space:pre-wrap">'+esc((d.altas||[]).map(x=>'Orden '+x.id+': finalizada según PARNET.').concat((d.cambiosPartida||[]).map(x=>'Orden '+x.id+': partida '+(x.codigoAnterior||'sin clasificar')+' → '+x.codigoParnet+'; puntos '+x.puntosAnteriores+' → '+x.puntosParnet)).join('\n')||'Sin diferencias de partidas ni nuevas finalizadas.')+'</pre></details>'+(pending.length?'<h4>Pendientes: conservan WIN</h4><ul>'+pending.map(x=>'<li>'+esc(x.id)+' · '+esc(({PARTIDA_NO_CATALOGADA_CONSERVAR_WIN:'Partida pendiente de catálogo; conserva WIN',FECHA_DISTINTA_SE_CONSERVA_WIN:'Fecha diferente; conserva la fecha WIN'})[x.motivo]||x.motivo)+' · '+esc(x.partida||'')+'</li>').join('')+'</ul>':'')+'<p>SGI, SGA y TRASLADO se revisan por separado, junto con sede y número de cuadrilla.</p>';
  }
  async function review(){
    if(busy)return;invalidate();const gen=generation;disable(true);message('Leyendo y comparando con WIN. Puede tardar unos minutos.');
    try{const f=$('pnArchivo').files[0],r=await parseFile(f),p=await api('previsualizarParnetV611',{archivo:f.name,registros:r});if(gen!==generation||!$('pnResultado'))return;records=r;preview=p;renderPreview(p);message('Revisión lista. Compruebe las diferencias y pulse Aplicar correcciones.');}
    catch(e){preview=null;message('No se guardó esta carga. '+e.message,true);}finally{disable(false);}
  }
  async function publish(){
    if(busy)return;disable(true);message('Publicando las correcciones guardadas. Puede tardar varios minutos.');
    try{const r=await api('publicarParnetV611');renderStatus(r);message(r.fuente.estado==='PUBLICADO'?'Correcciones publicadas. Puede volver al dashboard y actualizar sus datos.':'La fuente está guardada, pero la publicación no quedó completa. Consulte el estado y reintente.',r.fuente.estado!=='PUBLICADO');}
    catch(e){message('No se confirmó el resultado. Consulte el estado antes de reintentar. '+e.message,true);}finally{disable(false);}
  }
  async function apply(){
    if(busy||!preview)return;disable(true);message('Guardando las correcciones revisadas...');
    try{const r=await api('aplicarParnetV611',{token:preview.token,registros:records});preview=null;renderStatus(r);disable(false);if(r.fuente.estado!=='PUBLICADO')await publish();else message('Esta carga ya estaba publicada.');}
    catch(e){message('No se confirmó el guardado. Consulte el estado antes de repetir la carga. '+e.message,true);}finally{disable(false);}
  }
  window.mostrarParnetDiarioV611=function(){
    invalidate();mostrarPantalla(boCss()+'<div class="pn-wrap" style="max-width:1100px;margin:auto;padding:18px;color:#f8fafc"><h2>Actualizar PARNET · octubre 2026</h2><div class="bo-card"><p>Suba el corte actualizado del mes. Revise las diferencias y aplique las correcciones. WIN seguirá recibiendo la operación diaria.</p><input id="pnArchivo" class="bo-file" type="file" accept=".xlsx,.xls,.csv,.htm,.html"><div class="bo-actions"><button id="pnRevisar" class="bo-btn">Revisar diferencias</button><button id="pnAplicar" class="bo-btn" disabled>Aplicar correcciones</button></div><div id="pnMensaje" class="bo-msg">Seleccione el archivo PARNET.</div></div><div class="bo-card"><div id="pnEstado">Consultando última carga...</div><button id="pnConsultar" class="bo-btn alt">Consultar estado</button></div><div id="pnResultado" class="bo-card"></div><button id="pnVolver" class="bo-btn alt">Volver a Administración</button></div>');
    $('pnArchivo').onchange=invalidate;$('pnRevisar').onclick=review;$('pnAplicar').onclick=apply;$('pnConsultar').onclick=status;$('pnVolver').onclick=()=>mostrarAdministracion();disable(false);status();
  };
  const original=window.mostrarActualizarBaseOperativa;
  if(typeof original==='function')window.mostrarActualizarBaseOperativa=function(){
    const r=original.apply(this,arguments),wrap=document.querySelector('.bo-wrap');if(wrap&&!$('pnEntrada')){const c=document.createElement('div');c.id='pnEntrada';c.className='bo-card';c.innerHTML='<h3>Carga diaria PARNET</h3><p>Corrija las órdenes de WIN y conserve las correcciones para próximas publicaciones.</p><button class="bo-btn">Subir PARNET y revisar correcciones</button>';c.querySelector('button').onclick=window.mostrarParnetDiarioV611;wrap.prepend(c);}return r;
  };
})();
