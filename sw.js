/* 321路加福音講義 · Service Worker（離線可用＋自動更新）
   VER 與 index.html 的 APPVER、version.json 三處一致，每次 make_site.py 打包都會變。
   · install：skipWaiting；預載清單用 cache:'reload' 抓，繞過 GitHub Pages 的 HTTP 快取
   · activate：刪舊快取、claim，通知所有視窗；在背景的頁面直接帶到新版
   · fetch：version.json 一律不快取；網頁、程式、清單網路優先（cache:'no-cache'），離線才用快取；
            圖示快取優先；音訊、影片與帶 range 的請求不攔 */
const VER = '1.1.202610130645-c979a26';
const V = '321luke-' + VER;
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png',
  './icon-180.png', './icon-167.png',
  './icon-152.png', './icon-120.png',
  './icon-64.png', './favicon.ico',
];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u =>
    fetch(new Request(u, { cache:'reload' })).then(r => { if (r.ok) return c.put(u, r); }).catch(() => {})
  ))).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()).then(() => self.clients.matchAll({ type:'window' })).then(cs => {
    cs.forEach(c => {
      try { c.postMessage({ t:'sw-updated', v:VER }); } catch(err){}
      try { if (c.visibilityState === 'hidden' && c.navigate) c.navigate(c.url); } catch(err){}
    });
  }));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const q = e.request;
  if (q.method !== 'GET') return;
  const u = new URL(q.url);
  if (u.origin !== location.origin) return;
  if (q.headers.has('range') || /\.(mp3|m4a|aac|wav|mp4|webm|mov)$/i.test(u.pathname)) return;
  if (/version\.json$/.test(u.pathname)) {
    e.respondWith(fetch(q, { cache:'no-store' }).catch(() => new Response('{}', { headers:{ 'Content-Type':'application/json' } })));
    return;
  }
  const net = q.mode === 'navigate' || /\.(html|js|json|webmanifest|css)$/i.test(u.pathname) || u.pathname.endsWith('/');
  if (net) {
    e.respondWith(fetch(q, { cache:'no-cache' }).then(r => {
      if (r.ok) { const cp = r.clone(); const key = q.mode === 'navigate' ? './index.html' : q;
        caches.open(V).then(c => c.put(key, cp)).catch(() => {}); }
      return r;
    }).catch(() => caches.match(q, { ignoreSearch:true }).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(q).then(r => r || fetch(q).then(r2 => {
    if (r2.ok) { const cp = r2.clone(); caches.open(V).then(c => c.put(q, cp)).catch(() => {}); }
    return r2;
  })));
});
