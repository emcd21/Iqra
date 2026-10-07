// Iqraʾ service worker, written by build_pwa.py. It precaches the whole site at install, so the installed
// app works offline. VERSION is a hash of every precached file, so any change ships a byte-different worker,
// which installs the new files and deletes the old cache.
const VERSION = '7051ed0f422d';
const FILES = [
"audio/006-027.mp3",
"audio/manifest.json",
"fonts/amiriquran-6e269442.woff2",
"fonts/amiriquran-8aaeb960.woff2",
"fonts/fonts.css",
"fonts/inter-01457da3.woff2",
"fonts/inter-1b6c6133.woff2",
"fonts/inter-5ddcc8d0.woff2",
"fonts/inter-8fef7b1b.woff2",
"fonts/inter-9c34bccb.woff2",
"fonts/inter-bd5d77ca.woff2",
"fonts/inter-f949284d.woff2",
"fonts/scheherazadenew-3faeee88.woff2",
"fonts/scheherazadenew-7474e380.woff2",
"fonts/scheherazadenew-92df7283.woff2",
"fonts/scheherazadenew-a54c2d11.woff2",
"fonts/scheherazadenew-b1853db3.woff2",
"fonts/scheherazadenew-b7d5cc0b.woff2",
"fonts/sourceserif4-02601716.woff2",
"fonts/sourceserif4-0c80138a.woff2",
"fonts/sourceserif4-a0529622.woff2",
"fonts/sourceserif4-b3d22287.woff2",
"fonts/sourceserif4-b973634a.woff2",
"fonts/sourceserif4-d798780a.woff2",
"icons/apple-touch-icon.png",
"icons/favicon-32.png",
"icons/icon-192.png",
"icons/icon-512.png",
"icons/icon-maskable-512.png",
"img/garden/bg-1-f.webp",
"img/garden/bg-1-t.webp",
"img/garden/bg-2-f.webp",
"img/garden/bg-3-t.webp",
"img/garden/bg-4-f.webp",
"img/garden/bg-5-t.webp",
"img/garden/bg-6-t.webp",
"img/garden/bg-7-f.webp",
"img/garden/bg-8-t.webp",
"img/garden/bg-9-f.webp",
"img/garden/bg-9-t.webp",
"img/garden/bunnies-p.webp",
"img/garden/bunny_b-sh.webp",
"img/garden/bunny_b.webp",
"img/garden/bunny_w-sh.webp",
"img/garden/bunny_w.webp",
"img/garden/cat-p.webp",
"img/garden/cat-sh.webp",
"img/garden/cat.webp",
"img/garden/cottage0-sh.webp",
"img/garden/cottage0.webp",
"img/garden/cottage1-sh.webp",
"img/garden/cottage1.webp",
"img/garden/cottage2-sh.webp",
"img/garden/cottage2.webp",
"img/garden/cottage3-sh.webp",
"img/garden/cottage3.webp",
"img/garden/cottage4-sh.webp",
"img/garden/cottage4.webp",
"img/garden/fence0-sh.webp",
"img/garden/fence0.webp",
"img/garden/fence1-sh.webp",
"img/garden/fence1.webp",
"img/garden/flowers-sh.webp",
"img/garden/flowers.webp",
"img/garden/kitten-p.webp",
"img/garden/kitten-sh.webp",
"img/garden/kitten.webp",
"img/garden/lamb-p.webp",
"img/garden/lamb-sh.webp",
"img/garden/lamb.webp",
"img/garden/path-sh.webp",
"img/garden/path.webp",
"img/garden/rubble-sh.webp",
"img/garden/rubble.webp",
"img/garden/tree0-sh.webp",
"img/garden/tree0.webp",
"img/garden/tree1-sh.webp",
"img/garden/tree1.webp",
"img/garden/well0-sh.webp",
"img/garden/well0.webp",
"img/garden/well1-sh.webp",
"img/garden/well1.webp",
"img/grass.webp",
"img/hills.webp",
"img/lawn.webp",
"index.html",
"manifest.webmanifest"
];
const PREFIX = 'iqra-'; // older caches of this copy of the app: same prefix and scope, other version
const SCOPE = self.registration.scope;
const CACHE = `${PREFIX}${VERSION} ${SCOPE}`;

// A response that followed a redirect cannot answer a navigation (Safari refuses it), so store a plain copy.
const plain = async r => r.redirected ? new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: r.headers }) : r;

self.addEventListener('install', e => e.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await Promise.all(FILES.map(async f => {
    const r = await fetch(new Request(f, { cache: 'reload' })); // past the HTTP cache: GitHub Pages caches for 10 minutes
    if (!r.ok) throw new Error(`precache ${f}: HTTP ${r.status}`);
    const res = await plain(r);
    if (f === 'index.html') await cache.put('./', res.clone()); // the page, under both of its URLs
    await cache.put(f, res);
  }));
  await self.skipWaiting();
})()));

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k.endsWith(` ${SCOPE}`) && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;
  if (req.mode === 'navigate') e.respondWith(page(req));
  else if (req.headers.has('range')) e.respondWith(part(req));
  else e.respondWith(file(req));
});

// Every page of the app is the one cached page; the network only if the cache is gone.
async function page(req) {
  const cache = await caches.open(CACHE);
  return (await cache.match('./')) || fetch(req);
}

// Cache first, then the network, keeping what it fetches.
async function file(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.status === 200 && res.type === 'basic') cache.put(req, res.clone()).catch(() => { });
  return res;
}

// A Range request (audio seeking) gets a 206 slice of the cached file, so recordings seek offline.
async function part(req) {
  const cache = await caches.open(CACHE);
  const full = await cache.match(req.url, { ignoreSearch: true });
  if (!full) return fetch(req);
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range').trim());
  if (!m || (m[1] === '' && m[2] === '')) return full; // a range we do not serve: the whole file is a valid answer
  const blob = await full.blob(), size = blob.size;
  let start, end;
  if (m[1] === '') { start = Math.max(0, size - Number(m[2])); end = size - 1; } // bytes=-N: the last N bytes
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start >= size || end < start) return new Response(null, { status: 416, statusText: 'Range Not Satisfiable', headers: { 'Content-Range': `bytes */${size}` } });
  const body = blob.slice(start, end + 1);
  return new Response(body, {
    status: 206, statusText: 'Partial Content',
    headers: {
      'Content-Type': full.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(body.size),
      'Accept-Ranges': 'bytes',
    },
  });
}
