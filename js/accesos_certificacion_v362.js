/* ============================================================
   MI VISUAL V362 - MI CERTIFICACIÓN WIN
   - Carpeta visible para todos los perfiles dentro de Accesos.
   - Conserva todos los recursos existentes de la hoja ACCESOS.
   - No realiza consultas adicionales.
============================================================ */
(function(){
  "use strict";

  if(window.MV362_CERTIFICACION_WIN_OK) return;

  const CERTIFICACIONES_WIN_V362 = [
    {
      nombre:"Examen de Seguridad",
      modulo:"MÓDULO 1",
      icono:"🛡️",
      link:"https://forms.cloud.microsoft/r/Aipf21LSuj"
    },
    {
      nombre:"Examen de Lineamientos",
      modulo:"MÓDULO 2",
      icono:"📋",
      link:"https://forms.cloud.microsoft/r/kZeZUUAgac"
    },
    {
      nombre:"Examen de Protocolos",
      modulo:"MÓDULO 3",
      icono:"🧭",
      link:"https://forms.cloud.microsoft/r/LQfnve4sVw"
    },
    {
      nombre:"Examen de Aplicativos",
      modulo:"MÓDULO 4",
      icono:"💻",
      link:"https://forms.cloud.microsoft/r/WuCY8CxCsv"
    },
    {
      nombre:"Certificación Unificada",
      modulo:"EVALUACIÓN INTEGRAL",
      icono:"🏆",
      destacado:true,
      link:"https://forms.cloud.microsoft/pages/responsepage.aspx?id=B1bL-kMKCUSswbHiafr3qJwY5T47pQtCtqjGvrus3WhUM1pJUkw4QUFGNU1WUUg0S0Q2N0ZVRlRFTi4u&route=shorturl"
    }
  ];

  function escaparV362(valor){
    return String(valor ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function estilosCarpetaV362(){
    if(document.getElementById("mv362EstilosCertificacion")) return;

    const style = document.createElement("style");
    style.id = "mv362EstilosCertificacion";
    style.textContent = `
      .mv362-folder-card{
        width:100%;
        min-height:112px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:7px;
        padding:16px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:15px;
        background:linear-gradient(135deg,#174f8f,#12365f);
        color:#fff;
        font:inherit;
        cursor:pointer;
        box-shadow:0 8px 18px rgba(0,0,0,.18);
        transition:transform .18s ease,box-shadow .18s ease;
      }
      .mv362-folder-card:hover{
        transform:translateY(-2px);
        box-shadow:0 12px 24px rgba(0,0,0,.25);
      }
      .mv362-folder-card span{font-size:30px;line-height:1;}
      .mv362-folder-card b{font-size:14px;text-align:center;}
      .mv362-folder-card small{font-size:10px;color:#d5e9ff;text-align:center;}
      .mv362-cert-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:12px;
      }
      .mv362-cert-card{
        min-height:135px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:6px;
        padding:17px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:16px;
        background:#1b365c;
        color:#fff;
        text-decoration:none;
        text-align:center;
        box-shadow:0 7px 18px rgba(0,0,0,.17);
        transition:transform .18s ease,background .18s ease;
      }
      .mv362-cert-card:hover{
        transform:translateY(-2px);
        background:#234876;
      }
      .mv362-cert-card.destacado{
        grid-column:1/-1;
        background:linear-gradient(135deg,#8a5b00,#c18400);
      }
      .mv362-cert-card .icono{font-size:31px;line-height:1;}
      .mv362-cert-card .modulo{
        font-size:10px;
        font-weight:900;
        color:#b9d9ff;
        letter-spacing:.5px;
      }
      .mv362-cert-card.destacado .modulo{color:#fff0bb;}
      .mv362-cert-card b{font-size:14px;line-height:1.25;}
      .mv362-cert-card small{font-size:10px;color:#d4e5f8;}
      .mv362-info{
        margin-bottom:14px;
        padding:13px;
        border:1px solid #315577;
        border-radius:14px;
        background:#12304f;
        color:#d8eaff;
        font-size:12px;
        line-height:1.45;
      }
      .mv362-volver{
        margin-top:15px;
        width:100%;
        border:0;
        border-radius:12px;
        padding:12px 15px;
        background:#1677e8;
        color:#fff;
        font-weight:900;
        cursor:pointer;
      }
      @media(max-width:650px){
        .mv362-cert-grid{grid-template-columns:1fr;}
        .mv362-cert-card.destacado{grid-column:auto;}
      }
    `;
    document.head.appendChild(style);
  }

  function inyectarCarpetaCertificacionV362(){
    estilosCarpetaV362();

    const pagina = document.querySelector(".mv55-resource-page");
    if(!pagina || document.getElementById("mv362CarpetaCertificacion")) return;

    const seccion = document.createElement("section");
    seccion.id = "mv362CarpetaCertificacion";
    seccion.className = "mv55-resource-group";
    seccion.setAttribute("data-resource-group","");
    seccion.innerHTML = `
      <h3>🏆 Certificación WIN</h3>
      <div class="mv55-resource-grid">
        <button
          type="button"
          class="mv362-folder-card"
          data-resource-item
          data-search="MI CERTIFICACION WIN EXAMEN SEGURIDAD LINEAMIENTOS PROTOCOLOS APLICATIVOS UNIFICADA"
          onclick="mostrarMiCertificacionWin()"
        >
          <span>📁</span>
          <b>MI CERTIFICACIÓN WIN</b>
          <small>4 módulos y certificación unificada · Disponible para todos</small>
        </button>
      </div>
    `;

    const cabecera = pagina.querySelector(".mv55-resource-head");
    if(cabecera && cabecera.nextSibling){
      pagina.insertBefore(seccion,cabecera.nextSibling);
    }else{
      pagina.appendChild(seccion);
    }
  }

  function mostrarMiCertificacionWinV362(){
    estilosCarpetaV362();

    const tarjetas = CERTIFICACIONES_WIN_V362.map(item=>`
      <a
        class="mv362-cert-card${item.destacado ? " destacado" : ""}"
        href="${escaparV362(item.link)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span class="icono">${item.icono}</span>
        <span class="modulo">${escaparV362(item.modulo)}</span>
        <b>${escaparV362(item.nombre)}</b>
        <small>Abrir evaluación</small>
      </a>
    `).join("");

    mostrarPantalla(`
      <div class="mv55-resource-page">
        <div class="mv55-resource-head">
          <h2>🏆 MI CERTIFICACIÓN WIN</h2>
          <p>Accede a los cuatro módulos de evaluación y a la certificación unificada.</p>
        </div>

        <div class="mv362-info">
          <b>Disponible para todos los perfiles.</b><br>
          Cada evaluación se abre en una pestaña nueva para no cerrar MI VISUAL.
        </div>

        <section class="mv55-resource-group">
          <h3>📘 Evaluaciones de certificación</h3>
          <div class="mv362-cert-grid">
            ${tarjetas}
          </div>
        </section>

        <button type="button" class="mv362-volver" onclick="mostrarAccesos()">
          ⬅️ Volver a Accesos
        </button>
      </div>
    `);
  }

  const mostrarAccesosBaseV362 = window.mostrarAccesos;

  async function mostrarAccesosV362(){
    if(typeof mostrarAccesosBaseV362 !== "function"){
      throw new Error("No se encontró el módulo base de Accesos.");
    }

    const resultado = await mostrarAccesosBaseV362.apply(this,arguments);
    inyectarCarpetaCertificacionV362();
    requestAnimationFrame(inyectarCarpetaCertificacionV362);
    return resultado;
  }

  window.mostrarMiCertificacionWin = mostrarMiCertificacionWinV362;
  window.mostrarAccesos = mostrarAccesosV362;
  window.MV362_CERTIFICACION_WIN_OK = true;

  console.log("MI VISUAL V362: carpeta MI CERTIFICACIÓN WIN habilitada para todos.");
})();
