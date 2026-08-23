/* MI VISUAL V470 - Voz guiada interactiva / Minicurso 01: Mis Funciones
   Usa SpeechSynthesis del navegador. Sin audios externos, sin backend y sin observers.
   Lee solo contenido visible y permite modo guiado por tarjeta. */
(function(){
  'use strict';
  if(window.MV470_CAP_AUDIO_MIS_FUNCIONES) return;
  window.MV470_CAP_AUDIO_MIS_FUNCIONES=true;

  const synth=window.speechSynthesis;
  let actual=null;
  let cola=[];
  let guiado=false;
  let destacado=null;

  function css(){
    if(document.getElementById('mv470-audio-css')) return;
    const s=document.createElement('style');
    s.id='mv470-audio-css';
    s.textContent=`
      #mv466curso .mv470-audio{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px;padding-top:9px;border-top:1px solid #e2e8f0}
      #mv466curso .mv470-audio button{min-height:36px;padding:8px 10px;border:1px solid #bfdbfe;border-radius:10px;background:#fff;color:#1d4ed8;font-size:10.5px;font-weight:900;cursor:pointer}
      #mv466curso .mv470-audio button:hover{background:#eff6ff}
      #mv466curso .mv470-audio .mv470-main{background:#0b6ffb;color:#fff;border-color:#0b6ffb}
      #mv466curso .mv470-audio .mv470-guide.on{background:#7c3aed;color:#fff;border-color:#7c3aed}
      #mv466curso .mv470-audio .mv470-status{flex:1 1 100%;font-size:9.5px;color:#64748b;font-weight:700;padding-top:1px;line-height:1.35}
      #mv466curso .mv470-speaking{outline:3px solid #8b5cf6!important;outline-offset:2px;box-shadow:0 0 0 5px #ede9fe!important;transition:.18s}
      #mv466curso.mv470-guided .mv466-item:after{content:'🔊';float:right;margin-left:6px;font-size:11px}
      #mv466curso.mv470-guided .mv466-seq-row.active .mv466-seq-status:after{content:' · 🔊';}
      @media(max-width:640px){#mv466curso .mv470-audio button{flex:1 1 46%}.mv470-audio .mv470-main{flex-basis:100%!important}}
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
      .replace(/\s+/g,' ')
      .trim();
  }

  function voz(){
    if(!synth || !synth.getVoices) return null;
    const v=synth.getVoices();
    return v.find(x=>/^es-PE$/i.test(x.lang)) ||
      v.find(x=>/^es(-|_)/i.test(x.lang) && /peru|perú/i.test(x.name||'')) ||
      v.find(x=>/^es(-|_)/i.test(x.lang)) || null;
  }

  function estado(msg){
    const e=document.querySelector('#mv466curso .mv470-status');
    if(e) e.textContent=msg;
  }

  function limpiarDestacado(){
    if(destacado){ destacado.classList.remove('mv470-speaking'); destacado=null; }
  }

  function detener(silencioso=false){
    if(synth) synth.cancel();
    actual=null;cola=[];limpiarDestacado();
    if(!silencioso) estado('Audio detenido.');
    actualizarPausa();
  }

  function actualizarPausa(){
    const b=document.querySelector('#mv466curso [data-audio-pause]');
    if(!b || !synth) return;
    b.textContent=synth.paused?'▶️ Reanudar':'⏸ Pausar';
  }

  function hablarBloques(bloques,mensaje='🔊 Reproduciendo...'){
    if(!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance){
      alert('Este navegador no tiene disponible la lectura en voz alta.');
      return;
    }
    const limpios=bloques.filter(x=>x && limpiar(x.texto)).map(x=>({texto:limpiar(x.texto),el:x.el||null}));
    if(!limpios.length){ estado('No se encontró contenido visible para leer.'); return; }
    detener(true);
    cola=limpios.slice();
    estado(mensaje);
    siguienteBloque();
  }

  function siguienteBloque(){
    if(!cola.length){
      actual=null; limpiarDestacado(); estado('✓ Lectura terminada.'); actualizarPausa(); return;
    }
    const bloque=cola.shift();
    limpiarDestacado();
    if(bloque.el){
      destacado=bloque.el;
      destacado.classList.add('mv470-speaking');
      try{ destacado.scrollIntoView({behavior:'smooth',block:'center'}); }catch(_){ }
    }
    const u=new SpeechSynthesisUtterance(bloque.texto);
    actual=u;
    u.lang='es-PE';
    u.rate=0.92;
    u.pitch=1;
    const v=voz(); if(v) u.voice=v;
    u.onstart=actualizarPausa;
    u.onend=()=>{ actual=null; setTimeout(siguienteBloque,180); };
    u.onerror=()=>{ actual=null; limpiarDestacado(); estado('No se pudo reproducir esta lectura. Puedes intentarlo nuevamente.'); actualizarPausa(); };
    synth.speak(u);
  }

  function bloquesIntroduccion(){
    const screen=document.querySelector('#mv466curso .mv466-screen');
    if(!screen) return [];
    const out=[];
    const step=screen.querySelector('.mv466-step');
    const h=screen.querySelector('h2');
    const p=screen.querySelector(':scope > p');
    if(step && visible(step)) out.push({texto:step.textContent,el:step});
    if(h && visible(h)) out.push({texto:h.textContent,el:h});
    if(p && visible(p)) out.push({texto:p.textContent,el:p});
    return out;
  }

  function bloquesTarjeta(item){
    if(!item) return [];
    const out=[];
    const titulo=item.querySelector('b');
    const resumen=item.querySelector('small');
    if(titulo) out.push({texto:titulo.textContent,el:item});
    if(resumen && visible(resumen)) out.push({texto:resumen.textContent,el:item});
    const detalle=item.querySelector('.mv466-detail');
    if(detalle && visible(detalle)){
      detalle.querySelectorAll('.mv466-block').forEach(b=>{
        if(!visible(b)) return;
        const strong=b.querySelector('strong');
        const span=b.querySelector('span');
        const texto=[strong?.textContent,span?.textContent].filter(Boolean).join('. ');
        if(texto) out.push({texto,el:b});
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
      body.querySelectorAll('.mv466-block').forEach(b=>{
        if(!visible(b)) return;
        const strong=b.querySelector('strong');
        const span=b.querySelector('span');
        const texto=[strong?.textContent,span?.textContent].filter(Boolean).join('. ');
        if(texto) out.push({texto,el:b});
      });
    }
    return out;
  }

  function bloquesPantalla(){
    const curso=document.getElementById('mv466curso');
    if(!curso) return [];
    const out=bloquesIntroduccion();
    curso.querySelectorAll('.mv466-item').forEach(item=>{
      if(visible(item)) out.push(...bloquesTarjeta(item));
    });
    const activa=curso.querySelector('.mv466-seq-row.active');
    if(activa) out.push(...bloquesSecuencia(activa));
    const key=curso.querySelector('.mv466-key');
    if(key && visible(key)) out.push({texto:key.textContent,el:key});
    return out;
  }

  function escucharPantalla(){
    hablarBloques(bloquesPantalla(),'🔊 Leyendo únicamente lo visible en esta pantalla...');
  }

  function leerIntroduccion(){
    hablarBloques(bloquesIntroduccion(),'🎧 Nueva parte. Escucha la introducción y toca una tarjeta para ampliarla.');
  }

  function leerTarjeta(target){
    const item=target.closest('.mv466-item');
    if(item){ hablarBloques(bloquesTarjeta(item),'🎧 Leyendo esta tarjeta...'); return; }
    const row=target.closest('.mv466-seq-row.active');
    if(row) hablarBloques(bloquesSecuencia(row),'🎧 Leyendo esta etapa...');
  }

  function pausarReanudar(){
    if(!synth) return;
    if(synth.paused){ synth.resume(); estado('🔊 Lectura reanudada.'); }
    else if(synth.speaking){ synth.pause(); estado('⏸ Lectura pausada.'); }
    else { escucharPantalla(); return; }
    actualizarPausa();
  }

  function toggleGuiado(){
    guiado=!guiado;
    const curso=document.getElementById('mv466curso');
    const b=curso?.querySelector('[data-audio-guide]');
    if(curso) curso.classList.toggle('mv470-guided',guiado);
    if(b){ b.classList.toggle('on',guiado); b.textContent=guiado?'🎧 Guiado: ON':'🎧 Guiado: OFF'; }
    estado(guiado?'Modo guiado activado: toca una tarjeta y escucharás solo esa explicación.':'Modo guiado desactivado. Puedes usar “Escuchar pantalla”.');
    detener(true);
  }

  function ponerControles(){
    const curso=document.getElementById('mv466curso');
    if(!curso || curso.querySelector('.mv470-audio')) return;
    css();
    const note=curso.querySelector('.mv466-note');
    if(!note) return;
    const bar=document.createElement('div');
    bar.className='mv470-audio';
    bar.innerHTML=`<button type="button" class="mv470-main" data-audio-play>🔊 Escuchar pantalla</button><button type="button" class="mv470-guide ${guiado?'on':''}" data-audio-guide>${guiado?'🎧 Guiado: ON':'🎧 Guiado: OFF'}</button><button type="button" data-audio-pause>⏸ Pausar</button><button type="button" data-audio-stop>⏹ Detener</button><div class="mv470-status">Escucha la pantalla o activa el modo guiado para oír cada tarjeta al tocarla.</div>`;
    note.insertAdjacentElement('afterend',bar);
    curso.classList.toggle('mv470-guided',guiado);
    bar.querySelector('[data-audio-play]').addEventListener('click',escucharPantalla);
    bar.querySelector('[data-audio-guide]').addEventListener('click',toggleGuiado);
    bar.querySelector('[data-audio-pause]').addEventListener('click',pausarReanudar);
    bar.querySelector('[data-audio-stop]').addEventListener('click',()=>detener(false));
  }

  document.addEventListener('click',function(e){
    if(!e.target.closest) return;
    const dentro=e.target.closest('#mv466curso');
    if(!dentro) return;

    if(e.target.closest('[data-audio-play],[data-audio-guide],[data-audio-pause],[data-audio-stop]')) return;

    const tarjeta=e.target.closest('.mv466-item');
    const seq=e.target.closest('.mv466-seq-row.active .mv466-seq-head');
    if(guiado && (tarjeta || seq)){
      setTimeout(()=>leerTarjeta(tarjeta||seq),40);
      return;
    }

    if(e.target.closest('[data-next],[data-back],[data-seq-next]')){
      detener(true);
      setTimeout(()=>{
        ponerControles();
        if(guiado) leerIntroduccion();
      },50);
    }
    if(e.target.closest('[data-capacitacion]')) detener(true);
  });

  const abrir=window.mv467AbrirMisFunciones;
  if(typeof abrir==='function'){
    window.mv467AbrirMisFunciones=function(){
      const r=abrir.apply(this,arguments);
      setTimeout(()=>{ponerControles(); if(guiado) leerIntroduccion();},40);
      return r;
    };
  }

  setTimeout(ponerControles,0);
  window.addEventListener('beforeunload',()=>{if(synth)synth.cancel();});
})();