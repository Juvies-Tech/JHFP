/* JHFP service worker — offline-first so the app works in the gym with no signal */
/* Bump this version string on every release — it is what triggers the
   auto-update on Juan's phone. v4: recentred + enlarged kettlebell icon,
   bodybuilder-proportioned anatomy chart, rest "Done" button that logs real
   rest, in-session 3-dot exercise menu, workout history + retro logging,
   1kg = bodyweight code, avg heart rate, progress photos, local member
   profiles, kettlebell complexes, striking sessions, the Justin King
   functional hypertrophy programme, and 30s off every prescribed rest. */
const C = 'jhfp-v4';
const ASSETS = ['./', './index.html', './data.js', './app.js', './manifest.json', './icon.png', './icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copy = r.clone();
        caches.open(C).then(c => c.put(e.request, copy)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
