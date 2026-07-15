// MI VISUAL V104 - Administración visual + disponibilidad Checklist
(function(){
  const oldConfigurarMenu = typeof configurarMenu === 'function' ? configurarMenu : null;

  function admStyle(){
    return `<style>
      .adm104-wrap{padding:18px;max-width:1100px;margin:auto;color:#f8fafc}
      .adm104-title{display:flex;align-items:center;gap:10px;margin:0 0 16px;font-size:26px}
      .adm104-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .adm104-card{background:linear-gradient(145deg,#1e293b,#26364f);border:1px solid rgba(148,163,184,.26);border-radius:18px;padding:18px;box-shadow:0 10px 24px rgba(2,6,23,.25);cursor:pointer;transition:.18s transform,.18s border-color,.18s box-shadow;min-height:110px;display:flex;align-items:center;gap:15px}
      .adm104-card:hover{transform:translateY(-2px);border-color:#60a5fa;box-shadow:0 14px 28px rgba(2,6,23,.35)}
      .adm104-icon{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:rgba(37,99,235,.22);font-size:25px;flex:0 0 auto}
      .adm104-card h3{margin:0 0 5px;font-size:16px;color:#fff}
      .adm104-card p{margin:0;color:#cbd5e1;font-size:12px;line-height:1.4}
      .adm104-config{grid-column:1/-1;background:#eff6ff;color:#0f172a;border:2px solid #60a5fa;border-radius:18px;padding:16px;box-shadow:0 10px 24px rgba(15,23,42,.16)}
      .adm104-config .ck-config{margin:0;box-shadow:none;border:0;background:transparent;padding:0}
      .adm104-config .ck-config-head{margin-bottom:10px}
      .adm104-config .ck-config-note{color:#334155}
      .adm104-back{margin-top:16px}.tc-config-admin{display:flex;align-items:center;justify-content:space-between;gap:16px}.tc-config-admin p{margin:4px 0 0;color:#334155;font-size:12px}.tc-config-actions{display:flex;gap:10px;align-items:center}.tc-config-actions select{padding:10px 12px;border-radius:10px;border:1px solid #94a3b8;background:#fff;color:#0f172a;font-weight:700}@media(max-width:700px){.tc-config-admin{align-items:stretch;flex-direction:column}.tc-config-actions{width:100%}.tc-config-actions select{flex:1}}
      @media(max-width:700px){.adm104-grid{grid-template-columns:1fr}.adm104-card{min-height:88px;padding:14px}.adm104-title{font-size:22px}.adm104-config{grid-column:auto}}
    </style>`;
  }

  window.mostrarAdministracion = async function(){
    const perfil = ckNorm(localStorage.getItem('perfil'));
    if(!['JEFATURA','ADMIN','ADMINISTRADOR'].includes(perfil)){
      alert('No tienes permiso para ingresar a Administración');
      return;
    }

    let cfg={estado:'HABILITADO',activo:true,fechaInicio:'',fechaFin:''};
    let cfgPext={estado:'DESHABILITADO',activo:false};
    try{ cfg=await ckObtenerConfiguracion(); }catch(e){ console.warn(e); }
    try{ if(typeof tcObtenerConfiguracionPext==='function') cfgPext=await tcObtenerConfiguracionPext(); }catch(e){ console.warn(e); }

    const cards=[
      ['📥','ACTUALIZAR PRODUCCIÓN','Importar producción desde la hoja IMPORTAR_PRODUCCION','mostrarImportarProduccion()'],
      ['📊','ACTUALIZAR EFECTIVIDAD','Importar efectividad desde base pegada','mostrarImportarEfectividad()'],
      ['🔁','ACTUALIZAR % RECABLEADO','Importar recableado desde base pegada','mostrarImportarRecableado()'],
      ['🛡️','ACTUALIZAR VTR/GAR','Importar VTR/GAR desde base pegada','mostrarImportarVtrGar()'],
      ['👥','ACTUALIZAR USUARIOS','Importar, editar, suspender y cambiar permisos','mostrarImportarUsuarios()'],
      ['🏆','ACTUALIZAR RANKING','Generar ranking operativo consolidado','mostrarImportarRanking()']
    ];

    const html=admStyle()+`<div class="adm104-wrap">
      <h2 class="adm104-title">⚙️ ADMINISTRACIÓN</h2>
      <div class="adm104-grid">
        ${cards.map(c=>`<div class="adm104-card" onclick="${c[3]}"><div class="adm104-icon">${c[0]}</div><div><h3>${c[1]}</h3><p>${c[2]}</p></div></div>`).join('')}
        <div class="adm104-config">${ckConfigPanel(cfg)}</div>
        <div class="adm104-config">${typeof tcConfigPanelPext==='function'?tcConfigPanelPext(cfgPext):''}</div>
      </div>
      <div class="adm104-back"><button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>
    </div>`;
    mostrarPantalla(html);
    if(typeof setBotonNavegacion==='function')setBotonNavegacion('subpantalla');
  };

  if(oldConfigurarMenu){
    configurarMenu = function(){
      const r=oldConfigurarMenu.apply(this,arguments);
      setTimeout(()=>{ if(typeof ckAplicarVisibilidadChecklist==='function') ckAplicarVisibilidadChecklist(); },80);
      return r;
    };
  }
})();
