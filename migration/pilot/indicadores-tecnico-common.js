const URL="https://uudvodiaizfarodjpetb.supabase.co";
const KEY="sb_publishable_2hiwePKtqoo3_c_D5B9JuA_p38dPe3D";
const API=URL+"/functions/v1/indicadores-tecnico-pilot";
const sb=supabase.createClient(URL,KEY);
const CFG=window.MV_IND||{};
const E=id=>document.getElementById(id);
const H=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const N=v=>Number(v||0);
const F=(v,d=2)=>Number(v||0).toLocaleString("es-PE",{minimumFractionDigits:d,maximumFractionDigits:d});
async function token(){const {data}=await sb.auth.getSession();return data.session?.access_token||""}
async function api(q){
  const t=await token();if(!t)throw Error("Inicie sesión en MI VISUAL.");
  const u=new URL(API);Object.entries(q).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  const r=await fetch(u,{headers:{Authorization:"Bearer "+t,apikey:KEY},cache:"no-store"});
  const x=await r.json();if(!r.ok||!x.ok)throw Error(x.error||"Error");return x;
}
function freshness(rows){
  if(!rows?.length)return '<span class="muted">Sin estado de fuente.</span>';
  return rows.map(x=>{
    const bad=x.requires_final_resync||x.status==="REQUIERE_RESYNC_FINAL";
    return '<span class="pill '+(bad?'warn':'good')+'">'+H(x.modulo)+' · '+H(x.status||"")+'</span>';
  }).join(" ");
}
function metric(label,val,suffix=""){return '<div class="metric"><span>'+H(label)+'</span><b>'+H(val)+H(suffix)+'</b></div>'}
function renderProduccion(r){
  if(!r)return noData();
  const d=r.detalle||{},fechas=d.fechas||{},tipos=d.tipos||{};
  E("metrics").innerHTML=
    metric("Órdenes",N(r.total_ordenes))+
    metric("Puntos",F(r.total_puntos,2))+
    metric("Promedio por orden",N(r.total_ordenes)?F(N(r.total_puntos)/N(r.total_ordenes),2):"0.00");
  const dateRows=Object.entries(fechas).sort((a,b)=>String(b[0]).localeCompare(String(a[0])));
  const typeRows=Object.entries(tipos).sort((a,b)=>N(b[1]?.puntos)-N(a[1]?.puntos));
  E("detail").innerHTML=
    '<div class="card"><h3>Producción por fecha</h3><div class="tablewrap"><table><tr><th>Fecha</th><th>Órdenes</th><th>Puntos</th></tr>'+
    dateRows.map(([k,v])=>'<tr><td>'+H(k)+'</td><td>'+N(v.cantidad)+'</td><td>'+F(v.puntos,2)+'</td></tr>').join("")+
    '</table></div></div>'+
    '<div class="card"><h3>Partidas</h3><div class="tablewrap"><table><tr><th>Partida</th><th>Cantidad</th><th>Puntaje unit.</th><th>Puntos</th></tr>'+
    typeRows.map(([k,v])=>'<tr><td>'+H(k)+'</td><td>'+N(v.cantidad)+'</td><td>'+F(v.puntaje,2)+'</td><td>'+F(v.puntos,2)+'</td></tr>').join("")+
    '</table></div></div>';
}
function renderEfectividad(r){
  if(!r)return noData();
  E("metrics").innerHTML=
    metric("Efectividad",F(r.efectividad_pct,2),"%")+
    metric("Finalizadas",N(r.finalizada))+
    metric("Canceladas",N(r.cancelada))+
    metric("Regestión",N(r.regestion))+
    metric("Reprogramado",N(r.reprogramado))+
    metric("Total evaluable",N(r.total_general));
  E("detail").innerHTML='<div class="card"><div class="notice">Última actualización del motor: <b>'+H(r.actualizacion||"-")+'</b>.</div></div>';
}
function renderRecableado(r){
  if(!r)return noData();
  E("metrics").innerHTML=
    metric("Recableado",F(r.porcentaje_pct,2),"%")+
    metric("LOS rojo asignadas",N(r.los_rojo_asignadas))+
    metric("Recableados",N(r.recableados));
  E("detail").innerHTML='<div class="card"><div class="notice">Última actualización del motor: <b>'+H(r.actualizacion||"-")+'</b>.</div></div>';
}
function renderVtr(r){
  if(!r)return noData();
  E("metrics").innerHTML=
    metric("VTR/GAR",F(r.porcentaje_pct,2),"%")+
    metric("Finalizadas",N(r.total_finalizadas))+
    metric("GAR",N(r.gar))+
    metric("VTR",N(r.vtr))+
    metric("Total GAR/VTR",N(r.total_gar_vtr));
  E("detail").innerHTML='<div class="card"><div class="notice">Última actualización del motor: <b>'+H(r.actualizacion||"-")+'</b>.</div></div>';
}
function noData(){
  E("metrics").innerHTML="";
  E("detail").innerHTML='<div class="card"><div class="muted">No hay datos para esta cuadrilla en el período seleccionado.</div></div>';
}
function renderRow(r){
  if(CFG.type==="PRODUCCION")return renderProduccion(r);
  if(CFG.type==="EFECTIVIDAD")return renderEfectividad(r);
  if(CFG.type==="RECABLEADO")return renderRecableado(r);
  return renderVtr(r);
}
async function load(){
  try{
    E("msg").className="muted";E("msg").textContent="Consultando...";
    const d=await api({accion:"resumen",tipo:CFG.type,periodo:E("periodo").value});
    E("who").innerHTML='<b>'+H(d.usuario.cuadrilla)+'</b><br><span class="muted">'+H(d.usuario.sede||"")+(d.usuario.plataforma?' · '+H(d.usuario.plataforma):'')+'</span>';
    E("fresh").innerHTML=freshness(d.freshness);
    renderRow(d.resumen);
    E("msg").className="ok";E("msg").textContent=d.resumen?"Datos cargados desde PostgreSQL.":"Sin registros para el período.";
  }catch(e){E("msg").className="err";E("msg").textContent=e.message;noData()}
}
async function init(){
  try{
    const d=await api({accion:"contexto"});
    const periods=d.periodos||[];
    E("periodo").innerHTML=periods.map(p=>'<option value="'+H(p)+'">'+H(p)+'</option>').join("");
    if(periods.includes("2026-09"))E("periodo").value="2026-09";
    E("periodo").onchange=load;E("reload").onclick=load;
    await load();
  }catch(e){E("msg").className="err";E("msg").textContent=e.message}
}
init();
