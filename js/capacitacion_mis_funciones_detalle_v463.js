/* MI VISUAL V464 - Detalle ampliado estable / Minicurso Mis Funciones
   Capa aislada: solo enriquece el contenido visual del minicurso.
   No observa cambios internos para evitar bucles de renderizado. */
(function(){
  'use strict';
  if(window.MV464_CAP_MIS_FUNCIONES_DETALLE) return;
  window.MV464_CAP_MIS_FUNCIONES_DETALLE = true;

  const D = {
    'RECONOCER': ['Identificar con claridad qué responsabilidades te corresponden como técnico dentro de la cuadrilla.','Antes de iniciar la jornada debes tener claro qué debes ejecutar, controlar, comunicar y cerrar. Esto evita dejar actividades incompletas o asumir que otra persona las realizará.'],
    'DIFERENCIAR': ['T1 y T2 trabajan como equipo, pero cada uno tiene responsabilidades definidas.','El T1 dirige y valida la gestión; el T2 coparticipa, apoya la ejecución y mantiene informado al T1 sobre el estado del trabajo.'],
    'CONTROLAR': ['Tu responsabilidad no se concentra solo en ejecutar la orden. También debes controlar el antes, durante y cierre.','Revisa ruta, EPP, herramientas y materiales; durante la atención comunica novedades; al finalizar valida servicio, acabado, limpieza y documentación.'],
    'CERRAR CORRECTAMENTE': ['Cerrar una orden significa completar también la parte documental y de entrega.','Después de terminar el trabajo debes validar el servicio, completar y firmar el acta, realizar un escaneo legible, entregar el acta física al área de Almacén y reportar la culminación.'],

    'T1 · TÉCNICO INSTALADOR': ['Es el técnico principal de la cuadrilla y tiene responsabilidad sobre la correcta ejecución de los trabajos asignados.','Debe dirigir al auxiliar, cumplir la ruta, ejecutar o supervisar la ejecución, validar el resultado final, gestionar el acta y comunicar cualquier impedimento o novedad.'],
    'T2 · AUXILIAR TÉCNICO': ['Es parte activa de la cuadrilla y coparticipa en las instalaciones, averías y servicios.','Debe brindar apoyo al T1, colaborar para obtener un buen acabado, utilizar correctamente sus EPP y reportar al T1 el estado final o cualquier novedad detectada.'],

    'ANTES': ['Es la preparación necesaria para iniciar correctamente una atención.','Verifica la ruta y órdenes asignadas, que cuentes con EPP, herramientas, materiales y accesos o aplicativos necesarios. Si detectas un quiebre que impida trabajar, comunícalo oportunamente.'],
    'DURANTE': ['Es el periodo de ejecución y control de la atención.','Trabaja coordinadamente con tu compañero, cuida los recursos asignados, mantén comunicación y reporta impedimentos o situaciones que puedan afectar la correcta atención.'],
    'AL FINALIZAR': ['El trabajo debe quedar completamente validado antes de considerarlo terminado.','Confirma operatividad, acabado, estética y limpieza. Luego completa el acta, obtiene la conformidad, realiza el escaneo correcto, entrega el acta y reporta la culminación.'],

    'DIRIGIR': ['El T1 es quien conduce técnicamente la cuadrilla durante la jornada y las órdenes asignadas.','Coordina con el auxiliar, distribuye las acciones necesarias, corrige procedimientos cuando corresponda y verifica que el trabajo realizado por la cuadrilla quede correctamente terminado.'],
    'EJECUTAR': ['Significa realizar correctamente las instalaciones, averías y demás servicios asignados.','Cumple las rutas y órdenes indicadas y aplica el procedimiento correspondiente hasta dejar el servicio en condiciones correctas para el cliente.'],
    'VALIDAR': ['No basta con ejecutar; el T1 debe comprobar cómo quedó finalmente la atención.','Antes de retirarte verifica funcionamiento, configuración cuando corresponda, acabado, estética, orden y limpieza. El cliente debe recibir una atención realmente terminada.'],
    'DOCUMENTAR': ['La atención debe quedar correctamente sustentada en el acta y documentación correspondiente.','Llena el acta de forma clara y legible, sin borrones ni enmendaduras, registra la información necesaria y obtiene la firma o conformidad del cliente. Después realiza el escaneo correcto.'],
    'COMUNICAR': ['La gestión debe mantener trazabilidad durante toda la jornada.','Reporta inicio y culminación. Si aparece un impedimento, falta de material, problema de herramienta u otra situación relevante, informa oportunamente al supervisor o área correspondiente.'],
    'CUIDAR': ['Los equipos, herramientas, materiales, EPP y demás recursos asignados están bajo responsabilidad de la cuadrilla.','Úsalos correctamente, evita pérdidas o daños y reporta deterioros, faltantes, fisuras, equipos inoperativos o cualquier condición que requiera atención.'],

    'T1 · DIRIGE Y VALIDA': ['El T1 mantiene la responsabilidad principal de la gestión de la cuadrilla.','Debe coordinar la atención, brindar soporte al T2, controlar la calidad del trabajo y validar que servicio, acabado, documentación y cierre queden correctos antes de culminar.'],
    'T2 · COPARTICIPA Y APOYA': ['El T2 no es un observador: participa activamente en la ejecución junto con el T1.','Apoya las labores asignadas, contribuye al buen acabado, utiliza correctamente los EPP y comunica al T1 el estado final del cliente o cualquier problema detectado.'],

    'SERVICIO OPERATIVO': ['El cliente debe quedar con el servicio funcionando correctamente de acuerdo con el trabajo realizado.','Antes de retirarte valida la operatividad y las configuraciones que correspondan. Detectar un problema al final permite corregirlo antes de cerrar la orden.'],
    'BUEN ACABADO Y ESTÉTICA': ['La calidad también se refleja en cómo queda visualmente el trabajo.','Revisa orden del tendido, ubicación de elementos, terminaciones y presentación final. Una atención operativa pero mal acabada todavía no está correctamente terminada.'],
    'ÁREA LIMPIA': ['El lugar donde trabajaste debe quedar limpio y ordenado.','Retira residuos, sobrantes de cable, empaques u otros elementos generados durante la atención. La limpieza forma parte de la entrega final al cliente.'],
    'ACTA CORRECTAMENTE LLENADA Y FIRMADA': ['El acta sustenta formalmente la atención realizada y la conformidad del cliente.','Completa los campos correspondientes de forma legible, evita borrones o enmendaduras y obtén la firma o conformidad requerida antes de cerrar la gestión.'],
    'ESCANEO CORRECTO DEL ACTA': ['El acta escaneada debe permitir revisar claramente toda la información registrada.','Verifica que el documento esté completo, derecho, enfocado y legible, sin partes cortadas. Un escaneo deficiente puede generar observaciones posteriores.'],
    'ENTREGA FÍSICA A ALMACÉN': ['La gestión documental no termina con subir o escanear el acta.','Entrega correctamente el acta física al área de Almacén para que continúe el control y resguardo documental correspondiente.'],
    'CULMINACIÓN REPORTADA': ['El cierre debe quedar comunicado o registrado según el flujo operativo.','Una vez terminado el servicio y la documentación, registra o reporta la culminación para dejar trazabilidad de que la orden fue atendida y cerrada.'],

    'ESCALERA': ['La escalera es una herramienta de trabajo que debe conservarse y mantenerse segura.','Cuando no esté en uso, mantenla asegurada con cadena y candado según la responsabilidad asignada. Reporta cualquier condición que comprometa su uso o seguridad.'],
    'HERRAMIENTAS': ['Las herramientas deben encontrarse disponibles y en condiciones adecuadas para el trabajo.','Reporta faltantes, deterioro, fisuras, desgaste, equipos malogrados o inoperativos. No esperes a que el problema impida una atención para comunicarlo.'],
    'MATERIALES': ['Debes prever y comunicar los materiales necesarios para ejecutar las órdenes asignadas.','Controla lo utilizado y reporta oportunamente necesidades, faltantes o novedades al área correspondiente para evitar quiebres durante la atención.'],
    'APLICATIVOS': ['Los accesos y aplicativos son herramientas necesarias para registrar y gestionar correctamente el trabajo.','Administra responsablemente los usuarios y contraseñas asignados y verifica que puedas utilizar los sistemas necesarios para la atención.'],
    'EPP': ['Los equipos de protección personal son obligatorios para realizar las actividades de forma segura.','Utiliza correctamente los EPP requeridos durante los trabajos. La seguridad no depende de que el trabajo sea corto o sencillo.'],

    'INICIO': ['El inicio deja constancia de que la jornada o actividad comenzó correctamente.','Realiza el registro o reporte de inicio según el flujo establecido antes de desarrollar las actividades correspondientes.'],
    'DURANTE EL TRABAJO': ['Debes permanecer comunicado mientras ejecutas las órdenes asignadas.','Mantente disponible para coordinaciones y comunica oportunamente situaciones que puedan modificar, retrasar o impedir la atención.'],
    'SI APARECE UN IMPEDIMENTO': ['Un problema que impide continuar debe quedar informado y sustentado oportunamente.','Comunica al supervisor o área correspondiente qué ocurrió y cuál es el motivo. No esperes hasta el final de la jornada para reportarlo.'],

    '1. CUMPLE': ['Cumplir significa atender las rutas, órdenes y responsabilidades que te fueron asignadas.','Organiza tu jornada de acuerdo con la programación recibida y comunica cualquier situación que impida cumplirla correctamente.'],
    '2. EJECUTA': ['La ejecución debe combinar funcionamiento, calidad, seguridad y buen acabado.','No trabajes solo para terminar rápido. El objetivo es entregar una atención correctamente ejecutada y validada.'],
    '3. CUIDA': ['Los recursos asignados permiten que la cuadrilla continúe operando correctamente.','Protege EPP, herramientas, escalera, materiales, productos y accesos; informa de inmediato cualquier pérdida, daño o deterioro.'],
    '4. COMUNICA': ['La comunicación permite que supervisor y áreas de soporte conozcan el estado real de tu gestión.','Reporta inicio, novedades, impedimentos y culminación de forma oportuna y clara.'],
    '5. CIERRA CORRECTAMENTE': ['La responsabilidad del técnico continúa hasta completar el cierre operativo y documental.','Valida servicio, acabado y limpieza; completa el acta, obtiene conformidad, realiza un escaneo correcto, entrega el acta física a Almacén y reporta la culminación.']
  };

  function norm(x){
    return (x||'').toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  }

  function agregarEstilos(){
    if(document.getElementById('mv464detallecss')) return;
    const s=document.createElement('style');
    s.id='mv464detallecss';
    s.textContent=`
      #mv460curso .mv460-item .d{font-size:11.5px;line-height:1.5}
      #mv460curso .mv463-bloque{margin-top:8px;padding:9px 10px;border-radius:9px;background:#fff;border:1px solid #dbeafe}
      #mv460curso .mv463-bloque:first-child{margin-top:0}
      #mv460curso .mv463-titulo{display:block;margin-bottom:3px;color:#1d4ed8;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.03em}
      #mv460curso .mv463-texto{display:block;color:#334155;font-size:11.5px;line-height:1.45}
      @media(max-width:640px){#mv460curso .mv463-bloque{padding:9px}#mv460curso .mv463-texto{font-size:11.8px}}
    `;
    document.head.appendChild(s);
  }

  function detalleHTML(base, extra){
    const significado=extra && extra[0] ? extra[0] : base;
    const campo=extra && extra[1] ? extra[1] : base;
    return `<div class="mv463-bloque"><span class="mv463-titulo">¿Qué significa?</span><span class="mv463-texto">${significado}</span></div><div class="mv463-bloque"><span class="mv463-titulo">¿Qué debes hacer?</span><span class="mv463-texto">${campo}</span></div>`;
  }

  function enriquecer(){
    const curso=document.getElementById('mv460curso');
    if(!curso) return;
    agregarEstilos();
    curso.querySelectorAll('.mv460-item').forEach(item=>{
      const titulo=norm(item.querySelector('b')?.textContent || '');
      const d=item.querySelector('.d');
      if(!d || d.dataset.mv464==='1') return;
      const base=d.textContent.trim();
      const extra=D[titulo];
      d.innerHTML=detalleHTML(base,extra);
      d.dataset.mv464='1';
    });
  }

  const pantalla=document.getElementById('pantalla');
  if(pantalla){
    const obs=new MutationObserver(function(){
      requestAnimationFrame(enriquecer);
    });
    // Solo detecta cuando MI VISUAL cambia la pantalla completa.
    obs.observe(pantalla,{childList:true,subtree:false});
  }

  setTimeout(enriquecer,0);
})();