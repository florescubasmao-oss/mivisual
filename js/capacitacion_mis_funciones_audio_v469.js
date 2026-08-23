/* MI VISUAL V472 - Audio contextual con voz mas natural / Minicurso 01: Mis Funciones
   - Lee automaticamente la opcion que el tecnico abre.
   - Si toca otra opcion, corta la anterior y lee la nueva.
   - Si sale del minicurso o cambia de pantalla, el audio se detiene.
   - Prioriza voces naturales disponibles y aplica ritmo/pausas segun el contenido.
   - Sin backend, audios externos, observers ni cambios a otros modulos. */
(function(){
  'use strict';
  if(window.MV472_CAP_AUDIO_MIS_FUNCIONES) return;
  window.MV472_CAP_AUDIO_MIS_FUNCIONES=true;

  const synth=window.speechSynthesis;
  let cola=[];
  let destacado=null;
  let vigilante=null;
  let vozPreferida=null;

  function css(){
    if(document.getElementById('mv472-audio-css')) return;
    const s=document.createElement('style');
    s.id='mv472-audio-css';
    s.textContent=`
      #mv466curso .mv471-audio{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px;padding-top:9px;border-top:1px solid #e2e8f0}
      #mv466curso .mv471-audio button{min-height:36px;padding:8px 10px;border:1px solid #bfdbfe;border-radius:10px;background:#fff;color:#1d4ed8;font-size:10.5px;font-weight:900;cursor:pointer}
      #mv466curso .mv471-audio .mv471-main{background:#0b6ffb;color:#fff;border-color:#0b6ffb}
      #mv466curso .mv471-status{flex:1 1 100%;font-size:9.5px;color:#64748b;font-weight:700;line-height:1.35}
      #mv466curso .mv471-speaking{outline:3px solid #8b5cf6!important;outline-offset:2px;box-shadow:0 0 0 5px #ede9fe!important;transition:.18s}
      #mv466curso .mv466-item.open:after{content:'🔊 Escuchando';display:block;margin-top:7px;color:#7c3aed;font-size:9px;font-weight:900}
      @media(max-width:640px){#mv466curso .mv471-audio button{flex:1 1 30%}.mv471-audio .mv471-main{flex-basis:100%!important}}
    `;
    document.head.appendChild(s);
  }

  function visible(el){
    if(!el) return false;
    const st=getComputedStyle(el);
    return st.display!=='none' && st.visibility!=='hidden' && st.opacity!=='0';
  }

  function limpiar(txt){
    return (txt||'')
      .replace(/←\s*Atrás/gi,'')
      .replace(/Siguiente\s*→/gi,'')
      .replace(/Volver a Capacitación/gi,'')
      .replace(/\d+\s+de\s+\d+\s+ampliados\s*·?\s*revisión opcional/gi,'')
      .replace(/Toca para revisar/gi,'')
      .replace(/Pendiente/gi,'')
      .replace(/✓\s*Revisado/gi,'')
      .replace(/Siguiente etapa\s*→/gi,'')
      .replace(/Finalizar estas etapas\s*✓?/gi,'')
      .replace(/🔊\s*Escuchando/gi,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function naturalizar(txt){
    return limpiar(txt)
      .replace(/\bT1\b/gi,'T uno')
      .replace(/\bT2\b/gi,'T dos')
      .replace(/\bEPP\b/gi,'E P P')
      .replace(/\bMI VISUAL\b/gi,'Mi Visual')
      .replace(/\bAPP\b/gi,'aplicación')
      .replace(/\s*\/\s*/g,' o ')
      .replace(/\s*·\s*/g,'. ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function puntuarVoz(v){
    const nombre=(v.name||'').toLowerCase();
    const lang=(v.lang||'').toLowerCase();
    if(!lang.startsWith('es')) return -1000;
    let p=0;
    if(lang==='es-pe') p+=90;
    else if(lang.startsWith('es-')) p+=50;
    if(/natural|neural|premium|enhanced|online/.test(nombre)) p+=80;
    if(/google|microsoft/.test(nombre)) p+=55;
    if(/sabina|alvaro|álvaro|elvira|dalia|jorge|paulina/.test(nombre)) p+=25;
    if(v.localService===false) p+=20;
    return p;
  }

  function elegirVoz(){
    if(vozPreferida) return vozPreferida;
    if(!synth || !synth.getVoices) return null;
    const voces=synth.getVoices().filter(v=>(v.lang||'').toLowerCase().startsWith('es'));
    if(!voces.length) return null;
    voces.sort((a,b)=>puntuarVoz(b)-puntuarVoz(a));
    vozPreferida=voces[0]||null;
    return vozPreferida;
  }

  if(synth && 'onvoiceschanged' in synth){
    synth.onvoiceschanged=function(){ vozPreferida=null; elegirVoz(); };
  }

  function prosodia(tipo){
    switch(tipo){
      case 'titulo': return {rate:0.90,pitch:1.03,pausa:360};
      case 'resumen': return {rate:0.96,pitch:1.01,pausa:300};
      case 'significado': return {rate:0.94,pitch:1.00,pausa:430};
      case 'accion': return {rate:0.95,pitch:1.01,pausa:430};
      case 'ejemplo': return {rate:0.93,pitch:1.04,pausa:520};
      case 'critico': return {rate:0.89,pitch:0.98,pausa:550};
      case 'intro': return {rate:0.94,pitch:1.02,pausa:380};
      default: return {rate:0.94,pitch:1.01,pausa:360};
    }
  }

  function estado(txt){
    const el=document.querySelector('#mv466curso .mv471-status');
    if(el) el.textContent=txt;
  }

  function limpiarDestacado(){
    if(destacado){ destacado.classList.remove('mv471-speaking'); destacado=null; }
  }

  function detener(silencioso){
    if(synth) synth.cancel();
    cola=[];
    limpiarDestacado();
    if(vigilante){ clearInterval(vigilante); vigilante=null; }
    if(!silencioso) estado('Audio detenido. Toca una tarjeta para escucharla nuevamente.');
    actualizarPausa();
  }

  function actualizarPausa(){
    const b=document.querySelector('#mv466curso [data-audio-pause]');
    if(!b || !synth) return;
    b.textContent=synth.paused?'▶️ Reanudar':'⏸ Pausar';
  }

  function iniciarVigilancia(){
    if(vigilante) clearInterval(vigilante);
    vigilante=setInterval(()=>{
      if(!document.getElementById('mv466curso')) detener(true);
      else if(!synth || (!synth.speaking && !synth.pending && !cola.length)){
        clearInterval(vigilante);vigilante=null;
      }
    },400);
  }

  function hablarBloques(bloques,mensaje){
    if(!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance){
      alert('Este navegador no tiene disponible la lectura en voz alta.');
      return;
    }
    const limpios=bloques
      .map(b=>({texto:naturalizar(b.texto),el:b.el||null,tipo:b.tipo||'normal'}))
      .filter(b=>b.texto);
    if(!limpios.length) return;
    detener(true);
    cola=limpios;
    estado(mensaje||'🔊 Escuchando...');
    iniciarVigilancia();
    siguiente();
  }

  function siguiente(){
    if(!document.getElementById('mv466curso')){ detener(true); return; }
    if(!cola.length){
      limpiarDestacado();
      estado('✓ Lectura terminada. Toca otra opción para escucharla.');
      actualizarPausa();
      return;
    }
    const b=cola.shift();
    limpiarDestacado();
    if(b.el){
      destacado=b.el;
      b.el.classList.add('mv471-speaking');
    }
    const p=prosodia(b.tipo);
    const u=new SpeechSynthesisUtterance(b.texto);
    u.lang='es-PE';
    u.rate=p.rate;
    u.pitch=p.pitch;
    u.volume=1;
    const v=elegirVoz(); if(v) u.voice=v;
    u.onstart=actualizarPausa;
    u.onend=()=>setTimeout(siguiente,p.pausa);
    u.onerror=()=>{ limpiarDestacado();estado('No se pudo reproducir esta parte. Puedes tocarla nuevamente.');actualizarPausa(); };
    synth.speak(u);
  }

  function tipoBloque(block){
    const etiqueta=(block.querySelector('strong')?.textContent||'').toLowerCase();
    if(etiqueta.includes('ejemplo')) return 'ejemplo';
    if(etiqueta.includes('punto clave')) return 'critico';
    if(etiqueta.includes('qué significa') || etiqueta.includes('que significa')) return 'significado';
    if(etiqueta.includes('qué debes hacer') || etiqueta.includes('que debes hacer')) return 'accion';
    return 'normal';
  }

  function bloquesTarjeta(item){
    if(!item) return [];
    const out=[];
    const titulo=item.querySelector('b');
    const resumen=item.querySelector('small');
    if(titulo) out.push({texto:titulo.textContent,el:item,tipo:'titulo'});
    if(resumen) out.push({texto:resumen.textContent,el:item,tipo:'resumen'});
    const detalle=item.querySelector('.mv466-detail');
    if(detalle && visible(detalle)){
      detalle.querySelectorAll('.mv466-block').forEach(block=>{
        if(!visible(block)) return;
        const etiqueta=block.querySelector('strong')?.textContent||'';
        const contenido=block.querySelector('span')?.textContent||'';
        if(etiqueta || contenido) out.push({texto:[etiqueta,contenido].filter(Boolean).join('. '),el:block,tipo:tipoBloque(block)});
      });
    }
    return out;
  }

  function bloquesSecuencia(row){
    if(!row) return [];
    const out=[];
    const titulo=row.querySelector('.mv466-seq-title b');
    const resumen=row.querySelector('.mv466-seq-title small');
    if(titulo) out.push({texto:titulo.textContent,el:row,tipo:'titulo'});
    if(resumen) out.push({texto:resumen.textContent,el:row,tipo:'resumen'});
    const body=row.querySelector('.mv466-seq-body');
    if(body && visible(body)){
      body.querySelectorAll('.mv466-block').forEach(block=>{
        if(!visible(block)) return;
        const etiqueta=block.querySelector('strong')?.textContent||'';
        const contenido=block.querySelector('span')?.textContent||'';
        if(etiqueta || contenido) out.push({texto:[etiqueta,contenido].filter(Boolean).join('. '),el:block,tipo:tipoBloque(block)});
      });
    }
    return out;
  }

  function bloquesPantalla(){
    const screen=document.querySelector('#mv466curso .mv466-screen');
    if(!screen) return [];
    const out=[];
    const step=screen.querySelector('.mv466-step');
    const h=screen.querySelector('h2');
    const intro=screen.querySelector(':scope > p');
    if(step && visible(step)) out.push({texto:step.textContent,el:step,tipo:'intro'});
    if(h && visible(h)) out.push({texto:h.textContent,el:h,tipo:'titulo'});
    if(intro && visible(intro)) out.push({texto:intro.textContent,el:intro,tipo:'intro'});
    screen.querySelectorAll('.mv466-item.open').forEach(item=>out.push(...bloquesTarjeta(item)));
    const seq=screen.querySelector('.mv466-seq-row.active.open');
    if(seq) out.push(...bloquesSecuencia(seq));
    const key=screen.querySelector('.mv466-key');
    if(key && visible(key)) out.push({texto:key.textContent,el:key,tipo:'critico'});
    return out;
  }

  function leerOpcion(target){
    const item=target.closest('.mv466-item');
    if(item){
      if(!item.classList.contains('open')){ detener(true); return; }
      hablarBloques(bloquesTarjeta(item),'🔊 Escuchando esta opción...');
      return;
    }
    const row=target.closest('.mv466-seq-row.active');
    if(row){
      if(!row.classList.contains('open')){ detener(true); return; }
      hablarBloques(bloquesSecuencia(row),'🔊 Escuchando esta etapa...');
    }
  }

  function escucharPantalla(){
    hablarBloques(bloquesPantalla(),'🔊 Escuchando el contenido visible de esta pantalla...');
  }

  function pausarReanudar(){
    if(!synth) return;
    if(synth.paused){ synth.resume();estado('🔊 Lectura reanudada.'); }
    else if(synth.speaking){ synth.pause();estado('⏸ Lectura pausada.'); }
    actualizarPausa();
  }

  function ponerControles(){
    const curso=document.getElementById('mv466curso');
    if(!curso || curso.querySelector('.mv471-audio')) return;
    css();
    const note=curso.querySelector('.mv466-note');
    if(!note) return;
    const bar=document.createElement('div');
    bar.className='mv471-audio';
    const voz=elegirVoz();
    bar.innerHTML=`<button type="button" class="mv471-main" data-audio-play>🔊 Escuchar pantalla</button><button type="button" data-audio-pause>⏸ Pausar</button><button type="button" data-audio-stop>⏹ Detener</button><div class="mv471-status">Toca cualquier tarjeta para escucharla. ${voz?'Se usará la mejor voz en español disponible en tu dispositivo.':'La voz dependerá del motor disponible en tu dispositivo.'}</div>`;
    note.insertAdjacentElement('afterend',bar);
    bar.querySelector('[data-audio-play]').addEventListener('click',escucharPantalla);
    bar.querySelector('[data-audio-pause]').addEventListener('click',pausarReanudar);
    bar.querySelector('[data-audio-stop]').addEventListener('click',()=>detener(false));
  }

  document.addEventListener('click',function(e){
    if(!e.target.closest) return;
    const curso=document.getElementById('mv466curso');

    if(curso && !e.target.closest('#mv466curso')){
      detener(true);
      return;
    }
    if(!curso) return;

    if(e.target.closest('[data-audio-play],[data-audio-pause],[data-audio-stop]')) return;

    if(e.target.closest('[data-next],[data-back],[data-seq-next],[data-capacitacion]')){
      detener(true);
      setTimeout(ponerControles,40);
      return;
    }

    const opcion=e.target.closest('.mv466-item,.mv466-seq-row.active .mv466-seq-head');
    if(opcion){
      detener(true);
      setTimeout(()=>leerOpcion(opcion),60);
    }
  },false);

  const abrir=window.mv467AbrirMisFunciones;
  if(typeof abrir==='function'){
    window.mv467AbrirMisFunciones=function(){
      detener(true);
      const r=abrir.apply(this,arguments);
      setTimeout(ponerControles,40);
      return r;
    };
  }

  document.addEventListener('visibilitychange',()=>{ if(document.hidden) detener(true); });
  window.addEventListener('pagehide',()=>detener(true));
  window.addEventListener('beforeunload',()=>detener(true));
  setTimeout(ponerControles,0);
})();