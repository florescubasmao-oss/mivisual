/* MI VISUAL V464 - Flujo estable del minicurso "Mis Funciones".
   Ajuste aislado: Continuar siempre habilitado. Las tarjetas abren y cierran con un toque.
   El observador escucha solo cambios de pantalla completa para evitar bucles y bloqueos. */
(function(){
  'use strict';
  if(window.MV464_CAP_FLUJO_ESTABLE) return;
  window.MV464_CAP_FLUJO_ESTABLE = true;

  function actualizarContador(curso){
    if(!curso) return;
    const contador = curso.querySelector('.mv460-count');
    if(!contador) return;
    const items = Array.from(curso.querySelectorAll('.mv460-item'));
    const abiertos = items.filter(x => x.classList.contains('open')).length;
    const html = abiertos + ' de ' + items.length + ' revisados <span style="color:#64748b;font-weight:700">· revisión opcional</span>';
    if(contador.innerHTML !== html) contador.innerHTML = html;
  }

  function habilitarContinuar(){
    const curso = document.getElementById('mv460curso');
    if(!curso) return;
    const boton = curso.querySelector('[data-next]');
    if(boton && boton.disabled){
      boton.disabled = false;
      boton.removeAttribute('disabled');
    }
    if(boton){
      boton.style.opacity = '1';
      boton.style.cursor = 'pointer';
    }
    actualizarContador(curso);
  }

  function cargarDetalle(){
    if(window.MV464_CAP_MIS_FUNCIONES_DETALLE) return;
    if(document.querySelector('script[data-mv464-detalle]')) return;
    const s = document.createElement('script');
    s.src = './js/capacitacion_mis_funciones_detalle_v463.js?v=V464-DETALLE-ESTABLE';
    s.async = true;
    s.dataset.mv464Detalle = '1';
    document.head.appendChild(s);
  }

  const pantalla = document.getElementById('pantalla');
  if(pantalla){
    const obs = new MutationObserver(function(){
      requestAnimationFrame(habilitarContinuar);
    });
    // Solo cambios directos de #pantalla. No observa modificaciones internas del curso.
    obs.observe(pantalla,{childList:true,subtree:false});
  }

  document.addEventListener('click',function(e){
    const tarjeta = e.target.closest && e.target.closest('#mv460curso .mv460-item');
    if(!tarjeta) return;

    // Sustituye el manejador original: un toque abre y el siguiente cierra.
    e.preventDefault();
    e.stopPropagation();
    if(typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

    tarjeta.classList.toggle('open');
    actualizarContador(document.getElementById('mv460curso'));
  },true);

  cargarDetalle();
  setTimeout(habilitarContinuar,0);
})();