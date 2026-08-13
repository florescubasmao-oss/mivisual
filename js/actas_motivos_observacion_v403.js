/* ============================================================
   MI VISUAL V403 - MOTIVOS DE OBSERVACIÓN DE ACTAS

   Sustituye el prompt libre por un selector amigable para:
   - Responsable de Almacén
   - Jefatura de Almacén

   El backend continúa guardando motivoObservacion en las mismas
   columnas existentes. No cambia estructura ni validaciones.
============================================================ */
(function(){
  "use strict";

  if(window.MV403_MOTIVOS_OBSERVACION_OK) return;

  const validarActaBase = window.validarActa;

  const MOTIVOS = [
    "CÓDIGO DE PEDIDO ERRADO",
    "ACTA CON SOMBRAS / COLORES ALTERADOS",
    "NÚMERO DE ACTA ERRADO",
    "DATOS FALTANTES EN ACTA FÍSICA (CÓD. PEDIDO - DNI - DATOS CLIENTE)",
    "ACTA BORROSA / MAL ENCUADRADA"
  ];

  function esc(v){
    if(typeof limpiarHtmlActas==="function"){
      return limpiarHtmlActas(v||"");
    }
    return String(v||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function estilos(){
    if(document.getElementById("mv403MotivosCss")) return;

    const s=document.createElement("style");
    s.id="mv403MotivosCss";
    s.textContent=`
      .mv403-observacion-overlay{
        position:fixed;inset:0;z-index:100000;
        background:rgba(15,23,42,.76);
        display:flex;align-items:center;justify-content:center;
        padding:14px;
      }
      .mv403-observacion-box{
        width:min(560px,100%);
        max-height:90vh;overflow:auto;
        background:#fff;color:#0f172a;
        border-radius:18px;padding:17px;
        box-shadow:0 24px 70px rgba(0,0,0,.35);
      }
      .mv403-observacion-box h3{
        margin:0 0 5px;font-size:20px;
      }
      .mv403-observacion-box p{
        margin:0 0 13px;color:#64748b;font-size:12px;
      }
      .mv403-motivos{
        display:grid;gap:8px;
      }
      .mv403-motivo{
        display:flex;gap:9px;align-items:flex-start;
        border:1px solid #cbd5e1;border-radius:12px;
        padding:10px;background:#f8fafc;cursor:pointer;
        font-size:12px;font-weight:850;
      }
      .mv403-motivo:hover{
        border-color:#2563eb;background:#eff6ff;
      }
      .mv403-motivo input{
        margin-top:2px;transform:scale(1.15);
      }
      .mv403-otro{
        margin-top:10px;
      }
      .mv403-otro label{
        display:block;font-size:11px;font-weight:900;margin-bottom:5px;
      }
      .mv403-otro textarea{
        width:100%;box-sizing:border-box;min-height:74px;
        resize:vertical;border:1px solid #cbd5e1;border-radius:10px;
        padding:10px;font:inherit;
      }
      .mv403-actions{
        display:flex;gap:8px;justify-content:flex-end;
        flex-wrap:wrap;margin-top:14px;
      }
      .mv403-actions button{
        border:0;border-radius:10px;padding:10px 15px;
        font-weight:900;cursor:pointer;
      }
      .mv403-cancelar{
        background:#e2e8f0;color:#0f172a;
      }
      .mv403-aceptar{
        background:#2563eb;color:white;
      }
      .mv403-error{
        display:none;margin-top:8px;padding:8px 10px;
        background:#fee2e2;color:#991b1b;border-radius:9px;
        font-size:11px;font-weight:900;
      }
    `;
    document.head.appendChild(s);
  }

  function pedirMotivoObservacionV403(){
    estilos();

    return new Promise(resolve=>{
      const overlay=document.createElement("div");
      overlay.className="mv403-observacion-overlay";
      overlay.id="mv403ObservacionModal";

      overlay.innerHTML=`
        <div class="mv403-observacion-box">
          <h3>⚠️ Motivo de observación</h3>
          <p>Seleccione el motivo por el cual el acta será observada.</p>

          <div class="mv403-motivos">
            ${MOTIVOS.map((m,i)=>`
              <label class="mv403-motivo">
                <input
                  type="radio"
                  name="mv403Motivo"
                  value="${esc(m)}"
                  ${i===0?"checked":""}
                >
                <span>${esc(m)}</span>
              </label>
            `).join("")}

            <label class="mv403-motivo">
              <input
                type="radio"
                name="mv403Motivo"
                value="OTRO"
                id="mv403RadioOtro"
              >
              <span>OTRO</span>
            </label>
          </div>

          <div class="mv403-otro" id="mv403OtroWrap" style="display:none">
            <label>DETALLE DEL OTRO MOTIVO</label>
            <textarea
              id="mv403OtroTexto"
              maxlength="500"
              placeholder="Escriba el motivo de observación..."
            ></textarea>
          </div>

          <div class="mv403-error" id="mv403Error"></div>

          <div class="mv403-actions">
            <button class="mv403-cancelar" type="button" id="mv403Cancelar">
              Cancelar
            </button>
            <button class="mv403-aceptar" type="button" id="mv403Aceptar">
              Aceptar observación
            </button>
          </div>
        </div>`;

      document.body.appendChild(overlay);

      const otroWrap=overlay.querySelector("#mv403OtroWrap");
      const otroTexto=overlay.querySelector("#mv403OtroTexto");
      const error=overlay.querySelector("#mv403Error");

      overlay.querySelectorAll('input[name="mv403Motivo"]').forEach(radio=>{
        radio.addEventListener("change",()=>{
          const esOtro=radio.checked && radio.value==="OTRO";
          otroWrap.style.display=esOtro?"block":"none";
          if(esOtro){
            setTimeout(()=>otroTexto.focus(),50);
          }
          error.style.display="none";
        });
      });

      function cerrar(valor){
        overlay.remove();
        resolve(valor);
      }

      overlay.querySelector("#mv403Cancelar").onclick=()=>cerrar("");

      overlay.querySelector("#mv403Aceptar").onclick=()=>{
        const seleccionado=overlay.querySelector(
          'input[name="mv403Motivo"]:checked'
        );

        if(!seleccionado){
          error.textContent="Seleccione un motivo.";
          error.style.display="block";
          return;
        }

        if(seleccionado.value==="OTRO"){
          const detalle=(otroTexto.value||"").trim();

          if(!detalle){
            error.textContent="Escriba el detalle del motivo.";
            error.style.display="block";
            otroTexto.focus();
            return;
          }

          cerrar("OTRO: "+detalle);
          return;
        }

        cerrar(seleccionado.value);
      };

      overlay.addEventListener("click",e=>{
        if(e.target===overlay) cerrar("");
      });
    });
  }

  async function validarActaV403(id,resultado){
    const u=usuarioActualActas();
    let motivo="";

    if(resultado==="OBSERVADO"){
      motivo=await pedirMotivoObservacionV403();

      if(!motivo) return;
    }else{
      const texto=esJefaturaAlmacenActas(u.perfil)
        ? "¿Confirmar acta correcta y finalizar?"
        : "¿Confirmar primera validación correcta?";

      if(!confirm(texto)) return;
    }

    try{
      await apiActas({
        accion:"validarActaEscaneada",
        usuario:u.usuario,
        id:id,
        resultado:resultado,
        motivoObservacion:motivo
      });

      alert("✅ Validación registrada.");

      const vista=obtenerEstadoVistaActas();
      await cargarActas(vista);

    }catch(err){
      alert("❌ "+err.message);
    }
  }

  estilos();

  // Se reemplaza solamente la interacción del botón Validar/Observar.
  // El backend y sus reglas permanecen intactos.
  if(typeof validarActaBase==="function"){
    window.validarActa=validarActaV403;
    try{validarActa=validarActaV403}catch(_){}
  }

  window.pedirMotivoObservacionV403=pedirMotivoObservacionV403;
  window.MV403_MOTIVOS_OBSERVACION_OK=true;

  console.log("MI VISUAL V403: catálogo de motivos de observación habilitado.");
})();