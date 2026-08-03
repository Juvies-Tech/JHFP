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
function sessById(id){if(!id)return null;
  if(curP().sessions[id])return curP().sessions[id];
  if(D.custom[id])return D.custom[id];
  /* Optional extras live outside the programme entirely — a martial arts session
     or a kettlebell complex can be run on ANY day of ANY programme, as a second
     workout or a replacement, without disturbing the block. */
  if(id.indexOf('kbx_')===0)return kbxSession(id.slice(4));
  const x=XTRAORDER.map(k=>XTRA[k]).find(s=>s.id===id);
  return x||null}
/* Start an optional extra without touching the programme schedule. */
function startKbx(k){const s=kbxSession(k);if(!s)return;
  D.custom[s.id]=s;save();close_();freeSession(s.id)}
function startXtra(k){const x=XTRA[k];if(!x)return;
  D.custom[x.id]=x;save();close_();freeSession(x.id)}
/* TODAY'S session. If a session has already been chosen and logged for today —
   picked on a rest day, rescued, or custom-built — that choice wins over the
   schedule. Reading the schedule alone was why "train anyway" never opened. */
function sessFor(day){
  if(day===undefined){const l=D.logs[todayISO()];
    if(l&&l.sid){const s=sessById(l.sid);if(s)return s}}
  const s=slotFor(day);
  return (s==='rest'||s==='sport')?null:curP().sessions[s];
}
function todaySid(){const l=D.logs[todayISO()];if(l&&l.sid&&sessById(l.sid))return l.sid;
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
  for(const k of ks){const l=D.logs[k];if(!l||!l.ex)continue;
    const e=l.ex.find(x=>x.n===name&&x.sets&&x.sets.some(s=>s.done));
    if(e)return{date:k,e:e}}
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
  for(const k in D.logs){ if(k<cut)continue; const l=D.logs[k]; if(!l.ex)continue;
    /* Skipped exercises and anything flagged as a warm-up are real work but not
       growth stimulus — they must not inflate the heat map. */
    l.ex.forEach(e=>{if(e.skip||e.warm)return;
      const n=(e.sets||[]).filter(s=>s.done).length; if(n)addVol(out,e.n,n)});}
  MUS.forEach(m=>out[m]=Math.round(out[m]));
  return out;
}
/* Volume landmarks per muscle (RP-style). Muscles do NOT share one ceiling:
   back and core tolerate far more weekly volume than biceps or calves.
   [MV maintenance, MEV growth starts, MRV recoverable ceiling] */
const LAND={chest:[6,10,22],back:[8,12,28],delts:[6,8,26],biceps:[5,8,20],triceps:[5,8,20],
quads:[6,10,20],hams:[4,8,20],glutes:[4,8,20],calves:[6,8,20],core:[6,10,26],
forearms:[5,8,25],traps:[4,6,20]};
function volState(v,m){const L=LAND[m]||[6,10,20];
  return v<L[0]?['Under','var(--bad)']:v<L[1]?['Building','var(--warn)']
    :v<=L[2]?['In range','var(--ok)']:['High','var(--warn)']}

/* ================= ANATOMY HEAT MAP =================
   Line-art figures. Every muscle is a stroked outline; colour fills in only
   as that muscle takes volume, judged against its own landmarks. Left-half
   paths are mirrored for the right side. */
/* Bodybuilder figure, ~7.5 heads tall, X-frame: wide delts and lats tapering
   hard to a small waist, thick quad sweep, small joints at wrist, knee, ankle.
   Muscle groups are real anatomical segments — pec fans, four ab pairs,
   vastus lateralis / rectus femoris / vastus medialis, two gastroc heads —
   rather than the blocky rectangles of v3. Geometry is generated from
   width-at-height landmarks (see anat3.py in the build notes) so it can be
   re-tuned without hand-editing beziers.
   Left half only; the right is mirrored with scale(-1,1). */
const SILH='<path d="M100,6 C112,6 120,17 120,33 C120,49 112,60 100,60 C88,60 80,49 80,33 C80,17 88,6 100,6 Z"/>'
+'<path d="M86.0,54.0C83.2,55.3 83.7,59.3 83.0,62.0C82.3,64.7 79.2,68.7 82.0,70.0C84.8,71.3 97.0,71.3 100.0,70.0C103.0,68.7 100.0,64.7 100.0,62.0C100.0,59.3 102.3,55.3 100.0,54.0C97.7,52.7 88.8,52.7 86.0,54.0Z"/>'
+'<path d="M84.0,64.0C79.7,65.3 77.0,69.0 74.0,72.0C71.0,75.0 68.0,78.3 66.0,82.0C64.0,85.7 62.8,90.0 62.0,94.0C61.2,98.0 61.0,102.0 61.0,106.0C61.0,110.0 61.5,114.0 62.0,118.0C62.5,122.0 64.2,126.0 64.0,130.0C63.8,134.0 61.8,138.0 61.0,142.0C60.2,146.0 58.5,150.0 59.0,154.0C59.5,158.0 61.8,162.3 64.0,166.0C66.2,169.7 69.7,172.8 72.0,176.0C74.3,179.2 77.7,182.0 78.0,185.0C78.3,188.0 75.5,191.0 74.0,194.0C72.5,197.0 70.3,200.0 69.0,203.0C67.7,206.0 66.3,209.2 66.0,212.0C65.7,214.8 66.3,217.7 67.0,220.0C67.7,222.3 64.5,225.0 70.0,226.0C75.5,227.0 95.0,253.0 100.0,226.0C105.0,199.0 102.7,91.0 100.0,64.0C97.3,37.0 88.3,62.7 84.0,64.0Z"/>'
+'<path d="M72.0,70.0C69.3,71.7 60.8,76.3 56.0,80.0C51.2,83.7 46.3,88.0 43.0,92.0C39.7,96.0 37.7,100.7 36.0,104.0C34.3,107.3 33.3,108.7 33.0,112.0C32.7,115.3 33.3,120.0 34.0,124.0C34.7,128.0 36.0,132.0 37.0,136.0C38.0,140.0 39.0,144.0 40.0,148.0C41.0,152.0 42.0,156.0 43.0,160.0C44.0,164.0 45.2,168.3 46.0,172.0C46.8,175.7 48.2,178.3 48.0,182.0C47.8,185.7 45.8,190.0 45.0,194.0C44.2,198.0 43.2,202.0 43.0,206.0C42.8,210.0 43.2,213.7 44.0,218.0C44.8,222.3 46.5,227.7 48.0,232.0C49.5,236.3 51.5,240.3 53.0,244.0C54.5,247.7 56.2,250.7 57.0,254.0C57.8,257.3 57.5,260.7 58.0,264.0C58.5,267.3 59.3,271.0 60.0,274.0C60.7,277.0 59.7,280.7 62.0,282.0C64.3,283.3 72.2,283.3 74.0,282.0C75.8,280.7 73.5,277.0 73.0,274.0C72.5,271.0 71.5,267.3 71.0,264.0C70.5,260.7 70.7,257.3 70.0,254.0C69.3,250.7 68.0,247.7 67.0,244.0C66.0,240.3 65.0,236.3 64.0,232.0C63.0,227.7 61.7,222.3 61.0,218.0C60.3,213.7 60.0,210.0 60.0,206.0C60.0,202.0 60.7,198.0 61.0,194.0C61.3,190.0 62.2,185.7 62.0,182.0C61.8,178.3 60.7,175.7 60.0,172.0C59.3,168.3 58.7,164.0 58.0,160.0C57.3,156.0 56.5,152.0 56.0,148.0C55.5,144.0 55.2,140.0 55.0,136.0C54.8,132.0 54.8,127.7 55.0,124.0C55.2,120.3 55.7,117.0 56.0,114.0C56.3,111.0 56.3,109.3 57.0,106.0C57.7,102.7 58.5,98.0 60.0,94.0C61.5,90.0 64.0,86.0 66.0,82.0C68.0,78.0 71.0,72.0 72.0,70.0C73.0,68.0 74.7,68.3 72.0,70.0Z"/>'
+'<path d="M70.0,224.0C64.0,226.0 63.3,231.7 61.0,236.0C58.7,240.3 57.0,245.3 56.0,250.0C55.0,254.7 54.8,259.3 55.0,264.0C55.2,268.7 55.8,273.3 57.0,278.0C58.2,282.7 59.8,287.3 62.0,292.0C64.2,296.7 67.3,301.7 70.0,306.0C72.7,310.3 77.7,314.0 78.0,318.0C78.3,322.0 73.8,326.0 72.0,330.0C70.2,334.0 68.0,338.0 67.0,342.0C66.0,346.0 65.7,350.0 66.0,354.0C66.3,358.0 67.5,362.0 69.0,366.0C70.5,370.0 73.0,374.3 75.0,378.0C77.0,381.7 79.3,385.0 81.0,388.0C82.7,391.0 84.2,393.0 85.0,396.0C85.8,399.0 85.3,403.0 86.0,406.0C86.7,409.0 87.3,412.7 89.0,414.0C90.7,415.3 95.0,415.3 96.0,414.0C97.0,412.7 95.3,409.0 95.0,406.0C94.7,403.0 94.3,399.0 94.0,396.0C93.7,393.0 93.3,391.0 93.0,388.0C92.7,385.0 92.3,381.7 92.0,378.0C91.7,374.3 91.3,370.0 91.0,366.0C90.7,362.0 90.2,358.0 90.0,354.0C89.8,350.0 90.0,346.0 90.0,342.0C90.0,338.0 90.0,334.0 90.0,330.0C90.0,326.0 89.8,322.0 90.0,318.0C90.2,314.0 90.7,310.3 91.0,306.0C91.3,301.7 91.7,296.7 92.0,292.0C92.3,287.3 92.7,282.7 93.0,278.0C93.3,273.3 93.7,268.7 94.0,264.0C94.3,259.3 94.7,254.7 95.0,250.0C95.3,245.3 95.7,240.3 96.0,236.0C96.3,231.7 101.3,226.0 97.0,224.0C92.7,222.0 76.0,222.0 70.0,224.0Z"/>';
const AF={
traps:["M86.0,64.0C82.3,65.0 80.5,67.8 78.0,70.0C75.5,72.2 72.8,75.0 71.0,77.0C69.2,79.0 64.5,81.2 67.0,82.0C69.5,82.8 82.0,82.8 86.0,82.0C90.0,81.2 89.2,79.0 91.0,77.0C92.8,75.0 95.5,72.2 97.0,70.0C98.5,67.8 101.8,65.0 100.0,64.0C98.2,63.0 89.7,63.0 86.0,64.0Z"],
delts:["M72.0,70.0C69.5,71.7 61.7,76.3 57.0,80.0C52.3,83.7 47.3,88.0 44.0,92.0C40.7,96.0 38.7,100.7 37.0,104.0C35.3,107.3 34.2,109.0 34.0,112.0C33.8,115.0 35.0,119.0 36.0,122.0C37.0,125.0 36.5,128.7 40.0,130.0C43.5,131.3 54.3,131.3 57.0,130.0C59.7,128.7 56.0,125.0 56.0,122.0C56.0,119.0 56.7,115.0 57.0,112.0C57.3,109.0 57.3,107.0 58.0,104.0C58.7,101.0 59.5,97.7 61.0,94.0C62.5,90.3 65.2,86.0 67.0,82.0C68.8,78.0 71.2,72.0 72.0,70.0C72.8,68.0 74.5,68.3 72.0,70.0Z"],
chest:["M74.0,74.0C69.2,75.3 69.3,79.0 68.0,82.0C66.7,85.0 66.2,89.0 66.0,92.0C65.8,95.0 62.0,98.7 67.0,100.0C72.0,101.3 91.0,101.0 96.0,100.0C101.0,99.0 96.8,96.7 97.0,94.0C97.2,91.3 97.0,87.3 97.0,84.0C97.0,80.7 100.8,75.7 97.0,74.0C93.2,72.3 78.8,72.7 74.0,74.0Z","M67.0,102.0C62.8,103.3 69.2,107.3 71.0,110.0C72.8,112.7 75.2,115.7 78.0,118.0C80.8,120.3 85.3,123.0 88.0,124.0C90.7,125.0 92.8,125.0 94.0,124.0C95.2,123.0 94.7,120.3 95.0,118.0C95.3,115.7 95.8,112.7 96.0,110.0C96.2,107.3 100.8,103.3 96.0,102.0C91.2,100.7 71.2,100.7 67.0,102.0Z"],
biceps:["M38.0,136.0C35.5,137.7 39.2,142.7 40.0,146.0C40.8,149.3 42.0,152.7 43.0,156.0C44.0,159.3 45.0,163.0 46.0,166.0C47.0,169.0 46.5,172.7 49.0,174.0C51.5,175.3 59.3,175.3 61.0,174.0C62.7,172.7 59.7,169.0 59.0,166.0C58.3,163.0 57.5,159.3 57.0,156.0C56.5,152.7 56.3,149.3 56.0,146.0C55.7,142.7 58.0,137.7 55.0,136.0C52.0,134.3 40.5,134.3 38.0,136.0Z"],
forearms:["M47.0,190.0C44.2,192.0 44.7,198.0 44.0,202.0C43.3,206.0 42.7,210.0 43.0,214.0C43.3,218.0 44.7,222.0 46.0,226.0C47.3,230.0 49.3,234.3 51.0,238.0C52.7,241.7 53.0,246.3 56.0,248.0C59.0,249.7 67.5,249.7 69.0,248.0C70.5,246.3 66.3,241.7 65.0,238.0C63.7,234.3 61.8,230.0 61.0,226.0C60.2,222.0 60.2,218.0 60.0,214.0C59.8,210.0 59.8,206.0 60.0,202.0C60.2,198.0 63.2,192.0 61.0,190.0C58.8,188.0 49.8,188.0 47.0,190.0Z"],
core:["M87.0,112.0C85.2,113.2 86.2,116.7 86.0,119.0C85.8,121.3 84.2,124.8 86.0,126.0C87.8,127.2 95.2,127.2 97.0,126.0C98.8,124.8 97.0,121.3 97.0,119.0C97.0,116.7 98.7,113.2 97.0,112.0C95.3,110.8 88.8,110.8 87.0,112.0Z","M86.0,130.0C84.0,131.2 85.2,134.7 85.0,137.0C84.8,139.3 83.0,142.8 85.0,144.0C87.0,145.2 95.0,145.2 97.0,144.0C99.0,142.8 97.0,139.3 97.0,137.0C97.0,134.7 98.8,131.2 97.0,130.0C95.2,128.8 88.0,128.8 86.0,130.0Z","M85.0,148.0C82.8,149.2 84.2,152.7 84.0,155.0C83.8,157.3 81.8,160.8 84.0,162.0C86.2,163.2 94.8,163.2 97.0,162.0C99.2,160.8 97.0,157.3 97.0,155.0C97.0,152.7 99.0,149.2 97.0,148.0C95.0,146.8 87.2,146.8 85.0,148.0Z","M84.0,166.0C81.7,167.3 83.0,171.2 83.0,174.0C83.0,176.8 81.8,181.5 84.0,183.0C86.2,184.5 93.8,184.5 96.0,183.0C98.2,181.5 96.8,176.8 97.0,174.0C97.2,171.2 99.2,167.3 97.0,166.0C94.8,164.7 86.3,164.7 84.0,166.0Z","M82.0,108.0C79.2,110.3 76.0,117.0 74.0,122.0C72.0,127.0 70.3,132.7 70.0,138.0C69.7,143.3 70.8,148.7 72.0,154.0C73.2,159.3 75.3,165.2 77.0,170.0C78.7,174.8 81.2,180.8 82.0,183.0C82.8,185.2 82.0,185.2 82.0,183.0C82.0,180.8 81.8,174.8 82.0,170.0C82.2,165.2 82.7,159.3 83.0,154.0C83.3,148.7 83.3,143.3 84.0,138.0C84.7,132.7 85.8,127.0 87.0,122.0C88.2,117.0 91.8,110.3 91.0,108.0C90.2,105.7 84.8,105.7 82.0,108.0Z"],
quads:["M70.0,230.0C66.3,232.0 64.0,237.7 62.0,242.0C60.0,246.3 58.7,251.3 58.0,256.0C57.3,260.7 57.2,265.3 58.0,270.0C58.8,274.7 60.8,279.3 63.0,284.0C65.2,288.7 68.3,293.7 71.0,298.0C73.7,302.3 76.5,308.0 79.0,310.0C81.5,312.0 85.5,312.0 86.0,310.0C86.5,308.0 83.5,302.3 82.0,298.0C80.5,293.7 78.3,288.7 77.0,284.0C75.7,279.3 74.5,274.7 74.0,270.0C73.5,265.3 73.3,260.7 74.0,256.0C74.7,251.3 76.3,246.3 78.0,242.0C79.7,237.7 85.3,232.0 84.0,230.0C82.7,228.0 73.7,228.0 70.0,230.0Z","M86.0,230.0C83.5,232.3 82.3,239.3 81.0,244.0C79.7,248.7 78.5,253.3 78.0,258.0C77.5,262.7 77.5,267.3 78.0,272.0C78.5,276.7 79.7,281.3 81.0,286.0C82.3,290.7 84.5,297.7 86.0,300.0C87.5,302.3 89.2,302.3 90.0,300.0C90.8,297.7 90.7,290.7 91.0,286.0C91.3,281.3 91.7,276.7 92.0,272.0C92.3,267.3 92.7,262.7 93.0,258.0C93.3,253.3 93.5,248.7 94.0,244.0C94.5,239.3 97.3,232.3 96.0,230.0C94.7,227.7 88.5,227.7 86.0,230.0Z","M85.0,284.0C82.7,285.7 81.8,290.7 81.0,294.0C80.2,297.3 79.5,300.7 80.0,304.0C80.5,307.3 82.3,312.3 84.0,314.0C85.7,315.7 88.7,315.7 90.0,314.0C91.3,312.3 91.5,307.3 92.0,304.0C92.5,300.7 92.5,297.3 93.0,294.0C93.5,290.7 96.3,285.7 95.0,284.0C93.7,282.3 87.3,282.3 85.0,284.0Z"],
calves:["M74.0,326.0C71.3,328.0 69.5,334.0 68.0,338.0C66.5,342.0 65.3,346.0 65.0,350.0C64.7,354.0 64.8,358.0 66.0,362.0C67.2,366.0 69.7,370.0 72.0,374.0C74.3,378.0 77.3,384.0 80.0,386.0C82.7,388.0 87.3,388.0 88.0,386.0C88.7,384.0 85.3,378.0 84.0,374.0C82.7,370.0 80.8,366.0 80.0,362.0C79.2,358.0 78.8,354.0 79.0,350.0C79.2,346.0 80.2,342.0 81.0,338.0C81.8,334.0 85.2,328.0 84.0,326.0C82.8,324.0 76.7,324.0 74.0,326.0Z","M86.0,326.0C84.0,328.0 83.8,334.0 83.0,338.0C82.2,342.0 81.2,346.0 81.0,350.0C80.8,354.0 81.2,358.0 82.0,362.0C82.8,366.0 84.7,370.0 86.0,374.0C87.3,378.0 88.8,384.0 90.0,386.0C91.2,388.0 92.5,388.0 93.0,386.0C93.5,384.0 93.0,378.0 93.0,374.0C93.0,370.0 93.0,366.0 93.0,362.0C93.0,358.0 92.8,354.0 93.0,350.0C93.2,346.0 93.7,342.0 94.0,338.0C94.3,334.0 96.3,328.0 95.0,326.0C93.7,324.0 88.0,324.0 86.0,326.0Z"]};
const AB={
traps:["M86.0,64.0C82.2,65.0 79.7,67.7 77.0,70.0C74.3,72.3 71.8,75.7 70.0,78.0C68.2,80.3 63.7,83.0 66.0,84.0C68.3,85.0 80.2,85.0 84.0,84.0C87.8,83.0 87.0,80.3 89.0,78.0C91.0,75.7 94.2,72.3 96.0,70.0C97.8,67.7 101.7,65.0 100.0,64.0C98.3,63.0 89.8,63.0 86.0,64.0Z","M72.0,86.0C67.3,88.0 68.2,94.0 67.0,98.0C65.8,102.0 65.0,106.3 65.0,110.0C65.0,113.7 63.0,118.3 67.0,120.0C71.0,121.7 85.0,121.7 89.0,120.0C93.0,118.3 90.3,113.7 91.0,110.0C91.7,106.3 92.3,102.0 93.0,98.0C93.7,94.0 98.5,88.0 95.0,86.0C91.5,84.0 76.7,84.0 72.0,86.0Z"],
delts:["M72.0,70.0C69.5,71.7 61.7,76.3 57.0,80.0C52.3,83.7 47.3,88.0 44.0,92.0C40.7,96.0 38.7,100.7 37.0,104.0C35.3,107.3 34.2,109.0 34.0,112.0C33.8,115.0 35.0,119.0 36.0,122.0C37.0,125.0 36.5,128.7 40.0,130.0C43.5,131.3 54.3,131.3 57.0,130.0C59.7,128.7 56.0,125.0 56.0,122.0C56.0,119.0 56.7,115.0 57.0,112.0C57.3,109.0 57.3,107.0 58.0,104.0C58.7,101.0 59.5,97.7 61.0,94.0C62.5,90.3 65.2,86.0 67.0,82.0C68.8,78.0 71.2,72.0 72.0,70.0C72.8,68.0 74.5,68.3 72.0,70.0Z"],
back:["M66.0,90.0C60.3,92.3 61.5,99.3 60.0,104.0C58.5,108.7 57.5,113.3 57.0,118.0C56.5,122.7 56.3,127.3 57.0,132.0C57.7,136.7 59.2,141.3 61.0,146.0C62.8,150.7 65.3,155.7 68.0,160.0C70.7,164.3 74.3,168.7 77.0,172.0C79.7,175.3 81.5,178.7 84.0,180.0C86.5,181.3 90.7,181.3 92.0,180.0C93.3,178.7 92.0,175.3 92.0,172.0C92.0,168.7 92.0,164.3 92.0,160.0C92.0,155.7 92.0,150.7 92.0,146.0C92.0,141.3 92.0,136.7 92.0,132.0C92.0,127.3 91.8,122.7 92.0,118.0C92.2,113.3 92.7,108.7 93.0,104.0C93.3,99.3 98.5,92.3 94.0,90.0C89.5,87.7 71.7,87.7 66.0,90.0Z","M85.0,182.0C82.8,183.3 83.5,187.3 83.0,190.0C82.5,192.7 81.8,195.3 82.0,198.0C82.2,200.7 81.8,204.7 84.0,206.0C86.2,207.3 93.2,207.3 95.0,206.0C96.8,204.7 95.0,200.7 95.0,198.0C95.0,195.3 94.8,192.7 95.0,190.0C95.2,187.3 97.7,183.3 96.0,182.0C94.3,180.7 87.2,180.7 85.0,182.0Z"],
triceps:["M40.0,136.0C37.7,137.7 41.2,142.7 42.0,146.0C42.8,149.3 44.0,152.7 45.0,156.0C46.0,159.3 47.0,162.7 48.0,166.0C49.0,169.3 48.7,174.3 51.0,176.0C53.3,177.7 60.5,177.7 62.0,176.0C63.5,174.3 60.7,169.3 60.0,166.0C59.3,162.7 58.5,159.3 58.0,156.0C57.5,152.7 57.3,149.3 57.0,146.0C56.7,142.7 58.8,137.7 56.0,136.0C53.2,134.3 42.3,134.3 40.0,136.0Z","M37.0,122.0C34.3,123.3 37.3,127.0 38.0,130.0C38.7,133.0 40.0,137.0 41.0,140.0C42.0,143.0 41.3,146.7 44.0,148.0C46.7,149.3 55.2,149.3 57.0,148.0C58.8,146.7 55.5,143.0 55.0,140.0C54.5,137.0 54.2,133.0 54.0,130.0C53.8,127.0 56.8,123.3 54.0,122.0C51.2,120.7 39.7,120.7 37.0,122.0Z"],
forearms:["M47.0,190.0C44.2,192.0 44.7,198.0 44.0,202.0C43.3,206.0 42.7,210.0 43.0,214.0C43.3,218.0 44.7,222.0 46.0,226.0C47.3,230.0 49.3,234.3 51.0,238.0C52.7,241.7 53.0,246.3 56.0,248.0C59.0,249.7 67.5,249.7 69.0,248.0C70.5,246.3 66.3,241.7 65.0,238.0C63.7,234.3 61.8,230.0 61.0,226.0C60.2,222.0 60.2,218.0 60.0,214.0C59.8,210.0 59.8,206.0 60.0,202.0C60.2,198.0 63.2,192.0 61.0,190.0C58.8,188.0 49.8,188.0 47.0,190.0Z"],
glutes:["M82.0,206.0C78.0,207.3 74.5,211.0 72.0,214.0C69.5,217.0 67.7,220.3 67.0,224.0C66.3,227.7 66.8,232.7 68.0,236.0C69.2,239.3 69.3,242.7 74.0,244.0C78.7,245.3 92.3,245.3 96.0,244.0C99.7,242.7 96.0,239.0 96.0,236.0C96.0,233.0 96.0,229.3 96.0,226.0C96.0,222.7 96.0,219.3 96.0,216.0C96.0,212.7 98.3,207.7 96.0,206.0C93.7,204.3 86.0,204.7 82.0,206.0Z"],
hams:["M68.0,230.0C64.2,232.0 61.8,237.7 60.0,242.0C58.2,246.3 57.3,251.3 57.0,256.0C56.7,260.7 56.8,265.3 58.0,270.0C59.2,274.7 61.7,279.3 64.0,284.0C66.3,288.7 69.3,293.7 72.0,298.0C74.7,302.3 77.5,308.0 80.0,310.0C82.5,312.0 86.5,312.0 87.0,310.0C87.5,308.0 84.5,302.3 83.0,298.0C81.5,293.7 79.5,288.7 78.0,284.0C76.5,279.3 74.8,274.7 74.0,270.0C73.2,265.3 72.5,260.7 73.0,256.0C73.5,251.3 75.3,246.3 77.0,242.0C78.7,237.7 84.5,232.0 83.0,230.0C81.5,228.0 71.8,228.0 68.0,230.0Z","M85.0,230.0C82.3,232.3 81.2,239.3 80.0,244.0C78.8,248.7 78.3,253.3 78.0,258.0C77.7,262.7 77.3,267.3 78.0,272.0C78.7,276.7 80.5,281.3 82.0,286.0C83.5,290.7 85.7,297.7 87.0,300.0C88.3,302.3 89.3,302.3 90.0,300.0C90.7,297.7 90.7,290.7 91.0,286.0C91.3,281.3 91.7,276.7 92.0,272.0C92.3,267.3 92.7,262.7 93.0,258.0C93.3,253.3 93.5,248.7 94.0,244.0C94.5,239.3 97.5,232.3 96.0,230.0C94.5,227.7 87.7,227.7 85.0,230.0Z"],
calves:["M73.0,324.0C70.2,325.7 68.5,330.3 67.0,334.0C65.5,337.7 64.3,342.0 64.0,346.0C63.7,350.0 63.8,354.0 65.0,358.0C66.2,362.0 68.5,366.0 71.0,370.0C73.5,374.0 77.2,380.0 80.0,382.0C82.8,384.0 87.5,384.0 88.0,382.0C88.5,380.0 84.5,374.0 83.0,370.0C81.5,366.0 79.8,362.0 79.0,358.0C78.2,354.0 77.8,350.0 78.0,346.0C78.2,342.0 79.0,337.7 80.0,334.0C81.0,330.3 85.2,325.7 84.0,324.0C82.8,322.3 75.8,322.3 73.0,324.0Z","M86.0,324.0C83.8,325.7 83.0,330.3 82.0,334.0C81.0,337.7 80.2,342.0 80.0,346.0C79.8,350.0 80.2,354.0 81.0,358.0C81.8,362.0 83.5,366.0 85.0,370.0C86.5,374.0 88.7,380.0 90.0,382.0C91.3,384.0 92.5,384.0 93.0,382.0C93.5,380.0 93.0,374.0 93.0,370.0C93.0,366.0 93.0,362.0 93.0,358.0C93.0,354.0 92.8,350.0 93.0,346.0C93.2,342.0 93.7,337.7 94.0,334.0C94.3,330.3 96.3,325.7 95.0,324.0C93.7,322.3 88.2,322.3 86.0,324.0Z","M82.0,386.0C80.8,387.3 84.0,391.7 85.0,394.0C86.0,396.3 86.5,399.0 88.0,400.0C89.5,401.0 93.2,401.0 94.0,400.0C94.8,399.0 93.3,396.3 93.0,394.0C92.7,391.7 93.8,387.3 92.0,386.0C90.2,384.7 83.2,384.7 82.0,386.0Z"]};
function heatFill(v,m){const L=LAND[m]||[6,10,20];
  if(!v||v<=0)return['none',0];
  if(v<L[0])return['var(--acc)',.25];
  if(v<L[1])return['var(--acc)',.5];
  if(v<=L[2])return['var(--acc)',.92];
  return['var(--warn)',.92];}
function figure(parts,v,label){
  let o='<svg viewBox="0 0 200 430" width="100%" role="img" aria-label="'+label+' view muscle heat map">';
  /* body first, as a filled dark form, so muscle colour reads ON the figure */
  for(let g=0;g<2;g++){
    o+='<g'+(g?' transform="scale(-1,1) translate(-200,0)"':'')
      +' fill="var(--s2)" stroke="var(--tx3)" stroke-width="1.1" stroke-linejoin="round" opacity=".9">'
      +SILH+'</g>';}
  for(let g=0;g<2;g++){
    o+='<g'+(g?' transform="scale(-1,1) translate(-200,0)"':'')+'>';
    for(const m in parts){const f=heatFill(v[m],m);
      parts[m].forEach(d=>{o+='<path d="'+d+'" fill="'+f[0]+'" fill-opacity="'+f[1]
        +'" stroke="var(--tx3)" stroke-width=".85" stroke-opacity=".8"><title>'
        +MUSN[m]+' \u2014 '+(v[m]||0)+' sets</title></path>'});}
    o+='</g>';}
  return o+'<text x="100" y="426" text-anchor="middle" font-size="11" fill="var(--tx3)">'+label+'</text></svg>';
}
function figFront(v){return figure(AF,v,'Front')}
function figBack(v){return figure(AB,v,'Back')}
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
function dayKcal(k){const l=D.logs[k];return l&&l.done?(+l.kcal||0):0}
function kcalOver(days){let t=0;const cut=todayISO(new Date(Date.now()-(days-1)*864e5));
  for(const k in D.logs){if(k>=cut)t+=dayKcal(k)}return t}
function avgEffort(days){const cut=todayISO(new Date(Date.now()-(days-1)*864e5));
  const es=[];for(const k in D.logs){const l=D.logs[k];
    if(k>=cut&&l.done&&l.effort)es.push(+l.effort)}
  return es.length?(es.reduce((a,b)=>a+b,0)/es.length):0}

/* ================= STREAKS ================= */
function jDone(k){const j=D.journal[k];if(!j)return 0;return JOURNAL.filter(x=>j[x.k]).length}
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
  const log=D.logs[k],dn=log&&log.done;
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

  const jd=jDone(k),st=streak();
  h+=`<div class="grid3" style="margin-bottom:10px">
    <div class="stat acc"><div class="tiny">Streak</div><div class="big">${st}</div></div>
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
  D.logs[k]=D.logs[k]||{sid:todaySid()||slot,pid:p.id,week:w,ex:[],done:false,start:Date.now()};
  const log=D.logs[k];
  const EXS=s.ex.concat(log.extra||[]);   // programme exercises + anything added today
  EXS.forEach(ex=>{if(!log.ex.find(x=>x.n===ex.n)){
    log.ex.push({n:ex.n,sets:Array.from({length:setsFor(ex,b.mod)},()=>({w:'',r:'',done:false}))})}});

  h+=`<div class="card acc">
    <div class="row sp"><span class="pill a">${esc(s.w==='gym'?'Gym':s.w==='home'?'Home':s.w==='out'?'Outdoors':'Either')}</span>
    <span class="pill">${esc(b.type)} · wk ${w}/${p.weeks}</span></div>
    <div class="mid" style="margin:9px 0 4px">${esc(s.n)}</div>
    <div class="note">${esc(b.note)}</div></div>`;

  EXS.forEach((ex,i)=>{
    const L=log.ex.find(x=>x.n===ex.n),T=target(ex,b.mod),info=EX[ex.n]||{m:[],c:''};
    const dn=L.sets.every(x=>x.done);
    if(isCardio(ex)){
      const C=CARDIO[ex.k]; L.c=L.c||{};
      h+=`<div class="ex ${L.c.done?'done':''}">
        <div class="exh"><div style="flex:1"><div class="exn">${esc(ex.n)}</div>
          <div class="exm">${esc(C.n)}${ex.r?' \u00b7 '+esc(ex.r):''}</div></div>
          <span class="pill b">${esc(C.n.split(' ')[0])}</span></div>
        <div class="exb">
          <div class="grid3">${C.f.map(f=>`<div><div class="tiny">${f[1]}${f[2]?' '+f[2]:''}</div>
            <input type="text" inputmode="${fKind(f[0])==='int'?'numeric':'decimal'}"
              placeholder="${fKind(f[0])==='time'?'45:30':fKind(f[0])==='dec'?'5.4':'\u2014'}"
              value="${esc(L.c[f[0]]||'')}"
              onchange="cardioSet(${i},'${f[0]}',this.value)"></div>`).join('')}</div>
          ${C.f.some(f=>f[0]==='min')?`<div class="jm" style="margin-top:5px">Time takes 45:30 or 45.5 \u2014 either works.</div>`:''}
          ${C.pace&&fVal('km',L.c.km)&&fVal('min',L.c.min)?`<div class="tgt" style="margin-top:9px">Pace ${pace(fVal('km',L.c.km),fVal('min',L.c.min))}${(fVal('km',L.c.km)>=4.8&&fVal('km',L.c.km)<=5.4)?' \u00b7 this counts as a 5k \u2014 log it under Benchmarks if it is a PB':''}</div>`:''}
          <div class="grid3" style="margin-top:9px">
            <div><div class="tiny">Calories</div><input type="text" inputmode="numeric"
              placeholder="${estKcal(ex.k,fVal('min',L.c.min))||'\u2014'}" value="${esc(L.c.kcal||'')}"
              onchange="cardioSet(${i},'kcal',this.value)"></div>
            <div><div class="tiny">Avg HR</div><input type="text" inputmode="numeric"
              placeholder="bpm" value="${esc(L.c.hr||'')}" onchange="cardioSet(${i},'hr',this.value)"></div>
            <div><div class="tiny">Effort 1\u201310</div><input type="text" inputmode="numeric"
              value="${esc(L.c.effort||'')}" onchange="cardioSet(${i},'effort',this.value)"></div></div>
          <button class="btn ${L.c.done?'':'p'}" style="margin-top:10px" onclick="cardioDone(${i})">${L.c.done?'Logged \u2713':'Log it'}</button>
        </div></div>`;
      return;
    }
    const skipped=L.skip;
    h+=`<div class="ex ${dn?'done':''} ${skipped?'skip':''}">
      <div class="exh">
        <div style="flex:1" onclick="tgl(${i})"><div class="exn">${esc(ex.n)}${ex.fst?' <span class="pill a" style="vertical-align:2px">FST-7</span>':''}${skipped?' <span class="pill" style="vertical-align:2px">Skipped</span>':''}</div>
        <div class="exm">${setsFor(ex,b.mod)} × ${esc(ex.r)}${ex.t?' · '+esc(ex.t):''} · rest ${ex.rest?ex.rest+'s':'none'}</div></div>
        <div class="row" style="gap:8px">
          <div class="pill ${dn?'g':''}" onclick="tgl(${i})">${L.sets.filter(x=>x.done).length}/${L.sets.length}</div>
          <button class="kebab" onclick="open_('exopt','${i}')" aria-label="More options for ${esc(ex.n)}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>
        </div></div>
      <div class="exb" id="exb${i}" style="display:${dn||skipped?'none':'block'}">
        <div class="tgt">${esc(T.txt)}</div>
        <div class="st" style="color:var(--tx3);font-size:11px"><span></span><span class="u">KG</span><span class="u">REPS</span><span class="u">REST</span><span class="u"></span><span class="u"></span></div>`;
    L.sets.forEach((st,j)=>{
      h+=`<div class="st"><span>${j+1}</span>
        <input type="text" inputmode="decimal" placeholder="—" value="${esc(st.w)}" onchange="setV(${i},${j},'w',this.value)"
          class="${isBW(st.w)?'bw':''}" title="${isBW(st.w)?'Bodyweight':''}">
        <input type="text" inputmode="numeric" placeholder="—" value="${esc(st.r)}" onchange="setV(${i},${j},'r',this.value)">
        <span class="rsc" title="Rest actually taken">${st.rs!==undefined?esc(restTxt(st.rs)):''}</span>
        <button class="tick ${st.done?'on':''}" onclick="setDone(${i},${j},${ex.rest||0})">${CHK}</button>
        <button class="tick" onclick="delSet(${i},${j})" aria-label="Remove set" style="font-size:18px;line-height:1">−</button></div>`});
    h+=`<div class="jm" style="margin-top:6px">Enter <b>1</b> as the load for bodyweight — it logs as BW and progresses on reps.</div>
      <div class="row" style="gap:7px;margin-top:8px;flex-wrap:wrap">
        <button class="btn sm gh" onclick="addSet(${i})">+ Set</button>
        <button class="btn sm gh" onclick="open_('ex','${encodeURIComponent(ex.n)}')">Cues</button>
        ${ex.t?`<button class="btn sm gh" onclick="open_('tech','${encodeURIComponent(ex.t)}')">${esc(ex.t)}</button>`:''}
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
function tgl(i){const e=document.getElementById('exb'+i);e.style.display=e.style.display==='none'?'block':'none'}
function curLog(){return D.logs[todayISO()]}
function setV(i,j,f,v){const l=curLog();l.ex[i].sets[j][f]=v;save()}
function cardioSet(i,f,v){const l=curLog();l.ex[i].c=l.ex[i].c||{};l.ex[i].c[f]=v;save()}
function cardioDone(i){const l=curLog(),c=l.ex[i].c=l.ex[i].c||{};
  c.done=!c.done;
  if(c.done&&!c.kcal){const ex=(sessFor().ex.concat(l.extra||[]))[i];c.kcal=estKcal(ex.k,fVal('min',c.min))}
  save();rTrain()}
function setDone(i,j,rest){const l=curLog(),st=l.ex[i].sets[j];st.done=!st.done;
  if(st.done&&rest)tStart(rest,i,j);save();rTrain()}

/* ---- IN-SESSION EXERCISE OPTIONS (the 3-dot menu) ----
   Everything here mutates TODAY'S LOG, never the programme definition. The log
   carries its own `order` and `skip` flags so a reshuffle survives a reload and
   never leaks into next week's session. */
function logOrder(){const l=curLog();
  if(!l.order||l.order.length!==l.ex.length)l.order=l.ex.map((_,i)=>i);
  return l.order}
function exMove(i,d){const l=curLog(),o=logOrder(),j=i+d;
  if(j<0||j>=o.length)return;
  const t=o[i];o[i]=o[j];o[j]=t;
  const e=l.ex[i];l.ex[i]=l.ex[j];l.ex[j]=e;
  save();close_();rTrain()}
function exSkip(i){const l=curLog();l.ex[i].skip=!l.ex[i].skip;
  /* a skipped exercise contributes no sets, so it drops out of volume automatically */
  if(l.ex[i].skip)l.ex[i].sets.forEach(s=>s.done=false);
  save();close_();rTrain()}
function exSwap(i,name){if(!name)return;const l=curLog();
  l.ex[i].n=name;l.ex[i].sets.forEach(s=>{s.w='';s.r='';s.done=false;delete s.rs});
  l.ex[i].sub=1;save();close_();rTrain()}
function exSets(i,n){const l=curLog(),s=l.ex[i].sets;n=Math.max(1,Math.min(12,+n||1));
  while(s.length<n)s.push({w:'',r:'',done:false});
  while(s.length>n)s.pop();
  save();close_();rTrain()}
function exWarm(i){const l=curLog();l.ex[i].warm=!l.ex[i].warm;save();close_();rTrain()}
function exDel(i){const l=curLog();
  if(!confirm('Remove this exercise from today\'s session?'))return;
  l.ex.splice(i,1);delete l.order;save();close_();rTrain()}
function addSet(i){curLog().ex[i].sets.push({w:'',r:'',done:false});save();rTrain()}
function delSet(i,j){const s=curLog().ex[i].sets;if(s.length>1)s.splice(j,1);save();rTrain()}
function logSet(f,v){const l=curLog();if(l){l[f]=v;save()}}
function finish(){
  const l=curLog();l.done=true;l.dur=Math.round((Date.now()-(l.start||Date.now()))/1000);
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
function freeSession(id){const k=todayISO();
  D.logs[k]={sid:id,pid:D.active.id,week:curWeek(),ex:[],done:false,start:Date.now(),free:true};
  save();go('train')}
function clearToday(){const k=todayISO();
  if(D.logs[k]&&D.logs[k].ex.some(e=>e.sets.some(s=>s.done))
     &&!confirm('This session has logged sets. Clear it and pick another?'))return;
  delete D.logs[k];save();go('train')}

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
        <div>${figFront(v)}</div><div>${figBack(v)}</div></div>
      <div class="row" style="gap:12px;flex-wrap:wrap;justify-content:center;padding:8px 4px 10px;border-top:1px solid var(--bd);margin-top:4px">
        ${[['Untrained','var(--s3)',.55],['Maintaining','var(--acc)',.22],['Building','var(--acc)',.45],['In range','var(--acc)',.95],['Over','var(--warn)',.95]]
          .map(l=>`<span class="row" style="gap:5px"><span style="width:11px;height:11px;border-radius:3px;background:${l[1]};opacity:${l[2]}"></span><span style="font-size:11px;color:var(--tx3)">${l[0]}</span></span>`).join('')}
      </div></div>
    <div class="note" style="margin-bottom:10px">Each muscle is shaded against its own landmarks, not one shared number — back and core recover from far more volume than biceps or calves. Tap any number below for the count.</div>
    <div class="hm">`;
  MUS.forEach(m=>{const s=volState(v[m],m);
    h+=`<div class="hmc"><div class="n">${MUSN[m]}</div>
      <div class="row sp"><span class="v mono">${v[m]}</span>
      <span style="font-size:10px;font-weight:700;color:${s[1]}">${s[0]}</span></div></div>`});
  h+=`</div>`;

  h+=`<div class="sec">Output</div><div class="grid3">
    <div class="stat red"><div class="tiny">Kcal 7d</div><div class="big mono">${fmt(kcalOver(7))}</div></div>
    <div class="stat amb"><div class="tiny">Kcal 30d</div><div class="big mono">${fmt(kcalOver(30))}</div></div>
    <div class="stat ice"><div class="tiny">Avg effort</div><div class="big mono">${avgEffort(30)?fmt(avgEffort(30),1):'\u2014'}</div></div></div>`;

  const wk=Object.keys(D.logs).filter(k=>D.logs[k].done).length;
  const dur=Object.values(D.logs).filter(l=>l.done&&l.dur).map(l=>l.dur);
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
    h+=hist.slice(0,40).map(r=>`<div class="tst" onclick="histOpen('${r.d}')">
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">${esc(r.n)}${r.l.retro?' <span class="pill">logged after</span>':''}</div>
        <div class="jm">${esc(r.d)} · ${r.sets} sets${r.vol?' · '+fmt(r.vol)+'kg volume':''}${r.kcal?' · '+r.kcal+' kcal':''}${r.hr?' · '+r.hr+' bpm':''}${r.effort?' · effort '+r.effort:''}</div></div>
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
  return Object.keys(D.logs).filter(k=>D.logs[k]&&D.logs[k].done)
    .sort().reverse().map(k=>{
      const l=D.logs[k],s=sessById(l.sid);
      const sets=(l.ex||[]).reduce((a,e)=>a+(e.sets||[]).filter(x=>x.done).length,0);
      const vol=(l.ex||[]).reduce((a,e)=>a+(e.sets||[]).filter(x=>x.done)
        .reduce((b,x)=>b+(isBW(x.w)?0:pnum(x.w))*(+x.r||0),0),0);
      return{d:k,l:l,n:(s&&s.n)||l.name||'Session',sets:sets,vol:Math.round(vol),
        kcal:+l.kcal||0,hr:+l.hr||0,effort:+l.effort||0};});
}
function histOpen(d){open_('hist',d)}
function histField(d,f,v){const l=D.logs[d];if(!l)return;l[f]=v;save()}
function histSetV(d,i,j,f,v){const l=D.logs[d];if(!l)return;l.ex[i].sets[j][f]=v;save()}
function histDel(d){if(!confirm('Delete this logged session? It comes out of your volume and calorie totals.'))return;
  delete D.logs[d];save();close_();go('prog')}

/* ---- Log a session that has already happened ---- */
let RETRO=null;
function retroNew(){RETRO={d:todayISO(),sid:'',ex:[],kcal:'',hr:'',effort:''};open_('retro')}
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
  if(D.logs[RETRO.d]&&D.logs[RETRO.d].done
     &&!confirm('There is already a logged session on '+RETRO.d+'. Replace it?'))return;
  const l={sid:RETRO.sid||'',pid:D.active.id,week:curWeek(),done:true,retro:true,
    start:new Date(RETRO.d).getTime(),ex:[],kcal:pnum(RETRO.kcal),hr:pnum(RETRO.hr),effort:pnum(RETRO.effort)};
  RETRO.ex.forEach(e=>{
    const n=Math.max(1,+e.s||1),sets=[];
    for(let i=0;i<n;i++)sets.push({w:e.w,r:e.r,done:true});
    l.ex.push({n:e.n,sets:sets});});
  if(!l.kcal){const sets=l.ex.reduce((a,e)=>a+e.sets.length,0);
    l.kcal=Math.round(sets*(D.settings.weight||84)*0.11)}
  D.logs[RETRO.d]=l;
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
/* ---- the in-session 3-dot menu ---- */
exopt:i=>{i=+i;const l=curLog();if(!l||!l.ex[i])return '<div class="mid">Nothing here</div>';
  const e=l.ex[i],n=l.ex.length;
  const opts=Object.keys(EX).map(x=>`<option value="${esc(x)}"${x===e.n?' selected':''}>${esc(x)}</option>`).join('');
  return `<div class="mid">${esc(e.n)}</div>
  <div class="jm" style="margin:5px 0 12px">Changes apply to today's session only — your programme is untouched.</div>
  <div class="sec" style="margin-top:6px">Order</div>
  <button class="mi" onclick="exMove(${i},-1)" ${i===0?'disabled style="opacity:.35"':''}>${IC.up}<span style="flex:1">Move up</span></button>
  <button class="mi" onclick="exMove(${i},1)" ${i===n-1?'disabled style="opacity:.35"':''}>${IC.down}<span style="flex:1">Move down</span></button>
  <div class="sec">This exercise</div>
  <button class="mi" onclick="exSkip(${i})">${IC.skip}<span style="flex:1">${e.skip?'Un-skip':'Skip'} this exercise</span></button>
  <button class="mi" onclick="exWarm(${i})">${IC.flame}<span style="flex:1">${e.warm?'Count as working sets':'Mark as warm-up (not counted)'}</span></button>
  <div class="mi" style="border-bottom:none;padding-bottom:4px">${IC.plus}<span style="flex:1">Working sets</span>
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
  <button class="mi bad" onclick="exDel(${i})">${IC.trash}<span style="flex:1">Remove from today's session</span></button>
  <button class="btn gh" style="margin-top:14px" onclick="close_()">Cancel</button>`},

/* ---- one logged session, editable ---- */
hist:d=>{const l=D.logs[d];if(!l)return '<div class="mid">Nothing logged</div>';
  const s=sessById(l.sid);
  let h=`<div class="mid">${esc((s&&s.n)||'Session')}</div>
  <div class="jm" style="margin:5px 0 13px">${esc(d)}${l.retro?' · logged after the fact':''}</div>
  <div class="grid3">
    <div><div class="tiny">Calories</div><input type="text" inputmode="numeric" value="${esc(l.kcal||'')}" onchange="histField('${d}','kcal',this.value)"></div>
    <div><div class="tiny">Avg HR</div><input type="text" inputmode="numeric" value="${esc(l.hr||'')}" onchange="histField('${d}','hr',this.value)"></div>
    <div><div class="tiny">Effort</div><input type="text" inputmode="numeric" value="${esc(l.effort||'')}" onchange="histField('${d}','effort',this.value)"></div>
  </div>`;
  (l.ex||[]).forEach((e,i)=>{
    h+=`<div class="sec" style="margin:16px 0 7px">${esc(e.n)}${e.skip?' · skipped':''}${e.warm?' · warm-up':''}</div>`;
    (e.sets||[]).forEach((st,j)=>{
      h+=`<div class="st" style="grid-template-columns:22px 1fr 1fr 42px"><span>${j+1}</span>
        <input type="text" inputmode="decimal" value="${esc(st.w)}" onchange="histSetV('${d}',${i},${j},'w',this.value)" class="${isBW(st.w)?'bw':''}">
        <input type="text" inputmode="numeric" value="${esc(st.r)}" onchange="histSetV('${d}',${i},${j},'r',this.value)">
        <span class="rsc">${st.rs!==undefined?esc(restTxt(st.rs)):''}</span></div>`});});
  h+=`<button class="btn" style="margin-top:16px" onclick="close_();go('prog')">Done</button>
    <button class="btn gh" style="margin-top:7px;color:var(--bad)" onclick="histDel('${d}')">Delete this session</button>`;
  return h},

/* ---- log a workout that already happened ---- */
retro:()=>{const R=RETRO;if(!R)return '<div class="mid">Nothing to log</div>';
  const p=curP();
  const sess=Object.keys(p.sessions).map(k=>[k,p.sessions[k].n])
    .concat(D.mine.map(m=>[m.id,m.n]))
    .concat(XTRAORDER.map(k=>[XTRA[k].id,XTRA[k].n]))
    .concat(KBXORDER.map(k=>['kbx_'+k,KBX[k].n+' Complex']));
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

done:()=>{const l=curLog(),sets=l.ex.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0);
  return `<div class="mid">Session logged</div>
    <div class="grid3" style="margin:14px 0">
      <div><div class="tiny">Sets</div><div class="big">${sets}</div></div>
      <div><div class="tiny">Minutes</div><div class="big">${fmt((l.dur||0)/60)}</div></div>
      <div><div class="tiny">Streak</div><div class="big" style="color:var(--acc)">${streak()}</div></div></div>
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
  D.logs[k]={sid:'__rescue',pid:D.active.id,week:curWeek(),ex:[],done:false,start:Date.now(),rescue:true};
  save();close_();go('train')}
function logBench(k){const v=document.getElementById('bv').value.trim();if(!v)return;
  D.bench[k]=D.bench[k]||[];D.bench[k].push({d:todayISO(),v:v});save();close_()}
function logAssess(){const o={d:todayISO()};['hips','ankles','shoulders'].forEach(k=>o[k]=+document.getElementById('a_'+k).value||0);
  D.assess.push(o);save();close_()}
function saveNote(){const l=curLog();if(l){l.note=document.getElementById('sn').value;save()}close_()}
function addExToday(){const l=curLog();if(!l)return;
  const n=document.getElementById('ax').value;
  const e={n:n,s:+document.getElementById('as').value||3,
    r:document.getElementById('ar').value||'10',rest:+document.getElementById('ard').value||90};
  l.extra=l.extra||[]; if(!l.extra.find(x=>x.n===n)&&!l.ex.find(x=>x.n===n))l.extra.push(e);
  save();close_();go('train')}
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
  r.onload=e=>{try{D=deep(DEF,JSON.parse(e.target.result));save();render();alert('Restored.')}catch(x){alert('That file could not be read.')}};
  r.readAsText(f)}
function expObs(){
  const p=curP();let m='---\ntype: log\nsource: JHFP\ntags: [health, fitness, jhfp]\n---\n\n';
  m+='# JHFP training log — '+todayISO()+'\n\n';
  m+='**Programme:** '+p.name+' · week '+curWeek()+' of '+p.weeks+' ('+progPct()+'% complete)  \n';
  m+='**Protocol streak:** '+streak()+' days · **Mobility streak:** '+mobStreak()+' days\n\n';
  const v=volume(7);
  m+='## Weekly volume (sets per muscle, last 7 days)\n\n';
  m+='| Muscle | Sets | State |\n|---|---|---|\n';
  MUS.forEach(x=>{const s=volState(v[x],x);m+='| '+MUSN[x]+' | '+v[x]+' | '+s[0]+' |\n'});
  m+='\n## Sessions\n\n';
  Object.keys(D.logs).sort().reverse().slice(0,40).forEach(k=>{const l=D.logs[k];if(!l.done)return;
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
if(!D.logs[todayISO()])save();
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
