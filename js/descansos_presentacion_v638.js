/* V638: presentación segura; no se conecta ni escribe a la API por sí misma.
   Solo acepta una instantánea AUTORIZADA por el backend, completa para su rango.
   Mientras no exista esa fuente, las pantallas originales no cambian. */
(function(w){
"use strict";
const codigos={A:["Asistencia","#16a34a"],T:["Tardanza","#eab308"],TD:["Tardanza desfasada","#ea580c"],F:["Falta","#dc2626"],PV:["Pendiente de validación","#64748b"],D:["Descanso","#2563eb"],V:["Vacaciones","#7c3aed"],SA:["Sin actividad","#0891b2"]};
const perfiles=["TECNICO","SUPERVISOR","JEFATURA","GERENCIA","GERENCIA LIMA","GERENCIA GENERAL"];
function norm(x){return String(x||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
function perfil(){return norm(localStorage.getItem("perfil"));}
function visible(){return perfiles.includes(perfil());}
function fuente(){const d=w.MV638_ASISTENCIA_DIARIA;return d&&d.validadaBackend===true&&Array.isArray(d.registros)?d:null;}
function celda(cuadrilla,fecha,estadoBase,tipo){
 if(!visible()||norm(tipo)!=="CUADRILLA")return null;
 const d=fuente();if(!d)return null;
 const reg=d.registros.find(x=>x.fecha===fecha&&norm(x.cuadrilla)===norm(cuadrilla));
 const p=norm(estadoBase);let codigo="";
 if(p==="DESCANSO")codigo="D";else if(p==="VACACIONES")codigo="V";else if(p==="SIN ACTIVIDAD")codigo="SA";
 else if(reg&&codigos[reg.codigo])codigo=reg.codigo;
 // Jamás inferir PV/F cuando el backend no haya entregado la fecha y la cuadrilla.
 if(!codigo)return null;
 const a=codigos[codigo];return {codigo,color:a[1],titulo:a[0]+(reg&&reg.horaInicio?" · "+reg.horaInicio:"")+(reg&&reg.ordenId?" · Orden "+reg.ordenId:""),discrepancia:["D","V","SA"].includes(codigo)&&!!(reg&&reg.horaInicio)};
}
w.mv638CeldaDescansos=celda;
w.mv638LeyendaDescansos=function(){
 if(!visible()||!fuente())return "";
 return '<div class="pd-note mv638-leyenda" style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0">'+
 Object.keys(codigos).map(k=>'<span style="display:inline-flex;gap:4px;align-items:center"><b style="background:'+codigos[k][1]+';color:#fff;border-radius:4px;padding:3px 6px">'+k+'</b>'+codigos[k][0]+'</span>').join("")+'</div>';
};
})(window);
