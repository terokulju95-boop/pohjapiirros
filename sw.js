// Pohjapiirros – service worker: sovellus aukeaa myös ilman verkkoa.
// Kun päivität sovelluksen tiedostoja GitHubiin, kasvata versionumeroa.
const CACHE = "piirros-v11";
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const SHELL = ["./", "./index.html", "./styles.css", "./manifest.json", "./firebase-config.js",
  "./js/main.js", "./js/core.js", "./js/views/projects.js", "./js/views/users.js",
  "./js/plan/geom.js", "./js/plan/catalog.js", "./js/plan/render.js", "./js/plan/templates.js", "./js/plan/editor.js", "./js/plan/quantities.js", "./js/plan/print.js", "./js/plan/view3d.js", "./js/plan/materials.js", "./js/plan/walltypes.js", "./js/plan/roof.js", "./js/plan/views.js", "./js/plan/models3d.js", "./js/plan/trims.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-32.png"];
const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.160.0/";
const SDK_FILES = ["firebase-app.js", "firebase-auth.js", "firebase-firestore.js"].map(f => SDK + f);

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all([...SHELL, ...SDK_FILES].map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("piirros-") && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
// Omat tiedostot: verkosta ensin, välimuistista jos verkko ei vastaa 3,5 s:ssa.
function networkFirst(req) {
  return new Promise(resolve => {
    let done = false;
    const timer = setTimeout(async () => { const r = await caches.match(req, { ignoreSearch: true }); if (r && !done) { done = true; resolve(r); } }, 3500);
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      if (!done) { done = true; clearTimeout(timer); resolve(res); }
    }).catch(async () => {
      clearTimeout(timer);
      if (!done) { done = true; resolve((await caches.match(req, { ignoreSearch: true })) || (await caches.match("./index.html"))); }
    });
  });
}
async function cacheFirst(req) {
  const hit = await caches.match(req); if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
  return res;
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) e.respondWith(networkFirst(req));
  else if (req.url.startsWith(SDK) || req.url.startsWith(THREE_CDN)) e.respondWith(cacheFirst(req));
});
