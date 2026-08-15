/* ============================================================
   MI VISUAL V408 - Mapa Operativo para trabajo de campo
   - Búsqueda: Código de orden / DNI / Código de pedido.
   - Nueva opción "Ubicarme en el mapa" para todos los perfiles
     que ya tienen permiso VER en Mapa Operativo.
   - Ubicación + CTO: muestra únicamente CTO a <= 1 km.
   - Sin Ubicación: "Mostrar CTO cercanas" conserva el comportamiento
     anterior por área visible del mapa.
   - No modifica importación ni marcadores de órdenes.
============================================================ */
(function(){
  "use strict";
  if(window.MV408_MAPA_CAMPO_OK) return;

  const mostrarBase = window.mostrarMapaOperativo;
  const ctosBase = window.moCargarCtosCercanas;
  const limpiarBase = window.moLimpiarFiltros;

  const ubicacion = {
    activa:false,
    solicitando:false,
    lat:null,
    lng:null,
    precision:null,
    marcador:null,
    circulo:null
  };

  function mapaDisponible(){
    try{return typeof moMapa!=="undefined" && !!moMapa && typeof L!=="undefined";}catch(_){return false;}
  }

  function estadoUbicacion(texto,error){
    const e=document.getElementById("moUbicacionEstado");
    if(!e)return;
    e.textContent=texto||"Inactiva";
    e.style.background=error?"#fee2e2":"#dcfce7";
    e.style.color=error?"#b91c1c":"#166534";
  }

  function quitarCapasUbicacion(){
    try{
      if(ubicacion.marcador && mapaDisponible()) moMapa.removeLayer(ubicacion.marcador);
      if(ubicacion.circulo && mapaDisponible()) moMapa.removeLayer(ubicacion.circulo);
    }catch(_){}
    ubicacion.marcador=null;
    ubicacion.circulo=null;
  }

  function limpiarUbicacion(){
    quitarCapasUbicacion();
    ubicacion.activa=false;
    ubicacion.solicitando=false;
    ubicacion.lat=null;
    ubicacion.lng=null;
    ubicacion.precision=null;
    const c=document.getElementById("moUbicarmeMapa");
    if(c)c.checked=false;
    estadoUbicacion("Inactiva",false);
  }

  function dibujarUbicacion(){
    if(!mapaDisponible() || !Number.isFinite(ubicacion.lat) || !Number.isFinite(ubicacion.lng))return;
    quitarCapasUbicacion();
    const punto=[ubicacion.lat,ubicacion.lng];
    ubicacion.circulo=L.circle(punto,{radius:1000,weight:2,fillOpacity:.06,interactive:false}).addTo(moMapa);
    ubicacion.marcador=L.circleMarker(punto,{radius:9,weight:4,fillOpacity:1})
      .bindTooltip("Mi ubicación",{permanent:false,direction:"top"})
      .bindPopup(`<div class="mo-popup"><div class="mo-main-row"><b>Mi ubicación</b><span>${ubicacion.lat.toFixed(6)}, ${ubicacion.lng.toFixed(6)}</span></div><div class="mo-main-row"><b>Radio CTO</b><span>1 km</span></div></div>`)
      .addTo(moMapa);
    try{moMapa.fitBounds(ubicacion.circulo.getBounds(),{padding:[24,24],maxZoom:16});}catch(_){}
  }

  function obtenerUbicacion(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation){reject(new Error("Este dispositivo no permite obtener la ubicación."));return;}
      navigator.geolocation.getCurrentPosition(
        pos=>resolve(pos),
        err=>{
          const mensajes={1:"Debe permitir el acceso a su ubicación.",2:"No se pudo determinar la ubicación actual.",3:"La ubicación tardó demasiado en responder."};
          reject(new Error(mensajes[err&&err.code]||"No se pudo obtener la ubicación."));
        },
        {enableHighAccuracy:true,timeout:15000,maximumAge:30000}
      );
    });
  }

  async function alternarUbicacion(check){
    if(!check?.checked){
      limpiarUbicacion();
      const cto=document.getElementById("moMostrarCtosCercanas");
      if(cto?.checked){
        try{await window.moCargarCtosCercanas();}catch(_){}
      }
      return;
    }
    if(ubicacion.solicitando)return;
    ubicacion.solicitando=true;
    check.disabled=true;
    estadoUbicacion("Ubicando...",false);
    try{
      const pos=await obtenerUbicacion();
      ubicacion.lat=Number(pos.coords.latitude);
      ubicacion.lng=Number(pos.coords.longitude);
      ubicacion.precision=Number(pos.coords.accuracy)||null;
      ubicacion.activa=true;
      dibujarUbicacion();
      estadoUbicacion(ubicacion.precision?`Activa · ±${Math.round(ubicacion.precision)} m`:"Activa",false);
      const cto=document.getElementById("moMostrarCtosCercanas");
      if(cto?.checked) await window.moCargarCtosCercanas();
    }catch(e){
      limpiarUbicacion();
      check.checked=false;
      estadoUbicacion(e?.message||"No disponible",true);
    }finally{
      ubicacion.solicitando=false;
      check.disabled=false;
    }
  }

  function distanciaMetros(lat1,lng1,lat2,lng2){
    const r=6371000,rad=Math.PI/180;
    const dLat=(lat2-lat1)*rad,dLng=(lng2-lng1)*rad;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLng/2)**2;
    return r*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  function cajaRadio(lat,lng,metros){
    const deltaLat=metros/111320;
    const cos=Math.max(.15,Math.cos(lat*Math.PI/180));
    const deltaLng=metros/(111320*cos);
    return {sur:lat-deltaLat,norte:lat+deltaLat,oeste:lng-deltaLng,este:lng+deltaLng};
  }

  async function cargarCtosV408(){
    const check=document.getElementById("moMostrarCtosCercanas");
    if(!check?.checked){
      if(typeof ctosBase==="function")return ctosBase.apply(this,arguments);
      try{if(typeof moOcultarCatalogoCto==="function")moOcultarCatalogoCto();}catch(_){}
      return;
    }

    if(!ubicacion.activa || !Number.isFinite(ubicacion.lat) || !Number.isFinite(ubicacion.lng)){
      if(typeof ctosBase==="function")return ctosBase.apply(this,arguments);
      return;
    }

    if(!mapaDisponible())return;
    check.disabled=true;
    try{
      if(typeof moEstadoCtosCercanas==="function")moEstadoCtosCercanas("Consultando 1 km...",false);
      const b=cajaRadio(ubicacion.lat,ubicacion.lng,1000);
      const d=await moApiLectura({
        accion:"listarCtosCercanasMapaOperativo",
        usuario:moUsuario(),
        sur:b.sur,norte:b.norte,oeste:b.oeste,este:b.este,
        sede:moNorm(document.getElementById("moFiltroSede")?.value),
        limite:1000
      });

      const lista=(d.ctos||[]).map(cto=>{
        const lat=Number(cto.latitud),lng=Number(cto.longitud);
        return Object.assign({},cto,{_distancia:distanciaMetros(ubicacion.lat,ubicacion.lng,lat,lng)});
      }).filter(cto=>Number.isFinite(cto._distancia)&&cto._distancia<=1000)
        .sort((a,b)=>a._distancia-b._distancia);

      if(typeof moCapaCatalogoCto!=="undefined" && moCapaCatalogoCto)moCapaCatalogoCto.clearLayers();
      lista.forEach(cto=>{
        const lat=Number(cto.latitud),lng=Number(cto.longitud);
        if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
        const popup=(typeof moPopupCatalogoCto==="function"?moPopupCatalogoCto(cto):"")+
          `<div style="margin-top:6px;font-weight:800">Distancia: ${Math.round(cto._distancia)} m</div>`;
        L.marker([lat,lng],{icon:moIconoCatalogoCto(cto),riseOnHover:true,zIndexOffset:700})
          .bindPopup(popup,{maxWidth:290})
          .addTo(moCapaCatalogoCto);
      });
      if(typeof moCapaCatalogoCto!=="undefined" && moCapaCatalogoCto && !moMapa.hasLayer(moCapaCatalogoCto))moCapaCatalogoCto.addTo(moMapa);
      try{moCatalogoCtoVisible=true;}catch(_){}
      if(typeof moEstadoCtosCercanas==="function")moEstadoCtosCercanas(`${lista.length} en 1 km`,false);
      dibujarUbicacion();
    }catch(e){
      if(typeof moEstadoCtosCercanas==="function")moEstadoCtosCercanas(e?.message||"No se pudieron cargar",true);
    }finally{check.disabled=false;}
  }

  function instalarControles(){
    const input=document.getElementById("moBuscarCodigo");
    if(input){
      const bloque=input.closest("div");
      const label=bloque?.querySelector(".mo-label");
      if(label)label.textContent="Código de orden / DNI / Código de pedido";
      input.placeholder="Ingrese cualquiera de estos datos";
      input.title="Puede buscar por Código de orden, DNI o Código de pedido";
    }

    const controles=document.querySelector("#moVistaFiltros .mo-controles-visibilidad");
    if(controles && !document.getElementById("moUbicarmeMapa")){
      const label=document.createElement("label");
      label.className="mo-cto-cercanas-opcion mv408-ubicacion-opcion";
      label.innerHTML='<input id="moUbicarmeMapa" type="checkbox"><span>Ubicarme en el mapa</span><em id="moUbicacionEstado">Inactiva</em>';
      controles.appendChild(label);
      const check=label.querySelector("#moUbicarmeMapa");
      if(check)check.addEventListener("change",()=>alternarUbicacion(check));
    }

    const ayuda=document.querySelector("#moVistaFiltros .mo-identificacion-control small");
    if(ayuda){
      ayuda.textContent="Sin ubicación, las CTO se muestran según el área visible. Con Ubicarme + CTO, solo se muestran CTO hasta 1 km de su posición.";
    }

    if(ubicacion.activa){dibujarUbicacion();estadoUbicacion("Activa",false);}
  }

  async function mostrarV408(){
    const r=typeof mostrarBase==="function"?await mostrarBase.apply(this,arguments):undefined;
    setTimeout(instalarControles,0);
    return r;
  }

  function limpiarV408(){
    limpiarUbicacion();
    return typeof limpiarBase==="function"?limpiarBase.apply(this,arguments):undefined;
  }

  window.mostrarMapaOperativo=mostrarV408;
  try{mostrarMapaOperativo=mostrarV408}catch(_){}
  window.moCargarCtosCercanas=cargarCtosV408;
  try{moCargarCtosCercanas=cargarCtosV408}catch(_){}
  window.moLimpiarFiltros=limpiarV408;
  try{moLimpiarFiltros=limpiarV408}catch(_){}
  window.moAlternarUbicacionV408=alternarUbicacion;
  window.MV408_MAPA_CAMPO_OK=true;
})();
