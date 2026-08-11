/* ============================================================
   MI VISUAL V385 - Base Operativa sin bloqueo del navegador
   OBJETIVO
   - Evitar "La página no responde" al leer archivos XLS/XLSX.
   - Procesar el Excel en Web Worker cuando el navegador lo soporte.
   - No recorrer rangos !ref gigantes generados por formato residual.
   - Convertir completamente SOLO la hoja válida.
   - Mantener exactamente la misma validación y estructura posterior.
============================================================ */
(function(){
  "use strict";

  if(window.MV385_BASE_OPERATIVA_OK) return;

  const XLSX_CDN =
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

  function siguientePintado(){
    return new Promise(resolve=>{
      if(typeof requestAnimationFrame==="function"){
        requestAnimationFrame(()=>setTimeout(resolve,0));
      }else{
        setTimeout(resolve,0);
      }
    });
  }

  function rangoRealHojaV385(ws){
    if(!ws) return null;

    let sr=Infinity, sc=Infinity, er=-1, ec=-1;
    const keys=Object.keys(ws);

    for(const key of keys){
      if(!key || key[0]==="!") continue;
      if(!/^[A-Z]+\d+$/i.test(key)) continue;

      const celda=ws[key];
      if(!celda) continue;

      // Ignora celdas sin valor real. Así un formato aplicado hasta la fila
      // 1,048,576 no convierte esa zona vacía en un rango a recorrer.
      const tieneValor=
        celda.v !== undefined &&
        celda.v !== null &&
        String(celda.v) !== "";

      const tieneTexto=
        celda.w !== undefined &&
        celda.w !== null &&
        String(celda.w) !== "";

      if(!tieneValor && !tieneTexto) continue;

      let p;
      try{ p=XLSX.utils.decode_cell(key); }
      catch(_){ continue; }

      if(p.r<sr) sr=p.r;
      if(p.c<sc) sc=p.c;
      if(p.r>er) er=p.r;
      if(p.c>ec) ec=p.c;
    }

    if(er<0 || ec<0){
      if(!ws["!ref"]) return null;
      try{
        const ref=XLSX.utils.decode_range(ws["!ref"]);
        // Respaldo defensivo: nunca recorrer un rango absurdo vacío.
        const filas=ref.e.r-ref.s.r+1;
        const cols=ref.e.c-ref.s.c+1;
        if(filas>100000 || cols>500) return null;
        return ref;
      }catch(_){
        return null;
      }
    }

    return {s:{r:sr,c:sc},e:{r:er,c:ec}};
  }

  function matrizRangoV385(ws,rango,maxFilas){
    if(!ws || !rango) return [];

    const finR = Number.isFinite(maxFilas)
      ? Math.min(rango.e.r, rango.s.r + Math.max(0,maxFilas-1))
      : rango.e.r;

    const filas=[];
    for(let r=rango.s.r;r<=finR;r++){
      const fila=[];
      for(let c=rango.s.c;c<=rango.e.c;c++){
        const ref=XLSX.utils.encode_cell({r,c});
        const celda=ws[ref];

        if(!celda){
          fila.push("");
          continue;
        }

        let valor=celda.v;
        if((valor===undefined || valor===null) && celda.w!=null){
          valor=celda.w;
        }
        fila.push(valor==null ? "" : valor);
      }
      filas.push(fila);
    }
    return filas;
  }

  function boWorksheetAMatrizCompletaV385(ws){
    const rango=rangoRealHojaV385(ws);
    return matrizRangoV385(ws,rango);
  }

  function boBuscarHojaValidaV385(wb){
    const requeridos=["CUADRILLA","FECHA","ESTADO","TIPO DE PARTIDA"];
    let mejor=null;

    for(const nombre of (wb?.SheetNames||[])){
      const ws=wb.Sheets[nombre];
      const rango=rangoRealHojaV385(ws);
      if(!rango) continue;

      // Para identificar la hoja solo se leen las primeras 25 filas reales.
      const muestra=matrizRangoV385(ws,rango,25);
      const totalFilas=rango.e.r-rango.s.r+1;

      for(let i=0;i<muestra.length;i++){
        const heads=(muestra[i]||[]).map(v=>boNorm(v));
        const score=requeridos.filter(h=>heads.includes(h)).length;

        if(
          !mejor ||
          score>mejor.score ||
          (score===mejor.score && totalFilas>mejor.totalFilas)
        ){
          mejor={
            nombre,
            ws,
            rango,
            filaEnc:i,
            heads,
            score,
            totalFilas
          };
        }
      }
    }

    if(!mejor || mejor.score<4){
      throw new Error(
        "No se encontraron los encabezados Cuadrilla, Fecha, Estado y Tipo de Partida"
      );
    }

    // Recién aquí se convierte completamente la única hoja seleccionada.
    const rows=matrizRangoV385(mejor.ws,mejor.rango);

    return {
      nombre:mejor.nombre,
      rows,
      filaEnc:mejor.filaEnc,
      heads:mejor.heads,
      score:mejor.score
    };
  }

  function codigoWorkerV385(){
    // Este worker contiene únicamente la lectura/selección del Excel.
    // La lógica de negocio permanece en base_operativa.js.
    return `
      importScripts(${JSON.stringify(XLSX_CDN)});

      function norm(v){
        return (v==null?"":String(v))
          .toUpperCase()
          .normalize("NFD")
          .replace(/[\\u0300-\\u036f]/g,"")
          .replace(/\\s+/g," ")
          .trim();
      }

      function rangoReal(ws){
        if(!ws) return null;
        let sr=Infinity,sc=Infinity,er=-1,ec=-1;

        for(const key of Object.keys(ws)){
          if(!key || key[0]==="!" || !/^[A-Z]+\\d+$/i.test(key)) continue;
          const celda=ws[key];
          if(!celda) continue;

          const tieneValor=
            celda.v!==undefined &&
            celda.v!==null &&
            String(celda.v)!=="";

          const tieneTexto=
            celda.w!==undefined &&
            celda.w!==null &&
            String(celda.w)!=="";

          if(!tieneValor && !tieneTexto) continue;

          let p;
          try{p=XLSX.utils.decode_cell(key);}catch(_){continue;}

          if(p.r<sr)sr=p.r;
          if(p.c<sc)sc=p.c;
          if(p.r>er)er=p.r;
          if(p.c>ec)ec=p.c;
        }

        if(er<0 || ec<0){
          if(!ws["!ref"]) return null;
          try{
            const ref=XLSX.utils.decode_range(ws["!ref"]);
            const filas=ref.e.r-ref.s.r+1;
            const cols=ref.e.c-ref.s.c+1;
            if(filas>100000 || cols>500) return null;
            return ref;
          }catch(_){return null;}
        }

        return {s:{r:sr,c:sc},e:{r:er,c:ec}};
      }

      function matriz(ws,rango,maxFilas){
        if(!ws || !rango) return [];
        const finR=Number.isFinite(maxFilas)
          ? Math.min(rango.e.r,rango.s.r+Math.max(0,maxFilas-1))
          : rango.e.r;

        const filas=[];
        for(let r=rango.s.r;r<=finR;r++){
          const fila=[];
          for(let c=rango.s.c;c<=rango.e.c;c++){
            const ref=XLSX.utils.encode_cell({r,c});
            const celda=ws[ref];

            if(!celda){fila.push("");continue;}

            let valor=celda.v;
            if((valor===undefined || valor===null) && celda.w!=null){
              valor=celda.w;
            }
            fila.push(valor==null?"":valor);
          }
          filas.push(fila);
        }
        return filas;
      }

      self.onmessage=function(ev){
        try{
          const buffer=ev.data.buffer;

          const wb=XLSX.read(buffer,{
            type:"array",
            cellDates:true,
            cellStyles:false,
            cellFormula:false,
            cellHTML:false,
            dense:false,
            bookVBA:false
          });

          const requeridos=["CUADRILLA","FECHA","ESTADO","TIPO DE PARTIDA"];
          let mejor=null;

          for(const nombre of (wb.SheetNames||[])){
            const ws=wb.Sheets[nombre];
            const rango=rangoReal(ws);
            if(!rango) continue;

            const muestra=matriz(ws,rango,25);
            const totalFilas=rango.e.r-rango.s.r+1;

            for(let i=0;i<muestra.length;i++){
              const heads=(muestra[i]||[]).map(norm);
              const score=requeridos.filter(h=>heads.includes(h)).length;

              if(
                !mejor ||
                score>mejor.score ||
                (score===mejor.score && totalFilas>mejor.totalFilas)
              ){
                mejor={
                  nombre,
                  rango,
                  filaEnc:i,
                  heads,
                  score,
                  totalFilas
                };
              }
            }
          }

          if(!mejor || mejor.score<4){
            throw new Error(
              "No se encontraron los encabezados Cuadrilla, Fecha, Estado y Tipo de Partida"
            );
          }

          const rows=matriz(
            wb.Sheets[mejor.nombre],
            mejor.rango
          );

          self.postMessage({
            ok:true,
            nombre:mejor.nombre,
            rows,
            filaEnc:mejor.filaEnc,
            heads:mejor.heads,
            totalFilas:mejor.totalFilas
          });
        }catch(error){
          self.postMessage({
            ok:false,
            error:error && error.message
              ? error.message
              : "No se pudo leer el Excel"
          });
        }
      };
    `;
  }

  function leerExcelEnWorkerV385(file){
    return new Promise(async(resolve,reject)=>{
      if(typeof Worker!=="function"){
        reject(new Error("WORKER_NO_DISPONIBLE"));
        return;
      }

      let urlWorker="";
      let worker=null;
      let timer=null;

      try{
        const blob=new Blob(
          [codigoWorkerV385()],
          {type:"application/javascript"}
        );
        urlWorker=URL.createObjectURL(blob);
        worker=new Worker(urlWorker);

        const buffer=await file.arrayBuffer();

        timer=setTimeout(()=>{
          try{worker.terminate();}catch(_){}
          reject(new Error(
            "La lectura del archivo está tardando demasiado."
          ));
        },90000);

        worker.onmessage=ev=>{
          clearTimeout(timer);
          const data=ev.data||{};
          try{worker.terminate();}catch(_){}
          try{URL.revokeObjectURL(urlWorker);}catch(_){}

          if(!data.ok){
            reject(new Error(data.error||"No se pudo leer el Excel"));
            return;
          }
          resolve(data);
        };

        worker.onerror=ev=>{
          clearTimeout(timer);
          try{worker.terminate();}catch(_){}
          try{URL.revokeObjectURL(urlWorker);}catch(_){}
          reject(new Error(
            (ev && ev.message) ||
            "No se pudo iniciar la lectura optimizada del Excel"
          ));
        };

        // Se transfiere el ArrayBuffer sin copiarlo al Worker.
        worker.postMessage({buffer},[buffer]);

      }catch(error){
        if(timer) clearTimeout(timer);
        try{worker&&worker.terminate();}catch(_){}
        try{urlWorker&&URL.revokeObjectURL(urlWorker);}catch(_){}
        reject(error);
      }
    });
  }

  async function lecturaPrincipalV385(file,msg){
    // Se carga SheetJS en paralelo para que boFechaISO siga teniendo
    // disponible XLSX.SSF en casos de fechas numéricas.
    const libreriaMain=
      typeof boCargarXlsx==="function"
        ? boCargarXlsx().catch(()=>null)
        : Promise.resolve(null);

    if(typeof Worker==="function"){
      try{
        msg.textContent="Leyendo Excel en segundo plano...";
        await siguientePintado();

        const data=await leerExcelEnWorkerV385(file);
        await libreriaMain;

        msg.textContent="Validando filas detectadas...";
        await siguientePintado();

        const resultado=boExtraerRegistros(
          data.rows,
          data.filaEnc,
          data.heads
        );

        boAplicarLecturaLocal(
          resultado,
          file.name,
          `Hoja detectada: ${data.nombre} · lectura optimizada en segundo plano`
        );
        return;
      }catch(errorWorker){
        console.warn(
          "V385: Worker no disponible, usando lectura optimizada local",
          errorWorker
        );
      }
    }

    await libreriaMain;
    msg.textContent="Leyendo Excel con rango optimizado...";
    await siguientePintado();

    const buffer=await file.arrayBuffer();

    const wb=XLSX.read(buffer,{
      type:"array",
      cellDates:true,
      cellStyles:false,
      cellFormula:false,
      cellHTML:false,
      dense:false,
      bookVBA:false
    });

    await siguientePintado();

    const sel=boBuscarHojaValidaV385(wb);
    const resultado=boExtraerRegistros(
      sel.rows,
      sel.filaEnc,
      sel.heads
    );

    boAplicarLecturaLocal(
      resultado,
      file.name,
      `Hoja detectada: ${sel.nombre} · lectura optimizada por rango real`
    );
  }

  async function boLeerArchivoV385(){
    const msg=document.getElementById("boMensaje");
    const input=document.getElementById("boArchivo");
    const file=input && input.files ? input.files[0] : null;
    const boton=document.getElementById("boLeer");

    if(!file){
      if(msg){
        msg.className="bo-msg bo-error";
        msg.textContent="Seleccione un archivo.";
      }
      return;
    }

    try{
      if(boton) boton.disabled=true;
      if(msg){
        msg.className="bo-msg";
        msg.textContent="Preparando archivo...";
      }

      // Primero solo lee 50 KB para detectar los reportes HTML de Excel.
      const muestraBuffer=await file.slice(0,50000).arrayBuffer();
      const muestra=new TextDecoder("utf-8").decode(muestraBuffer);

      if(boEsIndiceExcelHtml(muestra)){
        BO_REGISTROS=[];
        const procesar=document.getElementById("boProcesar");
        if(procesar) procesar.disabled=true;

        const detalles=document.getElementById("boCompatibilidad");
        if(detalles) detalles.open=true;

        msg.className="bo-msg bo-warn";
        msg.textContent=
          `El archivo ${file.name} es solo el índice del reporte y no contiene las filas.\n`+
          `Seleccione debajo la carpeta complementaria que termina en _archivos. `+
          `El sistema leerá automáticamente sheet001.htm.`;
        return;
      }

      if(/\.html?$/i.test(file.name) || /^\s*<html/i.test(muestra)){
        msg.textContent="Leyendo tabla HTML...";
        await siguientePintado();

        if(typeof boCargarXlsx==="function"){
          await boCargarXlsx();
        }
        const texto=await file.text();
        boLeerHtmlCompleto(texto,file.name,"");
        return;
      }

      await lecturaPrincipalV385(file,msg);

    }catch(error){
      BO_REGISTROS=[];
      const procesar=document.getElementById("boProcesar");
      if(procesar) procesar.disabled=true;

      if(msg){
        msg.className="bo-msg bo-error";
        msg.textContent=
          (error && error.message
            ? error.message
            : "No se pudo leer el archivo.")+
          " Si el reporte viene con una carpeta _archivos, selecciónela en la opción abierta debajo.";
      }
    }finally{
      if(boton) boton.disabled=false;
    }
  }

  function instalarV385(){
    if(
      typeof window.boLeerArchivo!=="function" &&
      typeof boLeerArchivo!=="function"
    ){
      return false;
    }

    window.boWorksheetAMatrizCompleta=boWorksheetAMatrizCompletaV385;
    window.boBuscarHojaValida=boBuscarHojaValidaV385;
    window.boLeerArchivo=boLeerArchivoV385;

    try{boWorksheetAMatrizCompleta=boWorksheetAMatrizCompletaV385;}catch(_){}
    try{boBuscarHojaValida=boBuscarHojaValidaV385;}catch(_){}
    try{boLeerArchivo=boLeerArchivoV385;}catch(_){}

    return true;
  }

  let intentos=0;
  const timer=setInterval(()=>{
    intentos++;
    if(instalarV385() || intentos>80){
      clearInterval(timer);
    }
  },100);

  window.MV385_BASE_OPERATIVA_OK=true;
})();