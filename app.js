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
function sessFor(day){const s=slotFor(day);return (s==='rest'||s==='sport')?null:curP().sessions[s]}
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

/* ================= RENDER ROUTER ================= */
function render(){
  const p=curP(),w=curWeek(),b=blockFor(p,w);
  document.documentElement.dataset.t=D.settings.theme;
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
    h+=`<div class="card" style="border-color:var(--accdim)">
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
    <div class="card flat" style="margin:0"><div class="tiny">Streak</div><div class="big" style="color:var(--acc)">${st}</div></div>
    <div class="card flat" style="margin:0"><div class="tiny">Protocol</div><div class="big">${jd}<span style="font-size:15px;color:var(--tx3)">/${JOURNAL.length}</span></div></div>
    <div class="card flat" style="margin:0"><div class="tiny">Block</div><div class="big">${progPct()}<span style="font-size:15px;color:var(--tx3)">%</span></div></div>
  </div>`;

  h+=`<div class="card"><div class="row sp" style="margin-bottom:4px">
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
  h+=`<div class="card"><div class="row sp"><div class="lbl" style="margin:0">Tonight's mobility · ${esc(M.n)}</div>
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
      <div class="tabs">${Object.keys(p.sessions).map(id=>`<button class="tab" onclick="freeSession('${id}')">${esc(p.sessions[id].n)}</button>`).join('')}</div>`;
    document.getElementById('v-train').innerHTML=h;return;
  }
  D.logs[k]=D.logs[k]||{sid:slot,pid:p.id,week:w,ex:[],done:false,start:Date.now()};
  const log=D.logs[k];
  s.ex.forEach(ex=>{if(!log.ex.find(x=>x.n===ex.n)){
    log.ex.push({n:ex.n,sets:Array.from({length:setsFor(ex,b.mod)},()=>({w:'',r:'',done:false}))})}});

  h+=`<div class="card" style="border-color:var(--accdim)">
    <div class="row sp"><span class="pill a">${esc(s.w==='gym'?'Gym':s.w==='home'?'Home':s.w==='out'?'Outdoors':'Either')}</span>
    <span class="pill">${esc(b.type)} · wk ${w}/${p.weeks}</span></div>
    <div class="mid" style="margin:9px 0 4px">${esc(s.n)}</div>
    <div class="note">${esc(b.note)}</div></div>`;

  s.ex.forEach((ex,i)=>{
    const L=log.ex.find(x=>x.n===ex.n),T=target(ex,b.mod),info=EX[ex.n]||{m:[],c:''};
    const dn=L.sets.every(x=>x.done);
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

  const allDone=log.ex.every(e=>e.sets.some(x=>x.done));
  h+=`<button class="btn ${allDone?'p':''}" style="margin:14px 0 6px" onclick="finish()">${log.done?'Session logged ✓':'Finish session'}</button>
    <button class="btn gh" style="margin-bottom:20px" onclick="open_('note')">Session notes</button>`;
  document.getElementById('v-train').innerHTML=h;
}
function tgl(i){const e=document.getElementById('exb'+i);e.style.display=e.style.display==='none'?'block':'none'}
function curLog(){return D.logs[todayISO()]}
function setV(i,j,f,v){const l=curLog();l.ex[i].sets[j][f]=v;save()}
function setDone(i,j,rest){const l=curLog(),st=l.ex[i].sets[j];st.done=!st.done;
  if(st.done&&rest)tStart(rest);save();rTrain()}
function addSet(i){curLog().ex[i].sets.push({w:'',r:'',done:false});save();rTrain()}
function delSet(i,j){const s=curLog().ex[i].sets;if(s.length>1)s.splice(j,1);save();rTrain()}
function finish(){
  const l=curLog();l.done=true;l.dur=Math.round((Date.now()-(l.start||Date.now()))/1000);
  const d=todayISO();D.journal[d]=D.journal[d]||{};D.journal[d].workout=true;
  l.ex.forEach(e=>{e.sets.filter(x=>x.done&&+x.w>0).forEach(x=>{
    if(!D.pbs[e.n]||+x.w>+D.pbs[e.n].w)D.pbs[e.n]={w:+x.w,r:+x.r||0,d:d}})});
  save();open_('done')}
function rescue(){open_('rescue')}
function freeSession(id){const p=curP(),k=todayISO();
  D.logs[k]={sid:id,pid:p.id,week:curWeek(),ex:[],done:false,start:Date.now(),free:true};
  save();alert('Loaded '+p.sessions[id].n+'. It will show on the Train tab.');render()}

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
  const v=volume(7),p=curP(),w=curWeek();
  let h=`<div class="card"><div class="row sp"><div class="lbl" style="margin:0">${esc(p.name)}</div>
    <span class="pill a">Week ${w} of ${p.weeks}</span></div>
    <div class="bar" style="margin:10px 0 9px"><i style="width:${progPct()}%"></i></div>
    <div class="dots">${Array.from({length:p.weeks},(_,i)=>`<div class="dot ${i<w?'on':''}"></div>`).join('')}</div>
    <div class="note" style="margin-top:10px">${esc(blockFor(p,w).note)}</div></div>`;

  h+=`<div class="sec">Weekly volume · sets per muscle</div>
    <div class="note" style="margin-bottom:10px">Roughly 10 sets a week is where growth starts and about 20 is the ceiling most people recover from. Under 6 means that muscle is only being maintained.</div>
    <div class="hm">`;
  MUS.forEach(m=>{const s=volState(v[m],m);
    h+=`<div class="hmc"><div class="n">${MUSN[m]}</div>
      <div class="row sp"><span class="v mono">${v[m]}</span>
      <span style="font-size:10px;font-weight:700;color:${s[1]}">${s[0]}</span></div></div>`});
  h+=`</div>`;

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

set:()=>{const S=D.settings;return `<div class="mid">Settings</div>
  <div class="sec">Theme</div>
  <div class="row" style="gap:7px">
    <button class="btn ${S.theme==='summit'?'p':'gh'}" onclick="setTheme('summit')">Summit</button>
    <button class="btn ${S.theme==='ember'?'p':'gh'}" onclick="setTheme('ember')">Ember</button></div>
  <div class="jm" style="margin-top:6px">Both are dark. Summit is glacier on slate, Ember is orange on near-black.</div>

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
  curP().sessions.__rescue={n:'Rescue · 20 min',w:'home',mins:20,ex:ex};
  D.logs[k]={sid:'__rescue',pid:D.active.id,week:curWeek(),ex:[],done:false,start:Date.now(),rescue:true};
  curP().schedule=curP().schedule.slice();curP().schedule[dIdx()]='__rescue';
  save();close_();go('train')}
function logBench(k){const v=document.getElementById('bv').value.trim();if(!v)return;
  D.bench[k]=D.bench[k]||[];D.bench[k].push({d:todayISO(),v:v});save();close_()}
function logAssess(){const o={d:todayISO()};['hips','ankles','shoulders'].forEach(k=>o[k]=+document.getElementById('a_'+k).value||0);
  D.assess.push(o);save();close_()}
function saveNote(){const l=curLog();if(l){l.note=document.getElementById('sn').value;save()}close_()}
function setTheme(t){D.settings.theme=t;document.documentElement.dataset.t=t;save();open_('set')}
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
document.documentElement.dataset.t=D.settings.theme;
if(!D.logs[todayISO()])save();
render();
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}
document.addEventListener('gesturestart',e=>e.preventDefault());
