/* MI VISUAL V517C.17 - GAR/VTR CACHE SINCRONIZADA */
const MV339_CACHE = "mivisual-v517c17-garvtr-sync-cache-20260828-1";
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
  "./js/modulos_loader.js?v=V498-CIERRE-DEFINITIVO",
  "./js/gestion_win_v505_loader.js?v=V517A-VTRGAR-UI",
  "./js/vtr_gar_validacion_restaurar_v514.js?v=V514A-TABS-UNICA-20260828",
  "./js/vtr_gar_v515.js?v=V515-VTRGAR-BONO-DESEMPENO-20260828",
  "./js/vtr_gar_ui_fix_v516.js?v=V516-TABS-DESPLEGABLES-20260828",
  "./js/vtr_gar_ui_fix_v516a.js?v=V516A-ROBUSTA-20260828",
  "./js/vtr_gar_ui_fix_v516b.js?v=V516B-PREEMPTIVA-20260828",
  "./js/vtr_gar_tabs_guard_v516c.js?v=V516C-TABS-20260828",
  "./js/vtr_gar_ux_v517b.js?v=V517C17-SYNC-CACHE-20260828-1",
  "./js/vtr_gar_ux_v517c3.js?v=V517C3-UX-RAPIDA-20260828-1",
  "./js/vtr_gar_legacy_assoc_v517c2a.js?v=V517C2A-LEGACY-20260828-1",
  "./js/vtr_gar_gestion_v517c2.js?v=V517C2-HISTORICO-OBSERVADO-20260828-1",
  "./js/vtr_gar_antecedente_dias_v517c4.js?v=V517C4-ANTECEDENTE-DIAS-20260828-1",
  "./js/vtr_gar_bono_excepcion_v517c5.js?v=V517C16-1-EVAL-SIN-REGISTRO-20260828-1",
  "./js/vtr_gar_usabilidad_v517c6.js?v=V517C6-USABILIDAD-20260828-1",
  "./js/vtr_gar_estabilidad_v517c7.js?v=V517C17-SYNC-CACHE-20260828-1",
  "./js/vtr_gar_sin_registro_v517c16b.js?v=V517C16B-SIN-REGISTRO-20260828-1",
  "./js/vtr_gar_guardado_unico_v517c8.js?v=V517C16-1-GUARDADO-REGLA-20260828-1",
  "./js/vtr_gar_partida_actual_v517c9.js?v=V517C9-PARTIDA-ORDEN-ACTUAL-20260828-2",
  "./js/vtr_gar_correccion_handler_v517c16.js?v=V517C16-CORRECCION-HANDLER-20260828-1",
  "./js/vtr_gar_compacto_v517c12.js?v=V517C16-COMPACTO-ACCIONES-20260828-1",
  "./js/partidas_win_v505.js?v=V506-PARTIDAS-BASE",
  "./js/partidas_lote_v506.js?v=V506-LOTE",
  "./js/partidas_win_v513.js?v=V513-PARTIDAS-20260827",
  "./js/partidas_lote_manual_v513c.js?v=V513C-LOTE-MANUAL-20260827",
  "./js/partidas_snapshot_auto_v513d.js?v=V513D-SNAPSHOT-AUTO-20260827",
  "./js/dashboard_actualizacion_indicadores_v512b.js?v=V512E-DASHBOARD-PIE-20260827",
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
  if(req.method !== "GET") return;
  const url = new URL(req.url);
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