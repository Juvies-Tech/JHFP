/* JHFP · app.js — logic, progression engine, rendering */

let VIEW='today', SESS=null, TMR=null, TSEC=0, TSTART=null;

/* ================= DATE / SCHEDULE ================= */
function dIdx(d){d=d||new Date();return (d.getDay()+6)%7}          // Mon=0
function daysBetween(a,b){return Math.floor((new Date(b)-new Date(a))/864e5)}
function curP(){return P[D.active.id]||P.p3}
function curWeek(){
  const p=curP(), n=daysBetween(D.active.start,todayISO());
  return Math.min(p.weeks, Math.max(1, Math.floor(n/7)+1));
}
function slotFor(day){const p=curP();return p.schedule[day===undefined?dIdx():day]}
/* A session can come from three places: the programme, a saved custom workout,
   or one built on the fly. Look in all of them. */
/* ================= SESSIONS PER DAY =================
   A day holds an ARRAY of sessions. D.ui.sidx is which one of today's is open in the
   Train tab; it is an index into that array, and it is clamped on every read so
   a stale value can never point past the end. */
/* Which of today's sessions is open. Persisted inside D: the service worker
   reloads the app on every update and profileSwitch() reloads too, and a
   module-local would silently bounce Juan back to session 1 mid-workout. */
function getIdx(){return (D.ui&&D.ui.sidx)||0}
function setIdx(i){D.ui=D.ui||{};D.ui.sidx=Math.max(0,i|0);save()}
function dayLogs(k){const v=D.logs[k];
  if(!v)return [];
  if(!Array.isArray(v)){D.logs[k]=[v];return D.logs[k]}   // belt and braces
  return v}
function todayLogs(){return dayLogs(todayISO())}
/* Walk every session ever logged. Everything that used to iterate D.logs by
   date must go through this, or it will only ever see the first session of a
   day and Juan's second workout vanishes from volume and calories again. */
function eachSession(fn){
  for(const k in D.logs)dayLogs(k).forEach((l,i)=>fn(k,l,i));
}
function curIdx(){const n=todayLogs().length;
  if(!n)return 0;
  return Math.max(0,Math.min(getIdx(),n-1))}
function curLog(){const a=todayLogs();return a.length?a[curIdx()]:null}
function setSess(i){setIdx(i);go('train')}
/* Add a brand new session for today WITHOUT touching the ones already logged. */
function addSess(id){const k=todayISO(),a=dayLogs(k);
  D.logs[k]=a;
  a.push({sid:id,pid:D.active.id,week:curWeek(),ex:[],done:false,start:Date.now(),free:true});
  setIdx(a.length-1);close_();go('train')}
function delSess(i){const k=todayISO(),a=dayLogs(k);
  if(!a[i])return;
  if(!confirm('Delete this session? Any sets logged in it are removed from your totals.'))return;
  a.splice(i,1);
  if(!a.length)delete D.logs[k];
  setIdx(0);close_();go('train')}
function sessLabel(l){const s=sessById(l.sid);return (s&&s.n)||l.name||'Session'}

function sessById(id){if(!id)return null;
  if(curP().sessions[id])return curP().sessions[id];
  if(D.custom[id])return D.custom[id];
  /* Optional extras live outside the programme entirely — a martial arts session
     or a kettlebell complex can be run on ANY day of ANY programme, as a second
     workout or a replacement, without disturbing the block. */
  if(id.indexOf('kbx_')===0)return kbxSession(id.slice(4));
  if(id.indexOf('cal_')===0)return calSession(id.slice(4));
  const x=XTRAORDER.map(k=>XTRA[k]).find(s=>s.id===id);
  return x||null}
/* Start an optional extra without touching the programme schedule. */
function startKbx(k){const s=kbxSession(k);if(!s)return;
  D.custom[s.id]=s;save();close_();freeSession(s.id)}
function startXtra(k){const x=XTRA[k];if(!x)return;
  D.custom[x.id]=x;save();close_();freeSession(x.id)}
function startCal(k){const c=calSession(k);if(!c)return;
  D.custom[c.id]=c;save();close_();freeSession(c.id)}
/* TODAY'S session. If a session has already been chosen and logged for today —
   picked on a rest day, rescued, or custom-built — that choice wins over the
   schedule. Reading the schedule alone was why "train anyway" never opened. */
function sessFor(day){
  if(day===undefined){const l=curLog();
    if(l&&l.sid){const s=sessById(l.sid);if(s)return s}}
  const s=slotFor(day);
  return (s==='rest'||s==='sport')?null:curP().sessions[s];
}
function todaySid(){const l=curLog();if(l&&l.sid&&sessById(l.sid))return l.sid;
  const s=slotFor();return (s==='rest'||s==='sport')?null:s}
function uid(){return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function progPct(){const p=curP();return Math.min(100,Math.round((daysBetween(D.active.start,todayISO())+1)/(p.weeks*7)*100))}

/* ================= PROGRESSION ENGINE ================= */
function setsFor(ex,mod){
  if(ex.fst)return ex.s;
  let s=ex.s+(mod||0);
  return Math.max(1,Math.min(ex.s+2,s));
}
function parseRange(r){const m=String(r).match(/(\d+)\s*-\s*(\d+)/);
  if(m)return[+m[1],+m[2]];const s=String(r).match(/^(\d+)/);return s?[+s[1],+s[1]]:null}
function lastLog(name){
  const ks=Object.keys(D.logs).sort().reverse();
  for(const k of ks){
    /* newest session of the day first, so a second workout progresses off
       itself rather than off the morning's numbers */
    const day=dayLogs(k);
    for(let i=day.length-1;i>=0;i--){const l=day[i];if(!l||!l.ex)continue;
      const e=l.ex.find(x=>x.n===name&&x.sets&&x.sets.some(s=>s.done));
      if(e)return{date:k,e:e}}}
  return null;
}
function bumpFor(name){
  const m=EX[name]&&EX[name].m||[];
  if(/Deadlift|squat|Squat|press|Press|Rack pull|Romanian/.test(name)&&m.some(x=>['quads','hams','glutes','back'].includes(x)))return 5;
  return 2.5;
}
/* ---- BODYWEIGHT CODE ----
   Juan's shorthand: entering 1 as the load means "bodyweight". At home the only
   external weights he owns are two kettlebells, so most home sets are genuinely
   unloaded and typing 0 felt like logging nothing. 1kg is never a real working
   load for anything in the library, so it is safe to claim as a sentinel.
   A BW set is displayed as BW and PROGRESSED ON REPS ONLY — load never climbs
   until he actually adds a bell, at which point normal load progression resumes. */
function isBW(w){if(w===''||w===null||w===undefined)return false;
  return Math.abs(pnum(w)-1)<1e-9}
function wDisp(w){if(w===''||w===null||w===undefined)return '';
  if(isBW(w))return 'BW';
  const n=pnum(w);return fmt(n,n%1?1:0)+'kg'}

function target(ex,mod){
  const L=lastLog(ex.n), rng=parseRange(ex.r), sets=setsFor(ex,mod);
  if(!L)return{txt:'First time — find a load you can control for '+ex.r+'. Log it and I\'ll progress it from here. Enter 1 for the load if you are doing it at bodyweight.',prev:null};
  const done=L.e.sets.filter(s=>s.done&&(s.r||s.w));
  if(!done.length)return{txt:'Repeat last session and log it.',prev:null};
  /* Unloaded EITHER because nothing was entered, or because he used the 1=BW code. */
  const bw=done.every(s=>!s.w||pnum(s.w)===0||isBW(s.w));
  const loaded=done.filter(s=>!isBW(s.w)&&pnum(s.w)>0);
  const best=(loaded.length?loaded:done).reduce((a,s)=>(pnum(s.w)>pnum(a.w)?s:a),(loaded.length?loaded:done)[0]);
  const prev=done.map(s=>(s.w?wDisp(s.w)+'×':'')+(s.r||'—')).join('  ');
  if(bw){
    const tot=done.reduce((a,s)=>a+(+s.r||0),0);
    const top=rng?' Top of the range is '+rng[1]+' — once every set is there, add a bell and I\'ll switch you back to load progression.':'';
    return{txt:'Bodyweight. Last time: '+prev+'  ('+tot+' total reps). Beat the total today.'+top,prev:prev};
  }
  if(rng){
    const allTop=done.every(s=>+s.r>=rng[1]);
    if(allTop){const nw=+best.w+bumpFor(ex.n);
      return{txt:'You hit the top of the range everywhere. Go '+fmt(nw,nw%1?1:0)+'kg × '+rng[0]+' today.',prev:prev};}
    const low=done.find(s=>+s.r<rng[1]);
    return{txt:'Last time: '+prev+'. Stay at '+fmt(best.w,+best.w%1?1:0)+'kg and add reps — target '+(Math.min(rng[1],(+low.r||rng[0])+1))+'.',prev:prev};
  }
  return{txt:'Last time: '+prev+'. Match it or beat it.',prev:prev};
}

/* ================= VOLUME / HEAT MAP ================= */
const MUS=['chest','back','delts','biceps','triceps','quads','hams','glutes','calves','core','forearms','traps'];
const MUSN={chest:'Chest',back:'Back',delts:'Delts',biceps:'Biceps',triceps:'Triceps',quads:'Quads',
hams:'Hams',glutes:'Glutes',calves:'Calves',core:'Core',forearms:'Forearms',traps:'Traps'};
/* Sets are weighted by how directly the exercise trains the muscle:
   the first muscle listed is the prime mover (counts 1.0), the second is a
   strong secondary (0.5), anything after that is a stabiliser (0.25).
   Counting every stabiliser as a full set is how people convince themselves
   they are doing 50 sets of back a week. RP landmarks assume DIRECT sets. */
const WT=[1,.5,.25];
function addVol(out,name,n){const ms=(EX[name]&&EX[name].m)||[];
  ms.forEach((m,i)=>{if(out[m]!==undefined)out[m]+=n*(WT[i]!==undefined?WT[i]:.25)})}
function volume(days){
  const out={};MUS.forEach(m=>out[m]=0);
  const cut=todayISO(new Date(Date.now()-(days-1)*864e5));
  /* EVERY session of every day. Iterating D.logs by date alone would only see
     the first workout and silently drop Juan's second one. */
  eachSession((k,l)=>{ if(k<cut||!l.ex)return;
    /* Skipped exercises and anything flagged as a warm-up are real work but not
       growth stimulus — they must not inflate the heat map. */
    l.ex.forEach(e=>{if(e.skip||e.warm)return;
      const n=(e.sets||[]).filter(s=>s.done).length; if(n)addVol(out,e.n,n)});});
  MUS.forEach(m=>out[m]=Math.round(out[m]));
  return out;
}
/* Volume landmarks per muscle (RP-style). Muscles do NOT share one ceiling:
   back and core tolerate far more weekly volume than biceps or calves.
   [MV maintenance, MEV growth starts, MRV recoverable ceiling] */
const LAND={chest:[6,10,22],back:[8,12,28],delts:[6,8,26],biceps:[5,8,20],triceps:[5,8,20],
quads:[6,10,20],hams:[4,8,20],glutes:[4,8,20],calves:[6,8,20],core:[6,10,26],
forearms:[5,8,25],traps:[4,6,20]};
function volState2(v,L){L=L||[6,10,20];
  return v<L[0]?['Under','var(--bad)']:v<L[1]?['Building','var(--warn)']
    :v<=L[2]?['In range','var(--ok)']:['High','var(--warn)']}
function volState(v,m){return volState2(v,LAND[m])}

/* ================= ANATOMY HEAT MAP =================
   Line-art figures. Every muscle is a stroked outline; colour fills in only
   as that muscle takes volume, judged against its own landmarks. Left-half
   paths are mirrored for the right side. */
/* ================= ANATOMY FIGURE (Beta 1.0) =================
   Rebuilt. Every previous version drew a body outline and then laid muscle
   shapes on top, and each iteration fought a mismatch between the two — shapes
   spilling past the edge, or vanishing inside it. HERE THERE IS NO SILHOUETTE:
   the muscle groups ARE the body. Every coloured region is a tracked muscle, so
   "which muscle is that" has an answer by construction, and overflow is
   impossible because there is nothing to overflow. Untrained muscles render as
   a VISIBLE grey block rather than the hairline outline that made v4 unreadable.

   Non-muscle filler (head, neck, hands, knees, feet) is flat body colour and is
   obviously not a muscle. Left half only; the right is mirrored numerically —
   an SVG transform inside a clipPath is not honoured by every renderer.

   Geometry is generated from half-width landmark tables; see
   Health/JHFP-build/anat_v5.py. Retuning is editing numbers, not beziers. */
const AFILL=["M100,8 C112,8 119,19 119,34 C119,49 112,59 100,59 C88,59 81,49 81,34 C81,19 88,8 100,8 Z","M85.0,50.0C82.7,51.7 85.7,57.0 86.0,60.0C86.3,63.0 84.7,66.7 87.0,68.0C89.3,69.3 97.8,69.3 100.0,68.0C102.2,66.7 100.0,63.0 100.0,60.0C100.0,57.0 102.5,51.7 100.0,50.0C97.5,48.3 87.3,48.3 85.0,50.0Z","M70.0,258.0C67.3,260.0 68.0,266.0 68.0,270.0C68.0,274.0 69.0,278.7 70.0,282.0C71.0,285.3 72.0,288.7 74.0,290.0C76.0,291.3 80.3,291.3 82.0,290.0C83.7,288.7 83.5,285.3 84.0,282.0C84.5,278.7 85.0,274.0 85.0,270.0C85.0,266.0 86.5,260.0 84.0,258.0C81.5,256.0 72.7,256.0 70.0,258.0Z","M81.0,320.0C79.3,321.7 81.8,327.0 82.0,330.0C82.2,333.0 80.3,336.7 82.0,338.0C83.7,339.3 90.3,339.3 92.0,338.0C93.7,336.7 92.0,333.0 92.0,330.0C92.0,327.0 93.8,321.7 92.0,320.0C90.2,318.3 82.7,318.3 81.0,320.0Z","M85.0,400.0C83.7,402.0 85.7,408.7 86.0,412.0C86.3,415.3 85.7,418.7 87.0,420.0C88.3,421.3 92.7,421.3 94.0,420.0C95.3,418.7 95.0,415.3 95.0,412.0C95.0,408.7 95.7,402.0 94.0,400.0C92.3,398.0 86.3,398.0 85.0,400.0Z"];
const AF={traps:["M70.0,62.0C67.3,63.3 69.7,67.7 70.0,70.0C70.3,72.3 69.3,75.0 72.0,76.0C74.7,77.0 83.7,77.0 86.0,76.0C88.3,75.0 86.0,72.3 86.0,70.0C86.0,67.7 88.7,63.3 86.0,62.0C83.3,60.7 72.7,60.7 70.0,62.0Z"],delts:["M56.0,64.0C51.7,66.0 47.0,71.7 44.0,76.0C41.0,80.3 39.0,85.3 38.0,90.0C37.0,94.7 37.2,99.7 38.0,104.0C38.8,108.3 39.0,114.0 43.0,116.0C47.0,118.0 58.8,118.0 62.0,116.0C65.2,114.0 62.0,108.3 62.0,104.0C62.0,99.7 61.7,94.7 62.0,90.0C62.3,85.3 62.7,80.3 64.0,76.0C65.3,71.7 71.3,66.0 70.0,64.0C68.7,62.0 60.3,62.0 56.0,64.0Z"],chest:["M64.0,78.0C58.3,80.3 63.8,87.3 64.0,92.0C64.2,96.7 64.2,101.7 65.0,106.0C65.8,110.3 67.5,114.7 69.0,118.0C70.5,121.3 69.2,124.7 74.0,126.0C78.8,127.3 94.0,127.3 98.0,126.0C102.0,124.7 98.0,121.3 98.0,118.0C98.0,114.7 98.0,110.3 98.0,106.0C98.0,101.7 98.0,96.7 98.0,92.0C98.0,87.3 103.7,80.3 98.0,78.0C92.3,75.7 69.7,75.7 64.0,78.0Z"],biceps:["M43.0,122.0C40.2,124.7 44.2,132.7 45.0,138.0C45.8,143.3 47.0,148.7 48.0,154.0C49.0,159.3 50.0,165.7 51.0,170.0C52.0,174.3 52.5,178.3 54.0,180.0C55.5,181.7 59.0,181.7 60.0,180.0C61.0,178.3 60.0,174.3 60.0,170.0C60.0,165.7 59.8,159.3 60.0,154.0C60.2,148.7 60.7,143.3 61.0,138.0C61.3,132.7 65.0,124.7 62.0,122.0C59.0,119.3 45.8,119.3 43.0,122.0Z"],forearms:["M53.0,186.0C51.0,188.7 51.2,196.7 51.0,202.0C50.8,207.3 51.2,212.3 52.0,218.0C52.8,223.7 54.5,230.3 56.0,236.0C57.5,241.7 59.5,249.3 61.0,252.0C62.5,254.7 64.7,254.7 65.0,252.0C65.3,249.3 63.2,241.7 63.0,236.0C62.8,230.3 63.8,223.7 64.0,218.0C64.2,212.3 64.2,207.3 64.0,202.0C63.8,196.7 64.8,188.7 63.0,186.0C61.2,183.3 55.0,183.3 53.0,186.0Z"],core:["M75.0,130.0C71.3,133.0 75.7,142.0 76.0,148.0C76.3,154.0 76.7,160.3 77.0,166.0C77.3,171.7 78.2,177.0 78.0,182.0C77.8,187.0 72.7,193.7 76.0,196.0C79.3,198.3 94.3,198.3 98.0,196.0C101.7,193.7 98.0,187.0 98.0,182.0C98.0,177.0 98.0,171.7 98.0,166.0C98.0,160.3 98.0,154.0 98.0,148.0C98.0,142.0 101.8,133.0 98.0,130.0C94.2,127.0 78.7,127.0 75.0,130.0Z"],quads:["M69.0,204.0C64.0,207.3 67.2,217.0 67.0,224.0C66.8,231.0 67.3,238.3 68.0,246.0C68.7,253.7 69.8,262.0 71.0,270.0C72.2,278.0 73.5,286.7 75.0,294.0C76.5,301.3 77.0,310.7 80.0,314.0C83.0,317.3 90.7,317.3 93.0,314.0C95.3,310.7 93.7,301.3 94.0,294.0C94.3,286.7 94.8,278.0 95.0,270.0C95.2,262.0 94.8,253.7 95.0,246.0C95.2,238.3 95.7,231.0 96.0,224.0C96.3,217.0 101.5,207.3 97.0,204.0C92.5,200.7 74.0,200.7 69.0,204.0Z"],calves:["M78.0,342.0C75.0,344.7 76.2,352.7 76.0,358.0C75.8,363.3 76.2,369.0 77.0,374.0C77.8,379.0 79.7,384.0 81.0,388.0C82.3,392.0 82.8,396.3 85.0,398.0C87.2,399.7 92.5,399.7 94.0,398.0C95.5,396.3 94.0,392.0 94.0,388.0C94.0,384.0 94.0,379.0 94.0,374.0C94.0,369.0 94.0,363.3 94.0,358.0C94.0,352.7 96.7,344.7 94.0,342.0C91.3,339.3 81.0,339.3 78.0,342.0Z"]};
const AB={traps:["M74.0,62.0C69.2,64.0 69.7,70.0 69.0,74.0C68.3,78.0 69.3,83.0 70.0,86.0C70.7,89.0 68.3,91.0 73.0,92.0C77.7,93.0 93.8,93.0 98.0,92.0C102.2,91.0 98.0,89.0 98.0,86.0C98.0,83.0 98.0,78.0 98.0,74.0C98.0,70.0 102.0,64.0 98.0,62.0C94.0,60.0 78.8,60.0 74.0,62.0Z"],delts:["M56.0,64.0C51.7,66.0 47.0,71.7 44.0,76.0C41.0,80.3 39.0,85.3 38.0,90.0C37.0,94.7 37.2,99.7 38.0,104.0C38.8,108.3 39.0,114.0 43.0,116.0C47.0,118.0 58.8,118.0 62.0,116.0C65.2,114.0 62.0,108.3 62.0,104.0C62.0,99.7 61.7,94.7 62.0,90.0C62.3,85.3 62.7,80.3 64.0,76.0C65.3,71.7 71.3,66.0 70.0,64.0C68.7,62.0 60.3,62.0 56.0,64.0Z"],back:["M63.0,94.0C57.0,97.0 61.8,105.7 62.0,112.0C62.2,118.3 62.8,125.3 64.0,132.0C65.2,138.7 67.3,145.3 69.0,152.0C70.7,158.7 72.7,165.3 74.0,172.0C75.3,178.7 73.0,188.7 77.0,192.0C81.0,195.3 94.5,195.3 98.0,192.0C101.5,188.7 98.0,178.7 98.0,172.0C98.0,165.3 98.0,158.7 98.0,152.0C98.0,145.3 98.0,138.7 98.0,132.0C98.0,125.3 98.0,118.3 98.0,112.0C98.0,105.7 103.8,97.0 98.0,94.0C92.2,91.0 69.0,91.0 63.0,94.0Z"],triceps:["M43.0,122.0C40.2,124.7 44.2,132.7 45.0,138.0C45.8,143.3 47.0,148.7 48.0,154.0C49.0,159.3 50.0,165.7 51.0,170.0C52.0,174.3 52.5,178.3 54.0,180.0C55.5,181.7 59.0,181.7 60.0,180.0C61.0,178.3 60.0,174.3 60.0,170.0C60.0,165.7 59.8,159.3 60.0,154.0C60.2,148.7 60.7,143.3 61.0,138.0C61.3,132.7 65.0,124.7 62.0,122.0C59.0,119.3 45.8,119.3 43.0,122.0Z"],forearms:["M53.0,186.0C51.0,188.7 51.2,196.7 51.0,202.0C50.8,207.3 51.2,212.3 52.0,218.0C52.8,223.7 54.5,230.3 56.0,236.0C57.5,241.7 59.5,249.3 61.0,252.0C62.5,254.7 64.7,254.7 65.0,252.0C65.3,249.3 63.2,241.7 63.0,236.0C62.8,230.3 63.8,223.7 64.0,218.0C64.2,212.3 64.2,207.3 64.0,202.0C63.8,196.7 64.8,188.7 63.0,186.0C61.2,183.3 55.0,183.3 53.0,186.0Z"],glutes:["M70.0,200.0C64.8,202.0 67.5,208.0 67.0,212.0C66.5,216.0 66.5,220.3 67.0,224.0C67.5,227.7 65.2,232.3 70.0,234.0C74.8,235.7 91.5,235.7 96.0,234.0C100.5,232.3 96.7,227.7 97.0,224.0C97.3,220.3 97.8,216.0 98.0,212.0C98.2,208.0 102.7,202.0 98.0,200.0C93.3,198.0 75.2,198.0 70.0,200.0Z"],hams:["M69.0,240.0C64.5,243.3 68.7,253.3 69.0,260.0C69.3,266.7 70.0,273.3 71.0,280.0C72.0,286.7 73.5,294.3 75.0,300.0C76.5,305.7 77.0,311.7 80.0,314.0C83.0,316.3 90.7,316.3 93.0,314.0C95.3,311.7 93.7,305.7 94.0,300.0C94.3,294.3 94.8,286.7 95.0,280.0C95.2,273.3 94.8,266.7 95.0,260.0C95.2,253.3 100.3,243.3 96.0,240.0C91.7,236.7 73.5,236.7 69.0,240.0Z"],calves:["M78.0,342.0C75.0,344.7 76.2,352.7 76.0,358.0C75.8,363.3 76.2,369.0 77.0,374.0C77.8,379.0 79.7,384.0 81.0,388.0C82.3,392.0 82.8,396.3 85.0,398.0C87.2,399.7 92.5,399.7 94.0,398.0C95.5,396.3 94.0,392.0 94.0,388.0C94.0,384.0 94.0,379.0 94.0,374.0C94.0,369.0 94.0,363.3 94.0,358.0C94.0,352.7 96.7,344.7 94.0,342.0C91.3,339.3 81.0,339.3 78.0,342.0Z"]};
const ALAB={"F": {"traps": (64, "R"), "delts": (94, "L"), "chest": (100, "R"), "biceps": (150, "L"), "forearms": (214, "L"), "core": (166, "R"), "quads": (258, "R"), "calves": (368, "R")}, "B": {"traps": (72, "R"), "delts": (96, "L"), "back": (140, "R"), "triceps": (152, "L"), "forearms": (222, "L"), "glutes": (216, "R"), "hams": (274, "R"), "calves": (368, "R")}};

function amirror(d){return d.replace(/(-?[\d.]+),(-?[\d.]+)/g,
  (m,x,y)=>(200-parseFloat(x)).toFixed(1)+','+(+y).toFixed(1))}

/* The back is ONE region again. An earlier release split it into lats /
   rhomboids / erectors derived from movement pattern; Juan found the extra
   detail unnecessary in Progress, so it is back to the single "back" muscle
   that the exercise library actually tags. */

function heatLv(v,L){
  L=L||[6,10,20];
  if(!v||v<=0)return 0;
  if(v<L[0])return 1;
  if(v<L[1])return 2;
  if(v<=L[2])return 3;
  return 4;
}
const SHADE=[['var(--mus0)',1],['var(--acc)',.38],['var(--acc)',.68],
             ['var(--acc)',.96],['var(--warn)',.96]];
function heatFill(v,m){return SHADE[heatLv(v,LAND[m])]}

/* Which muscle the user last tapped, so the caption under the figure can name
   it. Tapping is how a muscle is identified — the labels are deliberately not
   drawn on the figure, which keeps it clean at phone size. */
let APICK=null;
function pickMus(k){APICK=(APICK===k)?null:k;render()}
function musName(k){return MUSN[k]||k}
function musVal(k,v){return [v[k]||0,LAND[k]||[6,10,20]]}

function figure(parts,v,label,side){
  let o='<svg viewBox="0 0 200 442" width="100%" role="img" aria-label="'+label
    +' view muscle map">';
  /* non-muscle filler: head, neck, hands, knees, feet */
  AFILL.forEach(d=>{[d,amirror(d)].forEach(dd=>{
    o+='<path d="'+dd+'" fill="var(--musf)" stroke="var(--bg)" stroke-width="1.6"/>';});});
  for(const m in parts){
    const mv=musVal(m,v), lv=heatLv(mv[0],mv[1]), sh=SHADE[lv];
    const on=(APICK===m);
    parts[m].forEach(d=>{[d,amirror(d)].forEach(dd=>{
      /* the dark stroke IS the gap between muscles — it is what makes each
         group read as its own identifiable region */
      o+='<path d="'+dd+'" fill="'+sh[0]+'" fill-opacity="'+sh[1]
        +'" stroke="'+(on?'var(--tx)':'var(--bg)')+'" stroke-width="'+(on?2.2:1.6)
        +'" stroke-linejoin="round" style="cursor:pointer"'
        +' onclick="pickMus(\''+m+'\')"><title>'+musName(m)+' — '+mv[0]+' sets</title></path>';});});
  }
  o+='<text x="100" y="438" text-anchor="middle" font-size="12" font-weight="700" '
    +'fill="var(--tx3)">'+label+'</text>';
  return o+'</svg>';
}
function figFront(v){return figure(AF,v,'FRONT','F')}
function figBack(v){return figure(AB,v,'BACK','B')}
let HEATDAYS=7;
function setHeat(d){HEATDAYS=d;render()}

/* ================= CARDIO & EFFORT ================= */
const CARDIO={
run:{n:'Run',ic:'run',f:[['km','Distance','km'],['min','Time','min']],pace:1,bench:1,met:9.8},
hike:{n:'Hike / walk',ic:'hike',f:[['km','Distance','km'],['min','Time','min'],['elev','Elevation','m']],met:6.5},
erg:{n:'Bike / row / erg',ic:'erg',f:[['km','Distance','km'],['min','Time','min']],met:8.5},
interval:{n:'Interval / circuit',ic:'int',f:[['rounds','Rounds',''],['min','Time','min']],met:8.0}};
/* Striking. The long bag and gloves are part of the home kit, so boxing,
   kickboxing and Muay Thai are first-class cardio types. They are measured in
   ROUNDS and minutes, not kilometres. */
Object.assign(CARDIO,{
box:{n:'Boxing',ic:'box',f:[['rounds','Rounds',''],['min','Time','min']],met:9.5},
kick:{n:'Kickboxing',ic:'box',f:[['rounds','Rounds',''],['min','Time','min']],met:10.0},
muay:{n:'Muay Thai',ic:'box',f:[['rounds','Rounds',''],['min','Time','min']],met:10.3}});
function isCardio(e){return !!(e&&e.k&&CARDIO[e.k])}

/* ---- NUMBER & TIME INPUT ----
   BUG (v3): every metric was an <input type="number">. On iOS that rejects a
   colon outright, so a 45:30 run could not be entered, and a comma decimal
   separator silently produced an empty value. These fields are now plain text
   with a decimal/numeric inputmode, parsed leniently on the way in.
   `pnum` takes 5,5 or 5.5. `ptime` takes 45, 45.5, 45:30 or 1:12:04 and always
   returns MINUTES as a number, so pace and calorie maths are unchanged. */
function pnum(v){if(v===null||v===undefined)return 0;
  const s=String(v).trim().replace(',','.').replace(/[^\d.\-]/g,'');
  const n=parseFloat(s);return isFinite(n)?n:0}
function ptime(v){if(v===null||v===undefined)return 0;
  const s=String(v).trim().replace(',','.');
  if(s.indexOf(':')>-1){
    const p=s.split(':').map(x=>parseFloat(x.replace(/[^\d.]/g,''))||0);
    /* mm:ss, or h:mm:ss when three parts are given */
    if(p.length>=3)return p[0]*60+p[1]+p[2]/60;
    return p[0]+p[1]/60;}
  return pnum(s)}
function ftime(min){if(!min)return '';
  const t=Math.round(min*60),h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;
  return (h?h+':'+String(m).padStart(2,'0'):String(m))+':'+String(s).padStart(2,'0')}
/* Which parser a cardio field needs, by field key. */
function fKind(k){return k==='min'?'time':(k==='rounds'||k==='elev'||k==='kcal'||k==='effort'||k==='hr')?'int':'dec'}
function fVal(k,v){return fKind(k)==='time'?ptime(v):pnum(v)}
/* Rough burn from METs when Juan does not enter a figure himself:
   kcal = MET x bodyweight kg x hours. Good enough to trend, not a lab number. */
function estKcal(kind,min){const C=CARDIO[kind];if(!C||!min)return 0;
  return Math.round(C.met*(D.settings.weight||84)*(min/60));}
function pace(km,min){if(!km||!min)return '';const p=min/km;
  return Math.floor(p)+':'+String(Math.round((p%1)*60)).padStart(2,'0')+' /km';}
function dayKcal(k){return dayLogs(k).reduce((a,l)=>a+(l.done?(+l.kcal||0):0),0)}
function kcalOver(days){let t=0;const cut=todayISO(new Date(Date.now()-(days-1)*864e5));
  for(const k in D.logs){if(k>=cut)t+=dayKcal(k)}return t}
function avgEffort(days){const cut=todayISO(new Date(Date.now()-(days-1)*864e5));
  const es=[];eachSession((k,l)=>{
    if(k>=cut&&l.done&&l.effort)es.push(+l.effort)});
  return es.length?(es.reduce((a,b)=>a+b,0)/es.length):0}

/* ================= STREAKS ================= */
function jDone(k){const j=D.journal[k];if(!j)return 0;return JOURNAL.filter(x=>j[x.k]).length}
/* ---- TRAINING STREAK ----
   The old "Streak" card counted the 12-item daily protocol and needed 9 of them
   ticked, so two workouts in a day still read 0 — which is exactly what confused
   Juan. It now counts CONSECUTIVE TRAINING DAYS.

   A PROGRAMMED rest day does not break the streak: the schedule says not to
   train, so obeying it is not a failure. It bridges rather than counts — a rest
   day carries the streak across without incrementing it, so the number stays an
   honest count of days actually trained. An unplanned skip still breaks it. */
function trainedOn(k){return dayLogs(k).some(l=>l&&l.done)}
function isRestDay(d){
  const p=curP();
  if(!p||!p.schedule)return false;
  /* which slot the programme prescribes for that calendar day */
  const slot=p.schedule[(d.getDay()+6)%7];
  return slot==='rest';
}
function trainStreak(){
  let n=0,d=new Date(),guard=0;
  /* today not being trained yet is not a break — start from yesterday */
  if(!trainedOn(todayISO(d))&&!isRestDay(d))d=new Date(d.getTime()-864e5);
  for(;;){
    if(guard++>800)break;
    const k=todayISO(d);
    if(trainedOn(k)){n++}
    else if(isRestDay(d)){/* programmed rest — bridge, do not count */}
    else break;
    d=new Date(d.getTime()-864e5);
  }
  return n;
}
function streak(){let n=0,d=new Date();
  if(jDone(todayISO(d))<JOURNAL.length*0.75)d=new Date(d.getTime()-864e5);
  for(;;){const k=todayISO(d); if(jDone(k)>=JOURNAL.length*0.75){n++;d=new Date(d.getTime()-864e5)}else break; if(n>999)break}
  return n;
}
function mobStreak(){let n=0,d=new Date();
  if(!D.mobility[todayISO(d)])d=new Date(d.getTime()-864e5);
  for(;;){if(D.mobility[todayISO(d)]){n++;d=new Date(d.getTime()-864e5)}else break; if(n>999)break}
  return n;
}

/* ================= NAV ================= */
function go(v){VIEW=v;
  document.querySelectorAll('.view').forEach(e=>e.classList.remove('on'));
  document.getElementById('v-'+v).classList.add('on');
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  window.scrollTo(0,0); render();
}
function open_(w,a){const c=document.getElementById('sheetc');c.innerHTML=SHEETS[w](a);
  document.getElementById('sheet').classList.add('on')}
function close_(){document.getElementById('sheet').classList.remove('on');render()}

/* ================= REST TIMER =================
   The prescription is a CEILING, not an instruction. Juan was hitting Skip on
   every rest, which made the log read as though he never rested at all. "Done"
   stops the clock AND writes the rest he actually took onto that set, so the
   log tells the truth and the prescriptions can be judged against reality.
   Skip still exists and still writes nothing — it means "no rest taken". */
let TREF=null;                                   // {i,j,at,pre} — which set is resting
function tStart(sec,i,j){
  TSEC=sec||D.settings.restDefault;
  TREF=(i===undefined)?null:{i:i,j:j,at:Date.now(),pre:TSEC};
  const el=document.getElementById('timer');
  el.classList.add('on');clearInterval(TMR);
  const tick=()=>{
    const t=document.getElementById('tmt');
    const over=TSEC<0;
    if(t)t.textContent=(over?'Over +':'Rest ')
      +Math.floor(Math.abs(TSEC)/60)+':'+String(Math.abs(TSEC)%60).padStart(2,'0');
    if(el)el.classList.toggle('over',over);
    /* At zero it buzzes but keeps counting UP, so "Done" still records honestly
       if he takes longer than prescribed instead of the timer just vanishing. */
    if(TSEC===0&&navigator.vibrate)navigator.vibrate([200,80,200]);
    TSEC--};
  tick();TMR=setInterval(tick,1000)}
function tAdd(s){TSEC+=s}
function tStop(){clearInterval(TMR);TREF=null;
  const el=document.getElementById('timer');if(el){el.classList.remove('on');el.classList.remove('over')}}
/* Done — log the true rest against the set that started the clock. */
function tDone(){
  if(TREF){
    const secs=Math.max(0,Math.round((Date.now()-TREF.at)/1000));
    const l=curLog();
    if(l&&l.ex[TREF.i]&&l.ex[TREF.i].sets[TREF.j]){l.ex[TREF.i].sets[TREF.j].rs=secs;save()}
  }
  tStop();rTrain()}
function restTxt(s){if(s===undefined||s===null||s==='')return '';
  return s>=60?Math.floor(s/60)+':'+String(s%60).padStart(2,'0'):s+'s'}

/* ---- Interval timer & stopwatch ---- */
let IV=null, IVT=null;
function buzz(p){if(navigator.vibrate)navigator.vibrate(p||[180])}
function ivStart(){
  const work=+document.getElementById('iw').value||30;
  const rest=+document.getElementById('ir').value||30;
  const rounds=+document.getElementById('ind').value||8;
  const prep=+document.getElementById('ip').value||5;
  IV={work:work,rest:rest,rounds:rounds,round:0,phase:'prep',left:prep,run:true};
  D.settings.iv={work:work,rest:rest,rounds:rounds,prep:prep};save();
  clearInterval(IVT);IVT=setInterval(ivTick,1000);ivPaint();}
function ivTick(){
  if(!IV||!IV.run)return;
  IV.left--;
  if(IV.left<=0){
    if(IV.phase==='prep'){IV.phase='work';IV.round=1;IV.left=IV.work;buzz([200,80,200])}
    else if(IV.phase==='work'){
      /* the last work interval ends the session — no trailing rest */
      if(IV.round>=IV.rounds){ivDone();return}
      if(IV.rest>0){IV.phase='rest';IV.left=IV.rest;buzz([300])}
      else{IV.round++;IV.left=IV.work;buzz([200,80,200])}}
    else{IV.round++;IV.phase='work';IV.left=IV.work;buzz([200,80,200])}}
  else if(IV.left<=3)buzz([60]);
  ivPaint();}
function ivDone(){IV.run=false;IV.phase='done';clearInterval(IVT);buzz([300,120,300,120,300]);ivPaint()}
function ivPause(){if(!IV)return;IV.run=!IV.run;ivPaint()}
function ivReset(){clearInterval(IVT);IV=null;open_('timer')}
function ivPreset(w,r,n){D.settings.iv={work:w,rest:r,rounds:n,prep:(D.settings.iv||{}).prep||5};
  save();open_('timer')}
function ivPaint(){const el=document.getElementById('ivface');if(!el||!IV)return;
  const c={prep:'var(--amb)',work:'var(--acc)',rest:'var(--ice)',done:'var(--grn)'}[IV.phase];
  el.innerHTML='<div style="text-align:center;padding:14px 0">'
   +'<div class="tiny" style="color:'+c+'">'+(IV.phase==='done'?'Complete':IV.phase.toUpperCase())+'</div>'
   +'<div style="font-size:64px;font-weight:700;line-height:1.05;color:'+c+'" class="mono">'
   +Math.floor(Math.max(0,IV.left)/60)+':'+String(Math.max(0,IV.left)%60).padStart(2,'0')+'</div>'
   +'<div class="sub">Round '+Math.max(1,IV.round)+' of '+IV.rounds+'</div></div>';}
let SW=null,SWT=null,SWL=[];
function swToggle(){
  if(SW&&SW.run){SW.run=false;SW.acc+=Date.now()-SW.t0;clearInterval(SWT)}
  else{SW=SW||{acc:0,run:false};SW.run=true;SW.t0=Date.now();
    clearInterval(SWT);SWT=setInterval(swPaint,80)}
  swPaint();}
function swLap(){if(!SW)return;SWL.unshift(swMs());swPaint()}
function swReset(){clearInterval(SWT);SW=null;SWL=[];open_('timer')}
function swMs(){if(!SW)return 0;return SW.acc+(SW.run?Date.now()-SW.t0:0)}
function swPaint(){const el=document.getElementById('swface');if(!el)return;
  const ms=swMs(),t=Math.floor(ms/1000);
  el.innerHTML='<div style="text-align:center;padding:10px 0">'
   +'<div style="font-size:56px;font-weight:700;line-height:1.05" class="mono">'
   +String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')
   +'<span style="font-size:24px;color:var(--tx3)">.'+String(Math.floor(ms%1000/100))+'</span></div>'
   +(SWL.length?'<div class="jm" style="margin-top:8px">'+SWL.slice(0,6).map((l,i)=>
     'Lap '+(SWL.length-i)+' \u00b7 '+Math.floor(l/60000)+':'+String(Math.floor(l%60000/1000)).padStart(2,'0')).join('<br>')+'</div>':'')
   +'</div>';}

/* ================= RENDER ROUTER ================= */
function render(){
  const p=curP(),w=curWeek(),b=blockFor(p,w);
  const H={today:['Today',new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})],
    train:[p.name,'Week '+w+' of '+p.weeks+' · '+b.type],
    fuel:['Fuel','Strict carnivore · lean bulk'],
    prog:['Progress','Where you actually are'],
    more:['More','Programmes, mobility, library']}[VIEW];
  document.getElementById('hdr').textContent=H[0];
  document.getElementById('hsub').textContent=H[1];
  ({today:rToday,train:rTrain,fuel:rFuel,prog:rProg,more:rMore})[VIEW]();
}

/* ================= TODAY ================= */
function rToday(){
  const p=curP(),w=curWeek(),b=blockFor(p,w),slot=slotFor(),s=sessFor(),k=todayISO();
  /* a day is an array of sessions — "done" means at least one is finished */
  const dayL=dayLogs(k),dn=dayL.some(l=>l&&l.done);
  let h='';

  if(slot==='rest'){
    h+=`<div class="card"><div class="lbl">Rest day</div>
    <div class="note">Nothing to train. Do the mobility block, hit the protocol, sleep seven hours. This is where the adaptation actually happens.</div></div>`;
  }else if(slot==='sport'){
    h+=`<div class="card"><div class="lbl">Sport day</div>
    <div class="mid" style="margin-bottom:6px">Golf or trail hike</div>
    <div class="note">${esc(p.sportNote||'Play. This is what the training is for — go use the body you are building.')}</div></div>`;
  }else if(s){
    h+=`<div class="card acc">
      <div class="row sp"><span class="pill a">${esc(s.w==='gym'?'Gym':s.w==='home'?'Home':s.w==='out'?'Outdoors':'Gym or home')}</span>
      <span class="pill">${s.mins} min</span></div>
      <div class="mid" style="margin:9px 0 3px">${esc(s.n)}</div>
      <div class="sub">Week ${w} · ${esc(b.type)} · ${setsFor(s.ex[0],b.mod)>s.ex[0].s?'volume up':'as written'}</div>
      <div class="note" style="margin-top:9px">${esc(b.note)}</div>
      ${D.settings.bareMode&&p.bare?`<div class="warnbox" style="margin-top:10px">Bare Mode on — run this morning, lift this evening. If the evening lift falls away, use the rescue button rather than losing the day.</div>`:''}
      <button class="btn p" style="margin-top:12px" onclick="go('train')">${dn?'Session logged — review':'Start session'}</button>
      ${!dn&&s.w!=='home'?`<button class="btn gh" style="margin-top:7px" onclick="rescue()">Can't make the gym — rescue this session</button>`:''}
    </div>`;
  }

  const jd=jDone(k),ts=trainStreak(),nToday=todayLogs().filter(l=>l.done).length;
  h+=`<div class="grid3" style="margin-bottom:10px">
    <div class="stat acc"><div class="tiny">Training streak</div><div class="big">${ts}</div>
      <div class="jm" style="margin-top:2px">${nToday?nToday+' today':(isRestDay(new Date())?'Rest day — held':'Train to extend')}</div></div>
    <div class="stat ice"><div class="tiny">Protocol</div><div class="big">${jd}<span style="font-size:15px;color:var(--tx3)">/${JOURNAL.length}</span></div></div>
    <div class="stat grn"><div class="tiny">Block</div><div class="big">${progPct()}<span style="font-size:15px;color:var(--tx3)">%</span></div></div>
  </div>`;

  h+=`<div class="card ice"><div class="row sp" style="margin-bottom:4px">
    <div class="lbl" style="margin:0">Daily protocol</div>
    <button class="btn sm gh" onclick="jAll()">All</button></div>`;
  JOURNAL.forEach(j=>{const on=D.journal[k]&&D.journal[k][j.k];
    h+=`<div class="jr" onclick="jTick('${j.k}')"><div class="jb ${on?'on':''}">${CHK}</div>
      <div style="flex:1"><div class="jt">${esc(j.t)}</div>${j.m?`<div class="jm">${esc(j.m)}</div>`:''}</div></div>`});
  h+=`</div>`;

  h+=`<div class="card"><div class="lbl">Supplements</div><div class="row" style="gap:7px;flex-wrap:wrap">`;
  SUPPS.forEach(sp=>{const on=D.journal[k]&&D.journal[k][sp.k];
    h+=`<button class="pill ${on?'a':''}" style="padding:7px 13px;font-size:13px" onclick="jTick('${sp.k}')">${esc(sp.t)}</button>`});
  h+=`</div><div class="jm" style="margin-top:8px">Electrolytes, creatine and glutamine only. Carnivore covers the rest.</div></div>`;

  const mk=MOBROT[dIdx()],M=MOB[mk],md=D.mobility[k];
  h+=`<div class="card grn"><div class="row sp"><div class="lbl" style="margin:0">Tonight's mobility · ${esc(M.n)}</div>
    <span class="pill ${md?'g':''}">${md?'Done':mobStreak()+' day streak'}</span></div>
    <div class="note" style="margin:8px 0 10px">15–20 min. ${mk==='hips'||mk==='ankles'||mk==='shoulders'?'One of your three named restrictions.':'Full body reset.'}</div>
    <button class="btn" onclick="open_('mob','${mk}')">Open the routine</button></div>`;

  /* One line, changing daily, in Juan's own words. Deliberately at the BOTTOM
     of Today — it is the last thing read before the phone goes down. */
  h+=`<div class="card acc"><div class="quote">${esc(quoteFor())}</div></div>
    <div style="height:16px"></div>`;
  document.getElementById('v-today').innerHTML=h;
}
function jTick(k){const d=todayISO();D.journal[d]=D.journal[d]||{};
  D.journal[d][k]=!D.journal[d][k];save();render()}
function jAll(){const d=todayISO();D.journal[d]=D.journal[d]||{};
  const all=JOURNAL.every(j=>D.journal[d][j.k]);JOURNAL.forEach(j=>D.journal[d][j.k]=!all);save();render()}

/* ================= TRAIN ================= */
function rTrain(){
  const p=curP(),w=curWeek(),b=blockFor(p,w),slot=slotFor(),s=sessFor(),k=todayISO();
  let h='';
  if(!s){
    h=`<div class="card"><div class="mid">${slot==='sport'?'Sport day':'Rest day'}</div>
      <div class="note" style="margin-top:7px">${slot==='sport'?esc(p.sportNote||'Golf or hike. Go and play.'):'No session scheduled. Mobility and sleep are the work today.'}</div></div>
      <div class="sec">Train something anyway</div>
      <div class="note" style="margin-bottom:10px">Pick any session from ${esc(p.name)}. It gets logged and counted like any other, and it does not change where you are in the block.</div>
      ${Object.keys(p.sessions).map(id=>`<div class="tst" onclick="freeSession('${id}')"><div style="flex:1">
        <div style="font-weight:600;font-size:14px">${esc(p.sessions[id].n)}</div>
        <div class="jm">${p.sessions[id].ex.length} exercises · ${p.sessions[id].mins} min</div></div>
        <span style="color:var(--acc)">›</span></div>`).join('')}`;
    if(D.mine.length){h+=`<div class="sec">Your own workouts</div>`+
      D.mine.map(mw=>`<div class="tst" onclick="freeSession('${mw.id}')"><div style="flex:1">
        <div style="font-weight:600;font-size:14px">${esc(mw.n)}</div>
        <div class="jm">${mw.ex.length} exercises · yours</div></div>
        <span style="color:var(--acc)">›</span></div>`).join('')}
    h+=`<div class="sec">Or build one</div>
      <button class="btn p" onclick="newWorkout()">Create a workout</button>`;
    document.getElementById('v-train').innerHTML=h;return;
  }
  const day=dayLogs(k);D.logs[k]=day;
  if(!day.length)day.push({sid:todaySid()||slot,pid:p.id,week:w,ex:[],done:false,start:Date.now()});
  const log=day[curIdx()];

  /* SESSION CHIPS — one per workout logged today. This is what makes a second
     workout possible at all: each chip is its own session with its own sets,
     and switching between them never touches the other. */
  if(day.length>1||day[0].done){
    h+=`<div class="tabs" style="margin-bottom:10px">`
      +day.map((l,i)=>`<button class="tab ${i===curIdx()?'on':''}" onclick="setSess(${i})">
         ${esc(sessLabel(l))}${l.done?' ✓':''}</button>`).join('')
      +`<button class="tab" onclick="open_('addsess')" style="color:var(--acc2)">+ Session</button></div>`;
  }
  /* ---- SEED THE LOG, THEN RENDER FROM IT ----
     THE BUG THIS FIXES. The view used to iterate EXS (the programme's exercise
     list) while every button — the tick, the kg/reps fields, the 3-dot menu —
     indexed into log.ex. Those are two different arrays and they drift apart the
     moment the menu is used:
       · exMove swapped log.ex but the view still drew EXS, so the card never
         physically moved;
       · exDel spliced log.ex, leaving it shorter than EXS, so every index below
         the removal was off by one and ticking a set logged the exercise ABOVE;
       · exSwap renamed a log entry, the view's find-by-name returned undefined,
         and L.sets threw — killing the whole Train render, which is why "the
         controls don't work".
     log.ex is now the SINGLE SOURCE OF TRUTH for rendering. The programme only
     ever seeds it, and the loop index is by definition the log index. */
  const seed=s.ex.concat(log.extra||[]);
  /* `seeded` records every programme movement that has ALREADY been put into
     this log. Without it, seeding by "is this name absent?" silently undoes the
     menu: swap an exercise out and the next render puts the original straight
     back as a duplicate, and a deleted exercise reappears. Seeding happens once
     per movement, per session. */
  /* A log started before this version has no `seeded` list. Initialise it from
     whatever is already in the log rather than empty, otherwise the seeder walks
     the whole programme again and resurrects exercises the user had removed. */
  if(!log.seeded)log.seeded=log.ex.map(e=>e.n);
  /* Only seed when the session behind this log actually resolves. sessFor()
     falls back to today's PROGRAMME slot when it does not — which would pour
     programme exercises into a retro session, or one whose custom workout has
     since been deleted. */
  const resolves=!!sessById(log.sid);
  seed.forEach(ex=>{
    if(!resolves)return;
    if(log.seeded.indexOf(ex.n)>=0)return;      // already seeded — respect the edit
    log.seeded.push(ex.n);
    if(log.ex.find(x=>x.n===ex.n))return;
    log.ex.push({n:ex.n,k:ex.k,r:ex.r,t:ex.t,rest:ex.rest,fst:ex.fst,
      sets:Array.from({length:setsFor(ex,b.mod)},()=>({w:'',r:'',done:false}))});
  });
  /* Older logs were stored without the display fields — backfill from the
     programme so a session started on a previous version still renders. */
  log.ex.forEach(L=>{if(L.r===undefined){const src=seed.find(x=>x.n===L.n)||{};
    L.k=L.k||src.k;L.r=L.r||src.r||'';L.t=L.t||src.t;
    L.rest=(L.rest===undefined?src.rest:L.rest);L.fst=L.fst||src.fst;}});

  h+=`<div class="card acc">
    <div class="row sp"><span class="pill a">${esc(s.w==='gym'?'Gym':s.w==='home'?'Home':s.w==='out'?'Outdoors':'Either')}</span>
    <span class="pill">${esc(b.type)} · wk ${w}/${p.weeks}</span></div>
    <div class="mid" style="margin:9px 0 4px">${esc(s.n)}</div>
    <div class="note">${esc(b.note)}</div></div>`;

  log.ex.forEach((L,i)=>{
    const ex=L, T=target(L,b.mod);
    if(isCardio(L)){
      const C=CARDIO[L.k]; L.c=L.c||{};
      h+=`<div class="ex ${L.c.done?'done':''} ${L.skip?'skip':''}">
        <div class="exh"><div style="flex:1"><div class="exn">${esc(L.n)}</div>
          <div class="exm">${esc(C.n)}${L.r?' · '+esc(L.r):''}</div></div>
          <div class="row" style="gap:8px">
            <span class="pill b">${esc(C.n.split(' ')[0])}</span>
            <button class="kebab" onclick="open_('exopt','${i}')" aria-label="More options">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>
          </div></div>`;
      if(!L.skip){
        h+=`<div class="exb">
          <div class="grid3">${C.f.map(f=>`<div><div class="tiny">${f[1]}${f[2]?' '+f[2]:''}</div>
            <input type="text" inputmode="${fKind(f[0])==='int'?'numeric':'decimal'}"
              placeholder="${fKind(f[0])==='time'?'45:30':fKind(f[0])==='dec'?'5.4':'—'}"
              value="${esc(L.c[f[0]]||'')}"
              onchange="cardioSet(${i},'${f[0]}',this.value)"></div>`).join('')}</div>
          ${C.f.some(f=>f[0]==='min')?`<div class="jm" style="margin-top:5px">Time takes 45:30 or 45.5 — either works.</div>`:''}
          ${C.pace&&fVal('km',L.c.km)&&fVal('min',L.c.min)?`<div class="tgt" style="margin-top:9px">Pace ${pace(fVal('km',L.c.km),fVal('min',L.c.min))}</div>`:''}
          <div class="grid3" style="margin-top:9px">
            <div><div class="tiny">Calories</div><input type="text" inputmode="numeric"
              placeholder="${estKcal(L.k,fVal('min',L.c.min))||'—'}" value="${esc(L.c.kcal||'')}"
              onchange="cardioSet(${i},'kcal',this.value)"></div>
            <div><div class="tiny">Avg HR</div><input type="text" inputmode="numeric"
              placeholder="bpm" value="${esc(L.c.hr||'')}" onchange="cardioSet(${i},'hr',this.value)"></div>
            <div><div class="tiny">Effort 1–10</div><input type="text" inputmode="numeric"
              value="${esc(L.c.effort||'')}" onchange="cardioSet(${i},'effort',this.value)"></div></div>
          <button class="btn ${L.c.done?'':'p'}" style="margin-top:10px" onclick="cardioDone(${i})">${L.c.done?'Logged ✓':'Log it'}</button>
        </div>`;}
      else h+=`<div class="exb"><div class="jm">Removed from today. Reopen the ⋮ menu to put it back.</div></div>`;
      h+=`</div>`;
      return;
    }

    const dn=L.sets.every(x=>x.done);
    h+=`<div class="ex ${dn?'done':''} ${L.skip?'skip':''}">
      <div class="exh">
        <div style="flex:1" onclick="tgl(${i})"><div class="exn">${esc(L.n)}${L.fst?' <span class="pill a" style="vertical-align:2px">FST-7</span>':''}${L.sub?' <span class="pill" style="vertical-align:2px">swapped in</span>':''}</div>
        <div class="exm">${L.sets.length} × ${esc(L.r||'')}${L.t?' · '+esc(L.t):''}${L.rest?' · rest '+L.rest+'s':''}</div></div>
        <div class="row" style="gap:8px">
          ${L.skip?'<span class="pill">Removed</span>'
            :`<div class="pill ${dn?'g':''}" onclick="tgl(${i})">${L.sets.filter(x=>x.done).length}/${L.sets.length}</div>`}
          <button class="kebab" onclick="open_('exopt','${i}')" aria-label="More options for ${esc(L.n)}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>
        </div></div>`;

    /* A REMOVED exercise is closed and locked — no kg, no reps, no tick — until
       it is reinstated from the menu. Leaving the inputs live was how a cancelled
       exercise still ended up collecting numbers. */
    if(L.skip){
      h+=`<div class="exb"><div class="jm">Removed from today. Open the ⋮ menu to reinstate it.</div>
        <button class="btn sm gh" style="margin-top:8px" onclick="exSkip(${i})">Reinstate</button></div></div>`;
      return;
    }

    h+=`<div class="exb" id="exb${i}" style="display:${dn?'none':'block'}">
        <div class="tgt">${esc(T.txt)}</div>
        <div class="st" style="color:var(--tx3);font-size:11px"><span></span><span class="u">KG</span><span class="u">REPS</span><span class="u">REST</span><span class="u"></span><span class="u"></span></div>`;
    L.sets.forEach((st,j)=>{
      h+=`<div class="st"><span>${j+1}</span>
        <input type="text" inputmode="decimal" placeholder="—" value="${esc(wDisp(st.w))}" onchange="setW(${i},${j},this)"
          class="${isBW(st.w)?'bw':''}" title="Type 1 for bodyweight">
        <input type="text" inputmode="numeric" placeholder="—" value="${esc(st.r)}" onchange="setV(${i},${j},'r',this.value)">
        <span class="rsc" title="Rest actually taken">${st.rs!==undefined?esc(restTxt(st.rs)):''}</span>
        <button class="tick ${st.done?'on':''}" onclick="setDone(${i},${j},${L.rest||0})">${CHK}</button>
        <button class="tick" onclick="delSet(${i},${j})" aria-label="Remove set" style="font-size:18px;line-height:1">−</button></div>`});
    h+=`<div class="jm" style="margin-top:6px">Enter <b>1</b> as the load for bodyweight — it shows as BW and progresses on reps.</div>
      <div class="row" style="gap:7px;margin-top:8px;flex-wrap:wrap">
        <button class="btn sm gh" onclick="addSet(${i})">+ Set</button>
        <button class="btn sm gh" onclick="open_('ex','${encodeURIComponent(L.n)}')">Cues</button>
        ${L.t?`<button class="btn sm gh" onclick="open_('tech','${encodeURIComponent(L.t)}')">${esc(L.t)}</button>`:''}
      </div></div></div>`;
  });

  if(s.fin)h+=`<div class="card"><div class="lbl">Finisher</div><div class="note">${esc(s.fin)}</div>
    <div class="warnbox" style="margin-top:9px">Bike, rower, sled or hill sprints by preference. Flat running is the one that competes with your lifting — hills are concentric-dominant and cost far less.</div></div>`;

  h+=`<div class="card red"><div class="lbl">Session burn, heart rate &amp; effort</div>
    <div class="grid3">
      <div><div class="tiny">Calories</div><input type="text" inputmode="numeric"
        placeholder="auto" value="${esc(log.kcal||'')}" onchange="logSet('kcal',this.value)"></div>
      <div><div class="tiny">Avg HR</div><input type="text" inputmode="numeric"
        placeholder="bpm" value="${esc(log.hr||'')}" onchange="logSet('hr',this.value)"></div>
      <div><div class="tiny">Effort 1\u201310</div><input type="text" inputmode="numeric"
        placeholder="\u2014" value="${esc(log.effort||'')}" onchange="logSet('effort',this.value)"></div>
    </div>
    <div class="jm" style="margin-top:7px">Read average heart rate and calories off your watch when you close the workout, and type them in here. Leave calories blank and I'll estimate from the work you logged. Effort is your read, not a formula \u2014 it is what tells the deload apart from the grind.</div></div>`;

  h+=`<div class="card acc"><div class="lbl">Remember</div>
    <div class="note" style="font-style:italic">${esc(quoteFor(log.ex.length+dIdx()))}</div></div>`;

  /* A skipped exercise is a decision, not an omission \u2014 it must not hold the
     "Finish session" button hostage. */
  const allDone=log.ex.every(e=>e.skip||e.sets.some(x=>x.done)||(e.c&&e.c.done));
  h+=`<button class="btn ${allDone?'p':''}" style="margin:14px 0 6px" onclick="finish()">${log.done?'Session logged ✓':'Finish session'}</button>
    <div class="row" style="gap:7px;margin-bottom:20px">
      <button class="btn gh" onclick="open_('timer')">Timer</button>
      <button class="btn gh" onclick="open_('note')">Notes</button>
      <button class="btn gh" onclick="open_('addex')">+ Exercise</button>
      <button class="btn gh" onclick="clearToday()">Swap</button>
    </div>`;
  document.getElementById('v-train').innerHTML=h;
}
function tgl(i){const e=document.getElementById('exb'+i);
  if(!e)return;                       // a removed exercise has no body to toggle
  e.style.display=e.style.display==='none'?'block':'none'}
/* The weight field DISPLAYS "BW" but STORES the 1 sentinel. Accept either on
   the way in, so re-saving a field that already reads BW does not corrupt it —
   that round-trip is why 1=BW appeared to work in history but not live. */
function normW(v){const t=String(v==null?'':v).trim();
  if(/^bw$/i.test(t))return '1';
  return t}
function setV(i,j,f,v){const l=curLog();if(!l||!l.ex[i]||!l.ex[i].sets[j])return;
  l.ex[i].sets[j][f]=(f==='w')?normW(v):v;save()}
/* Weight field. Writing the value back into the input immediately is what makes
   typing 1 turn into BW on the spot — a full re-render would steal focus and
   fight the on-screen keyboard, so the field is updated in place. */
function setW(i,j,el){const l=curLog();if(!l||!l.ex[i]||!l.ex[i].sets[j])return;
  const raw=normW(el.value);
  l.ex[i].sets[j].w=raw;
  el.value=wDisp(raw);
  el.classList.toggle('bw',isBW(raw));
  save()}
function cardioSet(i,f,v){const l=curLog();if(!l||!l.ex[i])return;
  l.ex[i].c=l.ex[i].c||{};l.ex[i].c[f]=v;save()}
function cardioDone(i){const l=curLog();if(!l||!l.ex[i])return;
  const e=l.ex[i],c=e.c=e.c||{};
  c.done=!c.done;
  /* read the kind off the LOG entry. Indexing the programme list with a log
     index is precisely the class of bug this release removes. */
  if(c.done&&!c.kcal)c.kcal=estKcal(e.k,fVal('min',c.min));
  save();rTrain()}
function setDone(i,j,rest){const l=curLog();if(!l||!l.ex[i])return;
  if(l.ex[i].skip||!l.ex[i].sets[j])return;    // a removed exercise cannot be logged
  const st=l.ex[i].sets[j];st.done=!st.done;
  if(st.done&&rest)tStart(rest,i,j);save();rTrain()}

/* ---- IN-SESSION EXERCISE OPTIONS (the 3-dot menu) ----
   Every one of these mutates TODAY'S LOG and nothing else — the programme is
   never touched, so a reshuffle or a swap does not leak into next week.

   Because the Train view now renders straight from log.ex, the index these
   receive IS the log index. Previously the view iterated the programme list
   while these wrote to the log, and the two drifted apart the moment anything
   here ran — which is why the menu appeared to do nothing, or worse, logged
   sets against the wrong exercise. */
function exAt(i){const l=curLog();return (l&&l.ex[i])?l:null}
/* Physically reorder the exercise. The card visibly moves because the view
   draws log.ex in order. */
function exMove(i,d){const l=exAt(i);if(!l)return;
  const j=i+d;if(j<0||j>=l.ex.length)return;
  const t=l.ex[i];l.ex[i]=l.ex[j];l.ex[j]=t;
  delete l.order;TREF=null;          // the resting set has moved — do not write to a stale index
  save();close_();rTrain()}
/* Remove / reinstate. A removed exercise keeps its place in the list but is
   struck through and LOCKED — no kg, no reps, no tick — and contributes nothing
   to volume until it is put back. */
function exSkip(i){const l=exAt(i);if(!l)return;
  const e=l.ex[i];e.skip=!e.skip;
  if(e.skip){e.sets.forEach(s=>{s.done=false});
    if(e.c)e.c.done=false;}          // a removed cardio block banks no calories
  save();close_();rTrain()}
/* Find how the programmes actually prescribe a movement, so a swapped-in
   exercise gets ITS OWN rep range and rest rather than inheriting the ones from
   the exercise it replaced. EX entries carry only muscles and cues — no rep
   range — so the prescription has to come from the programme library. */
function prescriptionFor(name){
  for(const pk in P){const p=P[pk];if(!p||!p.sessions)continue;
    for(const sk in p.sessions){
      const hit=(p.sessions[sk].ex||[]).find(x=>x.n===name);
      if(hit)return{r:hit.r,rest:hit.rest,t:hit.t,fst:hit.fst};}}
  for(const ck in CAL){const hit=CAL[ck].ex.find(x=>x.n===name);if(hit)return{r:hit.r,rest:hit.rest};}
  return{r:'8-12',rest:90};                     // sane default for an unknown movement
}
function exSwap(i,name){if(!name)return;const l=exAt(i);if(!l)return;
  const e=l.ex[i];
  if(l.ex.some((x,j)=>j!==i&&x.n===name)){
    alert(name+' is already in this session.');return}
  const pr=prescriptionFor(name);
  e.n=name;e.sub=1;
  e.r=pr.r;e.rest=pr.rest;e.t=pr.t;e.fst=pr.fst;
  /* a cardio slot swapped for a lift must stop being cardio, or it keeps
     rendering distance/time and banking the old calories */
  delete e.k;delete e.c;
  e.sets.forEach(s=>{s.w='';s.r='';s.done=false;delete s.rs});
  save();close_();rTrain()}
function exSets(i,n){const l=exAt(i);if(!l)return;
  const st=l.ex[i].sets;n=Math.max(1,Math.min(12,+n||1));
  while(st.length<n)st.push({w:'',r:'',done:false});
  while(st.length>n)st.pop();
  save();close_();rTrain()}
function exWarm(i){const l=exAt(i);if(!l)return;
  l.ex[i].warm=!l.ex[i].warm;save();close_();rTrain()}
/* Hard delete — drops the exercise entirely. Safe now that the view renders
   from log.ex: the indices below it shift together with the array. */
function exDel(i){const l=exAt(i);if(!l)return;
  if(!confirm('Delete this exercise from today\'s session? "Remove" keeps it listed and struck through instead.'))return;
  l.ex.splice(i,1);delete l.order;TREF=null;
  /* The name deliberately STAYS in `seeded`: that is what makes the delete
     stick. Re-adding it later goes through addExToday(), which pushes straight
     into log.ex and does not consult the seeder at all. */
  save();close_();rTrain()}
function addSet(i){const l=curLog();if(!l||!l.ex[i])return;
  l.ex[i].sets.push({w:'',r:'',done:false});save();rTrain()}
function delSet(i,j){const l=curLog();if(!l||!l.ex[i])return;
  const s=l.ex[i].sets;if(s.length>1)s.splice(j,1);save();rTrain()}
function logSet(f,v){const l=curLog();if(l){l[f]=v;save()}}
function finish(){
  /* curLog() is null if midnight rolled over with the Train view open */
  const l=curLog();if(!l){go('train');return}
  l.done=true;l.dur=Math.round((Date.now()-(l.start||Date.now()))/1000);
  /* calories: whatever Juan entered, else cardio entries, else a lifting estimate */
  let ck=l.ex.reduce((a,e)=>a+(e.c&&+e.c.kcal||0),0);
  if(!l.kcal){const sets=l.ex.reduce((a,e)=>a+e.sets.filter(x=>x.done).length,0);
    const lift=Math.round(sets*(D.settings.weight||84)*0.11);
    l.kcal=ck+lift;}
  else l.kcal=+l.kcal;
  const d=todayISO();D.journal[d]=D.journal[d]||{};D.journal[d].workout=true;
  l.ex.forEach(e=>{e.sets.filter(x=>x.done&&+x.w>0).forEach(x=>{
    if(!D.pbs[e.n]||+x.w>+D.pbs[e.n].w)D.pbs[e.n]={w:+x.w,r:+x.r||0,d:d}})});
  save();open_('done')}
function rescue(){open_('rescue')}
/* Load ANY session as today's session — programme, custom or rescue. */
/* Open a session for today.

   THIS MUST NEVER DESTROY LOGGED WORK. Every "Start" button in More routes here
   and they are all advertised as "run this as a second workout for the day" —
   so the only case where reusing the current slot is safe is when that slot is
   genuinely empty. Anything with a logged set, finished or not, gets a NEW
   session appended alongside it. Overwriting an unfinished session is the exact
   data loss this release exists to fix; it was still live on this path. */
function hasWork(l){return !!(l&&(l.done||(l.ex||[]).some(e=>
  (e.sets||[]).some(s=>s.done)||(e.c&&e.c.done))))}
function freeSession(id){const k=todayISO(),a=dayLogs(k);
  D.logs[k]=a;
  const l={sid:id,pid:D.active.id,week:curWeek(),ex:[],done:false,start:Date.now(),free:true};
  const cur=a.length?a[curIdx()]:null;
  if(!a.length){a.push(l);setIdx(0)}
  else if(hasWork(cur)){a.push(l);setIdx(a.length-1)}    // append, never clobber
  else a[curIdx()]=l;                                    // empty slot — safe to reuse
  save();go('train')}
function clearToday(){const k=todayISO(),a=dayLogs(k),l=a[curIdx()];
  if(l&&l.ex.some(e=>e.sets.some(s=>s.done))
     &&!confirm('This session has logged sets. Clear it and pick another?'))return;
  a.splice(curIdx(),1);
  if(!a.length)delete D.logs[k];
  setIdx(0);go('train')}

/* ---- Custom workout builder ---- */
let BUILD=null;
function newWorkout(){BUILD={id:uid(),n:'',w:'either',mins:40,ex:[]};open_('build')}
function editWorkout(id){const w=D.mine.find(x=>x.id===id);
  BUILD=w?JSON.parse(JSON.stringify(w)):null;if(BUILD)open_('build')}
function bName(v){BUILD.n=v}
function bWhere(v){BUILD.w=v;open_('build')}
function bAdd(n){if(!n)return;BUILD.ex.push({n:n,s:3,r:'10',rest:90});open_('build')}
function bAddCardio(k){const C=CARDIO[k];if(!C)return;
  BUILD.ex.push({n:C.n,k:k,s:1,r:'',rest:0});open_('build')}
function bDel(i){BUILD.ex.splice(i,1);open_('build')}
function bSet(i,f,v){BUILD.ex[i][f]=(f==='s'||f==='rest')?(+v||0):v}
function bMove(i,d){const a=BUILD.ex,j=i+d;if(j<0||j>=a.length)return;
  const t=a[i];a[i]=a[j];a[j]=t;open_('build')}
function bSave(start){
  BUILD.n=(document.getElementById('bn')||{value:BUILD.n}).value||BUILD.n;
  if(!BUILD.n.trim()){alert('Give the workout a name.');return}
  if(!BUILD.ex.length){alert('Add at least one exercise.');return}
  BUILD.mins=Math.max(10,BUILD.ex.reduce((a,e)=>a+e.s*((e.rest||60)+40)/60,0)|0);
  const i=D.mine.findIndex(x=>x.id===BUILD.id);
  if(i>=0)D.mine[i]=BUILD; else D.mine.push(BUILD);
  D.custom[BUILD.id]=BUILD; save();
  /* BUG (v3): "Save and start now" appeared dead. It DID load the session, but
     the sheet was never dismissed, so the freshly loaded Train view was sitting
     underneath a full-screen overlay. Close the sheet first, in both paths. */
  close_();
  if(start)freeSession(BUILD.id); else go('more');}
function delWorkout(id){if(!confirm('Delete this workout?'))return;
  D.mine=D.mine.filter(x=>x.id!==id);delete D.custom[id];save();close_();go('more')}

/* ================= FUEL ================= */
function rFuel(){
  const k=todayISO(),f=D.food[k]||[],S=D.settings;
  const t=f.reduce((a,x)=>({k:a.k+x.k,p:a.p+x.p,f:a.f+x.f}),{k:0,p:0,f:0});
  let h=`<div class="card">
    <div class="row sp" style="align-items:baseline"><div><div class="tiny">Calories</div>
      <div class="big mono">${fmt(t.k)}<span style="font-size:15px;color:var(--tx3)"> / ${S.kcal}</span></div></div>
      <span class="pill ${t.k>=S.kcal*0.92?'g':''}">${fmt(t.k/S.kcal*100)}%</span></div>
    <div class="bar" style="margin:11px 0 13px"><i style="width:${Math.min(100,t.k/S.kcal*100)}%"></i></div>
    <div class="grid2">
      <div><div class="tiny">Protein</div><div class="mid mono">${fmt(t.p)}<span style="font-size:13px;color:var(--tx3)">/${S.protein}g</span></div>
        <div class="bar" style="margin-top:6px"><i style="width:${Math.min(100,t.p/S.protein*100)}%"></i></div></div>
      <div><div class="tiny">Fat</div><div class="mid mono">${fmt(t.f)}<span style="font-size:13px;color:var(--tx3)">/${S.fat}g</span></div>
        <div class="bar" style="margin-top:6px"><i style="width:${Math.min(100,t.f/S.fat*100)}%"></i></div></div>
    </div></div>
    <button class="btn p" onclick="open_('food')">Add food</button>`;

  if(f.length){h+=`<div class="card" style="margin-top:10px"><div class="lbl">Today</div>`;
    f.forEach((x,i)=>{h+=`<div class="fi"><span>${esc(x.n)} <span style="color:var(--tx3)">${x.g}g</span></span>
      <span class="row" style="gap:11px"><span class="mono">${fmt(x.k)} kcal</span>
      <button onclick="delFood(${i})" style="color:var(--tx3)">✕</button></span></div>`});
    h+=`</div>`}

  h+=`<div class="sec">Bulking carnivore · your meals</div><div class="card">`;
  MEALS.bulk.forEach(m=>{h+=`<div style="padding:9px 0;border-bottom:1px solid var(--bd)">
    <div style="font-weight:600;font-size:14px">${esc(m.n)}</div>
    <div class="note">${esc(m.d)}</div></div>`});
  h+=`</div>
  <div class="warnbox">3,500 kcal on strict carnivore is a lot of chewing. Fat is the lever, not more meat: keep the yolks, choose ribeye over rump, butter on everything, cream in the coffee. Bone marrow is 786 kcal per 100g.</div>`;
  document.getElementById('v-fuel').innerHTML=h;
}
function delFood(i){const k=todayISO();D.food[k].splice(i,1);save();render()}
function addFood(n,g){const F=FOOD.find(x=>x.n===n);if(!F||!g)return;
  const k=todayISO();D.food[k]=D.food[k]||[];
  D.food[k].push({n:n,g:+g,k:F.k*g/100,p:F.p*g/100,f:F.f*g/100});save();close_()}

/* ================= PROGRESS ================= */
function rProg(){
  const v=volume(HEATDAYS),p=curP(),w=curWeek();
  let h=`<div class="card"><div class="row sp"><div class="lbl" style="margin:0">${esc(p.name)}</div>
    <span class="pill a">Week ${w} of ${p.weeks}</span></div>
    <div class="bar" style="margin:10px 0 9px"><i style="width:${progPct()}%"></i></div>
    <div class="dots">${Array.from({length:p.weeks},(_,i)=>`<div class="dot ${i<w?'on':''}"></div>`).join('')}</div>
    <div class="note" style="margin-top:10px">${esc(blockFor(p,w).note)}</div></div>`;

  h+=`<div class="sec">Volume · sets per muscle</div>
    <div class="tabs">
      <button class="tab ${HEATDAYS===7?'on':''}" onclick="setHeat(7)">This week</button>
      <button class="tab ${HEATDAYS===1?'on':''}" onclick="setHeat(1)">Today</button>
      <button class="tab ${HEATDAYS===30?'on':''}" onclick="setHeat(30)">30 days</button></div>
    <div class="card" style="padding:10px 8px 4px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <div>${figFront(v)}</div><div>${figBack(v)}</div></div>`;
  /* Caption for the tapped muscle. Labels are not drawn on the figure — that
     keeps it clean at phone size — so this line is how a muscle is identified. */
  if(APICK){const mv=musVal(APICK,v),st=volState2(mv[0],mv[1]);
    h+=`<div class="tgt" style="margin:2px 8px 8px">${esc(musName(APICK))} — <b>${mv[0]}</b> sets · ${st[0]}
      <span style="color:var(--tx3)"> · target ${Math.round(mv[1][1])}–${Math.round(mv[1][2])}</span></div>`;}
  else h+=`<div class="jm" style="text-align:center;padding:0 8px 8px">Tap any muscle to name it and see its set count.</div>`;
  h+=`<div class="row" style="gap:12px;flex-wrap:wrap;justify-content:center;padding:8px 4px 10px;border-top:1px solid var(--bd);margin-top:4px">
        ${[['Untrained','var(--mus0)',1],['Maintaining','var(--acc)',.38],['Building','var(--acc)',.68],['In range','var(--acc)',.96],['Over','var(--warn)',.96]]
          .map(l=>`<span class="row" style="gap:5px"><span style="width:11px;height:11px;border-radius:3px;background:${l[1]};opacity:${l[2]}"></span><span style="font-size:11px;color:var(--tx3)">${l[0]}</span></span>`).join('')}
      </div></div>
    <div class="note" style="margin-bottom:10px">Each muscle is shaded against its own landmarks, not one shared number — back and core recover from far more volume than biceps or calves.</div>
    <div class="hm">`;
  MUS.forEach(m=>{const st=volState(v[m],m);
    h+=`<div class="hmc" onclick="pickMus('${m}')" style="cursor:pointer${APICK===m?';border-color:var(--acc)':''}">
      <div class="n">${MUSN[m]}</div>
      <div class="row sp"><span class="v mono">${v[m]}</span>
      <span style="font-size:10px;font-weight:700;color:${st[1]}">${st[0]}</span></div></div>`});
  h+=`</div>`;

  h+=`<div class="sec">Output</div><div class="grid3">
    <div class="stat red"><div class="tiny">Kcal 7d</div><div class="big mono">${fmt(kcalOver(7))}</div></div>
    <div class="stat amb"><div class="tiny">Kcal 30d</div><div class="big mono">${fmt(kcalOver(30))}</div></div>
    <div class="stat ice"><div class="tiny">Avg effort</div><div class="big mono">${avgEffort(30)?fmt(avgEffort(30),1):'\u2014'}</div></div></div>`;

  let wk=0;eachSession((k,l)=>{if(l.done)wk++});
  const dur=[];eachSession((k,l)=>{if(l.done){const m=+l.mins||(l.dur?l.dur/60:0);if(m)dur.push(m*60)}});
  h+=`<div class="sec">Totals</div><div class="grid3">
    <div class="card flat" style="margin:0"><div class="tiny">Sessions</div><div class="big">${wk}</div></div>
    <div class="card flat" style="margin:0"><div class="tiny">Avg mins</div><div class="big">${dur.length?fmt(dur.reduce((a,b)=>a+b,0)/dur.length/60):'—'}</div></div>
    <div class="card flat" style="margin:0"><div class="tiny">Mobility</div><div class="big">${Object.keys(D.mobility).length}</div></div></div>`;

  h+=`<div class="sec">Lift PBs</div><div class="card">`;
  const names=Object.keys(SEEDPB).concat(Object.keys(D.pbs)).filter((x,i,a)=>a.indexOf(x)===i);
  names.forEach(n=>{const mine=D.pbs[n],seed=SEEDPB[n];
    const cur=mine?mine.w:seed, beat=mine&&seed&&mine.w>seed;
    h+=`<div class="fi"><span>${esc(n)}</span><span class="row" style="gap:8px">
      ${beat?'<span class="pill g">PB</span>':''}
      <span class="mono">${fmt(cur,cur%1?1:0)} kg${mine&&mine.r?' × '+mine.r:''}</span></span></div>`});
  h+=`</div><div class="note" style="margin-top:8px">Seeded from your Gym Pad note. Anything you log heavier overwrites it.</div>`;

  h+=`<div class="sec">Benchmarks</div>`;
  BENCH.forEach(b=>{const mine=(D.bench[b.k]||[]).slice(-1)[0];
    h+=`<div class="tst"><div style="flex:1"><div style="font-weight:600;font-size:14px">${esc(b.n)}</div>
      <div class="jm">${mine?'Last: '+esc(mine.v)+' · '+mine.d:(b.pb?'PB '+esc(b.pb):'Not tested')}</div></div>
      <button class="btn sm gh" onclick="open_('bench','${b.k}')">Log</button></div>`});

  h+=`<div class="sec">Mobility assessment</div><div class="card">
    <div class="note">Score each out of 10 monthly — same test, same conditions. Your three named restrictions are hips, ankles and shoulders.</div>`;
  const a=D.assess.slice(-1)[0];
  if(a)h+=`<div class="grid3" style="margin-top:11px">
    <div><div class="tiny">Hips</div><div class="mid">${a.hips}/10</div></div>
    <div><div class="tiny">Ankles</div><div class="mid">${a.ankles}/10</div></div>
    <div><div class="tiny">Shoulders</div><div class="mid">${a.shoulders}/10</div></div></div>
    <div class="jm" style="margin-top:7px">Last scored ${a.d}</div>`;
  h+=`<button class="btn" style="margin-top:11px" onclick="open_('assess')">Score today</button></div>
  <div style="height:20px"></div>`;
  /* ---- WORKOUT HISTORY ---- */
  const hist=historyList();
  h+=`<div class="sec">Workout history</div>
    <button class="btn gh" style="margin-bottom:10px" onclick="retroNew()">+ Log a workout you've already done</button>`;
  if(hist.length){
    h+=hist.slice(0,40).map(r=>`<div class="tst" onclick="histOpen('${r.d}',${r.i})">
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">${esc(r.n)}${r.l.retro?' <span class="pill">logged after</span>':''}${r.i>0?' <span class="pill a">#'+(r.i+1)+'</span>':''}</div>
        <div class="jm">${esc(r.d)}${r.at?' · '+esc(r.at):''} · ${r.sets} sets${r.mins?' · '+r.mins+' min':''}${r.vol?' · '+fmt(r.vol)+'kg':''}${r.kcal?' · '+r.kcal+' kcal':''}${r.hr?' · '+r.hr+' bpm':''}${r.effort?' · effort '+r.effort:''}</div></div>
      <span style="color:var(--tx3)">›</span></div>`).join('');
    if(hist.length>40)h+=`<div class="jm" style="margin-top:6px">Showing the last 40 of ${hist.length} logged sessions.</div>`;
  }else{
    h+=`<div class="note" style="margin-bottom:10px">Nothing logged yet. Finish a session, or log one you've already done.</div>`;
  }

  /* ---- PROGRESS PHOTOS ---- */
  const ph=D.photos||[];
  h+=`<div class="sec">Progress photos</div>
    <div class="note" style="margin-bottom:10px">Before, during and after. Kept on this phone inside your own profile — never uploaded. The scale lies on a lean bulk; these do not.</div>
    <button class="btn gh" style="margin-bottom:10px" onclick="open_('photo')">+ Add a photo</button>`;
  if(ph.length){
    h+=`<div class="pgrid">`+ph.map((x,i)=>`<div class="ph">
      <img src="${x.src}" alt="${esc(x.tag)} photo from ${esc(x.d)}" loading="lazy">
      <button class="x" onclick="photoDel(${i})" aria-label="Delete photo">✕</button>
      <div class="cap">${esc(String(x.tag).toUpperCase())} · ${esc(String(x.d).slice(5))}${x.w?' · '+fmt(x.w,0)+'kg':''}</div></div>`).join('')+`</div>`;
    const bf=ph.filter(x=>x.tag==='before'),af=ph.filter(x=>x.tag==='after');
    if(bf.length&&af.length)
      h+=`<div class="jm" style="margin-top:8px">${bf.length} before · ${af.length} after. Hold them side by side in Photos for the real comparison.</div>`;
  }else{
    h+=`<div class="note" style="margin-bottom:10px">None yet. Take a BEFORE set now, at the start of this block — you will not be able to go back and get it later.</div>`;
  }
  h+=`<div style="height:24px"></div>`;
  document.getElementById('v-prog').innerHTML=h;
}

/* ================= MORE ================= */
function rMore(){
  let h=`<div class="sec">Programmes</div>`;
  PORDER.map(k=>P[k]).filter(Boolean).forEach(p=>{const on=p.id===D.active.id;
    h+=`<div class="pgc ${on?'on':''}" onclick="open_('pg','${p.id}')">
      <div class="row sp"><div style="flex:1">
        <div style="font-weight:700;font-size:16px">${esc(p.name)}</div>
        <div class="jm" style="margin-top:2px">${esc(p.sub)}</div></div>
        ${on?`<span class="pill a">Active · ${progPct()}%</span>`:''}</div>
      <div class="row" style="gap:6px;margin-top:9px;flex-wrap:wrap">
        <span class="pill">${p.weeks} weeks</span><span class="pill">${p.days} days</span>
        <span class="pill">${esc(p.where)}</span><span class="pill">${esc(p.bias)}</span></div></div>`});

  h+=`<div class="sec">Tools</div>
    <div class="tst" onclick="open_('timer')"><div style="flex:1">
      <div style="font-weight:600;font-size:14px">Interval timer &amp; stopwatch</div>
      <div class="jm">EMOMs, sprints, Tabata, rounds \u00b7 or a plain stopwatch for benchmarks</div></div>
      <span style="color:var(--acc)">\u203a</span></div>`;
  h+=`<div class="sec">Kettlebell complexes</div>
    <div class="note" style="margin-bottom:10px">Your own complexes out of the Hard to Kill note. Run one as a finisher on any session, or on its own as a second workout for the day. They do not disturb the programme.</div>`;
  KBXORDER.forEach(k=>{const c=KBX[k];
    h+=`<div class="tst"><div style="flex:1" onclick="open_('kbx','${k}')">
      <div style="font-weight:600;font-size:14px">${esc(c.n)}</div>
      <div class="jm">${c.seq.map(x=>x[1]+' '+esc(x[0].replace(/^KB /,''))).join(' · ')} · ${c.rounds} rounds</div></div>
      <button class="btn sm gh" onclick="startKbx('${k}')">Start</button></div>`});

  h+=`<div class="sec">Calisthenics workouts</div>
    <div class="note" style="margin-bottom:10px">The named sessions out of your Hard to Kill note. The scored ones double as benchmarks \u2014 finish one and log the score under Progress.</div>`;
  CALORDER.forEach(k=>{const c=CAL[k];
    h+=`<div class="tst"><div style="flex:1" onclick="open_('cal','${k}')">
      <div style="font-weight:600;font-size:14px">${esc(c.n)}${c.bench?' <span class="pill a">Benchmark</span>':''}</div>
      <div class="jm">${esc(c.kind)} \u00b7 ${c.ex.length} movements \u00b7 ~${c.mins} min</div></div>
      <button class="btn sm gh" onclick="startCal('${k}')">Start</button></div>`});

  h+=`<div class="sec">Striking</div>
    <div class="note" style="margin-bottom:10px">Long bag and gloves. Run one as your sport day, your conditioning, or a second session.</div>`;
  XTRAORDER.forEach(k=>{const x=XTRA[k];
    h+=`<div class="tst"><div style="flex:1" onclick="open_('xtra','${k}')">
      <div style="font-weight:600;font-size:14px">${esc(x.n)}</div>
      <div class="jm">${x.ex.length} blocks · ${x.mins} min · home</div></div>
      <button class="btn sm gh" onclick="startXtra('${k}')">Start</button></div>`});

  h+=`<div class="sec">Your workouts</div>`;
  if(D.mine.length){D.mine.forEach(mw=>{
    h+=`<div class="tst"><div style="flex:1" onclick="editWorkout('${mw.id}')">
      <div style="font-weight:600;font-size:14px">${esc(mw.n)}</div>
      <div class="jm">${mw.ex.length} exercises · ${esc(mw.w==='home'?'Home':mw.w==='gym'?'Gym':mw.w==='out'?'Outdoors':'Either')}</div></div>
      <button class="btn sm gh" onclick="freeSession('${mw.id}')">Start</button></div>`})}
  else h+=`<div class="note" style="margin-bottom:10px">None yet. Build one for the days the programme does not fit — a hotel room, a friend's garage, an extra arm session.</div>`;
  h+=`<button class="btn" onclick="newWorkout()">Create a workout</button>`;

  h+=`<div class="sec">Mobility</div>`;
  Object.keys(MOB).forEach(k=>{h+=`<div class="tst"><div style="flex:1">
    <div style="font-weight:600;font-size:14px">${esc(MOB[k].n)}</div>
    <div class="jm">${MOB[k].ex.length} movements · 15–20 min</div></div>
    <button class="btn sm gh" onclick="open_('mob','${k}')">Open</button></div>`});
  h+=`<div class="tst"><div style="flex:1"><div style="font-weight:600;font-size:14px">Recovery tools</div>
    <div class="jm">Foam roller · spiked ball · massage gun</div></div>
    <button class="btn sm gh" onclick="open_('tools')">Open</button></div>`;

  h+=`<div class="sec">Exercise library</div>
    <input type="search" placeholder="Search any exercise" oninput="libFilter(this.value)" style="margin-bottom:10px">
    <div id="lib"></div>`;

  const me=curProfile();
  h+=`<div class="sec">Profile</div>
    <div class="tst" onclick="open_('prof')"><div style="flex:1">
      <div style="font-weight:600;font-size:14px">${esc(me.name)}${me.owner?'':' · guest'}</div>
      <div class="jm">${profileList().length} profile${profileList().length===1?'':'s'} on this phone · tap to switch or add someone</div></div>
      <span style="color:var(--acc)">›</span></div>`;

  h+=`<div class="sec">Data</div>`;
  if(isOwner()){
    h+=`<button class="btn" onclick="expObs()">Export to Obsidian (.md)</button>
    <div class="jm" style="margin:6px 0 12px">Save to Files → iCloud Drive → Obsidian Vault → Health. No Obsidian app needed on the phone.</div>`;
  }else{
    h+=`<div class="note" style="margin-bottom:10px">The Obsidian export belongs to the owner profile. Your data stays on this phone and can be backed up as a file below.</div>`;
  }
  h+=`<button class="btn gh" onclick="expJSON()">Backup all data (.json)</button>
    <button class="btn gh" style="margin-top:7px" onclick="document.getElementById('imp').click()">Restore from backup</button>
    <input type="file" id="imp" accept=".json" style="display:none" onchange="impJSON(this)">
    <div class="jm" style="margin-top:6px">A backup covers the profile you are signed in as, including its photos.</div>
    <div style="height:24px"></div>`;
  document.getElementById('v-more').innerHTML=h;
  libFilter('');
}
function libFilter(q){
  q=(q||'').toLowerCase();
  const ns=Object.keys(EX).filter(n=>!q||n.toLowerCase().includes(q)||(EX[n].m||[]).join(' ').includes(q));
  document.getElementById('lib').innerHTML=ns.slice(0,q?60:14).map(n=>
    `<div class="tst" onclick="open_('ex','${encodeURIComponent(n)}')"><div style="flex:1">
      <div style="font-weight:600;font-size:14px">${esc(n)}</div>
      <div class="jm">${(EX[n].m||[]).map(m=>MUSN[m]||m).join(' · ')}</div></div>
      <span style="color:var(--tx3)">›</span></div>`).join('')
    +(!q?`<div class="jm" style="margin-top:8px">${Object.keys(EX).length} exercises in the library. Search to find any of them.</div>`:'');
}

/* ================= HISTORY =================
   Two gaps this closes: (1) there was no way to log a session he had ALREADY
   done — he had to start one and play through it, which is why the log kept
   drifting from reality; (2) once logged, nothing could be corrected. */
function historyList(){
  /* ONE ROW PER SESSION. Keying history by date alone is what hid Juan's
     second workout of the day. */
  const rows=[];
  Object.keys(D.logs).sort().reverse().forEach(k=>{
    dayLogs(k).forEach((l,i)=>{
      if(!l||!l.done)return;
      const sets=(l.ex||[]).reduce((a,e)=>a+(e.sets||[]).filter(x=>x.done).length,0);
      const vol=(l.ex||[]).reduce((a,e)=>a+(e.sets||[]).filter(x=>x.done)
        .reduce((b,x)=>b+(isBW(x.w)?0:pnum(x.w))*(+x.r||0),0),0);
      rows.push({d:k,i:i,l:l,n:sessLabel(l),sets:sets,vol:Math.round(vol),
        kcal:+l.kcal||0,hr:+l.hr||0,effort:+l.effort||0,
        mins:+l.mins||(l.dur?Math.round(l.dur/60):0),at:l.at||''});});});
  return rows;
}
/* Sessions are addressed as "date|index" so history can edit the right one of
   several workouts on the same day. */
function histOpen(d,i){open_('hist',d+'|'+i)}
function histRef(key){const [d,i]=String(key).split('|');
  return{d:d,i:+i||0,l:dayLogs(d)[+i||0]}}
function histField(key,f,v){const r=histRef(key);if(r.l){r.l[f]=v;save()}}
function histSetV(key,i,j,f,v){const r=histRef(key);
  if(r.l&&r.l.ex[i])
    {r.l.ex[i].sets[j][f]=(f==='w')?normW(v):v;save()}}
function histDel(key){const r=histRef(key);if(!r.l)return;
  if(!confirm('Delete this logged session? It comes out of your volume and calorie totals.'))return;
  const a=dayLogs(r.d);a.splice(r.i,1);
  if(!a.length)delete D.logs[r.d];
  save();close_();go('prog')}

/* ---- Log a session that has already happened ---- */
let RETRO=null;
function retroNew(){RETRO={d:todayISO(),sid:'',ex:[],kcal:'',hr:'',effort:'',mins:'',at:''};open_('retro')}
function retroSet(f,v){RETRO[f]=v;if(f==='sid')retroLoad(v);else open_('retro')}
function retroLoad(sid){const s=sessById(sid);
  RETRO.ex=s?s.ex.filter(e=>!e.k).map(e=>({n:e.n,s:setsFor(e,0),w:'',r:''})):[];
  open_('retro')}
function retroEx(i,f,v){RETRO.ex[i][f]=v}
function retroAdd(n){if(!n)return;RETRO.ex.push({n:n,s:3,w:'',r:''});open_('retro')}
function retroDel(i){RETRO.ex.splice(i,1);open_('retro')}
function retroSave(){
  if(!RETRO.d){alert('Pick the date it happened.');return}
  if(!RETRO.ex.length){alert('Add at least one exercise.');return}
  /* ADDS a session to that day. It must never replace what is already there —
     overwriting is exactly the bug this release fixes. */
  const l={sid:RETRO.sid||'',pid:D.active.id,week:curWeek(),done:true,retro:true,
    start:new Date(RETRO.d).getTime(),ex:[],kcal:pnum(RETRO.kcal),hr:pnum(RETRO.hr),
    effort:pnum(RETRO.effort),mins:ptime(RETRO.mins),at:RETRO.at||''};
  RETRO.ex.forEach(e=>{
    const n=Math.max(1,+e.s||1),sets=[];
    for(let i=0;i<n;i++)sets.push({w:e.w,r:e.r,done:true});
    l.ex.push({n:e.n,sets:sets});});
  if(!l.kcal){const sets=l.ex.reduce((a,e)=>a+e.sets.length,0);
    l.kcal=Math.round(sets*(D.settings.weight||84)*0.11)}
  const day=dayLogs(RETRO.d);D.logs[RETRO.d]=day;day.push(l);
  D.journal[RETRO.d]=D.journal[RETRO.d]||{};D.journal[RETRO.d].workout=true;
  l.ex.forEach(e=>{e.sets.forEach(x=>{
    if(!isBW(x.w)&&pnum(x.w)>0&&(!D.pbs[e.n]||pnum(x.w)>+D.pbs[e.n].w))
      D.pbs[e.n]={w:pnum(x.w),r:+x.r||0,d:RETRO.d}})});
  save();close_();go('prog')}

/* ================= PROGRESS PHOTOS =================
   Stored as data URLs inside the profile's own localStorage record, so they
   never leave the phone. Downscaled hard on the way in — a full 12MP iPhone
   photo would blow the storage quota after about four shots. */
function photoAdd(input){
  const f=input.files&&input.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const max=900,sc=Math.min(1,max/Math.max(img.width,img.height));
      const c=document.createElement('canvas');
      c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      D.photos=D.photos||[];
      D.photos.push({d:todayISO(),tag:(D.__phototag||'progress'),
        w:D.settings.weight||0,src:c.toDataURL('image/jpeg',0.72)});
      try{save()}catch(err){D.photos.pop();alert('Storage is full. Delete an older photo first.')}
      input.value='';close_();go('prog');};
    img.src=e.target.result;};
  rd.readAsDataURL(f);
}
function photoTag(t){D.__phototag=t;document.getElementById('pf').click()}
function photoDel(i){if(!confirm('Delete this photo?'))return;
  D.photos.splice(i,1);save();close_();go('prog')}

/* ================= PROFILES =================
   Multiple members, entirely on-device. Each profile owns a separate
   localStorage record; Juan keeps the ORIGINAL key so his existing history
   survives the upgrade untouched. The PIN is a speed bump to stop a training
   partner opening the wrong log — it is not security, and it is not claimed
   to be. Only the owner profile gets the Obsidian export. */
const PKEY='jhfp_profiles';
function dataKey(id){return id==='juan'?'jhfp_v1':'jhfp_v1__'+id}
function profileState(){
  let s=null;
  try{s=JSON.parse(localStorage.getItem(PKEY))}catch(e){}
  if(!s||!s.list||!s.list.length)
    s={cur:'juan',list:[{id:'juan',name:(D&&D.settings&&D.settings.name)||'Juvies',pin:'',owner:true}]};
  return s;
}
function profileSave(s){localStorage.setItem(PKEY,JSON.stringify(s))}
function profileList(){return profileState().list}
function curProfile(){const s=profileState();return s.list.find(p=>p.id===s.cur)||s.list[0]}
function isOwner(){const p=curProfile();return !!(p&&p.owner)}
function profileAdd(){
  const n=(document.getElementById('pn')||{value:''}).value.trim();
  if(!n){alert('Give the profile a name.');return}
  const pin=(document.getElementById('pp')||{value:''}).value.trim();
  if(pin&&!/^\d{4}$/.test(pin)){alert('The PIN must be exactly 4 digits, or left blank.');return}
  const s=profileState();
  if(s.list.length>=8){alert('Eight profiles is the limit on one phone.');return}
  const id='u'+Date.now().toString(36);
  s.list.push({id:id,name:n,pin:pin,owner:false});
  profileSave(s);close_();profileSwitch(id);
}
function profileSwitch(id){
  const s=profileState(),p=s.list.find(x=>x.id===id);
  if(!p)return;
  if(p.pin){const e=prompt('PIN for '+p.name);if(e!==p.pin){alert('Wrong PIN.');return}}
  save();                                   // flush the outgoing profile first
  s.cur=id;profileSave(s);
  location.reload();                        // cleanest way to re-boot onto the new record
}
function profileDel(id){
  const s=profileState(),p=s.list.find(x=>x.id===id);
  if(!p||p.owner){alert('The owner profile cannot be deleted.');return}
  if(!confirm('Delete '+p.name+' and all of their logged data? This cannot be undone.'))return;
  localStorage.removeItem(dataKey(id));
  s.list=s.list.filter(x=>x.id!==id);
  if(s.cur===id)s.cur=s.list[0].id;
  profileSave(s);location.reload();
}
function profileRename(id,v){const s=profileState(),p=s.list.find(x=>x.id===id);
  if(p){p.name=v;profileSave(s)}}

/* ================= SHEETS ================= */
const IC={
up:'<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
down:'<svg viewBox="0 0 24 24"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
skip:'<svg viewBox="0 0 24 24"><path d="M5 4l10 8-10 8zM19 5v14"/></svg>',
swap:'<svg viewBox="0 0 24 24"><path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/></svg>',
plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
minus:'<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
info:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>',
flame:'<svg viewBox="0 0 24 24"><path d="M12 2C9 6 7 8.5 7 12a5 5 0 0 0 10 0c0-3.5-2-6-5-10z"/></svg>',
trash:'<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'};

const SHEETS={
/* ---- add ANOTHER workout to today ---- */
addsess:()=>{const p=curP(),day=todayLogs();
  const opts=Object.keys(p.sessions).map(k=>[k,p.sessions[k].n])
    .concat(D.mine.map(m=>[m.id,m.n]))
    .concat(XTRAORDER.map(k=>[XTRA[k].id,XTRA[k].n]))
    .concat(KBXORDER.map(k=>['kbx_'+k,KBX[k].n+' Complex']))
    .concat(CALORDER.map(k=>['cal_'+k,CAL[k].n]));
  return `<div class="mid">Another session today</div>
  <div class="jm" style="margin:6px 0 13px">Two-a-days are the point of this — a lift in the morning and conditioning or a complex later. Each session keeps its own sets and they all count toward your volume. Nothing you have already logged today is touched.</div>
  ${day.length?`<div class="sec" style="margin-top:4px">Already done today</div>
    ${day.map((l,i)=>`<div class="tst"><div style="flex:1">
      <div style="font-weight:600;font-size:14px">${esc(sessLabel(l))}${l.done?' ✓':' · in progress'}</div>
      <div class="jm">${(l.ex||[]).reduce((a,e)=>a+(e.sets||[]).filter(x=>x.done).length,0)} sets logged</div></div>
      <button class="btn sm gh" onclick="setSess(${i})">Open</button>
      <button class="btn sm gh" style="color:var(--bad)" onclick="delSess(${i})">✕</button></div>`).join('')}`:''}
  <div class="sec">Start a second session</div>
  <select id="asx">${opts.map(o=>`<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select>
  <button class="btn p" style="margin-top:10px" onclick="addSess(document.getElementById('asx').value)">Add it</button>
  <button class="btn gh" style="margin-top:7px" onclick="close_()">Cancel</button>`},

/* ---- the in-session 3-dot menu ---- */
exopt:i=>{i=+i;const l=curLog();if(!l||!l.ex[i])return '<div class="mid">Nothing here</div>';
  const e=l.ex[i],n=l.ex.length;
  const opts=Object.keys(EX).map(x=>`<option value="${esc(x)}"${x===e.n?' selected':''}>${esc(x)}</option>`).join('');
  return `<div class="mid">${esc(e.n)}</div>
  <div class="jm" style="margin:5px 0 12px">Changes apply to today's session only — your programme is untouched.${e.skip?' <b>This exercise is currently removed</b> — its inputs are locked until you reinstate it.':''}</div>
  <div class="sec" style="margin-top:6px">Order</div>
  <button class="mi" onclick="exMove(${i},-1)" ${i===0?'disabled style="opacity:.35"':''}>${IC.up}<span style="flex:1">Move up</span></button>
  <button class="mi" onclick="exMove(${i},1)" ${i===n-1?'disabled style="opacity:.35"':''}>${IC.down}<span style="flex:1">Move down</span></button>
  <div class="sec">This exercise</div>
  <button class="mi" onclick="exSkip(${i})">${IC.skip}<span style="flex:1">${e.skip?'Reinstate this exercise':'Remove from today'}</span></button>
  <button class="mi" onclick="exWarm(${i})">${IC.flame}<span style="flex:1">${e.warm?'Count as working sets':'Mark as warm-up (not counted)'}</span></button>
  <div class="mi" style="border-bottom:none;padding-bottom:4px${e.skip?';opacity:.4;pointer-events:none':''}">${IC.plus}<span style="flex:1">Working sets</span>
    <span class="row" style="gap:7px">
      <button class="btn sm gh" onclick="exSets(${i},${e.sets.length-1})">−</button>
      <span class="mono" style="min-width:18px;text-align:center;font-weight:700">${e.sets.length}</span>
      <button class="btn sm gh" onclick="exSets(${i},${e.sets.length+1})">+</button></span></div>
  <div class="sec">Swap it out</div>
  <div class="jm" style="margin-bottom:7px">Same slot, different movement — for a busy rack, a niggle, or a machine that is taken. Logged sets for this slot are cleared.</div>
  <select id="swx">${opts}</select>
  <button class="btn gh" style="margin-top:8px" onclick="exSwap(${i},document.getElementById('swx').value)">${IC.swap} Swap</button>
  <div class="sec">Also</div>
  <button class="mi" onclick="close_();open_('addex')">${IC.plus}<span style="flex:1">Add another exercise to today</span></button>
  <button class="mi" onclick="close_();open_('ex','${encodeURIComponent(e.n)}')">${IC.info}<span style="flex:1">Form cues</span></button>
  <button class="mi" onclick="close_();open_('timer')">${IC.clock}<span style="flex:1">Interval timer</span></button>
  <button class="mi bad" onclick="exDel(${i})">${IC.trash}<span style="flex:1">Delete it entirely</span></button>
  <button class="btn gh" style="margin-top:14px" onclick="close_()">Cancel</button>`},

/* ---- one logged session, editable ---- */
hist:key=>{const r=histRef(key),l=r.l;
  if(!l)return '<div class="mid">Nothing logged</div>';
  let h=`<div class="mid">${esc(sessLabel(l))}</div>
  <div class="jm" style="margin:5px 0 13px">${esc(r.d)}${l.at?' · '+esc(l.at):''}${l.retro?' · logged after the fact':''}${r.i>0?' · session '+(r.i+1)+' of the day':''}</div>
  <div class="grid3">
    <div><div class="tiny">Calories</div><input type="text" inputmode="numeric" value="${esc(l.kcal||'')}" onchange="histField('${key}','kcal',this.value)"></div>
    <div><div class="tiny">Avg HR</div><input type="text" inputmode="numeric" value="${esc(l.hr||'')}" onchange="histField('${key}','hr',this.value)"></div>
    <div><div class="tiny">Effort</div><input type="text" inputmode="numeric" value="${esc(l.effort||'')}" onchange="histField('${key}','effort',this.value)"></div>
  </div>
  <div class="grid2" style="margin-top:8px">
    <div><div class="tiny">Duration min</div><input type="text" inputmode="decimal" value="${esc(l.mins||(l.dur?Math.round(l.dur/60):''))}" onchange="histField('${key}','mins',this.value)"></div>
    <div><div class="tiny">Started</div><input type="time" value="${esc(l.at||'')}" onchange="histField('${key}','at',this.value)"></div>
  </div>`;
  (l.ex||[]).forEach((e,i)=>{
    h+=`<div class="sec" style="margin:16px 0 7px">${esc(e.n)}${e.skip?' · skipped':''}${e.warm?' · warm-up':''}</div>`;
    (e.sets||[]).forEach((st,j)=>{
      h+=`<div class="st" style="grid-template-columns:22px 1fr 1fr 42px"><span>${j+1}</span>
        <input type="text" inputmode="decimal" value="${esc(wDisp(st.w))}" onchange="histSetV('${key}',${i},${j},'w',this.value)" class="${isBW(st.w)?'bw':''}">
        <input type="text" inputmode="numeric" value="${esc(st.r)}" onchange="histSetV('${key}',${i},${j},'r',this.value)">
        <span class="rsc">${st.rs!==undefined?esc(restTxt(st.rs)):''}</span></div>`});});
  h+=`<button class="btn" style="margin-top:16px" onclick="close_();go('prog')">Done</button>
    <button class="btn gh" style="margin-top:7px;color:var(--bad)" onclick="histDel('${key}')">Delete this session</button>`;
  return h},

/* ---- log a workout that already happened ---- */
retro:()=>{const R=RETRO;if(!R)return '<div class="mid">Nothing to log</div>';
  const p=curP();
  const sess=Object.keys(p.sessions).map(k=>[k,p.sessions[k].n])
    .concat(D.mine.map(m=>[m.id,m.n]))
    .concat(XTRAORDER.map(k=>[XTRA[k].id,XTRA[k].n]))
    .concat(KBXORDER.map(k=>['kbx_'+k,KBX[k].n+' Complex']))
    .concat(CALORDER.map(k=>['cal_'+k,CAL[k].n]));
  const opts=Object.keys(EX).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
  return `<div class="mid">Log a workout you've already done</div>
  <div class="jm" style="margin:6px 0 13px">For the sessions you trained without the app open. It counts toward your volume, calories and PBs exactly like a live one.</div>
  <div class="grid2">
    <div><div class="tiny">Date</div><input type="date" value="${esc(R.d)}" max="${todayISO()}" onchange="retroSet('d',this.value)"></div>
    <div><div class="tiny">Effort 1–10</div><input type="text" inputmode="numeric" value="${esc(R.effort)}" onchange="retroSet('effort',this.value)"></div>
  </div>
  <div class="grid2" style="margin-top:8px">
    <div><div class="tiny">Calories</div><input type="text" inputmode="numeric" placeholder="auto" value="${esc(R.kcal)}" onchange="retroSet('kcal',this.value)"></div>
    <div><div class="tiny">Avg HR</div><input type="text" inputmode="numeric" placeholder="bpm" value="${esc(R.hr)}" onchange="retroSet('hr',this.value)"></div>
  </div>
  <div class="grid2" style="margin-top:8px">
    <div><div class="tiny">Duration</div><input type="text" inputmode="decimal" placeholder="47 or 47:30" value="${esc(R.mins)}" onchange="retroSet('mins',this.value)"></div>
    <div><div class="tiny">Started (optional)</div><input type="time" value="${esc(R.at)}" onchange="retroSet('at',this.value)"></div>
  </div>
  <div class="jm" style="margin-top:5px">Start time is optional — it is what tells a morning lift apart from an evening session in your history.</div>
  <div class="sec">Start from a session</div>
  <select onchange="retroSet('sid',this.value)">
    <option value="">Build it from scratch</option>
    ${sess.map(s=>`<option value="${esc(s[0])}"${R.sid===s[0]?' selected':''}>${esc(s[1])}</option>`).join('')}</select>
  <div class="sec">What you did</div>
  ${R.ex.length?R.ex.map((e,i)=>`<div class="card plain" style="background:var(--s2);padding:11px">
      <div class="row sp"><span style="font-weight:600;font-size:14px;flex:1">${esc(e.n)}</span>
        <button onclick="retroDel(${i})" style="color:var(--tx3)">✕</button></div>
      <div class="grid3" style="margin-top:8px">
        <div><div class="tiny">Sets</div><input type="text" inputmode="numeric" value="${esc(e.s)}" onchange="retroEx(${i},'s',this.value)"></div>
        <div><div class="tiny">KG</div><input type="text" inputmode="decimal" placeholder="1 = BW" value="${esc(e.w)}" onchange="retroEx(${i},'w',this.value)"></div>
        <div><div class="tiny">Reps</div><input type="text" inputmode="numeric" value="${esc(e.r)}" onchange="retroEx(${i},'r',this.value)"></div>
      </div></div>`).join('')
   :`<div class="note" style="margin-bottom:10px">Pick a session above, or add movements one at a time.</div>`}
  <select id="rx" style="margin-top:8px">${opts}</select>
  <button class="btn gh" style="margin-top:8px" onclick="retroAdd(document.getElementById('rx').value)">Add exercise</button>
  <button class="btn p" style="margin-top:14px" onclick="retroSave()">Log it</button>
  <button class="btn gh" style="margin-top:7px" onclick="close_()">Cancel</button>`},

/* ---- kettlebell complexes ---- */
kbx:k=>{const c=KBX[k];if(!c)return '<div class="mid">Unknown complex</div>';
  const s=kbxSession(k);
  return `<div class="mid">${esc(c.n)} Complex</div>
  <div class="row" style="gap:6px;margin:9px 0 12px;flex-wrap:wrap">
    <span class="pill a">${c.rounds} rounds</span><span class="pill">${c.rest}s between rounds</span>
    <span class="pill">${esc(c.kit)}</span><span class="pill">~${s.mins} min</span></div>
  <div class="note">${esc(c.note)}</div>
  <div class="sec">The sequence — unbroken, bell stays up</div>
  ${c.seq.map((x,i)=>`<div class="tst"><div style="flex:1">
     <div style="font-weight:600;font-size:14px">${i+1}. ${esc(x[0])}</div>
     <div class="jm">${(EX[x[0]]||{}).c?esc(String(EX[x[0]].c).split('.')[0])+'.':''}</div></div>
     <span class="pill a">×${x[1]}</span></div>`).join('')}
  <div class="warnbox" style="margin-top:12px">Rest is between ROUNDS only. If you have to put the bell down mid-round, the bell is too heavy or the round is too long — drop a size rather than break the complex.</div>
  <button class="btn p" style="margin-top:6px" onclick="startKbx('${k}')">Start it now</button>
  <button class="btn gh" style="margin-top:7px" onclick="close_()">Close</button>`},

/* ---- calisthenics workouts ---- */
cal:k=>{const c=CAL[k];if(!c)return '<div class="mid">Unknown workout</div>';
  return `<div class="mid">${esc(c.n)}</div>
  <div class="row" style="gap:6px;margin:9px 0 12px;flex-wrap:wrap">
    <span class="pill a">${esc(c.kind)}</span><span class="pill">~${c.mins} min</span>
    ${c.bench?'<span class="pill g">Scored benchmark</span>':''}</div>
  <div class="note">${esc(c.note)}</div>
  <div class="sec">The workout</div>
  ${c.ex.map(e=>`<div class="tst"><div style="flex:1">
     <div style="font-weight:600;font-size:14px">${esc(e.n)}</div>
     <div class="jm">${e.s>1?e.s+' \u00d7 ':''}${esc(e.r)}${e.t?' \u00b7 '+esc(e.t):''}${e.rest?' \u00b7 rest '+e.rest+'s':''}</div></div></div>`).join('')}
  <button class="btn p" style="margin-top:16px" onclick="startCal('${k}')">Start it now</button>
  ${c.bench?`<button class="btn gh" style="margin-top:7px" onclick="close_();open_('bench','${c.bench}')">Log a score</button>`:''}
  <button class="btn gh" style="margin-top:7px" onclick="close_()">Close</button>`},

/* ---- martial arts sessions ---- */
xtra:k=>{const x=XTRA[k];if(!x)return '<div class="mid">Unknown session</div>';
  return `<div class="mid">${esc(x.n)}</div>
  <div class="row" style="gap:6px;margin:9px 0 12px;flex-wrap:wrap">
    <span class="pill b">${x.ex.length} blocks</span><span class="pill">${x.mins} min</span>
    <span class="pill">Home · bag &amp; gloves</span></div>
  <div class="note">${esc(x.note)}</div>
  <div class="sec">The session</div>
  ${x.ex.map(e=>`<div class="tst"><div style="flex:1">
     <div style="font-weight:600;font-size:14px">${esc(e.n)}</div>
     <div class="jm">${esc(e.s)} × ${esc(e.r)} · rest ${e.rest}s</div></div></div>`).join('')}
  ${x.fin?`<div class="sec">Finisher</div><div class="note">${esc(x.fin)}</div>`:''}
  <button class="btn p" style="margin-top:16px" onclick="startXtra('${k}')">Start it now</button>
  <button class="btn gh" style="margin-top:7px" onclick="close_()">Close</button>`},

/* ---- progress photos ---- */
photo:()=>`<div class="mid">Progress photo</div>
  <div class="jm" style="margin:6px 0 13px">Stored on this phone only, inside your own profile. Same spot, same light, same time of day — that is what makes the comparison worth anything. Front relaxed, back double bi, side. Photos are downscaled before saving so they do not fill your storage.</div>
  <button class="btn p" onclick="photoTag('before')">Take a BEFORE photo</button>
  <button class="btn" style="margin-top:8px" onclick="photoTag('progress')">Take a PROGRESS photo</button>
  <button class="btn" style="margin-top:8px" onclick="photoTag('after')">Take an AFTER photo</button>
  <input type="file" id="pf" accept="image/*" style="display:none" onchange="photoAdd(this)">
  <button class="btn gh" style="margin-top:14px" onclick="close_()">Cancel</button>`,

/* ---- profiles ---- */
prof:()=>{const s=profileState();
  return `<div class="mid">Who's training?</div>
  <div class="jm" style="margin:6px 0 13px">Each profile keeps its own programme, log, PBs and photos, all on this phone. Nothing is uploaded anywhere and nobody sees anyone else's data.</div>
  ${s.list.map(p=>`<div class="tst ${p.id===s.cur?'':''}" style="${p.id===s.cur?'border-color:var(--acc)':''}">
    <div style="flex:1">
      <div style="font-weight:600;font-size:15px">${esc(p.name)}${p.owner?' <span class="pill a">Owner</span>':''}${p.pin?' <span class="pill">PIN</span>':''}</div>
      <div class="jm">${p.id===s.cur?'Currently signed in':'Tap Switch to sign in'}</div></div>
    ${p.id===s.cur?'<span class="pill g">Active</span>'
      :`<button class="btn sm gh" onclick="profileSwitch('${p.id}')">Switch</button>`}
    ${p.owner?'':`<button class="btn sm gh" style="color:var(--bad)" onclick="profileDel('${p.id}')">✕</button>`}
    </div>`).join('')}
  <div class="sec">Add someone</div>
  <input id="pn" placeholder="Their name">
  <input id="pp" inputmode="numeric" placeholder="4-digit PIN (optional)" style="margin-top:8px">
  <div class="jm" style="margin-top:6px">The PIN just stops someone opening the wrong log by mistake. It is not encryption — anyone with this unlocked phone could still get at the data.</div>
  <button class="btn" style="margin-top:10px" onclick="profileAdd()">Create profile</button>
  <button class="btn gh" style="margin-top:14px" onclick="close_()">Close</button>`},

ex:n=>{n=decodeURIComponent(n);const e=EX[n]||{m:[],c:''};
  const kb=/^KB /.test(n);
  return `<div class="mid">${esc(n)}</div>
    <div class="row" style="gap:6px;margin:9px 0 13px;flex-wrap:wrap">${(e.m||[]).map(m=>`<span class="pill">${MUSN[m]||m}</span>`).join('')}</div>
    <div class="note">${esc(e.c||'')}</div>
    ${kb?`<div class="sec">Your ten kettlebell rules</div><div class="note">${KBRULES.map((r,i)=>(i+1)+'. '+esc(r)).join('<br>')}</div>`:''}
    <button class="btn" style="margin-top:16px" onclick="close_()">Close</button>`},

tech:t=>{t=decodeURIComponent(t);
  return `<div class="mid">${esc(t)}</div><div class="note" style="margin-top:10px">${esc(TECH[t]||'Apply as written in the session.')}</div>
  <button class="btn" style="margin-top:16px" onclick="close_()">Close</button>`},

mob:k=>{const M=MOB[k],done=D.mobility[todayISO()];
  return `<div class="mid">${esc(M.n)} mobility</div>
    <div class="note" style="margin:8px 0 14px">Slow and unrushed. Breathe out into each position. High frequency beats high intensity — this is the "use it or lose it" principle, so a short honest session daily beats a long one weekly.</div>
    ${M.ex.map(x=>`<div class="card" style="background:var(--s2)">
      <div class="row sp"><span style="font-weight:600;font-size:15px">${esc(x.n)}</span><span class="pill">${esc(x.d)}</span></div>
      <div class="note" style="margin-top:6px">${esc(x.c)}</div></div>`).join('')}
    <button class="btn ${done?'':'p'}" style="margin-top:12px" onclick="mobDone()">${done?'Done today ✓':'Mark complete'}</button>`},

tools:()=>`<div class="mid">Recovery tools</div>
  ${TOOLS.map(t=>`<div class="card" style="background:var(--s2);margin-top:10px">
    <div style="font-weight:600;font-size:15px">${esc(t.n)}</div>
    <div class="note" style="margin-top:5px">${esc(t.c)}</div></div>`).join('')}
  <button class="btn" style="margin-top:14px" onclick="close_()">Close</button>`,

food:()=>`<div class="mid">Add food</div>
  <div style="margin:13px 0 9px"><select id="fs">${FOOD.map(f=>`<option value="${esc(f.n)}">${esc(f.n)} — ${f.k} kcal / ${f.p}p / ${f.f}f per 100g</option>`).join('')}</select></div>
  <input type="number" inputmode="numeric" id="fg" placeholder="Grams" value="200">
  <div class="row" style="gap:7px;margin:11px 0">
    ${[100,150,200,300,500].map(g=>`<button class="btn sm gh" onclick="document.getElementById('fg').value=${g}">${g}g</button>`).join('')}</div>
  <button class="btn p" onclick="addFood(document.getElementById('fs').value,document.getElementById('fg').value)">Add</button>
  <button class="btn gh" style="margin-top:7px" onclick="close_()">Cancel</button>`,

pg:id=>{const p=P[id],on=id===D.active.id,pct=progPct();
  return `<div class="mid">${esc(p.name)}</div>
    <div class="jm" style="margin-top:3px">${esc(p.sub)}</div>
    <div class="row" style="gap:6px;margin:12px 0;flex-wrap:wrap">
      <span class="pill">${p.weeks} weeks</span><span class="pill">${p.days} days/week</span>
      <span class="pill">${esc(p.where)}</span><span class="pill">${esc(p.bias)}</span>
      ${p.fst?'<span class="pill a">FST-7</span>':''}${p.pavel?'<span class="pill a">Pavel rules</span>':''}
      ${p.bare?'<span class="pill a">Bare Mode</span>':''}</div>
    <div class="note">${esc(p.why)}</div>
    <div class="sec">The week</div>
    <div class="note">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>{const s=p.schedule[i];
      return `<b>${d}</b> — ${s==='rest'?'Rest':s==='sport'?'Sport':esc(p.sessions[s].n)+' <span style="color:var(--tx3)">('+p.sessions[s].mins+' min)</span>'}`}).join('<br>')}</div>
    <div class="sec">Blocks</div>
    <div class="note">${p.blocks.map(b=>`<b>Weeks ${b.f}${b.t>b.f?'–'+b.t:''} · ${esc(b.type)}</b><br><span style="color:var(--tx2)">${esc(b.note)}</span>`).join('<br><br>')}</div>
    ${on?`<div class="card" style="margin-top:16px;background:var(--s2)"><div class="lbl">Active</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="jm" style="margin-top:7px">${pct}% through. Week ${curWeek()} of ${p.weeks}.</div>
      <button class="btn gh" style="margin-top:10px" onclick="restart()">Restart from week 1</button></div>`
    :`<button class="btn p" style="margin-top:16px" onclick="switchTo('${id}')">Start this programme</button>`}
    <button class="btn gh" style="margin-top:7px" onclick="close_()">Close</button>`},

hop:id=>{const p=P[id],cp=curP(),pct=progPct();
  return `<div class="mid">You're ${pct}% through ${esc(cp.name)}</div>
    <div class="note" style="margin:11px 0 14px">Programme-hopping is the single most common reason people stop progressing. ${esc(cp.name)} has ${cp.weeks-curWeek()+1} weeks left, and the block you're in was written to build on the one before it. Finishing beats optimising.</div>
    <div class="warnbox">If you genuinely can't run it — injury, travel, or the gym access changed — switching is the right call. If you're just bored, the answer is usually to add weight, not change programme.</div>
    <button class="btn gh" style="margin-top:12px" onclick="close_()">Stay on ${esc(cp.name)}</button>
    <button class="btn" style="margin-top:7px;color:var(--tx3)" onclick="doSwitch('${id}')">Switch anyway to ${esc(p.name)}</button>`},

rescue:()=>{const s=sessFor();
  return `<div class="mid">Rescue the session</div>
    <div class="note" style="margin:10px 0 14px">Life happened. Don't lose the day — collapse it into 20 minutes at home. This keeps the streak, keeps the stimulus, and the progression engine treats it as a maintenance session rather than a miss.</div>
    <div class="card" style="background:var(--s2)"><div class="lbl">20-minute rescue</div>
      <div class="note">${s&&/Leg|Lower|Squat/i.test(s.n)
        ?'KB front rack squat 3×12 · KB swing 5×20 · KB single-leg RDL 3×10 per side · KB calf raise 3×20 · tibialis raise 3×20'
        :'Ring pull-up 3×AMRAP−2 · Ring dip 3×10 · KB military press 3×8 per side · Ring row 3×12 · ab wheel 3×10'}</div></div>
    <button class="btn p" style="margin-top:12px" onclick="doRescue()">Load the rescue session</button>
    <button class="btn gh" style="margin-top:7px" onclick="close_()">Cancel</button>`},

done:()=>{const l=curLog();if(!l)return '<div class="mid">Nothing to log</div>';
  const sets=l.ex.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0);
  return `<div class="mid">Session logged</div>
    <div class="grid3" style="margin:14px 0">
      <div><div class="tiny">Sets</div><div class="big">${sets}</div></div>
      <div><div class="tiny">Minutes</div><div class="big">${fmt((l.dur||0)/60)}</div></div>
      <div><div class="tiny">Training streak</div><div class="big" style="color:var(--acc)">${trainStreak()}</div></div></div>
    <div class="note">Next time the app will read these numbers and tell you exactly what to beat. Mobility tonight — that's the half most people skip.</div>
    <button class="btn p" style="margin-top:14px" onclick="close_();go('today')">Done</button>`},

bench:k=>{const b=BENCH.find(x=>x.k===k);
  return `<div class="mid">${esc(b.n)}</div>
    <div class="note" style="margin:9px 0 4px">${esc(b.d)}</div>
    ${b.pb?`<div class="jm" style="margin-bottom:12px">Your PB: ${esc(b.pb)}</div>`:''}
    <input id="bv" placeholder="${b.u==='time'?'mm:ss':'Total reps'}">
    <button class="btn p" style="margin-top:11px" onclick="logBench('${k}')">Log result</button>
    ${(D.bench[k]||[]).length?`<div class="sec">History</div>${D.bench[k].slice().reverse().map(x=>`<div class="fi"><span>${x.d}</span><span class="mono">${esc(x.v)}</span></div>`).join('')}`:''}
    <button class="btn gh" style="margin-top:11px" onclick="close_()">Close</button>`},

assess:()=>`<div class="mid">Mobility assessment</div>
  <div class="note" style="margin:9px 0 14px">Test the same way every time. <b>Hips</b> — how deep is a bodyweight squat with heels down? <b>Ankles</b> — knee-to-wall, how far back can the foot go with the heel down? <b>Shoulders</b> — how narrow can your grip go on a band dislocate? Score honestly out of 10.</div>
  ${['hips','ankles','shoulders'].map(k=>`<div style="margin-bottom:11px"><div class="tiny">${k}</div>
    <input type="number" id="a_${k}" min="1" max="10" placeholder="1–10"></div>`).join('')}
  <button class="btn p" onclick="logAssess()">Save scores</button>
  <button class="btn gh" style="margin-top:7px" onclick="close_()">Cancel</button>`,

note:()=>{const l=curLog();return `<div class="mid">Session notes</div>
  <textarea id="sn" rows="5" style="margin-top:11px" placeholder="How did it feel? Anything to remember for next time?">${esc(l&&l.note||'')}</textarea>
  <button class="btn p" style="margin-top:11px" onclick="saveNote()">Save</button>`},

build:()=>{const B=BUILD;if(!B)return '<div class="mid">Nothing to edit</div>';
  const opts=Object.keys(EX).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
  return `<div class="mid">${B.n?esc(B.n):'New workout'}</div>
  <div class="jm" style="margin:5px 0 12px">Build it once, reuse it forever. It logs, progresses and counts toward your volume exactly like a programme session.</div>
  <input id="bn" placeholder="Name it — e.g. Hotel room 20" value="${esc(B.n)}" onchange="bName(this.value)">
  <div class="row" style="gap:7px;margin:10px 0 4px">
    ${[['home','Home'],['gym','Gym'],['out','Outdoors'],['either','Either']].map(x=>
      `<button class="btn sm ${B.w===x[0]?'p':'gh'}" onclick="bWhere('${x[0]}')">${x[1]}</button>`).join('')}</div>
  <div class="sec">Exercises</div>
  ${B.ex.length?B.ex.map((e,i)=>`<div class="card ${isCardio(e)?'amb':'plain'}" style="background:var(--s2);padding:11px">
      <div class="row sp"><span style="font-weight:600;font-size:14px;flex:1">${esc(e.n)}</span>
        <span class="row" style="gap:9px;color:var(--tx3)">
          <button onclick="bMove(${i},-1)">▲</button><button onclick="bMove(${i},1)">▼</button>
          <button onclick="bDel(${i})">✕</button></span></div>
      ${isCardio(e)?`<div class="jm" style="margin-top:6px">You'll log ${CARDIO[e.k].f.map(f=>f[1].toLowerCase()).join(', ')}, calories and effort when you do it.</div>
        <input style="margin-top:8px" placeholder="Note \u2014 e.g. Zone 2, or 6\u00d7800m" value="${esc(e.r)}" onchange="bSet(${i},'r',this.value)">`
      :`<div class="grid3" style="margin-top:9px">
        <div><div class="tiny">Sets</div><input type="number" inputmode="numeric" value="${e.s}" onchange="bSet(${i},'s',this.value)"></div>
        <div><div class="tiny">Reps</div><input value="${esc(e.r)}" onchange="bSet(${i},'r',this.value)"></div>
        <div><div class="tiny">Rest s</div><input type="number" inputmode="numeric" value="${e.rest}" onchange="bSet(${i},'rest',this.value)"></div>
      </div>`}</div>`).join('')
   :`<div class="note" style="margin-bottom:10px">No exercises yet. Add from the library below — all ${Object.keys(EX).length} of them, cues included.</div>`}
  <div class="sec">Add cardio</div>
  <div class="row" style="gap:6px;flex-wrap:wrap">
    ${Object.keys(CARDIO).map(k=>`<button class="btn sm gh" onclick="bAddCardio('${k}')">+ ${esc(CARDIO[k].n)}</button>`).join('')}</div>
  <div class="sec">Add from the library</div>
  <select id="bx">${opts}</select>
  <button class="btn" style="margin-top:8px" onclick="bAdd(document.getElementById('bx').value)">Add exercise</button>
  <button class="btn p" style="margin-top:14px" onclick="bSave(true)">Save and start now</button>
  <button class="btn gh" style="margin-top:7px" onclick="bSave(false)">Save for later</button>
  ${D.mine.find(x=>x.id===B.id)?`<button class="btn gh" style="margin-top:7px;color:var(--bad)" onclick="delWorkout('${B.id}')">Delete</button>`:''}
  <button class="btn gh" style="margin-top:7px" onclick="close_()">Cancel</button>`},

addex:()=>{const opts=Object.keys(EX).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
  return `<div class="mid">Add an exercise to today</div>
  <div class="jm" style="margin:6px 0 12px">One-off addition to this session only. It counts toward your volume and starts tracking for progression.</div>
  <select id="ax">${opts}</select>
  <div class="grid3" style="margin-top:10px">
    <div><div class="tiny">Sets</div><input type="number" inputmode="numeric" id="as" value="3"></div>
    <div><div class="tiny">Reps</div><input id="ar" value="10"></div>
    <div><div class="tiny">Rest s</div><input type="number" inputmode="numeric" id="ard" value="90"></div></div>
  <button class="btn p" style="margin-top:12px" onclick="addExToday()">Add</button>
  <button class="btn gh" style="margin-top:7px" onclick="close_()">Cancel</button>`},

timer:()=>{const iv=D.settings.iv||{work:30,rest:30,rounds:8,prep:5};
  return `<div class="mid">Timer</div>
  <div class="tabs" style="margin-top:12px">
    <button class="tab on">Interval</button><button class="tab" onclick="open_('sw')">Stopwatch</button></div>
  <div class="card acc" id="ivface" style="margin-bottom:12px">
    <div style="text-align:center;padding:14px 0"><div class="tiny">Ready</div>
    <div style="font-size:64px;font-weight:700;line-height:1.05;color:var(--acc)" class="mono">0:00</div>
    <div class="sub">Set it up below</div></div></div>
  <div class="grid2">
    <div><div class="tiny">Work s</div><input type="number" inputmode="numeric" id="iw" value="${iv.work}"></div>
    <div><div class="tiny">Rest s</div><input type="number" inputmode="numeric" id="ir" value="${iv.rest}"></div>
    <div><div class="tiny">Rounds</div><input type="number" inputmode="numeric" id="ind" value="${iv.rounds}"></div>
    <div><div class="tiny">Get ready s</div><input type="number" inputmode="numeric" id="ip" value="${iv.prep}"></div>
  </div>
  <div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap">
    ${[['EMOM 60/0 \u00d710',60,0,10],['Sprints 20/40 \u00d78',20,40,8],['Rounds 30/30 \u00d712',30,30,12],['Tabata 20/10 \u00d78',20,10,8]]
      .map(x=>`<button class="btn sm gh" onclick="ivPreset(${x[1]},${x[2]},${x[3]})">${x[0]}</button>`).join('')}</div>
  <button class="btn p" style="margin-top:12px" onclick="ivStart()">Start</button>
  <div class="row" style="gap:7px;margin-top:7px">
    <button class="btn gh" onclick="ivPause()">Pause / resume</button>
    <button class="btn gh" onclick="ivReset()">Reset</button></div>
  <button class="btn gh" style="margin-top:7px" onclick="close_()">Close</button>`},

sw:()=>`<div class="mid">Stopwatch</div>
  <div class="tabs" style="margin-top:12px">
    <button class="tab" onclick="open_('timer')">Interval</button><button class="tab on">Stopwatch</button></div>
  <div class="card ice" id="swface"><div style="text-align:center;padding:10px 0">
    <div style="font-size:56px;font-weight:700" class="mono">00:00<span style="font-size:24px;color:var(--tx3)">.0</span></div></div></div>
  <button class="btn p" onclick="swToggle()">Start / stop</button>
  <div class="row" style="gap:7px;margin-top:7px">
    <button class="btn gh" onclick="swLap()">Lap</button>
    <button class="btn gh" onclick="swReset()">Reset</button></div>
  <div class="jm" style="margin-top:10px">Use this for The Standard, Murph, Anna and anything timed. Log the result under Progress \u2192 Benchmarks.</div>
  <button class="btn gh" style="margin-top:10px" onclick="close_()">Close</button>`,

set:()=>{const S=D.settings;return `<div class="mid">Settings</div>
  <div class="sec">Bare Mode</div>
  <div class="row sp"><div style="flex:1"><div style="font-weight:600;font-size:15px">Run first, lift later</div>
    <div class="jm">Nick Bare's double-day. Only applies to Froning &amp; Fraser, Trail &amp; Summit and Long Road.</div></div>
    <button class="tick ${S.bareMode?'on':''}" style="width:52px" onclick="tglBare()">${CHK}</button></div>

  <div class="sec">You</div>
  <div class="grid2">
    <div><div class="tiny">Weight kg</div><input type="number" id="s_weight" value="${S.weight}"></div>
    <div><div class="tiny">Age</div><input type="number" id="s_age" value="${S.age}"></div>
    <div><div class="tiny">Height cm</div><input type="number" id="s_height" value="${S.height}"></div>
    <div><div class="tiny">Rest default s</div><input type="number" id="s_restDefault" value="${S.restDefault}"></div>
  </div>
  <div class="sec">Targets</div>
  <div class="grid3">
    <div><div class="tiny">kcal</div><input type="number" id="s_kcal" value="${S.kcal}"></div>
    <div><div class="tiny">Protein g</div><input type="number" id="s_protein" value="${S.protein}"></div>
    <div><div class="tiny">Fat g</div><input type="number" id="s_fat" value="${S.fat}"></div>
  </div>
  <button class="btn gh" style="margin-top:9px" onclick="recalc()">Recalculate from my numbers</button>
  <button class="btn p" style="margin-top:14px" onclick="saveSet()">Save</button>
  <button class="btn gh" style="margin-top:7px" onclick="close_()">Cancel</button>
  <div class="jm" style="margin-top:14px">JHFP v1 · built for Juvies. All data lives on this device — back it up from More.</div>`}
};

/* ================= SHEET ACTIONS ================= */
function mobDone(){D.mobility[todayISO()]=true;const d=todayISO();
  D.journal[d]=D.journal[d]||{};D.journal[d].mobility=true;save();close_()}
function switchTo(id){progPct()<70&&D.active.id!==id?open_('hop',id):doSwitch(id)}
function doSwitch(id){
  if(progPct()>=100)D.completed.push({id:D.active.id,end:todayISO()});
  D.active={id:id,start:todayISO(),week:1};save();close_();go('today')}
function restart(){D.active.start=todayISO();save();close_();go('today')}
function doRescue(){
  const k=todayISO(),s=sessFor(),leg=s&&/Leg|Lower|Squat/i.test(s.n);
  const ex=leg?[{n:'KB front rack squat',s:3,r:'12',rest:75},{n:'KB two-arm swing',s:5,r:'20',rest:45},
    {n:'KB single-leg RDL',s:3,r:'10 per side',rest:60},{n:'KB calf raise',s:3,r:'20',rest:30},
    {n:'Tibialis raise',s:3,r:'20',rest:30}]
   :[{n:'Ring pull-up',s:3,r:'AMRAP minus 2',rest:90},{n:'Ring dip',s:3,r:'10',rest:75},
    {n:'KB military press',s:3,r:'8 per side',rest:75},{n:'Ring row',s:3,r:'12',rest:60},
    {n:'Ab wheel',s:3,r:'10',rest:45}];
  /* store in D.custom so it survives a reload — mutating P does not persist */
  D.custom.__rescue={n:'Rescue · 20 min',w:'home',mins:20,ex:ex};
  const _a=dayLogs(k);D.logs[k]=_a;
  _a.push({sid:'__rescue',pid:D.active.id,week:curWeek(),ex:[],done:false,start:Date.now(),rescue:true});
  setIdx(_a.length-1);
  save();close_();go('train')}
function logBench(k){const v=document.getElementById('bv').value.trim();if(!v)return;
  D.bench[k]=D.bench[k]||[];D.bench[k].push({d:todayISO(),v:v});save();close_()}
function logAssess(){const o={d:todayISO()};['hips','ankles','shoulders'].forEach(k=>o[k]=+document.getElementById('a_'+k).value||0);
  D.assess.push(o);save();close_()}
function saveNote(){const l=curLog();if(l){l.note=document.getElementById('sn').value;save()}close_()}
/* Add a one-off exercise to today. It goes STRAIGHT into log.ex — relying on
   the seeder to pick it up out of `extra` meant a name that had been deleted or
   swapped away was blocked forever, because the seeder skips anything already
   listed in `seeded`. */
function addExToday(){
  const n=(document.getElementById('ax')||{value:''}).value;
  if(!n)return;
  const l=curLog();if(!l)return;
  if(l.ex.some(x=>x.n===n)){alert(n+' is already in this session.');close_();return}
  const sets=Math.max(1,Math.min(12,+((document.getElementById('as')||{}).value)||3));
  const reps=((document.getElementById('ar')||{}).value)||'10';
  const rest=+((document.getElementById('ard')||{}).value)||90;
  l.ex.push({n:n,r:reps,rest:rest,
    sets:Array.from({length:sets},()=>({w:'',r:'',done:false}))});
  l.seeded=l.seeded||[];
  if(l.seeded.indexOf(n)<0)l.seeded.push(n);
  save();close_();go('train');
}

function tglBare(){D.settings.bareMode=!D.settings.bareMode;save();open_('set')}
function saveSet(){['weight','age','height','restDefault','kcal','protein','fat'].forEach(k=>{
  const el=document.getElementById('s_'+k);if(el&&el.value!=='')D.settings[k]=+el.value});save();close_()}
function recalc(){const S=D.settings;
  const w=+document.getElementById('s_weight').value||S.weight;
  const a=+document.getElementById('s_age').value||S.age;
  const ht=+document.getElementById('s_height').value||S.height;
  const bmr=10*w+6.25*ht-5*a+5, tdee=bmr*1.725, kcal=Math.round(tdee*1.10/50)*50;
  const p=Math.round(w*2.5/5)*5, fat=Math.round((kcal-p*4)/9);
  document.getElementById('s_kcal').value=kcal;
  document.getElementById('s_protein').value=p;
  document.getElementById('s_fat').value=fat;}

/* ================= EXPORT ================= */
function dl(name,txt,type){const b=new Blob([txt],{type:type||'text/plain'}),u=URL.createObjectURL(b);
  const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function expJSON(){dl('JHFP-backup-'+todayISO()+'.json',JSON.stringify(D,null,1),'application/json')}
function impJSON(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();
  r.onload=e=>{try{D=migrate(deep(DEF,JSON.parse(e.target.result)));save();render();alert('Restored.')}catch(x){alert('That file could not be read.')}};
  r.readAsText(f)}
function expObs(){
  const p=curP();let m='---\ntype: log\nsource: JHFP\ntags: [health, fitness, jhfp]\n---\n\n';
  m+='# JHFP training log — '+todayISO()+'\n\n';
  m+='**Programme:** '+p.name+' · week '+curWeek()+' of '+p.weeks+' ('+progPct()+'% complete)  \n';
  m+='**Training streak:** '+trainStreak()+' days · **Protocol streak:** '+streak()+' days · **Mobility streak:** '+mobStreak()+' days\n\n';
  const v=volume(7);
  m+='## Weekly volume (sets per muscle, last 7 days)\n\n';
  m+='| Muscle | Sets | State |\n|---|---|---|\n';
  MUS.forEach(x=>{const s=volState(v[x],x);m+='| '+MUSN[x]+' | '+v[x]+' | '+s[0]+' |\n'});
  m+='\n## Sessions\n\n';
  const _rows=[];Object.keys(D.logs).sort().reverse().forEach(k=>dayLogs(k).forEach(l=>_rows.push([k,l])));
  _rows.slice(0,60).forEach(([k,l])=>{if(!l.done)return;
    /* resolve across the programme, saved customs, complexes and striking */
    const pp=P[l.pid]||p, ss=(pp.sessions&&pp.sessions[l.sid])||sessById(l.sid)||D.custom[l.sid];
    m+='### '+k+' — '+(ss?ss.n:(l.sid||'Session'))+(l.retro?' _(logged after the fact)_':'')+'\n\n';
    const meta=[];
    if(l.kcal)meta.push(l.kcal+' kcal');
    if(l.hr)meta.push('avg HR '+l.hr+' bpm');
    if(l.effort)meta.push('effort '+l.effort+'/10');
    if(l.dur)meta.push(Math.round(l.dur/60)+' min');
    if(meta.length)m+='*'+meta.join(' · ')+'*\n\n';
    l.ex.forEach(e=>{
      if(e.c&&e.c.done){
        const C=CARDIO[e.k]||{f:[]};
        const bits=C.f.map(f=>e.c[f[0]]?f[1]+' '+e.c[f[0]]+(f[2]?f[2]:''):null).filter(Boolean);
        if(e.c.hr)bits.push('avg HR '+e.c.hr);
        if(e.c.kcal)bits.push(e.c.kcal+' kcal');
        m+='- **'+e.n+'** — '+(bits.join(', ')||'done')+'\n';
        return;}
      const s=e.sets.filter(x=>x.done);if(!s.length)return;
      /* 1kg is Juan's bodyweight code — it must export as BW, not as 1kg */
      m+='- **'+e.n+'**'+(e.warm?' _(warm-up)_':'')+' — '
        +s.map(x=>(x.w?(isBW(x.w)?'BW × ':pnum(x.w)+'kg × '):'')+(x.r||'—')
          +(x.rs!==undefined?' ['+restTxt(x.rs)+' rest]':'')).join(', ')+'\n'});
    const skipped=l.ex.filter(e=>e.skip).map(e=>e.n);
    if(skipped.length)m+='- _Skipped: '+skipped.join(', ')+'_\n';
    if(l.note)m+='\n> '+l.note+'\n';m+='\n'});
  m+='## Lift PBs\n\n';
  Object.keys(D.pbs).forEach(n=>{m+='- '+n+' — '+D.pbs[n].w+'kg × '+D.pbs[n].r+' ('+D.pbs[n].d+')\n'});
  if((D.photos||[]).length){
    m+='\n## Progress photos\n\n';
    m+='_'+D.photos.length+' photo'+(D.photos.length===1?'':'s')+' held on the phone (not exported — they stay on the device): '
      +D.photos.map(x=>x.tag+' '+x.d+(x.w?' @'+x.w+'kg':'')).join(' · ')+'_\n';}
  m+='\n## Benchmarks\n\n';
  BENCH.forEach(b=>{const h=D.bench[b.k]||[];if(!h.length)return;
    m+='- **'+b.n+'** — '+h.map(x=>x.v+' ('+x.d+')').join(', ')+'\n'});
  if(D.assess.length){const a=D.assess.slice(-1)[0];
    m+='\n## Mobility assessment\n\nHips '+a.hips+'/10 · Ankles '+a.ankles+'/10 · Shoulders '+a.shoulders+'/10 (scored '+a.d+')\n'}
  m+='\n---\n*Exported from JHFP. Save to iCloud Drive → Obsidian Vault → Health.*\n';
  dl('JHFP-'+todayISO()+'.md',m,'text/markdown');
}

/* ================= BOOT ================= */
save();
render();
/* Auto-update: when a new version is pushed to GitHub, the new service worker
   takes over and the app reloads itself once. No manual cache clearing. */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').then(r=>{r.update();
    setInterval(()=>r.update(),60*60*1000)}).catch(()=>{});
  let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!reloading){reloading=true;location.reload()}});
}
document.addEventListener('gesturestart',e=>e.preventDefault());
