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
function sessById(id){if(!id)return null;return curP().sessions[id]||D.custom[id]||null}
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
function target(ex,mod){
  const L=lastLog(ex.n), rng=parseRange(ex.r), sets=setsFor(ex,mod);
  if(!L)return{txt:'First time — find a load you can control for '+ex.r+'. Log it and I\'ll progress it from here.',prev:null};
  const done=L.e.sets.filter(s=>s.done&&(s.r||s.w));
  if(!done.length)return{txt:'Repeat last session and log it.',prev:null};
  const bw=done.every(s=>!s.w||+s.w===0);
  const best=done.reduce((a,s)=>(+s.w>+a.w?s:a),done[0]);
  const prev=done.map(s=>(s.w?fmt(s.w,+s.w%1?1:0)+'kg×':'')+ (s.r||'—')).join('  ');
  if(bw){
    const tot=done.reduce((a,s)=>a+(+s.r||0),0);
    return{txt:'Last time: '+prev+'  ('+tot+' total). Beat the total today.',prev:prev};
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
    l.ex.forEach(e=>{const n=(e.sets||[]).filter(s=>s.done).length; if(n)addVol(out,e.n,n)});}
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
const SILH='<ellipse cx="100" cy="28" rx="17.5" ry="21"/>'
+'<path d="M91,46 q9,7 18,0 l3,10 q-11,6 -24,0 Z"/>'
+'<path d="M79,58 Q100,50 121,58 Q139,66 143,104 Q145,150 139,190 Q135,216 131,240 '
+'L69,240 Q65,216 61,190 Q55,150 57,104 Q61,66 79,58 Z"/>'
+'<path d="M62,74 Q46,84 42,116 Q38,156 36,196 Q35,236 38,256 Q46,263 54,256 '
+'Q58,218 60,178 Q63,138 70,104 Z"/>'
+'<path d="M138,74 Q154,84 158,116 Q162,156 164,196 Q165,236 162,256 Q154,263 146,256 '
+'Q142,218 140,178 Q137,138 130,104 Z"/>'
+'<path d="M72,242 Q64,276 67,304 Q69,332 73,344 Q75,382 77,404 Q85,412 95,404 '
+'Q97,372 97,344 Q100,304 99,242 Z"/>'
+'<path d="M128,242 Q136,276 133,304 Q131,332 127,344 Q125,382 123,404 Q115,412 105,404 '
+'Q103,372 103,344 Q100,304 101,242 Z"/>';
const AF={
traps:["M97,54 L82,60 Q70,66 64,78 L95,72 Z"],
delts:["M64,76 Q50,82 46,102 Q45,118 53,126 Q64,120 70,104 Q72,88 69,78 Z"],
chest:["M98,76 L72,82 Q63,92 66,106 Q78,118 98,116 Z","M98,118 L70,110 Q64,120 68,130 Q82,138 98,134 Z"],
biceps:["M52,128 Q44,146 46,168 Q51,180 60,176 Q66,154 64,130 Z"],
forearms:["M47,182 Q40,204 41,230 Q46,246 55,240 Q61,214 59,184 Z"],
core:["M88,124 h11 v15 h-11 Z","M88,142 h11 v15 h-11 Z","M88,160 h11 v15 h-11 Z",
"M88,178 h11 v15 h-11 Z","M89,196 h10 v18 q-6,8 -10,0 Z",
"M82,126 Q74,150 77,182 Q84,198 87,194 L87,128 Z"],
quads:["M77,246 Q66,272 68,300 Q73,328 84,330 Q90,306 91,268 L91,248 Z",
"M93,250 L97,250 Q97,296 92,322 Q87,326 85,318 Q90,286 90,254 Z"],
calves:["M79,348 Q71,368 73,392 Q79,406 88,401 Q93,376 92,350 Z"]};
const AB={
traps:["M98,52 L80,60 Q66,70 62,84 Q68,102 78,114 Q88,122 98,124 Z"],
delts:["M64,76 Q50,82 46,102 Q45,118 53,126 Q64,120 70,104 Q72,88 69,78 Z"],
back:["M70,90 Q58,108 62,138 Q74,166 92,178 L98,176 L98,96 Z","M86,180 Q80,196 84,212 Q92,218 98,214 L98,180 Z"],
triceps:["M52,128 Q43,146 45,168 Q50,180 59,176 Q66,154 64,130 Z"],
forearms:["M47,182 Q40,204 41,230 Q46,246 55,240 Q61,214 59,184 Z"],
glutes:["M97,192 Q77,194 69,210 Q66,232 77,242 Q90,242 97,232 Z"],
hams:["M78,248 Q68,274 70,302 Q76,324 85,324 Q91,302 92,258 Z",
"M94,252 L97,252 Q97,296 93,318 Q89,322 87,314 Q92,288 92,256 Z"],
calves:["M79,346 Q72,362 74,382 Q80,394 87,390 Q91,368 90,348 Z",
"M91,350 Q95,368 92,390 Q88,398 84,394 Q88,372 87,350 Z"]};
function heatFill(v,m){const L=LAND[m]||[6,10,20];
  if(!v||v<=0)return['none',0];
  if(v<L[0])return['var(--acc)',.25];
  if(v<L[1])return['var(--acc)',.5];
  if(v<=L[2])return['var(--acc)',.92];
  return['var(--warn)',.92];}
function figure(parts,v,label){
  let o='<svg viewBox="0 0 200 430" width="100%" role="img" aria-label="'+label+' view muscle heat map">'
   +'<g fill="none" stroke="var(--tx3)" stroke-width="1.2" stroke-linejoin="round" opacity=".75">'+SILH+'</g>';
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
function isCardio(e){return !!(e&&e.k&&CARDIO[e.k])}
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

/* ================= REST TIMER ================= */
function tStart(sec){TSEC=sec||D.settings.restDefault;const el=document.getElementById('timer');
  el.classList.add('on');clearInterval(TMR);
  const tick=()=>{document.getElementById('tmt').textContent='Rest '+Math.floor(TSEC/60)+':'+String(TSEC%60).padStart(2,'0');
    if(TSEC<=0){tStop();if(navigator.vibrate)navigator.vibrate([200,80,200])}TSEC--};
  tick();TMR=setInterval(tick,1000)}
function tAdd(s){TSEC+=s}
function tStop(){clearInterval(TMR);document.getElementById('timer').classList.remove('on')}

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
            <input type="number" inputmode="decimal" value="${esc(L.c[f[0]]||'')}"
              onchange="cardioSet(${i},'${f[0]}',this.value)"></div>`).join('')}</div>
          ${C.pace&&L.c.km&&L.c.min?`<div class="tgt" style="margin-top:9px">Pace ${pace(+L.c.km,+L.c.min)}${(+L.c.km>=4.8&&+L.c.km<=5.4)?' \u00b7 this counts as a 5k \u2014 log it under Benchmarks if it is a PB':''}</div>`:''}
          <div class="grid2" style="margin-top:9px">
            <div><div class="tiny">Calories</div><input type="number" inputmode="numeric"
              placeholder="${estKcal(ex.k,+L.c.min||0)||'\u2014'}" value="${esc(L.c.kcal||'')}"
              onchange="cardioSet(${i},'kcal',this.value)"></div>
            <div><div class="tiny">Effort 1\u201310</div><input type="number" inputmode="numeric" min="1" max="10"
              value="${esc(L.c.effort||'')}" onchange="cardioSet(${i},'effort',this.value)"></div></div>
          <button class="btn ${L.c.done?'':'p'}" style="margin-top:10px" onclick="cardioDone(${i})">${L.c.done?'Logged \u2713':'Log it'}</button>
        </div></div>`;
      return;
    }
    h+=`<div class="ex ${dn?'done':''}">
      <div class="exh" onclick="tgl(${i})">
        <div style="flex:1"><div class="exn">${esc(ex.n)}${ex.fst?' <span class="pill a" style="vertical-align:2px">FST-7</span>':''}</div>
        <div class="exm">${setsFor(ex,b.mod)} × ${esc(ex.r)}${ex.t?' · '+esc(ex.t):''} · rest ${ex.rest?ex.rest+'s':'none'}</div></div>
        <div class="pill ${dn?'g':''}">${L.sets.filter(x=>x.done).length}/${L.sets.length}</div></div>
      <div class="exb" id="exb${i}" style="display:${dn?'none':'block'}">
        <div class="tgt">${esc(T.txt)}</div>
        <div class="st" style="color:var(--tx3);font-size:11px"><span></span><span class="u">KG</span><span class="u">REPS</span><span class="u"></span><span class="u"></span></div>`;
    L.sets.forEach((st,j)=>{
      h+=`<div class="st"><span>${j+1}</span>
        <input type="number" inputmode="decimal" placeholder="—" value="${esc(st.w)}" onchange="setV(${i},${j},'w',this.value)">
        <input type="number" inputmode="numeric" placeholder="—" value="${esc(st.r)}" onchange="setV(${i},${j},'r',this.value)">
        <button class="tick ${st.done?'on':''}" onclick="setDone(${i},${j},${ex.rest||0})">${CHK}</button>
        <button class="tick" onclick="delSet(${i},${j})" aria-label="Remove set" style="font-size:18px;line-height:1">−</button></div>`});
    h+=`<div class="row" style="gap:7px;margin-top:8px">
        <button class="btn sm gh" onclick="addSet(${i})">+ Set</button>
        <button class="btn sm gh" onclick="open_('ex','${encodeURIComponent(ex.n)}')">Cues</button>
        ${ex.t?`<button class="btn sm gh" onclick="open_('tech','${encodeURIComponent(ex.t)}')">${esc(ex.t)}</button>`:''}
      </div></div></div>`;
  });

  if(s.fin)h+=`<div class="card"><div class="lbl">Finisher</div><div class="note">${esc(s.fin)}</div>
    <div class="warnbox" style="margin-top:9px">Bike, rower, sled or hill sprints by preference. Flat running is the one that competes with your lifting — hills are concentric-dominant and cost far less.</div></div>`;

  h+=`<div class="card red"><div class="lbl">Session burn &amp; effort</div>
    <div class="grid2">
      <div><div class="tiny">Calories</div><input type="number" inputmode="numeric"
        placeholder="auto" value="${esc(log.kcal||'')}" onchange="logSet('kcal',this.value)"></div>
      <div><div class="tiny">Effort 1\u201310</div><input type="number" inputmode="numeric" min="1" max="10"
        placeholder="\u2014" value="${esc(log.effort||'')}" onchange="logSet('effort',this.value)"></div>
    </div>
    <div class="jm" style="margin-top:7px">Leave calories blank and I'll estimate from the work you logged. Effort is your read, not a formula \u2014 it is what tells the deload apart from the grind.</div></div>`;

  const allDone=log.ex.every(e=>e.sets.some(x=>x.done)||(e.c&&e.c.done));
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
  if(c.done&&!c.kcal){const ex=(sessFor().ex.concat(l.extra||[]))[i];c.kcal=estKcal(ex.k,+c.min||0)}
  save();rTrain()}
function setDone(i,j,rest){const l=curLog(),st=l.ex[i].sets[j];st.done=!st.done;
  if(st.done&&rest)tStart(rest);save();rTrain()}
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
  if(start)freeSession(BUILD.id); else {close_();go('more')}}
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

  h+=`<div class="sec">Data</div>
    <button class="btn" onclick="expObs()">Export to Obsidian (.md)</button>
    <div class="jm" style="margin:6px 0 12px">Save to Files → iCloud Drive → Obsidian Vault → Health. No Obsidian app needed on the phone.</div>
    <button class="btn gh" onclick="expJSON()">Backup all data (.json)</button>
    <button class="btn gh" style="margin-top:7px" onclick="document.getElementById('imp').click()">Restore from backup</button>
    <input type="file" id="imp" accept=".json" style="display:none" onchange="impJSON(this)">
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

/* ================= SHEETS ================= */
const SHEETS={
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
    const pp=P[l.pid]||p, ss=pp.sessions[l.sid];
    m+='### '+k+' — '+(ss?ss.n:l.sid)+'\n\n';
    l.ex.forEach(e=>{const s=e.sets.filter(x=>x.done);if(!s.length)return;
      m+='- **'+e.n+'** — '+s.map(x=>(x.w?x.w+'kg × ':'')+(x.r||'—')).join(', ')+'\n'});
    if(l.note)m+='\n> '+l.note+'\n';m+='\n'});
  m+='## Lift PBs\n\n';
  Object.keys(D.pbs).forEach(n=>{m+='- '+n+' — '+D.pbs[n].w+'kg × '+D.pbs[n].r+' ('+D.pbs[n].d+')\n'});
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
