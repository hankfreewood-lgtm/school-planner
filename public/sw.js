/* Service Worker – Schulplaner
 * - Beim Installieren wird die App-Shell inkl. der gehashten Build-Assets (/assets/*) vorab gecacht.
 * - Navigationen: Network-First (immer aktuelle Version), bei Offline der gecachte Shell bzw. offline.html.
 * - Firestore/Auth-Verkehr (andere Origins) wird NICHT abgefangen; Firestore puffert offline selbst (IndexedDB).
 * - Der Cache-Name wird beim Build mit einem Asset-Hash versehen (siehe vite.config.js),
 *   damit nach jedem Deployment neu vorab gecacht wird.
 */
const CACHE = 'schulplaner-v1';
const SHELL = ['/', '/offline.html', '/manifest.webmanifest', '/fonts/inter-latin.woff2', '/fonts/inter-latin-ext.woff2', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon.svg'];

async function precache() {
  const cache = await caches.open(CACHE);
  const urls = new Set(SHELL);
  try {
    const res = await fetch('/', { cache: 'reload' });
    if (res.ok) {
      const html = await res.clone().text();
      await cache.put('/', res);
      // Gehashte JS/CSS-Bundles aus der HTML extrahieren und mitcachen.
      for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) urls.add(m[1]);
    }
  } catch { /* offline installieren */ }
  await Promise.all([...urls].map((u) => cache.add(u).catch(() => {})));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const withTimeout = (p, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('timeout')), ms);
  p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/__/')) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await withTimeout(fetch(req), 4000);
        if (res.ok) cache.put('/', res.clone());
        return res;
      } catch {
        return (await cache.match('/', { ignoreVary: true })) || (await cache.match('/offline.html', { ignoreVary: true })) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req, { ignoreVary: true });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return Response.error();
      }
    })());
    return;
  }

  // Sonstiges (Icons, Manifest …): Stale-While-Revalidate
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreVary: true });
    const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })());
});
