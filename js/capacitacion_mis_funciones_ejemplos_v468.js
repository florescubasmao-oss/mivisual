/* MI VISUAL V468 - Ejemplos prácticos / Minicurso 01: Mis Funciones
   Capa ligera sin observers: solo añade ejemplos al contenido ya renderizado.
   No modifica backend, Sheets, Drive, permisos ni otros módulos. */
(function(){
  'use strict';
  if(window.MV468_CAP_MIS_FUNCIONES_EJEMPLOS) return;
  window.MV468_CAP_MIS_FUNCIONES_EJEMPLOS=true;

  function norm(x){return (x||'').toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}

  const E={
    'RECONOCER':'Antes de salir a ruta, sabes qué órdenes tienes y qué responsabilidades debes cumplir durante cada atención, en vez de asumir que otro integrante cerrará lo pendiente.',
    'DIFERENCIAR':'Si el T2 detecta una novedad, la comunica al T1; el T1 coordina la solución y valida que la atención quede correctamente terminada.',
    'CONTROLAR':'Tienes varias órdenes asignadas. Antes de salir verificas EPP, herramientas, materiales y accesos; durante la atención comunicas novedades y al final validas el cierre completo.',
    'CERRAR CORRECTAMENTE':'El cliente ya tiene servicio, pero falta reportar culminación, escanear el acta y entregarla a Almacén. La gestión todavía no está completamente cerrada.',

    'T1 · TECNICO INSTALADOR':'Durante una atención el auxiliar realiza una acción de forma incorrecta. El T1 interviene, corrige el procedimiento y valida el resultado antes de continuar.',
    'T2 · AUXILIAR TECNICO':'Mientras el T1 realiza la actividad principal, el T2 apoya con herramientas, materiales y ejecución asignada; si detecta un problema, lo informa inmediatamente al T1.',

    'ANTES':'Antes de salir detectas que falta una herramienta necesaria. Lo reportas y gestionas antes de llegar al cliente, evitando que la orden se detenga en campo.',
    'DURANTE':'En plena atención aparece un impedimento que retrasa el trabajo. Lo comunicas en ese momento y continúas según la indicación recibida; no esperas al final del día.',
    'AL FINALIZAR':'El servicio funciona, pero quedaron residuos y el acta aún no tiene conformidad. Primero completas esos pendientes y luego continúas con el cierre.',

    'DIRIGIR':'El T1 distribuye las tareas con el T2, verifica cómo se está ejecutando el trabajo y corrige cualquier mala práctica antes de entregar la atención.',
    'EJECUTAR':'Recibes una orden de avería. Realizas el procedimiento correspondiente hasta dejar el servicio operativo y no das por terminado el trabajo solo por avanzar rápido.',
    'VALIDAR':'El cliente ya navega, pero observas que el acabado quedó desordenado. Antes de retirarte corriges la terminación y vuelves a revisar el resultado final.',
    'DOCUMENTAR':'El acta está llena, pero un dato no se entiende y falta la conformidad. Corriges la documentación antes de escanearla y continuar con el cierre.',
    'COMUNICAR':'Una herramienta se malogra durante la jornada. Informas oportunamente al supervisor o área correspondiente, indicando qué ocurrió y cómo afecta la atención.',
    'CUIDAR':'Al terminar la jornada aseguras correctamente la escalera y verificas el estado de las herramientas. Si detectas daño o faltante, lo reportas de inmediato.',

    'T1 · DIRIGE Y VALIDA':'El T2 termina una parte del trabajo. El T1 no la da por correcta automáticamente: la revisa, corrige si es necesario y valida el resultado final de la cuadrilla.',
    'T2 · COPARTICIPA Y APOYA':'El T2 observa una condición que puede afectar el acabado. Se la comunica al T1 y participa en la corrección antes de finalizar la atención.',

    'SERVICIO OPERATIVO':'Después del trabajo verificas que el cliente tenga el servicio funcionando y que la configuración correspondiente haya quedado correcta antes de pasar al siguiente punto.',
    'BUEN ACABADO Y ESTETICA':'El servicio funciona, pero el trabajo quedó visualmente desordenado. Corriges la presentación y las terminaciones antes de continuar con el cierre.',
    'AREA LIMPIA':'Terminaste la atención y quedaron sobrantes de cable y empaques. Los retiras y dejas el lugar limpio antes de continuar.',
    'ACTA CORRECTAMENTE LLENADA Y FIRMADA':'El acta está completa, pero falta la firma o conformidad del cliente. Obtienes la conformidad antes de reportar la culminación.',
    'CULMINACION REPORTADA':'Servicio y acta están conformes. Reportas la culminación según el flujo de gestión y luego continúas con el escaneo y la entrega física del acta.',
    'ESCANEO CORRECTO DEL ACTA':'Al revisar el escaneo notas que la parte inferior del acta quedó cortada. Lo vuelves a realizar hasta que el documento se vea completo y legible.',
    'ENTREGA FISICA A ALMACEN':'El acta ya fue escaneada, pero quedó dentro de la unidad. La gestión documental sigue pendiente hasta que el documento físico sea entregado correctamente a Almacén.',

    'ESCALERA':'Al terminar el uso guardas y aseguras la escalera con el sistema correspondiente. Si detectas daño o una condición insegura, la reportas antes de volver a utilizarla.',
    'HERRAMIENTAS':'Antes de una orden detectas una herramienta fisurada o inoperativa. La reportas oportunamente en lugar de esperar a que falle durante la atención.',
    'MATERIALES':'Antes de salir notas que no cuentas con un material necesario para las órdenes programadas. Lo informas para evitar llegar al cliente sin capacidad de ejecutar el trabajo.',
    'APLICATIVOS':'Tu acceso a un aplicativo no funciona. Lo reportas o gestionas con el área correspondiente; no utilizas informalmente las credenciales de otro compañero.',
    'EPP':'Aunque la actividad parezca rápida, realizas el trabajo con los EPP requeridos correctamente colocados y en condiciones adecuadas.',

    'INICIO':'Antes de comenzar la actividad realizas el registro o reporte de inicio correspondiente para dejar trazabilidad desde el primer momento.',
    'DURANTE EL TRABAJO':'El supervisor solicita información sobre una orden. Te mantienes disponible y respondes oportunamente porque la coordinación forma parte de la gestión.',
    'SI APARECE UN IMPEDIMENTO':'Llegas a una atención y aparece una condición que no permite continuar. Informas qué ocurrió, el motivo y qué necesitas para resolver o cerrar correctamente.',
    'CULMINACION':'Una vez completado el cierre operativo, comunicas la culminación según el flujo establecido; no reportas terminado si todavía existe un pendiente operativo.',

    '1. CUMPLE':'Tienes una ruta programada con varias órdenes. Te organizas de acuerdo con esa programación y comunicas cualquier situación real que impida cumplirla.',
    '2. EJECUTA':'Puedes terminar rápido una atención, pero detectas que el acabado necesita corrección. Priorizas entregar un trabajo bien ejecutado antes que solamente terminar rápido.',
    '3. CUIDA':'Al finalizar revisas escalera, herramientas y materiales. Detectas un daño y lo reportas antes de que se convierta en un quiebre para la siguiente jornada.',
    '4. COMUNICA':'Surge un inconveniente en campo. Lo informas cuando ocurre, con información clara, en lugar de comunicarlo horas después cuando ya afectó la operación.',
    '5. CIERRA CORRECTAMENTE':'El servicio quedó bien y el acta está firmada. Aun así completas el reporte de culminación, escaneo legible y entrega física a Almacén antes de considerar terminada toda la gestión.'
  };

  function ejemploHtml(txt){return `<div class="mv466-block mv468-example"><strong>💡 Ejemplo práctico</strong><span>${txt}</span></div>`;}

  function ponerEjemplo(contenedor,titulo){
    if(!contenedor || contenedor.querySelector('.mv468-example')) return;
    const txt=E[norm(titulo)];
    if(!txt) return;
    const critical=contenedor.querySelector('.mv466-critical');
    const next=contenedor.querySelector('.mv466-seq-next');
    const temp=document.createElement('div');temp.innerHTML=ejemploHtml(txt);
    const node=temp.firstElementChild;
    if(critical) contenedor.insertBefore(node,critical);
    else if(next) contenedor.insertBefore(node,next);
    else contenedor.appendChild(node);
  }

  function enriquecer(){
    const curso=document.getElementById('mv466curso');
    if(!curso) return;
    curso.querySelectorAll('.mv466-item').forEach(item=>{
      ponerEjemplo(item.querySelector('.mv466-detail'),item.querySelector('b')?.textContent||'');
    });
    curso.querySelectorAll('.mv466-seq-row').forEach(row=>{
      ponerEjemplo(row.querySelector('.mv466-seq-body'),row.querySelector('.mv466-seq-title b')?.textContent||'');
    });
  }

  function estilos(){
    if(document.getElementById('mv468ejemploscss')) return;
    const s=document.createElement('style');s.id='mv468ejemploscss';s.textContent=`
      #mv466curso .mv468-example{border-color:#a7f3d0;background:#ecfdf5}
      #mv466curso .mv468-example strong{color:#047857}
    `;document.head.appendChild(s);
  }

  const abrirOriginal=window.mv467AbrirMisFunciones;
  if(typeof abrirOriginal==='function'){
    window.mv467AbrirMisFunciones=function(){
      const r=abrirOriginal.apply(this,arguments);
      estilos();setTimeout(enriquecer,0);
      return r;
    };
  }

  document.addEventListener('click',function(e){
    if(e.target.closest && e.target.closest('#mv466curso')) setTimeout(enriquecer,0);
  });
  estilos();
})();