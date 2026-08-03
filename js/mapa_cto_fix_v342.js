/* =====================================================
   MI VISUAL V342 - Corrección de coordenadas CTO
   Admite los formatos entregados por WIN:
   - -6.782248,-79.893670
   - -6.782248-79.893670
   - Caja: WN-... Latitud: -6.782248 Longitud: -79.893670
===================================================== */
(function(){
  "use strict";

  function numeroMapaCtoV342(valor){
    const n = Number(String(valor ?? "").trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function coordenadaValidaV342(lat, lng){
    if(typeof window.moCoordenadaValida === "function"){
      return window.moCoordenadaValida(lat, lng);
    }
    return Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  function extraerParCoordenadasV342(valor){
    const texto = String(valor ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/[()]/g, " ")
      .trim();

    if(!texto) return [null, null];

    // Formato: Caja: ... Latitud: -6.760646Longitud: -79.839844
    let match = texto.match(
      /LATITUD\s*:?\s*(-?\d+(?:[.,]\d+)?)\s*.*?LONGITUD\s*:?\s*(-?\d+(?:[.,]\d+)?)/i
    );
    if(match){
      const lat = numeroMapaCtoV342(match[1]);
      const lng = numeroMapaCtoV342(match[2]);
      if(coordenadaValidaV342(lat, lng)) return [lat, lng];
    }

    // Formato convencional con coma, punto y coma o espacio.
    match = texto.match(
      /(-?\d{1,2}(?:[.,]\d+))\s*[,;| ]+\s*(-?\d{2,3}(?:[.,]\d+))/
    );
    if(match){
      const lat = numeroMapaCtoV342(match[1]);
      const lng = numeroMapaCtoV342(match[2]);
      if(coordenadaValidaV342(lat, lng)) return [lat, lng];
    }

    // Formato concatenado: -6.782248-79.893670
    match = texto.match(
      /(-?\d{1,2}(?:[.,]\d+))\s*(-\d{2,3}(?:[.,]\d+))/
    );
    if(match){
      const lat = numeroMapaCtoV342(match[1]);
      const lng = numeroMapaCtoV342(match[2]);
      if(coordenadaValidaV342(lat, lng)) return [lat, lng];
    }

    // Respaldo: toma el último par numérico válido para evitar confundir
    // los números que forman parte del código de la caja CTO.
    const numeros = texto.match(/-?\d+(?:[.,]\d+)?/g) || [];
    for(let i = numeros.length - 2; i >= 0; i--){
      const lat = numeroMapaCtoV342(numeros[i]);
      const lng = numeroMapaCtoV342(numeros[i + 1]);
      if(coordenadaValidaV342(lat, lng)) return [lat, lng];
    }

    return [null, null];
  }

  function codigoCajaV342(valor){
    const texto = String(valor ?? "").replace(/\u00a0/g, " ");
    const match = texto.match(/\bCAJA\s*:\s*([A-Z0-9][A-Z0-9-]*)/i);
    return match ? match[1].trim() : "";
  }

  function aplicarFixMapaCtoV342(){
    if(typeof window.moNorm !== "function") return false;

    if(window.moCoord && window.moCoord.__mv342MapaCto) return true;

    const coordCorregida = function(valor){
      return extraerParCoordenadasV342(valor);
    };
    coordCorregida.__mv342MapaCto = true;

    window.moCoord = coordCorregida;

    window.moCoordCto = function(valor){
      const par = extraerParCoordenadasV342(valor);
      return coordenadaValidaV342(par[0], par[1]) ? `${par[0]},${par[1]}` : "";
    };

    window.moExtraerDatosCto = function(texto){
      const campos = {};
      window.moNorm(texto).split(";").forEach(segmento => {
        const partes = segmento.split("/");
        if(partes.length < 3) return;
        const clave = typeof window.moNormCab === "function"
          ? window.moNormCab(partes.shift())
          : String(partes.shift() || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        partes.shift();
        const valor = window.moNorm(partes.join("/"));
        if(clave && valor && !campos[clave]) campos[clave] = valor;
      });

      const coord1Raw = campos.COORDENADACTO1 || "";
      const coord2Raw = campos.COORDENADACTO2 || "";
      const coord3Raw = campos.COORDENADACTO3 || "";

      return {
        cto1: window.moNorm(campos.CTO1 || codigoCajaV342(coord1Raw)),
        coordenadaCto1: window.moCoordCto(coord1Raw),
        cto2: window.moNorm(campos.CTO2 || codigoCajaV342(coord2Raw)),
        coordenadaCto2: window.moCoordCto(coord2Raw),
        cto3: window.moNorm(campos.CTO3 || codigoCajaV342(coord3Raw)),
        coordenadaCto3: window.moCoordCto(coord3Raw),
        cto: window.moNorm(campos.CTO),
        puerto: window.moNorm(campos.PUERTO)
      };
    };

    window.MV342_MAPA_CTO_OK = true;
    console.log("MI VISUAL V342: coordenadas CTO habilitadas.");
    return true;
  }

  window.mv342AplicarFixMapaCto = aplicarFixMapaCtoV342;

  if(aplicarFixMapaCtoV342()) return;

  const observarScripts = new MutationObserver(function(cambios){
    cambios.forEach(function(cambio){
      Array.from(cambio.addedNodes || []).forEach(function(nodo){
        if(nodo && nodo.tagName === "SCRIPT" &&
           String(nodo.src || "").includes("mapa_operativo.js")){
          nodo.addEventListener("load", function(){
            if(aplicarFixMapaCtoV342()) observarScripts.disconnect();
          }, {once:true});
        }
      });
    });
  });

  observarScripts.observe(document.documentElement, {childList:true, subtree:true});

  // Respaldo para conexiones muy rápidas o scripts ya insertados.
  const verificador = setInterval(function(){
    if(aplicarFixMapaCtoV342()){
      clearInterval(verificador);
      observarScripts.disconnect();
    }
  }, 400);
})();
