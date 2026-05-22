/**
 * Service Worker do Tirzenix.
 *
 * Estratégia: NETWORK-FIRST com fallback para cache (offline).
 * - Sempre tenta buscar a versão fresca da rede primeiro
 * - Cache serve apenas como fallback offline ou para recursos não-críticos
 * - Cada novo VERSION limpa TODAS as caches antigas, evitando cache poisoning
 *
 * Use o VERSION abaixo como cache-buster a cada deploy significativo.
 */
const VERSION = "tirzenix-v4-2026-05-22-r2";

self.addEventListener("install", (event) => {
  // Ativa o novo SW imediatamente, sem esperar abas antigas fecharem
  self.skipWaiting();
  event.waitUntil(caches.open(VERSION));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Apaga todas as caches que não sejam a atual (limpa lixo antigo)
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== VERSION).map((n) => caches.delete(n))
      );
      await self.clients.claim();
      // Força clientes abertos a recarregar com assets frescos
      const clients = await self.clients.matchAll({ type: "window" });
      for (const c of clients) {
        try {
          c.navigate(c.url);
        } catch {
          // ignora se a navegação não for permitida
        }
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Não interfere em requests cross-origin (Supabase, GitHub API, Google Fonts)
  if (url.origin !== self.location.origin) return;

  // NETWORK-FIRST — sempre tenta versão fresca primeiro
  event.respondWith(
    fetch(req, { cache: "no-cache" })
      .then((res) => {
        // Cacheia apenas respostas 200 OK
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(VERSION).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        // OFFLINE: tenta servir da cache
        const cached = await caches.match(req);
        if (cached) return cached;
        // Para navegações HTML offline, devolve o index.html cacheado
        if (req.mode === "navigate") {
          const indexCached = await caches.match("./") || await caches.match("./index.html");
          if (indexCached) return indexCached;
        }
        return new Response("Offline · sem cache para esta rota", {
          status: 503,
          statusText: "Service Unavailable",
        });
      })
  );
});
