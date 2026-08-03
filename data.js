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
'Incline barbell bench press':{m:['chest','delts','triceps'],c:'Elbows ~45°, bar to upper chest, shoulder blades pinned down and back. Do not bounce.'},
'Flat barbell bench press':{m:['chest','triceps','delts'],c:'Full ROM, touch the chest, drive the floor away. Your PB is 110×1 — respect it.'},
'Flat dumbbell press':{m:['chest','triceps'],c:'Deeper stretch than barbell. Let the DBs come below chest level.'},
'Incline dumbbell press':{m:['chest','delts'],c:'30–45° bench. Squeeze at the top without clanging the bells.'},
'Weighted dip':{m:['chest','triceps','delts'],c:'Lean forward for chest, stay upright for triceps. 2s pause at the bottom — this is your gap-filler.'},
'Machine chest press':{m:['chest','triceps'],c:'Safe to push close to failure. Good for drop sets.'},
'Cable fly':{m:['chest'],c:'Slight bend in the elbow, think hugging a barrel. Stretch is the point.'},
'Pec deck fly':{m:['chest'],c:'FST-7 favourite. Squeeze hard, control back to full stretch.'},
'Seated dumbbell overhead press':{m:['delts','triceps'],c:'Do not arch the low back. Press slightly forward of the ears.'},
'Barbell overhead press':{m:['delts','triceps','core'],c:'Glutes and abs braced, head through at the top. Your PB is 80×5.'},
'Lateral raise':{m:['delts'],c:'Lead with the elbow, thumb slightly down, stop at shoulder height. Light weight, high reps, no swing.'},
'Cable lateral raise':{m:['delts'],c:'Constant tension through the whole arc — better than DBs at the bottom.'},
'Rear delt fly':{m:['delts','back'],c:'Chest supported. Think of pulling the arms apart, not lifting the weight.'},
'Face pull':{m:['delts','back','traps'],c:'Pull to the forehead, externally rotate at the end. Shoulder health insurance.'},
'Rope tricep extension':{m:['triceps'],c:'Elbows pinned to the sides, split the rope at the bottom.'},
'Overhead cable tricep extension':{m:['triceps'],c:'The stretched position — this is where the long head grows.'},
'Skull crusher':{m:['triceps'],c:'Lower to the forehead or just behind. Elbows stay pointed at the ceiling.'},
'Close-grip bench press':{m:['triceps','chest'],c:'Hands shoulder-width, elbows tucked. Your PB is 80×8.'},
/* --- GYM: pull --- */
'Deadlift':{m:['back','hams','glutes','traps','forearms'],c:'Bar over midfoot, lats engaged, push the floor away. Explosive concentric. Your PB is 160×1.'},
'Rack pull':{m:['back','traps','forearms'],c:'Just below the knee. Heavy loading for the upper back without the full pull. PB 220×8.'},
'Weighted pull-up':{m:['back','biceps','forearms'],c:'Full dead hang to chin over bar. Your PB is 15 bodyweight reps.'},
'Pull-up':{m:['back','biceps','forearms'],c:'Dead hang, no kipping. Scapula depresses before the arms pull.'},
'Chin-up':{m:['back','biceps'],c:'Supinated. More bicep, easier to load. Great for volume.'},
'Lat pulldown':{m:['back','biceps'],c:'Chest up, drive the elbows down and back. Do not lean past ~15°.'},
'Barbell bent-over row':{m:['back','traps','biceps'],c:'Hinge to ~45°, pull to the navel. Your PB is 100×12.'},
'Chest-supported row':{m:['back','traps'],c:'No cheating possible — that is the point. Squeeze the blades together.'},
'Cable row':{m:['back','biceps'],c:'Full stretch forward, elbows past the ribs at the back.'},
'T-bar row':{m:['back','traps'],c:'Neutral grip, heavy. PB 70×12.'},
'Dumbbell row':{m:['back','biceps'],c:'Long stretch at the bottom, drive the elbow to the hip. PB 44×10.'},
'Dumbbell pullover':{m:['back','chest'],c:'Deep stretch overhead. Ribs down, do not flare.'},
'Barbell shrug':{m:['traps'],c:'Straight up, pause at the top. No rolling.'},
'Hyperextension':{m:['glutes','hams','back'],c:'Round then extend for spinal erectors, or stay flat for glutes/hams.'},
'EZ bar curl':{m:['biceps','forearms'],c:'Elbows still, no swinging. Squeeze at the top.'},
'Barbell curl':{m:['biceps'],c:'Your PB is 30×127 total reps. Full ROM every rep.'},
'Incline dumbbell curl':{m:['biceps'],c:'Arms behind the body = maximum long-head stretch. The best curl you are not doing enough of.'},
'Hammer curl':{m:['biceps','forearms'],c:'Neutral grip, brachialis and brachioradialis. Builds arm thickness.'},
'Preacher curl':{m:['biceps'],c:'No momentum available. Control the eccentric all the way to straight.'},
'Wrist curl':{m:['forearms'],c:'Full flexion and extension, high reps. Forearms need volume, not load.'},
'Wrist extension':{m:['forearms'],c:'The neglected half. Do these or the curls will give you elbow pain.'},
'Reverse curl':{m:['forearms','biceps'],c:'Grip and elbow health. Light and strict.'},
/* --- GYM: legs --- */
'Back squat':{m:['quads','glutes','core'],c:'Full depth, knees track over toes, brace hard. Your PB is 170×7.'},
'Front squat':{m:['quads','core'],c:'Elbows high, upright torso. More knee, less hip. Deep.'},
'Hack squat':{m:['quads','glutes'],c:'Deep. PB 160×8. Feet lower on the plate for more quad.'},
'Leg press':{m:['quads','glutes'],c:'Deep ROM, do not let the low back round. PB 470×12.'},
'Bulgarian split squat':{m:['quads','glutes'],c:'Rear foot elevated, long stride for glutes, short for quads. Deep and slow.'},
'Walking lunge':{m:['quads','glutes','hams'],c:'Knee over toe on the front leg — this is prehab and strength in one.'},
'Romanian deadlift':{m:['hams','glutes','back'],c:'Hinge, not squat. Bar stays against the legs. Feel the hamstring stretch.'},
'Lying leg curl':{m:['hams'],c:'Slow eccentric. Hamstrings respond to controlled negatives.'},
'Seated leg curl':{m:['hams'],c:'More stretch than lying. Best hamstring builder.'},
'Leg extension':{m:['quads'],c:'Pause and squeeze at the top. FST-7 favourite.'},
'Adductor machine':{m:['glutes'],c:'Deep ROM. Directly fills your named gap and protects the groin for golf and hiking.'},
'Abductor machine':{m:['glutes'],c:'Lean forward slightly for the upper glute. Hip stability for running.'},
'Seated calf raise':{m:['calves'],c:'Soleus. Slow, full stretch at the bottom, pause at the top. PB 180×12.'},
'Standing calf raise':{m:['calves'],c:'Gastrocnemius. Straight leg. Do not bounce off the stretch.'},
'Tibialis raise':{m:['calves'],c:'ATG. Toes toward the shin, slow down. Protects the knee and builds ankle resilience. Hook a 16kg KB over your toes if you have no tib bar.'},
'Slant board split squat':{m:['quads','glutes'],c:'ATG. Knee travels well past the toe on the slant. Your single highest-return ankle fix.'},
'Nordic curl':{m:['hams'],c:'Eccentric only to start. The strongest hamstring injury prevention there is.'},
'Sled push':{m:['quads','glutes','calves'],c:'Concentric only — huge conditioning stimulus, almost zero soreness. Perfect next to a lifting block.'},
'Sled pull':{m:['hams','back','quads'],c:'Backwards drag is knee rehab and quad builder at once.'},
/* --- GYM: core / conditioning --- */
'Cable crunch':{m:['core'],c:'Round the spine, hips still. Abs flex the spine — they do not just hold.'},
'Hanging leg raise':{m:['core','forearms'],c:'No swing. Posteriorly tilt the pelvis at the top.'},
'Assault bike sprint':{m:['conditioning'],c:'All-out. Arms drive as hard as legs. Low interference with lifting — the research favours this over running.'},
'Rower sprint':{m:['conditioning','back'],c:'Legs, hips, arms — in that order. Return in reverse.'},
'Hill sprint':{m:['conditioning','quads','calves'],c:'Concentric-dominant, so far less muscle damage than flat sprinting. Walk down as the rest.'},
'Zone 2 run':{m:['conditioning'],c:'Conversational pace. If you cannot talk, you are going too hard. This builds the engine.'},
'Tempo run':{m:['conditioning'],c:'Comfortably hard — about 10k–half pace. Sustainable discomfort.'},
'Interval run':{m:['conditioning'],c:'Around 5k pace. Your 5k PB is 24:55 — that is roughly 4:59/km.'},
'Long run':{m:['conditioning'],c:'Slow. Time on feet is the goal, not pace.'},
'Trail hike':{m:['conditioning','quads','calves'],c:'Loaded pack if you have one. Descents are the training stimulus most people skip.'},
/* --- HOME: kettlebell --- */
'KB two-arm swing':{m:['glutes','hams','back','conditioning'],c:'Hips, not arms. Snap the glutes, float the bell. Breathe behind the shield.'},
'KB single-arm swing':{m:['glutes','hams','back','core'],c:'Resist the rotation. Tame the arc.'},
'KB dead-stop swing':{m:['glutes','hams','back'],c:'Bell returns to the floor each rep. Kills the stretch reflex, builds raw power.'},
'KB American swing':{m:['glutes','delts','conditioning'],c:'Overhead finish. Only if your shoulders are warm and your ribs stay down.'},
'KB gorilla swing':{m:['glutes','back','conditioning'],c:'Alternating hands at the top of the arc. Grip and coordination.'},
'KB clean':{m:['glutes','back','biceps'],c:'Tame the arc, catch soft in the rack. If it bangs the wrist, you threw it instead of guiding it.'},
'KB clean & press':{m:['glutes','delts','triceps','back'],c:'One of the highest value moves you own. Whole body in one rep.'},
'KB military press':{m:['delts','triceps','core'],c:'Squeeze the whole body, press slightly circular. Never to failure on Pavel blocks.'},
'KB push press':{m:['delts','triceps','quads'],c:'Small dip, drive with the legs, lock out hard. Lets you overload the press.'},
'KB snatch':{m:['glutes','delts','back','conditioning'],c:'One motion floor to overhead. Punch through at the top so it does not flop onto the wrist.'},
'KB shrug':{m:['traps','forearms'],c:'Two bells at the sides or one heavy in front. Straight up, pause hard at the top, no rolling. Your only direct trap work when there is no barbell in the house.'},
'KB high pull':{m:['traps','back','delts'],c:'Elbow high and back. Bridge between swing and snatch.'},
'KB Turkish get-up':{m:['core','delts','glutes','quads'],c:'Slow. Eyes on the bell the whole way. Shoulder stability, mobility and core in one lift.'},
'KB windmill':{m:['core','glutes','hams','delts'],c:'Hips shift away, straight legs, eyes on the bell. Your best hip and thoracic mobility loaded stretch.'},
'KB goblet squat':{m:['quads','glutes','core'],c:'Elbows inside the knees at the bottom, pry the hips open. Deep ROM.'},
'KB front rack squat':{m:['quads','glutes','core'],c:'Two bells in the rack. Brutal on the core and the upper back.'},
'KB overhead squat':{m:['quads','delts','core'],c:'The honest test of your shoulder and ankle mobility. Go light.'},
'KB front rack lunge':{m:['quads','glutes','core'],c:'Stay tall. Front rack load makes this a core exercise too.'},
'KB overhead lunge':{m:['quads','glutes','delts','core'],c:'Lock the arm, do not let the ribs flare.'},
'KB single-leg RDL':{m:['hams','glutes','core'],c:'Hinge, hips square, slow. Balance and hamstring in one.'},
'KB Cossack squat':{m:['quads','glutes'],c:'Deep lateral squat. Adductor mobility — one of your gaps.'},
'KB goblet Bulgarian split squat':{m:['quads','glutes'],c:'Bell at the chest, rear foot on the couch or a chair. Long stride for glutes, short for quads. Deep and slow — this is your best home leg builder.'},
'KB swing':{m:['glutes','hams','back','conditioning'],c:'Explosive intent every rep. Hips snap, arms are just ropes. For golf, this is the closest thing you own to training the transition.'},
'KB renegade row':{m:['back','core','triceps'],c:'Wide feet, no hip rotation. Anti-rotation core plus a row.'},
'KB bent-over row':{m:['back','biceps'],c:'Hinge and hold. Elbow to the hip.'},
'KB thruster':{m:['quads','delts','conditioning'],c:'Squat straight into the press. The most metabolically expensive move you own.'},
'KB halo':{m:['delts','core'],c:'Circle the head, close to the skull. Shoulder warm-up and thoracic mobility.'},
'KB floor press':{m:['chest','triceps'],c:'Elbows touch the floor, pause, press. Safe pressing with no bench.'},
'KB pullover':{m:['back','chest','core'],c:'Lying, arms long. Ribs stay down.'},
'KB suitcase carry':{m:['core','forearms','traps'],c:'Heavy, one side, stay perfectly upright. Grip and anti-lateral-flexion core.'},
'KB overhead carry':{m:['delts','core','traps'],c:'Arm locked, ribs down. Shoulder stability under load.'},
'KB bicep curl':{m:['biceps','forearms'],c:'Fills your gap when you cannot get to the gym.'},
'KB tricep extension':{m:['triceps'],c:'Two hands on one bell, deep stretch behind the head.'},
'KB calf raise':{m:['calves'],c:'Single leg, KB in hand, off a step if you have one. Full stretch.'},
/* --- HOME: rings & bodyweight --- */
'Ring pull-up':{m:['back','biceps','forearms'],c:'Rings rotate — let them. Neutral at the bottom, supinated at the top is easiest on the elbow.'},
'Ring row':{m:['back','biceps','core'],c:'Feet elevated to make it harder. Body dead straight, chest to rings.'},
'False grip row':{m:['back','forearms'],c:'Wrist on top of the ring. Muscle-up progression step 2. Build the wrist slowly.'},
'False grip hang':{m:['forearms','back'],c:'Muscle-up progression step 1. Static holds first — rushing this is how wrists get hurt.'},
'False grip pull-up':{m:['back','biceps','forearms'],c:'Progression step 3. Pull to the sternum, not the chin.'},
'Ring support hold':{m:['delts','core','triceps'],c:'Arms locked, rings turned out. The base of every ring skill.'},
'Ring dip':{m:['chest','triceps','delts'],c:'Support hold first. 2s pause at the bottom. Humbling even when your bar dips are strong.'},
'Ring push-up':{m:['chest','triceps','core'],c:'Rings turn out at the top. Enormous stability demand.'},
'Ring incline push-up':{m:['chest','triceps'],c:'Rings high = easier. Your progression regression.'},
'Ring fly':{m:['chest','core'],c:'Small range to start. This will find every weak stabiliser you have.'},
'Ring bicep curl':{m:['biceps'],c:'Body angle sets the difficulty. Elbows locked in place.'},
'Ring tricep extension':{m:['triceps'],c:'Same setup, opposite direction. Keep the body rigid.'},
'Pelican curl':{m:['biceps','chest'],c:'Advanced. Eccentric only for a long time. Tremendous bicep and elbow strength — do not rush it.'},
'Ring muscle-up':{m:['back','chest','triceps','forearms'],c:'False grip, pull to the sternum, fast transition, press out. Your standing goal.'},
'Muscle-up negative':{m:['back','triceps','chest'],c:'Start at the top, lower slowly through the transition. The best builder of the real thing.'},
'Ring L-sit':{m:['core','delts'],c:'Legs straight, hips down. Tucked version first.'},
'Knee raise to invert':{m:['core','back'],c:'Ring skill. Control, do not swing.'},
'Handstand hold':{m:['delts','core'],c:'Wall first. Ribs down, push the floor away, look at your hands.'},
'Pike push-up':{m:['delts','triceps'],c:'Hips high, crown of the head to the floor. Handstand push-up progression.'},
'Push-up':{m:['chest','triceps','core'],c:'Body rigid, full lockout, chest to floor.'},
'Diamond push-up':{m:['triceps','chest'],c:'Hands together, elbows tucked.'},
'Ab wheel':{m:['core','back'],c:'Ribs down, no low back arch. Kneeling first, standing eventually.'},
'Hollow hold':{m:['core'],c:'Low back pressed to the floor. If it lifts, tuck the knees more.'},
'Hanging knee raise':{m:['core','forearms'],c:'Toes-to-bar is the destination.'},
'Dragon flag':{m:['core'],c:'Advanced. Body rigid from shoulders down, lower slowly.'},
'Jump rope':{m:['calves','conditioning'],c:'Wrists, not arms. Stay on the balls of the feet. Free ankle resilience.'},
'Pistol squat':{m:['quads','glutes','core'],c:'Assisted with a ring or doorframe first. Deep single-leg strength.'},
'Sissy squat':{m:['quads'],c:'Knees forward, hips extended. Deep quad and knee prehab.'},
'Band lateral raise':{m:['delts'],c:'Stand on the band, lead with the elbow, stop at shoulder height. High reps. Your only direct side-delt work at home — and side delts are what make the shoulders look wide.'},
'Band pull-apart':{m:['delts','back'],c:'High reps. Shoulder health, costs nothing.'},
'Band face pull':{m:['delts','traps'],c:'External rotation at the end of every rep.'},
'Grip trainer':{m:['forearms'],c:'High reps and long holds. Carries over to every pull you do.'},
'Dead hang':{m:['forearms','back'],c:'Decompresses the spine and builds grip. Aim for 2 minutes eventually.'},
'Neck curl':{m:['traps'],c:'Light, slow, controlled. Hard to kill starts with the neck.'}
};

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
P.p7={id:'p7',name:'Trail & Summit',sub:'Mixed · hiking and trail capacity',
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
const MOB={
hips:{n:'Hips',ex:[
{n:'90/90 hip switch',d:'2 min',c:'Sit both knees at 90°, rotate side to side without using hands. Internal and external rotation in one.'},
{n:'Deep squat hold',d:'2 min',c:'Essential 7. Heels down, elbows prying the knees out. Accumulate the time however you need to.'},
{n:'Couch stretch',d:'90s per side',c:'Rear foot up the wall, squeeze the glute, ribs down. This is where a desk job goes to die.'},
{n:'Frog stretch',d:'2 min',c:'Knees wide, rock back slowly. Adductors — one of your named gaps.'},
{n:'Deep lunge with rotation',d:'60s per side',c:'Essential 7. Back knee down, rotate toward the front leg, reach up.'},
{n:'Pigeon / piriformis',d:'90s per side',c:'Square the hips. Breathe out into it, do not force.'}]},
ankles:{n:'Ankles',ex:[
{n:'Knee-to-wall ankle rock',d:'2 min per side',c:'Toes 10cm from wall, drive the knee past the toes, heel stays down. Your baseline test and your fix.'},
{n:'Calf stretch — straight and bent knee',d:'60s each per side',c:'Straight targets gastroc, bent targets soleus. You need both.'},
{n:'Slant board or elevated heel squat',d:'2 min',c:'If you get the slant board, this is the single highest-return item in the whole routine.'},
{n:'Tibialis raise',d:'2×25',c:'ATG. Protects the knee and builds the front of the shin nothing else trains.'},
{n:'Toe spreads & foot activation',d:'2 min',c:'From your vault note. Barefoot rehabilitation starts here.'},
{n:'Ankle inversion / eversion',d:'20 each way',c:'Band or manual. Trail running insurance.'}]},
shoulders:{n:'Shoulders',ex:[
{n:'Band shoulder dislocates',d:'2×15',c:'Wide grip, slow, no shrugging. Narrow the grip as it opens up.'},
{n:'Lat prayer stretch',d:'90s',c:'From your vault note. Hands on a bench, hips back, sink the chest.'},
{n:'Thread the needle',d:'60s per side',c:'Thoracic rotation — the golf swing lives here.'},
{n:'Ross Edgley full shoulder rotation',d:'10 each way',c:'Your note. Big slow circles, full range, arms straight.'},
{n:'Dead hang',d:'60s',c:'Decompresses everything. Grip is a bonus.'},
{n:'Band pull-apart & external rotation',d:'2×20',c:'Rotator cuff. Costs nothing, prevents everything.'}]},
spine:{n:'Spine & full body',ex:[
{n:'Downward dog',d:'90s',c:'Essential 7. Heels toward the floor, long spine.'},
{n:'Horse stance',d:'90s',c:'Essential 7. Wide, toes forward, sink and hold.'},
{n:'Crab stand',d:'60s',c:'Essential 7. Hips up, chest open. Anti-desk posture.'},
{n:'Indian push-up',d:'10 reps',c:'Essential 7. Dive through, spine wave.'},
{n:'Hang out',d:'60s',c:'Essential 7. Just hang. Let everything lengthen.'},
{n:'Jefferson curl',d:'2×8',c:'Light, slow, segmental. Spinal erectors through full range.'}]}};

const MOBROT=['hips','ankles','shoulders','hips','ankles','shoulders','spine'];

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
{k:'r10k',n:'10 km run',u:'time',pb:'53:10',d:''},
{k:'r21k',n:'21 km run',u:'time',pb:'1:52:53',d:''},
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
'Shadow boxing':{m:['delts','core','calves','conditioning'],c:'No bag, no gloves. Hands up, chin down, move the feet. This is where technique is actually built — slow and correct beats fast and sloppy.'},
'Bag work — boxing':{m:['delts','core','back','conditioning'],c:'Rotate the hips and the rear heel on every cross. Snap the punch back — the retraction is the shot, not the extension. Wrap or glove up every time; the bag does not care about your knuckles.'},
'Bag work — kickboxing':{m:['quads','glutes','core','conditioning'],c:'Round kick turns over the standing foot — heel points at the target. Shin, not instep. Hands stay up when you kick or you have just paid for the kick with your head.'},
'Bag work — Muay Thai':{m:['quads','core','delts','conditioning'],c:'Eight limbs: fists, elbows, knees, shins. Kick through the bag, not at it. Teeps to manage range, clinch knees to finish.'},
'Teep / push kick':{m:['quads','core','glutes'],c:'Knee up first, then extend. It is a jab with your foot — range control, not damage.'},
'Round kick':{m:['quads','glutes','core'],c:'Step out at 45°, turn the standing heel over, whip the shin through. Arm swings down for torque.'},
'Knee strike':{m:['quads','glutes','core'],c:'Pull down as the knee comes up. Point the toe, drive the hip through.'},
'Elbow strike':{m:['delts','core','back'],c:'Short range only. Turn the whole torso — the elbow is just the point of contact.'},
'Slip & roll drill':{m:['core','calves'],c:'Bend the knees, not the waist. Head off the centre line, eyes stay on the bag.'},
'Bag clinch knees':{m:['core','quads','glutes','conditioning'],c:'Hands behind the bag, elbows in, break the posture down, alternate knees. Lung-burner.'},
/* --- athletic / power, for the Justin King block --- */
'Box jump':{m:['quads','glutes','calves'],c:'Land soft and quiet in the same shape you left the floor in. Step DOWN, never jump down \u2014 the landing is where achilles injuries come from. Low reps, full recovery, this is a power lift not a conditioning one.'},
'Med ball rotational throw':{m:['core','glutes','delts'],c:'Rotate from the hips and the back foot, not the lumbar spine. Throw as hard as you can \u2014 intent is the whole exercise. Doubles as golf transition work.'},
'Farmer carry':{m:['forearms','traps','core','glutes'],c:'Heavy as you can hold, ribs down, shoulders back, walk tall and quiet. Grip, trunk and posture in one. Your kettlebells work for this at home.'}});

/* Striking cardio types (box / kick / muay) are added to CARDIO in app.js —
   CARDIO is declared there and data.js loads first, so it cannot be touched here. */

/* ---- KETTLEBELL COMPLEXES ----
   Straight from Juan's Hard to Kill note. These are OPTIONAL: run one as a
   finisher on any session, or as a standalone second workout for the day.
   They are deliberately short and unbroken — the bell does not come down
   inside a round. Rest is between rounds only. */
const KBX={
pd:{n:'PD Special',rounds:5,rest:75,kit:'1 bell',
  seq:[['KB bent-over row',5],['KB two-arm swing',5],['KB thruster',5]],
  note:'The cleanest one to start with. Row, swing, thruster — unbroken, then set it down.'},
gimli:{n:'Gimli',rounds:5,rest:75,kit:'1 bell',
  seq:[['KB two-arm swing',5],['KB high pull',4],['KB goblet squat',3]],
  note:'Descending ladder. Play with the rep numbers as you get fitter — 5/4/3 is the floor, not the rule.'},
zeus:{n:'Zeus',rounds:5,rest:90,kit:'1 bell · all one side, then switch',
  seq:[['KB single-leg RDL',5],['KB clean',4],['KB military press',3]],
  note:'Finish every rep on one arm before you switch. Optional extras between rounds: dips, pull-ups, lunges.'},
achilles:{n:'Achilles',rounds:5,rest:90,kit:'1 bell · same side throughout',
  seq:[['KB single-arm swing',3],['KB snatch',3],['KB overhead lunge',3]],
  note:'All three same side, rest, then switch. Add pull-ups and leg raises between rounds if you want the full version.'},
athena:{n:'Athena',rounds:5,rest:75,kit:'1 bell',
  seq:[['KB two-arm swing',7],['KB high pull',7],['KB clean',4]],
  note:'Squat cleans are 4 per side, offset. Reversible — run it backwards once it feels easy.'},
hercules:{n:'Hercules',rounds:7,rest:60,kit:'1 bell · switch sides each round',
  seq:[['KB two-arm swing',3],['KB clean',4],['KB push press',5]],
  note:'3/4/5 light, 5/6/7 when you want more. Seven rounds, switch sides each round. Reversible.'},
mick:{n:'Big Mick',rounds:7,rest:60,kit:'1 bell · single arm · switch each round',
  seq:[['KB bent-over row',3],['KB single-arm swing',4],['KB snatch',5]],
  note:'3/4/5 or 5/6/7. Heavier bell + more rest = strength. Lighter bell + less rest = engine. Pick one, do not split the difference.'},
flow:{n:'Flow',rounds:5,rest:75,kit:'1 bell · continuous',
  seq:[['KB two-arm swing',5],['KB snatch',3],['KB thruster',3],['KB windmill',2]],
  note:'One movement melts into the next — swing to snatch to thruster to windmill. Quality over speed; this one is a skill session disguised as conditioning.'},
rogan:{n:'Rogan',rounds:3,rest:75,kit:'1 bell · 10 reps each',
  seq:[['KB single-arm swing',10],['KB clean & press',10],['KB windmill',10],['KB renegade row',10]],
  note:'Warm up first: 25 push-ups and 50 squats. Then 3 rounds of 10 on each movement.'}};
const KBXORDER=['pd','gimli','zeus','achilles','athena','hercules','mick','flow','rogan'];
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
