/* MI VISUAL V471 - Audio contextual / Minicurso 01: Mis Funciones
   - Lee automaticamente la opcion que el tecnico abre.
   - Si toca otra opcion, corta la anterior y lee la nueva.
   - Si sale del minicurso o cambia de pantalla, el audio se detiene.
   - Sin backend, audios externos, observers ni cambios a otros modulos. */
(function(){
  'use strict';
  if(window.MV471_CAP_AUDIO_MIS_FUNCIONES) return;
  window.MV471_CAP_AUDIO_MIS_FUNCIONES=true;

  const synth=window.speechSynthesis;
  let cola=[];
  let destacado=null;
  let vigilante=null;

  function css(){
    if(document.getElementById('mv471-audio-css')) return;
    const s=document.createElement('style');
    s.id='mv471-audio-css';
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

  function elegirVoz(){
    if(!synth || !synth.getVoices) return null;
    const voces=synth.getVoices();
    return voces.find(v=>/^es-PE$/i.test(v.lang)) ||
      voces.find(v=>/^es(-|_)/i.test(v.lang) && /peru|perú/i.test(v.name||'')) ||
      voces.find(v=>/^es(-|_)/i.test(v.lang)) || null;
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
      .map(b=>({texto:limpiar(b.texto),el:b.el||null}))
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
    const u=new SpeechSynthesisUtterance(b.texto);
    u.lang='es-PE';
    u.rate=0.90;
    u.pitch=1;
    const v=elegirVoz(); if(v) u.voice=v;
    u.onstart=actualizarPausa;
    u.onend=()=>setTimeout(siguiente,220);
    u.onerror=()=>{ limpiarDestacado();estado('No se pudo reproducir esta parte. Puedes tocarla nuevamente.');actualizarPausa(); };
    synth.speak(u);
  }

  function bloquesTarjeta(item){
    if(!item) return [];
    const out=[];
    const titulo=item.querySelector('b');
    const resumen=item.querySelector('small');
    if(titulo) out.push({texto:titulo.textContent,el:item});
    if(resumen) out.push({texto:resumen.textContent,el:item});
    const detalle=item.querySelector('.mv466-detail');
    if(detalle && visible(detalle)){
      detalle.querySelectorAll('.mv466-block').forEach(block=>{
        if(!visible(block)) return;
        const etiqueta=block.querySelector('strong')?.textContent||'';
        const contenido=block.querySelector('span')?.textContent||'';
        if(etiqueta || contenido) out.push({texto:[etiqueta,contenido].filter(Boolean).join('. '),el:block});
      });
    }
    return out;
  }

  function bloquesSecuencia(row){
    if(!row) return [];
    const out=[];
    const titulo=row.querySelector('.mv466-seq-title b');
    const resumen=row.querySelector('.mv466-seq-title small');
    if(titulo) out.push({texto:titulo.textContent,el:row});
    if(resumen) out.push({texto:resumen.textContent,el:row});
    const body=row.querySelector('.mv466-seq-body');
    if(body && visible(body)){
      body.querySelectorAll('.mv466-block').forEach(block=>{
        if(!visible(block)) return;
        const etiqueta=block.querySelector('strong')?.textContent||'';
        const contenido=block.querySelector('span')?.textContent||'';
        if(etiqueta || contenido) out.push({texto:[etiqueta,contenido].filter(Boolean).join('. '),el:block});
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
    if(step && visible(step)) out.push({texto:step.textContent,el:step});
    if(h && visible(h)) out.push({texto:h.textContent,el:h});
    if(intro && visible(intro)) out.push({texto:intro.textContent,el:intro});
    screen.querySelectorAll('.mv466-item.open').forEach(item=>out.push(...bloquesTarjeta(item)));
    const seq=screen.querySelector('.mv466-seq-row.active.open');
    if(seq) out.push(...bloquesSecuencia(seq));
    const key=screen.querySelector('.mv466-key');
    if(key && visible(key)) out.push({texto:key.textContent,el:key});
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
    bar.innerHTML=`<button type="button" class="mv471-main" data-audio-play>🔊 Escuchar pantalla</button><button type="button" data-audio-pause>⏸ Pausar</button><button type="button" data-audio-stop>⏹ Detener</button><div class="mv471-status">Toca cualquier tarjeta u opción para escuchar automáticamente solo su contenido.</div>`;
    note.insertAdjacentElement('afterend',bar);
    bar.querySelector('[data-audio-play]').addEventListener('click',escucharPantalla);
    bar.querySelector('[data-audio-pause]').addEventListener('click',pausarReanudar);
    bar.querySelector('[data-audio-stop]').addEventListener('click',()=>detener(false));
  }

  document.addEventListener('click',function(e){
    if(!e.target.closest) return;
    const curso=document.getElementById('mv466curso');

    // Si el curso existe y el usuario hace clic fuera, la voz se apaga inmediatamente.
    if(curso && !e.target.closest('#mv466curso')){
      detener(true);
      return;
    }
    if(!curso) return;

    if(e.target.closest('[data-audio-play],[data-audio-pause],[data-audio-stop]')) return;

    // Navegar dentro o salir del curso siempre corta el audio actual.
    if(e.target.closest('[data-next],[data-back],[data-seq-next],[data-capacitacion]')){
      detener(true);
      setTimeout(ponerControles,40);
      return;
    }

    // Al abrir/cerrar una opcion, esperamos que la interfaz actualice su estado y luego leemos solo esa opcion.
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

  // Refuerzo: cualquier navegacion principal conocida debe apagar la lectura.
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) detener(true); });
  window.addEventListener('pagehide',()=>detener(true));
  window.addEventListener('beforeunload',()=>detener(true));
  setTimeout(ponerControles,0);
})();