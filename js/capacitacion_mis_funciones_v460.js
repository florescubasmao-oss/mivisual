/* MI VISUAL V460 - CAPACITACION / MINICURSO 01: MIS FUNCIONES
   Frontend aislado. No modifica backend, Sheets, Drive, permisos ni recursos existentes. */
(function(){
  'use strict';
  if(window.MV460_CAP_MIS_FUNCIONES) return;
  window.MV460_CAP_MIS_FUNCIONES=true;

  const V='V460-MIS-FUNCIONES-20260823';
  const PANTALLAS=[
    {k:'inicio',paso:'Inicio',titulo:'Conoce tus funciones en campo',texto:'Cada integrante de la cuadrilla tiene responsabilidades definidas. En este minicurso revisarás qué debes hacer desde que recibes la orden hasta que la gestión queda correctamente cerrada.',items:[
      ['🎯','Reconocer','Tus responsabilidades principales como técnico.'],['👥','Diferenciar','Cómo se complementan T1 y T2.'],['🧭','Controlar','Qué debes revisar antes, durante y al finalizar.'],['📄','Cerrar correctamente','Servicio, acta, escaneo, entrega a Almacén y reporte final.']
    ]},
    {paso:'Parte 1 de 8 · Tu cuadrilla',titulo:'T1 y T2: un solo equipo, funciones definidas',texto:'Toca las dos tarjetas para conocer la función básica de cada integrante.',items:[
      ['👷','T1 · Técnico Instalador','Realiza las instalaciones, averías y servicios asignados y dirige el equipo asignado.'],
      ['🧰','T2 · Auxiliar Técnico','Coparticipa en las instalaciones, averías y servicios y brinda apoyo al Técnico Principal.']
    ]},
    {paso:'Parte 2 de 8 · Tu jornada',titulo:'Tres momentos que debes controlar',texto:'Revisa los tres momentos de una atención.',items:[
      ['1️⃣','ANTES','Cumple la ruta y órdenes asignadas; verifica materiales, herramientas, EPP y aplicativos necesarios.'],
      ['2️⃣','DURANTE','Ejecuta correctamente, coordina con tu compañero, comunica novedades y cuida los recursos asignados.'],
      ['3️⃣','AL FINALIZAR','Valida servicio, acabado, estética y limpieza; completa el acta, obtiene conformidad, realiza el escaneo correcto, entrega el acta a Almacén y reporta la culminación.']
    ]},
    {paso:'Parte 3 de 8 · Responsabilidades',titulo:'Lo que está bajo tu responsabilidad',texto:'Abre las seis tarjetas para revisar tus funciones principales.',items:[
      ['👥','DIRIGIR','El T1 dirige el equipo asignado y brinda soporte técnico-funcional al auxiliar.'],
      ['🛠️','EJECUTAR','Realiza las instalaciones, averías y servicios asignados cumpliendo la ruta indicada.'],
      ['✅','VALIDAR','Comprueba el estado final: funcionamiento, buen acabado, estética y aseo.'],
      ['📝','DOCUMENTAR','Llena el acta de conformidad de manera clara, legible y sin borrones ni enmendaduras, y obtiene la firma del cliente.'],
      ['📱','COMUNICAR','Reporta inicio, culminación, impedimentos y novedades durante la jornada.'],
      ['🧰','CUIDAR','Cuida EPP, herramientas, escalera, materiales y productos asignados, y reporta cualquier novedad.']
    ]},
    {paso:'Parte 4 de 8 · Trabajo en equipo',titulo:'T1 y T2 trabajan juntos, pero no hacen exactamente lo mismo',texto:'Toca cada rol para ver cómo se complementan.',items:[
      ['👷','T1 · DIRIGE Y VALIDA','Dirige el equipo, cumple rutas y órdenes, valida el resultado final, completa el acta, obtiene conformidad y reporta novedades o impedimentos.'],
      ['🧰','T2 · COPARTICIPA Y APOYA','Brinda máximo apoyo al T1, participa en la ejecución, busca un buen acabado, reporta al T1 el estado final del cliente y usa correctamente sus EPP.']
    ],clave:'Trabajar en equipo no elimina la responsabilidad individual. Cada integrante debe cumplir correctamente la función que le corresponde.'},
    {paso:'Parte 5 de 8 · Cierre de la orden',titulo:'¿Cuándo termina realmente tu orden?',texto:'La gestión no termina solamente porque el cliente ya tenga servicio. Toca cada etapa del cierre.',modo:'cadena',items:[
      ['1','Servicio operativo','Confirma que el servicio y la configuración final funcionen correctamente.'],
      ['2','Buen acabado y estética','Revisa que la ejecución quede ordenada y con el acabado esperado.'],
      ['3','Área limpia','Retira residuos y deja el lugar de trabajo correctamente aseado.'],
      ['4','Acta correctamente llenada y firmada','Debe quedar clara, legible, sin borrones ni enmendaduras y con la conformidad del cliente.'],
      ['5','Escaneo correcto del acta','El documento debe quedar completo y legible para su correcta gestión.'],
      ['6','Entrega física a Almacén','El acta física debe entregarse correctamente al área de Almacén.'],
      ['7','Culminación reportada','Registra o comunica el cierre de la actividad según el flujo de gestión.']
    ],clave:'Una orden termina cuando el trabajo queda correctamente ejecutado, sustentado y entregado.'},
    {paso:'Parte 6 de 8 · Recursos asignados',titulo:'Cuida lo que utilizas para trabajar',texto:'Toca cada elemento para conocer qué debes controlar.',items:[
      ['🪜','Escalera','Mantén la escalera telescópica asegurada con cadena y candado.'],
      ['🔧','Herramientas','Reporta deterioro, faltantes, fisuras, equipos malogrados, inoperativos o con desgaste.'],
      ['📦','Materiales','Informa oportunamente los materiales necesarios y cualquier novedad al área correspondiente.'],
      ['📱','Aplicativos','Administra correctamente los usuarios y contraseñas asignados para los aplicativos de trabajo.'],
      ['🦺','EPP','Úsalos adecuada y correctamente en cada trabajo asignado.']
    ]},
    {paso:'Parte 7 de 8 · Comunicación',titulo:'Mantén trazabilidad durante toda la jornada',texto:'Toca los cuatro momentos para revisar qué debes comunicar.',modo:'cadena',items:[
      ['1','Inicio','Registra o reporta el inicio de tu actividad laboral según corresponda.'],
      ['2','Durante el trabajo','Mantén comunicación con supervisor o personal de la empresa durante la jornada.'],
      ['3','Si aparece un impedimento','Repórtalo oportunamente al supervisor y deja constancia del motivo.'],
      ['4','Culminación','Registra o reporta la culminación de la actividad.']
    ]},
    {paso:'Parte 8 de 8 · Lo esencial',titulo:'Cinco ideas que debes llevarte al campo',texto:'Abre las cinco tarjetas para hacer tu repaso final.',items:[
      ['🗺️','1. CUMPLE','Cumple las rutas, órdenes y trabajos asignados.'],
      ['🛠️','2. EJECUTA','Trabaja con calidad, buen acabado, seguridad y orden.'],
      ['🧰','3. CUIDA','Cuida EPP, herramientas, escalera, materiales, productos y accesos asignados.'],
      ['📱','4. COMUNICA','Reporta inicio, novedades, impedimentos y culminación.'],
      ['📄','5. CIERRA CORRECTAMENTE','Valida el servicio, acabado y limpieza; completa y firma el acta, escanéala correctamente, entrégala a Almacén y reporta la culminación.']
    ]},
    {k:'fin',paso:'Curso completado',titulo:'Has terminado “Mis Funciones”',texto:'Ya revisaste las responsabilidades del técnico, el trabajo en cuadrilla y el cierre correcto de una orden.'}
  ];
  let paso=0,vistos=new Set();

  function norm(x){return (x||'').toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
  function esTecnico(){return norm(localStorage.getItem('perfil'))==='TECNICO';}
  function css(){
    if(document.getElementById('mv460mfcss')) return;
    const s=document.createElement('style');s.id='mv460mfcss';s.textContent=`
    .mv460-card{margin:14px 0 18px;border:1px solid #bfdbfe;border-radius:18px;background:linear-gradient(135deg,#eff6ff,#fff 65%,#ecfeff);box-shadow:0 9px 24px #0f172a14;overflow:hidden}.mv460-card>div{padding:16px}.mv460-badge{display:inline-block;padding:5px 9px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:900}.mv460-card h3{margin:8px 0 5px;font-size:19px;color:#0f172a}.mv460-card p{margin:0;color:#475569;font-size:13px;line-height:1.45}.mv460-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.mv460-meta span{padding:4px 7px;border:1px solid #dbe2ea;border-radius:999px;background:#fff;font-size:10px;font-weight:800}.mv460-open,.mv460-btn{border:0;border-radius:12px;background:#0b6ffb;color:#fff;font-weight:900;cursor:pointer}.mv460-open{width:100%;padding:12px;margin-top:12px}
    .mv460{max-width:820px;margin:auto;padding:8px 10px 28px;color:#0f172a}.mv460 *{box-sizing:border-box}.mv460-top{position:sticky;top:0;z-index:4;padding:11px 12px;margin-bottom:10px;border:1px solid #e2e8f0;border-radius:15px;background:#f8fafcf5;box-shadow:0 5px 16px #0f172a12}.mv460-head{display:flex;justify-content:space-between;gap:8px}.mv460-k{font-size:10px;font-weight:900;color:#2563eb;text-transform:uppercase;letter-spacing:.06em}.mv460-top h1{margin:2px 0;font-size:19px}.mv460-perfil{height:max-content;padding:5px 8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:10px;font-weight:900}.mv460-prog{display:flex;align-items:center;gap:8px;margin-top:8px}.mv460-bar{height:7px;flex:1;border-radius:99px;background:#e2e8f0;overflow:hidden}.mv460-bar i{display:block;height:100%;background:linear-gradient(90deg,#0b6ffb,#06b6d4);transition:.2s}.mv460-prog b{font-size:10px;color:#64748b}.mv460-note{margin-top:6px;font-size:10px;color:#64748b}
    .mv460-screen{padding:16px;border:1px solid #e2e8f0;border-radius:18px;background:#fff;box-shadow:0 9px 24px #0f172a12}.mv460-step{font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.05em}.mv460-screen h2{margin:5px 0 7px;font-size:21px;line-height:1.15}.mv460-screen>p{margin:0 0 12px;color:#475569;font-size:13px;line-height:1.5}.mv460-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.mv460-item{width:100%;min-height:86px;padding:11px;text-align:left;border:1px solid #dbe2ea;border-radius:13px;background:#fff;color:#0f172a;cursor:pointer}.mv460-item.open{background:#eff6ff;border-color:#60a5fa}.mv460-item .ico{display:block;font-size:22px;margin-bottom:4px}.mv460-item b{display:block;font-size:12.5px}.mv460-item small{display:block;margin-top:3px;color:#64748b;font-size:10.5px}.mv460-item .d{display:none;margin-top:7px;padding-top:7px;border-top:1px dashed #bfdbfe;color:#334155;font-size:11.5px;line-height:1.4}.mv460-item.open .d{display:block}.mv460-chain{display:grid;gap:7px}.mv460-chain .mv460-item{min-height:0;display:flex;gap:9px;align-items:flex-start}.mv460-chain .ico{display:flex;min-width:26px;height:26px;align-items:center;justify-content:center;border-radius:50%;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:900}.mv460-chain .mv460-item.open{background:#ecfdf5;border-color:#6ee7b7}.mv460-chain .mv460-item.open .ico{background:#059669;color:#fff}.mv460-key{margin-top:11px;padding:10px 11px;border-left:4px solid #0b6ffb;border-radius:9px;background:#eff6ff;color:#1e3a8a;font-size:12px;font-weight:800;line-height:1.4}.mv460-count{text-align:center;margin-top:8px;color:#2563eb;font-size:10.5px;font-weight:900}.mv460-nav{display:flex;gap:8px;margin-top:15px}.mv460-btn{padding:11px 13px;flex:1}.mv460-btn.sec{background:#e2e8f0;color:#334155;flex:0 0 auto}.mv460-btn:disabled{opacity:.4;cursor:not-allowed}.mv460-home{width:100%;margin-top:9px;border:1px solid #cbd5e1;background:#fff;color:#475569}.mv460-finish{text-align:center}.mv460-check{width:64px;height:64px;margin:3px auto 10px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#dcfce7;color:#047857;font-size:32px;font-weight:900}.mv460-eval{margin:13px 0;padding:11px;border:1px dashed #94a3b8;border-radius:12px;background:#f8fafc;color:#475569;font-size:11.5px;line-height:1.45}.mv460-source{margin-top:12px;color:#94a3b8;font-size:9px;text-align:center}
    @media(max-width:640px){.mv460{padding:7px}.mv460-screen{padding:14px}.mv460-grid{grid-template-columns:1fr}.mv460-screen h2{font-size:19px}.mv460-top h1{font-size:17px}}
    `;document.head.appendChild(s);
  }

  function card(){const x=document.createElement('section');x.id='mv460MisFuncionesCard';x.className='mv460-card';x.setAttribute('data-resource-group','');x.innerHTML=`<div data-resource-item data-search="MIS FUNCIONES MINICURSO TECNICO T1 T2 CURSO INTERACTIVO"><span class="mv460-badge">🎓 MINICURSO 01 · TÉCNICO</span><h3>Mis Funciones</h3><p>Conoce qué debes realizar, validar, comunicar y cerrar correctamente durante una orden de trabajo.</p><div class="mv460-meta"><span>⏱ 6–8 min</span><span>👆 Interactivo</span><span>📘 Sin nota</span></div><button class="mv460-open" type="button" onclick="mv460AbrirMisFunciones()">COMENZAR CURSO</button></div>`;return x;}
  function inyectar(){if(!esTecnico())return true;if(document.getElementById('mv460MisFuncionesCard'))return true;const p=document.querySelector('#pantalla .mv55-resource-page');if(!p)return false;const h=p.querySelector('.mv55-resource-head');if(!h||!norm(h.querySelector('h2')?.textContent).includes('CAPACITACION'))return false;css();h.insertAdjacentElement('afterend',card());return true;}
  function preparar(){if(!esTecnico())return;let n=0;const t=setInterval(()=>{n++;if(inyectar()||n>80)clearInterval(t);},100);}
  const previo=window.mv339Antes_mostrarCapacitacion;window.mv339Antes_mostrarCapacitacion=function(){try{if(typeof previo==='function')previo();}catch(_){ }preparar();};setTimeout(inyectar,0);

  function itemHtml(it,idx){return `<button type="button" class="mv460-item" data-i="${idx}"><span class="ico">${it[0]}</span><span><b>${it[1]}</b><small>Toca para revisar</small><span class="d">${it[2]}</span></span></button>`;}
  function progreso(){return Math.round((paso/(PANTALLAS.length-1))*100);}
  function render(){
    const p=PANTALLAS[paso],fin=p.k==='fin',inicio=p.k==='inicio',req=!inicio&&!fin?p.items.length:0,abiertos=[...vistos].filter(x=>x.startsWith(paso+'|')).length;
    let cuerpo='';
    if(fin)cuerpo=`<div class="mv460-finish"><div class="mv460-check">✓</div><h2>${p.titulo}</h2><p>${p.texto}</p><div class="mv460-eval"><b>📝 Siguiente etapa: Evaluación</b><br>La evaluación será independiente del curso y tendrá su propia calificación. Se incorporará después de validar esta primera prueba.</div></div>`;
    else cuerpo=`<div class="${p.modo==='cadena'?'mv460-chain':'mv460-grid'}">${p.items.map(itemHtml).join('')}</div>${p.clave?`<div class="mv460-key">${p.clave}</div>`:''}${req?`<div class="mv460-count">${abiertos} de ${req} revisados</div>`:''}`;
    const nav=fin?`<button class="mv460-btn" type="button" onclick="mostrarCapacitacion()">Volver a Capacitación</button>`:`<div class="mv460-nav">${paso>0?'<button class="mv460-btn sec" type="button" data-back>← Atrás</button>':''}<button class="mv460-btn" type="button" data-next ${req&&abiertos<req?'disabled':''}>${inicio?'COMENZAR':'Continuar →'}</button></div>${inicio?'<button class="mv460-btn mv460-home" type="button" onclick="mostrarCapacitacion()">← Volver a Capacitación</button>':''}`;
    const root=document.getElementById('pantalla');if(!root)return;root.innerHTML=`<div id="mv460curso" class="mv460" data-v="${V}"><div class="mv460-top"><div class="mv460-head"><div><div class="mv460-k">Minicurso 01 · Aprendizaje interactivo</div><h1>Mis Funciones</h1></div><span class="mv460-perfil">Perfil Técnico</span></div><div class="mv460-prog"><div class="mv460-bar"><i style="width:${progreso()}%"></i></div><b>${progreso()}%</b></div><div class="mv460-note">Este curso es para aprender. <b>No genera nota.</b> La evaluación se realiza después.</div></div><section class="mv460-screen"><div class="mv460-step">${p.paso}</div>${!fin?`<h2>${p.titulo}</h2><p>${p.texto}</p>`:''}${cuerpo}${nav}${fin?'<div class="mv460-source">Contenido base: Anexo 1 Funciones del Puesto · Técnico Instalador / Auxiliar Técnico. Cierre de actas según flujo operativo definido para MI VISUAL.</div>':''}</section></div>`;
    root.querySelectorAll('.mv460-item').forEach(b=>{const key=paso+'|'+b.dataset.i;if(vistos.has(key))b.classList.add('open');b.onclick=()=>{vistos.add(key);render();};});
    const n=root.querySelector('[data-next]');if(n)n.onclick=()=>{paso=Math.min(PANTALLAS.length-1,paso+1);render();window.scrollTo({top:0,behavior:'smooth'});};const a=root.querySelector('[data-back]');if(a)a.onclick=()=>{paso=Math.max(0,paso-1);render();window.scrollTo({top:0,behavior:'smooth'});};
  }
  window.mv460AbrirMisFunciones=function(){if(!esTecnico()){alert('Este minicurso corresponde al perfil Técnico.');return;}css();paso=0;vistos=new Set();render();};
})();
