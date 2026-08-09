/* JHFP service worker — offline-first so the app works in the gym with no signal */
/* Bump this version string on every release — it is what triggers the
   auto-update on Juan's phone.

   BETA 2.0 · run 1 of 4 — IDENTITY & ACCESS. The app now opens on a login
   portal rather than straight into somebody's log: profiles gained usernames,
   salted SHA-256 passwords and pictures, the master account (Juvies7) gained a
   Manage Accounts screen under Profile, and a forgotten password is reset by
   the master rather than by email, since there is no server to email from. All
   storage moved behind a STORE adapter so a cloud backend can be added later
   without touching 2,000 lines of callers. New icon: deep ember, black bell.
   Juan's existing jhfp_v1 record and his active P4 block are untouched. */
/* BETA 2.0 · run 2 of 4 — STRUCTURE & DESIGN. Progress and More are no longer
   single long scrolls: sections collapse to tappable headings that alternate
   ember and glacier, and remember how you left them. Programme and Volume stay
   pinned open. More is reordered to Profile, Data, Tools, then the libraries.
   On Today the quote moved up under the stat cards and the daily protocol
   became a heading carrying its own done-count. Back anatomy: shorter traps,
   wider and deeper lats. Every exercise picker is now grouped and ordered
   Kettlebell, Rings, Calisthenics, Gym, Cardio. */
/* BETA 2.0 · run 3 of 4 — THE TRAINING ENGINE. The programme stopped being a
   calendar and became a QUEUE: a missed session is what tomorrow shows, rest
   and sport days slide with it, and the week advances on work completed rather
   than days elapsed. A week picker at the top of Train overrides it, and
   picking out of order never consumes the session you still owe. Adventurer
   (P11) added as a no-programme mode and the default for NEW profiles only.
   Automatic workout generator built from the exercise library, enforcing the
   volume ceilings. Every complex and workout with a benchmark parameter is now
   scorable. Date arithmetic moved to UTC after a DST bug that froze the queue
   permanently once a year in any zone that observes it. */
/* BETA 2.0 · run 4 of 4 — CONTENT & THE BOOKEND. Finishing the last workout of
   the last week now CLOSES a block: it banks a summary of what the block
   produced, files it under Workout history, and drops onto Adventurer until you
   pick the next one. Seventeen complexes ported from the Hard to Kill note.
   Two new programmes: Farm Strong (kettlebell & sandbag, five movements a
   session, high sets) and Walk Before You Fly (beginners and older bodies, no
   pull-ups, no bells, no skill required). P7 renamed to Nimsdai Purja - Trail &
   Summit. Mobility rebuilt on the six GoWod zones with a daily rotating
   fifteen-minute routine weighted toward the weakest three. */
/* BETA 2.1 — polish pass after Beta 2.0 went live. The gate's philosophy
   headline no longer inherits the empty progress-photo box (a CSS class
   collision on ".ph"), the gate now leads with a permanent, non-collapsible
   warning that the log lives on this phone only and must be backed up weekly,
   and both backup filenames (Backup all data .json, Export to Obsidian .md)
   now carry the signed-in profile's name ahead of the date. */
const C = 'jhfp-beta-2.1';
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
