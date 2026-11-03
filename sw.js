/* 321路加福音講義 · Service Worker（離線可用）
   版本字串在每次 make_site.py 重新打包時都會變，
   一變就會清掉舊快取、重新抓一份新的，使用者不必手動清除。 */
const V = '路加福音-gx11202610140711-tri10171929-gxa1019-gx1021c-vp1023-co1-gp1103-au1103-xz1103-sc1103-sk1103-xf1103-xm1103';
const PFX = '路加福音-';   /* 同一個 github.io 網域共用 Cache Storage：只清自己的前綴 */
const NC = u => ({ cache: new URL(u).origin === self.location.origin ? 'no-cache' : 'default' });
const SHELL = [
  './', './index.html', './sc.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png',
  './icon-180.png', './icon-167.png',
  './icon-152.png', './icon-120.png',
  './icon-64.png', './favicon.ico', './xz2.js', './coread.js', './peerjs.min.js'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => (r && r.ok) ? c.put(u, r) : null).catch(() => {})))).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== V && k.indexOf(PFX) === 0).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, NC(e.request.url)).then(r => {
      const cp = r.clone();
      caches.open(V).then(c => c.put(e.request, cp)).catch(() => {});
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
self.addEventListener('message', e => {
  const d = e.data;
  if (d === 'skip' || (d && (d.type === 'SKIP_WAITING' || d.t === 'skip'))) self.skipWaiting();
});
