/* V638 asistencia: motor puro, sin acceso a hojas ni mutaciones de producción.
   La integración deberá pasar entradas solo de importaciones confirmadas posteriores
   a las 08:20 (America/Lima). No inferir hora de asignación ni marcar F automáticamente. */
(function(root,factory){
  var api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.MV638Asistencia=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  function txt(x){return x==null?"":String(x).trim();}
  function norm(x){return txt(x).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");}
  function fechaHora(valor){
    if(valor instanceof Date){
      if(!Number.isFinite(valor.getTime()))return null;
      return {fecha:[valor.getFullYear(),String(valor.getMonth()+1).padStart(2,"0"),String(valor.getDate()).padStart(2,"0")].join("-"),segundos:valor.getHours()*3600+valor.getMinutes()*60+valor.getSeconds()};
    }
    var m=txt(valor).match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if(m){var d=m[3]+"-"+m[2]+"-"+m[1],h=+m[4],min=+m[5],s=+(m[6]||0);return h<24&&min<60&&s<60?{fecha:d,segundos:h*3600+min*60+s}:null;}
    m=txt(valor).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if(m){var h2=+m[4],min2=+m[5],s2=+(m[6]||0);return h2<24&&min2<60&&s2<60?{fecha:m[1]+"-"+m[2]+"-"+m[3],segundos:h2*3600+min2*60+s2}:null;}
    return null;
  }
  function hora(seg){return [Math.floor(seg/3600),Math.floor(seg%3600/60),seg%60].map(n=>String(n).padStart(2,"0")).join(":");}
  function estadoPorSegundos(s){return s<=8*3600+5*60?"A":s<=8*3600+15*60?"T":"TD";}
  function calcular(registros,opciones){
    var o=opciones||{},salida=new Map(),vistos=new Set(),admitidas=0;
    (Array.isArray(registros)?registros:[]).forEach(function(r){
      if(!r)return;
      // Sólo ingresos explícitamente confirmados por la futura ruta de captura.
      // En producción el backend debe verificar el momento real, jamás confiar en el frontend.
      var ing=fechaHora(r.momentoCargaConfirmada);
      if(!ing||ing.segundos<=8*3600+20*60)return;
      var cuadrilla=norm(r.cuadrilla),id=txt(r.ordenId),inicio=fechaHora(r.fechaInicioVisita);
      if(!cuadrilla||!id||!inicio||!/^P\s*\d+\b/.test(cuadrilla))return;
      var tramo=txt(r.horaSolicitud);
      if(!/^0?8:00(?::00)?$/.test(tramo))return;
      var dia=txt(o.fecha)||inicio.fecha;
      if(inicio.fecha!==dia)return;
      // Si hay duplicado de la misma orden con corrección, tomar la hora
      // más temprana que ha sido efectivamente confirmada por captura.
      var ordenKey=dia+"|"+cuadrilla+"|"+id+"|"+hora(inicio.segundos);
      if(vistos.has(ordenKey))return;
      vistos.add(ordenKey);admitidas++;
      var key=dia+"|"+cuadrilla,prev=salida.get(key);
      if(!prev||inicio.segundos<prev.segundos||(inicio.segundos===prev.segundos&&id<prev.ordenId)){
        salida.set(key,{fecha:dia,cuadrilla:cuadrilla,ordenId:id,horaInicio:hora(inicio.segundos),segundos:inicio.segundos,estado:estadoPorSegundos(inicio.segundos),fuente:"MAPA_OPERATIVO",requiereValidacion:false});
      }
    });
    return {registros:Array.from(salida.values()).sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.cuadrilla.localeCompare(b.cuadrilla)),ordenesAdmitidas:admitidas};
  }
  function estadoVisual(programacion,automatico,excepcion){
    var p=norm(programacion),e=norm(excepcion&&excepcion.estado);
    if(p==="DESCANSO"||p==="VACACIONES"||p==="SIN ACTIVIDAD")return {codigo:p==="DESCANSO"?"D":p==="VACACIONES"?"V":"SA",fuente:"PROGRAMACION",discrepancia:!!automatico};
    if(e==="F"&&excepcion&&excepcion.validadoPorSupervisor===true)return {codigo:"F",fuente:"SUPERVISOR"};
    if(e==="PV"||e==="ASIGNACION TARDIA")return {codigo:"PV",fuente:"SUPERVISOR"};
    return automatico?{codigo:automatico.estado,fuente:"MAPA_OPERATIVO",ordenId:automatico.ordenId,horaInicio:automatico.horaInicio}:{codigo:"PV",fuente:"PENDIENTE"};
  }
  function perfilAmpliado(perfil){
    return ["TECNICO","SUPERVISOR","JEFATURA","GERENCIA","GERENCIA LIMA","GERENCIA GENERAL"].includes(norm(perfil));
  }
  return Object.freeze({calcular:calcular,estadoVisual:estadoVisual,perfilAmpliado:perfilAmpliado,fechaHora:fechaHora,estadoPorSegundos:estadoPorSegundos});
});
