/* MI VISUAL V525 - PARTIDAS RESILIENTE + V524 ACTAS + V523 MAPA + V522C */
const MV339_CACHE = "mivisual-v525-partidas-resiliente-20260903-1";
const MV517C19_BRIDGE = "./js/vtr_gar_ux_v517b.js?v=V520D-BONO-NO-APLICA-20260901-1";
const MV525_PARTIDAS_LECTURAS = new Set([
  "listarPartidasV513",
  "buscarOrdenPartidasV513"
]);
const MV339_CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/estilos.css?v=V404-PLANTILLA-CTO",
  "./css/gerencia_general_v379.css?v=V408-RESTAURA-V403",
  "./css/facturas_v382.css?v=V408-FACTURAS-USUARIOS",
  "./js/utilidades.js?v=V339-CORE",
  "./js/login.js?v=V339-CACHE",
  "./js/permisos.js?v=V339-CORE",
  "./js/app.js?v=V408-RESTAURA-V377",
  "./js/modulos_loader.js?v=V520H-DASHBOARD-SINCRONIZADO-20260902-3",
  "./js/gestion_win_v505_loader.js?v=V517A2-SOLO-FINALIZADAS-PENDIENTES-20260901-1",
  "./js/vtr_gar_validacion_restaurar_v514.js?v=V514A-TABS-UNICA-20260828",
  "./js/vtr_gar_v515.js?v=V515-VTRGAR-BONO-DESEMPENO-20260828",
  "./js/vtr_gar_ui_fix_v516.js?v=V516-TABS-DESPLEGABLES-20260828",
  "./js/vtr_gar_ui_fix_v516a.js?v=V516A-ROBUSTA-20260828",
  "./js/vtr_gar_ui_fix_v516b.js?v=V516B-PREEMPTIVA-20260828",
  "./js/vtr_gar_tabs_guard_v516c.js?v=V516C-TABS-20260828",
  "./js/vtr_gar_tecnico_menu_v517d_f4p.js?v=V517D-F4S-TECNICO-ALCANCE-20260829-1",
  MV517C19_BRIDGE,
  "./js/vtr_gar_ux_v517c3.js?v=V517C3-UX-RAPIDA-20260828-1",
  "./js/vtr_gar_legacy_assoc_v517c2a.js?v=V517C2A-LEGACY-20260828-1",
  "./js/vtr_gar_gestion_v517c2.js?v=V517C2B-BONO-NO-APLICA-20260901-1",
  "./js/vtr_gar_antecedente_dias_v517c4.js?v=V517C4-ANTECEDENTE-DIAS-20260828-1",
  "./js/vtr_gar_bono_excepcion_v517c5.js?v=V517C18-NO-BONO-SIN-REGISTRO-20260828-1",
  "./js/vtr_gar_usabilidad_v517c6.js?v=V517C6-USABILIDAD-20260828-1",
  "./js/vtr_gar_estabilidad_v517c7.js?v=V517C17-SYNC-CACHE-20260828-1",
  "./js/vtr_gar_sin_registro_v517c16b.js?v=V517C18-NO-BONO-ACTUAL-20260828-1",
  "./js/vtr_gar_guardado_unico_v517c8.js?v=V517C16-1-GUARDADO-REGLA-20260828-1",
  "./js/vtr_gar_partida_actual_v517c9.js?v=V517C9-PARTIDA-ORDEN-ACTUAL-20260828-2",
  "./js/vtr_gar_correccion_handler_v517c16.js?v=V517C16-CORRECCION-HANDLER-20260828-1",
  "./js/vtr_gar_compacto_v517c12.js?v=V517C19-COMPACTO-ACCIONES-20260828-1",
  "./js/vtr_gar_regla_puntos_v517d.js?v=V517D-F4G-FRONT-20260829-1",
  "./js/vtr_gar_rendimiento_v517d_f4m.js?v=V517D-F4M-RENDIMIENTO-20260829-1",
  "./js/vtr_gar_bono_correccion_v517d_f4h.js?v=V517D-F4H-BONO-CORRECCION-20260829-1",
  "./js/vtr_gar_motivo_partida_visible_v517d_f4i.js?v=V517D-F4I-MOTIVO-PARTIDA-20260829-1",
  "./js/vtr_gar_dedup_atribucion_v517d_f4j.js?v=V517D-F4J-DEDUP-ATRIBUCION-20260829-1",
  "./js/vtr_gar_finalizadas_normales_v517d_f4l.js?v=V517D-F4L-FINALIZADAS-20260829-1",
  "./js/mi_desempeno_tecnico_v517d_f4t2.js?v=V517D-F4T2-GARVTR-RAPIDO-20260829-1",
  "./js/mi_desempeno_tecnico_v517d_f4v.js?v=V517D-F4V-DESEMPENO-RAPIDO-20260829-1",
  "./js/mi_desempeno_tecnico_v517d_f4w.js?v=V517D-F4W3-SEMAFORO-BLOQUE-DERECHO-20260829-1",
  "./js/mi_desempeno_ocultar_ranking_v457.js?v=V457-OCULTA-RANKING-TECNICO",
  "./js/ranking_observaciones_v459.js?v=V459-RANKING-OBS-60-40",
  "./js/actas_mapa_fallback_v517d_f4x.js?v=V517D-F4X-ACTAS-MAPA-20260831-1",
  "./js/partidas_win_v505.js?v=V506-PARTIDAS-BASE",
  "./js/partidas_lote_v506.js?v=V506-LOTE",
  "./js/partidas_win_v513.js?v=V513E-EDITOR-CATALOGO-20260902",
  "./js/partidas_lote_manual_v513c.js?v=V513C-LOTE-MANUAL-20260827",
  "./js/partidas_snapshot_auto_v513d.js?v=V513D-SNAPSHOT-AUTO-20260827",
  "./js/dashboard_actualizacion_indicadores_v512b.js?v=V512E-DASHBOARD-PIE-20260827",
  "./js/estabilidad_ranking_validacion_v518a.js?v=V518B-20260831-1",
  "./js/actualizacion_win_v507.js?v=V512A-SELLO-DASHBOARD",
  "./js/indicadores_win_sync_v4879.js?v=V512-SYNC-UNICA-PUBLICACION",
  "./js/dashboard_herramientas_final_v512d.js?v=V512D-HERRAMIENTAS-FINAL",
  "./js/checklist_rapido_v508.js?v=V508-CHECKLIST-RAPIDO",
  "./js/actas_tecnico_sin_descarga_v508.js?v=V508-ACTAS-TECNICO",
  "./js/actas_guardar_sync_v510.js?v=V511-GUARDAR-ACTA",
  "./js/actas_multiples_trabajos_v511.js?v=V511-MULTIPLES-TRABAJOS",
  "./js/mapa_cto_fix_v342.js?v=V342-MAPA-CTO",
  "./js/actas_recepcion_v343.js?v=V343-ACTAS-RECEPCION",
  "./js/actas_identidad_v344.js?v=V344-ACTAS-IDENTIDAD",
  "./js/ajustes_perfiles_v345.js?v=V345-PERFILES",
  "./js/actividad_campo_fix_v346.js?v=V452-CHECKLIST-ACTUAL",
  "./js/menu_desempeno_v363.js?v=V408-RESTAURA-V403",
  "./js/gerencia_general_v379.js?v=V408-RESTAURA-V403",
  "./js/facturas_menu_v382.js?v=V408-FACTURAS-USUARIOS",
  "./img/logo.png",
  "./img/logo-192.png",
  "./img/splash.png"
];

const mv525Dormir = ms => new Promise(resolve => setTimeout(resolve, ms));

async function mv525RespuestaJsonValida(res){
  try{
    const texto=(await res.clone().text()).trim();
    if(!texto || /^MI VISUAL API OK$/i.test(texto)) return false;
    if(/<!doctype|<html|accounts\.google|google drive/i.test(texto)) return false;
    JSON.parse(texto);
    return true;
  }catch(_){
    return false;
  }
}

async function mv525FetchPartidas(req){
  let payload=null;
  try{
    payload=JSON.parse(await req.clone().text());
  }catch(_){
    return fetch(req);
  }

  const accion=String(payload&&payload.accion||"").trim();
  if(!MV525_PARTIDAS_LECTURAS.has(accion)) return fetch(req);

  try{
    const primera=await fetch(req.clone());
    if(await mv525RespuestaJsonValida(primera)) return primera;
  }catch(_){
    // Solo lecturas idempotentes V513: se permite un unico reintento.
  }

  await mv525Dormir(850);
  return fetch(req.clone());
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(MV339_CACHE)
      .then(cache => Promise.all(MV339_CORE.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("mivisual-") && key !== MV339_CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // V525: Partidas V513 puede recibir ocasionalmente una pagina/texto externo
  // desde Apps Script. Solo las dos lecturas confirmadas se reintentan una vez.
  // Guardados, ajustes, lotes y publicaciones nunca se repiten automaticamente.
  if(req.method === "POST" && url.hostname === "script.google.com"){
    event.respondWith(mv525FetchPartidas(req));
    return;
  }

  if(req.method !== "GET") return;
  if(url.origin !== self.location.origin) return;

  if(req.mode === "navigate"){
    event.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(MV339_CACHE).then(cache => cache.put("./index.html", copia)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  if(url.pathname.endsWith("/js/vtr_gar_ux_v517b.js")){
    event.respondWith(
      caches.match(MV517C19_BRIDGE).then(r => r || fetch(MV517C19_BRIDGE))
    );
    return;
  }

  // V525 mantiene todas las rutas criticas de V524/V523/V522C.
  const rutaCritica =
    url.pathname.endsWith("/js/validacion_tecnica_datos_v430.js") ||
    url.pathname.endsWith("/js/vtr_gar_tecnico_filtros_v517d_f4s2.js") ||
    url.pathname.endsWith("/js/partidas_win_v513.js") ||
    url.pathname.endsWith("/js/mapa_operativo.js") ||
    url.pathname.endsWith("/js/mapa_progreso_v393.js") ||
    url.pathname.endsWith("/js/mapa_rapido_v395.js") ||
    url.pathname.endsWith("/js/actas_api_resiliente_v392.js");

  if(rutaCritica){
    event.respondWith(
      fetch(req,{cache:"no-store"})
        .then(res => {
          if(res && res.ok){
            const copia = res.clone();
            caches.open(MV339_CACHE).then(cache => cache.put(req, copia)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  const esEstatico = /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|json)$/i.test(url.pathname);
  if(!esEstatico) return;
  event.respondWith(
    caches.match(req).then(cacheado => {
      const red = fetch(req).then(res => {
        if(res && res.ok){
          const copia = res.clone();
          caches.open(MV339_CACHE).then(cache => cache.put(req, copia)).catch(() => {});
        }
        return res;
      }).catch(() => cacheado);
      return cacheado || red;
    })
  );
});
