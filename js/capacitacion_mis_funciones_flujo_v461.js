/* MI VISUAL V461 - Flujo libre del minicurso "Mis Funciones".
   Ajuste aislado: las tarjetas siguen siendo interactivas y el contador permanece visible,
   pero no es obligatorio abrirlas todas para habilitar Continuar. */
(function(){
  'use strict';
  if(window.MV461_CAP_FLUJO_LIBRE) return;
  window.MV461_CAP_FLUJO_LIBRE = true;

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
    const contador = curso.querySelector('.mv460-count');
    if(contador && !contador.dataset.mv461){
      contador.dataset.mv461 = '1';
      contador.insertAdjacentHTML('beforeend',' <span style="color:#64748b;font-weight:700">· revisión opcional</span>');
    }
  }

  const pantalla = document.getElementById('pantalla');
  if(pantalla){
    const obs = new MutationObserver(habilitarContinuar);
    obs.observe(pantalla,{childList:true,subtree:true});
  }
  document.addEventListener('click',function(e){
    if(e.target.closest && e.target.closest('.mv460-item')) setTimeout(habilitarContinuar,0);
  },true);
  setTimeout(habilitarContinuar,0);
})();
