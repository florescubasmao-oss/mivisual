/* MI VISUAL V432 - Acceso ligero a Seguridad ATS/PETAR */
(function(){
  'use strict';
  if(window.__seg432Acceso) return; window.__seg432Acceso=true;
  function n(v){return String(v||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
  function permitido(){
    const p=n(localStorage.getItem('perfil'));
    const perfiles=['TECNICO','SUPERVISOR','JEFATURA','JEFATURA GENERAL','JEFATURA OPERACIONES','JEFATURA DE OPERACIONES','GERENCIA LIMA','GERENCIA GENERAL','GERENCIAL GENERAL','ADMIN','ADMINISTRADOR'];
    if(!perfiles.includes(p))return false;
    try{const f=typeof pmPermiso==='function'?pmPermiso('SEGURIDAD'):null;if(f)return n(f.activo||'SI')==='SI'&&n(f.ver||'NO')==='SI';}catch(_){ }
    return true; // backend vuelve a validar permisos; permite la primera carga mientras refresca caché.
  }
  function estilos(){if(document.getElementById('seg432AccesoCss'))return;const s=document.createElement('style');s.id='seg432AccesoCss';s.textContent=`
    .seg432-status-row{display:flex!important;align-items:stretch!important;gap:9px!important;width:100%!important;margin-top:8px!important}
    .seg432-status-row #pdEstadoMenu{flex:1 1 auto!important;width:auto!important;margin:0!important}
    .seg432-icon-btn{flex:0 0 54px;width:54px;height:48px;border:2px solid #22c55e;border-radius:13px;background:#fff;padding:3px;cursor:pointer;box-shadow:0 4px 12px rgba(15,23,42,.15);overflow:hidden;display:flex;align-items:center;justify-content:center}
    .seg432-icon-btn img{width:46px;height:42px;object-fit:cover;object-position:center 15%;border-radius:9px}
    .seg432-icon-btn:active{transform:scale(.97)}
    @media(max-width:560px){.seg432-icon-btn{flex-basis:50px;width:50px;height:46px}.seg432-icon-btn img{width:42px;height:40px}}
  `;document.head.appendChild(s)}
  function abrir(){if(typeof window.mostrarSeguridad==='function')return window.mostrarSeguridad();alert('Seguridad se está cargando. Intente nuevamente.');}
  function instalar(){
    if(!localStorage.getItem('usuario')||!permitido())return;
    estilos(); const w=document.getElementById('mv55Welcome'); if(!w)return;
    let btn=document.getElementById('seg432Acceso');
    if(!btn){btn=document.createElement('button');btn.id='seg432Acceso';btn.type='button';btn.className='seg432-icon-btn';btn.title='ATS / PETAR';btn.setAttribute('aria-label','ATS / PETAR');btn.onclick=abrir;btn.innerHTML='<img src="./img/seguridad-ats-petar.png?v=V432" alt="">';}
    const estado=document.getElementById('pdEstadoMenu');
    if(estado){let row=document.getElementById('seg432StatusRow');if(!row){row=document.createElement('div');row.id='seg432StatusRow';row.className='seg432-status-row';estado.parentNode.insertBefore(row,estado);row.appendChild(btn);row.appendChild(estado);}else{if(!row.contains(btn))row.insertBefore(btn,row.firstChild);if(!row.contains(estado))row.appendChild(estado);}}
    else if(!btn.isConnected){w.appendChild(btn)}
  }
  const obs=new MutationObserver(()=>{clearTimeout(window.__seg432Timer);window.__seg432Timer=setTimeout(instalar,60)});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',()=>setTimeout(instalar,600));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(instalar,150)});
  window.seg432InstalarAcceso=instalar;
})();