// MI VISUAL - Administración visual + permisos por perfil
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
      .adm104-back{margin-top:16px}.pm-admin h3{margin:0 0 4px}.pm-admin p{color:#475569}.pm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.pm-grid label,.pm-obs{font-size:12px;font-weight:800;display:flex;flex-direction:column;gap:5px}.pm-grid input,.pm-grid select,.pm-obs textarea{padding:9px;border:1px solid #94a3b8;border-radius:9px;background:#fff;color:#111827}.pm-checks{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.pm-checks label{background:#e2e8f0;padding:7px 9px;border-radius:9px;font-size:11px;font-weight:800}.pm-actions{display:flex;gap:8px;margin-top:10px}@media(max-width:700px){.pm-grid{grid-template-columns:1fr}}      @media(max-width:700px){.adm104-grid{grid-template-columns:1fr}.adm104-card{min-height:88px;padding:14px}.adm104-title{font-size:22px}.adm104-config{grid-column:auto}}
    </style>`;
  }

  window.mostrarAdministracion = async function(){
    const perfil = ckNorm(localStorage.getItem('perfil'));
    if(!['JEFATURA','ADMIN','ADMINISTRADOR'].includes(perfil)){
      alert('No tienes permiso para ingresar a Administración');
      return;
    }


    const cards=[
      ['📤','ACTUALIZAR BASE OPERATIVA','Cargar la base madre y reemplazar Producción, Efectividad, Recableados y VTR/GAR','mostrarActualizarBaseOperativa()'],
      ['📡','CALIFICAR VTR/GAR','Confirmar, reasignar, anular y consultar el historial por sede','mostrarAsignacionesVtrGar()'],
      ['📚','CATÁLOGO DE PARTIDAS','Consultar códigos, plataformas, puntajes y grupos utilizados en Producción','mostrarCatalogoPartidasOperativas()'],
      ['👥','ACTUALIZAR USUARIOS','Importar, editar, suspender y cambiar permisos','mostrarImportarUsuarios()'],
      ['🏆','ACTUALIZAR RANKING','Regenerar el ranking con las hojas actuales como respaldo manual','mostrarImportarRanking()']
    ];

    const html=admStyle()+`<div class="adm104-wrap">
      <h2 class="adm104-title">⚙️ ADMINISTRACIÓN</h2>
      <div class="adm104-grid">
        ${cards.map(c=>`<div class="adm104-card" onclick="${c[3]}"><div class="adm104-icon">${c[0]}</div><div><h3>${c[1]}</h3><p>${c[2]}</p></div></div>`).join('')}
        ${typeof pmPanelAdmin==='function'?pmPanelAdmin():''}
      </div>
      <div class="adm104-back"><button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>
    </div>`;
    mostrarPantalla(html);
    if(typeof setBotonNavegacion==='function')setBotonNavegacion('subpantalla');
    if(typeof pmInitAdmin==='function')setTimeout(pmInitAdmin,50);
  };

  if(oldConfigurarMenu){
    configurarMenu = function(){
      const r=oldConfigurarMenu.apply(this,arguments);

      return r;
    };
  }
})();
