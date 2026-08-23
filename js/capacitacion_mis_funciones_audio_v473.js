/* MI VISUAL V473 - Audio contextual natural sin lectura de simbolos / Mis Funciones
   Lee solo texto util. Emojis, iconos y simbolos visuales no pasan al motor de voz.
   Mantiene lectura automatica por tarjeta y silencio al salir del minicurso. */
(function(){
  'use strict';
  if(window.MV473_CAP_AUDIO_MIS_FUNCIONES) return;
  window.MV473_CAP_AUDIO_MIS_FUNCIONES=true;

  const synth=window.speechSynthesis;
  let cola=[];
  let destacado=null;
  let vigilante=null;
  let vozPreferida=null;

  function css(){
    if(document.getElementById('mv473-audio-css')) return;
    const s=document.createElement('style');
    s.id='mv473-audio-css';
    s.textContent=`
      #mv466curso .mv473-audio{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px;padding-top:9px;border-top:1px solid #e2e8f0}
      #mv466curso .mv473-audio button{min-height:36px;padding:8px 10px;border:1px solid #bfdbfe;border-radius:10px;background:#fff;color:#1d4ed8;font-size:10.5px;font-weight:900;cursor:pointer}
      #mv466curso .mv473-audio .mv473-main{background:#0b6ffb;color:#fff;border-color:#0b6ffb}
      #mv466curso .mv473-status{flex:1 1 100%;font-size:9.5px;color:#64748b;font-weight:700;line-height:1.35}
      #mv466curso .mv473-speaking{outline:3px solid #8b5cf6!important;outline-offset:2px;box-shadow:0 0 0 5px #ede9fe!important;transition:.18s}
      #mv466curso .mv466-item.open:after{content:'Escuchando';display:block;margin-top:7px;color:#7c3aed;font-size:9px;font-weight:900}
      @media(max-width:640px){#mv466curso .mv473-audio button{flex:1 1 30%}.mv473-audio .mv473-main{flex-basis:100%!important}}
    `;
    document.head.appendChild(s);
  }

  function visible(el){
    if(!el) return false;
    const st=getComputedStyle(el);
    return st.display!=='none' && st.visibility!=='hidden' && st.opacity!=='0';
  }

  function quitarSimbolos(txt){
    return (txt||'')
      .replace(/[\u{1F000}-\u{1FAFF}]/gu,' ')
      .replace(/[\u2600-\u27BF]/g,' ')
      .replace(/[✓✔✕✖⚠★☆◆◇●○■□▶◀→←↑↓]/g,' ')
      .replace(/[|•·]/g,' ');
  }

  function limpiar(txt){
    return quitarSimbolos(txt)
      .replace(/Atrás/gi,'')
      .replace(/Siguiente/gi,'')
      .replace(/Volver a Capacitación/gi,'')
      .replace(/\d+\s+de\s+\d+\s+ampliados\s*revisión opcional/gi,'')
      .replace(/Toca para revisar/gi,'')
      .replace(/Pendiente/gi,'')
      .replace(/Revisado/gi,'')
      .replace(/Siguiente etapa/gi,'')
      .replace(/Finalizar estas etapas/gi,'')
      .replace(/Escuchando/gi,'')
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
      .replace(/\s+/g,' ')
      .trim();
  }

  function puntuarVoz(v){
    const nombre=(v.name||'').toLowerCase();
    const lang=(v.lang||'').toLowerCase();
    if(!lang.startsWith('es')) return -1000;
    let p=0;
    if(lang==='es-pe') p+=90; else if(lang.startsWith('es-')) p+=50;
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

  if(synth && 'onvoiceschanged' in synth){ synth.onvoiceschanged=()=>{vozPreferida=null;elegirVoz();}; }

  function prosodia(tipo){
    switch(tipo){
      case 'titulo': return {rate:.90,pitch:1.03,pausa:380};
      case 'resumen': return {rate:.96,pitch:1.01,pausa:320};
      case 'significado': return {rate:.94,pitch:1.00,pausa:450};
      case 'accion': return {rate:.95,pitch:1.01,pausa:450};
      case 'ejemplo': return {rate:.93,pitch:1.04,pausa:540};
      case 'critico': return {rate:.89,pitch:.98,pausa:580};
      case 'intro': return {rate:.94,pitch:1.02,pausa:400};
      default: return {rate:.94,pitch:1.01,pausa:380};
    }
  }

  function estado(txt){const el=document.querySelector('#mv466curso .mv473-status');if(el)el.textContent=txt;}
  function limpiarDestacado(){if(destacado){destacado.classList.remove('mv473-speaking');destacado=null;}}
  function actualizarPausa(){const b=document.querySelector('#mv466curso [data-audio-pause]');if(b&&synth)b.textContent=synth.paused?'Reanudar':'Pausar';}
  function detener(silencioso){
    if(synth)synth.cancel(); cola=[]; limpiarDestacado();
    if(vigilante){clearInterval(vigilante);vigilante=null;}
    if(!silencioso)estado('Audio detenido. Toca una tarjeta para escucharla nuevamente.');
    actualizarPausa();
  }
  function iniciarVigilancia(){
    if(vigilante)clearInterval(vigilante);
    vigilante=setInterval(()=>{
      if(!document.getElementById('mv466curso'))detener(true);
      else if(!synth||(!synth.speaking&&!synth.pending&&!cola.length)){clearInterval(vigilante);vigilante=null;}
    },400);
  }

  function hablarBloques(bloques,mensaje){
    if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance){alert('Este navegador no tiene disponible la lectura en voz alta.');return;}
    const limpios=bloques.map(b=>({texto:naturalizar(b.texto),el:b.el||null,tipo:b.tipo||'normal'})).filter(b=>b.texto);
    if(!limpios.length)return;
    detener(true); cola=limpios; estado(mensaje||'Escuchando...'); iniciarVigilancia(); siguiente();
  }

  function siguiente(){
    if(!document.getElementById('mv466curso')){detener(true);return;}
    if(!cola.length){limpiarDestacado();estado('Lectura terminada. Toca otra opción para escucharla.');actualizarPausa();return;}
    const b=cola.shift(); limpiarDestacado();
    if(b.el){destacado=b.el;b.el.classList.add('mv473-speaking');}
    const p=prosodia(b.tipo),u=new SpeechSynthesisUtterance(b.texto);
    u.lang='es-PE';u.rate=p.rate;u.pitch=p.pitch;u.volume=1;
    const v=elegirVoz();if(v)u.voice=v;
    u.onstart=actualizarPausa;
    u.onend=()=>setTimeout(siguiente,p.pausa);
    u.onerror=()=>{limpiarDestacado();estado('No se pudo reproducir esta parte. Puedes tocarla nuevamente.');actualizarPausa();};
    synth.speak(u);
  }

  function tipoBloque(block){
    const e=(block.querySelector('strong')?.textContent||'').toLowerCase();
    if(e.includes('ejemplo'))return 'ejemplo';
    if(e.includes('punto clave'))return 'critico';
    if(e.includes('qué significa')||e.includes('que significa'))return 'significado';
    if(e.includes('qué debes hacer')||e.includes('que debes hacer'))return 'accion';
    return 'normal';
  }

  function bloquesTarjeta(item){
    if(!item)return[];const out=[];
    const titulo=item.querySelector('b'),resumen=item.querySelector('small');
    if(titulo)out.push({texto:titulo.textContent,el:item,tipo:'titulo'});
    if(resumen)out.push({texto:resumen.textContent,el:item,tipo:'resumen'});
    const detalle=item.querySelector('.mv466-detail');
    if(detalle&&visible(detalle))detalle.querySelectorAll('.mv466-block').forEach(block=>{
      if(!visible(block))return;
      const etiqueta=block.querySelector('strong')?.textContent||'',contenido=block.querySelector('span')?.textContent||'';
      if(etiqueta||contenido)out.push({texto:[etiqueta,contenido].filter(Boolean).join('. '),el:block,tipo:tipoBloque(block)});
    });
    return out;
  }

  function bloquesSecuencia(row){
    if(!row)return[];const out=[];
    const titulo=row.querySelector('.mv466-seq-title b'),resumen=row.querySelector('.mv466-seq-title small');
    if(titulo)out.push({texto:titulo.textContent,el:row,tipo:'titulo'});
    if(resumen)out.push({texto:resumen.textContent,el:row,tipo:'resumen'});
    const body=row.querySelector('.mv466-seq-body');
    if(body&&visible(body))body.querySelectorAll('.mv466-block').forEach(block=>{
      if(!visible(block))return;
      const etiqueta=block.querySelector('strong')?.textContent||'',contenido=block.querySelector('span')?.textContent||'';
      if(etiqueta||contenido)out.push({texto:[etiqueta,contenido].filter(Boolean).join('. '),el:block,tipo:tipoBloque(block)});
    });
    return out;
  }

  function bloquesPantalla(){
    const screen=document.querySelector('#mv466curso .mv466-screen');if(!screen)return[];const out=[];
    const step=screen.querySelector('.mv466-step'),h=screen.querySelector('h2'),intro=screen.querySelector(':scope > p');
    if(step&&visible(step))out.push({texto:step.textContent,el:step,tipo:'intro'});
    if(h&&visible(h))out.push({texto:h.textContent,el:h,tipo:'titulo'});
    if(intro&&visible(intro))out.push({texto:intro.textContent,el:intro,tipo:'intro'});
    screen.querySelectorAll('.mv466-item.open').forEach(item=>out.push(...bloquesTarjeta(item)));
    const seq=screen.querySelector('.mv466-seq-row.active.open');if(seq)out.push(...bloquesSecuencia(seq));
    const key=screen.querySelector('.mv466-key');if(key&&visible(key))out.push({texto:key.textContent,el:key,tipo:'critico'});
    return out;
  }

  function leerOpcion(target){
    const item=target.closest('.mv466-item');
    if(item){if(!item.classList.contains('open')){detener(true);return;}hablarBloques(bloquesTarjeta(item),'Escuchando esta opción...');return;}
    const row=target.closest('.mv466-seq-row.active');
    if(row){if(!row.classList.contains('open')){detener(true);return;}hablarBloques(bloquesSecuencia(row),'Escuchando esta etapa...');}
  }
  function escucharPantalla(){hablarBloques(bloquesPantalla(),'Escuchando el contenido visible de esta pantalla...');}
  function pausarReanudar(){if(!synth)return;if(synth.paused){synth.resume();estado('Lectura reanudada.');}else if(synth.speaking){synth.pause();estado('Lectura pausada.');}actualizarPausa();}

  function ponerControles(){
    const curso=document.getElementById('mv466curso');if(!curso||curso.querySelector('.mv473-audio'))return;css();
    const note=curso.querySelector('.mv466-note');if(!note)return;
    const bar=document.createElement('div');bar.className='mv473-audio';
    bar.innerHTML='<button type="button" class="mv473-main" data-audio-play>Escuchar pantalla</button><button type="button" data-audio-pause>Pausar</button><button type="button" data-audio-stop>Detener</button><div class="mv473-status">Toca cualquier tarjeta para escucharla. Los símbolos e íconos no se leerán.</div>';
    note.insertAdjacentElement('afterend',bar);
    bar.querySelector('[data-audio-play]').addEventListener('click',escucharPantalla);
    bar.querySelector('[data-audio-pause]').addEventListener('click',pausarReanudar);
    bar.querySelector('[data-audio-stop]').addEventListener('click',()=>detener(false));
  }

  document.addEventListener('click',function(e){
    if(!e.target.closest)return;const curso=document.getElementById('mv466curso');
    if(curso&&!e.target.closest('#mv466curso')){detener(true);return;}if(!curso)return;
    if(e.target.closest('[data-audio-play],[data-audio-pause],[data-audio-stop]'))return;
    if(e.target.closest('[data-next],[data-back],[data-seq-next],[data-capacitacion]')){detener(true);setTimeout(ponerControles,40);return;}
    const opcion=e.target.closest('.mv466-item,.mv466-seq-row.active .mv466-seq-head');
    if(opcion){detener(true);setTimeout(()=>leerOpcion(opcion),60);}
  });

  const abrir=window.mv467AbrirMisFunciones;
  if(typeof abrir==='function')window.mv467AbrirMisFunciones=function(){detener(true);const r=abrir.apply(this,arguments);setTimeout(ponerControles,40);return r;};

  document.addEventListener('visibilitychange',()=>{if(document.hidden)detener(true);});
  window.addEventListener('pagehide',()=>detener(true));
  window.addEventListener('beforeunload',()=>detener(true));
  setTimeout(ponerControles,0);
})();