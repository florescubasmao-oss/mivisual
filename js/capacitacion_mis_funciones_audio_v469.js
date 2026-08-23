/* MI VISUAL V469 - Audio lectura / Minicurso 01: Mis Funciones
   Usa SpeechSynthesis del navegador. Sin audios externos, sin backend y sin observers.
   Solo actúa dentro de #mv466curso. */
(function(){
  'use strict';
  if(window.MV469_CAP_AUDIO_MIS_FUNCIONES) return;
  window.MV469_CAP_AUDIO_MIS_FUNCIONES=true;

  const synth = window.speechSynthesis;
  let utterance = null;

  function css(){
    if(document.getElementById('mv469-audio-css')) return;
    const s=document.createElement('style');
    s.id='mv469-audio-css';
    s.textContent=`
      #mv466curso .mv469-audio{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px;padding-top:9px;border-top:1px solid #e2e8f0}
      #mv466curso .mv469-audio button{min-height:36px;padding:8px 10px;border:1px solid #bfdbfe;border-radius:10px;background:#fff;color:#1d4ed8;font-size:10.5px;font-weight:900;cursor:pointer}
      #mv466curso .mv469-audio button:hover{background:#eff6ff}
      #mv466curso .mv469-audio button:disabled{opacity:.45;cursor:not-allowed}
      #mv466curso .mv469-audio .mv469-main{background:#0b6ffb;color:#fff;border-color:#0b6ffb}
      #mv466curso .mv469-audio .mv469-status{flex:1 1 100%;font-size:9.5px;color:#64748b;font-weight:700;padding-top:1px}
      @media(max-width:640px){#mv466curso .mv469-audio button{flex:1 1 auto}}
    `;
    document.head.appendChild(s);
  }

  function limpiarTexto(txt){
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

  function textoPantalla(){
    const screen=document.querySelector('#mv466curso .mv466-screen');
    if(!screen) return '';
    return limpiarTexto(screen.innerText);
  }

  function elegirVoz(){
    if(!synth) return null;
    const voces=synth.getVoices ? synth.getVoices() : [];
    return voces.find(v=>/^es-PE$/i.test(v.lang)) ||
           voces.find(v=>/^es(-|_)/i.test(v.lang) && /peru|perú/i.test(v.name||'')) ||
           voces.find(v=>/^es(-|_)/i.test(v.lang)) || null;
  }

  function estado(msg){
    const el=document.querySelector('#mv466curso .mv469-status');
    if(el) el.textContent=msg;
  }

  function actualizarPausa(){
    const b=document.querySelector('#mv466curso [data-audio-pause]');
    if(!b || !synth) return;
    b.textContent=synth.paused?'▶️ Reanudar':'⏸ Pausar';
  }

  function detener(){
    if(!synth) return;
    synth.cancel();
    utterance=null;
    estado('Audio detenido.');
    actualizarPausa();
  }

  function escuchar(){
    if(!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance){
      alert('Este navegador no tiene disponible la lectura en voz alta.');
      return;
    }
    const texto=textoPantalla();
    if(!texto){ estado('No se encontró contenido para leer.'); return; }
    synth.cancel();
    utterance=new SpeechSynthesisUtterance(texto);
    utterance.lang='es-PE';
    utterance.rate=0.95;
    utterance.pitch=1;
    const voz=elegirVoz();
    if(voz) utterance.voice=voz;
    utterance.onstart=()=>{estado('🔊 Reproduciendo esta parte del curso...');actualizarPausa();};
    utterance.onend=()=>{estado('✓ Lectura terminada.');utterance=null;actualizarPausa();};
    utterance.onerror=()=>{estado('No se pudo reproducir la lectura. Puedes intentarlo nuevamente.');utterance=null;actualizarPausa();};
    synth.speak(utterance);
  }

  function pausarReanudar(){
    if(!synth) return;
    if(synth.paused){ synth.resume(); estado('🔊 Lectura reanudada.'); }
    else if(synth.speaking){ synth.pause(); estado('⏸ Lectura pausada.'); }
    else { escuchar(); return; }
    actualizarPausa();
  }

  function ponerControles(){
    const curso=document.getElementById('mv466curso');
    if(!curso || curso.querySelector('.mv469-audio')) return;
    css();
    const note=curso.querySelector('.mv466-note');
    if(!note) return;
    const bar=document.createElement('div');
    bar.className='mv469-audio';
    bar.innerHTML=`<button type="button" class="mv469-main" data-audio-play>🔊 Escuchar esta parte</button><button type="button" data-audio-pause>⏸ Pausar</button><button type="button" data-audio-stop>⏹ Detener</button><div class="mv469-status">Puedes escuchar el contenido de la pantalla actual.</div>`;
    note.insertAdjacentElement('afterend',bar);
    bar.querySelector('[data-audio-play]').addEventListener('click',escuchar);
    bar.querySelector('[data-audio-pause]').addEventListener('click',pausarReanudar);
    bar.querySelector('[data-audio-stop]').addEventListener('click',detener);
  }

  // El curso reemplaza su HTML al avanzar; reinsertamos los controles solo tras acciones del propio curso.
  document.addEventListener('click',function(e){
    if(!e.target.closest) return;
    if(e.target.closest('#mv466curso [data-next], #mv466curso [data-back], #mv466curso [data-seq-next]')){
      detener();
      setTimeout(ponerControles,30);
    }
    if(e.target.closest('#mv466curso [data-capacitacion]')) detener();
  },true);

  const abrir=window.mv467AbrirMisFunciones;
  if(typeof abrir==='function'){
    window.mv467AbrirMisFunciones=function(){
      const r=abrir.apply(this,arguments);
      setTimeout(ponerControles,30);
      return r;
    };
  }

  // Por si el curso ya estaba abierto cuando cargó esta mejora.
  setTimeout(ponerControles,0);

  window.addEventListener('beforeunload',()=>{ if(synth) synth.cancel(); });
})();