/* MI VISUAL V465 - CAPACITACION / MINICURSO 01: MIS FUNCIONES
   Implementación estable en un solo archivo.
   No modifica backend, Sheets, Drive, permisos ni recursos existentes. */
(function(){
  'use strict';
  if(window.MV465_CAP_MIS_FUNCIONES) return;
  window.MV465_CAP_MIS_FUNCIONES = true;

  const V = 'V465-MIS-FUNCIONES-ESTABLE-20260823';
  let paso = 0;

  function norm(x){
    return (x || '').toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  }
  function esTecnico(){ return norm(localStorage.getItem('perfil')) === 'TECNICO'; }

  const I = (icon,titulo,resumen,significado,accion,critico='') => ({icon,titulo,resumen,significado,accion,critico});

  const PANTALLAS = [
    {
      paso:'Inicio', titulo:'Conoce tus funciones en campo',
      texto:'Este minicurso resume qué se espera de ti como técnico desde que recibes una orden hasta que la gestión queda correctamente cerrada. Puedes abrir las tarjetas para ampliar la información y avanzar cuando quieras.',
      items:[
        I('🎯','Reconocer','Tus responsabilidades principales como técnico.','Conocer con claridad qué responsabilidades te corresponden dentro de la cuadrilla.','Ten presente qué debes ejecutar, controlar, comunicar y cerrar durante tu jornada.','No asumir que otra persona completará una responsabilidad que te corresponde.'),
        I('👥','Diferenciar','Cómo se complementan T1 y T2.','T1 y T2 trabajan como equipo, pero cada uno mantiene funciones definidas.','El T1 dirige y valida; el T2 coparticipa, apoya la ejecución y mantiene informado al T1.','Trabajar juntos no elimina la responsabilidad individual.'),
        I('🧭','Controlar','Qué debes revisar antes, durante y al finalizar.','La responsabilidad del técnico abarca toda la gestión, no solo la ejecución física.','Revisa preparación, ejecución, comunicación, cierre operativo y cierre documental.','Una orden puede quedar incompleta aunque técnicamente el servicio funcione.'),
        I('📄','Cerrar correctamente','Servicio, acta, escaneo, entrega a Almacén y reporte final.','El cierre incluye la parte operativa y documental.','Valida el servicio, completa el acta, realiza un escaneo legible, entrega el acta física a Almacén y reporta la culminación.','El trabajo no termina solo porque el cliente ya tenga servicio.')
      ]
    },
    {
      paso:'Parte 1 de 8 · Tu cuadrilla', titulo:'T1 y T2: un solo equipo, funciones definidas',
      texto:'Conoce la función básica de cada integrante y cómo se complementan durante una atención.',
      items:[
        I('👷','T1 · Técnico Instalador','Realiza los trabajos asignados y dirige el equipo.','Es el técnico principal de la cuadrilla y mantiene responsabilidad sobre la correcta ejecución de instalaciones, averías y demás servicios asignados.','Dirige al auxiliar, cumple la ruta, ejecuta o supervisa la ejecución, valida el resultado final, gestiona el acta y comunica impedimentos o novedades.','Debe mantenerse atento a la calidad del trabajo de toda la cuadrilla, no solo a su propia tarea.'),
        I('🧰','T2 · Auxiliar Técnico','Coparticipa y brinda apoyo al Técnico Principal.','Es parte activa de la cuadrilla y participa en instalaciones, averías y servicios.','Apoya al T1, colabora para lograr un buen acabado, utiliza correctamente sus EPP y reporta al T1 el estado final o cualquier novedad detectada.','El T2 no es un observador: participa activamente en la ejecución.')
      ],
      clave:'T1 y T2 forman una sola cuadrilla, pero cada integrante debe cumplir correctamente la función que le corresponde.'
    },
    {
      paso:'Parte 2 de 8 · Tu jornada', titulo:'Tres momentos que debes controlar',
      texto:'Una atención correcta se controla antes de empezar, durante la ejecución y al finalizar.',
      items:[
        I('1️⃣','ANTES','Prepárate antes de iniciar la atención.','Es la preparación necesaria para comenzar correctamente una orden.','Verifica la ruta y las órdenes asignadas, que cuentes con EPP, herramientas, materiales y accesos o aplicativos necesarios. Si existe un quiebre, comunícalo oportunamente.','Detectar un faltante antes de llegar al cliente evita retrasos y gestiones incompletas.'),
        I('2️⃣','DURANTE','Ejecuta, coordina y comunica.','Es el periodo en el que realizas la atención y controlas que se ejecute correctamente.','Trabaja coordinadamente con tu compañero, cuida los recursos, mantén comunicación y reporta cualquier situación que pueda afectar la atención.','No esperes hasta el final de la jornada para informar un impedimento.'),
        I('3️⃣','AL FINALIZAR','Valida y cierra toda la gestión.','El trabajo debe quedar completamente validado antes de considerarse terminado.','Confirma operatividad, configuración cuando corresponda, acabado, estética y limpieza. Completa el acta, obtiene conformidad, escanéala correctamente, entrégala a Almacén y reporta la culminación.','Cerrar en sistema sin completar el cierre documental deja la gestión incompleta.')
      ]
    },
    {
      paso:'Parte 3 de 8 · Responsabilidades', titulo:'Lo que está bajo tu responsabilidad',
      texto:'Estas son funciones que debes tener presentes durante toda tu jornada.',
      items:[
        I('👥','DIRIGIR','El T1 conduce técnicamente la cuadrilla.','El T1 coordina las actividades del equipo y brinda soporte técnico-funcional al auxiliar.','Distribuye acciones, corrige procedimientos cuando corresponda y verifica que el trabajo de la cuadrilla quede correctamente terminado.','Dirigir no es solo dar indicaciones: también implica revisar y validar.'),
        I('🛠️','EJECUTAR','Realiza correctamente los trabajos asignados.','Significa atender instalaciones, averías y otros servicios de acuerdo con la ruta y orden recibida.','Aplica el procedimiento correspondiente hasta dejar el servicio en condiciones correctas para el cliente.','No priorices terminar rápido por encima de la calidad y la seguridad.'),
        I('✅','VALIDAR','Comprueba cómo quedó realmente la atención.','No basta con ejecutar el trabajo; debes revisar el resultado final.','Verifica funcionamiento, configuración cuando corresponda, acabado, estética, orden y limpieza antes de retirarte.','Un servicio operativo con mal acabado todavía no está correctamente terminado.'),
        I('📝','DOCUMENTAR','Sustenta correctamente el trabajo realizado.','El acta y la documentación dejan evidencia formal de la atención.','Llena el acta de forma clara, legible, sin borrones ni enmendaduras, registra la información necesaria y obtiene la firma o conformidad del cliente. Después realiza el escaneo correcto.','Una mala documentación puede generar observaciones aunque el trabajo técnico haya sido correcto.'),
        I('📱','COMUNICAR','Mantén trazabilidad durante toda la jornada.','La empresa debe conocer el estado real de tu gestión.','Reporta inicio, culminación, impedimentos, falta de material, problemas de herramientas u otras novedades al supervisor o área correspondiente.','La comunicación debe ser oportuna, no cuando el problema ya generó un quiebre mayor.'),
        I('🧰','CUIDAR','Protege los recursos que te fueron asignados.','EPP, herramientas, escalera, materiales, productos y accesos son parte de tu responsabilidad operativa.','Úsalos correctamente y reporta deterioros, faltantes, fisuras, equipos inoperativos, pérdidas o cualquier condición que requiera atención.','No continúes normalizando una herramienta o equipo que presenta una condición insegura o inoperativa.')
      ]
    },
    {
      paso:'Parte 4 de 8 · Trabajo en equipo', titulo:'T1 y T2 trabajan juntos, pero no hacen exactamente lo mismo',
      texto:'La coordinación de la cuadrilla es fundamental para lograr una atención segura y con buen acabado.',
      items:[
        I('👷','T1 · DIRIGE Y VALIDA','Mantiene la responsabilidad principal de la gestión.','El T1 controla que la atención completa cumpla lo esperado.','Coordina, brinda soporte al T2, controla la calidad y valida servicio, acabado, documentación y cierre antes de culminar.','Si detecta una mala práctica del auxiliar debe corregirla, no ignorarla.'),
        I('🧰','T2 · COPARTICIPA Y APOYA','Participa activamente junto con el T1.','El T2 contribuye directamente en la ejecución y el resultado final.','Apoya las labores asignadas, contribuye al buen acabado, usa correctamente sus EPP y comunica al T1 cualquier problema o novedad.','Debe reportar el estado final al T1 y mantener coordinación durante la atención.')
      ],
      clave:'Trabajar en equipo no elimina la responsabilidad individual. El resultado final pertenece a la cuadrilla.'
    },
    {
      paso:'Parte 5 de 8 · Cierre de la orden', titulo:'¿Cuándo termina realmente tu orden?',
      texto:'La gestión no termina solamente porque el cliente ya tenga servicio. Revisa cada etapa del cierre.', modo:'cadena',
      items:[
        I('1','Servicio operativo','Confirma que el servicio funciona correctamente.','El cliente debe quedar con el servicio operativo de acuerdo con el trabajo realizado.','Valida operatividad y las configuraciones que correspondan antes de retirarte.','Si detectas un problema al final, corrígelo antes de cerrar.'),
        I('2','Buen acabado y estética','La calidad también se ve.','La presentación final forma parte de la calidad de la atención.','Revisa orden del tendido, ubicación de elementos, terminaciones y presentación final.','Operativo no significa necesariamente bien terminado.'),
        I('3','Área limpia','Entrega el lugar limpio y ordenado.','El espacio donde trabajaste debe quedar correctamente aseado.','Retira residuos, sobrantes de cable, empaques y otros elementos generados durante la atención.','La limpieza forma parte de la entrega al cliente.'),
        I('4','Acta correctamente llenada y firmada','Sustenta formalmente la atención.','El acta registra el trabajo realizado y la conformidad del cliente.','Completa los campos correspondientes de forma legible, evita borrones o enmendaduras y obtiene la firma o conformidad requerida.','No dejes campos esenciales incompletos.'),
        I('5','Escaneo correcto del acta','El documento debe poder revisarse sin dificultad.','El escaneo es parte del sustento digital de la atención.','Verifica que el acta esté completa, derecha, enfocada, legible y sin partes cortadas.','Un escaneo incompleto o borroso puede generar observaciones posteriores.'),
        I('6','Entrega física a Almacén','El cierre documental continúa después del escaneo.','El acta física debe ingresar al control y resguardo documental correspondiente.','Entrega correctamente el acta al área de Almacén según el flujo establecido.','No consideres cerrada la gestión si el documento físico queda pendiente.'),
        I('7','Culminación reportada','Deja trazabilidad del cierre.','La culminación debe quedar registrada o comunicada según el flujo operativo.','Una vez terminado el servicio y la documentación, reporta la culminación de la actividad.','El cierre debe quedar visible para las áreas que continúan el proceso.')
      ],
      clave:'Una orden termina cuando el trabajo queda correctamente ejecutado, sustentado, escaneado, entregado y reportado.'
    },
    {
      paso:'Parte 6 de 8 · Recursos asignados', titulo:'Cuida lo que utilizas para trabajar',
      texto:'Los recursos de la cuadrilla deben mantenerse disponibles, seguros y en condiciones adecuadas.',
      items:[
        I('🪜','Escalera','Debe conservarse y mantenerse segura.','La escalera es una herramienta crítica de trabajo y está bajo responsabilidad de la cuadrilla.','Mantén la escalera telescópica asegurada con cadena y candado cuando corresponda y reporta cualquier condición que comprometa su uso.','Una escalera dañada o insegura no debe normalizarse.'),
        I('🔧','Herramientas','Deben estar disponibles y operativas.','Las herramientas permiten ejecutar correctamente las órdenes asignadas.','Reporta faltantes, deterioro, fisuras, desgaste, equipos malogrados o inoperativos de manera oportuna.','No esperes a que el problema ya impida una atención.'),
        I('📦','Materiales','Debes prever y comunicar necesidades.','La disponibilidad de materiales evita quiebres durante la atención.','Controla lo utilizado y reporta necesidades, faltantes o novedades al área correspondiente.','Llegar a una orden sin material necesario afecta productividad y experiencia del cliente.'),
        I('📱','Aplicativos','Son parte de tu herramienta de trabajo.','Los sistemas permiten registrar, validar y cerrar correctamente las gestiones.','Administra responsablemente los usuarios y contraseñas asignados y verifica que puedas utilizar los aplicativos necesarios.','No compartas credenciales asignadas de manera informal.'),
        I('🦺','EPP','Son obligatorios para realizar las actividades de forma segura.','Los equipos de protección personal reducen la exposición a riesgos durante el trabajo.','Utiliza correctamente los EPP requeridos en cada actividad y mantenlos en condiciones adecuadas.','La seguridad no depende de que el trabajo sea corto o aparentemente sencillo.')
      ]
    },
    {
      paso:'Parte 7 de 8 · Comunicación', titulo:'Mantén trazabilidad durante toda la jornada',
      texto:'La comunicación permite que supervisor y áreas de soporte conozcan el estado real de tu gestión.', modo:'cadena',
      items:[
        I('1','Inicio','Deja constancia de que la actividad comenzó.','El registro o reporte de inicio marca el comienzo formal de la jornada o atención.','Realiza el inicio según el flujo establecido antes de desarrollar la actividad correspondiente.','No inicies una gestión dejando pendiente el registro que corresponde.'),
        I('2','Durante el trabajo','Mantente disponible para coordinaciones.','La gestión puede requerir validaciones, soporte o comunicación con supervisor y otras áreas.','Mantén comunicación durante la jornada y responde las coordinaciones relacionadas con la atención.','La falta de comunicación puede retrasar decisiones o validaciones.'),
        I('3','Si aparece un impedimento','Repórtalo oportunamente.','Todo problema que impida o altere la atención debe quedar informado y sustentado.','Comunica qué ocurrió, cuál es el motivo y qué necesitas para continuar o cerrar correctamente.','No esperes hasta el final del día para informar un quiebre que ocurrió horas antes.'),
        I('4','Culminación','Comunica que la gestión quedó cerrada.','El cierre debe quedar visible para que continúe el proceso operativo o documental.','Registra o reporta la culminación una vez que servicio y documentación estén completos.','No reportes culminación si todavía quedan pendientes del cierre.')
      ]
    },
    {
      paso:'Parte 8 de 8 · Lo esencial', titulo:'Cinco ideas que debes llevarte al campo',
      texto:'Este es el resumen práctico que debes recordar durante tu jornada.',
      items:[
        I('🗺️','1. CUMPLE','Cumple rutas, órdenes y responsabilidades.','Atiende la programación y funciones que te fueron asignadas.','Organiza tu jornada de acuerdo con la ruta recibida y comunica cualquier situación que impida cumplirla.','Cumplir no significa improvisar para terminar: significa gestionar correctamente.'),
        I('🛠️','2. EJECUTA','Trabaja con calidad, seguridad y buen acabado.','La ejecución debe combinar funcionamiento, presentación y seguridad.','Realiza el trabajo aplicando el procedimiento correspondiente y valida el resultado final.','No sacrifiques calidad para terminar más rápido.'),
        I('🧰','3. CUIDA','Protege recursos y reporta novedades.','Los recursos asignados permiten que la cuadrilla continúe operando.','Cuida EPP, herramientas, escalera, materiales, productos y accesos; informa pérdida, daño o deterioro.','Un recurso no reportado puede convertirse en un quiebre posterior.'),
        I('📱','4. COMUNICA','Mantén informado al equipo de soporte.','La comunicación oportuna evita que los problemas crezcan.','Reporta inicio, novedades, impedimentos y culminación de forma clara y oportuna.','La ausencia de comunicación también afecta la trazabilidad.'),
        I('📄','5. CIERRA CORRECTAMENTE','Completa el cierre operativo y documental.','Tu responsabilidad continúa hasta terminar toda la gestión de la orden.','Valida servicio, acabado y limpieza; completa y firma el acta, escanéala correctamente, entrégala a Almacén y reporta la culminación.','Servicio operativo sin cierre documental no es una gestión terminada.')
      ]
    },
    {
      fin:true, paso:'Curso completado', titulo:'Has terminado “Mis Funciones”',
      texto:'Ya revisaste las responsabilidades del técnico, el trabajo en cuadrilla y el cierre correcto de una orden.'
    }
  ];

  function css(){
    if(document.getElementById('mv465mfcss')) return;
    const s=document.createElement('style');
    s.id='mv465mfcss';
    s.textContent=`
      .mv465-card{margin:14px 0 18px;border:1px solid #bfdbfe;border-radius:18px;background:linear-gradient(135deg,#eff6ff,#fff 65%,#ecfeff);box-shadow:0 9px 24px #0f172a14;overflow:hidden}.mv465-card>div{padding:16px}.mv465-badge{display:inline-block;padding:5px 9px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:900}.mv465-card h3{margin:8px 0 5px;font-size:19px;color:#0f172a}.mv465-card p{margin:0;color:#475569;font-size:13px;line-height:1.45}.mv465-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.mv465-meta span{padding:4px 7px;border:1px solid #dbe2ea;border-radius:999px;background:#fff;font-size:10px;font-weight:800}.mv465-open,.mv465-btn{border:0;border-radius:12px;background:#0b6ffb;color:#fff;font-weight:900;cursor:pointer}.mv465-open{width:100%;padding:12px;margin-top:12px}
      .mv465{max-width:820px;margin:auto;padding:8px 10px 28px;color:#0f172a}.mv465 *{box-sizing:border-box}.mv465-top{position:sticky;top:0;z-index:4;padding:11px 12px;margin-bottom:10px;border:1px solid #e2e8f0;border-radius:15px;background:#f8fafcf5;box-shadow:0 5px 16px #0f172a12}.mv465-head{display:flex;justify-content:space-between;gap:8px}.mv465-k{font-size:10px;font-weight:900;color:#2563eb;text-transform:uppercase;letter-spacing:.06em}.mv465-top h1{margin:2px 0;font-size:19px}.mv465-perfil{height:max-content;padding:5px 8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:10px;font-weight:900}.mv465-prog{display:flex;align-items:center;gap:8px;margin-top:8px}.mv465-bar{height:7px;flex:1;border-radius:99px;background:#e2e8f0;overflow:hidden}.mv465-bar i{display:block;height:100%;background:linear-gradient(90deg,#0b6ffb,#06b6d4)}.mv465-prog b{font-size:10px;color:#64748b}.mv465-note{margin-top:6px;font-size:10px;color:#64748b}
      .mv465-screen{padding:16px;border:1px solid #e2e8f0;border-radius:18px;background:#fff;box-shadow:0 9px 24px #0f172a12}.mv465-step{font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.05em}.mv465-screen h2{margin:5px 0 7px;font-size:21px;line-height:1.15}.mv465-screen>p{margin:0 0 12px;color:#475569;font-size:13px;line-height:1.5}.mv465-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.mv465-chain{display:grid;gap:7px}.mv465-item{width:100%;min-height:86px;padding:11px;text-align:left;border:1px solid #dbe2ea;border-radius:13px;background:#fff;color:#0f172a;cursor:pointer}.mv465-item.open{background:#eff6ff;border-color:#60a5fa}.mv465-item .ico{display:block;font-size:22px;margin-bottom:4px}.mv465-chain .mv465-item{min-height:0;display:flex;gap:9px;align-items:flex-start}.mv465-chain .ico{display:flex;min-width:26px;height:26px;align-items:center;justify-content:center;border-radius:50%;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:900}.mv465-item b{display:block;font-size:12.5px}.mv465-item small{display:block;margin-top:3px;color:#64748b;font-size:10.5px}.mv465-detail{display:none;margin-top:9px;padding-top:8px;border-top:1px dashed #bfdbfe}.mv465-item.open .mv465-detail{display:block}.mv465-block{margin-top:7px;padding:8px 9px;border:1px solid #dbeafe;border-radius:9px;background:#fff}.mv465-block:first-child{margin-top:0}.mv465-block strong{display:block;margin-bottom:3px;color:#1d4ed8;font-size:9.5px;text-transform:uppercase}.mv465-block span{display:block;color:#334155;font-size:11.5px;line-height:1.45}.mv465-critical{border-left:3px solid #f59e0b;background:#fffbeb}.mv465-critical strong{color:#92400e}.mv465-key{margin-top:11px;padding:10px 11px;border-left:4px solid #0b6ffb;border-radius:9px;background:#eff6ff;color:#1e3a8a;font-size:12px;font-weight:800;line-height:1.4}.mv465-count{text-align:center;margin-top:8px;color:#64748b;font-size:10.5px;font-weight:800}.mv465-nav{display:flex;gap:8px;margin-top:15px}.mv465-btn{padding:11px 13px;flex:1}.mv465-btn.sec{background:#e2e8f0;color:#334155;flex:0 0 auto}.mv465-home{width:100%;margin-top:9px;border:1px solid #cbd5e1;background:#fff;color:#475569}.mv465-finish{text-align:center}.mv465-check{width:64px;height:64px;margin:3px auto 10px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#dcfce7;color:#047857;font-size:32px;font-weight:900}.mv465-eval{margin:13px 0;padding:11px;border:1px dashed #94a3b8;border-radius:12px;background:#f8fafc;color:#475569;font-size:11.5px;line-height:1.45}.mv465-source{margin-top:12px;color:#94a3b8;font-size:9px;text-align:center}
      @media(max-width:640px){.mv465{padding:7px}.mv465-screen{padding:14px}.mv465-grid{grid-template-columns:1fr}.mv465-screen h2{font-size:19px}}
    `;
    document.head.appendChild(s);
  }

  function tarjetaCurso(){
    const x=document.createElement('section');
    x.id='mv465MisFuncionesCard';
    x.className='mv465-card';
    x.setAttribute('data-resource-group','');
    x.innerHTML=`<div data-resource-item data-search="MIS FUNCIONES MINICURSO TECNICO T1 T2 CURSO INTERACTIVO"><span class="mv465-badge">🎓 MINICURSO 01 · TÉCNICO</span><h3>Mis Funciones</h3><p>Conoce qué debes realizar, validar, comunicar y cerrar correctamente durante una orden de trabajo.</p><div class="mv465-meta"><span>⏱ 6–8 min</span><span>👆 Interactivo</span><span>📘 Sin nota</span></div><button class="mv465-open" type="button" onclick="mv465AbrirMisFunciones()">ABRIR CURSO</button></div>`;
    return x;
  }

  function inyectar(){
    if(!esTecnico()) return true;
    if(document.getElementById('mv465MisFuncionesCard')) return true;
    const p=document.querySelector('#pantalla .mv55-resource-page');
    if(!p) return false;
    const h=p.querySelector('.mv55-resource-head');
    if(!h || !norm(h.querySelector('h2')?.textContent).includes('CAPACITACION')) return false;
    css();
    h.insertAdjacentElement('afterend',tarjetaCurso());
    return true;
  }

  function preparar(){
    if(!esTecnico()) return;
    let n=0;
    const t=setInterval(()=>{ n++; if(inyectar() || n>50) clearInterval(t); },100);
  }

  const previo=window.mv339Antes_mostrarCapacitacion;
  window.mv339Antes_mostrarCapacitacion=function(){
    try{ if(typeof previo==='function') previo(); }catch(_){ }
    preparar();
  };
  setTimeout(inyectar,0);

  function progreso(){
    return Math.round((paso/(PANTALLAS.length-1))*100);
  }

  function detalleHtml(it){
    return `<div class="mv465-detail"><div class="mv465-block"><strong>¿Qué significa?</strong><span>${it.significado}</span></div><div class="mv465-block"><strong>¿Qué debes hacer?</strong><span>${it.accion}</span></div>${it.critico?`<div class="mv465-block mv465-critical"><strong>⚠ Punto clave</strong><span>${it.critico}</span></div>`:''}</div>`;
  }

  function itemHtml(it,idx){
    return `<button type="button" class="mv465-item" data-i="${idx}"><span class="ico">${it.icon}</span><span><b>${it.titulo}</b><small>${it.resumen}</small>${detalleHtml(it)}</span></button>`;
  }

  function actualizarContador(root){
    const c=root.querySelector('.mv465-count');
    if(!c) return;
    const total=root.querySelectorAll('.mv465-item').length;
    const abiertos=root.querySelectorAll('.mv465-item.open').length;
    c.textContent=`${abiertos} de ${total} ampliados · revisión opcional`;
  }

  function render(){
    const p=PANTALLAS[paso];
    const root=document.getElementById('pantalla');
    if(!root) return;

    let cuerpo='';
    if(p.fin){
      cuerpo=`<div class="mv465-finish"><div class="mv465-check">✓</div><h2>${p.titulo}</h2><p>${p.texto}</p><div class="mv465-eval"><b>📝 Siguiente etapa: Evaluación</b><br>La evaluación será independiente del curso y tendrá su propia calificación. Se incorporará después de validar esta versión del contenido.</div></div>`;
    }else{
      cuerpo=`<div class="${p.modo==='cadena'?'mv465-chain':'mv465-grid'}">${p.items.map(itemHtml).join('')}</div>${p.clave?`<div class="mv465-key">${p.clave}</div>`:''}<div class="mv465-count">0 de ${p.items.length} ampliados · revisión opcional</div>`;
    }

    const nav=p.fin
      ? `<button class="mv465-btn" type="button" data-capacitacion>Volver a Capacitación</button>`
      : `<div class="mv465-nav">${paso>0?'<button class="mv465-btn sec" type="button" data-back>← Atrás</button>':''}<button class="mv465-btn" type="button" data-next>Siguiente →</button></div>${paso===0?'<button class="mv465-btn mv465-home" type="button" data-capacitacion>← Volver a Capacitación</button>':''}`;

    root.innerHTML=`<div id="mv465curso" class="mv465" data-v="${V}"><div class="mv465-top"><div class="mv465-head"><div><div class="mv465-k">Minicurso 01 · Aprendizaje interactivo</div><h1>Mis Funciones</h1></div><span class="mv465-perfil">Perfil Técnico</span></div><div class="mv465-prog"><div class="mv465-bar"><i style="width:${progreso()}%"></i></div><b>${progreso()}%</b></div><div class="mv465-note">Este curso es para aprender. <b>No genera nota.</b> La evaluación se realiza después.</div></div><section class="mv465-screen"><div class="mv465-step">${p.paso}</div>${!p.fin?`<h2>${p.titulo}</h2><p>${p.texto}</p>`:''}${cuerpo}${nav}${p.fin?'<div class="mv465-source">Contenido base: Funciones del puesto Técnico Instalador / Auxiliar Técnico y flujo operativo definido para MI VISUAL.</div>':''}</section></div>`;

    root.querySelectorAll('.mv465-item').forEach(b=>{
      b.addEventListener('click',()=>{
        b.classList.toggle('open');
        actualizarContador(root);
      });
    });

    const next=root.querySelector('[data-next]');
    if(next) next.addEventListener('click',()=>{
      paso=Math.min(PANTALLAS.length-1,paso+1);
      render();
      window.scrollTo({top:0,behavior:'smooth'});
    });
    const back=root.querySelector('[data-back]');
    if(back) back.addEventListener('click',()=>{
      paso=Math.max(0,paso-1);
      render();
      window.scrollTo({top:0,behavior:'smooth'});
    });
    root.querySelectorAll('[data-capacitacion]').forEach(b=>b.addEventListener('click',()=>mostrarCapacitacion()));
  }

  window.mv465AbrirMisFunciones=function(){
    if(!esTecnico()){
      alert('Este minicurso corresponde al perfil Técnico.');
      return;
    }
    css();
    paso=0;
    render();
  };
})();