self.addEventListener("install", event => {
  self.skipWaiting();
  console.log("Service Worker instalado - MI VISUAL");
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
  console.log("Service Worker activo - MI VISUAL");
});
