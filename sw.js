/* JHFP service worker — offline-first so the app works in the gym with no signal */
/* Bump this version string on every release — it is what triggers the
   auto-update on Juan's phone. BETA 1.0: anatomy chart rebuilt from muscle
   blocks with the back split into lats / rhomboids / erectors and tap-to-identify;
   MULTIPLE WORKOUTS PER DAY (a day is now an array of sessions, so a second
   workout no longer wipes the first); training streak that bridges programmed
   rest days; 1=BW now shows live in Train; Calisthenics workouts, corrected KB
   complexes, Leopard/Orca flows and two EMOMs from the Hard to Kill note;
   Zeus/Achilles/Hercules as benchmarks; session duration and start time;
   bigger, higher kettlebell icon. */
const C = 'jhfp-beta-1.0';
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
