// Service Worker mínimo — cache-first para assets estáticos, network-first para HTML.
// Permite o app rodar offline em celulares depois da 1ª visita.

const VERSION = "tirzenix-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(VERSION));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== VERSION).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // não cacheia Supabase/CDN

  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // Network-first para HTML (sempre tenta versão fresca)
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(VERSION).then((c) => c.put(req, clone));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match("./");
        })
    );
    return;
  }

  // Cache-first para assets (CSS, JS, fontes, imagens)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && (url.pathname.includes("/assets/") || /\.(svg|png|webp|woff2?|css|js)$/.test(url.pathname))) {
          const clone = res.clone();
          caches.open(VERSION).then((c) => c.put(req, clone));
        }
        return res;
      });
    })
  );
});
