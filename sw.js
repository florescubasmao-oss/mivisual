/* MI VISUAL V353 - caché segura y cumplimiento productivo diario */
const MV339_CACHE = "mivisual-v353-cumplimiento-diario-20260805";
const MV339_CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/estilos.css?v=V339-LAZY",
  "./js/utilidades.js?v=V339-CORE",
  "./js/login.js?v=V339-CACHE",
  "./js/permisos.js?v=V339-CORE",
  "./js/app.js?v=V339-LAZY",
  "./js/modulos_loader.js?v=V353-CUMPLIMIENTO-DIARIO",
  "./js/mapa_cto_fix_v342.js?v=V342-MAPA-CTO",
  "./js/actas_recepcion_v343.js?v=V343-ACTAS-RECEPCION",
  "./js/actas_identidad_v344.js?v=V344-ACTAS-IDENTIDAD",
  "./js/ajustes_perfiles_v345.js?v=V345-PERFILES",
  "./js/actividad_campo_fix_v346.js?v=V346-ACTIVIDAD-CAMPO",
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
      .then(keys => Promise.all(keys.filter(key => key.startsWith("mivisual-") && key !== MV339_CACHE).map(key => caches.delete(key))))
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
