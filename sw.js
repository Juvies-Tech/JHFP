/* JHFP service worker — offline-first so the app works in the gym with no signal */
/* Bump this version string on every release — it is what triggers the
   auto-update on Juan's phone. BETA 1.2: the 3-dot exercise menu actually works
   — the Train view now renders from the LOG rather than the programme, so the
   loop index IS the log index. Move physically moves the card, Remove strikes it
   through and locks its inputs, and removing an exercise no longer shifts the
   one below it (which was logging sets against the wrong exercise). Swap adopts
   the new movement's own rep range and rest. Typing 1 turns into BW on the spot.
   Back is one whole region again in Progress and on the diagram. New icon built
   from Juan's own kettlebell artwork, ember, filling the canvas. */
const C = 'jhfp-beta-1.2';
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
