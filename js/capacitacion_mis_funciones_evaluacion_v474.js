/* MI VISUAL V474 - Evaluacion final / Minicurso 01: Mis Funciones
   8 preguntas practicas basadas en el contenido del curso.
   Sin nota minima configurada y sin guardado en backend por ahora. */
(function(){
  'use strict';
  if(window.MV474_EVAL_MIS_FUNCIONES) return;
  window.MV474_EVAL_MIS_FUNCIONES=true;

  const PREGUNTAS=[
    {
      q:'Durante una atención, el T2 termina una parte del trabajo y el T1 detecta que el procedimiento no quedó correcto. ¿Qué corresponde hacer?',
      o:[
        'Continuar porque el trabajo del T2 es responsabilidad únicamente del auxiliar.',
        'El T1 debe revisar, corregir lo necesario y validar el resultado antes de cerrar.',
        'Cerrar la orden y corregirla solo si luego aparece una observación.',
        'Pedir al cliente que decida si el acabado es suficiente.'
      ],
      c:1,
      e:'El T1 dirige y valida el resultado integral de la cuadrilla. Si detecta una mala práctica, debe intervenir antes del cierre.'
    },
    {
      q:'Antes de salir a ruta detectas que falta una herramienta necesaria para una de las órdenes programadas. ¿Cuál es la mejor acción?',
      o:[
        'Salir igual y recién informar cuando ya estés con el cliente.',
        'Usar cualquier herramienta parecida aunque no sea la adecuada.',
        'Reportar y gestionar el faltante antes de llegar al cliente.',
        'Cancelar toda la jornada sin comunicar el motivo.'
      ],
      c:2,
      e:'La preparación previa evita quiebres en campo. Los faltantes deben comunicarse oportunamente antes de afectar una atención.'
    },
    {
      q:'El servicio ya funciona, pero observas que el tendido y las terminaciones quedaron desordenados. ¿La orden ya está correctamente terminada?',
      o:[
        'Sí, porque lo único importante es que el servicio funcione.',
        'Sí, si el cliente no reclama en ese momento.',
        'No. Debes corregir el acabado y volver a validar antes de cerrar.',
        'No, pero basta con tomar una foto y retirarse.'
      ],
      c:2,
      e:'La validación final incluye operatividad, acabado, estética, orden y limpieza. Operativo no significa necesariamente bien terminado.'
    },
    {
      q:'El T2 detecta una condición que puede afectar el acabado final. ¿Qué debería hacer dentro del trabajo en equipo?',
      o:[
        'Ignorarla porque solo el T1 puede observar problemas.',
        'Comunicarla al T1 y participar en la corrección antes de finalizar.',
        'Esperar hasta el fin del día para comentarla.',
        'Continuar y dejar que Almacén revise después.'
      ],
      c:1,
      e:'El T2 participa activamente en la ejecución y debe mantener informado al T1 sobre cualquier novedad que afecte el resultado.'
    },
    {
      q:'El servicio está operativo, el área quedó limpia y el acta ya está correctamente llenada y firmada. Según el orden definido en el curso, ¿qué corresponde después?',
      o:[
        'Entregar directamente el acta física a Almacén.',
        'Reportar la culminación de la actividad.',
        'Volver a iniciar la orden en el aplicativo.',
        'Cerrar la jornada sin realizar ningún otro paso.'
      ],
      c:1,
      e:'En el flujo definido, la culminación reportada es el punto 5; después continúan el escaneo correcto y la entrega física a Almacén.'
    },
    {
      q:'Antes de una orden detectas que una herramienta presenta una fisura o condición insegura. ¿Qué debes hacer?',
      o:[
        'Usarla con cuidado hasta que deje de funcionar.',
        'Reportarla oportunamente y no normalizar una condición insegura o inoperativa.',
        'Guardarla sin informar para evitar retrasos.',
        'Prestársela a otra cuadrilla y continuar.'
      ],
      c:1,
      e:'Las herramientas y recursos asignados deben mantenerse operativos y seguros. Un deterioro debe reportarse antes de que se convierta en un quiebre o riesgo.'
    },
    {
      q:'Durante una atención aparece un impedimento que no permite continuar normalmente. ¿Cómo debe manejarse la comunicación?',
      o:[
        'Esperar hasta el final de la jornada para informar todo junto.',
        'Comunicar oportunamente qué ocurrió, el motivo y qué se necesita para continuar o cerrar correctamente.',
        'No informar mientras el cliente no reclame.',
        'Solo registrar que la orden no se terminó, sin explicar la causa.'
      ],
      c:1,
      e:'La comunicación debe ser oportuna y dar trazabilidad del problema: qué ocurrió, por qué y qué se necesita para resolverlo.'
    },
    {
      q:'El servicio quedó bien y el acta está firmada. También reportaste la culminación, pero el acta aún no fue escaneada correctamente ni entregada físicamente a Almacén. ¿Cómo está la gestión?',
      o:[
        'Completamente terminada porque ya se reportó culminación.',
        'Terminada solo para el T1, pero no para el T2.',
        'Todavía incompleta: faltan el escaneo correcto y la entrega física del acta.',
        'Terminada si el cliente confirma que tiene servicio.'
      ],
      c:2,
      e:'El cierre completo contempla la parte operativa y documental. Reportar culminación no reemplaza el escaneo ni la entrega física del acta.'
    }
  ];

  let actual=0;
  let respuestas=[];

  function css(){
    if(document.getElementById('mv474-eval-css')) return;
    const s=document.createElement('style');
    s.id='mv474-eval-css';
    s.textContent=`
      .mv474{max-width:760px;margin:auto;padding:10px 10px 30px;color:#0f172a}.mv474 *{box-sizing:border-box}
      .mv474-top{padding:14px;border:1px solid #dbeafe;border-radius:16px;background:linear-gradient(135deg,#eff6ff,#fff);box-shadow:0 8px 22px #0f172a12;margin-bottom:12px}
      .mv474-k{font-size:10px;font-weight:900;color:#2563eb;text-transform:uppercase;letter-spacing:.06em}.mv474-top h1{margin:4px 0;font-size:21px}.mv474-top p{margin:0;color:#475569;font-size:12px;line-height:1.45}
      .mv474-prog{display:flex;gap:8px;align-items:center;margin-top:10px}.mv474-bar{height:7px;flex:1;border-radius:99px;background:#e2e8f0;overflow:hidden}.mv474-bar i{display:block;height:100%;background:linear-gradient(90deg,#2563eb,#06b6d4)}.mv474-prog b{font-size:10px;color:#64748b}
      .mv474-card{padding:16px;border:1px solid #e2e8f0;border-radius:17px;background:#fff;box-shadow:0 8px 22px #0f172a12}.mv474-num{font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase}.mv474-card h2{font-size:18px;line-height:1.35;margin:6px 0 13px}
      .mv474-opts{display:grid;gap:8px}.mv474-op{width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;text-align:left;color:#0f172a;font-size:12.5px;line-height:1.4;cursor:pointer}.mv474-op.sel{border:2px solid #2563eb;background:#eff6ff}.mv474-letter{display:inline-flex;width:23px;height:23px;align-items:center;justify-content:center;margin-right:8px;border-radius:50%;background:#e2e8f0;font-weight:900;font-size:10px}.mv474-op.sel .mv474-letter{background:#2563eb;color:#fff}
      .mv474-nav{display:flex;gap:8px;margin-top:14px}.mv474-btn{flex:1;padding:11px 13px;border:0;border-radius:11px;background:#0b6ffb;color:#fff;font-weight:900;cursor:pointer}.mv474-btn.sec{flex:0 0 auto;background:#e2e8f0;color:#334155}.mv474-btn:disabled{opacity:.45;cursor:not-allowed}
      .mv474-note{margin-top:10px;padding:9px 10px;border-radius:10px;background:#f8fafc;color:#64748b;font-size:10.5px;line-height:1.4}
      .mv474-result{text-align:center}.mv474-score{width:90px;height:90px;margin:8px auto 12px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#dbeafe;color:#1d4ed8}.mv474-score strong{font-size:25px}.mv474-score span{font-size:10px;font-weight:900}.mv474-result h2{margin:4px 0 6px}.mv474-result p{color:#475569;font-size:12.5px;line-height:1.45}
      .mv474-review{margin-top:15px;text-align:left;display:grid;gap:8px}.mv474-wrong{padding:11px;border:1px solid #fecaca;border-radius:11px;background:#fff7f7}.mv474-wrong b{display:block;font-size:11.5px;margin-bottom:4px}.mv474-wrong span{font-size:11px;color:#475569;line-height:1.4}.mv474-ok{padding:11px;border:1px solid #bbf7d0;border-radius:11px;background:#f0fdf4;color:#166534;font-size:11.5px;font-weight:800}
      .mv474-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:15px}.mv474-actions .mv474-btn{width:100%}
      @media(max-width:640px){.mv474{padding:7px}.mv474-card{padding:14px}.mv474-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function porcentaje(){return Math.round(((actual+1)/PREGUNTAS.length)*100);}

  function renderPregunta(){
    const root=document.getElementById('pantalla');
    if(!root) return;
    const p=PREGUNTAS[actual];
    const sel=respuestas[actual];
    root.innerHTML=`<div class="mv474"><div class="mv474-top"><div class="mv474-k">Evaluación final · Minicurso 01</div><h1>Mis Funciones</h1><p>Responde según lo aprendido en el curso. No se muestran respuestas correctas hasta finalizar.</p><div class="mv474-prog"><div class="mv474-bar"><i style="width:${porcentaje()}%"></i></div><b>${actual+1}/${PREGUNTAS.length}</b></div></div><section class="mv474-card"><div class="mv474-num">Pregunta ${actual+1} de ${PREGUNTAS.length}</div><h2>${p.q}</h2><div class="mv474-opts">${p.o.map((x,i)=>`<button type="button" class="mv474-op ${sel===i?'sel':''}" data-opt="${i}"><span class="mv474-letter">${String.fromCharCode(65+i)}</span>${x}</button>`).join('')}</div><div class="mv474-nav">${actual>0?'<button type="button" class="mv474-btn sec" data-prev>← Atrás</button>':''}<button type="button" class="mv474-btn" data-next ${sel==null?'disabled':''}>${actual===PREGUNTAS.length-1?'Finalizar evaluación':'Siguiente →'}</button></div><div class="mv474-note">Selecciona una alternativa. Puedes volver a preguntas anteriores antes de finalizar.</div></section></div>`;

    root.querySelectorAll('[data-opt]').forEach(b=>b.addEventListener('click',()=>{respuestas[actual]=Number(b.dataset.opt);renderPregunta();}));
    root.querySelector('[data-prev]')?.addEventListener('click',()=>{actual--;renderPregunta();window.scrollTo({top:0,behavior:'smooth'});});
    root.querySelector('[data-next]')?.addEventListener('click',()=>{
      if(respuestas[actual]==null) return;
      if(actual<PREGUNTAS.length-1){actual++;renderPregunta();window.scrollTo({top:0,behavior:'smooth'});}else finalizar();
    });
  }

  function finalizar(){
    let aciertos=0;
    PREGUNTAS.forEach((p,i)=>{if(respuestas[i]===p.c)aciertos++;});
    const pct=Math.round(aciertos/PREGUNTAS.length*100);
    const errores=PREGUNTAS.map((p,i)=>({p,i})).filter(x=>respuestas[x.i]!==x.p.c);
    const root=document.getElementById('pantalla');
    if(!root) return;
    root.innerHTML=`<div class="mv474"><div class="mv474-top"><div class="mv474-k">Resultado · Evaluación final</div><h1>Mis Funciones</h1><p>Resultado de esta evaluación de validación.</p></div><section class="mv474-card mv474-result"><div class="mv474-score"><strong>${pct}%</strong><span>${aciertos} de ${PREGUNTAS.length}</span></div><h2>Evaluación completada</h2><p>Obtuviste <b>${aciertos} respuestas correctas de ${PREGUNTAS.length}</b>. Aún no se ha definido una nota mínima de aprobación ni se guarda este resultado en la base de datos.</p><div class="mv474-review">${errores.length?errores.map(x=>`<div class="mv474-wrong"><b>Reforzar pregunta ${x.i+1}</b><span>${x.p.e}</span></div>`).join(''):'<div class="mv474-ok">Excelente: respondiste correctamente todas las preguntas.</div>'}</div><div class="mv474-actions"><button type="button" class="mv474-btn" data-retry>Repetir evaluación</button><button type="button" class="mv474-btn sec" data-course>Repasar curso</button><button type="button" class="mv474-btn sec" data-cap>Volver a Capacitación</button></div></section></div>`;
    root.querySelector('[data-retry]')?.addEventListener('click',()=>{actual=0;respuestas=new Array(PREGUNTAS.length).fill(null);renderPregunta();});
    root.querySelector('[data-course]')?.addEventListener('click',()=>{if(typeof window.mv467AbrirMisFunciones==='function')window.mv467AbrirMisFunciones();});
    root.querySelector('[data-cap]')?.addEventListener('click',()=>{if(typeof window.mostrarCapacitacion==='function')window.mostrarCapacitacion();});
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function iniciar(){
    try{if(window.speechSynthesis)window.speechSynthesis.cancel();}catch(_){ }
    css();actual=0;respuestas=new Array(PREGUNTAS.length).fill(null);renderPregunta();window.scrollTo({top:0,behavior:'smooth'});
  }

  function inyectarFinal(){
    const curso=document.getElementById('mv466curso');
    if(!curso) return;
    const fin=curso.querySelector('.mv466-finish');
    const caja=curso.querySelector('.mv466-eval');
    if(!fin||!caja||caja.querySelector('[data-start-eval]')) return;
    caja.innerHTML='<b>Evaluación final disponible</b><br>8 preguntas prácticas para comprobar lo aprendido. El resultado se muestra al finalizar.<button type="button" data-start-eval style="display:block;width:100%;margin-top:10px;padding:11px;border:0;border-radius:10px;background:#0b6ffb;color:#fff;font-weight:900;cursor:pointer">REALIZAR EVALUACIÓN</button>';
    caja.querySelector('[data-start-eval]').addEventListener('click',iniciar);
  }

  document.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('#mv466curso'))setTimeout(inyectarFinal,60);
  });
  setTimeout(inyectarFinal,0);
})();