/* MI VISUAL V463 - Flujo libre + tarjetas desplegables del minicurso "Mis Funciones".
   Ajuste aislado: Continuar siempre habilitado. Las tarjetas abren y cierran con un toque,
   el contador refleja únicamente las tarjetas abiertas y se carga el detalle ampliado. */
(function(){
  'use strict';
  if(window.MV462_CAP_FLUJO_LIBRE) return;
  window.MV462_CAP_FLUJO_LIBRE = true;

  function actualizarContador(curso){
    if(!curso) return;
    const contador = curso.querySelector('.mv460-count');
    if(!contador) return;
    const items = Array.from(curso.querySelectorAll('.mv460-item'));
    const abiertos = items.filter(x => x.classList.contains('open')).length;
    contador.innerHTML = abiertos + ' de ' + items.length + ' revisados <span style="color:#64748b;font-weight:700">· revisión opcional</span>';
  }

  function habilitarContinuar(){
    const curso = document.getElementById('mv460curso');
    if(!curso) return;
    const boton = curso.querySelector('[data-next]');
    if(boton){
      boton.disabled = false;
      boton.removeAttribute('disabled');
      boton.style.opacity = '1';
      boton.style.cursor = 'pointer';
    }
    actualizarContador(curso);
  }

  function cargarDetalleV463(){
    if(window.MV463_CAP_MIS_FUNCIONES_DETALLE) return;
    if(document.querySelector('script[data-mv463-detalle]')) return;
    const s=document.createElement('script');
    s.src='./js/capacitacion_mis_funciones_detalle_v463.js?v=V463-DETALLE-TARJETAS';
    s.async=true;
    s.dataset.mv463Detalle='1';
    document.head.appendChild(s);
  }

  const pantalla = document.getElementById('pantalla');
  if(pantalla){
    const obs = new MutationObserver(habilitarContinuar);
    obs.observe(pantalla,{childList:true,subtree:true});
  }

  document.addEventListener('click',function(e){
    const tarjeta = e.target.closest && e.target.closest('#mv460curso .mv460-item');
    if(!tarjeta) return;

    // Evita el manejador original que dejaba la tarjeta marcada permanentemente.
    e.preventDefault();
    e.stopPropagation();
    if(typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

    tarjeta.classList.toggle('open');
    actualizarContador(document.getElementById('mv460curso'));
    habilitarContinuar();
  },true);

  cargarDetalleV463();
  setTimeout(habilitarContinuar,0);
})();