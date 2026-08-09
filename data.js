/* JHFP · data.js — exercise library, programmes, journal, mobility, food */

/* ---- CUES: Juan's own notes from the Hard to Kill vault note ---- */
const KBRULES=["Hips first","Don't slouch — bend forward, not back","Stay tight through the waist",
"Stay loose in the arms","Tame the arc — keep it tight to the body","Keep shoulders in their sockets",
"Don't hyperextend the wrists","Keep elbows straight","Loose firm cup grip","Focus on pull, press, squat. Simple."];

const TECH={
'TUT':'Time under tension — slow the whole rep down. The set should take 40–60s, not 20.',
'3s ecc':'Three seconds lowering, explode up. Eccentric builds the most tissue damage and therefore the most growth.',
'4s ecc':'Four seconds lowering, explode up. Brutal. Drop the weight ~15% to hold form.',
'Iso hold':'Pause and hold at the hardest point of the rep. Builds strength exactly where you are weakest.',
'Cluster':'Break the set: 3 reps, rack it, breathe 15s, 3 more, 15s, 3 more. More heavy reps at the same load.',
'Drop set':'To failure, strip ~25%, straight back to failure. Once per exercise, last set only.',
'Superset':'Two exercises back to back, no rest between. Rest only after the pair.',
'FST-7':'Rambod. Seven sets of 8–12, only 30–45s rest, stretching the fascia between sets. Chase the pump — this is the last thing you do for that muscle.',
'AMRAP':'As many rounds/reps as possible in the time given. Pace it — do not blow up in round one.',
'EMOM':'Every minute on the minute. Start the work at the top of each minute; the rest is whatever is left.',
'Ladder':'1,2,3,4,5 reps then back down. Pavel style — never near failure, always leaving reps in the tank.',
'Explosive':'Move the weight as fast as you can on the way up while keeping control. Intent matters more than speed.',
'Deep ROM':'Full range. Go deeper than feels normal — the stretched position is where growth and mobility both live.'};

const EX={
/* --- GYM: push --- */
'Incline barbell bench press':{g:'gym',p:'push',m:['chest','delts','triceps'],c:'Elbows ~45°, bar to upper chest, shoulder blades pinned down and back. Do not bounce.'},
'Flat barbell bench press':{g:'gym',p:'push',m:['chest','triceps','delts'],c:'Full ROM, touch the chest, drive the floor away. Your PB is 110×1 — respect it.'},
'Flat dumbbell press':{g:'gym',p:'push',m:['chest','triceps'],c:'Deeper stretch than barbell. Let the DBs come below chest level.'},
'Incline dumbbell press':{g:'gym',p:'push',m:['chest','delts'],c:'30–45° bench. Squeeze at the top without clanging the bells.'},
'Weighted dip':{g:'gym',p:'push',m:['chest','triceps','delts'],c:'Lean forward for chest, stay upright for triceps. 2s pause at the bottom — this is your gap-filler.'},
'Machine chest press':{g:'gym',p:'push',m:['chest','triceps'],c:'Safe to push close to failure. Good for drop sets.'},
'Cable fly':{g:'gym',p:'push',m:['chest'],c:'Slight bend in the elbow, think hugging a barrel. Stretch is the point.'},
'Pec deck fly':{g:'gym',p:'push',m:['chest'],c:'FST-7 favourite. Squeeze hard, control back to full stretch.'},
'Seated dumbbell overhead press':{g:'gym',p:'push',m:['delts','triceps'],c:'Do not arch the low back. Press slightly forward of the ears.'},
'Barbell overhead press':{g:'gym',p:'push',m:['delts','triceps','core'],c:'Glutes and abs braced, head through at the top. Your PB is 80×5.'},
'Lateral raise':{g:'gym',p:'push',m:['delts'],c:'Lead with the elbow, thumb slightly down, stop at shoulder height. Light weight, high reps, no swing.'},
'Cable lateral raise':{g:'gym',p:'push',m:['delts'],c:'Constant tension through the whole arc — better than DBs at the bottom.'},
'Rear delt fly':{g:'gym',p:'push',m:['delts','back'],c:'Chest supported. Think of pulling the arms apart, not lifting the weight.'},
'Face pull':{g:'gym',p:'pull',m:['delts','back','traps'],c:'Pull to the forehead, externally rotate at the end. Shoulder health insurance.'},
'Rope tricep extension':{g:'gym',p:'push',m:['triceps'],c:'Elbows pinned to the sides, split the rope at the bottom.'},
'Overhead cable tricep extension':{g:'gym',p:'push',m:['triceps'],c:'The stretched position — this is where the long head grows.'},
'Skull crusher':{g:'gym',p:'push',m:['triceps'],c:'Lower to the forehead or just behind. Elbows stay pointed at the ceiling.'},
'Close-grip bench press':{g:'gym',p:'push',m:['triceps','chest'],c:'Hands shoulder-width, elbows tucked. Your PB is 80×8.'},
/* --- GYM: pull --- */
'Deadlift':{g:'gym',p:'legs',m:['back','hams','glutes','traps','forearms'],c:'Bar over midfoot, lats engaged, push the floor away. Explosive concentric. Your PB is 160×1.'},
'Rack pull':{g:'gym',p:'pull',m:['back','traps','forearms'],c:'Just below the knee. Heavy loading for the upper back without the full pull. PB 220×8.'},
'Weighted pull-up':{g:'cal',p:'pull',m:['back','biceps','forearms'],c:'Full dead hang to chin over bar. Your PB is 15 bodyweight reps.'},
'Pull-up':{g:'cal',p:'pull',m:['back','biceps','forearms'],c:'Dead hang, no kipping. Scapula depresses before the arms pull.'},
'Chin-up':{g:'cal',p:'pull',m:['back','biceps'],c:'Supinated. More bicep, easier to load. Great for volume.'},
'Lat pulldown':{g:'gym',p:'pull',m:['back','biceps'],c:'Chest up, drive the elbows down and back. Do not lean past ~15°.'},
'Barbell bent-over row':{g:'gym',p:'pull',m:['back','traps','biceps'],c:'Hinge to ~45°, pull to the navel. Your PB is 100×12.'},
'Chest-supported row':{g:'gym',p:'pull',m:['back','traps'],c:'No cheating possible — that is the point. Squeeze the blades together.'},
'Cable row':{g:'gym',p:'pull',m:['back','biceps'],c:'Full stretch forward, elbows past the ribs at the back.'},
'T-bar row':{g:'gym',p:'pull',m:['back','traps'],c:'Neutral grip, heavy. PB 70×12.'},
'Dumbbell row':{g:'gym',p:'pull',m:['back','biceps'],c:'Long stretch at the bottom, drive the elbow to the hip. PB 44×10.'},
'Dumbbell pullover':{g:'gym',p:'pull',m:['back','chest'],c:'Deep stretch overhead. Ribs down, do not flare.'},
'Barbell shrug':{g:'gym',p:'pull',m:['traps'],c:'Straight up, pause at the top. No rolling.'},
'Hyperextension':{g:'gym',p:'legs',m:['glutes','hams','back'],c:'Round then extend for spinal erectors, or stay flat for glutes/hams.'},
'EZ bar curl':{g:'gym',p:'pull',m:['biceps','forearms'],c:'Elbows still, no swinging. Squeeze at the top.'},
'Barbell curl':{g:'gym',p:'pull',m:['biceps'],c:'Your PB is 30×127 total reps. Full ROM every rep.'},
'Incline dumbbell curl':{g:'gym',p:'pull',m:['biceps'],c:'Arms behind the body = maximum long-head stretch. The best curl you are not doing enough of.'},
'Hammer curl':{g:'gym',p:'pull',m:['biceps','forearms'],c:'Neutral grip, brachialis and brachioradialis. Builds arm thickness.'},
'Preacher curl':{g:'gym',p:'pull',m:['biceps'],c:'No momentum available. Control the eccentric all the way to straight.'},
'Wrist curl':{g:'gym',p:'pull',m:['forearms'],c:'Full flexion and extension, high reps. Forearms need volume, not load.'},
'Wrist extension':{g:'gym',p:'pull',m:['forearms'],c:'The neglected half. Do these or the curls will give you elbow pain.'},
'Reverse curl':{g:'gym',p:'pull',m:['forearms','biceps'],c:'Grip and elbow health. Light and strict.'},
/* --- GYM: legs --- */
'Back squat':{g:'gym',p:'legs',m:['quads','glutes','core'],c:'Full depth, knees track over toes, brace hard. Your PB is 170×7.'},
'Front squat':{g:'gym',p:'legs',m:['quads','core'],c:'Elbows high, upright torso. More knee, less hip. Deep.'},
'Hack squat':{g:'gym',p:'legs',m:['quads','glutes'],c:'Deep. PB 160×8. Feet lower on the plate for more quad.'},
'Leg press':{g:'gym',p:'legs',m:['quads','glutes'],c:'Deep ROM, do not let the low back round. PB 470×12.'},
'Bulgarian split squat':{g:'cal',p:'legs',m:['quads','glutes'],c:'Rear foot elevated, long stride for glutes, short for quads. Deep and slow.'},
'Walking lunge':{g:'cal',p:'legs',m:['quads','glutes','hams'],c:'Knee over toe on the front leg — this is prehab and strength in one.'},
'Romanian deadlift':{g:'gym',p:'legs',m:['hams','glutes','back'],c:'Hinge, not squat. Bar stays against the legs. Feel the hamstring stretch.'},
'Lying leg curl':{g:'gym',p:'legs',m:['hams'],c:'Slow eccentric. Hamstrings respond to controlled negatives.'},
'Seated leg curl':{g:'gym',p:'legs',m:['hams'],c:'More stretch than lying. Best hamstring builder.'},
'Leg extension':{g:'gym',p:'legs',m:['quads'],c:'Pause and squeeze at the top. FST-7 favourite.'},
'Adductor machine':{g:'gym',p:'legs',m:['glutes'],c:'Deep ROM. Directly fills your named gap and protects the groin for golf and hiking.'},
'Abductor machine':{g:'gym',p:'legs',m:['glutes'],c:'Lean forward slightly for the upper glute. Hip stability for running.'},
'Seated calf raise':{g:'gym',p:'legs',m:['calves'],c:'Soleus. Slow, full stretch at the bottom, pause at the top. PB 180×12.'},
'Standing calf raise':{g:'gym',p:'legs',m:['calves'],c:'Gastrocnemius. Straight leg. Do not bounce off the stretch.'},
'Tibialis raise':{g:'cal',p:'legs',m:['calves'],c:'ATG. Toes toward the shin, slow down. Protects the knee and builds ankle resilience. Hook a 16kg KB over your toes if you have no tib bar.'},
'Slant board split squat':{g:'gym',p:'legs',m:['quads','glutes'],c:'ATG. Knee travels well past the toe on the slant. Your single highest-return ankle fix.'},
'Nordic curl':{g:'cal',p:'legs',m:['hams'],c:'Eccentric only to start. The strongest hamstring injury prevention there is.'},
'Sled push':{g:'gym',p:'legs',m:['quads','glutes','calves'],c:'Concentric only — huge conditioning stimulus, almost zero soreness. Perfect next to a lifting block.'},
'Sled pull':{g:'gym',p:'legs',m:['hams','back','quads'],c:'Backwards drag is knee rehab and quad builder at once.'},
/* --- GYM: core / conditioning --- */
'Cable crunch':{g:'gym',p:'core',m:['core'],c:'Round the spine, hips still. Abs flex the spine — they do not just hold.'},
'Hanging leg raise':{g:'cal',p:'core',m:['core','forearms'],c:'No swing. Posteriorly tilt the pelvis at the top.'},
'Assault bike sprint':{g:'cardio',p:'cond',c1:1,m:['conditioning'],c:'All-out. Arms drive as hard as legs. Low interference with lifting — the research favours this over running.'},
'Rower sprint':{g:'cardio',p:'cond',c1:1,m:['conditioning','back'],c:'Legs, hips, arms — in that order. Return in reverse.'},
'Hill sprint':{g:'cardio',p:'cond',c1:1,m:['conditioning','quads','calves'],c:'Concentric-dominant, so far less muscle damage than flat sprinting. Walk down as the rest.'},
'Zone 2 run':{g:'cardio',p:'cond',c1:1,m:['conditioning'],c:'Conversational pace. If you cannot talk, you are going too hard. This builds the engine.'},
'Tempo run':{g:'cardio',p:'cond',c1:1,m:['conditioning'],c:'Comfortably hard — about 10k–half pace. Sustainable discomfort.'},
'Interval run':{g:'cardio',p:'cond',c1:1,m:['conditioning'],c:'Around 5k pace. Your 5k PB is 24:55 — that is roughly 4:59/km.'},
'Long run':{g:'cardio',p:'cond',c1:1,m:['conditioning'],c:'Slow. Time on feet is the goal, not pace.'},
'Trail hike':{g:'cardio',p:'cond',c1:1,m:['conditioning','quads','calves'],c:'Loaded pack if you have one. Descents are the training stimulus most people skip.'},
/* --- HOME: kettlebell --- */
'KB two-arm swing':{g:'kb',p:'legs',c1:1,m:['glutes','hams','back','conditioning'],c:'Hips, not arms. Snap the glutes, float the bell. Breathe behind the shield.'},
'KB single-arm swing':{g:'kb',p:'legs',c1:1,m:['glutes','hams','back','core'],c:'Resist the rotation. Tame the arc.'},
'KB dead-stop swing':{g:'kb',p:'legs',c1:1,m:['glutes','hams','back'],c:'Bell returns to the floor each rep. Kills the stretch reflex, builds raw power.'},
'KB American swing':{g:'kb',p:'legs',c1:1,m:['glutes','delts','conditioning'],c:'Overhead finish. Only if your shoulders are warm and your ribs stay down.'},
'KB gorilla swing':{g:'kb',p:'legs',c1:1,m:['glutes','back','conditioning'],c:'Alternating hands at the top of the arc. Grip and coordination.'},
'KB clean':{g:'kb',p:'legs',c1:1,m:['glutes','back','biceps'],c:'Tame the arc, catch soft in the rack. If it bangs the wrist, you threw it instead of guiding it.'},
'KB clean & press':{g:'kb',p:'push',c1:1,m:['glutes','delts','triceps','back'],c:'One of the highest value moves you own. Whole body in one rep.'},
'KB military press':{g:'kb',p:'push',m:['delts','triceps','core'],c:'Squeeze the whole body, press slightly circular. Never to failure on Pavel blocks.'},
'KB push press':{g:'kb',p:'push',m:['delts','triceps','quads'],c:'Small dip, drive with the legs, lock out hard. Lets you overload the press.'},
'KB snatch':{g:'kb',p:'legs',c1:1,m:['glutes','delts','back','conditioning'],c:'One motion floor to overhead. Punch through at the top so it does not flop onto the wrist.'},
'KB shrug':{g:'kb',p:'pull',m:['traps','forearms'],c:'Two bells at the sides or one heavy in front. Straight up, pause hard at the top, no rolling. Your only direct trap work when there is no barbell in the house.'},
'KB high pull':{g:'kb',p:'pull',m:['traps','back','delts'],c:'Elbow high and back. Bridge between swing and snatch.'},
'KB Turkish get-up':{g:'kb',p:'core',m:['core','delts','glutes','quads'],c:'Slow. Eyes on the bell the whole way. Shoulder stability, mobility and core in one lift.'},
'KB windmill':{g:'kb',p:'core',m:['core','glutes','hams','delts'],c:'Hips shift away, straight legs, eyes on the bell. Your best hip and thoracic mobility loaded stretch.'},
'KB goblet squat':{g:'kb',p:'legs',m:['quads','glutes','core'],c:'Elbows inside the knees at the bottom, pry the hips open. Deep ROM.'},
'KB front rack squat':{g:'kb',p:'legs',m:['quads','glutes','core'],c:'Two bells in the rack. Brutal on the core and the upper back.'},
'KB overhead squat':{g:'kb',p:'legs',m:['quads','delts','core'],c:'The honest test of your shoulder and ankle mobility. Go light.'},
'KB front rack lunge':{g:'kb',p:'legs',m:['quads','glutes','core'],c:'Stay tall. Front rack load makes this a core exercise too.'},
'KB overhead lunge':{g:'kb',p:'legs',m:['quads','glutes','delts','core'],c:'Lock the arm, do not let the ribs flare.'},
'KB single-leg RDL':{g:'kb',p:'legs',m:['hams','glutes','core'],c:'Hinge, hips square, slow. Balance and hamstring in one.'},
'KB Cossack squat':{g:'kb',p:'legs',m:['quads','glutes'],c:'Deep lateral squat. Adductor mobility — one of your gaps.'},
'KB goblet Bulgarian split squat':{g:'kb',p:'legs',m:['quads','glutes'],c:'Bell at the chest, rear foot on the couch or a chair. Long stride for glutes, short for quads. Deep and slow — this is your best home leg builder.'},
'KB swing':{g:'kb',p:'legs',c1:1,m:['glutes','hams','back','conditioning'],c:'Explosive intent every rep. Hips snap, arms are just ropes. For golf, this is the closest thing you own to training the transition.'},
'KB renegade row':{g:'kb',p:'core',m:['back','core','triceps'],c:'Wide feet, no hip rotation. Anti-rotation core plus a row.'},
'KB bent-over row':{g:'kb',p:'pull',m:['back','biceps'],c:'Hinge and hold. Elbow to the hip.'},
'KB thruster':{g:'kb',p:'push',c1:1,m:['quads','delts','conditioning'],c:'Squat straight into the press. The most metabolically expensive move you own.'},
'KB halo':{g:'kb',p:'core',m:['delts','core'],c:'Circle the head, close to the skull. Shoulder warm-up and thoracic mobility.'},
'KB floor press':{g:'kb',p:'push',m:['chest','triceps'],c:'Elbows touch the floor, pause, press. Safe pressing with no bench.'},
'KB pullover':{g:'kb',p:'pull',m:['back','chest','core'],c:'Lying, arms long. Ribs stay down.'},
'KB suitcase carry':{g:'kb',p:'core',m:['core','forearms','traps'],c:'Heavy, one side, stay perfectly upright. Grip and anti-lateral-flexion core.'},
'KB overhead carry':{g:'kb',p:'core',m:['delts','core','traps'],c:'Arm locked, ribs down. Shoulder stability under load.'},
'KB bicep curl':{g:'kb',p:'pull',m:['biceps','forearms'],c:'Fills your gap when you cannot get to the gym.'},
'KB tricep extension':{g:'kb',p:'push',m:['triceps'],c:'Two hands on one bell, deep stretch behind the head.'},
'KB calf raise':{g:'kb',p:'legs',m:['calves'],c:'Single leg, KB in hand, off a step if you have one. Full stretch.'},
/* --- HOME: rings & bodyweight --- */
'Ring pull-up':{g:'ring',p:'pull',m:['back','biceps','forearms'],c:'Rings rotate — let them. Neutral at the bottom, supinated at the top is easiest on the elbow.'},
'Ring row':{g:'ring',p:'pull',m:['back','biceps','core'],c:'Feet elevated to make it harder. Body dead straight, chest to rings.'},
'False grip row':{g:'ring',p:'pull',m:['back','forearms'],c:'Wrist on top of the ring. Muscle-up progression step 2. Build the wrist slowly.'},
'False grip hang':{g:'ring',p:'pull',m:['forearms','back'],c:'Muscle-up progression step 1. Static holds first — rushing this is how wrists get hurt.'},
'False grip pull-up':{g:'ring',p:'pull',m:['back','biceps','forearms'],c:'Progression step 3. Pull to the sternum, not the chin.'},
'Ring support hold':{g:'ring',p:'push',m:['delts','core','triceps'],c:'Arms locked, rings turned out. The base of every ring skill.'},
'Ring dip':{g:'ring',p:'push',m:['chest','triceps','delts'],c:'Support hold first. 2s pause at the bottom. Humbling even when your bar dips are strong.'},
'Ring push-up':{g:'ring',p:'push',m:['chest','triceps','core'],c:'Rings turn out at the top. Enormous stability demand.'},
'Ring incline push-up':{g:'ring',p:'push',m:['chest','triceps'],c:'Rings high = easier. Your progression regression.'},
'Ring fly':{g:'ring',p:'push',m:['chest','core'],c:'Small range to start. This will find every weak stabiliser you have.'},
'Ring bicep curl':{g:'ring',p:'pull',m:['biceps'],c:'Body angle sets the difficulty. Elbows locked in place.'},
'Ring tricep extension':{g:'ring',p:'push',m:['triceps'],c:'Same setup, opposite direction. Keep the body rigid.'},
'Pelican curl':{g:'cal',p:'pull',m:['biceps','chest'],c:'Advanced. Eccentric only for a long time. Tremendous bicep and elbow strength — do not rush it.'},
'Ring muscle-up':{g:'ring',p:'pull',m:['back','chest','triceps','forearms'],c:'False grip, pull to the sternum, fast transition, press out. Your standing goal.'},
'Muscle-up negative':{g:'ring',p:'pull',m:['back','triceps','chest'],c:'Start at the top, lower slowly through the transition. The best builder of the real thing.'},
'Ring L-sit':{g:'ring',p:'core',m:['core','delts'],c:'Legs straight, hips down. Tucked version first.'},
'Knee raise to invert':{g:'cal',p:'core',m:['core','back'],c:'Ring skill. Control, do not swing.'},
'Handstand hold':{g:'cal',p:'push',m:['delts','core'],c:'Wall first. Ribs down, push the floor away, look at your hands.'},
'Pike push-up':{g:'cal',p:'push',m:['delts','triceps'],c:'Hips high, crown of the head to the floor. Handstand push-up progression.'},
'Push-up':{g:'cal',p:'push',m:['chest','triceps','core'],c:'Body rigid, full lockout, chest to floor.'},
'Diamond push-up':{g:'cal',p:'push',m:['triceps','chest'],c:'Hands together, elbows tucked.'},
'Ab wheel':{g:'cal',p:'core',m:['core','back'],c:'Ribs down, no low back arch. Kneeling first, standing eventually.'},
'Hollow hold':{g:'cal',p:'core',m:['core'],c:'Low back pressed to the floor. If it lifts, tuck the knees more.'},
'Hanging knee raise':{g:'cal',p:'core',m:['core','forearms'],c:'Toes-to-bar is the destination.'},
'Dragon flag':{g:'cal',p:'core',m:['core'],c:'Advanced. Body rigid from shoulders down, lower slowly.'},
'Jump rope':{g:'cal',p:'cond',c1:1,m:['calves','conditioning'],c:'Wrists, not arms. Stay on the balls of the feet. Free ankle resilience.'},
'Pistol squat':{g:'cal',p:'legs',m:['quads','glutes','core'],c:'Assisted with a ring or doorframe first. Deep single-leg strength.'},
'Sissy squat':{g:'cal',p:'legs',m:['quads'],c:'Knees forward, hips extended. Deep quad and knee prehab.'},
'Band lateral raise':{g:'cal',p:'push',m:['delts'],c:'Stand on the band, lead with the elbow, stop at shoulder height. High reps. Your only direct side-delt work at home — and side delts are what make the shoulders look wide.'},
'Band pull-apart':{g:'cal',p:'pull',m:['delts','back'],c:'High reps. Shoulder health, costs nothing.'},
'Band face pull':{g:'cal',p:'pull',m:['delts','traps'],c:'External rotation at the end of every rep.'},
'Grip trainer':{g:'cal',p:'pull',m:['forearms'],c:'High reps and long holds. Carries over to every pull you do.'},
'Dead hang':{g:'cal',p:'pull',m:['forearms','back'],c:'Decompresses the spine and builds grip. Aim for 2 minutes eventually.'},
'Neck curl':{g:'cal',p:'core',m:['traps'],c:'Light, slow, controlled. Hard to kill starts with the neck.'}
};

/* ---- EXERCISE GROUPING ----
   Every EX entry carries `g`: kb · ring · cal · gym · cardio. The picker shows
   them in the order Juan asked for — Kettlebell, Rings, Calisthenics, Gym —
   because that is the order he actually reaches for equipment at home, and
   alphabetical order buried the kettlebell work under the barbell work.

   Cardio is a fifth group at the end rather than being forced into one of the
   four: a Zone 2 run is not a gym lift and pretending otherwise would put it
   somewhere nobody would look for it.

   The `g` values were derived from the section headings in this file, so if you
   add an exercise, add it under the right heading AND give it a `g`. There is a
   test asserting nothing is left untagged. */
const EXGROUPS=[['kb','Kettlebell'],['ring','Rings'],['cal','Calisthenics'],
  ['gym','Gym'],['cardio','Cardio']];
function exGroup(n){return (EX[n]&&EX[n].g)||'gym'}
/* Names in picker order, flat. */
function exOrdered(names){
  const src=names||Object.keys(EX);
  const rank={};EXGROUPS.forEach((g,i)=>rank[g[0]]=i);
  return src.slice().sort((a,b)=>{
    const ra=rank[exGroup(a)],rb=rank[exGroup(b)];
    if(ra!==rb)return ra-rb;
    return a.localeCompare(b);
  });
}
/* <optgroup>-ed <option> list for any exercise <select>. `sel` is the currently
   chosen name, if any. Grouped rather than flat so the four categories are
   visible in the dropdown itself, not just implied by the ordering. */
function exOptions(sel){
  let h='';
  EXGROUPS.forEach(([g,label])=>{
    const ns=Object.keys(EX).filter(n=>exGroup(n)===g).sort((a,b)=>a.localeCompare(b));
    if(!ns.length)return;
    h+='<optgroup label="'+label+'">'
      +ns.map(n=>'<option value="'+esc(n)+'"'+(n===sel?' selected':'')+'>'+esc(n)+'</option>').join('')
      +'</optgroup>';
  });
  return h;
}

/* ================= AUTOMATIC WORKOUT GENERATOR =================
   Builds a session from the exercise library against a set of choices, rather
   than from a fixed template. The options mirror the ones Juan listed:

     where     home · gym · outdoors · anywhere
     pattern   push · pull · legs · core · full body · conditioning
     kit       what you actually have to hand
     format    straight sets · AMRAP · EMOM · circuit · ladder
     minutes   15 · 20 · 30 · 45 · 60
     level     beginner · intermediate · advanced
     quality   strength · hypertrophy · power endurance · conditioning · skill
     include   named complexes or benchmarks folded in as a finisher

   Two rules are enforced rather than hoped for, because both were hard-won:
   5-7 movements for a straight-sets session (nine sessions once broke this;
   round-based formats use 3-5 by design, see genCount), and the per-muscle
   volume landmarks (P4 once sat at 49 weighted back sets a week). A generated
   session that quietly blows a ceiling would undo the whole point of the
   volume model, so genEstimate() measures and genTrim() cuts. */

const GEN_WHERE=[['home','Home'],['gym','Gym'],['out','Outdoors'],['any','Anywhere']];
const GEN_PATTERN=[['push','Push'],['pull','Pull'],['legs','Legs'],['core','Core'],
  ['full','Full body'],['cond','Conditioning']];
const GEN_KIT=[['kb1','1 kettlebell'],['kb2','2 kettlebells'],['rings','Rings'],
  ['bw','Bodyweight only'],['bands','Bands'],['abwheel','Ab wheel'],
  ['rope','Jump rope'],['bar','Pull-up bar'],['sandbag','Sandbag'],
  ['carry','Something heavy to carry'],['gym','Full gym']];
const GEN_FORMAT=[['sets','Straight sets'],['amrap','AMRAP'],['emom','EMOM'],
  ['circuit','Circuit'],['ladder','Ladder']];
const GEN_MINS=[15,20,30,45,60];
const GEN_LEVEL=[['beg','Beginner'],['int','Intermediate'],['adv','Advanced']];
const GEN_QUALITY=[['strength','Strength'],['hyp','Hypertrophy'],
  ['pe','Power endurance'],['cond','Conditioning'],['skill','Skill']];

/* Movements a beginner should not be handed. Straight out of the same thinking
   as the Walk Before You Fly brief — no muscle-ups, no snatches, no pistols. */
const GEN_ADVANCED=/muscle-up|snatch|pistol|dragon flag|handstand|nordic|windmill|get-up|l-sit|pelican|false grip pull|american swing/i;
const GEN_INTERMEDIATE=/^ring |dip|pull-up|chin-up|ab wheel|hollow|cossack|bulgarian|single-leg/i;

/* Which EX entries a kit selection unlocks. `bw` is always allowed — bodyweight
   needs nothing — so a session can always be built even with nothing selected. */
function genAllowed(kit,where){
  const has=k=>kit.indexOf(k)>=0;
  return Object.keys(EX).filter(n=>{
    const e=EX[n],g=e.g;
    /* Cardio splits by what the movement actually needs. The first version of
       this read `where!=='gym'||has('gym')`, which allowed machine cardio
       EVERYWHERE EXCEPT the gym — a bodyweight session at home could be handed
       "Assault bike sprint" and "Rower sprint". Inverted logic, and the test
       could not see it because the home-gating assertion only checked for the
       'gym' group and never 'cardio'. */
    if(g==='cardio'){
      if(/bike|rower|sled/i.test(n))return has('gym');        // needs a machine
      return where==='out'||where==='any';                    // running, hiking
    }
    if(g==='kb')return has('kb1')||has('kb2');
    if(g==='ring')return has('rings');
    if(g==='gym')return has('gym')&&(where==='gym'||where==='any');
    /* Calisthenics is mostly free, but "calisthenics" is the group everything
       without its own group falls into — which now includes the SANDBAG work.
       Without an explicit gate the generator handed a bodyweight-only home user
       "Sandbag shouldering" in every single session, because with `bw` alone it
       was the only ungated pull movement left in the pool. Anything needing an
       object has to be gated on owning that object. */
    if(/^sandbag/i.test(n))return has('sandbag');
    if(/farmer carry|suitcase carry/i.test(n))return has('carry')||has('kb1')||has('gym');
    if(/pull-up|chin-up|hang|muscle-up|knee raise to invert|leg raise/i.test(n))return has('bar')||has('rings');
    if(/^band /i.test(n)||/^band row/i.test(n))return has('bands');
    if(/ab wheel/i.test(n))return has('abwheel');
    if(/jump rope/i.test(n))return has('rope');
    if(/grip trainer/i.test(n))return has('gym')||has('bands');
    return true;
  });
}
function genLevelOk(n,level){
  if(level==='adv')return true;
  if(GEN_ADVANCED.test(n))return false;
  if(level==='beg'&&GEN_INTERMEDIATE.test(n))return false;
  return true;
}
/* Sets, reps and rest for a quality. These are the same shapes the programmes
   already use, so a generated session feels like the rest of the app. */
const GEN_PRESCRIPTION={
  strength:{s:5,r:'4-6',rest:150},
  hyp:{s:4,r:'8-12',rest:90},
  pe:{s:4,r:'12-15',rest:60},
  cond:{s:3,r:'15-20',rest:45},
  skill:{s:4,r:'5-8',rest:90}
};
/* Deterministic shuffle so "regenerate" gives something new but a given seed
   always rebuilds the same session — which is what makes it testable. */
function genRand(seed){let x=seed>>>0||1;
  return()=>{x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;x>>>=0;return x/4294967296}}

function genPatterns(pattern){
  if(pattern==='full')return ['push','pull','legs','core'];
  if(pattern==='cond')return ['cond','legs','core'];
  /* a push day still gets a little pull and core — never a single-plane session */
  if(pattern==='push')return ['push','push','push','pull','core'];
  if(pattern==='pull')return ['pull','pull','pull','push','core'];
  if(pattern==='legs')return ['legs','legs','legs','core','legs'];
  return ['core','core','core','legs','push'];
}
/* How many movements fit.

   The house rule is 5-7 for a STRAIGHT-SETS session, and that is enforced here.
   Round-based formats are deliberately different and this is not a loophole:
   an AMRAP or EMOM repeats its list many times over, so 3-5 movements at 6-20
   rounds each is the same or more total work than 7 movements at 4 sets. Seven
   movements in a 20-minute AMRAP would mean under three rounds of anything.

   Do not "fix" this by forcing 5 across the board — check genEstimate() first,
   which is what actually guards the volume. */
function genCount(mins,format){
  if(format==='amrap'||format==='emom')return mins<=20?3:(mins<=30?4:5);
  if(format==='circuit')return mins<=20?5:6;
  if(mins<=20)return 5;
  if(mins<=30)return 6;
  return 7;
}

function genBuild(o){
  o=o||{};
  const kit=o.kit&&o.kit.length?o.kit:['bw'];
  const where=o.where||'home',level=o.level||'int',quality=o.quality||'hyp';
  const format=o.format||'sets',mins=+o.mins||30;
  const rnd=genRand(o.seed||1);
  const pool=genAllowed(kit,where).filter(n=>genLevelOk(n,level));
  const want=genPatterns(o.pattern||'full');
  const n=genCount(mins,format);
  const pres=GEN_PRESCRIPTION[quality]||GEN_PRESCRIPTION.hyp;

  const picked=[],used={};
  const take=pat=>{
    const cand=pool.filter(x=>EX[x].p===pat&&!used[x]);
    if(!cand.length)return null;
    const x=cand[Math.floor(rnd()*cand.length)];
    used[x]=1;return x;
  };
  /* fill against the requested pattern mix, then top up from anything left */
  for(let i=0;i<n;i++){
    const pat=want[i%want.length];
    const x=take(pat)||take('core')||take('legs')||take('push')||take('pull');
    if(x)picked.push(x);
  }
  if(picked.length<3){
    pool.filter(x=>!used[x]).slice(0,5-picked.length).forEach(x=>{used[x]=1;picked.push(x)});
  }
  /* ROUNDS, per movement — not per session.
     This was wrong first time and worth spelling out. An EMOM does one movement
     per minute rotating through the list, so a 20 minute EMOM over 3 movements
     is ~6 rounds each, NOT 20. Setting s=mins produced a session the volume
     model scored at 50 weighted core sets, which is roughly a fortnight's work
     for that muscle in one go. Rounds are always derived from the number of
     movements, never from the clock alone. */
  const per=Math.max(1,picked.length);
  const rounds=format==='amrap'?Math.max(3,Math.round(mins/(per*1.2)))
    :format==='emom'?Math.max(2,Math.floor(mins/per))
    :format==='circuit'?Math.max(3,Math.round(mins/(per*1.4))):0;
  const ex=picked.map((x,i)=>{
    if(format==='amrap'||format==='emom'||format==='circuit')
      return {n:x,s:rounds,r:String(format==='emom'?(quality==='cond'?12:8):(quality==='cond'?15:10)),
        rest:0,inx:1};
    if(format==='ladder')
      return {n:x,s:5,r:'5-4-3-2-1',rest:pres.rest,t:'Ladder'};
    return {n:x,s:pres.s,r:pres.r,rest:pres.rest};
  });
  const sess={
    id:'gen_'+Date.now().toString(36)+Math.floor(rnd()*1e4).toString(36),
    n:o.name||genName(o),w:where==='any'?'either':where,mins:mins,
    gen:1,opts:o,fin:o.include&&o.include.length?genFinisher(o.include):'',
    kind:(GEN_FORMAT.find(f=>f[0]===format)||[])[1],
    note:genNote(o,ex.length,rounds),
    ex:ex
  };
  genTrim(sess);
  return sess;
}
/* Enforce the volume ceiling rather than hoping for it.

   No SINGLE session should carry more than about 60% of a muscle's weekly
   productive band — past that you are not training it, you are burying it, and
   it wrecks the weekly picture on the anatomy chart for days. Trims the sets on
   the offending movements down to a floor of 2 rather than dropping exercises,
   so the shape of the session survives.

   LAND lives in app.js and does not exist while this file is being parsed —
   that is fine, this only runs when a session is actually built. */
function genTrim(sess){
  if(typeof LAND==='undefined')return sess;
  let guard=0;
  for(;;){
    if(guard++>40)break;
    const v=genEstimate(sess);
    let worst=null,over=0;
    Object.keys(v).forEach(m=>{
      const L=LAND[m];if(!L)return;                 // 'conditioning' is not a muscle
      const cap=L[2]*0.6;
      if(v[m]>cap&&v[m]-cap>over){over=v[m]-cap;worst=m}
    });
    if(!worst)break;
    /* pull a set off whichever movement contributes most to the worst muscle */
    let target=null,best=0;
    sess.ex.forEach(e=>{
      const ms=(EX[e.n]&&EX[e.n].m)||[];
      const i=ms.indexOf(worst);
      if(i<0||e.s<=2)return;
      const w=(i===0?1:i===1?.5:.25)*e.s;
      if(w>best){best=w;target=e}
    });
    if(!target)break;
    target.s--;
  }
  return sess;
}
function genFinisher(inc){
  const names=inc.map(k=>{
    if(KBX[k])return KBX[k].n+' complex';
    if(CAL[k])return CAL[k].n;
    return null}).filter(Boolean);   // never echo an unknown key at the user
  return names.length?'Finish with: '+names.join(' · '):'';
}
function genName(o){
  const pat=(GEN_PATTERN.find(x=>x[0]===o.pattern)||['','Full body'])[1];
  const fmt=(GEN_FORMAT.find(x=>x[0]===o.format)||['','Sets'])[1];
  return pat+' · '+fmt+' · '+(o.mins||30)+' min';
}
function genNote(o,count,rounds){
  const q=(GEN_QUALITY.find(x=>x[0]===o.quality)||['','Hypertrophy'])[1];
  const f=o.format||'sets';
  if(f==='amrap')return 'As many rounds as possible in '+(o.mins||30)+' minutes. '+count+' movements, straight through, rest only when you have to. Score is rounds completed — write it in the note.';
  if(f==='emom')return 'Every minute on the minute for '+(o.mins||30)+' minutes, rotating through the '+count+' movements. Whatever is left of the minute is your rest.';
  if(f==='circuit')return count+' movements, '+rounds+' rounds, no rest inside a round. '+q+' pace.';
  if(f==='ladder')return 'Ladders of 5-4-3-2-1. Add load as the reps come down, or hold load and chase the clock.';
  return q+' work. '+count+' movements, straight sets, rest as prescribed.';
}
/* Weighted set count per muscle for a generated session — the same 1 / 0.5 /
   0.25 weighting the volume model uses, so the estimate is comparable with the
   landmarks rather than merely similar to them. */
function genEstimate(sess){
  const out={};
  (sess.ex||[]).forEach(e=>{
    const ms=(EX[e.n]&&EX[e.n].m)||[];
    ms.forEach((m,i)=>{out[m]=(out[m]||0)+(e.s||0)*(i===0?1:i===1?0.5:0.25)});
  });
  Object.keys(out).forEach(m=>out[m]=Math.round(out[m]*10)/10);
  return out;
}

/* ---- PROGRESSION ENGINE RULES ---------------------------------------- */
/* Each programme defines blocks by week. setMod adjusts working sets,
   intent tells the app how to advance load from your logs.            */

function blockFor(p,w){for(const b of p.blocks){if(w>=b.f&&w<=b.t)return b}return p.blocks[0]}

/* ---- THE NINE PROGRAMMES --------------------------------------------- */
const P={};

/* ============ P1 · JUVIES JACKLETE ============ */
P.p1={id:'p1',name:'Juvies Jacklete',sub:'Gym powerbuilding · hypertrophy-led',
weeks:8,where:'Gym',bias:'Hypertrophy',days:5,fst:true,
why:'Pure size and strength. Push · Pull · Legs · ShArms · Upper. Heavy compounds run on minimum-effective-dose rules, then one muscle per session gets the FST-7 seven-set finisher — the way Rambod actually programmes CBum. Conditioning is two short sprint finishers, on the bike or sled so it does not tax your legs.',
blocks:[{f:1,t:3,type:'Accumulation',mod:0,note:'Build volume. Leave 1–2 reps in the tank on compounds.'},
{f:4,t:4,type:'Deload',mod:-1,note:'60% of the load, all sets easy. Do not skip this — it is where you grow.'},
{f:5,t:7,type:'Intensification',mod:1,note:'Techniques on. Last set of every compound is to failure.'},
{f:8,t:8,type:'Peak & test',mod:-1,note:'Retest your key lifts. Then switch programmes.'}],
schedule:['A','B','C','D','E','sport','rest'],
sessions:{
A:{n:'Push',w:'gym',mins:55,ex:[
{n:'Incline barbell bench press',s:4,r:'6-8',t:'3s ecc',rest:180},
{n:'Weighted dip',s:4,r:'8-10',t:'Iso hold',rest:150},
{n:'Flat dumbbell press',s:3,r:'10-12',rest:120},
{n:'Cable fly',s:3,r:'12-15',t:'TUT',rest:75},
{n:'Rope tricep extension',s:3,r:'12-15',t:'Superset',rest:60},
{n:'Overhead cable tricep extension',s:3,r:'12',t:'Superset',rest:75},
{n:'Pec deck fly',s:7,r:'8-12',t:'FST-7',rest:40,fst:1}]},
B:{n:'Pull',w:'gym',mins:55,ex:[
{n:'Deadlift',s:4,r:'5',t:'Explosive',rest:210},
{n:'Weighted pull-up',s:4,r:'6-8',rest:150},
{n:'Barbell bent-over row',s:3,r:'8-10',rest:120},
{n:'Chest-supported row',s:3,r:'12',t:'Iso hold',rest:90},
{n:'EZ bar curl',s:3,r:'10',t:'Superset',rest:60},
{n:'Hammer curl',s:3,r:'12',t:'Superset',rest:75},
{n:'Dumbbell pullover',s:7,r:'8-12',t:'FST-7',rest:40,fst:1}]},
C:{n:'Legs',w:'gym',mins:60,ex:[
{n:'Back squat',s:4,r:'6-8',rest:210},
{n:'Romanian deadlift',s:3,r:'8-10',t:'3s ecc',rest:150},
{n:'Leg press',s:3,r:'12-15',t:'Deep ROM',rest:120},
{n:'Seated leg curl',s:3,r:'12',t:'4s ecc',rest:90},
{n:'Seated calf raise',s:4,r:'15',t:'Superset',rest:45},
{n:'Tibialis raise',s:4,r:'20',t:'Superset',rest:60},
{n:'Leg extension',s:7,r:'8-12',t:'FST-7',rest:40,fst:1}]},
D:{n:'Shoulders & arms',w:'gym',mins:50,ex:[
{n:'Barbell overhead press',s:4,r:'6-8',rest:150},
{n:'Seated dumbbell overhead press',s:3,r:'10',rest:120},
{n:'Cable lateral raise',s:4,r:'15',t:'Drop set',rest:60},
{n:'Face pull',s:3,r:'15',rest:60},
{n:'Incline dumbbell curl',s:3,r:'10',t:'Superset',rest:45},
{n:'Skull crusher',s:3,r:'10-12',t:'Superset',rest:60},
{n:'Wrist curl',s:2,r:'20',rest:45}]},
E:{n:'Upper & weak points',w:'gym',mins:50,fin:'Assault bike sprint · 8×20s hard / 40s easy',ex:[
{n:'Flat barbell bench press',s:4,r:'6-8',rest:180},
{n:'Lat pulldown',s:4,r:'10-12',rest:120},
{n:'Cable row',s:3,r:'12',rest:90},
{n:'Lateral raise',s:4,r:'15-20',t:'TUT',rest:60},
{n:'Barbell curl',s:3,r:'12',t:'Superset',rest:45},
{n:'Close-grip bench press',s:3,r:'10',t:'Superset',rest:75},
{n:'Hanging leg raise',s:3,r:'12-15',rest:60}]}}};

/* ============ P2 · FRONING & FRASER ============ */
P.p2={id:'p2',name:'Froning & Fraser',sub:'Strength then metcon · functional-led',
weeks:10,where:'3 gym · 2 home',bias:'Functional',days:5,bare:true,
why:'Every session is the same shape: one heavy strength lift, one skill or accessory block, then a metcon. This is the most "hard to kill" per hour you can train. Bare Mode fits here — run in the morning, lift in the evening.',
blocks:[{f:1,t:3,type:'Base',mod:0,note:'Strength at 75–80%. Metcons steady, not red-line.'},
{f:4,t:4,type:'Deload',mod:-1,note:'Half the metcon volume. Strength stays, intensity drops.'},
{f:5,t:7,type:'Build',mod:1,note:'Strength 82–87%. Metcons get sharper and shorter.'},
{f:8,t:9,type:'Peak',mod:1,note:'Heavy singles and triples. Metcons at full intensity.'},
{f:10,t:10,type:'Test',mod:-1,note:'Retest lifts and one benchmark workout.'}],
schedule:['A','B','C','D','E','sport','rest'],
sessions:{
A:{n:'Squat & engine',w:'gym',mins:50,ex:[
{n:'Back squat',s:5,r:'5',t:'Cluster',rest:180},
{n:'Bulgarian split squat',s:3,r:'10',t:'Deep ROM',rest:90},
{n:'Ab wheel',s:3,r:'12',rest:60},
{n:'Assault bike sprint',s:10,r:'30s hard / 30s easy',t:'EMOM',rest:0}]},
B:{n:'Press & pull · home',w:'home',mins:40,ex:[
{n:'KB clean & press',s:5,r:'5 each side',rest:120},
{n:'Ring pull-up',s:5,r:'6-8',rest:120},
{n:'Ring dip',s:3,r:'10',rest:90},
{n:'KB snatch',s:5,r:'7 each side',t:'EMOM',rest:0},
{n:'Ab wheel',s:3,r:'10',rest:60}]},
C:{n:'Pull & posterior',w:'gym',mins:50,ex:[
{n:'Deadlift',s:5,r:'3',t:'Explosive',rest:210},
{n:'Weighted pull-up',s:4,r:'6',rest:150},
{n:'Barbell bent-over row',s:3,r:'8',rest:105},
{n:'Rower sprint',s:5,r:'250m all-out',rest:90},
{n:'Hanging leg raise',s:3,r:'12',rest:60}]},
D:{n:'KB complex · home',w:'home',mins:35,ex:[
{n:'KB clean',s:7,r:'3 per side',t:'Superset',rest:0},
{n:'KB front rack squat',s:7,r:'4',t:'Superset',rest:0},
{n:'KB push press',s:7,r:'5 per side',t:'Superset',rest:120},
{n:'Ring row',s:3,r:'15',rest:75},
{n:'KB suitcase carry',s:4,r:'40m per side',rest:75}]},
E:{n:'Press & full-body metcon',w:'gym',mins:50,fin:'Sled push · 6×20m heavy',ex:[
{n:'Barbell overhead press',s:5,r:'5',rest:180},
{n:'Incline barbell bench press',s:4,r:'8',rest:150},
{n:'Chest-supported row',s:3,r:'12',rest:90},
{n:'KB thruster',s:5,r:'10',t:'AMRAP',rest:0},
{n:'Pull-up',s:5,r:'8',t:'AMRAP',rest:0}]}}};

/* ============ P3 · HARD TO KILL ============ */
P.p3={id:'p3',name:'Hard to Kill',sub:'Gym + home · bodybuilding and functional',
weeks:6,where:'2 gym · 3 home',bias:'Mixed',days:5,
why:'Straight out of your own vault note, but with the gym added back in for the things rings and bells cannot do \u2014 heavy deadlifts, loaded dips, direct arm work, ab/adductors, calves and tibs. Two gym days carry the heavy compounds, three home days carry the kettlebell, ring and benchmark work. The Standard is tested in week 1 and again in week 6. Beat 55:04.',
blocks:[{f:1,t:1,type:'Test',mod:-1,note:'Set your baseline. Run The Standard on Saturday and log it.'},
{f:2,t:3,type:'Build',mod:0,note:'Add reps before you add rest. Quality of every rep first.'},
{f:4,t:5,type:'Intensify',mod:1,note:'Density: same work, less rest. Techniques on.'},
{f:6,t:6,type:'Retest',mod:-1,note:'Light week, then run The Standard again. Beat 55:04.'}],
schedule:['A','B','C','D','E','sport','rest'],
sessions:{
A:{n:'Gym · Push & press power',w:'gym',mins:50,fin:'Sled push 6×20m, or assault bike 8×20s hard / 40s easy',ex:[
{n:'Weighted dip',s:5,r:'8-10',t:'Iso hold',rest:150},
{n:'Incline barbell bench press',s:4,r:'6-8',t:'3s ecc',rest:180},
{n:'Barbell overhead press',s:4,r:'6-8',rest:150},
{n:'Cable lateral raise',s:3,r:'15',t:'Superset',rest:45},
{n:'Rope tricep extension',s:3,r:'12',t:'Superset',rest:60},
{n:'Wrist curl',s:2,r:'20',t:'Superset',rest:30},
{n:'Wrist extension',s:2,r:'20',rest:45}]},
B:{n:'Home · Lower kettlebell',w:'home',mins:38,ex:[
{n:'KB front rack squat',s:5,r:'8-10',t:'3s ecc',rest:120},
{n:'KB single-leg RDL',s:4,r:'10 per side',rest:90},
{n:'KB front rack lunge',s:3,r:'12 per side',rest:90},
{n:'KB two-arm swing',s:6,r:'20',t:'EMOM',rest:0},
{n:'KB Cossack squat',s:3,r:'8 per side',t:'Deep ROM',rest:60},
{n:'KB calf raise',s:4,r:'20 per side',rest:45}]},
C:{n:'Gym · Pull & posterior power',w:'gym',mins:55,ex:[
{n:'Deadlift',s:4,r:'5',t:'Explosive',rest:210},
{n:'Weighted pull-up',s:5,r:'6-8',rest:150},
{n:'Barbell bent-over row',s:3,r:'8-10',rest:120},
{n:'EZ bar curl',s:3,r:'12',t:'Superset',rest:45},
{n:'Adductor machine',s:3,r:'15',t:'Superset',rest:30},
{n:'Seated calf raise',s:4,r:'15',t:'Superset',rest:30},
{n:'Tibialis raise',s:4,r:'20',rest:45}]},
D:{n:'Home · Upper rings & skills',w:'home',mins:42,ex:[
{n:'Ring pull-up',s:5,r:'AMRAP minus 2',rest:150},
{n:'Ring dip',s:5,r:'8-12',t:'Iso hold',rest:120},
{n:'KB military press',s:4,r:'6-8 per side',rest:120},
{n:'False grip row',s:4,r:'10',rest:105},
{n:'Ring tricep extension',s:3,r:'12',rest:60},
{n:'False grip hang',s:3,r:'Max hold',rest:75},
{n:'Ab wheel',s:3,r:'12',rest:60}]},
E:{n:'Home · Benchmark · Freya',w:'home',mins:38,fin:'Jump rope · 10 min unbroken if you can',ex:[
{n:'Ring pull-up',s:5,r:'10',t:'AMRAP',rest:0},
{n:'Ring dip',s:5,r:'10',t:'AMRAP',rest:0},
{n:'Diamond push-up',s:5,r:'15',t:'AMRAP',rest:0},
{n:'Ring row',s:5,r:'15',t:'AMRAP',rest:0},
{n:'Pike push-up',s:5,r:'7',t:'AMRAP',rest:120},
{n:'KB Turkish get-up',s:5,r:'2 per side',t:'TUT',rest:75},
{n:'Handstand hold',s:3,r:'Max hold',rest:60}]}},
sportNote:'Week 1 and week 6 are Standard days \u2014 50 pull-ups, 100 incline push-ups, 25 knee raises, 200 squats, 50 dips, 50 rows, 50 pike push-ups, for time. Log it under Benchmarks. Other weeks: golf or a trail hike.'};

/* ============ P4 · KB & CALISTHENICS WARRIOR ============ */
P.p4={id:'p4',name:'KB & Calisthenics Warrior',sub:'Fully home · hypertrophy on kettlebells and rings',
weeks:10,where:'Home',bias:'Hypertrophy',days:5,fst:true,
why:'Bodybuilding volume and bodybuilding rules, delivered entirely on the equipment in your house \u2014 16 and 24kg bells, rings, ab wheel, bands, grip trainers, jump rope. No gym, no booking, no drive. Day D exists specifically to cover the gaps a gym would normally fill: direct arm work, wrists, calves and tibs, adductors and grip. Ring strength runs as a thread through all ten weeks \u2014 false grip hold, then row, then pull-up, then negative, then the muscle-up.',
blocks:[{f:1,t:4,type:'Accumulation',mod:0,note:'Volume climbs about 8% a week. Two reps left in the tank on the compounds.'},
{f:5,t:5,type:'Deload',mod:-1,note:'Two-thirds of the work, all sets comfortable. Mobility stays full.'},
{f:6,t:9,type:'Intensification',mod:1,note:'Techniques on: TUT, clusters, drop sets. Last set of each compound to failure.'},
{f:10,t:10,type:'Deload & test',mod:-1,note:'Light week, then retest the ring progression and The Standard.'}],
schedule:['A','B','C','D','E','sport','rest'],
sessions:{
A:{n:'Upper · push',w:'home',mins:42,fin:'Jump rope · 10×30s fast / 30s rest',ex:[
{n:'Ring dip',s:5,r:'8-12',t:'Iso hold',rest:150},
{n:'KB military press',s:4,r:'6-8 per side',rest:120},
{n:'Ring push-up',s:4,r:'12-15',t:'TUT',rest:90},
{n:'Pike push-up',s:3,r:'8-12',rest:90},
{n:'Band lateral raise',s:4,r:'20',t:'TUT',rest:45},
{n:'Ring tricep extension',s:3,r:'12',rest:60},
{n:'Ring fly',s:7,r:'8-12',t:'FST-7',rest:40,fst:1}]},
B:{n:'Lower · squat pattern',w:'home',mins:40,ex:[
{n:'KB front rack squat',s:5,r:'8-10',t:'3s ecc',rest:120},
{n:'KB goblet Bulgarian split squat',s:4,r:'10 per side',t:'Deep ROM',rest:105},
{n:'Slant board split squat',s:3,r:'12 per side',t:'Deep ROM',rest:90},
{n:'Sissy squat',s:3,r:'12',t:'TUT',rest:75},
{n:'KB Cossack squat',s:3,r:'8 per side',t:'Deep ROM',rest:60},
{n:'Ab wheel',s:4,r:'10',rest:60}]},
C:{n:'Upper · pull',w:'home',mins:42,ex:[
{n:'Ring pull-up',s:5,r:'AMRAP minus 2',rest:150},
{n:'False grip row',s:4,r:'10',rest:120},
{n:'KB bent-over row',s:4,r:'10 per side',t:'Iso hold',rest:105},
{n:'KB high pull',s:3,r:'12',rest:75},
{n:'False grip hang',s:3,r:'Max hold',rest:75},
{n:'Ring row',s:7,r:'8-12',t:'FST-7',rest:40,fst:1}]},
D:{n:'Arms, gaps & grip',w:'home',mins:38,ex:[
{n:'KB bicep curl',s:4,r:'10-12',t:'3s ecc',rest:75},
{n:'KB tricep extension',s:4,r:'12',t:'Deep ROM',rest:75},
{n:'KB shrug',s:4,r:'15',t:'Iso hold',rest:75},
{n:'Wrist curl',s:3,r:'20',t:'Superset',rest:30},
{n:'Wrist extension',s:3,r:'20',rest:45},
{n:'KB calf raise',s:5,r:'20 per side',t:'Superset',rest:30},
{n:'Tibialis raise',s:5,r:'25',rest:45}]},
E:{n:'Posterior & engine',w:'home',mins:40,fin:'Jump rope · 10 min, or hill sprints 8×20s',ex:[
{n:'KB single-leg RDL',s:5,r:'10 per side',t:'3s ecc',rest:105},
{n:'Nordic curl',s:3,r:'6',t:'4s ecc',rest:120},
{n:'KB two-arm swing',s:8,r:'20',t:'EMOM',rest:0},
{n:'KB suitcase carry',s:4,r:'40m per side',rest:75},
{n:'Hollow hold',s:3,r:'45s',t:'Superset',rest:30},
{n:'Hanging knee raise',s:3,r:'15',rest:60}]}}};

/* ============ P5 · DO LESS RELENTLESSLY ============ */
P.p5={id:'p5',name:'Do Less Relentlessly',sub:'3 days · 35 minutes · minimum effective dose',
weeks:6,where:'Gym or home',bias:'Maintain & creep',days:3,
why:'Your busy-season fallback, named from your own USER.md. Three full-body sessions, five exercises, two hard sets each taken close to failure — Nippard\'s minimum effective dose. It will not build you fast, but it will hold everything you have built and still move it forward, in 105 minutes a week total.',
blocks:[{f:1,t:2,type:'Settle',mod:0,note:'Find the loads. Two sets, both hard.'},
{f:3,t:5,type:'Push',mod:0,note:'Add load or a rep every session. Second set to true failure.'},
{f:6,t:6,type:'Consolidate',mod:-1,note:'Back off, then decide your next block.'}],
schedule:['A','rest','B','rest','C','sport','rest'],
sessions:{
A:{n:'Full body A',w:'either',mins:35,ex:[
{n:'Back squat',s:2,r:'6-8',rest:180},
{n:'Incline barbell bench press',s:2,r:'8-10',rest:150},
{n:'Weighted pull-up',s:2,r:'6-8',rest:150},
{n:'Romanian deadlift',s:2,r:'10',rest:120},
{n:'Seated calf raise',s:2,r:'15',t:'Superset',rest:30},
{n:'Ab wheel',s:2,r:'12',rest:60}]},
B:{n:'Full body B',w:'either',mins:35,ex:[
{n:'Deadlift',s:2,r:'5',rest:210},
{n:'Weighted dip',s:2,r:'8-10',rest:150},
{n:'Cable row',s:2,r:'10-12',rest:120},
{n:'Bulgarian split squat',s:2,r:'10 per side',rest:105},
{n:'Lateral raise',s:2,r:'15-20',t:'Superset',rest:30},
{n:'EZ bar curl',s:2,r:'12',rest:60}]},
C:{n:'Full body C',w:'either',mins:35,fin:'Assault bike · 6×30s hard / 60s easy',ex:[
{n:'Barbell overhead press',s:2,r:'6-8',rest:180},
{n:'Front squat',s:2,r:'8',rest:150},
{n:'Barbell bent-over row',s:2,r:'8-10',rest:120},
{n:'Lying leg curl',s:2,r:'12',rest:105},
{n:'Rope tricep extension',s:2,r:'12',t:'Superset',rest:30},
{n:'Hanging leg raise',s:2,r:'15',rest:60}]}}};

/* ============ P6 · SIMPLE & SINISTER ============ */
P.p6={id:'p6',name:'Simple & Sinister',sub:'Home · 20–30 min · pure Pavel',
weeks:6,where:'Home',bias:'Strength endurance',days:6,pavel:true,
why:'Pavel Tsatsouline\'s rules, not bodybuilding rules: never to failure, strength as a skill, practise daily. Swings and get-ups every day, pressing and pulling ladders three days a week. Twenty to thirty minutes. It will build the KB engine, the shoulder integrity and the grip that make every other programme on this list better.',
blocks:[{f:1,t:2,type:'Groove · 16kg',mod:0,note:'16kg throughout. Perfect technique, never breathless.'},
{f:3,t:4,type:'Transition',mod:0,note:'Swings move to 24kg. Get-ups stay at 16kg.'},
{f:5,t:6,type:'Sinister',mod:1,note:'24kg both. Target: 100 swings in 5 min, 10 get-ups in 10 min.'}],
schedule:['A','B','A','B','A','B','rest'],
sessions:{
A:{n:'Swings & get-ups',w:'home',mins:25,ex:[
{n:'KB halo',s:3,r:'5 per direction',rest:30},
{n:'KB goblet squat',s:3,r:'5',t:'Deep ROM',rest:30},
{n:'KB two-arm swing',s:10,r:'10',t:'EMOM',rest:0},
{n:'KB Turkish get-up',s:10,r:'1 per side',t:'TUT',rest:0}]},
B:{n:'Press & pull ladder',w:'home',mins:30,ex:[
{n:'KB halo',s:3,r:'5 per direction',rest:30},
{n:'KB military press',s:5,r:'Ladder 1-2-3',t:'Ladder',rest:90},
{n:'Pull-up',s:5,r:'Ladder 1-2-3',t:'Ladder',rest:90},
{n:'KB single-arm swing',s:10,r:'10 per side',t:'EMOM',rest:0},
{n:'KB Turkish get-up',s:5,r:'1 per side',rest:60}]}}};

/* ============ P7 · TRAIL & SUMMIT ============ */
P.p7={id:'p7',name:'Nimsdai Purja - Trail & Summit',sub:'Mixed · hiking and trail capacity',
weeks:8,where:'Gym + home + outdoors',bias:'Endurance',days:5,bare:true,endurance:true,
why:'Built for the mountains in your goals list. Posterior chain, single-leg strength, ATG ankle and knee work, and a genuine aerobic base — this is one of only two programmes where endurance outranks the mirror. Descents are the training stimulus most people skip, so they are programmed deliberately.',
blocks:[{f:1,t:3,type:'Base',mod:0,note:'Aerobic volume climbs. Runs stay easy — Zone 2 means conversational.'},
{f:4,t:4,type:'Deload',mod:-1,note:'Half the running volume. Legs recover.'},
{f:5,t:7,type:'Specific',mod:1,note:'Hills, loaded carries, long descents. Pack weight goes on.'},
{f:8,t:8,type:'Taper',mod:-1,note:'Taper into the trip or the peak hike.'}],
schedule:['A','B','C','D','E','sport','rest'],
sessions:{
A:{n:'Posterior & single leg',w:'gym',mins:50,ex:[
{n:'Romanian deadlift',s:4,r:'8',t:'3s ecc',rest:150},
{n:'Bulgarian split squat',s:4,r:'10 per side',t:'Deep ROM',rest:120},
{n:'Nordic curl',s:3,r:'6',t:'4s ecc',rest:120},
{n:'Standing calf raise',s:4,r:'15',rest:60},
{n:'Tibialis raise',s:4,r:'20',t:'Superset',rest:45},
{n:'KB suitcase carry',s:4,r:'40m per side',rest:75}]},
B:{n:'Zone 2 run',w:'out',mins:45,ex:[
{n:'Zone 2 run',s:1,r:'40-50 min easy',rest:0},
{n:'Ab wheel',s:3,r:'12',rest:60}]},
C:{n:'Upper & core',w:'home',mins:38,ex:[
{n:'Ring pull-up',s:4,r:'8',rest:120},
{n:'Ring dip',s:4,r:'10',rest:105},
{n:'KB military press',s:3,r:'8 per side',rest:90},
{n:'Ring row',s:3,r:'12',rest:75},
{n:'KB overhead carry',s:3,r:'40m per side',rest:75},
{n:'Hollow hold',s:3,r:'45s',rest:45}]},
D:{n:'Hills & ankles',w:'out',mins:45,ex:[
{n:'Hill sprint',s:10,r:'30s up / walk down',rest:0},
{n:'Slant board split squat',s:3,r:'12 per side',t:'Deep ROM',rest:75},
{n:'Tibialis raise',s:3,r:'25',rest:45},
{n:'Jump rope',s:5,r:'60s',rest:45}]},
E:{n:'Squat & load carry',w:'gym',mins:50,ex:[
{n:'Back squat',s:4,r:'6-8',rest:180},
{n:'Walking lunge',s:3,r:'20 per side',rest:120},
{n:'Leg press',s:3,r:'15',t:'Deep ROM',rest:105},
{n:'Seated calf raise',s:4,r:'20',rest:60},
{n:'Sled push',s:6,r:'20m heavy',rest:90}]}},
sportNote:'Saturday is the long trail hike. Build from 90 min to 4 hours across the block, with a loaded pack from week 5.'};

/* ============ P8 · FAIRWAY ============ */
P.p8={id:'p8',name:'Fairway',sub:'Mixed · golf performance',
weeks:6,where:'Gym + home',bias:'Power & mobility',days:4,
why:'Aimed straight at the scratch-golf goal. Rotational power, thoracic and hip mobility, single-leg stability for the transition off the left leg, and grip and forearm work. Four days so it leaves room to actually play.',
blocks:[{f:1,t:2,type:'Mobility first',mod:0,note:'Range before power. Do not rush the rotational work.'},
{f:3,t:4,type:'Power',mod:1,note:'Speed of intent on every rotational rep. Quality over quantity.'},
{f:5,t:6,type:'Express',mod:0,note:'Lower volume, maximum speed. Play more.'}],
schedule:['A','B','rest','C','D','sport','rest'],
sessions:{
A:{n:'Rotational power & legs',w:'gym',mins:45,ex:[
{n:'Back squat',s:4,r:'6',t:'Explosive',rest:180},
{n:'Bulgarian split squat',s:3,r:'10 per side',rest:105},
{n:'KB windmill',s:3,r:'6 per side',t:'Deep ROM',rest:75},
{n:'Cable crunch',s:3,r:'15',t:'TUT',rest:60},
{n:'KB suitcase carry',s:3,r:'40m per side',rest:60}]},
B:{n:'Upper & grip · home',w:'home',mins:35,ex:[
{n:'Ring pull-up',s:4,r:'8',rest:120},
{n:'Ring dip',s:3,r:'10',rest:90},
{n:'KB bent-over row',s:3,r:'10 per side',rest:75},
{n:'Wrist curl',s:3,r:'20',t:'Superset',rest:30},
{n:'Wrist extension',s:3,r:'20',t:'Superset',rest:45},
{n:'Grip trainer',s:4,r:'20',rest:45},
{n:'Band pull-apart',s:3,r:'25',rest:30}]},
C:{n:'Hinge & anti-rotation',w:'gym',mins:45,ex:[
{n:'Romanian deadlift',s:4,r:'8',rest:150},
{n:'KB single-leg RDL',s:3,r:'10 per side',rest:90},
{n:'Face pull',s:3,r:'20',rest:60},
{n:'KB renegade row',s:3,r:'8 per side',rest:75},
{n:'Hanging leg raise',s:3,r:'15',rest:60}]},
D:{n:'Speed & mobility · home',w:'home',mins:32,ex:[
{n:'KB swing',s:8,r:'10 explosive',t:'EMOM',rest:0},
{n:'KB halo',s:3,r:'8 per direction',rest:30},
{n:'KB Cossack squat',s:3,r:'8 per side',t:'Deep ROM',rest:60},
{n:'KB Turkish get-up',s:4,r:'2 per side',t:'TUT',rest:75},
{n:'Jump rope',s:6,r:'45s',rest:30}]}},
sportNote:'Saturday is golf. Use the pre-round warm-up from your Golf Notes: stretching and activation, tap balls, towel impact drill, tempo and punch shots, then chipping and putting.'};

/* ============ P9 · LONG ROAD ============ */
P.p9={id:'p9',name:'Long Road',sub:'12 weeks · 21km or marathon prep',
weeks:12,where:'Outdoors + gym',bias:'Endurance',days:5,bare:true,endurance:true,
why:'Distance prep that does not shrink you. Three runs — easy, tempo, long — plus two full-body lifts with a single-leg emphasis. The lifts sit on the same days as the hard runs, never on rest days, exactly as the research says. Bare says it best: during a running block you do not peak your deadlift, you maintain it. Your PBs to beat: 21km 1:52:53, 10km 53:10, 5km 24:55.',
blocks:[{f:1,t:4,type:'Base',mod:0,note:'Easy volume. Almost all running conversational.'},
{f:5,t:5,type:'Deload',mod:-1,note:'Cut running 40%. Lifts stay.'},
{f:6,t:9,type:'Build',mod:1,note:'Tempo and interval work sharpens. Long run extends.'},
{f:10,t:11,type:'Peak',mod:1,note:'Longest runs. Lifting drops to maintenance — two hard sets, no more.'},
{f:12,t:12,type:'Taper & race',mod:-1,note:'Volume down 50%, intensity stays. Race day.'}],
schedule:['A','B','C','D','E','sport','rest'],
sessions:{
A:{n:'Intervals + lift',w:'out',mins:60,bare:1,ex:[
{n:'Interval run',s:6,r:'800m at 5k pace / 90s jog',rest:0},
{n:'Back squat',s:3,r:'6',rest:180},
{n:'Weighted pull-up',s:3,r:'8',rest:120},
{n:'Tibialis raise',s:3,r:'20',rest:45}]},
B:{n:'Easy run',w:'out',mins:40,ex:[
{n:'Zone 2 run',s:1,r:'35-45 min easy',rest:0},
{n:'Hollow hold',s:3,r:'45s',rest:45}]},
C:{n:'Tempo + lift',w:'out',mins:60,bare:1,ex:[
{n:'Tempo run',s:1,r:'20-30 min at half pace',rest:0},
{n:'Romanian deadlift',s:3,r:'8',rest:150},
{n:'Weighted dip',s:3,r:'10',rest:120},
{n:'Nordic curl',s:3,r:'6',t:'4s ecc',rest:90},
{n:'Standing calf raise',s:3,r:'20',rest:60}]},
D:{n:'Upper & core · home',w:'home',mins:35,ex:[
{n:'Ring pull-up',s:4,r:'8',rest:120},
{n:'KB military press',s:3,r:'8 per side',rest:90},
{n:'Ring row',s:3,r:'12',rest:75},
{n:'Ring dip',s:3,r:'10',rest:90},
{n:'Ab wheel',s:3,r:'12',rest:60}]},
E:{n:'Recovery & mobility',w:'home',mins:30,ex:[
{n:'Jump rope',s:5,r:'60s easy',rest:45},
{n:'KB Cossack squat',s:3,r:'8 per side',t:'Deep ROM',rest:60},
{n:'KB Turkish get-up',s:4,r:'2 per side',t:'TUT',rest:75},
{n:'Band pull-apart',s:3,r:'25',rest:30}]}},
sportNote:'Saturday is the long run. Build from 12km to 30km across the block, adding no more than 10% a week.'};

/* Display order: P1..P9 regardless of definition order */
const PORDER=['p1','p2','p3','p4','p5','p6','p7','p8','p9'];

/* ---- DAILY PROTOCOL JOURNAL (always on, survives programme swaps) ---- */
const JOURNAL=[
{k:'sleep',t:'Sleep 7 hours',m:'Non-negotiable. Everything else compounds off this.'},
{k:'plunge',t:'Cold plunge 7 min',m:'Morning routine, before training.'},
{k:'workout',t:"Today's workout",m:'Ticks itself when you finish a session.'},
{k:'mobility',t:'Stretch & mobility',m:'The nightly 15–20 min block.'},
{k:'thumb',t:'Thumb pulling',m:''},
{k:'carnivore',t:'Carnivore · don\'t eat poison',m:'Strict. Meat, eggs, dairy, salt, water.'},
{k:'water',t:'Water 2–3L',m:'Plus electrolytes.'},
{k:'whm',t:'Wim Hof breathing',m:'Three rounds.'},
{k:'nsdr',t:'NSDR',m:'10–20 min. Best mid-afternoon.'},
{k:'sun',t:'Sun exposure',m:'Early is better than long.'},
{k:'outdoors',t:'Outdoors',m:'Get outside properly, not just to the car.'},
{k:'read',t:'Read 10 pages',m:'FinPlan, investing, carnivore, psychology, Christian.'}];

const SUPPS=[{k:'electrolytes',t:'Electrolytes'},{k:'creatine',t:'Creatine 5g'},{k:'glutamine',t:'Glutamine'}];

/* ---- MOBILITY: GOWOD-style, targeting hips · ankles · shoulders ---- */
/* REMOVED in Beta 2.0 run 4: the old four-zone MOB table and its MOBROT weekly
   rotation. Mobility now runs on the six GoWod zones (MOBZONES / ZONES, further
   down this file) with a daily 15-minute rotation weighted to whichever zones
   score lowest. Nothing references MOB or MOBROT any more — leaving two rival
   mobility models in the file would guarantee somebody edits the dead one. */

const TOOLS=[{n:'Foam roller',c:'Quads, IT band, lats, thoracic. 60–90s per area, slow.'},
{n:'Spiked ball',c:'Feet, glutes, pecs, upper traps. Find the spot, breathe, wait for it to release.'},
{n:'Massage gun',c:'Pre-training on the target muscle for 30s to wake it up, post-training for 2 min to calm it down. Never on bone or joints.'}];

/* ---- BENCHMARKS ---- */
const BENCH=[
{k:'standard',n:'The Standard',u:'time',pb:'55:04',d:'50 pull-ups · 100 incline push-ups · 25 knee raises · 200 squats · 50 dips · 50 rows · 50 pike push-ups. For time.'},
{k:'anna',n:'Anna',u:'reps',pb:'80 + 80',d:'Pull-ups and dips. 30 min AMRAP.'},
{k:'astrid',n:'Astrid',u:'reps',pb:'',d:'Pull-ups, dips, crunches or toes-to-bar. 30 min AMRAP.'},
{k:'freya',n:'Freya',u:'time',pb:'',d:'5 rounds: 10 pull-ups · 10 dips · 15 diamond push-ups · 15 rows · 7 handstand push-ups.'},
{k:'barbarian',n:'Barbarian',u:'time',pb:'',d:'5 muscle-ups · 50 dips · 30 pull-ups · 60 push-ups · 5 muscle-ups. For time.'},
{k:'murph',n:'Murph',u:'time',pb:'',d:'1 mile run · 100 pull-ups · 200 push-ups · 300 squats · 1 mile run.'},
{k:'r5k',n:'5 km run',u:'time',pb:'24:55',d:'Target sub-24:00.'},
{k:'r10k',n:'10 km run',u:'time',pb:'53:10',d:'Flat and honest. Target sub-50:00 — that is 5:00/km.'},
{k:'r21k',n:'21 km run',u:'time',pb:'1:52:53',d:'Half marathon. Target sub-1:45 — 4:58/km. Race pace, not a training run.'},
{k:'ss',n:'Simple & Sinister',u:'time',pb:'',d:'100 swings in 5 min, then 10 Turkish get-ups in 10 min. 24kg.'}];

/* ---- LIFT PBs seeded from the Gym Pad note ---- */
const SEEDPB={'Flat barbell bench press':110,'Incline barbell bench press':90,'Back squat':170,
'Deadlift':160,'Rack pull':220,'Barbell overhead press':80,'Barbell bent-over row':100,
'Hack squat':160,'Leg press':470,'T-bar row':70,'Dumbbell row':44,'Close-grip bench press':80,
'Romanian deadlift':60,'Seated calf raise':180,'Lat pulldown':80,'Preacher curl':45};

/* ---- CARNIVORE FOOD LIST (per 100g) ---- */
const FOOD=[
{n:'Ribeye steak',k:291,p:24,f:22},{n:'Rump steak',k:220,p:27,f:12},
{n:'Sirloin steak',k:244,p:26,f:15},{n:'T-bone steak',k:247,p:25,f:16},
{n:'Beef mince (regular)',k:254,p:26,f:16},{n:'Beef patty',k:250,p:25,f:16},
{n:'Boerewors',k:330,p:17,f:29},{n:'Lamb chop',k:294,p:25,f:21},
{n:'Lamb rib',k:361,p:22,f:30},{n:'Venison',k:158,p:30,f:3},
{n:'Whole chicken (with skin)',k:239,p:27,f:14},{n:'Chicken thigh',k:209,p:26,f:11},
{n:'Eggs (whole)',k:143,p:13,f:10},{n:'Egg yolk',k:322,p:16,f:27},
{n:'Bacon',k:541,p:37,f:42},{n:'Beef liver',k:135,p:20,f:4},
{n:'Bone marrow',k:786,p:7,f:84},{n:'Biltong',k:340,p:55,f:12},
{n:'Droëwors',k:410,p:45,f:25},{n:'Butter',k:717,p:1,f:81},
{n:'Beef tallow',k:902,p:0,f:100},{n:'Full cream milk',k:64,p:3,f:4},
{n:'Raw milk',k:66,p:3,f:4},{n:'Kefir',k:60,p:3,f:3},
{n:'Amasi',k:62,p:3,f:3},{n:'Greek yoghurt (full fat)',k:97,p:9,f:5},
{n:'Cream',k:340,p:2,f:36},{n:'Cottage cheese',k:98,p:11,f:4},
{n:'Cheddar cheese',k:403,p:25,f:33},{n:'Hake / white fish',k:90,p:18,f:1},
{n:'Salmon',k:208,p:20,f:13},{n:'Sardines',k:208,p:25,f:11}];

const MEALS={
bulk:[{n:'Meal 1',d:'Beef mince or patties (500g) + a glass of kefir or amasi'},
{n:'Meal 2',d:'10–12 eggs scrambled with milk, Greek yoghurt, creatine and salt'},
{n:'Meal 3',d:'Steak, lamb chops or a whole chicken + a glass of kefir or amasi'},
{n:'Fat drivers',d:'Butter on everything, keep the yolks, choose ribeye over rump, cream in the coffee. This is how you reach 3,500 without endless chewing.'}],
lean:[{n:'Meal 1',d:'500g mince or 4 beef patties'},
{n:'Meal 2',d:'10–12 eggs scrambled with milk, Greek yoghurt, creatine and salt'},
{n:'Meal 3',d:'500–700g steak or lamb chops or a whole chicken'}],
shred:[{n:'Meal 1',d:'10–12 eggs scrambled with creatine and salt'},
{n:'Meal 2',d:'Steak, mince, patty, lamb chop or whole chicken'}]};

/* ============================================================================
   v4 ADDITIONS
   ========================================================================== */

/* ---- MOTIVATION. Juan's own lines. Shown on Today, in-session and on finish. ---- */
const QUOTES=[
'Go One More.',
'Hard To Kill.',
'No one cares. Work harder.',
'Perspective & Gratitude.',
'HWPO — Hard Work Pays Off.',
'No problems. Just more work to be done.',
'Pressure is a privilege.',
'Intensity is my sanctuary.',
'Bet on yourself every single day.',
'Be a man of your word — do what you say you’ll do.',
'It’s a principle.',
'Standards before comfort.',
'Growth happens outside the comfort zone.',
'I don’t fear the man who has practised 1,000 kicks once, but the man who has practised 1 kick 1,000 times.',
'Enjoy the hard days. Not every day is going to be fun, but the hard days are when you get better.',
'Success is rented, never owned. Rent’s due every day.'];
/* Deterministic per day so the line does not flicker on every re-render,
   but the in-session tip rotates on the set index. */
function quoteFor(seed){
  const n=(seed===undefined)
    ? Math.floor(new Date(todayISO()).getTime()/864e5)
    : Math.abs(seed|0);
  return QUOTES[n%QUOTES.length];
}

/* ---- STRIKING. Long bag + gloves are now part of the home kit. ---- */
Object.assign(EX,{
'Shadow boxing':{g:'cal',p:'cond',m:['delts','core','calves','conditioning'],c:'No bag, no gloves. Hands up, chin down, move the feet. This is where technique is actually built — slow and correct beats fast and sloppy.'},
'Bag work — boxing':{g:'cal',p:'cond',m:['delts','core','back','conditioning'],c:'Rotate the hips and the rear heel on every cross. Snap the punch back — the retraction is the shot, not the extension. Wrap or glove up every time; the bag does not care about your knuckles.'},
'Bag work — kickboxing':{g:'cal',p:'cond',m:['quads','glutes','core','conditioning'],c:'Round kick turns over the standing foot — heel points at the target. Shin, not instep. Hands stay up when you kick or you have just paid for the kick with your head.'},
'Bag work — Muay Thai':{g:'cal',p:'cond',m:['quads','core','delts','conditioning'],c:'Eight limbs: fists, elbows, knees, shins. Kick through the bag, not at it. Teeps to manage range, clinch knees to finish.'},
'Teep / push kick':{g:'cal',p:'cond',m:['quads','core','glutes'],c:'Knee up first, then extend. It is a jab with your foot — range control, not damage.'},
'Round kick':{g:'cal',p:'cond',m:['quads','glutes','core'],c:'Step out at 45°, turn the standing heel over, whip the shin through. Arm swings down for torque.'},
'Knee strike':{g:'cal',p:'cond',m:['quads','glutes','core'],c:'Pull down as the knee comes up. Point the toe, drive the hip through.'},
'Elbow strike':{g:'cal',p:'cond',m:['delts','core','back'],c:'Short range only. Turn the whole torso — the elbow is just the point of contact.'},
'Slip & roll drill':{g:'cal',p:'cond',m:['core','calves'],c:'Bend the knees, not the waist. Head off the centre line, eyes stay on the bag.'},
'Bag clinch knees':{g:'cal',p:'cond',m:['core','quads','glutes','conditioning'],c:'Hands behind the bag, elbows in, break the posture down, alternate knees. Lung-burner.'},
/* --- athletic / power, for the Justin King block --- */
'Box jump':{g:'cal',p:'legs',m:['quads','glutes','calves'],c:'Land soft and quiet in the same shape you left the floor in. Step DOWN, never jump down \u2014 the landing is where achilles injuries come from. Low reps, full recovery, this is a power lift not a conditioning one.'},
'Med ball rotational throw':{g:'gym',p:'core',m:['core','glutes','delts'],c:'Rotate from the hips and the back foot, not the lumbar spine. Throw as hard as you can \u2014 intent is the whole exercise. Doubles as golf transition work.'},
'Farmer carry':{g:'cal',p:'core',m:['forearms','traps','core','glutes'],c:'Heavy as you can hold, ribs down, shoulders back, walk tall and quiet. Grip, trunk and posture in one. Your kettlebells work for this at home.'}});

/* Striking cardio types (box / kick / muay) are added to CARDIO in app.js —
   CARDIO is declared there and data.js loads first, so it cannot be touched here. */

/* ---- KETTLEBELL COMPLEXES ----
   Straight from Juan's Hard to Kill note. These are OPTIONAL: run one as a
   finisher on any session, or as a standalone second workout for the day.
   They are deliberately short and unbroken — the bell does not come down
   inside a round. Rest is between rounds only. */
const KBX={
pd:{bench:'kbx_pd',n:'PD Special',rounds:5,rest:75,kit:'1 bell',
  seq:[['KB bent-over row',5],['KB two-arm swing',5],['KB thruster',5]],
  note:'The cleanest one to start with. Row, swing, thruster — unbroken, then set it down.'},
gimli:{bench:'kbx_gimli',n:'Gimli',rounds:5,rest:75,kit:'1 bell',
  seq:[['KB two-arm swing',5],['KB high pull',4],['KB goblet squat',3]],
  note:'Descending ladder. Play with the rep numbers as you get fitter — 5/4/3 is the floor, not the rule.'},
zeus:{n:'Zeus',rounds:7,rest:90,kit:'1 bell · all one side, then switch',bench:'zeus',
  seq:[['KB single-leg RDL',7],['KB clean',6],['KB military press',5]],
  note:'7 single-arm deadlifts, 6 cleans, 5 presses. Finish every rep on one arm before you switch. Optional extras between rounds: dips, pull-ups, lunges. Benchmark is 7 rounds for time.'},
achilles:{n:'Achilles',rounds:7,rest:90,kit:'1 bell · same side throughout',bench:'achilles',
  seq:[['KB single-arm swing',5],['KB snatch',5],['KB overhead lunge',5],['Pull-up',10],['Hanging leg raise',10]],
  note:'5 swings, 5 snatches, 5 overhead lunges, then 10 pull-ups and 10 leg raises. All the bell work same side, rest, then switch. Benchmark is 7 rounds for time.'},
athena:{bench:'kbx_athena',n:'Athena',rounds:5,rest:75,kit:'1 bell',
  seq:[['KB two-arm swing',7],['KB high pull',7],['KB clean',4]],
  note:'Squat cleans are 4 per side, offset. Reversible — run it backwards once it feels easy.'},
hercules:{n:'Hercules',rounds:7,rest:60,kit:'1 bell · switch sides each round',bench:'hercules',
  seq:[['KB two-arm swing',5],['KB clean',6],['KB push press',7]],
  note:'5 swings, 6 cleans, 7 push presses. Seven rounds, switch sides each round. Reversible. Benchmark is 7 rounds for time.'},
mick:{bench:'kbx_mick',n:'Big Mick',rounds:7,rest:60,kit:'1 bell · single arm · switch each round',
  seq:[['KB bent-over row',3],['KB single-arm swing',4],['KB snatch',5]],
  note:'3/4/5 or 5/6/7. Heavier bell + more rest = strength. Lighter bell + less rest = engine. Pick one, do not split the difference.'},
flow:{bench:'kbx_flow',n:'Flow',rounds:5,rest:75,kit:'1 bell · continuous',
  seq:[['KB two-arm swing',5],['KB snatch',3],['KB thruster',3],['KB windmill',2]],
  note:'One movement melts into the next — swing to snatch to thruster to windmill. Quality over speed; this one is a skill session disguised as conditioning.'},
leopard:{bench:'kbx_leopard',n:'Leopard Flow',rounds:5,rest:75,kit:'2 bells if you have them',
  seq:[['KB two-arm swing',5],['KB clean',5],['KB front rack squat',5],['KB thruster',5]],
  note:'Straight into the next movement, rest ONLY after the thrusters. With one bell, do both sides before resting.'},
orca:{bench:'kbx_orca',n:'Orca Flow',rounds:5,rest:75,kit:'2 bells if you have them',
  seq:[['KB two-arm swing',5],['KB snatch',5],['KB thruster',5],['KB windmill',5]],
  note:'Straight into the next movement, rest ONLY after the thrusters. With one bell, do both sides before resting.'},
emom1:{bench:'kbx_emom1',n:'Full Body EMOM',rounds:20,rest:0,kit:'1 bell · 20 min EMOM',
  seq:[['KB snatch',7],['Push-up',25],['KB thruster',7],['KB renegade row',10]],
  note:'20 minute EMOM. Single-arm snatches and thrusters. Whatever is left of the minute is your rest — that is the whole game.'},
emom2:{bench:'kbx_emom2',n:'Snatch & Squat EMOM',rounds:20,rest:0,kit:'1 bell · 20 min EMOM',
  seq:[['KB snatch',7],['KB goblet squat',10]],
  note:'The minimalist EMOM. Swap the pairing when it gets stale: snatches + presses, swings + push-ups, high pulls + pull-ups, cleans + lunges.'},
rogan:{bench:'kbx_rogan',n:'Rogan',rounds:3,rest:75,kit:'1 bell · 10 reps each',
  seq:[['KB single-arm swing',10],['KB clean & press',10],['KB windmill',10],['KB renegade row',10]],
  note:'Warm up first: 25 push-ups and 50 squats. Then 3 rounds of 10 on each movement.'}};
const KBXORDER=['pd','gimli','zeus','achilles','athena','hercules','mick','flow',
'leopard','orca','emom1','emom2','rogan'];
/* Turn a complex into a normal session object the player can run. */
function kbxSession(k){const c=KBX[k];if(!c)return null;
  return {id:'kbx_'+k,n:c.n+' Complex',w:'home',mins:Math.max(12,Math.round(c.rounds*(c.seq.length*22+c.rest)/60)),
    kbx:1,note:c.note,
    ex:c.seq.map(s=>({n:s[0],s:c.rounds,r:String(s[1]),rest:0,inx:1}))
      .concat([])};
}

/* ---- MARTIAL ARTS SESSIONS. One for each of the three styles. ---- */
const XTRA={
box:{id:'x_box',n:'Boxing · bag',w:'home',mins:32,style:'box',
  fin:'Jump rope · 3×3 min',
  note:'Wrap or glove up. 3 minute rounds, 1 minute rest — use the interval timer, preset is in Tools.',
  ex:[{n:'Shadow boxing',s:3,r:'3 min rounds',rest:60},
    {n:'Bag work — boxing',s:6,r:'3 min rounds',rest:60},
    {n:'Slip & roll drill',s:3,r:'2 min',rest:45},
    {n:'Jump rope',s:3,r:'3 min',rest:45}]},
kick:{id:'x_kick',n:'Kickboxing · bag',w:'home',mins:36,style:'kick',
  fin:'Teeps · 50 per leg, slow and correct',
  note:'Hands never drop when you kick. Shin conditioning comes from volume over months, not from one brutal session.',
  ex:[{n:'Shadow boxing',s:2,r:'3 min rounds',rest:45},
    {n:'Round kick',s:4,r:'20 per side',rest:60},
    {n:'Bag work — kickboxing',s:6,r:'3 min rounds',rest:60},
    {n:'Teep / push kick',s:3,r:'15 per side',rest:45},
    {n:'Jump rope',s:3,r:'3 min',rest:45}]},
muay:{id:'x_muay',n:'Muay Thai · bag',w:'home',mins:40,style:'muay',
  fin:'Clinch knees · 3×1 min unbroken',
  note:'Eight limbs. Kick through the bag. If your shins are sore into the next session, cut the volume — you cannot train hurt.',
  ex:[{n:'Shadow boxing',s:2,r:'3 min rounds',rest:45},
    {n:'Teep / push kick',s:3,r:'15 per side',rest:45},
    {n:'Round kick',s:4,r:'20 per side',rest:60},
    {n:'Knee strike',s:3,r:'20 per side',rest:45},
    {n:'Elbow strike',s:3,r:'20 per side',rest:45},
    {n:'Bag work — Muay Thai',s:6,r:'3 min rounds',rest:60},
    {n:'Bag clinch knees',s:3,r:'1 min',rest:60}]}};
const XTRAORDER=['box','kick','muay'];

/* ---- P10 · JUSTIN KING FUNCTIONAL HYPERTROPHY ----
   Justin King is the strength & performance coach Chris Bumstead brought in for
   the 2024 Olympia and leaned on through his retirement / "Jacklete" phase. His
   background is NFL/MLB/NHL/UFC athlete prep, not stage bodybuilding, and the
   published method is consistent on four points: (1) pair strength work and
   volume work in the same week because the combination drives more muscle damage
   and therefore more hypertrophy, (2) eccentrics are the fastest route to
   strength, and strength is the foundation hypertrophy is built on, (3) train
   patterns and athletic qualities, not just muscles, and (4) technique and
   position before load.

   What follows is JHFP's interpretation of that published philosophy for Juan's
   equipment and restrictions — it is NOT a transcription of a paid STNDRD
   programme. Each day opens with a heavy, low-rep strength lift on a long rest,
   then a loaded eccentric, then hypertrophy volume, then an athletic finisher. */
P.p10={id:'p10',name:'Justin King Functional Hypertrophy',sub:'Gym · strength and size in the same week, the Jacklete way',
weeks:8,where:'Gym',bias:'Functional hypertrophy',days:5,fst:false,
why:'Justin King — the performance coach behind Chris Bumstead\'s Olympia prep and his post-retirement Jacklete phase — builds athletes, not just physiques. The method is strength work and volume work inside the same week rather than in separate blocks, because the combination causes more muscle damage than either alone. Eccentrics carry the strength; the volume carries the size; a short athletic finisher keeps you able to actually use it. Every day runs the same four-part shape: heavy primary on a long rest, loaded eccentric, hypertrophy volume, athletic finisher. This is the programme to run when you want to look like a bodybuilder and still move like an athlete.',
blocks:[{f:1,t:2,type:'Position & base',mod:0,note:'Technique before load. Leave three reps in the tank on everything — you are earning the right to go heavy in week 3.'},
{f:3,t:5,type:'Strength emphasis',mod:0,note:'Primaries get heavy — 3-5 reps, full rest, nothing grinding. Eccentrics go to 5 seconds. Volume work stays honest.'},
{f:6,t:7,type:'Hypertrophy emphasis',mod:1,note:'Primaries hold, volume climbs. Last set of each hypertrophy movement to failure. This is the week the size shows up.'},
{f:8,t:8,type:'Deload & retest',mod:-1,note:'Two-thirds of the work. Retest the primary lifts at the end of the week and log the PBs.'}],
schedule:['A','B','C','D','E','sport','rest'],
sessions:{
A:{n:'Lower · squat strength',w:'gym',mins:58,fin:'Sled push · 6×20m heavy, walk back',ex:[
{n:'Back squat',s:5,r:'3-5',rest:180},
{n:'Front squat',s:3,r:'6-8',t:'5s ecc',rest:120},
{n:'Bulgarian split squat',s:3,r:'10-12 per side',t:'Deep ROM',rest:90},
{n:'Leg press',s:3,r:'12-15',rest:90},
{n:'Lying leg curl',s:3,r:'12-15',t:'3s ecc',rest:60},
{n:'Standing calf raise',s:4,r:'15-20',t:'Iso hold',rest:45}]},
B:{n:'Upper · press strength',w:'gym',mins:56,fin:'Assault bike · 8×20s hard / 40s easy',ex:[
{n:'Flat barbell bench press',s:5,r:'3-5',rest:180},
{n:'Incline dumbbell press',s:4,r:'8-10',t:'5s ecc',rest:120},
{n:'Barbell overhead press',s:4,r:'6-8',rest:105},
{n:'Weighted dip',s:3,r:'8-10',rest:90},
{n:'Cable lateral raise',s:4,r:'15-20',t:'TUT',rest:45},
{n:'Rope tricep extension',s:3,r:'12-15',rest:60}]},
C:{n:'Posterior · hinge strength',w:'gym',mins:56,fin:'Sled pull · 6×20m backwards',ex:[
{n:'Deadlift',s:5,r:'3-5',rest:180},
{n:'Romanian deadlift',s:4,r:'8-10',t:'5s ecc',rest:120},
{n:'Barbell bent-over row',s:4,r:'8-10',rest:105},
{n:'Pull-up',s:3,r:'AMRAP minus 2',rest:105},
{n:'Cable row',s:3,r:'12-15',t:'Iso hold',rest:75},
{n:'Ab wheel',s:3,r:'10-12',rest:60}]},
D:{n:'Athletic · power & carry',w:'gym',mins:48,fin:'Hill sprints · 8×60m, walk down',ex:[
{n:'KB two-arm swing',s:5,r:'10',rest:90},
{n:'Box jump',s:3,r:'3',rest:90},
{n:'Med ball rotational throw',s:4,r:'6 per side',rest:75},
{n:'KB front rack lunge',s:3,r:'10 per side',rest:75},
{n:'Farmer carry',s:4,r:'40m heavy',rest:75},
{n:'Hanging leg raise',s:3,r:'12-15',t:'TUT',rest:60}]},
E:{n:'Upper · volume & arms',w:'gym',mins:52,fin:'Rower · 5×250m hard',ex:[
{n:'Incline barbell bench press',s:4,r:'8-10',rest:105},
{n:'Lat pulldown',s:4,r:'10-12',t:'3s ecc',rest:90},
{n:'Chest-supported row',s:3,r:'12-15',rest:75},
{n:'Lateral raise',s:4,r:'15-20',t:'Drop set',rest:45},
{n:'Preacher curl',s:4,r:'10-12',t:'3s ecc',rest:60},
{n:'Close-grip bench press',s:4,r:'10-12',rest:75},
{n:'Face pull',s:3,r:'20',t:'Iso hold',rest:45}]}}};
PORDER.push('p10');

/* ============ P11 · ADVENTURER ============
   The programme that is not a programme. No schedule, no blocks to finish, no
   week counter — you choose what you train every day from everything the app
   already holds: any programme's sessions, the kettlebell complexes, the
   calisthenics benchmarks, striking, your own saved workouts, or one built by
   the generator.

   It exists for three situations Juan named: a new member who wants to explore
   before committing, somebody between blocks, and anyone who simply does not
   want to follow a programme. It is the DEFAULT for new profiles — landing a
   stranger in week 1 of a ten-week kettlebell block is a bad first screen.

   `weeks:0` marks it open-ended. Anything reading p.weeks must treat 0 as "no
   end", and `schedule:null` is what every queue function checks before doing
   anything. Do not give this programme a schedule to make some loop simpler —
   the absence IS the feature. */
P.p11={id:'p11',name:'Adventurer',sub:'No programme · pick your own workout each day',
weeks:0,where:'Anywhere',bias:'Explore',days:0,open:true,
schedule:null,sessions:{},
why:'No block, no week counter, nothing to fall behind on. Train what you feel like from the whole library — a kettlebell complex, a calisthenics benchmark, a session out of any of the ten programmes, one of your own, or one the generator builds you. Everything still counts: volume, calories, PBs and the anatomy chart all fill in exactly as they would on a programme. When you are ready to commit, pick a real block from More → Programmes.',
blocks:[{f:1,t:999,type:'Open',mod:0,
  note:'No prescribed progression — you are steering. The app still tracks every set, so when you do pick a block you will start it knowing where you actually are.'}]};
PORDER.unshift('p11');

/* ---- REST PERIOD REVISION (v4) ----
   Juan asked for 30 seconds off every prescribed rest, across the board. The
   prescriptions were written as ceilings for a first week and were leaving him
   standing around. A 45s floor is kept deliberately: below that a heavy set of
   3-5 stops being a strength set and becomes conditioning, which is not what the
   primaries are there for. Anything already at or under the floor is left alone,
   and rest:0 (supersets, cardio, unbroken complexes) stays 0.
   The "Done resting" button now logs ACTUAL rest, so these numbers are a
   guideline he can beat, not a rule he has to obey. */
const REST_CUT=30, REST_FLOOR=45;
function cutRest(){
  let n=0;
  /* Guard: this must only ever apply ONCE. Without the flag, any second call
     (a re-eval in the test harness, a future hot reload) shaves another 30s off
     every prescription and quietly turns strength rests into conditioning. */
  if(P.__restcut)return 0;
  /* non-enumerable so it never shows up in a `for..in` over the programmes */
  Object.defineProperty(P,'__restcut',{value:1,enumerable:false,writable:true});
  for(const pk in P){const p=P[pk];if(!p||!p.sessions)continue;
    for(const sk in p.sessions){const s=p.sessions[sk];if(!s||!s.ex)continue;
      s.ex.forEach(e=>{
        if(!e.rest||e.rest<=0)return;                 // supersets and cardio stay 0
        if(e.rest<=REST_FLOOR)return;                 // already short enough
        const nw=Math.max(REST_FLOOR,e.rest-REST_CUT);
        if(nw!==e.rest){e.rest=nw;n++}});}}
  for(const xk in XTRA){XTRA[xk].ex.forEach(e=>{
    if(e.rest>REST_FLOOR)e.rest=Math.max(REST_FLOOR,e.rest-REST_CUT)})}
  return n;
}
const REST_CUT_COUNT=cutRest();

/* ============================================================================
   BETA 1.0 ADDITIONS
   ========================================================================== */

/* ---- CALISTHENICS WORKOUTS ----
   The named sessions out of the Hard to Kill note, runnable like the KB
   complexes. The scored ones (The Standard, Barbarian, Murph, Anna, Astrid,
   Freya) are ALSO benchmarks — `bench` links them so finishing one prompts a
   score. Diana, Faith and Grace have no stated target, so they are workouts only. */
const CAL={
standard:{n:'The Standard',mins:55,bench:'standard',kind:'For time',
  note:'Your flagship test. PB 55:04 — that is the number to beat. Scale the progressions as they come: knee raises become toes-to-bar, squats become pistols, rows become muscle-ups, pike push-ups become handstand push-ups.',
  ex:[{n:'Pull-up',s:1,r:'50',rest:0},{n:'Incline push-up',s:1,r:'100',rest:0},
    {n:'Hanging knee raise',s:1,r:'25',rest:0},{n:'Bodyweight squat',s:1,r:'200',rest:0},
    {n:'Ring dip',s:1,r:'50',rest:0},{n:'Ring row',s:1,r:'50',rest:0},
    {n:'Pike push-up',s:1,r:'50',rest:0}]},
barbarian:{n:'Barbarian',mins:22,bench:'barbarian',kind:'For time',
  note:'Muscle-ups top and tail it. If the muscle-up is not there yet, sub 3 pull-ups plus 3 dips for each one and note it against the score.',
  ex:[{n:'Ring muscle-up',s:1,r:'5',rest:0},{n:'Ring dip',s:1,r:'50',rest:0},
    {n:'Pull-up',s:1,r:'30',rest:0},{n:'Push-up',s:1,r:'60',rest:0},
    {n:'Ring muscle-up',s:1,r:'5',rest:0}]},
murph:{n:'Murph',mins:60,bench:'murph',kind:'For time',
  note:'Lt. Michael P. Murphy. Body armour optional and honestly not recommended until the unweighted time is respectable. Partition the middle however you like — 20 rounds of 5/10/15 is the standard way.',
  ex:[{n:'Zone 2 run',s:1,r:'1 mile',rest:0},{n:'Pull-up',s:1,r:'100',rest:0},
    {n:'Push-up',s:1,r:'200',rest:0},{n:'Bodyweight squat',s:1,r:'300',rest:0},
    {n:'Zone 2 run',s:1,r:'1 mile',rest:0}]},
anna:{n:'Anna',mins:30,bench:'anna',kind:'30 min AMRAP',
  note:'Pull-ups and dips, alternating, for 30 minutes. PB is 80 and 80. Pace it — going out hard here is how you end up at 50.',
  ex:[{n:'Pull-up',s:1,r:'AMRAP 30 min',rest:0},{n:'Ring dip',s:1,r:'AMRAP 30 min',rest:0}]},
astrid:{n:'Astrid',mins:30,bench:'astrid',kind:'30 min AMRAP',
  note:'Anna with abs bolted on. Crunches or toes-to-bar, your call, but pick one and keep it for every attempt or the score means nothing.',
  ex:[{n:'Pull-up',s:1,r:'AMRAP 30 min',rest:0},{n:'Ring dip',s:1,r:'AMRAP 30 min',rest:0},
    {n:'Hanging knee raise',s:1,r:'AMRAP 30 min',rest:0}]},
freya:{n:'Freya',mins:32,bench:'freya',kind:'5 rounds',
  note:'Five straight rounds. The handstand push-ups are the limiter — pike push-ups against a wall until they come.',
  ex:[{n:'Pull-up',s:5,r:'10',rest:60},{n:'Ring dip',s:5,r:'10',rest:60},
    {n:'Diamond push-up',s:5,r:'15',rest:60},{n:'Ring row',s:5,r:'15',rest:60},
    {n:'Handstand push-up',s:5,r:'7',rest:75}]},
diana:{bench:'diana',n:'Diana',mins:26,kind:'4 rounds',
  note:'Four rounds. Short, and deliberately built around the things that get skipped: abs, forearms and the handstand.',
  ex:[{n:'Ab wheel',s:4,r:'12',rest:60},{n:'Wrist curl',s:4,r:'20',rest:45},
    {n:'Wrist extension',s:4,r:'20',rest:45},{n:'Grip trainer',s:4,r:'15',rest:45},
    {n:'Handstand hold',s:4,r:'Max hold',rest:75}]},
faith:{bench:'faith',n:'Faith',mins:45,kind:'Descending + supersets',
  note:'Split squats descend 15-15-12-12-10-10-7, then three supersets. The legs are done first on purpose — everything after is upper body, so fatigue does not cost you the squat pattern.',
  ex:[{n:'Bulgarian split squat',s:7,r:'15,15,12,12,10,10,7 per side',rest:75},
    {n:'Pike push-up',s:5,r:'15',t:'Superset',rest:0},
    {n:'Hanging knee raise',s:5,r:'20',rest:60},
    {n:'Pull-up',s:5,r:'10',t:'Superset',rest:0},
    {n:'Ring dip',s:5,r:'12',rest:60},
    {n:'KB Cossack squat',s:3,r:'10 per side',t:'Deep ROM',rest:60},
    {n:'Nordic curl',s:3,r:'6',t:'3s ecc',rest:75}]},
grace:{bench:'grace',n:'Grace',mins:34,kind:'Supersets',
  note:'Arms and vertical pressing. Pelican curls are the money movement here — go slow and do not let the shoulder take over from the biceps.',
  ex:[{n:'Handstand push-up',s:4,r:'7',rest:90},
    {n:'Chin-up',s:4,r:'10',t:'Superset',rest:0},
    {n:'Ring tricep extension',s:4,r:'20',rest:60},
    {n:'Ring bicep curl',s:4,r:'10',t:'Superset',rest:0},
    {n:'Ring tricep extension',s:4,r:'12',rest:60},
    {n:'Pike push-up',s:3,r:'15',rest:60}]}};
const CALORDER=['standard','barbarian','murph','anna','astrid','freya','diana','faith','grace'];
function calSession(k){const c=CAL[k];if(!c)return null;
  return {id:'cal_'+k,n:c.n,w:'home',mins:c.mins,cal:1,bench:c.bench,note:c.note,kind:c.kind,ex:c.ex};}

/* ---- movements the Calisthenics sessions need ---- */
Object.assign(EX,{
'Incline push-up':{g:'cal',p:'push',m:['chest','triceps','delts'],c:'Hands on a bench, bar or the rings set high. The higher the hands, the easier it is \u2014 this is the scaling dial for The Standard, not a lesser exercise.'},
'Bodyweight squat':{g:'cal',p:'legs',m:['quads','glutes','core'],c:'Full depth, hips below the knee, heels down. 200 of these in The Standard is as much a breathing test as a leg one \u2014 stay upright and keep the reps rhythmic.'},
'Handstand push-up':{g:'cal',p:'push',m:['delts','triceps','core'],c:'Against a wall until the free-standing version comes. Head to the floor, hands wider than a strict press. Scale with pike push-ups on a box, not with half reps.'}});

/* ---- KB COMPLEX BENCHMARKS ----
   Zeus, Achilles and Hercules are scored 7 rounds for time in the note, so they
   sit alongside Simple & Sinister as tests rather than just workouts. */
BENCH.push(
{k:'zeus',n:'Zeus Complex',u:'time',pb:'',d:'7 single-arm deadlifts · 6 cleans · 5 presses. All one side, then switch. 7 rounds for time.'},
{k:'achilles',n:'Achilles Complex',u:'time',pb:'',d:'5 single-arm swings · 5 snatches · 5 overhead lunges · 10 pull-ups · 10 leg raises. 7 rounds for time.'},
{k:'hercules',n:'Hercules Complex',u:'time',pb:'',d:'5 swings · 6 cleans · 7 push presses. Switch sides each round. 7 rounds for time.'});

/* ---- FUEL ---- */
FOOD.push(
{n:'Chicken strips',k:165,p:31,f:4},
{n:'Chicken breast',k:165,p:31,f:4},
{n:'Parmesan cheese',k:431,p:38,f:29});

/* ---- BENCHMARKS, DERIVED ----
   Beta 2.0. Juan's instruction: anything with a benchmark parameter should be
   loggable, "even if there is not yet a measurement". Rather than hand-writing
   an entry per complex — which drifts the moment a complex is added — every
   KBX and CAL workout carrying a `bench` key that BENCH does not already cover
   gets one generated here.

   That means adding a new complex to KBX automatically makes it scorable. Do
   not replace this with a static list; the whole point is that it cannot fall
   out of step. The hand-written entries above still win, so The Standard, the
   runs, Simple & Sinister and the three named 7-round complexes keep their
   own wording and their existing PBs. */
/* Called ONCE at the very END of this file — see the bottom. It was an IIFE
   here, which meant it ran before the run-4 complexes were appended below and
   silently left seventeen of them unscorable. Anything that derives from the
   content tables has to run after ALL of them are populated. */
function deriveBenchmarks(){
  const have={};BENCH.forEach(b=>have[b.k]=1);
  KBXORDER.forEach(k=>{
    const c=KBX[k];if(!c||!c.bench||have[c.bench])return;
    const emom=/EMOM/i.test(c.kit||'')||/EMOM/i.test(c.n||'');
    BENCH.push({k:c.bench,n:c.n+' complex',u:emom?'rounds':'time',pb:'',
      d:emom?(c.rounds+' minute EMOM. Score is rounds completed unbroken.')
            :(c.rounds+' rounds for time. '+c.seq.map(x=>x[1]+' '+x[0].replace(/^KB /,'')).join(' · ')+'.')});
    have[c.bench]=1;
  });
  CALORDER.forEach(k=>{
    const c=CAL[k];if(!c||!c.bench||have[c.bench])return;
    const amrap=/AMRAP/i.test(c.kind||'');
    BENCH.push({k:c.bench,n:c.n,u:amrap?'reps':'time',pb:'',
      d:c.kind+'. '+(amrap?'Score is total reps.':'Score is time to finish.')});
    have[c.bench]=1;
  });
}

/* ================= BETA 2.0 · RUN 4 =================
   New movements. Two groups:
     · the kettlebell variants the ported complexes call for
     · SANDBAG work, which Farm Strong is built on
   Every entry carries g (equipment group) and p (movement pattern) — the
   generator and the exercise picker both depend on them, and there is a test
   that fails if either is missing. */
Object.assign(EX,{
/* --- kettlebell variants the complexes need --- */
'KB gunslinger':{g:'kb',p:'pull',m:['back','delts','biceps'],c:'Row wide with the elbow flaring out and the bell finishing at the ribs, palm rotating. Hits the rear delt the plain row misses.'},
'KB gorilla row':{g:'kb',p:'pull',m:['back','biceps','core'],c:'Two bells on the floor, hinged over, row one while the other braces. Keep the hips square — the anti-rotation is half the exercise.'},
'KB half-kneeling press':{g:'kb',p:'push',m:['delts','triceps','core'],c:'Half kneeling, opposite knee up. Squeeze the down glute hard and press without leaning back — the position removes the cheat.'},
'KB halo squat':{g:'kb',p:'legs',m:['quads','glutes','delts','core'],c:'Halo around the head, then straight into a goblet squat. Opens the shoulders and loads the legs in one movement.'},
'KB deadlift high pull':{g:'kb',p:'legs',m:['glutes','hams','back','traps'],c:'Deadlift to a high pull in one motion. Hips drive, elbow leads, bell finishes at chin height.'},
'KB sumo deadlift':{g:'kb',p:'legs',m:['glutes','hams','quads','back'],c:'Wide stance, bell between the feet, flat back. The simplest way to load a hinge heavy with one bell.'},
'KB double front squat':{g:'kb',p:'legs',m:['quads','glutes','core'],c:'Two bells in the rack. The rack position is the limiter, not the legs — brace hard and breathe at the top.'},

/* --- SANDBAG. Farm Strong is built on these. A bag is awkward on purpose:
   it shifts, it does not balance, and it forces the whole body to fight it —
   which is exactly the quality real-world strength is made of. --- */
'Sandbag over-shoulder throw':{g:'cal',p:'legs',c1:1,m:['glutes','hams','back','core'],c:'Hinge, grip the bag low, extend violently and throw it over one shoulder. Alternate shoulders. The single best expression of farm strength there is.'},
'Sandbag shouldering':{g:'cal',p:'pull',c1:1,m:['back','glutes','core','biceps'],c:'Clean the bag onto the shoulder, set it down, repeat. Alternate sides each rep. Ugly by design.'},
'Sandbag bear hug carry':{g:'cal',p:'core',c1:1,m:['core','quads','back','forearms'],c:'Hug it to the chest, ribs down, walk. Everything holding you upright is working. Distance or time, not reps.'},
'Sandbag bear hug squat':{g:'cal',p:'legs',m:['quads','glutes','core','back'],c:'Squat holding the bag in a bear hug. It pulls you forward the whole way — that is the point.'},
'Sandbag clean & press':{g:'cal',p:'push',c1:1,m:['delts','glutes','back','triceps'],c:'Floor to overhead in two movements. Nothing about a bag is balanced, so the core works the entire time.'},
'Sandbag row':{g:'cal',p:'pull',m:['back','biceps','forearms'],c:'Hinged over, pull the bag to the stomach. A thick awkward grip does more for the forearms than any bar.'},
'Sandbag zercher squat':{g:'cal',p:'legs',m:['quads','glutes','core','back'],c:'Bag in the crooks of the elbows. Brutal on the upper back and the brace. Start lighter than you think.'},
'Sandbag drag':{g:'cal',p:'legs',c1:1,m:['quads','glutes','hams','core'],c:'Drag it backwards on a strap or by a handle. Pure posterior chain conditioning with no eccentric to recover from.'},
'Sandbag get-up':{g:'cal',p:'core',m:['core','delts','glutes','quads'],c:'Turkish get-up holding the bag on one shoulder. Slow, deliberate, and it will find every weak link you have.'},
'Sandbag walking lunge':{g:'cal',p:'legs',m:['quads','glutes','hams','core'],c:'Bag on the shoulders or bear-hugged. Long steps, knee kissing the floor, no rushing.'}
});

/* ---- THE MISSING COMPLEXES ----
   Seventeen complexes and flows that were in the Hard to Kill note but had
   never made it into the app — which was the single biggest gap the Beta 2.0
   note audit found. Rep schemes and benchmark parameters are transcribed from
   the note as written; where the note names a movement the library did not
   have, the closest real entry is used and the note wording is kept in the
   `note` field so nothing is lost in translation. */
Object.assign(KBX,{
david:{bench:'kbx_david',n:'David',rounds:5,rest:90,kit:'1 bell',
  seq:[['KB two-arm swing',7],['KB clean',6],['KB push press',5],['KB windmill',4],['KB halo',3]],
  note:'7 swings, 6 cleans, 5 push presses, 4 windmills, 3 halos. Descending ladder — the windmills and halos at the end are the recovery, not a rest. Benchmark is 5 rounds for time.'},
gideon:{bench:'kbx_gideon',n:'Gideon',rounds:7,rest:75,kit:'1 bell',
  seq:[['KB bent-over row',7],['KB two-arm swing',6],['KB snatch',5]],
  note:'7 rows, 6 swings, 5 snatches. Pull-dominant — this is the one to run when the week has been press-heavy. Benchmark is 7 rounds for time.'},
samson:{bench:'kbx_samson',n:'Samson',rounds:8,rest:60,kit:'1 bell · 20 min AMRAP',
  seq:[['KB bent-over row',7],['KB gunslinger',6],['KB clean & press',5]],
  note:'7 rows, 6 gunslingers, 5 clean & press. Benchmark is AMRAP in 20 minutes — score is rounds completed.'},
joshua:{bench:'kbx_joshua',n:'Joshua',rounds:5,rest:75,kit:'1 bell',
  seq:[['KB bent-over row',5],['KB two-arm swing',5],['KB thruster',5]],
  note:'5 rows, 5 swings, 5 thrusters. The simplest complex in the book and a good first one — three movements, one number, no thinking.'},
daniel:{bench:'kbx_daniel',n:'Daniel',rounds:7,rest:75,kit:'2 bells if you have them',
  seq:[['KB two-arm swing',5],['KB deadlift high pull',4],['KB goblet squat',3]],
  note:'5 swings, 4 deadlift high pulls, 3 goblet squats. Two-handed rather than single-arm, 7 rounds.'},
moses:{bench:'kbx_moses',n:'Moses',rounds:5,rest:90,kit:'1 bell · alternating',
  seq:[['KB Turkish get-up',3],['KB clean & press',5],['KB bent-over row',7],['KB Cossack squat',9]],
  note:'3 get-ups, 5 clean & press, 7 alternating rows, 9 alternating Cossack squats. An ascending ladder that starts with the hardest movement — get the get-ups done while you are fresh.'},
poseidon:{bench:'kbx_poseidon',n:'Poseidon',rounds:8,rest:60,kit:'1 bell · 20 min AMRAP',
  seq:[['KB two-arm swing',7],['KB high pull',6],['KB snatch',5]],
  note:'7 swings, 6 high pulls, 5 snatches. One movement family climbing in difficulty — swing to high pull to snatch is the same hinge getting more aggressive each time. Benchmark is AMRAP in 20 minutes.'},
thor:{bench:'kbx_thor',n:'Thor',rounds:10,rest:0,kit:'1 bell · 30 min AMRAP',
  seq:[['KB two-arm swing',5],['KB snatch',5],['KB thruster',5]],
  note:'One swing, one snatch, one thruster is a rep. Five reps is a round. Benchmark is a 30-minute AMRAP — score is rounds. Pace it; this one punishes a fast start.'},
polarbear:{bench:'kbx_polarbear',n:'Polar Bear Flow',rounds:7,rest:90,kit:'2 bells if you have them',
  seq:[['KB clean',5],['KB push press',5],['KB thruster',5],['KB two-arm swing',7],['KB high pull',6],['KB snatch',5]],
  note:'Two complexes back to back: 5 deadlift-cleans, 5 push presses, 5 thrusters both sides, then straight into 7 swings, 6 high pulls, 5 snatches. Rest, repeat for 7 rounds. The longest flow in the library.'},
grizzly:{bench:'kbx_grizzly',n:'Grizzly Flow',rounds:7,rest:60,kit:'1 bell',
  seq:[['KB two-arm swing',5],['KB snatch',5],['KB thruster',5]],
  note:'Swing, snatch, thruster — one of each is a rep, five reps a round. Complement it with push-ups, dips, pull-ups, rows, lunges or windmills between rounds. 7 rounds for time, or run it as a 20-30 minute EMOM or AMRAP.'},
silverback:{bench:'kbx_silverback',n:'Silverback Gorilla Flow',rounds:6,rest:90,kit:'2 bells',
  seq:[['KB gorilla row',5],['KB clean & press',5],['KB thruster',5],['Push-up',5]],
  note:'Double-bell flow. Five reps of each without putting the bells down, then rest. 5-7 rounds. The push-ups are done with the hands on the bell handles.'},
jaguar:{bench:'kbx_jaguar',n:'Jaguar',rounds:20,rest:15,kit:'1 bell · 40 min, three parts',
  seq:[['KB dead-stop swing',10],['KB American swing',10],['KB clean',5],['KB thruster',5]],
  note:'Three parts. 1: 10 min AMRAP warm-up — 5 dead-stop swings, 5 into American swings, 5 single-arm cleans a side, 5 clean-to-squats, 5 clean-squat-presses. 2: 20 min EMOM with 15s rest — 10 dead-stop swings, 10 into American swings, 5 clean-squat-presses a side. 3: 10 min AMRAP — 15 gorilla swings, 25 push-ups, 5 snatches a side, 10 rack reverse lunges a side.'},
panther:{bench:'kbx_panther',n:'Panther',rounds:5,rest:90,kit:'1 bell + pull-up bar',
  seq:[['KB clean & press',5],['Pull-up',5],['Ring dip',5],['KB goblet squat',10],['KB overhead lunge',5]],
  note:'Clean & press, pull-ups, dips, goblet squats, overhead lunges. The most complete single complex here — pushes, pulls and legs in one round.'},
tiger:{bench:'kbx_tiger',n:'Tiger',rounds:20,rest:0,kit:'1 bell · 20-30 min full body EMOM',
  seq:[['KB snatch',7],['Push-up',25],['KB thruster',7],['KB renegade row',10]],
  note:'20 or 30 minute full-body EMOM. 7 single-arm snatches, 25 push-ups, 7 single-arm thrusters, 10 renegade rows. Whatever is left of the minute is the rest.'},
crocodile:{bench:'kbx_crocodile',n:'Crocodile',rounds:5,rest:75,kit:'1 bell',
  seq:[['KB two-arm swing',10],['KB half-kneeling press',10],['KB bent-over row',10],['KB snatch',10]],
  note:'Straight tens: swings, half-kneeling presses, staggered-stance rows, snatches. Low skill, high volume — a good one when you are tired but want work done.'},
cougar:{bench:'kbx_cougar',n:'Cougar',rounds:4,rest:90,kit:'1 bell · straight sets',
  seq:[['KB halo squat',8],['KB floor press',10],['KB goblet Bulgarian split squat',8],['KB clean & press',5],['KB renegade row',6]],
  note:'Not a complex — straight sets. 4×8 halo squats, 4×10 floor press, 4×8 split squats, 4×5 half-kneeling clean & press, 4×6 plank rows. The closest thing here to a normal gym session.'},
eagle:{bench:'kbx_eagle',n:'Eagle Soar',rounds:5,rest:75,kit:'1 bell',
  seq:[['KB two-arm swing',7],['KB snatch',5],['KB overhead lunge',5],['KB half-kneeling press',5]],
  note:'Swing, snatch, overhead lunge, half-kneeling rotating press. Everything finishes overhead — this is a shoulder-stability session wearing a conditioning costume.'}
});
KBXORDER.push('david','gideon','samson','joshua','daniel','moses','poseidon','thor',
  'polarbear','grizzly','silverback','jaguar','panther','tiger','crocodile','cougar','eagle');

/* (benchmark derivation moved to the true end of this file — see the bottom) */

/* ============ P12 · FARM STRONG ============
   Juan's brief, close to verbatim: kettlebell and sandbag led with fundamental
   calisthenics built in — push-ups, pull-ups, sit-ups. Not ten exercises for
   three sets; six for five, or three for ten. The farmer does not run a
   six-way split; upper/lower or full body, four days, rest in between. He is
   not a slouch, he just keeps it simple and repeats it until it is done.

   The example he gave — heavy sandbag over-shoulder throws, pull-ups, dips,
   finish on Poseidon — is essentially session A.

   WHY IT IS BUILT THIS WAY. Farm strength is not built from heavy singles. It
   comes from carrying awkward things for a long time, most days, so the design
   biases:
     · loaded carries as PRIMARY work, not a finisher
     · odd objects that fight back — the bag shifts, the bell swings
     · grip trained as its own quality, every session
     · time under load over rep counting
     · long unbroken blocks rather than sets with a phone in your hand
     · rest BETWEEN rounds only, never between movements
   Five movements a session, five to ten sets each. Nothing clever.

   Rope climbs, maces and a heavy rope are on the acquire list and deliberately
   NOT programmed — see Hard to Kill. When the rope goes up, rope climbs replace
   the pull-ups on A and C and this note gets rewritten. */
P.p12={id:'p12',name:'Farm Strong',sub:'Kettlebell & sandbag · unconventional, undeniable strength',
weeks:8,where:'Home',bias:'Strength endurance',days:4,
why:'Farmer strength: posterior chain, grip and core, built out of awkward objects and honest volume. Four days a week, five movements a session, five to ten sets of each — no supersets to think about, no six-way split, nothing to plan. Kettlebells and a sandbag do the heavy lifting; push-ups, pull-ups, dips and sit-ups fill the gaps. Upper and lower alternate with a rest day between so the same pattern is never hammered twice in a row, and every session finishes with a carry, because carrying is the thing farm work actually is.',
blocks:[{f:1,t:3,type:'Build the base',mod:0,note:'Learn the bag and get the volume in. Sets should finish hard but not to failure — you are here four days a week and you need to come back. Glutes and the posterior chain run deliberately HIGH on this programme; that is the point of it, not an accident, and the anatomy chart will show it in ember.'},
{f:4,t:4,type:'Deload',mod:-1,note:'Two thirds of the work, same movements. Grip and lower back take longer to recover than muscle does.'},
{f:5,t:7,type:'Load it up',mod:1,note:'Heavier bag, heavier bell, same simple sessions. Add a set before you add a movement.'},
{f:8,t:8,type:'Test week',mod:-1,note:'Light, then find out: heaviest bag you can shoulder, longest unbroken carry, and run Poseidon for a score.'}],
schedule:['A','B','rest','C','D','rest','sport'],
sessions:{
A:{n:'Upper · heavy pull',w:'home',mins:45,fin:'Farmer carry — 4 lengths, as heavy as you can hold',ex:[
  {n:'Sandbag over-shoulder throw',s:5,r:'5 per side',rest:90},
  {n:'Pull-up',s:6,r:'AMRAP minus 2',rest:120},
  {n:'Ring dip',s:5,r:'8-12',rest:90},
  {n:'Sandbag row',s:5,r:'12-15',rest:75},
  {n:'Farmer carry',s:4,r:'40m',rest:90}]},
B:{n:'Lower · hinge & carry',w:'home',mins:45,fin:'Sandbag bear hug carry — 3×60s, do not put it down',ex:[
  {n:'KB sumo deadlift',s:5,r:'8-10',rest:120},
  {n:'Sandbag bear hug squat',s:6,r:'10-12',rest:90},
  {n:'KB two-arm swing',s:5,r:'15',rest:60},
  {n:'Sandbag walking lunge',s:4,r:'20 steps',rest:90},
  {n:'Sandbag bear hug carry',s:4,r:'60s',rest:75}]},
C:{n:'Upper · press & grip',w:'home',mins:45,fin:'Dead hang — 3× max, one bell hanging off a foot if it is easy',ex:[
  {n:'Sandbag clean & press',s:8,r:'5',rest:90},
  {n:'Push-up',s:6,r:'20-30',rest:60},
  {n:'KB gorilla row',s:6,r:'10 per side',rest:90},
  {n:'KB half-kneeling press',s:5,r:'8 per side',rest:75},
  {n:'Dead hang',s:4,r:'max',rest:90}]},
D:{n:'Lower · posterior & core',w:'home',mins:45,fin:'Sandbag drag — 5×30m, backwards, no rest you did not earn',ex:[
  {n:'Sandbag shouldering',s:6,r:'6 per side',rest:90},
  {n:'KB single-leg RDL',s:4,r:'10 per side',rest:75},
  {n:'KB goblet squat',s:5,r:'12-15',rest:75},
  {n:'Hanging knee raise',s:5,r:'15',rest:60},
  {n:'Sandbag drag',s:4,r:'30m',rest:75}]}},
sportNote:'Anything outdoors and load-bearing. A hike with a weighted pack is the most on-theme thing you can do, but chopping, digging or carrying counts double.'};
PORDER.push('p12');

/* ---- BEGINNER & ELDERLY MOVEMENTS ----
   Added for Walk Before You Fly. Every one of these can be done at home with a
   chair, a wall and a band, scaled DOWN as far as somebody needs — which is the
   whole requirement. Cues are written for a person who has not trained before
   and may be reading them alone, so they say what "good" feels like rather than
   assuming the reader already knows. */
Object.assign(EX,{
'Sit-to-stand':{g:'cal',p:'legs',m:['quads','glutes','core'],c:'Sit on a chair, stand up without using your hands, sit back down under control. The single most useful thing an older body can train. Higher chair is easier — lower it as you get stronger.'},
'Chair-assisted squat':{g:'cal',p:'legs',m:['quads','glutes','core'],c:'Hold the back of a chair, sit down as far as is comfortable, stand up. Use the chair as much as you need at first and less each week.'},
'Wall push-up':{g:'cal',p:'push',m:['chest','triceps','delts'],c:'Hands on the wall, body straight, lower the chest to the wall and press away. Step your feet further back to make it harder.'},
'Incline push-up':{g:'cal',p:'push',m:['chest','triceps','delts'],c:'Hands on a counter, table or step. The lower the surface the harder it gets, so you have a whole staircase of progression before the floor.'},
'Band row':{g:'cal',p:'pull',m:['back','biceps','forearms'],c:'Band round a door handle or under your feet. Pull the elbows back and squeeze the shoulder blades together. This is the antidote to a lifetime of sitting.'},
'Glute bridge':{g:'cal',p:'legs',m:['glutes','hams','core'],c:'On your back, feet flat, lift the hips until the body is a straight line. Squeeze at the top for a second. Wakes up the muscle most people have switched off.'},
'Bird dog':{g:'cal',p:'core',m:['core','back','glutes'],c:'On hands and knees, extend the opposite arm and leg, hold, swap. Slow. The goal is a still spine, not a big reach.'},
'Dead bug':{g:'cal',p:'core',m:['core','quads'],c:'On your back, arms up, knees at 90. Lower the opposite arm and leg without the lower back lifting off the floor. If it lifts, go smaller.'},
'Standing march':{g:'cal',p:'legs',c1:1,m:['quads','core','calves'],c:'March on the spot, knee to hip height, arms swinging. Balance and heart rate together — hold a chair if you need to.'},
'Heel raise':{g:'cal',p:'legs',m:['calves'],c:'Hold a chair, rise onto the toes, lower slowly. Slow down is where the strength is. Ankles are the first thing to go and the easiest to keep.'},
'Sit-up':{g:'cal',p:'core',m:['core','quads'],c:'Feet anchored or not, roll up one vertebra at a time. Fundamental, unfashionable, and it still works.'},
'Wall sit':{g:'cal',p:'legs',m:['quads','glutes','core'],c:'Back on the wall, knees bent as far as is comfortable, hold. No skill needed and you can measure it in seconds, which makes progress obvious.'},
'Standing balance hold':{g:'cal',p:'core',m:['core','calves','glutes'],c:'Stand on one leg. Chair within reach. Eyes closed is the advanced version. Falling is the thing we are training against.'}
});

/* ============ P13 · WALK BEFORE YOU FLY ============
   For beginners and older bodies. The brief was explicit about what NOT to put
   in it: no muscle-ups, no pull-ups, no pistol squats, no snatches. Nothing
   here needs a bar, a bell or any skill, and every movement has a way to be
   made easier on the day.

   Three days with a full rest day between each, because recovery is slower and
   soreness is the most common reason a beginner stops. Full body every session
   rather than a split — training a pattern once a week is not enough to learn
   it, and learning it is most of the early progress.

   Progression order, in this order and no other: RANGE first (go deeper, lower
   the surface), then REPS, then LOAD. Adding weight to a pattern somebody
   cannot yet do well is how people get hurt and quit. */
P.p13={id:'p13',name:'Walk Before You Fly',sub:'Beginners & older bodies · at home, no equipment needed',
weeks:6,where:'Home',bias:'Foundation',days:3,
why:'A starting point that assumes nothing. Three sessions a week with a rest day between each, done at home with a chair, a wall and a band if you have one. Every movement scales: the push-ups start on a wall, the squats start on a chair, and the balance work starts holding on. Nothing here can hurt you if you go slowly, and nothing here requires you to already be fit. Six weeks of this and the ordinary things — stairs, shopping, getting off the floor — get noticeably easier, which is the real goal. It also builds the base you would need before any of the other programmes in this app would be sensible.',
blocks:[{f:1,t:2,type:'Learn the movements',mod:0,note:'Do not chase numbers. Get the shape right, stop every set two or three reps before it gets hard, and turn up three times a week. That is the entire job for a fortnight.'},
{f:3,t:4,type:'Add range',mod:0,note:'Same sets, more range. Lower the surface for the push-ups, sit to a lower chair, hold the balance a little longer. Depth before reps, always.'},
{f:5,t:6,type:'Add reps',mod:1,note:'Now the numbers climb. Sets should finish challenging but never grinding. If a set is a struggle, stop it — this is the week people overdo it and lose the habit.'}],
schedule:['A','rest','B','rest','C','rest','sport'],
sessions:{
A:{n:'Full body · foundations',w:'home',mins:28,fin:'A ten-minute walk, outside if you can',ex:[
  {n:'Sit-to-stand',s:3,r:'8-12',rest:60},
  {n:'Wall push-up',s:3,r:'8-12',rest:60},
  {n:'Glute bridge',s:3,r:'10-15',rest:45},
  {n:'Band row',s:3,r:'10-12',rest:60},
  {n:'Dead bug',s:3,r:'8 per side',rest:45},
  {n:'Standing balance hold',s:3,r:'20-30s per leg',rest:30}]},
B:{n:'Full body · legs & posture',w:'home',mins:28,fin:'A ten-minute walk, outside if you can',ex:[
  {n:'Chair-assisted squat',s:3,r:'8-12',rest:60},
  {n:'Incline push-up',s:3,r:'6-10',rest:60},
  {n:'Bird dog',s:3,r:'8 per side',rest:45},
  {n:'Heel raise',s:3,r:'12-15',rest:45},
  {n:'Band row',s:3,r:'10-12',rest:60},
  {n:'Wall sit',s:3,r:'20-40s',rest:60}]},
C:{n:'Full body · strength & carry',w:'home',mins:30,fin:'A ten-minute walk, outside if you can',ex:[
  {n:'Sit-to-stand',s:4,r:'8-12',rest:60},
  {n:'Wall push-up',s:3,r:'10-15',rest:60},
  {n:'Farmer carry',s:3,r:'20m, light',rest:60},
  {n:'Glute bridge',s:3,r:'12-15',rest:45},
  {n:'Sit-up',s:3,r:'8-12',rest:45},
  {n:'Standing march',s:3,r:'45s',rest:45}]}},
sportNote:'A walk. Longer than usual, somewhere pleasant, at a pace where you could still hold a conversation. This is the most valuable thing on the whole programme.'};
PORDER.push('p13');

/* ================= MOBILITY, REBUILT ON THE GOWOD ZONES =================
   Beta 2.0 run 4. The old model had four home-made zones (hips, ankles,
   shoulders, spine) and scored only three. It now uses the SIX zones GoWod
   assesses, because that is where Juan's real numbers come from and a system
   that scores different things from the one measuring you is worth very little.

   Juan's scores, entered 9 Aug 2026:
     Shoulders 63 · Overhead 51 · Thorax 94 · Hips 58 · Post-chain 83 · Ankles 50
   Weak three: ANKLES 50, OVERHEAD 51, HIPS 58. Those get roughly double the
   airtime in the daily rotation — see mobDaily() in app.js.

   ZONES carries the movements for each. Every zone has enough entries that the
   daily 15 can pull a different combination most days without repeating. */
const MOBZONES=[
  {k:'shoulders',n:'Shoulders',d:'Rotation, reach and the rotator cuff'},
  {k:'overhead',n:'Overhead',d:'Getting the arms fully overhead without the ribs flaring'},
  {k:'thorax',n:'Thorax',d:'Mid-back rotation and extension'},
  {k:'hips',n:'Hips',d:'Flexion, rotation and the adductors'},
  {k:'post',n:'Post-chain',d:'Hamstrings, glutes and the whole back line'},
  {k:'ankles',n:'Ankles',d:'Dorsiflexion, the foot, and everything above it'}
];
/* Juan's current GoWod scores. Updated by hand or from the assessment sheet. */
const MOBSCORES={shoulders:63,overhead:51,thorax:94,hips:58,post:83,ankles:50};

const ZONES={
shoulders:[
  {n:'Band shoulder dislocates',d:'2×15',c:'Wide grip, slow, no shrugging. Narrow the grip a little as it opens up.'},
  {n:'Band pull-apart & external rotation',d:'2×20',c:'Rotator cuff. Costs nothing, prevents everything.'},
  {n:'Ross Edgley full shoulder rotation',d:'10 each way',c:'Big slow circles, full range, arms straight.'},
  {n:'Sleeper stretch',d:'60s per side',c:'On your side, arm at 90, gently rotate the forearm down. Internal rotation is the range almost everyone has lost.'},
  {n:'Doorway pec stretch',d:'60s per side',c:'Forearm on the frame, step through and rotate away. Tight pecs are why the shoulders sit forward.'},
  {n:'Wall slides',d:'2×12',c:'Back and arms on the wall, slide up without the lower back arching. Harder than it looks.'}],
overhead:[
  {n:'Lat prayer stretch',d:'90s',c:'Hands on a bench, hips back, sink the chest. The lats are usually what stops the arms going overhead.'},
  {n:'Dead hang',d:'60s',c:'Decompresses everything. Grip is a bonus. One of the highest-return things on this list for you.'},
  {n:'Overhead dowel hold against a wall',d:'3×30s',c:'Back flat to the wall, arms straight overhead, ribs DOWN. If the ribs flare you are faking the range.'},
  {n:'Kneeling lat & tricep stretch',d:'60s per side',c:'Elbows on a chair, sink the chest and let the shoulders open.'},
  {n:'Banded overhead distraction',d:'60s per side',c:'Band pulling the arm up and away, step out to load it. Opens the joint rather than just the muscle.'},
  {n:'Thread the needle',d:'60s per side',c:'Thoracic rotation — you cannot get overhead through a locked mid-back.'}],
thorax:[
  {n:'Thread the needle',d:'60s per side',c:'Rotation. The golf swing lives here.'},
  {n:'Open book',d:'10 per side',c:'On your side, knees stacked, open the top arm and follow it with your eyes.'},
  {n:'Foam roller thoracic extension',d:'2 min',c:'Roller across the mid-back, hands behind the head, extend over it. Move the roller a segment at a time.'},
  {n:'Cat-cow',d:'2 min',c:'Segment by segment, not one big flop. Find the stiff bit and spend time there.'},
  {n:'Seated rotation',d:'10 per side',c:'Sitting tall, rotate and hold. Keep the hips square so the movement comes from the mid-back.'},
  {n:'Jefferson curl',d:'2×8',c:'Light, slow, segmental. Spinal erectors through full range.'}],
hips:[
  {n:'90/90 hip switch',d:'2 min',c:'Sit both knees at 90°, rotate side to side without using hands. Internal and external rotation in one.'},
  {n:'Deep squat hold',d:'2 min',c:'Essential 7. Heels down, elbows prying the knees out. Accumulate the time however you need to.'},
  {n:'Couch stretch',d:'90s per side',c:'Rear foot up the wall, squeeze the glute, ribs down. This is where a desk job goes to die.'},
  {n:'Frog stretch',d:'2 min',c:'Knees wide, rock back slowly. Adductors — one of your named gaps.'},
  {n:'Deep lunge with rotation',d:'60s per side',c:'Essential 7. Back knee down, rotate toward the front leg, reach up.'},
  {n:'Pigeon / piriformis',d:'90s per side',c:'Square the hips. Breathe out into it, do not force.'}],
post:[
  {n:'Jefferson curl',d:'2×8',c:'Light and slow, one vertebra at a time. Loaded flexion is how you make the back line resilient rather than merely long.'},
  {n:'Downward dog',d:'90s',c:'Essential 7. Heels toward the floor, long spine.'},
  {n:'Standing hamstring floss',d:'10 per side',c:'Heel down, toes up, hinge and stand. Nerve glide rather than a stretch — do not hang out in it.'},
  {n:'Seated straddle',d:'2 min',c:'Hinge forward from the hips, back long. Adductors and hamstrings together.'},
  {n:'Single-leg RDL, unloaded',d:'10 per side',c:'Slow, controlled, chasing balance and hamstring length at the same time.'},
  {n:'Calf & hamstring wall stretch',d:'60s per side',c:'Toes up the wall, leg straight. The back line is one chain from the sole of the foot to the skull.'}],
ankles:[
  {n:'Knee-to-wall ankle rock',d:'2 min per side',c:'Toes 10cm from wall, drive the knee past the toes, heel stays down. Your baseline test and your fix.'},
  {n:'Calf stretch — straight and bent knee',d:'60s each per side',c:'Straight targets gastroc, bent targets soleus. You need both.'},
  {n:'Slant board or elevated heel squat',d:'2 min',c:'If you get the slant board, this is the single highest-return item in the whole routine.'},
  {n:'Tibialis raise',d:'2×25',c:'ATG. Protects the knee and builds the front of the shin nothing else trains.'},
  {n:'Toe spreads & foot activation',d:'2 min',c:'Barefoot rehabilitation starts here.'},
  {n:'Ankle inversion / eversion',d:'20 each way',c:'Band or manual. Trail running insurance.'}]
};

/* ================= THE ACTUAL LAST LINE =================
   Every content table — EX, KBX, CAL, P, MOBZONES, ZONES — is now populated, so
   the benchmarks can be derived. This call MUST remain the last statement in
   the file: it walks KBX and CAL, and anything appended below it would not be
   scorable. It was previously called twice, neither of them last, and the run-4
   complexes were briefly unscorable because of it. It is idempotent, so a
   stray extra call is harmless — a MISPLACED one is not. */
deriveBenchmarks();
