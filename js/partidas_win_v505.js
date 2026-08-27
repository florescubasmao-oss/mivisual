/* ============================================================
   MI VISUAL V505 - VALIDACION DE PARTIDAS WIN / PARTNER

   - Solo Jefatura.
   - WIN mantiene la orden, estado y cuadrilla ejecutora oficial.
   - Partner solo propone diferencias IR <-> IC.
   - Una validacion humana guarda AJUSTES_PARTIDA_WIN y el backend
     republica Produccion / Ranking inmediatamente.
   - No modifica SLA.
============================================================ */
(function(){
  "use strict";

  if(window.MV505_PARTIDAS_WIN_OK) return;
  window.MV505_PARTIDAS_WIN_OK = true;

  const VERSION = "V505-PARTIDAS-WIN-20260827";
  let estado = {
    periodo:"",
    cargando:false,
    data:null,
    error:"",
    filtro:""
  };

  function norm(v){
    return String(v==null?"":v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function esc(v){
    return String(v==null?"":v)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function esJefatura(){
    const p=norm(localStorage.getItem("perfil"));
    return p==="JEFATURA" || p==="JEFATURA GENERAL";
  }

  function usuario(){
    return localStorage.getItem("usuario") || localStorage.getItem("correo") || "";
  }

  function apiBase(){
    return window.MI_VISUAL_API_URL ||
      (typeof MV58_API!=="undefined" ? MV58_API : "");
  }

  function periodoActual(){
    try{
      const partes=new Intl.DateTimeFormat("en-CA",{
        timeZone:"America/Lima",year:"numeric",month:"2-digit"
      }).formatToParts(new Date());
      const y=partes.find(x=>x.type==="year")?.value||"";
      const m=partes.find(x=>x.type==="month")?.value||"";
      return y&&m?`${y}-${m}`:"";
    }catch(_){ return ""; }
  }

  async function apiPost(payload){
    const base=apiBase();
    if(!base) throw new Error("No se encontro la URL de MI VISUAL.");
    const r=await fetch(base,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"},
      body:JSON.stringify(payload),
      cache:"no-store",
      redirect:"follow"
    });
    const t=(await r.text()).trim();
    let j;
    try{ j=JSON.parse(t); }
    catch(_){ throw new Error("La API no devolvio una respuesta valida para Partidas."); }
    if(!j || j.ok===false) throw new Error(j&&j.error?j.error:"No se pudo completar la operacion.");
    return j;
  }

  function cerrar(){ document.getElementById("mv505PartidasModal")?.remove(); }
  window.mv505CerrarPartidas=cerrar;

  function propuestas(){
    const d=estado.data||{};
    const lista=Array.isArray(d.propuestasPartner)?d.propuestasPartner:[];
    const q=norm(estado.filtro);
    if(!q) return lista;
    return lista.filter(x=>norm([
      x.ordenId,x.cuadrilla,x.sede,x.partidaWin,x.partidaPartner,
      x.tipoServicioWin,x.motivoFinalizacionWin
    ].join(" ")).includes(q));
  }

  function fmtNum(v){
    const n=Number(v)||0;
    return Number.isInteger(n)?String(n):n.toFixed(1);
  }

  function card(x){
    const delta=(Number(x.puntosPartner)||0)-(Number(x.puntosWin)||0);
    const deltaTxt=(delta>0?"+":"")+fmtNum(delta)+" pts";
    const colorDelta=delta>0?"#166534":(delta<0?"#991b1b":"#475569");
    const bgDelta=delta>0?"#dcfce7":(delta<0?"#fee2e2":"#e2e8f0");
    const id=esc(x.ordenId||"");
    const prop=esc(x.partidaPropuesta||x.partidaPartner||"");
    return `<article style="background:#fff;border:1px solid #cbd5e1;border-radius:15px;padding:13px;box-shadow:0 4px 12px rgba(15,23,42,.08)">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap">
        <div style="min-width:0;flex:1">
          <div style="font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase">Orden WIN</div>
          <div style="font-size:18px;font-weight:950;color:#0f172a;overflow-wrap:anywhere">${id}</div>
          <div style="font-size:11px;color:#475569;margin-top:4px">${esc(x.fecha||"")} · ${esc(x.sede||"")}</div>
        </div>
        <span style="padding:6px 9px;border-radius:999px;background:${bgDelta};color:${colorDelta};font-size:11px;font-weight:900">${deltaTxt}</span>
      </div>

      <div style="margin-top:10px;padding:10px;border-radius:11px;background:#f8fafc;border:1px solid #e2e8f0">
        <div style="font-size:11px;font-weight:900;color:#334155">${esc(x.cuadrilla||"")}</div>
        ${x.tipoServicioWin?`<div style="font-size:10px;color:#64748b;margin-top:4px">WIN: ${esc(x.tipoServicioWin)}</div>`:""}
        ${x.motivoFinalizacionWin?`<div style="font-size:10px;color:#64748b;margin-top:3px">Finalizacion: ${esc(x.motivoFinalizacionWin)}</div>`:""}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
        <div style="padding:10px;border-radius:11px;background:#eff6ff;border:1px solid #bfdbfe">
          <div style="font-size:9px;font-weight:900;color:#1d4ed8;text-transform:uppercase">Partida WIN actual</div>
          <div style="font-size:20px;font-weight:950;color:#1e3a8a;margin-top:3px">${esc(x.partidaWin||"-")}</div>
          <div style="font-size:11px;color:#334155">${fmtNum(x.puntosWin)} pts</div>
        </div>
        <div style="padding:10px;border-radius:11px;background:#fffbeb;border:1px solid #fde68a">
          <div style="font-size:9px;font-weight:900;color:#a16207;text-transform:uppercase">Propuesta Partner</div>
          <div style="font-size:20px;font-weight:950;color:#92400e;margin-top:3px">${esc(x.partidaPartner||"-")}</div>
          <div style="font-size:11px;color:#334155">${fmtNum(x.puntosPartner)} pts</div>
        </div>
      </div>

      <div style="font-size:10px;color:#64748b;margin-top:9px;line-height:1.4">Partner solo propone la diferencia IR/IC. La orden WIN original no se modifica.</div>

      <button type="button" data-mv505-validar="${id}" data-mv505-propuesta="${prop}" onclick="mv505ValidarPartida(this)" style="width:100%;margin-top:10px;border:0;border-radius:10px;padding:10px 12px;background:#16a34a;color:#fff;font-weight:900;cursor:pointer">✅ Validar y aplicar ${prop}</button>
    </article>`;
  }

  function render(){
    const modal=document.getElementById("mv505PartidasModal");
    if(!modal) return;
    const body=modal.querySelector("[data-mv505-body]");
    if(!body) return;

    if(estado.cargando){
      body.innerHTML=`<div style="padding:30px;text-align:center;color:#334155">⏳ Consultando diferencias IR/IC...</div>`;
      return;
    }
    if(estado.error){
      body.innerHTML=`<div style="padding:14px;border-radius:12px;background:#fee2e2;border:1px solid #ef4444;color:#991b1b;font-weight:800">${esc(estado.error)}</div>`;
      return;
    }

    const d=estado.data||{};
    const lista=propuestas();
    const total=Array.isArray(d.propuestasPartner)?d.propuestasPartner.length:0;
    const validados=Array.isArray(d.validados)?d.validados.length:0;
    const pendientesRegistrados=Array.isArray(d.pendientes)?d.pendientes.length:0;

    body.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:10px">
        <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:12px;padding:10px"><div style="font-size:9px;color:#9a3412;font-weight:900">PROPUESTAS</div><div style="font-size:24px;font-weight:950;color:#7c2d12">${total}</div></div>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:10px"><div style="font-size:9px;color:#166534;font-weight:900">VALIDADAS</div><div style="font-size:24px;font-weight:950;color:#14532d">${validados}</div></div>
        <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:10px"><div style="font-size:9px;color:#475569;font-weight:900">REG. PENDIENTES</div><div style="font-size:24px;font-weight:950;color:#334155">${pendientesRegistrados}</div></div>
      </div>

      <div style="padding:10px 12px;border-radius:11px;background:#eff6ff;border:1px solid #93c5fd;color:#1e3a8a;font-size:11px;line-height:1.45;margin-bottom:10px">
        <b>Regla:</b> WIN manda en orden, estado y cuadrilla. Partner solo propone IR↔IC. Al validar, se guarda el ajuste y se recalculan Produccion y Ranking. SLA no se modifica.
      </div>

      <input data-mv505-buscar type="search" value="${esc(estado.filtro)}" placeholder="Buscar orden, cuadrilla o sede..." oninput="mv505FiltrarPartidas(this.value)" style="width:100%;box-sizing:border-box;border:1px solid #94a3b8;border-radius:10px;padding:10px 11px;margin-bottom:10px;font-weight:700">

      ${lista.length?`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px">${lista.map(card).join("")}</div>`:`<div style="padding:24px;text-align:center;background:#f8fafc;border:1px dashed #94a3b8;border-radius:13px;color:#475569">${total?"No hay coincidencias con el filtro.":"✅ No hay diferencias IR/IC pendientes para este periodo."}</div>`}
    `;
  }

  async function cargar(){
    estado.cargando=true; estado.error=""; render();
    try{
      estado.data=await apiPost({
        accion:"listarAjustesPartidaWinV502",
        usuario:usuario(),
        periodo:estado.periodo
      });
    }catch(e){
      estado.error=e&&e.message?e.message:String(e);
    }finally{
      estado.cargando=false; render();
    }
  }

  function abrir(){
    if(!esJefatura()){
      alert("Partidas esta disponible solo para Jefatura.");
      return;
    }
    cerrar();
    estado.periodo=estado.periodo||periodoActual();
    estado.filtro="";
    const modal=document.createElement("div");
    modal.id="mv505PartidasModal";
    modal.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(2,6,23,.74);padding:12px;overflow:auto;display:flex;align-items:flex-start;justify-content:center";
    modal.innerHTML=`<div style="width:min(980px,100%);margin:12px auto;background:#eef2f7;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden;color:#0f172a">
      <div style="position:sticky;top:0;z-index:2;background:#0f2743;color:white;padding:13px 14px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div>
          <div style="font-size:18px;font-weight:950">🎯 Partidas WIN</div>
          <div style="font-size:10px;color:#bfdbfe;margin-top:2px">Validacion humana de diferencias IR ↔ IC</div>
        </div>
        <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
          <input type="month" min="2026-08" value="${esc(estado.periodo)}" onchange="mv505CambiarPeriodoPartidas(this.value)" style="border:0;border-radius:8px;padding:7px 8px;font-weight:800;color:#0f172a">
          <button type="button" onclick="mv505RecargarPartidas()" style="border:0;border-radius:8px;padding:8px 10px;background:#2563eb;color:#fff;font-weight:900;cursor:pointer">↻ Actualizar</button>
          <button type="button" onclick="mv505CerrarPartidas()" style="border:0;border-radius:8px;padding:8px 10px;background:#475569;color:#fff;font-weight:900;cursor:pointer">✕ Cerrar</button>
        </div>
      </div>
      <div data-mv505-body style="padding:12px"></div>
      <div style="padding:9px 12px;border-top:1px solid #cbd5e1;background:#fff;color:#64748b;font-size:9px">${VERSION} · No modifica SLA</div>
    </div>`;
    document.body.appendChild(modal);
    cargar();
  }
  window.mv505AbrirPartidas=abrir;

  window.mv505CambiarPeriodoPartidas=function(v){
    if(!/^\d{4}-\d{2}$/.test(String(v||""))) return;
    estado.periodo=String(v); estado.filtro=""; cargar();
  };
  window.mv505RecargarPartidas=cargar;
  window.mv505FiltrarPartidas=function(v){ estado.filtro=String(v||""); render(); };

  window.mv505ValidarPartida=async function(btn){
    if(!esJefatura()) return;
    const ordenId=btn&&btn.getAttribute("data-mv505-validar")||"";
    const propuesta=btn&&btn.getAttribute("data-mv505-propuesta")||"";
    if(!ordenId||!propuesta) return;
    const x=(estado.data?.propuestasPartner||[]).find(o=>String(o.ordenId)===String(ordenId));
    const actual=x?.partidaWin||"";
    const pWin=Number(x?.puntosWin)||0;
    const pNuevo=Number(x?.puntosPartner)||0;
    const delta=pNuevo-pWin;
    const ok=confirm(
      `Orden ${ordenId}\n\n`+
      `Partida WIN: ${actual} (${fmtNum(pWin)} pts)\n`+
      `Aplicar: ${propuesta} (${fmtNum(pNuevo)} pts)\n`+
      `Diferencia: ${(delta>0?"+":"")+fmtNum(delta)} pts\n\n`+
      `Esto guardara el ajuste validado y republicara Produccion / Ranking. La orden WIN original se conserva.\n\n¿Confirmar?`
    );
    if(!ok) return;
    const original=btn.textContent;
    btn.disabled=true; btn.textContent="⏳ Aplicando y recalculando...";
    try{
      const r=await apiPost({
        accion:"validarAjustePartidaWinV502",
        usuario:usuario(),
        ordenId:ordenId,
        partidaPropuesta:propuesta,
        origen:"PARTNER / JEFATURA MI VISUAL",
        motivo:"Diferencia IR/IC validada desde modulo Partidas",
        solicitadoPor:usuario()
      });
      try{
        if(typeof window.mv4879InvalidarCachesCliente==="function"){
          window.mv4879InvalidarCachesCliente(r?.publicacion?.periodo||estado.periodo);
        }
        window.dispatchEvent(new CustomEvent("mv505PartidaValidada",{detail:r}));
      }catch(_){}
      const prod=r?.publicacion?.produccion||{};
      alert(
        `✅ Ajuste aplicado\n\nOrden: ${ordenId}\n${r.partidaAnterior||actual} → ${r.partidaNueva||propuesta}`+
        (prod.puntos!==undefined?`\nProduccion publicada: ${prod.puntos} pts`:"")+
        `\n\nWIN original conservado.`
      );
      await cargar();
    }catch(e){
      alert("No se pudo aplicar el ajuste: "+(e&&e.message?e.message:String(e)));
      btn.disabled=false; btn.textContent=original;
    }
  };
})();
