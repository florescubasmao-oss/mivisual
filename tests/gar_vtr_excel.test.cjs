"use strict";
const fs=require("node:fs");
const {execFileSync}=require("node:child_process");

async function runExportTests(source, original) {
  let count=0;
  function check(ok,msg){count++;if(!ok)throw new Error(msg);}
  function equal(a,b,msg){check(JSON.stringify(a)===JSON.stringify(b),msg);}
  function harness(code,data) {
    const dom={mv517c1Periodo:{value:"2026-09"}};
    for(const id of ["Buscar","Tipo","Estado","Registro","Gestion"])dom["mv517c1"+id]={value:""};
    const session={usuario:"JEFZNORTE",perfil:"JEFATURA"};
    const state={allow:true,ver:true,data,requests:[],alerts:[],writes:[],timers:[],pending:null};
    const win={
      pmPuede:()=>state.allow,pmPuedeVer:()=>state.ver,
      formatearFechaExcelVT:v=>v==null?"":String(v),
      XLSX:{utils:{
        book_new:()=>({sheets:[]}),
        aoa_to_sheet:rows=>({rows}),
        encode_col:n=>{let s="";for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;},
        book_append_sheet:(wb,ws,name)=>wb.sheets.push({name,ws})
      },writeFile:(wb,name)=>state.writes.push({wb,name})}
    };
    const doc={body:null,getElementById:id=>dom[id]||null};
    const timers=(fn,ms)=>{state.timers.push({fn,ms});return state.timers.length;};
    const fetcher=async (url,init)=>{
      state.requests.push(JSON.parse(init.body));
      if(state.pending)await state.pending;
      if(state.failure)throw new Error("red no disponible");
      return {text:async()=>JSON.stringify(state.data)};
    };
    const debug='window.__test={filtros,noEstandarActivos,pantalla,setData:d=>{EST.data=d;},getData:()=>EST.data'+
      (code.includes("function hojasInformeGarVtr")?',hojasInformeGarVtr':'')+'};';
    const at=code.lastIndexOf("})();");
    const instrumented=code.slice(0,at)+debug+code.slice(at);
    new Function("window","document","localStorage","setTimeout","setInterval","MutationObserver","fetch","alert","console","clearTimeout",instrumented)(
      win,doc,{getItem:k=>session[k]||""},timers,()=>0,class{observe(){}},fetcher,m=>state.alerts.push(m),{log(){}},()=>{});
    win.__test.setData(data);
    return {win,dom,session,state};
  }
  const cases=[
    {ticket:"GAR-001",tipo:"GAR",estadoWin:"FINALIZADA",registroTecnico:"REGISTRADA",bono:"BONO",dni:"00123456",codigoPedido:"00098",sedeEjecutora:"CHICLAYO",cuadrillaEjecutora:"P1",puntajeVtrGar:2,puntajeVtrGarActivo:2,comentarioJefatura:"=1+1",requiereClasificacion:false,ordenesWin:[{ordenId:"00022",estado:"FINALIZADA"},{ordenId:"00023",estado:"REPROGRAMADA"}],antecedente:{estado:"SI",antecedentes:[{ordenId:"00001",cuadrilla:"P2"}]}},
    {ticket:"VTR-002",tipo:"VTR",estadoWin:"FINALIZADA",registroTecnico:"NO_REGISTRADA",sedeEjecutora:"PIURA",requiereClasificacion:true,requiereBono:false},
    {ticket:"GAR-003",tipo:"GAR",estadoWin:"FINALIZADA",registroTecnico:"REGISTRADA",bono:"OBSERVADO",requiereBono:true},
    {ticket:"VTR-004",tipo:"VTR",estadoWin:"CANCELADA",registroTecnico:"REGISTRADA",bono:"NO BONO"},
    {ticket:"GAR-005",tipo:"GAR",estadoWin:"FINALIZADA",registroTecnico:"REGISTRADA",bono:"BONO",estadoResponsabilidad:"NO_ES_GAR_VTR",puntajeVtrGar:2,puntajeVtrGarActivo:0},
    {ticket:"VTR-006",tipo:"VTR",estadoWin:"FINALIZADA",registroTecnico:"REGISTRADA",bono:"PENDIENTE"},
    {ticket:"GAR-007",tipo:"GAR",estadoWin:"FINALIZADA",registroTecnico:"NO_REGISTRADA",bono:"NO BONO"}
  ];
  const data={ok:true,usuario:"JEFZNORTE",periodo:"2026-09",incidencias:cases,noEstandar:[
    {clave:"NE1",estadoWin:"FINALIZADA",estadoDecision:"PENDIENTE",ordenId:"00044"},
    {clave:"NE2",estadoWin:"FINALIZADA",estadoDecision:"NO_ES_GAR_VTR"}
  ]};
  const before=JSON.stringify(data),h=harness(source,data),old=harness(original,data);
  const keys={q:"Buscar",tipo:"Tipo",estado:"Estado",reg:"Registro",gestion:"Gestion"};
  const none={q:"",tipo:"",estado:"",reg:"",gestion:""};
  const selections=[none,{...none,tipo:"GAR"},{...none,tipo:"VTR",estado:"FINALIZADA"},{...none,q:"00123456"},{...none,q:"PIURA"}];
  for(const reg of ["CON_REGISTRO","SIN_REGISTRO","BONO_PENDIENTE","BONO","NO_BONO","OBSERVADO"])selections.push({...none,reg});
  for(const gestion of ["POR_VALIDAR","CLASIFICACION_PENDIENTE","RESUELTOS"])selections.push({...none,gestion});
  for(const f of selections) {
    for(const [k,id] of Object.entries(keys)) {h.dom["mv517c1"+id].value=f[k];old.dom["mv517c1"+id].value=f[k];}
    equal(h.win.__test.filtros(),old.win.__test.filtros(),"filtros existentes alterados");
    equal(h.win.__test.filtros(data,f),old.win.__test.filtros(),"filtros exportación distintos");
  }
  for(const id of Object.values(keys))h.dom["mv517c1"+id].value="";
  const sheets=h.win.__test.hojasInformeGarVtr(data,none,"14/09/2026 10:00 a. m.");
  equal(sheets.map(s=>s.nombre),["RESUMEN","GAR VTR","ORDENES WIN","ANTECEDENTES","REVISION MANUAL"],"hojas");
  check(sheets[1].filas.length===8,"incluye casos sin registro");
  check(sheets[2].filas.length===3,"todas las órdenes del ticket");
  check(sheets[3].filas.length===2,"antecedentes");
  check(sheets[4].filas.length===2,"manual solo pendientes");
  equal(sheets[1].filas[1].slice(4,6),["00098","00123456"],"ceros de código y DNI");
  check(sheets[1].filas[1][17]===2 && sheets[1].filas[2][17]==="","puntos numéricos y ausentes");
  check(sheets[1].filas[5][18]===0,"cero activo conservado");
  check(sheets[1].filas[1][20]==="=1+1","comentario permanece texto");
  for(const s of sheets.filter(s=>s.filtro))check(s.filas.every(r=>r.length===s.filas[0].length),"columnas consistentes "+s.nombre);
  equal(JSON.stringify(data),before,"fuente no mutada");
  h.state.allow=false;
  check(!h.win.__test.pantalla().includes("mv517c2DescargarExcel"),"botón sin permiso oculto");
  await h.win.mv517c2DescargarExcel({});
  check(h.state.requests.length===0 && h.state.writes.length===0,"sin permiso no consulta/descarga");
  h.state.allow=true;h.session.perfil="TECNICO";
  check(!h.win.__test.pantalla().includes("mv517c2DescargarExcel"),"técnico sin botón");
  h.session.perfil="JEFATURA";h.state.ver=false;
  await h.win.mv517c2DescargarExcel({});
  check(h.state.requests.length===0,"sin VER no consulta");
  h.state.ver=true;
  check(h.win.__test.pantalla().includes("mv517c2DescargarExcel"),"botón permitido");
  const btn={disabled:false,textContent:""};
  await h.win.mv517c2DescargarExcel(btn);
  check(h.state.writes.length===1 && !btn.disabled,"descarga y botón restaurado");
  equal(h.state.requests[0],{accion:"listarVtrGarV517A",usuario:"JEFZNORTE",periodo:"2026-09"},"solo lectura del periodo y usuario");
  check(h.state.writes[0].name==="GAR_VTR_2026-09.xlsx","nombre xlsx");
  equal(h.win.__test.getData(),data,"no reemplaza panel");
  equal(JSON.stringify(data),before,"no modifica datos tras exportar");
  for(const bad of [{ok:true,mensaje:"API OK"},{...data,periodo:"2026-08"},{...data,usuario:"OTRO"},{ok:false,error:"Sin permiso"}]) {
    h.state.data=bad;const n=h.state.writes.length;
    await h.win.mv517c2DescargarExcel(btn);
    check(h.state.writes.length===n && !btn.disabled,"respuesta incorrecta no exporta");
  }
  h.state.data=data;h.state.failure=true;
  await h.win.mv517c2DescargarExcel(btn);
  check(h.state.writes.length===1 && !btn.disabled,"error red no descarga");
  h.state.failure=false;
  let release;h.state.pending=new Promise(r=>release=r);
  const countCalls=h.state.requests.length,first=h.win.mv517c2DescargarExcel(btn);
  await h.win.mv517c2DescargarExcel(btn);
  check(h.state.requests.length===countCalls+1,"doble clic una sola consulta");
  h.dom.mv517c1Tipo.value="VTR"; // La selección capturada antes del await se conserva.
  release();await first;h.state.pending=null;
  check(h.state.writes[1].wb.sheets[1].ws.rows.length===8,"selección estable durante consulta");
  h.state.pending=new Promise(r=>release=r);
  const pending=h.win.mv517c2DescargarExcel(btn);
  h.state.allow=false;release();await pending;h.state.pending=null;
  check(h.state.writes.length===2,"permisos revocados antes de descarga");
  h.state.allow=true;
  h.state.pending=new Promise(()=>{});
  const timeout=h.win.mv517c2DescargarExcel(btn);
  h.state.timers.filter(t=>t.ms===60000).at(-1).fn();
  await timeout;h.state.pending=null;
  check(!btn.disabled && h.state.writes.length===2,"timeout libera botón sin descargar");
  equal(JSON.stringify(data),before,"inmutabilidad final");
  return {ok:true,checks:count,scope:"Pruebas con datos simulados; no navegador real ni Apps Script en vivo"};
}

const source=fs.readFileSync("js/vtr_gar_gestion_v517c2.js","utf8");
const original=execFileSync("git",["show","cca79caf76a8637ecb7ca4d2954702109e2af814:js/vtr_gar_gestion_v517c2.js"],{encoding:"utf8"});
runExportTests(source,original).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
