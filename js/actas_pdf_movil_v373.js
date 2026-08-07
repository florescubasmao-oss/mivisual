/* MI VISUAL V373 - Gestión de Actas: PDF móvil robusto */
(function(){
  "use strict";
  if(window.MV373_PDF_ACTAS_MOVIL_OK) return;

  function parecePdf(file){
    const mime=String(file?.type||"").toLowerCase().trim();
    const nombre=String(file?.name||"").toLowerCase().trim();
    return mime.includes("pdf") || /\.pdf$/i.test(nombre);
  }

  async function firmaPdf(file){
    try{
      const trozo=file.slice(0,1024);
      const buffer=typeof trozo.arrayBuffer==="function"
        ? await trozo.arrayBuffer()
        : await new Promise((resolve,reject)=>{
            const r=new FileReader();
            r.onload=()=>resolve(r.result);
            r.onerror=()=>reject(r.error);
            r.readAsArrayBuffer(trozo);
          });
      const bytes=new Uint8Array(buffer);
      let txt="";
      for(let i=0;i<bytes.length;i++) txt+=String.fromCharCode(bytes[i]);
      return txt.includes("%PDF-");
    }catch(_){
      return false;
    }
  }

  function nombrePdf(file){
    const nombre=String(file?.name||"acta.pdf").trim()||"acta.pdf";
    return /\.pdf$/i.test(nombre)?nombre:`${nombre}.pdf`;
  }

  function leerPdfRobusto(file){
    return new Promise(async (resolve,reject)=>{
      try{
        if(!file) return reject(new Error("Debe seleccionar un PDF"));
        const valido=parecePdf(file) || await firmaPdf(file);
        if(!valido){
          return reject(new Error(
            "El archivo seleccionado no se reconoce como PDF. Selecciónelo nuevamente desde Archivos o Descargas."
          ));
        }

        const reader=new FileReader();
        reader.onerror=()=>reject(reader.error||new Error("No se pudo leer el PDF."));
        reader.onload=()=>{
          const data=String(reader.result||"");
          const pos=data.indexOf(",");
          if(pos<0) return reject(new Error("No se pudo preparar el PDF."));
          resolve({
            base64:data.slice(pos+1),
            nombre:nombrePdf(file),
            mime:"application/pdf"
          });
        };
        reader.readAsDataURL(file);
      }catch(e){ reject(e); }
    });
  }

  function aplicar(){
    if(typeof window.leerPdfActa==="function" && !window.leerPdfActa.__mv373){
      leerPdfRobusto.__mv373=true;
      leerPdfRobusto.__original=window.leerPdfActa;
      window.leerPdfActa=leerPdfRobusto;
      try{ leerPdfActa=leerPdfRobusto; }catch(_){}
      return true;
    }
    return !!window.leerPdfActa?.__mv373;
  }

  aplicar();
  let i=0;
  const t=setInterval(()=>{
    i++;
    if(aplicar()||i>40) clearInterval(t);
  },100);

  window.MV373_PDF_ACTAS_MOVIL_OK=true;
  console.log("MI VISUAL V373: validación PDF móvil robusta habilitada.");
})();