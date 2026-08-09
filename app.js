/* JHFP · app.js — logic, progression engine, rendering */

let VIEW='today', SESS=null, TMR=null, TSEC=0, TSTART=null;

/* ================= DATE / SCHEDULE ================= */
function dIdx(d){d=d||new Date();return (d.getDay()+6)%7}          // Mon=0
function daysBetween(a,b){return Math.floor((new Date(b)-new Date(a))/864e5)}
function curP(){return P[D.active.id]||P.p3}
/* In queue mode the week advances on SESSIONS COMPLETED, not days elapsed —
   miss three days and you are still in week 2, because you have not done
   week 2's work yet. Falls back to the calendar for programmes with no
   schedule, and when queue mode is switched off. */
function curWeek(){
  const p=curP();
  if(!p.weeks)return 1;                        // Adventurer: open-ended
  if(hasSchedule()&&queueOn()&&D.active.qi!==undefined)
    return Math.min(p.weeks,Math.max(1,Math.floor(D.active.qi/schedLen())+1));
  const n=daysBetween(D.active.start,todayISO());
  return Math.min(p.weeks, Math.max(1, Math.floor(n/7)+1));
}
/* ================= QUEUE MODE =================
   Beta 2.0. The programme used to be a CALENDAR: Tuesday meant slot 1, so a
   missed Tuesday meant that muscle group was simply skipped and never came
   back. It is now a QUEUE. The cursor sits on one slot and only moves when
   that slot is actually finished, so a missed Pull day is the next thing you
   are shown — the whole programme slides down rather than losing a session.

   Two fields on D.active:
     qi  queue index, monotonic across the whole programme. Slot is qi % 7,
         week is floor(qi / 7) + 1. It is NOT reset each week.
     qd  the calendar date the cursor currently sits on. queueSync() walks
         qd forward to today, deciding at each step whether to advance qi.

   Rest and sport days slide with everything else: a rest day is consumed by
   the day passing, which is what stops the cursor sitting on it forever.

   A completed day advances qi by the number of DISTINCT programme sessions
   finished that day, so doing two of the week's sessions back to back moves
   the queue two places rather than one. Extras — complexes, striking, custom
   workouts — deliberately do NOT move it; they are additions to the week, not
   part of it.

   D.rest records which past dates the queue treated as rest, because once the
   schedule stops matching the calendar there is no other way for the training
   streak to know a gap was programmed rather than missed. */
function schedLen(){const p=curP();return (p.schedule&&p.schedule.length)||7}
function hasSchedule(){const p=curP();return !!(p&&p.schedule&&p.schedule.length)}
/* Day arithmetic on ISO date STRINGS, done in UTC.

   This must never touch local time. `new Date(k+'T00:00:00')` is local midnight,
   and adding 864e5 to it on a daylight-saving fall-back day — a 25-hour day —
   lands at 23:00 on the SAME date. nextISO(k) then returns k, the catch-up loop
   in queueSync stops advancing, and because qd is persisted the queue freezes
   permanently: one fixed point per year, every DST zone. If the frozen day
   happened to be a training day, the loop instead re-counted it 800 times and
   drove qi to ~1,900, which reads as "block complete" and cannot be undone.

   Johannesburg does not observe DST, which is exactly why this survived
   testing. Anyone Juan shares the app with may not be so lucky. Parsing as
   UTC and stepping whole UTC days has no such discontinuity. */
function ymd(k){const p=String(k).split('-');return Date.UTC(+p[0],+p[1]-1,+p[2])}
function shiftISO(k,n){return new Date(ymd(k)+n*864e5).toISOString().slice(0,10)}
function nextISO(k){return shiftISO(k,1)}
function prevISO(k){return shiftISO(k,-1)}
function queueOn(){return D.settings.queue!==false}

/* How many DISTINCT programme sessions of the active programme were completed
   on a given date. Extras and custom work are not counted. */
function progDoneOn(k){
  const p=curP();if(!p||!p.sessions)return 0;
  const seen={};
  dayLogs(k).forEach(l=>{if(l&&l.done&&l.sid&&p.sessions[l.sid])seen[l.sid]=1});
  return Object.keys(seen).length;
}
/* Bring the cursor up to today. Idempotent — safe to call on every render. */
function queueSync(){
  if(!hasSchedule()||!queueOn())return;
  const p=curP(),len=schedLen(),today=todayISO();
  /* First run on an existing programme: land the cursor exactly where the old
     calendar model had Juan standing, so switching to queue mode does not move
     him a single session. */
  if(D.active.qi===undefined||D.active.qd===undefined){
    const n=daysBetween(D.active.start,today);
    const wk=Math.min(p.weeks,Math.max(1,Math.floor(n/7)+1));
    D.active.qi=(wk-1)*len+dIdx();
    D.active.qd=today;
    D.active.q0=today;             // queue mode started here; before it, calendar
    save();return;
  }
  let guard=0,moved=false;
  while(D.active.qd<today&&guard++<800){
    const slot=p.schedule[D.active.qi%len];
    if(slot==='rest'||slot==='sport'){
      D.rest=D.rest||{};D.rest[D.active.qd]=1;   // remember it was programmed off
      D.active.qi++;
    }
    /* A TRAINING slot is not advanced by "something was done that day" — it is
       advanced by THIS session being done, which queueSkip() decides below.
       Counting sessions instead meant picking C out of order on Tuesday
       consumed Monday's un-trained A: the queue moved one place, A was never
       shown again, and the exact loss this whole mechanism exists to prevent
       happened anyway. Which session, not how many. */
    queueSkip(D.active.qd);
    const nd=nextISO(D.active.qd);
    /* Refuse to loop if the date did not actually move. Belt and braces after
       the DST fixed-point bug — a guard that only counts iterations turns an
       infinite loop into a silently wrong one. */
    if(nd<=D.active.qd)break;
    D.active.qd=nd;
    moved=true;
  }
  queueSkip(today);
  if(moved)save();
}
/* Advance past any slot whose session has already been completed in this
   programme week. This is what lets you train out of order without losing
   anything: do C on Tuesday and the cursor stays on A until A is done, then
   jumps straight over C because C is already in the bag. */
function queueSkip(upto){
  if(!hasSchedule()||!queueOn())return;
  const p=curP(),len=schedLen();
  let guard=0;
  while(guard++<80){
    const qi=D.active.qi||0;
    const sid=p.schedule[qi%len];
    if(sid==='rest'||sid==='sport')break;
    const wk=Math.floor(qi/len)+1;
    /* How many times this session appears in the week UP TO AND INCLUDING the
       cursor. Simple & Sinister runs A,B,A,B,A,B — asking only "has A been done
       this week" collapsed all three A slots the moment the first was finished,
       and a six-week block completed in twelve days. The slot is satisfied only
       once the session has been done that many times. */
    const from=(wk-1)*len;
    let nth=0;
    for(let i=from;i<=qi;i++)if(p.schedule[i%len]===sid)nth++;
    if(countDoneIn(sid,wk,upto)<nth)break;
    D.active.qi=qi+1;
  }
}
/* Was this session completed during the given PROGRAMME week? Logs carry the
   week they were made in, so a session done in week 1 does not satisfy the
   same slot when it comes round again in week 2. */
/* How many times this session was completed during the given PROGRAMME week,
   for THIS programme, on or before the day being processed.

   All three filters are load-bearing:

   · PID — every programme in the app names its sessions A..E. Without matching
     the programme id, finishing one block and starting another meant the new
     block's slots were already "satisfied" by the OLD block's logs: pick Farm
     Strong after finishing KB Warrior, train once, and a month later the app
     congratulates you on completing it and banks a summary of work you never
     did. This was the worst bug in the whole release.
   · WEEK, strictly — a log with no week recorded once satisfied EVERY week, so
     week 2 opened believing week 1's sessions belonged to it. A missing week
     means a pre-Beta-2.0 record and must not count.
   · UPTO — only work done on or before the day being processed, or the
     catch-up loop reads the whole future on its first iteration and the queue
     runs ahead of the calendar.

   Returns a COUNT, not a boolean, because a schedule may run the same session
   more than once in a week (Simple & Sinister is A,B,A,B,A,B). */
function countDoneIn(sid,wk,upto){
  const pid=D.active.id;
  let n=0;
  eachSession((k,l)=>{
    if(!l||!l.done||l.sid!==sid)return;
    if(l.pid!==pid)return;
    if(l.week!==wk)return;
    if(upto&&k>upto)return;
    n++;
  });
  return n;
}

/* Which of this programme-week's sessions have been completed. "This week" is
   the queue's week, not the calendar's — the two stop agreeing the moment a
   day is missed, and the queue's is the one that means anything. */
function weekDone(){
  const p=curP();
  const ids=Object.keys(p.sessions||{});
  if(!ids.length)return {done:0,total:0,map:{}};
  const w=curWeek(),map={};
  eachSession((k,l)=>{if(l&&l.done&&l.sid&&p.sessions[l.sid]&&(l.week||w)===w)map[l.sid]=k});
  return {done:Object.keys(map).length,total:ids.length,map:map};
}
/* How many days the current slot has been waiting. 0 = it is today's. */
function queueOverdue(){
  if(!hasSchedule()||!queueOn())return 0;
  const p=curP(),len=schedLen();
  const slot=p.schedule[(D.active.qi||0)%len];
  if(slot==='rest'||slot==='sport')return 0;
  /* walk back over consecutive missed days */
  let n=0,k=todayISO(),guard=0;
  while(guard++<60){
    const prev=prevISO(k);                       // UTC, so no DST day-skip
    if(prev>=k)break;                            // refuse to walk sideways
    if(prev<D.active.start)break;
    if(D.rest&&D.rest[prev])break;              // a programmed off-day, not a miss
    if(progDoneOn(prev)>0)break;                // trained, so nothing was missed
    n++;k=prev;
    if(n>=14)break;
  }
  return n;
}
function slotFor(day){
  const p=curP();
  if(!p.schedule)return null;                    // Adventurer: no schedule at all
  if(day!==undefined)return p.schedule[day];     // explicit calendar lookup
  if(!queueOn())return p.schedule[dIdx()];
  return p.schedule[(D.active.qi||0)%schedLen()];
}
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
/* ================= GENERATOR STATE =================
   GEN holds the choices, GENSESS the last built session. GENSESS is cleared on
   every change so the sheet always shows a session matching what is selected —
   a stale preview next to changed options is worse than no preview. The seed
   only moves on Regenerate, so flipping "45 min" does not also reshuffle every
   exercise underneath you. */
let GEN={where:'home',pattern:'full',kit:['kb1','rings','bw'],format:'sets',
  mins:30,level:'int',quality:'hyp',include:[],seed:1,name:''};
let GENSESS=null;
function genSet(k,v){
  GEN[k]=(k==='mins')?+v:v;
  if(k!=='name')GENSESS=null;
  open_('gen');
}
function genKit(k){
  const i=GEN.kit.indexOf(k);
  if(i>=0)GEN.kit.splice(i,1);else GEN.kit.push(k);
  GENSESS=null;open_('gen');
}
function genInc(k){
  const i=GEN.include.indexOf(k);
  if(i>=0)GEN.include.splice(i,1);else GEN.include.push(k);
  GENSESS=null;open_('gen');
}
function genAgain(){GEN.seed=(GEN.seed||1)+Math.floor(Math.random()*9999)+1;GENSESS=null;open_('gen')}
/* Save into D.mine so it sits with the hand-built workouts, is editable in the
   normal builder, and survives a reload. The options ride along on the record
   so Regenerate can be run again later from the same brief. */
function genPersist(){
  const s=GENSESS||genBuild(GEN);
  const name=(GEN.name||'').trim()||s.n;
  const w={id:uid(),n:name,w:s.w,mins:s.mins,gen:1,opts:JSON.parse(JSON.stringify(GEN)),
    note:s.note,fin:s.fin,ex:s.ex.map(e=>({n:e.n,s:e.s,r:e.r,rest:e.rest,t:e.t,inx:e.inx}))};
  D.mine.push(w);
  /* BOTH lists, exactly as bSave() does for a hand-built workout. D.mine is
     what More lists; D.custom is what sessById() resolves against. Writing only
     to D.mine gives you a workout that appears in the list, starts once, and
     then shows up in your history as the word "Session" — because nothing can
     look its name up again after a reload. */
  D.custom[w.id]=w;
  if(!save()){D.mine.pop();delete D.custom[w.id];
    alert('This phone is out of storage, so the workout could not be saved.');return null}
  return w;
}
function genSave(){const w=genPersist();if(!w)return;
  GENSESS=null;GEN.name='';close_();alert('Saved to Your workouts.');render()}
function genStart(){const w=genPersist();if(!w)return;
  GENSESS=null;GEN.name='';close_();freeSession(w.id)}

/* ---- PICKER HANDLERS ----
   All three do the same thing: put the chosen session at the front of TODAY,
   without touching D.active. The queue only ever moves when something is
   finished, so choosing a session out of order is free — which is the whole
   reason the picker exists. */
function pickSess(id){
  const k=todayISO(),a=dayLogs(k);D.logs[k]=a;
  /* reuse today's empty, unstarted session rather than stacking a second one */
  const i=a.findIndex(l=>l&&!l.done&&!hasWork(l));
  if(i>=0){a[i].sid=id;a[i].ex=[];a[i].seeded=null;setIdx(i)}
  else{a.push({sid:id,pid:D.active.id,week:curWeek(),ex:[],done:false,start:Date.now()});
    setIdx(a.length-1)}
  save();close_();go('train');
}
function pickFree(id){close_();freeSession(id)}
/* A session out of a programme you are NOT running. Copied into D.custom so
   sessById can find it later — the P object is not persisted, so pointing at
   it directly would break the moment the app reloads. */
function pickOther(pid,sid){
  const op=P[pid];if(!op||!op.sessions[sid])return;
  const src=op.sessions[sid];
  const id='alt_'+pid+'_'+sid;
  D.custom[id]=Object.assign({},src,{id:id,n:src.n+' · '+op.name});
  save();close_();freeSession(id);
}

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
  if(!s||s==='rest'||s==='sport')return null;  // null = Adventurer, no schedule
  return curP().sessions[s];
}
function todaySid(){const l=curLog();if(l&&l.sid&&sessById(l.sid))return l.sid;
  const s=slotFor();return (!s||s==='rest'||s==='sport')?null:s}
function uid(){return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
/* Progress is WORK DONE, not time passed. Under the calendar model a fortnight
   off still marched the bar to 100%, which made it a clock rather than a
   measure of the block. */
function progPct(){
  const p=curP();
  if(!p.weeks)return 0;
  if(hasSchedule()&&queueOn()&&D.active.qi!==undefined)
    return Math.min(100,Math.round(D.active.qi/(p.weeks*schedLen())*100));
  return Math.min(100,Math.round((daysBetween(D.active.start,todayISO())+1)/(p.weeks*7)*100));
}

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
/* ---- VOLUME LANDMARKS ----
   [MV maintenance, MEV where growth starts, HIGH the top of the productive band]

   RAISED 4 Aug 2026, on Juan's call. The app previously used Renaissance
   Periodization / Israetel MRV ceilings and treated exceeding them as a fault.
   Juan rates Dr Nash Jocic's position above Israetel's: the golden-era
   bodybuilders grew on volumes well past what modern "maximum recoverable
   volume" models allow, and Jocic argues the ceiling is set far too low. These
   numbers sit in that territory.

   The bigger change is what the top band MEANS. Passing HIGH is no longer a
   warning — it is the intended zone for a hypertrophy block. What the app
   flags instead is the ABSURD (see CEIL below), which exists purely to catch
   logging and weighting bugs, not to referee a training philosophy. That
   distinction matters: the original 49-weighted-back-sets bug was a counting
   error, not too much training, and losing the ability to spot that class of
   error would be a real loss. Muscles still do not share one ceiling. */
const LAND={chest:[6,12,34],back:[8,14,40],delts:[6,10,34],biceps:[5,10,28],triceps:[5,10,28],
quads:[6,12,32],hams:[4,10,28],glutes:[4,10,28],calves:[6,10,30],core:[6,12,34],
forearms:[5,10,30],traps:[4,8,26]};
/* Not a training opinion — a bug detector. Roughly 1.6x the productive ceiling;
   anything past it is far more likely a miscount than a session anyone did. */
function ceilFor(m){const L=LAND[m]||[6,10,20];return Math.round(L[2]*1.6)}
/* Past HIGH is deliberate overreach, not an error — it reads green, not amber.
   Only the absurd band warns, and it says "check this", because at that point
   the likeliest explanation is a miscount. */
function volState2(v,L){L=L||[6,10,20];
  if(v<L[0])return['Under','var(--bad)'];
  if(v<L[1])return['Building','var(--warn)'];
  if(v<=L[2])return['In range','var(--ok)'];
  if(v<=L[2]*1.6)return['High','var(--ok)'];
  return['Check this','var(--warn)'];}
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
const AB={traps:["M74.0,62.0C69.2,63.2 69.7,66.8 69.0,69.2C68.3,71.6 69.3,74.6 70.0,76.4C70.7,78.2 68.3,79.4 73.0,80.0C77.7,80.6 93.8,80.6 98.0,80.0C102.2,79.4 98.0,78.2 98.0,76.4C98.0,74.6 98.0,71.6 98.0,69.2C98.0,66.8 102.0,63.2 98.0,62.0C94.0,60.8 78.8,60.8 74.0,62.0Z"],delts:["M56.0,64.0C51.7,66.0 47.0,71.7 44.0,76.0C41.0,80.3 39.0,85.3 38.0,90.0C37.0,94.7 37.2,99.7 38.0,104.0C38.8,108.3 39.0,114.0 43.0,116.0C47.0,118.0 58.8,118.0 62.0,116.0C65.2,114.0 62.0,108.3 62.0,104.0C62.0,99.7 61.7,94.7 62.0,90.0C62.3,85.3 62.7,80.3 64.0,76.0C65.3,71.7 71.3,66.0 70.0,64.0C68.7,62.0 60.3,62.0 56.0,64.0Z"],back:["M58.9,82.0C52.3,85.4 57.6,95.1 57.8,102.1C58.0,109.2 58.7,117.0 60.0,124.5C61.4,132.0 63.7,139.4 65.6,146.9C67.5,154.4 69.7,161.8 71.1,169.3C72.6,176.8 70.0,188.0 74.5,191.6C78.9,195.3 93.9,195.3 97.8,191.6C101.7,188.0 97.8,176.8 97.8,169.3C97.8,161.8 97.8,154.4 97.8,146.9C97.8,139.4 97.8,132.0 97.8,124.5C97.8,117.0 97.8,109.2 97.8,102.1C97.8,95.1 104.2,85.4 97.8,82.0C91.3,78.6 65.6,78.6 58.9,82.0Z"],triceps:["M43.0,122.0C40.2,124.7 44.2,132.7 45.0,138.0C45.8,143.3 47.0,148.7 48.0,154.0C49.0,159.3 50.0,165.7 51.0,170.0C52.0,174.3 52.5,178.3 54.0,180.0C55.5,181.7 59.0,181.7 60.0,180.0C61.0,178.3 60.0,174.3 60.0,170.0C60.0,165.7 59.8,159.3 60.0,154.0C60.2,148.7 60.7,143.3 61.0,138.0C61.3,132.7 65.0,124.7 62.0,122.0C59.0,119.3 45.8,119.3 43.0,122.0Z"],forearms:["M53.0,186.0C51.0,188.7 51.2,196.7 51.0,202.0C50.8,207.3 51.2,212.3 52.0,218.0C52.8,223.7 54.5,230.3 56.0,236.0C57.5,241.7 59.5,249.3 61.0,252.0C62.5,254.7 64.7,254.7 65.0,252.0C65.3,249.3 63.2,241.7 63.0,236.0C62.8,230.3 63.8,223.7 64.0,218.0C64.2,212.3 64.2,207.3 64.0,202.0C63.8,196.7 64.8,188.7 63.0,186.0C61.2,183.3 55.0,183.3 53.0,186.0Z"],glutes:["M70.0,200.0C64.8,202.0 67.5,208.0 67.0,212.0C66.5,216.0 66.5,220.3 67.0,224.0C67.5,227.7 65.2,232.3 70.0,234.0C74.8,235.7 91.5,235.7 96.0,234.0C100.5,232.3 96.7,227.7 97.0,224.0C97.3,220.3 97.8,216.0 98.0,212.0C98.2,208.0 102.7,202.0 98.0,200.0C93.3,198.0 75.2,198.0 70.0,200.0Z"],hams:["M69.0,240.0C64.5,243.3 68.7,253.3 69.0,260.0C69.3,266.7 70.0,273.3 71.0,280.0C72.0,286.7 73.5,294.3 75.0,300.0C76.5,305.7 77.0,311.7 80.0,314.0C83.0,316.3 90.7,316.3 93.0,314.0C95.3,311.7 93.7,305.7 94.0,300.0C94.3,294.3 94.8,286.7 95.0,280.0C95.2,273.3 94.8,266.7 95.0,260.0C95.2,253.3 100.3,243.3 96.0,240.0C91.7,236.7 73.5,236.7 69.0,240.0Z"],calves:["M78.0,342.0C75.0,344.7 76.2,352.7 76.0,358.0C75.8,363.3 76.2,369.0 77.0,374.0C77.8,379.0 79.7,384.0 81.0,388.0C82.3,392.0 82.8,396.3 85.0,398.0C87.2,399.7 92.5,399.7 94.0,398.0C95.5,396.3 94.0,392.0 94.0,388.0C94.0,384.0 94.0,379.0 94.0,374.0C94.0,369.0 94.0,363.3 94.0,358.0C94.0,352.7 96.7,344.7 94.0,342.0C91.3,339.3 81.0,339.3 78.0,342.0Z"]};
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
  if(v<=L[2]*1.6)return 4;    // high volume — intended, not a fault
  return 5;                    // absurd — almost certainly a miscount
}
/* Level 4 is the high-volume band — full ember, not amber. Amber is reserved
   for the absurd band, which means "your log is probably wrong". */
const SHADE=[['var(--mus0)',1],['var(--acc)',.38],['var(--acc)',.68],
             ['var(--acc)',.96],['var(--acc2)',1],['var(--warn)',.96]];
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
/* Was this day a PROGRAMMED off-day? The streak leans on this to bridge rest
   days rather than break on them.

   Under queue mode the schedule no longer lines up with the calendar, so a
   past date's status cannot be recomputed — queueSync records it in D.rest as
   each day is consumed. Dates before queue mode began (D.active.q0) still use
   the old weekday rule, so historic streaks do not suddenly change. */
function isRestDay(d){
  const p=curP();
  /* Adventurer prescribes nothing, so nothing is a PROGRAMMED rest day. This
     returned true at first, which made trainStreak bridge every gap and report
     a lifetime total — three workouts three months apart read as a streak of
     three. A training streak has to be able to break. */
  if(!p||!p.schedule)return false;
  const k=todayISO(d);
  if(queueOn()){
    if(D.rest&&D.rest[k])return true;
    if(k===todayISO()){const s=slotFor();return s==='rest'||s==='sport'}
    const q0=D.active.q0;
    if(q0&&k>=q0)return false;         // inside queue era and not recorded → trained or missed
  }
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
/* ================= COLLAPSIBLE SECTIONS =================
   One helper for every section heading in the app.

   sect(key, title, opts, bodyFn)
     key     stable id, used to remember open/closed in D.ui.sec
     title   heading text
     opts    {tone:'acc'|'ice'  which colour this heading takes
              meta:'12 lifts'   right-aligned summary, visible while CLOSED
              open:true         PINNED — always open, no chevron, no toggle
              start:true        default to open the first time it is seen
              empty:'...'}      line shown instead of the body when there is none
     bodyFn  a FUNCTION returning the body HTML

   bodyFn is a function, not a string, on purpose: a closed section must not
   pay to build markup nobody is going to see. The Exercise Library alone is
   ~135 entries, and the whole point of this release is that these pages got
   too heavy. Never pass an already-built string. */
function secIsOpen(k,dflt){
  const s=(D.ui&&D.ui.sec)||{};
  return (k in s)?!!s[k]:!!dflt;
}
function secTgl(k){
  D.ui=D.ui||{};D.ui.sec=D.ui.sec||{};
  D.ui.sec[k]=!secIsOpen(k,false);
  save();render();
}
function sect(k,title,opts,bodyFn){
  opts=opts||{};
  const pinned=!!opts.open;
  const on=pinned||secIsOpen(k,opts.start);
  const tone=opts.tone==='ice'?'ice':'acc';
  let h=`<div class="secw ${tone}${on?' on':''}">`;
  if(pinned){
    h+=`<div class="sech"><span class="secn">${esc(title)}</span>`
      +`${opts.meta?`<span class="secm">${esc(opts.meta)}</span>`:''}</div>`;
  }else{
    h+=`<button class="sech" onclick="secTgl('${escId(k)}')" aria-expanded="${on}">`
      +`<span class="secn">${esc(title)}</span>`
      +`${opts.meta?`<span class="secm">${esc(opts.meta)}</span>`:''}`
      +`<span class="secx">›</span></button>`;
  }
  if(on){
    const body=bodyFn?bodyFn():'';
    h+=body&&String(body).trim()
      ? `<div class="secb">${body}</div>`
      : `<div class="sece">${esc(opts.empty||'Nothing here yet.')}</div>`;
  }
  return h+`</div>`;
}

function render(){
  /* Bring the programme queue up to today before anything reads a slot. Cheap
     and idempotent: it exits immediately unless the date has actually moved. */
  queueSync();
  const p=curP(),w=curWeek(),b=blockFor(p,w);
  const H={today:['Today',new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})],
    train:[p.name,p.weeks?('Week '+w+' of '+p.weeks+' · '+b.type):'No programme · pick your own'],
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
  const od=queueOverdue();          // days this session has been waiting
  let h='';

  if(!p.schedule){
    /* ADVENTURER — no schedule, so Today asks rather than tells. */
    const done=dayL.filter(l=>l&&l.done).length;
    h+=`<div class="card acc">
      <div class="row sp"><span class="pill a">Adventurer</span>
        <span class="pill">${done?done+' logged today':'nothing logged yet'}</span></div>
      <div class="mid" style="margin:9px 0 3px">${done?'Train something else?':'What are you training today?'}</div>
      <div class="note" style="margin-top:6px">No programme, no week to fall behind on. Everything still counts — volume, calories, PBs and the chart all fill in exactly as they would on a block.</div>
      <button class="btn p" style="margin-top:12px" onclick="open_('pick')">Choose a workout</button>
      <button class="btn gh" style="margin-top:7px" onclick="open_('gen')">Build me one</button>
      <button class="btn gh" style="margin-top:7px" onclick="go('more')">Pick a programme instead</button>
    </div>`;
  }else if(slot==='rest'){
    h+=`<div class="card"><div class="lbl">Rest day</div>
    <div class="note">Nothing to train. Do the mobility block, hit the protocol, sleep seven hours. This is where the adaptation actually happens.</div>
    <button class="btn gh" style="margin-top:11px" onclick="open_('pick')">Train something anyway</button></div>`;
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
      ${od?`<div class="warnbox" style="margin-top:10px">Carried over from ${od} day${od===1?'':'s'} ago. Nothing was skipped — the whole programme moved up with you, so this is still the next session you owe.</div>`:''}
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

  /* The quote moves ABOVE the protocol and BELOW the three stat cards, on
     Juan's instruction — it used to sit at the very bottom of Today. */
  h+=`<div class="card acc"><div class="quote">${esc(quoteFor())}</div></div>`;

  /* Daily protocol is now a collapsible heading. The count lives in the meta,
     so the day's progress is readable WITHOUT opening it — a checklist you
     have to expand to see the state of would be a worse checklist. */
  h+=sect('protocol','Daily protocol',{tone:'ice',meta:jd+' of '+JOURNAL.length+' done'},()=>{
    let b=`<div class="card ice" style="margin-bottom:0"><div class="row sp" style="margin-bottom:4px">
      <div class="lbl" style="margin:0">Tick them off</div>
      <button class="btn sm gh" onclick="jAll()">All</button></div>`;
    JOURNAL.forEach(j=>{const on=D.journal[k]&&D.journal[k][j.k];
      b+=`<div class="jr" onclick="jTick('${escId(j.k)}')"><div class="jb ${on?'on':''}">${CHK}</div>
        <div style="flex:1"><div class="jt">${esc(j.t)}</div>${j.m?`<div class="jm">${esc(j.m)}</div>`:''}</div></div>`});
    return b+`</div>`;});

  h+=`<div class="card"><div class="lbl">Supplements</div><div class="row" style="gap:7px;flex-wrap:wrap">`;
  SUPPS.forEach(sp=>{const on=D.journal[k]&&D.journal[k][sp.k];
    h+=`<button class="pill ${on?'a':''}" style="padding:7px 13px;font-size:13px" onclick="jTick('${sp.k}')">${esc(sp.t)}</button>`});
  h+=`</div><div class="jm" style="margin-top:8px">Electrolytes, creatine and glutamine only. Carnivore covers the rest.</div></div>`;

  const md=D.mobility[k],weak=mobWeak(),today15=mobDaily(k);
  const zones=today15.map(x=>mobZoneName(x.z)).filter((v,i,a)=>a.indexOf(v)===i);
  h+=`<div class="card grn"><div class="row sp"><div class="lbl" style="margin:0">Tonight's mobility · the daily 15</div>
    <span class="pill ${md?'g':''}">${md?'Done':mobStreak()+' day streak'}</span></div>
    <div class="note" style="margin:8px 0 10px">15 minutes, full body, different every day. Today: ${esc(zones.join(' · '))}. Your weakest zones come round twice as often as the rest.</div>
    <button class="btn" onclick="open_('daily15')">Open tonight's routine</button>
    <button class="btn gh" style="margin-top:7px" onclick="open_('mobzones')">Focus one zone instead</button></div>`;

  h+=`<div style="height:16px"></div>`;
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
    const none=!p.schedule;                    // Adventurer, versus a rest/sport day
    h=`<div class="card"><div class="mid">${none?'Adventurer':(slot==='sport'?'Sport day':'Rest day')}</div>
      <div class="note" style="margin-top:7px">${none
        ?'No programme running. Choose anything below — it all counts toward your volume, calories and PBs.'
        :(slot==='sport'?esc(p.sportNote||'Golf or hike. Go and play.'):'No session scheduled. Mobility and sleep are the work today.')}</div>
      <button class="btn p" style="margin-top:11px" onclick="open_('pick')">Choose a workout</button>
      <button class="btn gh" style="margin-top:7px" onclick="open_('gen')">Build me one</button></div>`;
    document.getElementById('v-train').innerHTML=h;return;
  }

  /* ---- THE WEEK PICKER ----
     Juan's own fix for a missed day: rather than trusting the queue to surface
     the right thing, be able to say "today I am doing Pull". Sits at the very
     top of Train, shows every session in the programme with the one the queue
     has surfaced marked, and ticks off the ones already done this week so it
     doubles as a view of where the week actually stands. */
  if(p.schedule&&Object.keys(p.sessions).length){
    const wk=weekDone();
    h+=`<button class="pickbar" onclick="open_('pick')">
      <div style="flex:1;min-width:0">
        <div class="tiny">This week · ${wk.done} of ${wk.total} done</div>
        <div style="font-weight:700;font-size:14px;margin-top:1px">${esc(s.n)}</div>
      </div>
      <span class="pill a">Change</span></button>`;
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
  save();
  /* Was that the last session of the last week? If so the block is over — say
     so straight away, on the finish screen, rather than letting the programme
     quietly loop its final week forever. */
  if(blockJustFinished()){completeBlock();return}
  open_('done')}

/* ================= FINISHING A BLOCK =================
   Until Beta 2.0 nothing ever ended a programme: the queue simply looped week
   10 indefinitely and the progress bar sat at 100% forever. Now the final
   session of the final week closes the block, banks a summary of what it
   actually produced, and drops onto Adventurer so there is no programme running
   until Juan chooses the next one. Nothing auto-selects a new block — picking
   the next one is a decision, not a default. */
function blockJustFinished(){
  const p=curP();
  if(!p||!p.weeks||!hasSchedule())return false;      // Adventurer never "ends"
  if(D.active.done)return false;                     // already closed
  /* With queue mode off the cursor never moves, so nothing here would ever
     fire. Fall back to the calendar measure in that case. There is no UI toggle
     for this today, which is precisely why it needed a guard before someone
     adds one. */
  if(!queueOn())return progPct()>=100;
  queueSkip(todayISO());
  const len=schedLen(),end=p.weeks*len;
  const qi=D.active.qi||0;
  if(qi>=end)return true;
  /* A block ends on its last WORKOUT, not on its last calendar slot. Most
     schedules finish on sport and rest days, so waiting for the cursor to walk
     past those would show the summary two days after the session that earned
     it — and Juan asked for the card the moment he hits finish. Scan forward:
     if nothing left in the block is a training slot, the work is done. */
  for(let i=qi;i<end;i++){
    const s=p.schedule[i%len];
    if(s!=='rest'&&s!=='sport')return false;
  }
  return true;
}
function completeBlock(){
  const p=curP();
  const sum=blockSummary();
  D.completed=D.completed||[];
  D.completed.push(sum);
  D.active.done=true;
  /* Land on Adventurer. Deliberately NOT the next programme in the list —
     choosing what comes next is the whole point of finishing. */
  D.active={id:'p11',start:todayISO(),week:1,prev:p.id};
  save();
  open_('blockdone',D.completed.length-1);
}
/* Everything the block produced, computed once at the moment it closes so the
   numbers can never drift as later training is logged on top of them. */
function blockSummary(){
  const p=curP(),end=todayISO();
  /* A record restored by hand can be missing `start`. Without a fallback the
     window check `k<start` is always false, so EVERY session ever logged gets
     counted and `days` comes out NaN on the card. */
  const start=D.active.start||end;
  let sessions=0,sets=0,reps=0,vol=0,kcal=0,mins=0,effN=0,effSum=0;
  const byMuscle={},names={};
  eachSession((k,l)=>{
    if(!l||!l.done||k<start)return;
    /* Only THIS programme's work. A session logged from another block during
       the window is real training but it is not what this block produced, and
       the card is headed with the programme's name. */
    if(l.pid&&l.pid!==p.id)return;
    sessions++;
    kcal+=+l.kcal||0;
    mins+=+l.mins||(l.dur?l.dur/60:0);
    if(l.effort){effSum+=+l.effort;effN++}
    (l.ex||[]).forEach(e=>{
      const done=(e.sets||[]).filter(s=>s.done);
      if(!done.length)return;
      names[e.n]=1;
      sets+=done.length;
      done.forEach(s=>{
        const r=+s.r||0;reps+=r;
        if(+s.w>1)vol+=(+s.w)*r;                     // 1kg is the bodyweight code
      });
      ((EX[e.n]||{}).m||[]).forEach((m,i)=>{
        byMuscle[m]=(byMuscle[m]||0)+done.length*(i===0?1:i===1?.5:.25)});
    });
  });
  /* PBs and benchmarks set inside the block window */
  const pbs=Object.keys(D.pbs||{}).filter(n=>D.pbs[n].d>=start)
    .map(n=>({n:n,w:D.pbs[n].w,r:D.pbs[n].r,d:D.pbs[n].d}));
  const bench=[];
  Object.keys(D.bench||{}).forEach(k=>{
    (D.bench[k]||[]).forEach(x=>{if(x.d>=start){
      const b=BENCH.find(y=>y.k===k);
      bench.push({k:k,n:(b&&b.n)||k,v:x.v,d:x.d})}})});
  let mob=0;Object.keys(D.mobility||{}).forEach(k=>{if(k>=start)mob++});
  const top=Object.keys(byMuscle).filter(m=>MUSN[m])
    .sort((a,b)=>byMuscle[b]-byMuscle[a]).slice(0,4)
    .map(m=>({m:m,n:MUSN[m],v:Math.round(byMuscle[m])}));
  return {id:p.id,name:p.name,weeks:p.weeks,start:start,end:end,
    days:Math.max(1,daysBetween(start,end)+1),
    sessions:sessions,sets:sets,reps:reps,vol:Math.round(vol),
    kcal:Math.round(kcal),mins:Math.round(mins),
    effort:effN?Math.round(effSum/effN*10)/10:0,
    movements:Object.keys(names).length,
    mobility:mob,pbs:pbs,bench:bench,top:top};
}
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
  let h=sect('prog','Programme',{tone:'acc',open:true,
    meta:p.weeks?('Week '+w+' of '+p.weeks):'Open-ended'},()=>
    `<div class="card acc"><div class="row sp"><div class="lbl" style="margin:0">${esc(p.name)}</div>
      <span class="pill a">${p.weeks?progPct()+'%':'Open'}</span></div>
      ${p.weeks?`<div class="bar" style="margin:10px 0 9px"><i style="width:${progPct()}%"></i></div>
      <div class="dots">${Array.from({length:p.weeks},(_,i)=>`<div class="dot ${i<w?'on':''}"></div>`).join('')}</div>`:''}
      <div class="note" style="margin-top:10px">${esc(blockFor(p,w).note)}</div></div>`);

  /* Programme and Volume stay PINNED open — they are the two things Juan opens
     Progress to see, and putting them behind a tap would be a worse page. */
  h+=sect('vol','Volume · sets per muscle',{tone:'ice',open:true},()=>{
  let h=`<div class="tabs">
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
        ${[['Untrained','var(--mus0)',1],['Maintaining','var(--acc)',.38],['Building','var(--acc)',.68],['In range','var(--acc)',.96],['High','var(--acc2)',1],['Check','var(--warn)',.96]]
          .map(l=>`<span class="row" style="gap:5px"><span style="width:11px;height:11px;border-radius:3px;background:${l[1]};opacity:${l[2]}"></span><span style="font-size:11px;color:var(--tx3)">${l[0]}</span></span>`).join('')}
      </div></div>
    <div class="note" style="margin-bottom:10px">Each muscle is shaded against its own landmarks, not one shared number — back and core recover from far more volume than biceps or calves. The bands follow Jocic rather than RP: <b>High</b> is the intended zone for a growth block, not a warning. Only <b>Check this</b> is a flag, and it means the count is probably wrong rather than the training.</div>
    <div class="hm">`;
  MUS.forEach(m=>{const st=volState(v[m],m);
    h+=`<div class="hmc" onclick="pickMus('${m}')" style="cursor:pointer${APICK===m?';border-color:var(--acc)':''}">
      <div class="n">${MUSN[m]}</div>
      <div class="row sp"><span class="v mono">${v[m]}</span>
      <span style="font-size:10px;font-weight:700;color:${st[1]}">${st[0]}</span></div></div>`});
  h+=`</div>`;
  return h;});

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

  const pbNames=Object.keys(SEEDPB).concat(Object.keys(D.pbs)).filter((x,i,a)=>a.indexOf(x)===i);
  const pbBeat=pbNames.filter(n=>D.pbs[n]&&SEEDPB[n]&&D.pbs[n].w>SEEDPB[n]).length;
  h+=sect('pbs','Lift PBs',
    {tone:'acc',meta:pbNames.length+' lifts'+(pbBeat?' · '+pbBeat+' beaten':'')},()=>{
    let b=`<div class="card">`;
    pbNames.forEach(n=>{const mine=D.pbs[n],seed=SEEDPB[n];
      const cur=mine?mine.w:seed, beat=mine&&seed&&mine.w>seed;
      b+=`<div class="fi"><span>${esc(n)}</span><span class="row" style="gap:8px">
        ${beat?'<span class="pill g">PB</span>':''}
        <span class="mono">${fmt(cur,cur%1?1:0)} kg${mine&&mine.r?' × '+mine.r:''}</span></span></div>`});
    return b+`</div><div class="note" style="margin-top:8px">Seeded from your Gym Pad note. Anything you log heavier overwrites it. These update themselves from your logged sets — there is nothing to maintain by hand.</div>`;});

  const benchDone=BENCH.filter(b=>(D.bench[b.k]||[]).length).length;
  h+=sect('bench','Benchmarks',
    {tone:'ice',meta:benchDone+' of '+BENCH.length+' tested'},()=>{
    let b='';
    BENCH.forEach(x=>{const mine=(D.bench[x.k]||[]).slice(-1)[0];
      b+=`<div class="tst"><div style="flex:1"><div style="font-weight:600;font-size:14px">${esc(x.n)}</div>
        <div class="jm">${mine?'Last: '+esc(mine.v)+' · '+mine.d:(x.pb?'PB '+esc(x.pb):'Not tested')}</div></div>
        <button class="btn sm gh" onclick="open_('bench','${escId(x.k)}')">Log</button></div>`});
    return b;});

  const msc=mobScores(),mweak=mobWeak(),lastA=D.assess.slice(-1)[0];
  h+=`<div class="sec">Mobility</div><div class="card">
    <div class="note">The six GoWod zones. The three lowest are what the daily 15 weights toward, so a reassessment changes what you actually get given.</div>
    <div class="grid3" style="margin-top:12px">`;
  MOBZONES.forEach(z=>{const v=msc[z.k],w=mweak.indexOf(z.k)>=0;
    h+=`<div><div class="tiny">${esc(z.n)}</div>
      <div class="mid" style="${w?'color:var(--acc2)':''}">${v!==undefined?v:'—'}</div>
      <div class="bar" style="margin-top:5px"><i style="width:${Math.max(3,Math.min(100,v||0))}%"></i></div></div>`});
  h+=`</div>
    <div class="jm" style="margin-top:9px">${mweak.length?'Weak three: '+esc(mweak.map(mobZoneName).join(' · ')):''}${lastA?' · last scored '+esc(lastA.d):''}</div>
    <button class="btn" style="margin-top:11px" onclick="open_('assess')">Update my scores</button></div>
  <div style="height:20px"></div>`;
  /* ---- WORKOUT HISTORY ---- */
  const hist=historyList();
  const comp=(D.completed||[]).filter(x=>x&&x.name);
  h+=sect('hist','Workout history',
    {tone:'acc',meta:hist.length?hist.length+' session'+(hist.length===1?'':'s'):'none yet'},()=>{
    let b=`<button class="btn gh" style="margin-bottom:10px" onclick="retroNew()">+ Log a workout you've already done</button>`;
    /* Finished blocks sit ABOVE the session list — they are the milestones the
       sessions add up to, and burying them under 40 rows would waste them. */
    if(comp.length){
      b+=`<div class="lbl" style="margin-top:4px">Programmes completed</div>`;
      comp.slice().reverse().forEach((s,ri)=>{
        const i=comp.length-1-ri;
        b+=`<div class="tst" style="border-color:var(--accbd)" onclick="open_('blockdone',${i})">
          <div style="flex:1">
            <div style="font-weight:600;font-size:14px">${esc(s.name)} <span class="pill g">Complete</span></div>
            <div class="jm">${esc(s.end)} · ${s.sessions} sessions · ${s.sets} sets · ${fmt(s.vol/1000,1)}t${s.pbs&&s.pbs.length?' · '+s.pbs.length+' PBs':''}</div></div>
          <span style="color:var(--acc)">›</span></div>`});
      b+=`<div class="lbl" style="margin-top:14px">Sessions</div>`;
    }
    if(hist.length){
      b+=hist.slice(0,40).map(r=>`<div class="tst" onclick="histOpen('${escId(r.d)}',${r.i})">
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${esc(r.n)}${r.l.retro?' <span class="pill">logged after</span>':''}${r.i>0?' <span class="pill a">#'+(r.i+1)+'</span>':''}</div>
          <div class="jm">${esc(r.d)}${r.at?' · '+esc(r.at):''} · ${r.sets} sets${r.mins?' · '+r.mins+' min':''}${r.vol?' · '+fmt(r.vol)+'kg':''}${r.kcal?' · '+r.kcal+' kcal':''}${r.hr?' · '+r.hr+' bpm':''}${r.effort?' · effort '+r.effort:''}</div></div>
        <span style="color:var(--tx3)">›</span></div>`).join('');
      if(hist.length>40)b+=`<div class="jm" style="margin-top:6px">Showing the last 40 of ${hist.length} logged sessions.</div>`;
    }else{
      b+=`<div class="note" style="margin-bottom:10px">Nothing logged yet. Finish a session, or log one you've already done.</div>`;
    }
    return b;});

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

/* ================= MORE =================
   Reordered in Beta 2.0 on Juan's instruction: Profile, then Data, then Tools
   at the TOP, with Profile visually elevated — those are the things reached
   on purpose. Everything below them is a library you browse, so it all
   collapses, and the headings alternate ember / glacier so the page reads as
   landmarks rather than one long scroll.

   Note every section body is a FUNCTION. The exercise library alone is ~135
   entries; building it while the section is shut is exactly the weight this
   release exists to remove. */
function rMore(){
  const me=curProfile(),np=profileList().length;

  /* ---------- 1. PROFILE (the standout) ---------- */
  let h=`<div class="sec" style="margin-top:6px">Profile</div>
    <div class="card acc" style="padding:15px;border-width:2px" onclick="open_('prof')">
      <div class="row" style="gap:13px">
        ${avatar(me,'lg')}
        <div style="flex:1;min-width:0">
          <div style="font-size:20px;font-weight:700;line-height:1.2">${esc(me.name)}</div>
          <div class="jm">@${esc(me.user)}${me.owner?' \u00b7 master account':''}</div>
          <div class="jm">Photo, display name, password, sign out</div>
        </div>
        <span style="color:var(--acc);font-size:22px">\u203a</span></div></div>`;
  /* Manage Accounts sits directly beneath Profile and only exists for the
     master. A guest sees the plain switcher instead, and only when there is
     actually somebody else on the phone to switch to. */
  if(me.owner){
    h+=`<div class="tst" onclick="open_('accounts')"><div style="flex:1">
      <div style="font-weight:600;font-size:14px">Manage accounts</div>
      <div class="jm">${np} profile${np===1?'':'s'} on this phone \u00b7 rename, reset a password, remove someone</div></div>
      <span style="color:var(--acc)">\u203a</span></div>`;
  }else if(np>1){
    h+=`<div class="tst" onclick="open_('accounts')"><div style="flex:1">
      <div style="font-weight:600;font-size:14px">Switch profile</div>
      <div class="jm">${np} profiles on this phone</div></div>
      <span style="color:var(--acc)">\u203a</span></div>`;
  }

  /* ---------- 2. DATA ---------- */
  h+=`<div class="sec">Data</div>`;
  if(isOwner()){
    h+=`<button class="btn" onclick="expObs()">Export to Obsidian (.md)</button>
    <div class="jm" style="margin:6px 0 12px">Save to Files \u2192 iCloud Drive \u2192 Obsidian Vault \u2192 Health. No Obsidian app needed on the phone.</div>`;
  }else{
    h+=`<div class="note" style="margin-bottom:10px">The Obsidian export belongs to the owner profile. Your data stays on this phone and can be backed up as a file below.</div>`;
  }
  h+=`<button class="btn gh" onclick="expJSON()">Backup all data (.json)</button>
    <button class="btn gh" style="margin-top:7px" onclick="document.getElementById('imp').click()">Restore from backup</button>
    <input type="file" id="imp" accept=".json" style="display:none" onchange="impJSON(this)">
    <div class="jm" style="margin-top:6px">A backup covers the profile you are signed in as, including its photos.</div>`;

  /* ---------- 3. TOOLS ---------- */
  h+=`<div class="sec">Tools</div>
    <div class="tst" onclick="open_('timer')"><div style="flex:1">
      <div style="font-weight:600;font-size:14px">Interval timer &amp; stopwatch</div>
      <div class="jm">EMOMs, sprints, Tabata, rounds \u00b7 or a plain stopwatch for benchmarks</div></div>
      <span style="color:var(--acc)">\u203a</span></div>`;

  /* ---------- 4. THE LIBRARIES, all collapsed ---------- */
  const act=P[D.active.id];
  h+=sect('m_prog','Programmes',
    {tone:'acc',meta:act?esc(act.name):PORDER.length+' available'},()=>{
    let b='';
    PORDER.map(k=>P[k]).filter(Boolean).forEach(p=>{const on=p.id===D.active.id;
      b+=`<div class="pgc ${on?'on':''}" onclick="open_('pg','${escId(p.id)}')">
        <div class="row sp"><div style="flex:1">
          <div style="font-weight:700;font-size:16px">${esc(p.name)}</div>
          <div class="jm" style="margin-top:2px">${esc(p.sub)}</div></div>
          ${on?`<span class="pill a">Active \u00b7 ${progPct()}%</span>`:''}</div>
        <div class="row" style="gap:6px;margin-top:9px;flex-wrap:wrap">
          <span class="pill">${p.weeks} weeks</span><span class="pill">${p.days} days</span>
          <span class="pill">${esc(p.where)}</span><span class="pill">${esc(p.bias)}</span></div></div>`});
    return b;});

  h+=sect('m_kbx','Kettlebell complexes',{tone:'ice',meta:KBXORDER.length+' complexes'},()=>{
    let b=`<div class="note" style="margin-bottom:10px">Your own complexes out of the Hard to Kill note. Run one as a finisher on any session, or on its own as a second workout for the day. They do not disturb the programme.</div>`;
    KBXORDER.forEach(k=>{const c=KBX[k];
      b+=`<div class="tst"><div style="flex:1" onclick="open_('kbx','${escId(k)}')">
        <div style="font-weight:600;font-size:14px">${esc(c.n)}${c.bench?' <span class="pill a">Benchmark</span>':''}</div>
        <div class="jm">${c.seq.map(x=>x[1]+' '+esc(x[0].replace(/^KB /,''))).join(' \u00b7 ')} \u00b7 ${c.rounds} rounds</div></div>
        <button class="btn sm gh" onclick="startKbx('${escId(k)}')">Start</button></div>`});
    return b;});

  h+=sect('m_cal','Calisthenics workouts',{tone:'acc',meta:CALORDER.length+' workouts'},()=>{
    let b=`<div class="note" style="margin-bottom:10px">The named sessions out of your Hard to Kill note. The scored ones double as benchmarks \u2014 finish one and log the score under Progress.</div>`;
    CALORDER.forEach(k=>{const c=CAL[k];
      b+=`<div class="tst"><div style="flex:1" onclick="open_('cal','${escId(k)}')">
        <div style="font-weight:600;font-size:14px">${esc(c.n)}${c.bench?' <span class="pill a">Benchmark</span>':''}</div>
        <div class="jm">${esc(c.kind)} \u00b7 ${c.ex.length} movements \u00b7 ~${c.mins} min</div></div>
        <button class="btn sm gh" onclick="startCal('${escId(k)}')">Start</button></div>`});
    return b;});

  h+=sect('m_str','Striking',{tone:'ice',meta:XTRAORDER.length+' sessions'},()=>{
    let b=`<div class="note" style="margin-bottom:10px">Long bag and gloves. Run one as your sport day, your conditioning, or a second session.</div>`;
    XTRAORDER.forEach(k=>{const x=XTRA[k];
      b+=`<div class="tst"><div style="flex:1" onclick="open_('xtra','${escId(k)}')">
        <div style="font-weight:600;font-size:14px">${esc(x.n)}</div>
        <div class="jm">${x.ex.length} blocks \u00b7 ${x.mins} min \u00b7 home</div></div>
        <button class="btn sm gh" onclick="startXtra('${escId(k)}')">Start</button></div>`});
    return b;});

  h+=sect('m_mine','Your workouts',
    {tone:'acc',meta:D.mine.length?D.mine.length+' saved':'none yet'},()=>{
    let b='';
    if(D.mine.length){D.mine.forEach(mw=>{
      b+=`<div class="tst"><div style="flex:1" onclick="editWorkout('${escId(mw.id)}')">
        <div style="font-weight:600;font-size:14px">${esc(mw.n)}</div>
        <div class="jm">${mw.ex.length} exercises \u00b7 ${esc(mw.w==='home'?'Home':mw.w==='gym'?'Gym':mw.w==='out'?'Outdoors':'Either')}</div></div>
        <button class="btn sm gh" onclick="freeSession('${escId(mw.id)}')">Start</button></div>`})}
    else b+=`<div class="note" style="margin-bottom:10px">None yet. Build one for the days the programme does not fit \u2014 a hotel room, a friend's garage, an extra arm session.</div>`;
    return b+`<button class="btn p" onclick="open_('gen')">Generate a workout</button>
      <button class="btn" style="margin-top:7px" onclick="newWorkout()">Create one by hand</button>`;});

  h+=sect('m_mob','Mobility',{tone:'ice',meta:MOBZONES.length+' zones'},()=>{
    const sc=mobScores(),weak=mobWeak();
    let b=`<div class="tst" style="border-color:var(--grnbd)"><div style="flex:1">
      <div style="font-weight:600;font-size:14px">The daily 15</div>
      <div class="jm">Full body, rotates daily, weighted to your weak zones</div></div>
      <button class="btn sm gh" onclick="open_('daily15')">Open</button></div>`;
    MOBZONES.forEach(z=>{const w=weak.indexOf(z.k)>=0;
      b+=`<div class="tst"><div style="flex:1">
      <div style="font-weight:600;font-size:14px">${esc(z.n)}
        ${sc[z.k]!==undefined?`<span class="pill ${w?'a':''}">${sc[z.k]}</span>`:''}</div>
      <div class="jm">${esc(z.d)}</div></div>
      <button class="btn sm gh" onclick="open_('mob','${escId(z.k)}')">Open</button></div>`});
    return b+`<div class="tst"><div style="flex:1"><div style="font-weight:600;font-size:14px">Recovery tools</div>
      <div class="jm">Foam roller \u00b7 spiked ball \u00b7 massage gun</div></div>
      <button class="btn sm gh" onclick="open_('tools')">Open</button></div>`;});

  h+=sect('m_lib','Exercise library',{tone:'acc',meta:Object.keys(EX).length+' movements'},()=>
    `<input type="search" placeholder="Search any exercise" oninput="libFilter(this.value)" style="margin-bottom:10px">
     <div id="lib"></div>`);

  h+=`<div style="height:24px"></div>`;
  document.getElementById('v-more').innerHTML=h;
  /* only populate the library when its section is actually open — libFilter
     writes into #lib, which does not exist while the section is shut */
  if(secIsOpen('m_lib',false))libFilter('');
}
function libFilter(q){
  q=(q||'').toLowerCase();
  /* Same order as the picker: Kettlebell, Rings, Calisthenics, Gym, Cardio.
     The library and the dropdown disagreeing on order would be its own small
     daily annoyance. */
  const ns=exOrdered(Object.keys(EX).filter(n=>!q||n.toLowerCase().includes(q)||(EX[n].m||[]).join(' ').includes(q)));
  const el=document.getElementById('lib');
  if(!el)return;                       // section is collapsed
  el.innerHTML=ns.slice(0,q?60:14).map(n=>
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

/* ================= ACCOUNTS =================
   Multiple members, entirely on-device. Each profile owns a separate
   localStorage record; Juan keeps the ORIGINAL key so his existing history
   survives the upgrade untouched.

   BE HONEST ABOUT WHAT THIS IS. The password gate stops the wrong person
   opening the wrong log on a shared phone. It is NOT encryption: every
   profile's data still sits in plain localStorage, and anyone with the device
   and a browser console can read it. Do not let the login screen talk anybody
   into believing otherwise, and do not put anything in here you would not put
   on a fridge door. Real protection needs the cloud backend (see STORE).

   Passwords are stored as salted SHA-256, never in the clear — not because the
   hash defeats a determined attacker with the device, but because people reuse
   passwords and leaking one in plain text is a genuine harm to them elsewhere.

   The MASTER password is a constant below, which means it is readable in the
   public repo. That is a deliberate, understood trade: it is what guarantees
   Juan can never be locked out of his own training history by a forgotten
   password. It is a recovery key, not a secret. */
const PKEY='jhfp_profiles';
const MASTER_USER='Juvies7';
const MASTER_SALT='jhfp-master-v2';
/* sha256('jhfp-master-v2:' + the master password) */
const MASTER_HASH='6ed40b5071fcb153dc5591ad96bcae447be6812501d765775c3306deeed57aef';
/* The SAME master password through the non-crypto fallback digest. Both are
   needed: crypto.subtle only exists in a secure context, so on file:// or a
   plain-http LAN address sha256() returns the weak digest, which could never
   equal the SHA-256 constant above. Without this second constant the master
   key — the one thing guaranteeing Juan can never be locked out of his own
   history — silently stops working in exactly the situation where you most
   need it. Recovery must not depend on the transport. */
const MASTER_HASH_WEAK='weak:febaf5cd2dd709fd';

function dataKey(id){return id==='juan'?'jhfp_v1':'jhfp_v1__'+id}

/* ---- hashing ----
   crypto.subtle needs a secure context. GitHub Pages is https so the real path
   is what runs on Juan's phone. The fallback exists only so the app still opens
   from file:// or a plain-http LAN address during development — it is a
   non-cryptographic digest and is labelled as such in the stored record, so a
   weak hash can never be mistaken for a strong one later. */
async function sha256(str){
  if(self.crypto&&self.crypto.subtle&&self.isSecureContext){
    const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));
    return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  return 'weak:'+weakHash(str);
}
function weakHash(s){let h1=0x12345678,h2=0x9e3779b9;
  for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);
    h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return ((h2>>>0).toString(16).padStart(8,'0'))+((h1>>>0).toString(16).padStart(8,'0'));
}
function newSalt(){
  if(self.crypto&&crypto.getRandomValues){const a=new Uint8Array(8);crypto.getRandomValues(a);
    return Array.from(a).map(x=>x.toString(16).padStart(2,'0')).join('')}
  return Math.random().toString(36).slice(2,12);
}
/* The digest used is RECORDED on the record. A password hashed with SHA-256
   cannot be verified by the weak digest or vice versa, so storing which one
   produced it is what lets checkAuth refuse honestly instead of silently
   returning "wrong password" and looking like a forgotten one. */
async function makeAuth(pw){const s=newSalt(),h=await sha256(s+':'+pw);
  return {s:s,h:h,alg:h.indexOf('weak:')===0?'weak':'sha256'}}
function algNow(){return (self.crypto&&self.crypto.subtle&&self.isSecureContext)?'sha256':'weak'}
async function isMaster(pw){
  const h=await sha256(MASTER_SALT+':'+pw);
  return h===MASTER_HASH||h===MASTER_HASH_WEAK;
}
async function checkAuth(p,pw){
  if(!p)return false;
  /* the master password opens any account — that is the recovery path */
  if(await isMaster(pw))return true;
  if(p.auth&&p.auth.h){
    /* Refuse rather than guess when the record was hashed by the other digest
       — a false "wrong password" here would send someone hunting for a
       forgotten password that is in fact correct. */
    if((p.auth.alg||'sha256')!==algNow())return false;
    return await sha256(p.auth.s+':'+pw)===p.auth.h;
  }
  /* {master:1} means "this account has no password of its own, the master key
     IS its password". Must return false here, NOT fall through to the empty
     -password case below, or the account would open on a blank field. */
  if(p.auth&&p.auth.master)return false;
  if(p.pin)return pw===p.pin;               // legacy 4-digit PIN, pre Beta 2.0
  return false;                             // never open an account on a blank
}
/* True when the stored hash cannot be checked in this context — used to show a
   useful message instead of "wrong password". */
function algMismatch(p){return !!(p&&p.auth&&p.auth.h&&(p.auth.alg||'sha256')!==algNow())}
function hasPw(p){return !!(p&&((p.auth&&(p.auth.h||p.auth.master))||p.pin))}

/* ---- the profile index ---- */
function profileState(){
  let s=STORE.json(PKEY,null);
  if(!s||!s.list||!s.list.length)
    s={cur:'juan',list:[{id:'juan',user:MASTER_USER,
      name:(typeof D!=='undefined'&&D.settings&&D.settings.name)||'Juvies',
      owner:true,created:todayISO()}]};
  return migrateProfiles(s);
}
/* Beta 2.0 upgrade, idempotent. Gives every profile a username and a created
   date, and gives the OWNER the master password if it has none — without this
   an existing install would present a login screen that accepts anything. The
   legacy `pin` is left in place and still accepted until the person sets a real
   password, so nobody is locked out by the upgrade itself. */
function migrateProfiles(s){
  let dirty=false;
  /* A single null in the list used to throw inside gateBoot, and because
     .gated is only cleared by gateDone that left a permanently blank screen
     with no route back to the data. Drop the rubbish first, always. */
  if(!Array.isArray(s.list)){s.list=[];dirty=true}
  const clean=s.list.filter(p=>p&&typeof p==='object');
  if(clean.length!==s.list.length){s.list=clean;dirty=true}
  if(!s.list.length){
    s.list=[{id:'juan',user:MASTER_USER,name:'Juvies',owner:true,
      auth:{master:1},created:todayISO()}];dirty=true;
  }
  const seen={};
  s.list.forEach(p=>{
    if(!p.id){p.id='u'+Math.random().toString(36).slice(2,8);dirty=true}
    if(!p.user){p.user=p.owner?MASTER_USER:safeUser(p.name);dirty=true}
    /* A derived username must obey the same rules as a typed one, or two
       guests both called "Jo" end up sharing @Jo and userTaken stops working. */
    const key=String(p.user).toLowerCase();
    if(seen[key]){
      /* suffix until actually unique — keying `seen` off the pre-suffix name
         let two profiles whose ids end in the same 3 characters collide again */
      let base=String(p.user).slice(0,16),n=1,cand=base+'-'+String(p.id).slice(-3);
      while(seen[cand.toLowerCase()]){cand=base+'-'+String(p.id).slice(-3)+n;n++}
      p.user=cand;dirty=true;
    }
    seen[String(p.user).toLowerCase()]=1;
    if(!p.created){p.created=todayISO();dirty=true}
    /* Nobody keeps a blank password. An account with no credential at all is
       put on the master key, so Juan lets them in once and they set their own
       under Profile — rather than the account opening for anyone who taps. */
    if(!p.auth&&!p.pin){p.auth={master:1};dirty=true}
  });
  if(!s.list.some(p=>p.owner)){s.list[0].owner=true;dirty=true}
  /* A `cur` pointing at a deleted profile made curPid() hand back a dead id,
     which then created a permanently orphaned data key on the next save. */
  if(!s.cur||!s.list.some(p=>p.id===s.cur)){s.cur=s.list[0].id;dirty=true}
  if(dirty)STORE.setJson(PKEY,s);
  return s;
}
function safeUser(name){
  let u=String(name||'user').replace(/[^A-Za-z0-9_.-]/g,'').slice(0,20);
  while(u.length<3)u+='0';
  return u;
}
function profileSave(s){return STORE.setJson(PKEY,s)}
function profileList(){return profileState().list}
function profileById(id){return profileState().list.find(p=>p.id===id)||null}
/* Follows SIGNED — the profile this PAGE booted as — not the index's `cur`.
   sessionPid() goes null the moment a credential changes, and falling back to
   `cur` at that point could flip isOwner() to true on a guest's page. SIGNED is
   fixed for the life of the page, which is exactly the property we want. */
function curProfile(){const s=profileState();
  const id=SIGNED||s.cur;
  return s.list.find(p=>p.id===id)||s.list[0]}
function isOwner(){const p=curProfile();return !!(p&&p.owner)}
function userTaken(u,exceptId){const t=String(u).toLowerCase();
  return profileList().some(p=>p.id!==exceptId&&String(p.user||'').toLowerCase()===t)}

/* ---- session ---- */
/* Returns false if the session could not be written — which happens for real
   when localStorage is full of progress photos. The caller MUST check it:
   reloading after a failed write drops straight back onto the login screen
   with no error, and the correct password appears to do nothing forever. */
function signIn(id){
  const s=profileState(),p=s.list.find(x=>x.id===id);
  if(!p)return false;
  p.last=todayISO();
  s.cur=id;profileSave(s);
  return STORE.setJson(SKEY,{pid:id,at:Date.now(),k:sessionBind(p)});
}
function signOut(){
  if(typeof save==='function')save();        // flush the outgoing profile first
  STORE.del(SKEY);
  location.reload();
}
/* Switching while already signed in still needs the password — otherwise the
   gate is theatre, since anyone holding the phone could just tap across. */
function profileSwitch(id){
  const p=profileById(id);if(!p)return;
  if(p.id===curProfile().id){close_();return}
  save();
  STORE.del(SKEY);
  const s=profileState();s.cur=id;profileSave(s);
  location.reload();                         // lands on the portal, on that profile
}
function profileDel(id){
  /* Permission check in the FUNCTION, not just on the button. Hiding a delete
     control from guests is presentation; this is the actual rule, and without
     it any guest could wipe another member's entire log irreversibly. */
  const me=curProfile();
  if(!isOwner()&&id!==me.id){alert('Only the master account can remove someone else.');return}
  const s=profileState(),p=s.list.find(x=>x.id===id);
  if(!p||p.owner){alert('The master account cannot be deleted.');return}
  if(!confirm('Delete '+p.name+' and all of their logged data? This cannot be undone.'))return;
  STORE.del(dataKey(id));
  s.list=s.list.filter(x=>x.id!==id);
  if(s.cur===id)s.cur=s.list[0].id;
  profileSave(s);
  if(sessionPid()===id)STORE.del(SKEY);
  location.reload();
}
function profileRename(id,v){const s=profileState(),p=s.list.find(x=>x.id===id);
  if(p){p.name=v;profileSave(s)}}

/* ================= THE PHILOSOPHY =================
   Juan's own words, tightened. Shown on the login portal and mirrored into the
   Hard to Kill note so the app and the note say the same thing. If you edit one
   edit the other — a philosophy that drifts between two files is worse than one
   that lives in a single place. */
const PHIL=[
 {h:'Movement is medicine',b:'Not a punishment, not a chore, and not something you earn with food. The dose is daily.'},
 {h:'Turn exercise into play',b:'Make it something you want to do again tomorrow. Play is what produces volume, and it is the immense volume that comes out of enjoying it that 10x’s the gains — not any single heroic session.'},
 {h:'Minimal but effective',b:'Strength, fitness, endurance and mobility trained together, so less work — aimed better — returns more than more work aimed badly. Five to seven movements. In and out.'},
 {h:'Do hard things',b:'Growth happens outside the comfort zone. Barefoot where you can, cold where you can, uncomfortable on purpose.'},
 {h:'There is no standing still',b:'If you are not moving forward you are going backwards. Neutral is not one of the options.'},
 {h:'Deposits or withdrawals',b:'Training, sleep, food, work, family — every one of them is an investment account. Every day you are either paying in or drawing down. Nothing is neutral there either.'},
 {h:'Fuel like you mean it',b:'Carnivore-minded, fat-driven, tracked honestly. Food is the raw material; you cannot build out of nothing.'},
 {h:'Track it or it did not happen',b:'Daily habits for accountability, Train and Progress for the work itself — so progression is a fact you can see, not a feeling you hope for.'},
 {h:'Built for busy people',b:'Programme options for whatever life is doing this month, and a system that removes the decision so all you have to do is start.'}
];

/* ================= LOGIN PORTAL =================
   The gate is the first thing the app paints. It is deliberately NOT a view:
   views live inside the app shell and assume a loaded profile, whereas the gate
   has to work before we know whose data to load. It owns its own tiny bit of
   state (GATE) and its own render, and it hands off to the app exactly once. */
let GATE={mode:'in',pid:null,err:'',ok:'',phil:false,pic:''};

function gateBoot(){
  const s=profileState();
  /* sessionPid() has already checked existence, expiry and the binding token.
     Trusting it here is the whole point of doing that work there. */
  if(SIGNED&&s.list.some(p=>p.id===SIGNED)){gateDone();return false}
  const start=s.list.find(p=>p.id===s.cur)||s.list[0];
  GATE.pid=start?start.id:null;
  GATE.mode=s.list.length?'in':'up';
  gateRender();
  return true;
}
/* Guarded. This used to be a bare global that dropped the gate on demand, so
   anything able to run one line of script — console, bookmarklet, extension —
   could walk straight into whichever profile was last used. */
function gateDone(){
  if(!sessionPid())return;
  document.documentElement.classList.remove('gated');
  const g=document.getElementById('gate');if(g)g.classList.add('hidden');
}
function gateGo(m){GATE.mode=m;GATE.err='';GATE.ok='';gateRender()}
function gatePick(id){GATE.pid=id;GATE.mode='in';GATE.err='';gateRender()}
function gatePhil(){GATE.phil=!GATE.phil;gateRender()}
function gval(id){const e=document.getElementById(id);return e?e.value:''}

function gateRender(){
  const s=profileState(),list=s.list;
  const p=list.find(x=>x.id===GATE.pid)||list[0];
  const M=GATE.mode;
  let h=`<img class="gmark" src="icon.png" alt="">
    <div class="gtitle">Juvies Health &amp; Fitness</div>
    <div class="gsub">Protocol</div>`;

  if(GATE.err)h+=`<div class="gcard" style="padding:0;background:none;border:none;backdrop-filter:none;margin-top:16px"><div class="gerr">${esc(GATE.err)}</div></div>`;

  if(M==='in'){
    h+=`<div class="gcard">
      ${GATE.ok?`<div class="gok">${esc(GATE.ok)}</div>`:''}
      <div class="row" style="gap:12px;margin-bottom:14px">
        ${avatar(p,'lg')}
        <div style="flex:1;min-width:0">
          <div style="font-size:19px;font-weight:700;line-height:1.2">${esc(p.name)}</div>
          <div class="jm">@${esc(p.user)}${p.owner?' · master account':''}</div>
        </div></div>
      <div class="gfield"><label for="gpw">Password</label>
        <input type="password" id="gpw" autocomplete="current-password"
          placeholder="${hasPw(p)?'Your password':'No password set — leave blank'}"
          onkeydown="if(event.key==='Enter')gateSignIn()"></div>
      <button class="btn p" onclick="gateSignIn()">Sign in</button>
      <a class="glink" onclick="gateGo('forgot')">Forgotten your password?</a>
    </div>`;
    if(list.length>1){
      h+=`<div class="gcard"><div class="lbl">Someone else</div>`;
      list.filter(x=>x.id!==p.id).forEach(x=>{
        h+=`<button class="gwho" onclick="gatePick('${escId(x.id)}')">${avatar(x)}
          <div style="flex:1;min-width:0"><div class="nm">${esc(x.name)}</div>
          <div class="mt">@${esc(x.user)}${x.owner?' · master':''}</div></div>
          <span style="color:var(--acc)">›</span></button>`});
      h+=`</div>`;
    }
    h+=`<button class="btn gh" style="margin-top:10px" onclick="gateGo('up')">Create a new profile</button>`;
  }

  if(M==='up'){
    h+=`<div class="gcard">
      <div class="lbl">Create your profile</div>
      <div class="jm" style="margin-bottom:13px">Your training log lives on this phone, in your own profile. Nobody else using this app can see it.</div>
      <div class="row" style="gap:12px;margin-bottom:13px">
        ${GATE.pic?`<span class="av lg"><img src="${escAttr(GATE.pic)}" alt=""></span>`:`<span class="av lg">+</span>`}
        <div style="flex:1">
          <button class="btn gh sm" onclick="document.getElementById('gpic').click()">${GATE.pic?'Change photo':'Add a photo'}</button>
          ${GATE.pic?`<button class="btn gh sm" style="margin-left:6px" onclick="GATE.pic='';gateRender()">Remove</button>`:''}
          <input type="file" id="gpic" accept="image/*" style="display:none" onchange="gatePicPick(this)">
        </div></div>
      <div class="gfield"><label for="gn">Your name</label>
        <input id="gn" autocomplete="name" placeholder="What should the app call you?"></div>
      <div class="gfield"><label for="gu">Username</label>
        <input id="gu" autocomplete="username" autocapitalize="none" placeholder="Used to sign in"></div>
      <div class="gfield"><label for="gp1">Password</label>
        <input type="password" id="gp1" autocomplete="new-password" placeholder="At least 6 characters"></div>
      <div class="gfield"><label for="gp2">Confirm password</label>
        <input type="password" id="gp2" autocomplete="new-password"
          onkeydown="if(event.key==='Enter')gateSignUp()"></div>
      <button class="btn p" style="margin-top:4px" onclick="gateSignUp()">Create profile &amp; start</button>
      ${list.length?`<a class="glink" onclick="gateGo('in')">I already have a profile</a>`:''}
    </div>`;
  }

  if(M==='forgot'){
    h+=`<div class="gcard">
      <div class="lbl">Reset a password</div>
      <div class="jm" style="margin-bottom:13px">There is no email on this app — everything is on the phone. A password is reset by the master account holder instead. Hand the phone to Juan, or enter the master password yourself if that is you.</div>
      <div class="gfield"><label for="fw">Master password</label>
        <input type="password" id="fw" autocomplete="off" placeholder="Master account password"></div>
      <div class="gfield"><label for="fp">Reset the password for</label>
        <select id="fp">${list.map(x=>`<option value="${escAttr(x.id)}"${x.id===p.id?' selected':''}>${esc(x.name)} (@${esc(x.user)})</option>`).join('')}</select></div>
      <div class="gfield"><label for="fn1">New password</label>
        <input type="password" id="fn1" autocomplete="new-password" placeholder="At least 6 characters"></div>
      <div class="gfield"><label for="fn2">Confirm new password</label>
        <input type="password" id="fn2" autocomplete="new-password"
          onkeydown="if(event.key==='Enter')gateReset()"></div>
      <button class="btn p" style="margin-top:4px" onclick="gateReset()">Reset password</button>
      <a class="glink" onclick="gateGo('in')">Back to sign in</a>
    </div>`;
  }

  /* the philosophy — collapsed to a teaser, because a wall of text on a login
     screen is a wall of text nobody reads */
  h+=`<div class="gcard phil">
    <button class="row sp" style="width:100%;text-align:left" onclick="gatePhil()">
      <div style="flex:1">
        <div style="font-weight:700;font-size:15px">What this app believes</div>
        <div class="jm" style="margin-top:2px">${GATE.phil?'Tap to close':'Movement is medicine · training as play · minimal but effective'}</div>
      </div>
      <span style="color:var(--acc);font-size:19px">${GATE.phil?'−':'+'}</span></button>`;
  if(GATE.phil){
    h+=`<div style="margin-top:12px">`;
    PHIL.forEach((x,i)=>{h+=`<div class="pt"><div class="pn">${String(i+1).padStart(2,'0')}</div>
      <div style="flex:1"><div class="ph">${esc(x.h)}</div><div class="pb">${esc(x.b)}</div></div></div>`});
    h+=`</div>`;
  }
  h+=`</div>
    <div class="jm" style="text-align:center;margin-top:16px;line-height:1.5">
      Your log is stored on this phone only — nothing is uploaded anywhere.<br>
      That also means the password keeps other people out of your log, not out of the phone.</div>`;
  document.getElementById('gatec').innerHTML=h;
}

/* Escape for use INSIDE an HTML attribute or a quoted JS string in an inline
   handler. esc() is right for text nodes; ids and data URLs go through here,
   because a single apostrophe in onclick="f('${id}')" ends the string and
   everything after it becomes code. Ids are machine-generated today, but a
   restored or hand-edited backup is untrusted input like any other. */
function escAttr(s){return String(s===undefined||s===null?'':s)
  .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  .replace(/</g,'&lt;').replace(/>/g,'&gt;')}
/* For a value that lands inside a QUOTED JS STRING in an inline handler —
   onclick="f('HERE')". Entity-escaping is NOT enough there: the HTML parser
   decodes &#39; back to an apostrophe BEFORE the JS is parsed, so escAttr()
   alone still lets a crafted id close the string and run code. Profile ids are
   machine-generated, but a restored or hand-edited backup is untrusted input
   like anything else, so strip to the character set ids are actually made of. */
function escId(s){return String(s===undefined||s===null?'':s).replace(/[^A-Za-z0-9_-]/g,'')}

/* Shared avatar renderer. Picture if there is one, initial on a tinted disc if
   not, so nothing jumps around when somebody adds a photo. */
function avatar(p,sz){
  const c='av'+(sz==='lg'?' lg':'');
  /* only ever render a picture we recognise as an inline image */
  const pic=p&&p.pic&&/^data:image\//.test(p.pic)?p.pic:'';
  if(pic)return `<span class="${c}"><img src="${escAttr(pic)}" alt=""></span>`;
  const i=String((p&&p.name)||'?').trim().charAt(0)||'?';
  return `<span class="${c}">${esc(i)}</span>`;
}

async function gateSignIn(){
  const p=profileById(GATE.pid);
  if(!p){GATE.err='That profile has gone. Pick another.';gateRender();return}
  const pw=gval('gpw');
  if(await checkAuth(p,pw)){
    if(signIn(p.id)){location.reload();return}
    GATE.err='Your password was right, but this phone would not save the session — storage is full. '
      +'Free some space (deleting a few progress photos is usually enough) and try again.';
    GATE.ok='';gateRender();return;
  }
  GATE.err=algMismatch(p)
    ? 'This password was set on the secure (https) address and cannot be checked here. Open the app from its normal address, or sign in with the master password.'
    : 'That password does not match. If you are stuck, use "Forgotten your password?".';
  GATE.ok='';gateRender();
}

async function gateSignUp(){
  const n=gval('gn').trim(),u=gval('gu').trim(),p1=gval('gp1'),p2=gval('gp2');
  if(!n){GATE.err='Give the profile a name.';gateRender();return}
  if(!u||!/^[A-Za-z0-9_.-]{3,20}$/.test(u)){
    GATE.err='Pick a username of 3–20 characters — letters, numbers, dot, dash or underscore.';gateRender();return}
  if(userTaken(u)){GATE.err='That username is already used on this phone.';gateRender();return}
  if(p1.length<6){GATE.err='The password needs at least 6 characters.';gateRender();return}
  if(p1!==p2){GATE.err='The two passwords do not match.';gateRender();return}
  const s=profileState();
  if(s.list.length>=8){GATE.err='Eight profiles is the limit on one phone.';gateRender();return}
  const id='u'+Date.now().toString(36);
  s.list.push({id:id,user:u,name:n,pic:GATE.pic||'',auth:await makeAuth(p1),
    owner:false,created:todayISO()});
  if(!profileSave(s)){
    GATE.err='This phone would not save the new profile — storage is full. Free some space and try again.';
    gateRender();return;
  }
  /* Seed their OWN record before signing in. Without this a new member boots
     into DEF, which carries Juan's name, his 84kg bodyweight, his 3,500 kcal
     macros and his active programme — so a friend's first screen tells them
     they weigh 84kg and are three weeks into KB & Calisthenics Warrior. */
  /* If their record cannot be written we must NOT sign them in — they would
     boot on DEF, which is Juan's name, 84kg, his macros and his programme. */
  if(!seedProfile(id,n)){
    s.list=s.list.filter(x=>x.id!==id);profileSave(s);
    GATE.err='This phone is out of storage, so the profile could not be created. Free some space and try again.';
    gateRender();return;
  }
  if(!signIn(id)){
    GATE.err='Your profile was created but the session would not save — storage is full. Free some space and sign in again.';
    GATE.mode='in';GATE.pid=id;gateRender();return;
  }
  location.reload();
}
/* A blank record carrying only their name. Deliberately NOT a copy of DEF's
   personal figures. Programme is left at the DEF default for now; run 3
   introduces Adventurer and makes that the landing programme for new members. */
function seedProfile(id,name){
  const base=JSON.parse(JSON.stringify(DEF));
  base.settings.name=name;
  base.settings.weight='';base.settings.age='';base.settings.height='';
  base.settings.kcal='';base.settings.protein='';base.settings.fat='';
  base.active={id:DEF.active.id,start:todayISO(),week:1};
  base.logs={};base.journal={};base.food={};base.pbs={};base.bench={};
  base.mobility={};base.assess=[];base.weights={};base.completed=[];
  base.custom={};base.mine=[];base.photos=[];
  return STORE.setJson(dataKey(id),base);
}

async function gateReset(){
  const mw=gval('fw'),id=gval('fp'),n1=gval('fn1'),n2=gval('fn2');
  /* isMaster(), NOT a raw compare against MASTER_HASH — the raw compare could
     never match in a non-secure context, so the reset path was dead in exactly
     the situation the weak master constant was added to survive. */
  if(!await isMaster(mw)){
    GATE.err='That is not the master password.';gateRender();return}
  if(n1.length<6){GATE.err='The new password needs at least 6 characters.';gateRender();return}
  if(n1!==n2){GATE.err='The two passwords do not match.';gateRender();return}
  const s=profileState(),p=s.list.find(x=>x.id===id);
  if(!p){GATE.err='That profile has gone.';gateRender();return}
  p.auth=await makeAuth(n1);delete p.pin;    // retire any legacy PIN on reset
  /* Check the write. Telling someone their password is reset when the record
     never reached disk hands them a password that does not work. */
  if(!profileSave(s)){
    GATE.err='The new password could not be saved — this phone is out of storage. The old password still works.';
    gateRender();return;
  }
  GATE.pid=id;GATE.mode='in';GATE.err='';
  GATE.ok='Password reset for '+p.name+'. Sign in with the new one.';
  gateRender();
}

/* ---- your own profile, from inside the app ---- */
function myPicPick(input){shrinkPic(input,d=>{
  const s=profileState(),p=s.list.find(x=>x.id===curProfile().id);
  if(p){p.pic=d;profileSave(s)}open_('prof');render()})}
function myPicClear(){
  const s=profileState(),p=s.list.find(x=>x.id===curProfile().id);
  if(p){delete p.pic;profileSave(s)}open_('prof');render();
}
function myName(v){
  v=String(v||'').trim();if(!v)return;
  const s=profileState(),p=s.list.find(x=>x.id===curProfile().id);
  if(p){p.name=v;profileSave(s)}
  /* the settings name drives the greeting on Today, so keep the two in step */
  D.settings.name=v;save();render();
}
async function myPassword(){
  const me=curProfile();
  const cur=gval('cp0'),n1=gval('cp1'),n2=gval('cp2');
  if(hasPw(me)&&!await checkAuth(me,cur)){alert('That is not your current password.');return}
  if(n1.length<6){alert('The new password needs at least 6 characters.');return}
  if(n1!==n2){alert('The two new passwords do not match.');return}
  const s=profileState(),p=s.list.find(x=>x.id===me.id);
  if(!p)return;
  p.auth=await makeAuth(n1);delete p.pin;
  if(!profileSave(s)){alert('The new password could not be saved — this phone is out of storage. Your old password still works.');return}
  /* Changing the credential invalidates the current session by design, because
     the session token is bound to it. Reissue so you are not silently signed
     out on the next reload. */
  signIn(me.id);
  alert('Password updated.');open_('prof');
}

/* ---- master administration ---- */
/* Headline numbers so the master can see an account is alive without opening
   it — a session count and a last-active date, nothing else.

   Be precise about what this does and does not do. Producing those two numbers
   means parsing that profile's record, which briefly puts their whole log
   (progress photos included) in memory. It is NOT displayed and NOT retained
   past this function, but "the master cannot read your log" would be an
   overclaim, so the UI says "does not show" rather than "cannot see".

   Cached per sheet-open: the accounts screen calls this once per row, and on a
   full phone re-parsing several MB of dataURLs on every render was visible. */
let STATC={};
function accountStatsReset(){STATC={}}
function accountStats(id){
  if(STATC[id])return STATC[id];
  let out={sessions:0,last:''};
  try{
    const raw=STORE.json(dataKey(id),null);
    if(raw&&raw.logs){
      let n=0,last='';
      Object.keys(raw.logs).forEach(k=>{
        const a=Array.isArray(raw.logs[k])?raw.logs[k]:[raw.logs[k]];
        const done=a.filter(x=>x&&x.done).length;
        if(done){n+=done;if(k>last)last=k}
      });
      out={sessions:n,last:last};
    }
  }catch(e){}
  STATC[id]=out;return out;
}
function adminRename(id){
  if(!isOwner())return;
  const p=profileById(id);if(!p)return;
  const v=prompt('New display name for '+p.name,p.name);
  if(v===null)return;
  if(!String(v).trim()){alert('The name cannot be empty.');return}
  profileRename(id,String(v).trim());open_('accounts');
}
async function adminReset(id){
  if(!isOwner())return;
  const p=profileById(id);if(!p)return;
  const n1=prompt('New password for '+p.name+' (at least 6 characters)');
  if(n1===null)return;
  if(String(n1).length<6){alert('The new password needs at least 6 characters.');return}
  const s=profileState(),t=s.list.find(x=>x.id===id);
  if(!t)return;
  t.auth=await makeAuth(String(n1));delete t.pin;
  if(!profileSave(s)){alert('The new password could not be saved — this phone is out of storage. Their old password still works.');return}
  alert('Password reset for '+t.name+'. Tell them the new one and get them to change it under Profile.');
  open_('accounts');
}

/* Profile photo. Same downscale pipeline as progress photos — a phone camera
   image straight into localStorage would blow the quota on its own. */
function gatePicPick(input){shrinkPic(input,d=>{GATE.pic=d;gateRender()})}
function shrinkPic(input,cb){
  const f=input.files&&input.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{const im=new Image();
    im.onload=()=>{
      const S=256,c=document.createElement('canvas');c.width=c.height=S;
      const sd=Math.min(im.width,im.height);                 // square centre crop
      c.getContext('2d').drawImage(im,(im.width-sd)/2,(im.height-sd)/2,sd,sd,0,0,S,S);
      cb(c.toDataURL('image/jpeg',.8));
    };
    im.onerror=()=>alert('That image could not be read.');
    im.src=e.target.result};
  r.readAsDataURL(f);
  input.value='';
}

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
  const opts=exOptions(e.n);   // Kettlebell · Rings · Calisthenics · Gym · Cardio
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
  const opts=exOptions();   // Kettlebell · Rings · Calisthenics · Gym · Cardio
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
    <span class="pill">${esc(c.kit)}</span><span class="pill">~${s.mins} min</span>
    ${c.bench?'<span class="pill g">Scored benchmark</span>':''}</div>
  <div class="note">${esc(c.note)}</div>
  <div class="sec">The sequence — unbroken, bell stays up</div>
  ${c.seq.map((x,i)=>`<div class="tst"><div style="flex:1">
     <div style="font-weight:600;font-size:14px">${i+1}. ${esc(x[0])}</div>
     <div class="jm">${(EX[x[0]]||{}).c?esc(String(EX[x[0]].c).split('.')[0])+'.':''}</div></div>
     <span class="pill a">×${x[1]}</span></div>`).join('')}
  <div class="warnbox" style="margin-top:12px">Rest is between ROUNDS only. If you have to put the bell down mid-round, the bell is too heavy or the round is too long — drop a size rather than break the complex.</div>
  <button class="btn p" style="margin-top:6px" onclick="startKbx('${escId(k)}')">Start it now</button>
  ${c.bench?`<button class="btn gh" style="margin-top:7px" onclick="close_();open_('bench','${escId(c.bench)}')">Log a score</button>`:''}
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

/* ---- BLOCK COMPLETE ----
   Shown the moment the last session of the last week is finished, and readable
   again later from Workout history. This is the only screen in the app that is
   purely a reward: no controls, no next action except choosing what comes next.
   Ten weeks of work deserves more than the progress bar quietly hitting 100%. */
blockdone:i=>{
  const s=(D.completed||[])[i];
  if(!s)return '<div class="mid">No block to show</div>';
  const st=(label,val,sub)=>`<div class="stat acc" style="margin:0">
    <div class="tiny">${esc(label)}</div><div class="big mono">${esc(String(val))}</div>
    ${sub?`<div class="jm" style="margin-top:2px">${esc(sub)}</div>`:''}</div>`;
  let h=`<div style="text-align:center;padding:6px 0 2px">
    <div class="lbl" style="letter-spacing:.22em">Block complete</div>
    <div class="mid" style="font-size:23px;margin-top:4px">${esc(s.name)}</div>
    <div class="jm">${esc(s.start)} → ${esc(s.end)} · ${s.days} days${s.weeks?' · '+s.weeks+' weeks':''}</div>
  </div>
  <div class="grid3" style="margin:16px 0 10px">
    ${st('Sessions',s.sessions)}${st('Sets',s.sets)}${st('Movements',s.movements)}
  </div>
  <div class="grid3" style="margin-bottom:10px">
    ${st('Volume',fmt(s.vol/1000,1)+'t','tonnes lifted')}
    ${st('Calories',fmt(s.kcal))}
    ${st('Hours',fmt(s.mins/60,1))}
  </div>`;
  if(s.top&&s.top.length){
    h+=`<div class="sec">Where the work went</div><div class="card">`;
    const max=s.top[0].v||1;
    s.top.forEach(t=>{h+=`<div style="margin-bottom:9px">
      <div class="row sp"><span style="font-size:14px;font-weight:600">${esc(t.n)}</span>
        <span class="mono" style="font-size:13px;color:var(--tx3)">${t.v} sets</span></div>
      <div class="bar" style="margin-top:5px"><i style="width:${Math.round(t.v/max*100)}%"></i></div>
    </div>`});
    h+=`</div>`;
  }
  if(s.pbs&&s.pbs.length){
    h+=`<div class="sec">${s.pbs.length} PB${s.pbs.length===1?'':'s'} set in this block</div><div class="card">`;
    s.pbs.slice(0,12).forEach(x=>{h+=`<div class="fi"><span>${esc(x.n)}</span>
      <span class="mono">${isBW(x.w)?'BW':fmt(x.w,x.w%1?1:0)+'kg'}${x.r?' × '+x.r:''}</span></div>`});
    if(s.pbs.length>12)h+=`<div class="jm" style="margin-top:6px">and ${s.pbs.length-12} more.</div>`;
    h+=`</div>`;
  }
  if(s.bench&&s.bench.length){
    h+=`<div class="sec">Benchmarks scored</div><div class="card">`;
    s.bench.forEach(x=>{h+=`<div class="fi"><span>${esc(x.n)}</span>
      <span class="mono">${esc(x.v)}</span></div>`});
    h+=`</div>`;
  }
  h+=`<div class="grid2" style="margin-top:12px">
    <div class="card flat" style="margin:0"><div class="tiny">Avg effort</div>
      <div class="mid mono">${s.effort?s.effort+'/10':'—'}</div></div>
    <div class="card flat" style="margin:0"><div class="tiny">Mobility</div>
      <div class="mid mono">${s.mobility}</div></div>
  </div>
  <div class="note" style="margin-top:14px">You are on <b>Adventurer</b> until you choose the next block — train what you like, nothing to fall behind on. When you are ready, pick one from More → Programmes.</div>
  <button class="btn p" style="margin-top:12px" onclick="close_();go('more')">Choose the next programme</button>
  <button class="btn gh" style="margin-top:7px" onclick="close_();go('today')">Not yet — stay on Adventurer</button>`;
  return h},

/* ---- AUTOMATIC WORKOUT GENERATOR ----
   Choices at the top, the built session underneath, regenerate and save at the
   bottom. Every change rebuilds immediately so you can see what a choice does
   rather than guessing — the seed only changes when you press Regenerate, so
   flipping one option does not shuffle everything else at the same time. */
gen:()=>{
  const o=GEN;
  const s=GENSESS||(GENSESS=genBuild(o));
  const v=genEstimate(s);
  const chip=(list,key,val)=>list.map(([k,label])=>
    `<button class="tab ${o[key]===k?'on':''}" onclick="genSet('${key}','${escId(k)}')">${esc(label)}</button>`).join('');
  let h=`<div class="mid">Build me a workout</div>
  <div class="jm" style="margin:6px 0 13px">Pick what you have and what you want out of it. Everything rebuilds as you choose.</div>

  <div class="lbl">Where</div><div class="tabs" style="flex-wrap:wrap">${chip(GEN_WHERE,'where')}</div>
  <div class="lbl" style="margin-top:12px">What are you training</div>
  <div class="tabs" style="flex-wrap:wrap">${chip(GEN_PATTERN,'pattern')}</div>
  <div class="lbl" style="margin-top:12px">Equipment</div>
  <div class="tabs" style="flex-wrap:wrap">${GEN_KIT.map(([k,label])=>
    `<button class="tab ${o.kit.indexOf(k)>=0?'on':''}" onclick="genKit('${escId(k)}')">${esc(label)}</button>`).join('')}</div>
  <div class="lbl" style="margin-top:12px">Format</div>
  <div class="tabs" style="flex-wrap:wrap">${chip(GEN_FORMAT,'format')}</div>
  <div class="lbl" style="margin-top:12px">How long</div>
  <div class="tabs">${GEN_MINS.map(m=>
    `<button class="tab ${o.mins===m?'on':''}" onclick="genSet('mins',${m})">${m} min</button>`).join('')}</div>
  <div class="lbl" style="margin-top:12px">Level</div><div class="tabs">${chip(GEN_LEVEL,'level')}</div>
  <div class="lbl" style="margin-top:12px">Quality</div>
  <div class="tabs" style="flex-wrap:wrap">${chip(GEN_QUALITY,'quality')}</div>
  <div class="lbl" style="margin-top:12px">Finish with (optional)</div>
  <div class="tabs" style="flex-wrap:wrap">${KBXORDER.concat(CALORDER).map(k=>{
    const nm=(KBX[k]&&KBX[k].n)||(CAL[k]&&CAL[k].n)||k;
    return `<button class="tab ${o.include.indexOf(k)>=0?'on':''}" onclick="genInc('${escId(k)}')">${esc(nm)}</button>`}).join('')}</div>

  <div class="sec">Your workout</div>
  <div class="card acc">
    <div class="row sp"><div class="mid" style="font-size:17px">${esc(s.n)}</div>
      <span class="pill a">${esc(s.kind||'')}</span></div>
    <div class="note" style="margin:8px 0 11px">${esc(s.note)}</div>`;
  s.ex.forEach(e=>{
    h+=`<div class="tst" style="background:none;border-color:var(--bd)">
      <div style="flex:1"><div style="font-weight:600;font-size:14px">${esc(e.n)}</div>
      <div class="jm">${e.s} × ${esc(e.r)}${e.rest?' · rest '+e.rest+'s':' · no rest'}</div></div>
      <span class="pill">${esc(((EX[e.n]||{}).m||[])[0]||'')}</span></div>`});
  if(s.fin)h+=`<div class="note" style="margin-top:10px">${esc(s.fin)}</div>`;
  h+=`</div>
  <div class="jm" style="margin:8px 0 4px">Weighted sets: ${Object.keys(v).filter(m=>MUSN[m]).map(m=>MUSN[m]+' '+v[m]).join(' · ')||'—'}</div>
  <div class="jm" style="margin-bottom:12px">Kept under 60% of each muscle's weekly band, so one of these cannot wreck the week.</div>

  <div class="lbl">Name it</div>
  <input id="genname" placeholder="${esc(s.n)}" value="${esc(GEN.name||'')}" onchange="genSet('name',this.value)">
  <button class="btn p" style="margin-top:11px" onclick="genStart()">Save &amp; start now</button>
  <button class="btn" style="margin-top:7px" onclick="genSave()">Save for later</button>
  <button class="btn gh" style="margin-top:7px" onclick="genAgain()">Regenerate</button>
  <button class="btn gh" style="margin-top:7px" onclick="close_()">Close</button>`;
  return h},

/* ---- PICK A WORKOUT ----
   Juan's answer to the missed-day problem: choose the session yourself instead
   of taking whatever the schedule offers. Shows the programme week first with
   the queue's current pick marked and completed ones ticked, then everything
   else the app can run. Picking does NOT move the queue — the queue advances
   only when a session is actually finished, so choosing Pull on a Thursday
   still leaves the block where it was. */
pick:()=>{const p=curP(),wk=weekDone(),cur=todaySid();
  let h=`<div class="mid">Choose a workout</div>`;
  const ids=Object.keys(p.sessions||{});
  if(ids.length){
    h+=`<div class="jm" style="margin:6px 0 12px">${esc(p.name)} · week ${curWeek()} · ${wk.done} of ${wk.total} done this week. Picking one does not change where you are in the block.</div>`;
    ids.forEach(id=>{const x=p.sessions[id],did=wk.map[id],now=id===cur;
      h+=`<button class="pk ${now?'now':''} ${did?'did':''}" onclick="pickSess('${escId(id)}')">
        <div style="flex:1;min-width:0">
          <div class="pkn">${esc(x.n)}${now?' <span class="pill a">Up next</span>':''}${did?' <span class="pill g">Done</span>':''}</div>
          <div class="pkm">${x.ex.length} exercises · ${x.mins} min · ${esc(x.w==='gym'?'Gym':x.w==='home'?'Home':'Either')}</div>
        </div><span style="color:var(--acc)">›</span></button>`});
  }else{
    h+=`<div class="jm" style="margin:6px 0 12px">No programme running — everything below is fair game.</div>`;
  }
  h+=`<div class="sec">Build one now</div>
    <button class="btn p" onclick="close_();open_('gen')">Generate a workout</button>
    <button class="btn gh" style="margin-top:7px" onclick="close_();newWorkout()">Create one by hand</button>`;
  if(D.mine.length){
    h+=`<div class="sec">Your workouts</div>`;
    D.mine.forEach(mw=>{h+=`<button class="pk" onclick="pickFree('${escId(mw.id)}')">
      <div style="flex:1;min-width:0"><div class="pkn">${esc(mw.n)}</div>
      <div class="pkm">${mw.ex.length} exercises · yours</div></div>
      <span style="color:var(--acc)">›</span></button>`});
  }
  h+=`<div class="sec">Kettlebell complexes</div>`;
  KBXORDER.forEach(k=>{const c=KBX[k];
    h+=`<button class="pk" onclick="close_();startKbx('${escId(k)}')">
      <div style="flex:1;min-width:0"><div class="pkn">${esc(c.n)}</div>
      <div class="pkm">${c.rounds} rounds · ${esc(c.kit)}</div></div>
      <span style="color:var(--acc)">›</span></button>`});
  h+=`<div class="sec">Calisthenics</div>`;
  CALORDER.forEach(k=>{const c=CAL[k];
    h+=`<button class="pk" onclick="close_();startCal('${escId(k)}')">
      <div style="flex:1;min-width:0"><div class="pkn">${esc(c.n)}${c.bench?' <span class="pill a">Benchmark</span>':''}</div>
      <div class="pkm">${esc(c.kind)} · ~${c.mins} min</div></div>
      <span style="color:var(--acc)">›</span></button>`});
  h+=`<div class="sec">Striking</div>`;
  XTRAORDER.forEach(k=>{const x=XTRA[k];
    h+=`<button class="pk" onclick="close_();startXtra('${escId(k)}')">
      <div style="flex:1;min-width:0"><div class="pkn">${esc(x.n)}</div>
      <div class="pkm">${x.mins} min · home</div></div>
      <span style="color:var(--acc)">›</span></button>`});
  if(ids.length){
    h+=`<div class="sec">Other programmes</div>
      <div class="note" style="margin-bottom:10px">Sessions from a block you are not running. They log and count like anything else and do not switch your programme.</div>`;
    PORDER.filter(x=>x!==p.id&&P[x]&&P[x].sessions).forEach(pid=>{
      const op=P[pid];
      Object.keys(op.sessions).forEach(id=>{
        h+=`<button class="pk" onclick="pickOther('${escId(pid)}','${escId(id)}')">
          <div style="flex:1;min-width:0"><div class="pkn">${esc(op.sessions[id].n)}</div>
          <div class="pkm">${esc(op.name)} · ${op.sessions[id].ex.length} exercises</div></div>
          <span style="color:var(--acc)">›</span></button>`});
    });
  }
  return h+`<button class="btn gh" style="margin-top:14px" onclick="close_()">Close</button>`},

/* ---- your own profile ---- */
prof:()=>{const me=curProfile();
  return `<div class="mid">Your profile</div>
  <div class="row" style="gap:13px;margin:14px 0 4px">
    ${avatar(me,'lg')}
    <div style="flex:1;min-width:0">
      <div style="font-size:19px;font-weight:700;line-height:1.2">${esc(me.name)}</div>
      <div class="jm">@${esc(me.user)}${me.owner?' · master account':''}</div>
      <div class="jm">Joined ${esc(me.created||'—')}</div>
    </div></div>
  <div class="row" style="gap:7px;margin:13px 0 4px">
    <button class="btn gh sm" onclick="document.getElementById('mypic').click()">${me.pic?'Change photo':'Add a photo'}</button>
    ${me.pic?`<button class="btn gh sm" onclick="myPicClear()">Remove photo</button>`:''}
    <input type="file" id="mypic" accept="image/*" style="display:none" onchange="myPicPick(this)">
  </div>
  <div class="sec">Display name</div>
  <input id="myn" value="${esc(me.name)}" onchange="myName(this.value)">
  <div class="sec">Change your password</div>
  <input type="password" id="cp0" autocomplete="current-password" placeholder="Current password">
  <input type="password" id="cp1" autocomplete="new-password" placeholder="New password" style="margin-top:8px">
  <input type="password" id="cp2" autocomplete="new-password" placeholder="Confirm new password" style="margin-top:8px">
  <button class="btn" style="margin-top:10px" onclick="myPassword()">Update password</button>
  <div class="jm" style="margin-top:6px">The password keeps other people out of your log. It is not encryption — anyone holding this unlocked phone could still reach the data underneath. Nothing here is uploaded anywhere.</div>
  <div class="sec">Session</div>
  <button class="btn gh" onclick="signOut()">Sign out</button>
  <button class="btn gh" style="margin-top:7px" onclick="close_();open_('accounts')">${isOwner()?'Manage accounts':'Switch to another profile'}</button>
  <button class="btn gh" style="margin-top:14px" onclick="close_()">Close</button>`},

/* ---- MANAGE ACCOUNTS ----
   Master-only administration. A non-owner opening this sees a plain switcher
   and nothing else: no other person's stats, no reset controls, no delete. The
   master can rename, reset a password and delete, but CANNOT read anyone's
   training log from here — switching to a profile still needs that profile's
   password or the master key, and it is logged as a switch, not a peek. */
accounts:()=>{accountStatsReset();const s=profileState(),me=curProfile(),own=isOwner();
  let h=`<div class="mid">${own?'Manage accounts':'Switch profile'}</div>`;
  if(!own){
    h+=`<div class="jm" style="margin:6px 0 13px">Everyone using this phone keeps their own programme, log, PBs and photos. You can switch across, but you will need their password to open it.</div>`;
  }else{
    h+=`<div class="jm" style="margin:6px 0 13px">You are the master account. You can rename, reset a password and remove a profile. This screen does not show anyone's training detail \u2014 opening a profile still means signing into it.</div>`;
  }
  s.list.forEach(p=>{
    const cur=p.id===me.id;
    const stats=own&&!cur?accountStats(p.id):null;
    h+=`<div class="card ${cur?'acc':'flat'}" style="padding:12px">
      <div class="row" style="gap:11px">
        ${avatar(p)}
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:15px">${esc(p.name)}
            ${p.owner?'<span class="pill a">Master</span>':''}
            ${cur?'<span class="pill g">You</span>':''}</div>
          <div class="jm">@${esc(p.user)}${hasPw(p)?'':' · no password set'}</div>
          ${stats?`<div class="jm">${stats.sessions} session${stats.sessions===1?'':'s'} logged${stats.last?' · last '+esc(stats.last):''}</div>`:''}
        </div>
        ${cur?'':`<button class="btn sm gh" onclick="profileSwitch('${escId(p.id)}')">Open</button>`}
      </div>`;
    if(own&&!cur){
      h+=`<div class="row" style="gap:7px;margin-top:9px;flex-wrap:wrap">
        <button class="btn sm gh" onclick="adminRename('${escId(p.id)}')">Rename</button>
        <button class="btn sm gh" onclick="adminReset('${escId(p.id)}')">Reset password</button>
        ${p.owner?'':`<button class="btn sm gh" style="color:var(--bad)" onclick="profileDel('${escId(p.id)}')">Delete</button>`}
      </div>`;
    }
    h+=`</div>`;
  });
  h+=`<div class="sec">Add someone</div>
    <div class="note" style="margin-bottom:10px">Sign out and use <b>Create a new profile</b> on the login screen — that way they set their own password and it is never one you know.</div>
    <button class="btn gh" onclick="signOut()">Sign out to add someone</button>
    <button class="btn gh" style="margin-top:14px" onclick="close_()">Close</button>`;
  return h},

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

mob:k=>{const list=ZONES[k],z=MOBZONES.find(x=>x.k===k),done=D.mobility[todayISO()];
  if(!list)return '<div class="mid">Unknown zone</div>';
  const sc=mobScores();
  const M={n:(z&&z.n)||k,ex:list};
  return `<div class="mid">${esc(M.n)} mobility</div>
    ${sc[k]!==undefined?`<div class="row" style="gap:6px;margin-top:8px">
      <span class="pill ${mobWeak().indexOf(k)>=0?'a':'g'}">GoWod ${sc[k]}</span>
      ${mobWeak().indexOf(k)>=0?'<span class="pill a">One of your weak three</span>':''}</div>`:''}
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
      <span class="pill">${p.weeks?p.weeks+' weeks':'Open-ended'}</span>
      <span class="pill">${p.days?p.days+' days/week':'Your call'}</span>
      <span class="pill">${esc(p.where)}</span><span class="pill">${esc(p.bias)}</span>
      ${p.fst?'<span class="pill a">FST-7</span>':''}${p.pavel?'<span class="pill a">Pavel rules</span>':''}
      ${p.bare?'<span class="pill a">Bare Mode</span>':''}</div>
    <div class="note">${esc(p.why)}</div>
    <div class="sec">The week</div>
    <div class="note">${!p.schedule
      ? 'No fixed week. You choose each day \u2014 any programme\u2019s session, a complex, a benchmark, one of your own, or one the generator builds you.'
      : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>{const x=p.schedule[i];
        return `<b>${d}</b> \u2014 ${x==='rest'?'Rest':x==='sport'?'Sport':esc(p.sessions[x].n)+' <span style="color:var(--tx3)">('+p.sessions[x].mins+' min)</span>'}`}).join('<br>')}</div>
    <div class="sec">Blocks</div>
    <div class="note">${p.blocks.map(b=>`<b>Weeks ${b.f}${b.t>b.f?'–'+b.t:''} · ${esc(b.type)}</b><br><span style="color:var(--tx2)">${esc(b.note)}</span>`).join('<br><br>')}</div>
    ${on?`<div class="card" style="margin-top:16px;background:var(--s2)"><div class="lbl">Active</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="jm" style="margin-top:7px">${p.weeks?pct+'% through. Week '+curWeek()+' of '+p.weeks+'.':'Running with no block. Nothing to fall behind on.'}</div>
      ${p.weeks?`<button class="btn gh" style="margin-top:10px" onclick="restart()">Restart from week 1</button>`:''}</div>`
    :`<button class="btn p" style="margin-top:16px" onclick="switchTo('${id}')">Start this programme</button>`}
    <button class="btn gh" style="margin-top:7px" onclick="close_()">Close</button>`},

hop:id=>{const p=P[id],cp=curP(),pct=progPct();
  /* Nothing to defend when the current programme has no block to finish. */
  if(!cp.weeks)return `<div class="mid">Start ${esc(p.name)}?</div>
    <div class="note" style="margin:11px 0 14px">You are on ${esc(cp.name)}, which has no block to finish \u2014 switching costs you nothing.</div>
    <button class="btn p" onclick="doSwitch('${escId(id)}')">Start ${esc(p.name)}</button>
    <button class="btn gh" style="margin-top:7px" onclick="close_()">Stay where I am</button>`;
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

/* ---- THE DAILY 15 ----
   Tonight's rotating full-body routine. Each movement is labelled with the zone
   it comes from and flagged when that zone is one of the weak three, so it is
   obvious WHY a given stretch is in tonight's list. */
daily15:()=>{const k=todayISO(),done=D.mobility[k],list=mobDaily(k),weak=mobWeak();
  const sc=mobScores();
  let h=`<div class="mid">The daily 15</div>
  <div class="note" style="margin:8px 0 13px">Six movements, about fifteen minutes, full body. It changes every day so you cover the whole range over a fortnight, but your weakest zones come round roughly twice as often as the rest — right now that is ${esc(weak.map(mobZoneName).join(', '))}. Slow, unrushed, breathe out into each one.</div>`;
  list.forEach(x=>{const w=weak.indexOf(x.z)>=0;
    h+=`<div class="card ${w?'grn':''}" style="background:var(--s2)">
      <div class="row sp"><span style="font-weight:600;font-size:15px">${esc(x.n)}</span>
        <span class="pill">${esc(x.d)}</span></div>
      <div class="row" style="gap:6px;margin-top:6px">
        <span class="pill ${w?'a':''}">${esc(mobZoneName(x.z))}${sc[x.z]!==undefined?' '+sc[x.z]:''}</span>
        ${w?'<span class="pill a">Weak point</span>':''}</div>
      <div class="note" style="margin-top:6px">${esc(x.c)}</div></div>`});
  h+=`<button class="btn ${done?'':'p'}" style="margin-top:12px" onclick="mobDone()">${done?'Done today ✓':'Mark complete'}</button>
    <button class="btn gh" style="margin-top:7px" onclick="close_();open_('mobzones')">Focus one zone instead</button>
    <button class="btn gh" style="margin-top:7px" onclick="close_()">Close</button>`;
  return h},

/* ---- ZONE PICKER ---- */
mobzones:()=>{const sc=mobScores(),weak=mobWeak();
  let h=`<div class="mid">Mobility zones</div>
  <div class="note" style="margin:8px 0 13px">The six zones GoWod scores you on. Your numbers are shown against each — the three lowest drive what comes up in the daily 15.</div>`;
  MOBZONES.slice().sort((a,b)=>(sc[a.k]||100)-(sc[b.k]||100)).forEach(z=>{
    const w=weak.indexOf(z.k)>=0,v=sc[z.k];
    h+=`<button class="pk ${w?'now':''}" onclick="close_();open_('mob','${escId(z.k)}')">
      <div style="flex:1;min-width:0">
        <div class="pkn">${esc(z.n)} ${v!==undefined?`<span class="pill ${w?'a':'g'}">${v}</span>`:''}</div>
        <div class="pkm">${esc(z.d)}</div>
        ${v!==undefined?`<div class="bar" style="margin-top:7px"><i style="width:${Math.max(3,Math.min(100,v))}%"></i></div>`:''}
      </div><span style="color:var(--acc)">›</span></button>`});
  h+=`<button class="btn" style="margin-top:12px" onclick="close_();open_('assess')">Update my scores</button>
    <button class="btn gh" style="margin-top:7px" onclick="close_()">Close</button>`;
  return h},

assess:()=>{const sc=mobScores();
  return `<div class="mid">Mobility scores</div>
  <div class="note" style="margin:9px 0 14px">The six GoWod zones, scored out of 100. Put your latest numbers in after a reassessment — the three lowest are what the daily 15 weights toward, so keeping these current is what keeps the routine pointed at the right thing.</div>
  ${MOBZONES.map(z=>`<div style="margin-bottom:11px">
    <div class="tiny">${esc(z.n)} <span style="color:var(--tx3)">— ${esc(z.d)}</span></div>
    <input type="number" id="a_${z.k}" min="0" max="100" placeholder="0–100" value="${sc[z.k]!==undefined?sc[z.k]:''}"></div>`).join('')}
  <button class="btn p" onclick="logAssess()">Save scores</button>
  <button class="btn gh" style="margin-top:7px" onclick="close_()">Cancel</button>`},

note:()=>{const l=curLog();return `<div class="mid">Session notes</div>
  <textarea id="sn" rows="5" style="margin-top:11px" placeholder="How did it feel? Anything to remember for next time?">${esc(l&&l.note||'')}</textarea>
  <button class="btn p" style="margin-top:11px" onclick="saveNote()">Save</button>`},

build:()=>{const B=BUILD;if(!B)return '<div class="mid">Nothing to edit</div>';
  const opts=exOptions();   // Kettlebell · Rings · Calisthenics · Gym · Cardio
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

addex:()=>{const opts=exOptions();   // Kettlebell · Rings · Calisthenics · Gym · Cardio
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
/* ================= THE DAILY 15 =================
   A rotating full-body routine rather than one deep zone per day. Six movements,
   roughly fifteen minutes, different most days, and weighted so the zones Juan
   actually scores badly on come up about twice as often as the ones he does not.

   The weighting is the point. A flat rotation gives Thorax — which he scores 94
   on — exactly as much airtime as Ankles at 50, which is a waste of the only
   fifteen minutes a day anyone reliably has. Weak zones get two slots, strong
   ones get one, and the day number rotates WITHIN each zone so the same six
   movements do not come up every time.

   Deterministic on the date: the same day always builds the same routine, so
   closing the app and reopening it does not reshuffle a session in progress. */
/* Scores come from THIS profile's record only. MOBSCORES is Juan's reference
   data and is seeded into his record by migrate(); using it as a live fallback
   would hand every new member Juan's GoWod numbers, which is the same bug as a
   new profile inheriting his 84kg bodyweight. Somebody who has not been
   assessed has no scores, and the app should say so rather than invent them. */
function mobScores(){return Object.assign({},(D.settings&&D.settings.mob)||{})}
/* Seed Juan's own GoWod scores into HIS record, exactly once.

   Lives here, in app.js, NOT in migrate() — migrate() is in the inline script
   that runs before data.js, where MOBSCORES does not yet exist. The first
   version put it there and the seed was permanently dead.

   Gated on the OWNER profile and a one-time flag. Keying it off "does this
   record have logs" would be wrong for exactly the reason DEF's body stats
   were: a new member who logs one workout would then be handed Juan's mobility
   numbers. */
function seedMobScores(){
  if(!D.settings)return;
  D.settings.mob=D.settings.mob||{};
  if(D.settings.mobSeeded)return;
  D.settings.mobSeeded=true;
  if(isOwner()&&!Object.keys(D.settings.mob).length&&typeof MOBSCORES!=='undefined')
    D.settings.mob=JSON.parse(JSON.stringify(MOBSCORES));
  save();
}
/* The three lowest-scoring zones. Empty when nothing has been scored — an
   unassessed person gets an even rotation rather than a weighting built on
   numbers that are not theirs. */
function mobWeak(){
  const s=mobScores();
  const scored=MOBZONES.map(z=>z.k).filter(k=>typeof s[k]==='number');
  if(scored.length<3)return [];
  return scored.sort((a,b)=>s[a]-s[b]).slice(0,3);
}
/* Zone slots for a given day, weakest zones appearing twice.

   The pool is 9 long — six zones plus a repeat of each weak one — and six are
   drawn from it. The FIRST version walked the pool with a fixed stride and
   rotated within each zone by the day number, which gave the whole thing a
   period of six: exactly six routines existed, repeating forever, while the
   comment above claimed "different every day". Both the zone draw and the
   movement choice are now driven by a seeded shuffle, so the routine is still
   perfectly deterministic for a given date but genuinely varied across months. */
function mobPlan(dayN){
  const weak=mobWeak();
  const pool=[];
  MOBZONES.forEach(z=>{pool.push(z.k);if(weak.indexOf(z.k)>=0)pool.push(z.k)});
  const rnd=genRand(dayN*2654435761%2147483647||1);
  /* Fisher-Yates on a copy, then take six. Shuffling rather than striding is
     what removes the short period; the weak zones keep their extra entries, so
     the weighting survives untouched. */
  const a=pool.slice();
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=a[i];a[i]=a[j];a[j]=t}
  return a.slice(0,6);
}
function mobDaily(dateISO){
  const k=dateISO||todayISO();
  /* days since epoch — stable, and independent of timezone drift */
  const dayN=Math.floor(ymd(k)/864e5);
  const plan=mobPlan(dayN),seen={},out=[];
  const rnd=genRand(dayN*40503%2147483647||1);
  plan.forEach((z,i)=>{
    const list=ZONES[z]||[];
    if(!list.length)return;
    /* Start from a seeded offset and walk forward until an unused movement is
       found, so a zone appearing twice in one day gives two DIFFERENT
       movements rather than the same one repeated. */
    const off=Math.floor(rnd()*list.length);
    for(let t=0;t<list.length;t++){
      const x=list[(off+t)%list.length];
      const id=z+'|'+x.n;
      if(seen[id])continue;
      seen[id]=1;out.push(Object.assign({z:z},x));break;
    }
  });
  return out;
}
function mobZoneName(k){const z=MOBZONES.find(x=>x.k===k);return (z&&z.n)||k}
function mobDone(){D.mobility[todayISO()]=true;const d=todayISO();
  D.journal[d]=D.journal[d]||{};D.journal[d].mobility=true;save();close_()}
function switchTo(id){progPct()<70&&D.active.id!==id?open_('hop',id):doSwitch(id)}
function doSwitch(id){
  /* Switching away from a finished block banks the SAME full summary the
     automatic completion does. It used to push a bare {id,end} stub, which is
     a record that a block happened and nothing about what it produced. */
  if(progPct()>=100&&!D.active.done&&curP().weeks){
    D.completed=D.completed||[];
    D.completed.push(blockSummary());
  }
  /* qi:0 explicitly, NOT undefined. Leaving it unset makes queueSync seed from
     the weekday, which is right when MIGRATING an existing programme and wrong
     for a new one — starting a 10-week block on a Sunday put you in week 2 the
     following morning. A new programme starts at the start. */
  D.active={id:id,start:todayISO(),week:1,qi:0,qd:todayISO(),q0:todayISO()};
  save();close_();go('today')}
function restart(){
  /* Queue mode does not read D.active.start, so moving the start date alone
     left the cursor — and therefore the week and the progress bar — untouched.
     Restart has to move the thing the engine actually uses. */
  const t=todayISO();
  D.active.start=t;D.active.qi=0;D.active.qd=t;D.active.q0=t;
  save();close_();go('today')}
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
function logAssess(){
  const o={d:todayISO()},keep={};
  MOBZONES.forEach(z=>{
    const el=document.getElementById('a_'+z.k);
    if(!el)return;
    const raw=String(el.value==null?'':el.value).trim();
    if(raw==='')return;                       // left blank = leave it as it was
    const v=Number(raw);
    if(isNaN(v))return;
    /* 0 is a REAL score — the most-weak-possible one — and the old `v>0` check
       silently threw it away. 250 is not a real score; the min/max on the input
       are hints the browser does not enforce on read, so clamp here. */
    const c=Math.max(0,Math.min(100,Math.round(v)));
    o[z.k]=c;keep[z.k]=c;
  });
  if(!Object.keys(keep).length){alert('Put at least one score in.');return}
  D.assess.push(o);
  /* Latest scores live on settings so the daily-15 weighting reads them without
     digging through the assessment history on every render. */
  D.settings.mob=Object.assign({},D.settings.mob||{},keep);
  save();close_();render();}
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
/* Restoring REPLACES everything in the current profile. It used to do that with
   no confirmation and no check that the file was even a JHFP backup, so one
   mis-tap in the file picker wiped a training history. Now it verifies the
   shape, says what it is about to overwrite, and makes you agree. */
function impJSON(inp){
  const f=inp.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    let raw=null;
    try{raw=JSON.parse(e.target.result)}
    catch(x){alert('That file could not be read — it is not a JHFP backup.');inp.value='';return}
    if(!raw||typeof raw!=='object'||!('logs' in raw)||!('settings' in raw)){
      alert('That does not look like a JHFP backup — it has no training log in it. Nothing was changed.');
      inp.value='';return;
    }
    const days=Object.keys(raw.logs||{}).length;
    const mine=Object.keys(D.logs||{}).length;
    if(!confirm('Restore '+days+' logged day'+(days===1?'':'s')+' into '+curProfile().name+'?\n\n'
      +'This REPLACES everything currently in this profile'
      +(mine?' — including the '+mine+' day'+(mine===1?'':'s')+' already logged here':'')
      +'. It cannot be undone.')){inp.value='';return}
    /* Keep the live record so a failed write can be rolled back. Without this,
       D was replaced in memory before save() was checked: the alert said
       "nothing was changed on disk" — true for one tick — and then the next
       ordinary save (ticking a set) wrote the rejected import over the real
       record. A refused restore has to leave NO trace. */
    const prevD=D,prevCorrupt=CORRUPT;
    try{
      D=migrate(deep(DEF,raw));
      CORRUPT=false;                 // a good restore clears a corrupt-record lock
      if(save()){render();alert('Restored.')}
      else{
        D=prevD;CORRUPT=prevCorrupt;
        alert('The restore could not be saved — this phone is out of storage. Nothing was changed.');
      }
    }catch(x){
      D=prevD;CORRUPT=prevCorrupt;
      alert('That file could not be restored: '+x.message);
    }
    inp.value='';
  };
  r.readAsText(f);
}
function expObs(){
  const p=curP();let m='---\ntype: log\nsource: JHFP\ntags: [health, fitness, jhfp]\n---\n\n';
  m+='# JHFP training log — '+todayISO()+'\n\n';
  m+='**Programme:** '+p.name+(p.weeks?' · week '+curWeek()+' of '+p.weeks+' ('+progPct()+'% complete)':' · no block, self-directed')+'  \n';
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
    m+='\n## Mobility\n\n'+MOBZONES.map(z=>z.n+' '+(mobScores()[z.k]!==undefined?mobScores()[z.k]:'—')).join(' · ')
      +'  \n_Weak three: '+mobWeak().map(mobZoneName).join(', ')+' · last scored '+a.d+'_\n'}
  m+='\n---\n*Exported from JHFP. Save to iCloud Drive → Obsidian Vault → Health.*\n';
  dl('JHFP-'+todayISO()+'.md',m,'text/markdown');
}

/* ================= BOOT =================
   Order matters and every line of it was a bug at some point.

   1. Nothing is saved before we know who is signed in. save() is a no-op
      without a key anyway, but calling it here used to overwrite a corrupt
      record with an empty one before anybody had typed a password.
   2. The gate decides whether the app may paint AT ALL. render() only runs
      once past it — an unsigned-in app that has already painted somebody's
      log has already leaked it, and painting it "behind" the gate is still
      painting it.
   3. The whole thing is wrapped. `.gated` is on <html> by default, and
      gateDone() is the only thing that clears it, so ANY exception thrown
      before that point used to leave a permanently blank dark screen with no
      way back to the data. Now a crash shows a recovery panel instead.
   4. BOOTFAILED is declared FIRST. `let` is not hoisted into a usable state,
      so declaring it below the try meant the catch block's own first line
      threw a temporal-dead-zone error and buried the real one. Same class of
      bug as CORRUPT in index.html — in error-handling code, which is where it
      does the most damage. Declarations before the code that uses them. */
let BOOTFAILED=false;
/* Late errors are just as capable of stranding someone on a blank screen — and
   gating this listener on `.gated` was wrong for exactly the same reason the
   panel was invisible: on a signed-in boot `.gated` is already gone, so the one
   situation that most needs catching was the one it ignored. Fire once, for the
   first error only, so a render loop cannot spam the panel over itself. */
window.addEventListener('error',e=>{
  if(BOOTFAILED)return;
  BOOTFAILED=true;
  bootFail(e.error||e.message);
});

/* The actual boot. Everything it can lean on — BOOTFAILED, the error listener,
   bootFail, rescueExport — is in place above it before it runs. */
try{
  if(!gateBoot()){ seedMobScores(); save(); render(); }
}catch(err){
  BOOTFAILED=true;
  bootFail(err);
}

function bootFail(err){
  try{console.error('JHFP boot failed',err)}catch(e){}
  const c=document.getElementById('gatec');
  if(!c)return;
  /* The panel lives inside #gate. On a signed-in boot gateDone() has ALREADY
     hidden #gate by the time anything downstream can throw, so writing the
     recovery panel without re-showing it produced a perfectly-built screen
     nobody could see — the exact blank-screen brick this function exists to
     prevent. Force the gate back up before painting into it. */
  const g=document.getElementById('gate');
  if(g)g.classList.remove('hidden');
  document.documentElement.classList.add('gated');
  c.innerHTML=`<img class="gmark" src="icon.png" alt="">
    <div class="gtitle">Something went wrong</div>
    <div class="gsub">Protocol</div>
    <div class="gcard">
      <div class="gerr">${esc(String((err&&err.message)||err||'Unknown error'))}</div>
      <div class="jm" style="margin-bottom:13px">Your training data has NOT been touched — it is still on this phone. Try these in order.</div>
      <button class="btn" onclick="location.reload()">Reload the app</button>
      <button class="btn gh" style="margin-top:7px" onclick="STORE.del('jhfp_session');location.reload()">Sign out and reload</button>
      <button class="btn gh" style="margin-top:7px" onclick="rescueExport()">Download a copy of my data</button>
      <div class="jm" style="margin-top:10px">If the download works, your log is safe whatever happens next. Send it to Juan and he can restore it.</div>
    </div>`;
}
/* Deliberately does not use any app state — it reads raw localStorage, so it
   still works when the thing that crashed is the app itself. */
function rescueExport(){
  try{
    const out={};
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);
      if(/^jhfp/.test(k))out[k]=localStorage.getItem(k)}
    const b=new Blob([JSON.stringify(out,null,1)],{type:'application/json'});
    const u=URL.createObjectURL(b),a=document.createElement('a');
    a.href=u;a.download='JHFP-rescue-'+new Date().toISOString().slice(0,10)+'.json';
    a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
  }catch(e){alert('Could not build the file: '+e.message)}
}
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
