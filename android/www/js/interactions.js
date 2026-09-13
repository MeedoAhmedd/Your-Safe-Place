/* ============================================================
   THE NOTEBOOK  —  a full-screen reader.
   36 pages: the notebook tells its story while drawing out yours,
   then around p.30 it hands the pen over.
   Page kinds:
     frag   — a fragment of the notebook's own story (its handwriting)
     whisper— a small aside, italic
     q      — a question + a place for the player to write
     write  — a large open prompt (player's own story)
     blank  — near-empty page, only a line or two
   ============================================================ */
var NB_PAGES = [
  // ---------- 1–6 : the beginning (mystery / nostalgia) ----------
  { n:1, kind:'frag', lines:[
    "If you're reading this, you found the notebook.",
    "I left it on the desk on purpose.",
    "I always meant for someone to keep it going." ] },
  { n:2, kind:'frag', lines:[
    "I don't remember buying it.",
    "It was just always around — one of those things",
    "you don't realise you're keeping until years later." ] },
  { n:3, kind:'frag', lines:[
    "I used to think this room would always be here.",
    "The light in the afternoon. The sounds from outside.",
    "You never photograph the things you assume will stay." ] },
  { n:4, kind:'whisper', lines:[
    "(there's a coffee ring on this page. I remember the mug. not the day.)" ] },
  { n:5, kind:'frag', lines:[
    "So here's how this works.",
    "Some pages I wrote on. Some pages are yours.",
    "You'll know the difference — mine are already faded." ] },
  { n:6, kind:'blank', lines:[
    "Take your time. The room isn't going anywhere." ] },

  // ---------- 7–13 : memories / childhood ----------
  { n:7, kind:'frag', lines:[
    "There are things we don't realise are memories",
    "until they're already gone." ], q:"What is the first place you remember feeling completely safe?" },
  { n:8, kind:'q', q:"What did your room look like when you were younger?" },
  { n:9, kind:'q', q:"What was something you loved before you cared what other people thought?" },
  { n:10, kind:'frag', lines:[
    "Smell is the one that gets me. A door opens somewhere",
    "and I'm eight years old again for half a second." ], q:"Is there a smell that immediately takes you somewhere else?" },
  { n:11, kind:'q', q:"What was your favourite thing to do when you had nothing to worry about?" },
  { n:12, kind:'q', q:"Who did you feel most comfortable being yourself around?" },
  { n:13, kind:'blank', lines:[
    "I read somewhere that a house remembers you",
    "longer than you remember it." ] },

  // ---------- 14–19 : people / connection / loss ----------
  { n:14, kind:'q', q:"Is there someone you don't talk to anymore but still think about?" },
  { n:15, kind:'q', q:"What is something you wish you could experience one more time?" },
  { n:16, kind:'frag', lines:[
    "I keep a few conversations folded up in my head.",
    "I take them out sometimes and read them again." ], q:"What is a memory you wish you could step inside again?" },
  { n:17, kind:'q', q:"Was there a moment when you realised you were growing up?" },
  { n:18, kind:'q', q:"What is something you never got to say?" },
  { n:19, kind:'q', q:"If you could sit beside your younger self for five minutes, what would you tell them?" },

  // ---------- 20–25 : self ----------
  { n:20, kind:'whisper', lines:[
    "(this next part I wrote late at night. read it in the day.)" ] },
  { n:21, kind:'q', q:"When did you start becoming the person you are now?" },
  { n:22, kind:'q', q:"What part of yourself do you rarely show anyone?" },
  { n:23, kind:'q', q:"What do you miss about the person you used to be?" },
  { n:24, kind:'q', q:"What are you still trying to understand about yourself?" },
  { n:25, kind:'q', q:"If nobody could judge you, what would you admit?" },

  // ---------- 26–30 : things left unsaid ----------
  { n:26, kind:'frag', lines:[
    "Some doors close so quietly you don't hear them.",
    "You just notice, later, that the room is colder." ] },
  { n:27, kind:'q', q:"Is there a goodbye you never really got to say?" },
  { n:28, kind:'q', q:"What would you say to someone if you knew you'd never see them again?" },
  { n:29, kind:'q', q:"What is something you wish someone had told you when you needed it most?" },
  { n:30, kind:'q', q:"What memory still feels unfinished?" },

  // ---------- 31–36 : the notebook hands over ----------
  { n:31, kind:'frag', lines:[ "I've told you enough about mine." ] },
  { n:32, kind:'frag', lines:[
    "This was never really about my story.",
    "I wrote it so you'd remember yours.",
    "",
    "Now I want to hear it." ] },
  { n:33, kind:'write', prompt:"Start anywhere.", big:true },
  { n:34, kind:'write', prompt:"Tell me about a moment you never want to forget.", big:true },
  { n:35, kind:'write', prompt:"Tell me about the person you were, the person you became, and the person you're still becoming.", big:true },
  { n:36, kind:'write', prompt:"Your story doesn't have to end here.", big:true,
    footer:"keep writing." }
];

// deeper / different-type question pages get a little drawing
var NB_PAGE_DRAWINGS = {
  7:'key', 10:'cup', 14:'door', 17:'window', 19:'moon',
  21:'leaf', 24:'path', 27:'bird', 30:'ocean', 33:'swan'
};

var nbOpen = false;
var nbIndex = 0;              // 0-based page index
var nbAnswers = {};           // { pageNumber: "text" }  — per slot
var nbFurthest = 0;           // furthest page reached (for a gentle unlock feel)

var nbEl      = document.getElementById('notebook');
var nbInnerEl = document.getElementById('nbInner');
var nbPageEl  = document.getElementById('nbPage');
var nbNumEl   = document.getElementById('nbPageNum');
var nbPrevBtn = document.getElementById('nbPrev');
var nbNextBtn = document.getElementById('nbNext');
var nbBookEl  = document.getElementById('nbBook');
var nbCoverEl = document.getElementById('nbCover');
var nbBookOpen = false;

function nbAutosize(t){ t.style.height = 'auto'; t.style.height = (t.scrollHeight) + 'px'; }

/* ---- page-flip / cover sound (WebAudio, no assets) ---- */
var _nbAudio = null;
function nbAudioCtx(){
  if(_nbAudio) return _nbAudio;
  try{ _nbAudio = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ _nbAudio = null; }
  return _nbAudio;
}
function nbPlayFlip(soft){
  var ac = nbAudioCtx(); if(!ac) return;
  if(ac.state === 'suspended') ac.resume();
  var dur = soft ? 0.18 : 0.26;
  var buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  var d = buf.getChannelData(0);
  for(var i=0;i<d.length;i++){
    var t = i / d.length;
    // filtered noise with a quick swell then decay — a paper 'shff'
    var env = Math.sin(Math.PI * t) * (1 - t) * (soft ? 0.5 : 0.8);
    d[i] = (Math.random()*2 - 1) * env;
  }
  var src = ac.createBufferSource(); src.buffer = buf;
  var bp = ac.createBiquadFilter(); bp.type = 'bandpass';
  bp.frequency.value = soft ? 1800 : 2600; bp.Q.value = 0.7;
  var g = ac.createGain(); g.gain.value = soft ? 0.18 : 0.3;
  src.connect(bp); bp.connect(g); g.connect(ac.destination);
  src.start();
}

/* ---- small drawings for the deeper-question pages ---- */
var NB_DRAWINGS = {
  swan:'<svg viewBox="0 0 200 120"><path d="M40 100 C40 70 70 60 95 60 C80 55 70 40 78 26 C85 36 96 40 108 42 C150 46 168 74 160 100 C120 108 60 110 40 100 Z"/><path d="M78 26 C74 20 76 14 82 12"/><circle cx="80" cy="30" r="1.6" fill="#4a3a26"/><path d="M20 104 q20 -8 40 0 M150 104 q20 -8 30 2"/></svg>',
  ocean:'<svg viewBox="0 0 200 120"><circle cx="150" cy="34" r="14"/><path d="M10 62 q20 -10 40 0 t40 0 t40 0 t40 0"/><path d="M10 78 q20 -10 40 0 t40 0 t40 0 t40 0"/><path d="M10 94 q20 -10 40 0 t40 0 t40 0 t40 0"/></svg>',
  key:'<svg viewBox="0 0 200 120"><circle cx="60" cy="60" r="22"/><circle cx="60" cy="60" r="9"/><path d="M82 60 L160 60 M148 60 L148 78 M134 60 L134 74"/></svg>',
  door:'<svg viewBox="0 0 200 120"><rect x="66" y="14" width="68" height="94"/><path d="M66 14 L96 4 L126 4 L134 14 M96 4 L96 108"/><circle cx="86" cy="62" r="2.5"/></svg>',
  window:'<svg viewBox="0 0 200 120"><rect x="60" y="16" width="80" height="88"/><path d="M100 16 L100 104 M60 60 L140 60"/><path d="M50 108 L150 108"/></svg>',
  leaf:'<svg viewBox="0 0 200 120"><path d="M40 100 C40 40 100 16 160 20 C160 80 100 108 40 100 Z"/><path d="M40 100 C80 80 120 56 160 20"/></svg>',
  moon:'<svg viewBox="0 0 200 120"><path d="M120 20 A44 44 0 1 0 120 108 A34 34 0 1 1 120 20 Z"/><path d="M70 40 l3 6 l6 2 l-6 2 l-3 6 l-3 -6 l-6 -2 l6 -2 Z"/></svg>',
  cup:'<svg viewBox="0 0 200 120"><path d="M60 46 L140 46 L134 100 L66 100 Z M140 54 q22 0 22 18 t-24 16 M84 30 q-4 -10 4 -18 M108 30 q-4 -10 4 -18"/></svg>',
  bird:'<svg viewBox="0 0 200 120"><path d="M30 70 q30 -30 60 -10 q10 -26 40 -26 q-14 12 -8 26 q26 4 40 26 q-40 -8 -60 6 q-4 24 -30 30 q8 -22 -6 -34 q-26 4 -46 -10 Z"/></svg>',
  path:'<svg viewBox="0 0 200 120"><path d="M80 108 L92 20 M120 108 L108 20 M84 84 L116 84 M88 56 L112 56"/><path d="M20 110 q40 -6 160 -6"/></svg>'
};

function renderNbPage(){
  var p = NB_PAGES[nbIndex];
  nbInnerEl.innerHTML = '';
  var w = document.createElement('div'); w.className = 'nb-writing';

  if(p.lines){
    p.lines.forEach(function(ln){
      var d = document.createElement('span');
      d.className = (p.kind === 'whisper') ? 'whisper' : 'frag';
      d.textContent = ln;
      w.appendChild(d);
    });
  }
  // a small drawing on the deeper-question pages
  var drawKey = p.draw || NB_PAGE_DRAWINGS[p.n];
  if(drawKey && NB_DRAWINGS[drawKey]){
    var dd = document.createElement('div'); dd.className = 'nb-drawing';
    dd.innerHTML = NB_DRAWINGS[drawKey];
    w.appendChild(dd);
  }

  if(p.kind === 'q' || p.q){
    var q = document.createElement('span'); q.className = 'q'; q.textContent = p.q;
    w.appendChild(q);
  }
  if(p.kind === 'write'){
    var pr = document.createElement('span'); pr.className = 'q'; pr.textContent = p.prompt;
    w.appendChild(pr);
  }

  // writing area for q / write pages
  if(p.kind === 'q' || p.kind === 'write' || p.q){
    var ta = document.createElement('textarea');
    ta.className = 'nb-answer';
    ta.rows = p.big ? 8 : 4;
    ta.placeholder = p.big ? 'write here…' : '…';
    ta.value = nbAnswers[p.n] || '';
    ta.addEventListener('input', function(){
      nbAnswers[p.n] = ta.value;
      nbAutosize(ta);
    });
    ta.addEventListener('blur', saveSlot);
    // keep typing keys out of the movement handler
    ta.addEventListener('keydown', function(e){ e.stopPropagation(); });
    w.appendChild(ta);
    setTimeout(function(){ nbAutosize(ta); }, 0);
  }

  if(p.footer){
    var f = document.createElement('span'); f.className = 'whisper';
    f.style.marginTop = '40px'; f.textContent = p.footer;
    w.appendChild(f);
  }

  nbInnerEl.appendChild(w);
  nbNumEl.textContent = p.n + ' / ' + NB_PAGES.length;
  nbPrevBtn.disabled = (nbIndex === 0);
  nbNextBtn.disabled = (nbIndex === NB_PAGES.length - 1);
  nbInnerEl.scrollTop = 0;
}

function nbTurn(dir){
  if(!nbBookOpen){ if(dir > 0) nbOpenBook(); return; }
  var ni = nbIndex + dir;
  if(ni < 0 || ni >= NB_PAGES.length) return;
  nbIndex = ni;
  if(nbIndex > nbFurthest) nbFurthest = nbIndex;
  nbPageEl.classList.remove('turning','back');
  void nbPageEl.offsetWidth;           // reflow to restart animation
  nbPageEl.classList.add('turning');
  if(dir < 0) nbPageEl.classList.add('back');
  nbPlayFlip(false);
  renderNbPage();
  saveSlot();
}

function nbOpenBook(){
  if(nbBookOpen) return;
  nbBookOpen = true;
  nbBookEl.classList.add('open');
  nbPlayFlip(false);
  renderNbPage();
}

function openNotebook(){
  if(nbOpen) return;
  nbOpen = true;
  nbBookOpen = false;
  nbBookEl.classList.remove('open');
  document.body.classList.add('reading');
  gameActive = false;                  // freeze the room
  nbAudioCtx();                          // unlock audio on this user gesture
  nbEl.classList.add('show');
}
function closeNotebook(){
  if(!nbOpen) return;
  nbOpen = false;
  nbBookOpen = false;
  nbBookEl.classList.remove('open');
  document.body.classList.remove('reading');
  nbEl.classList.remove('show');
  saveSlot();
  for(var k in keys) keys[k] = false;   // drop any keys held while reading
  if(activeSlot != null) gameActive = true;
}
nbCoverEl.addEventListener('click', nbOpenBook);

document.getElementById('nbPrev').addEventListener('click', function(){ nbTurn(-1); });
document.getElementById('nbNext').addEventListener('click', function(){ nbTurn(1); });
document.getElementById('nbClose').addEventListener('click', closeNotebook);

// swipe to turn pages (mobile)
(function nbSwipe(){
  var x0 = null;
  nbEl.addEventListener('touchstart', function(e){ x0 = e.changedTouches[0].clientX; }, {passive:true});
  nbEl.addEventListener('touchend', function(e){
    if(x0 == null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if(Math.abs(dx) > 60){ nbTurn(dx < 0 ? 1 : -1); }
    x0 = null;
  }, {passive:true});
})();

// keys: only when the notebook is open
window.addEventListener('keydown', function(e){
  if(!nbOpen) return;
  if(e.target && e.target.classList && e.target.classList.contains('nb-answer')){
    if(e.key === 'Escape'){ e.target.blur(); closeNotebook(); }
    return;                             // let the player type freely
  }
  if(!nbBookOpen){
    if(e.key === 'Escape'){ closeNotebook(); }
    else if(e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' '){ nbOpenBook(); e.preventDefault(); }
    return;
  }
  if(e.key === 'ArrowRight'){ nbTurn(1); e.preventDefault(); }
  else if(e.key === 'ArrowLeft'){ nbTurn(-1); e.preventDefault(); }
  else if(e.key === 'Escape'){ closeNotebook(); }
});

/* ============================================================
   WORLD INTERACTIONS — walk near something, a prompt appears on it.
     · Notebook  → press E   (opens the reader)
     · Couch / chair / bean bag → press F to sit
     · Bed → press F to lie down and look at the ceiling
   Prompts are HTML anchored to a 3D point, projected each frame.
   ============================================================ */
var NB_SPOT = new THREE.Vector3(DESKX + 1.05, 0, -HALF_Z + 0.78);
var nbPromptEl  = document.getElementById('nbPrompt');
var actPromptEl = document.getElementById('actPrompt');
nbPromptEl.style.pointerEvents = 'auto';
actPromptEl.style.pointerEvents = 'auto';

// where the player's body is posed while seated / lying
var seated = null;   // the active interactable, or null when standing
var seatBlend = 0;   // 0 standing … 1 fully in pose

// registry — positions computed from the furniture layout above
var INTERACTS = [
  // notebook wins ties near the desk (prio lower = checked first / preferred)
  { id:'notebook', key:'E', label:'open notebook', prio:0,
    at:new THREE.Vector3(NB_SPOT.x, 1.0, NB_SPOT.z), reach:2.0,
    stand:new THREE.Vector3(DESKX + 1.05, 0, -HALF_Z + 2.05),
    run:function(){ openNotebook(); } },

  { id:'bed', key:'F', label:'lie down', kind:'sleep',
    at:new THREE.Vector3(BEDX + 0.2, 0.8, BEDZ), reach:2.7,
    stand:new THREE.Vector3(BEDX + 0.2, 0, BEDZ + BED_D/2 + 0.7),
    // lieY: duvet top sits at y=0.705 (duvet box y=0.62 + h/2=0.085, plus the ~0.0125 sheen layer);
    // the torso capsule's flattened half-thickness is ~0.2 (radius 0.2, x-scale 1.1 doesn't affect this axis
    // once rotated flat), so the hip pivot needs to rest at roughly 0.705 + 0.2 ≈ 0.905 to lie ON TOP of the
    // covers instead of sinking into the mattress (old value 0.87 sat ~3.5cm too low, inside the duvet).
    pose:{ x:BEDX - 0.15, z:BEDZ, lieY:0.905, yaw:Math.PI/2 } },   // centred on the mattress, head toward the wall
];

var nearInteract = null;

function showPrompt(el, worldPos){
  var v = worldPos.clone().project(camera);
  if(v.z > 1){ el.classList.remove('show'); return; }
  var x = (v.x * 0.5 + 0.5) * window.innerWidth;
  var y = (-v.y * 0.5 + 0.5) * window.innerHeight;
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  el.classList.add('show');
}

function updateNotebookPrompt(){   // still called from the frame loop; now drives all prompts
  nbPromptEl.classList.remove('show');
  actPromptEl.classList.remove('show');
  if(!gameActive || editing || nbOpen){ nearInteract = null; return; }

  // if seated, the only prompt is "stand up" on the player
  if(seated){
    nearInteract = seated;
    var pv = new THREE.Vector3(player.position.x, 1.5, player.position.z);
    actPromptEl.querySelector('.lbl').textContent = (seated.kind === 'sleep') ? 'get up' : 'stand up';
    showPrompt(actPromptEl, pv);
    return;
  }

  // find the best interactable in reach — nearest wins, but a lower prio (notebook)
  // beats a slightly-closer higher prio one so you can always reach the journal
  var best = null, bestScore = Infinity;
  for(var i=0;i<INTERACTS.length;i++){
    var it = INTERACTS[i];
    var dx = player.position.x - it.at.x, dz = player.position.z - it.at.z;
    var d = dx*dx + dz*dz;
    if(d >= it.reach*it.reach) continue;
    var score = d + (it.prio || 0) * 0.6;   // prio 0 gets a 0.6 head start
    if(score < bestScore){ best = it; bestScore = score; }
  }
  nearInteract = best;
  if(!best) return;

  if(best.key === 'E'){
    nbPromptEl.querySelector('.lbl').textContent = best.label;
    showPrompt(nbPromptEl, best.at);
  } else {
    actPromptEl.querySelector('.lbl').textContent = best.label;
    showPrompt(actPromptEl, best.at);
  }
}

// ---- pose the player body for sit / sleep, and ease back out ----
function applySeatPose(dt){
  var goal = seated ? 1 : 0;
  seatBlend += (goal - seatBlend) * Math.min(1, dt*7);
  if(seatBlend < 0.002 && !seated){
    seatBlend = 0;
    rig.rotation.x = 0; rig.rotation.z = 0; rig.position.y = 0.98;
    armL.rotation.set(0,0,0.06); armR.rotation.set(0,0,-0.06);
    legL.rotation.set(0,0,0); legR.rotation.set(0,0,0);
    pHead.rotation.set(0,0,0);
    return;
  }

  var t = seatBlend, it = seated || lastSeat;
  if(!it) return;
  var p = it.pose;

  if(it.kind === 'sleep'){
    var lY = p.lieY != null ? p.lieY : 0.905;
    var pose = lastSleepPose || SLEEP_POSES[0];
    rig.position.y = 0.98 + t*(lY - 0.98);                  // hips settle onto the mattress top
    rig.position.x = t * pose.hipShift;                     // small sideways drift for curled-up poses
    rig.rotation.x = t * (-Math.PI/2 + 0.04);                // torso rotates flat, face tips up
    rig.rotation.z = t * pose.bodyLean;                      // gentle lean, not a full roll (keeps limbs untangled)
    rig.rotation.y = 0;
    player.rotation.y = p.yaw + t * pose.yawOff;
    armL.rotation.x = t*pose.armLX;  armL.rotation.z = 0.06 + t*pose.armLZ;
    armR.rotation.x = t*pose.armRX;  armR.rotation.z = -0.06 - t*pose.armRZ;
    legL.rotation.x = t*pose.legLX;  legR.rotation.x = t*pose.legRX;
    legL.rotation.z = t*pose.legLZ;  legR.rotation.z = t*pose.legRZ;
    pHead.rotation.x = t*pose.headX;
    pHead.rotation.z = t*pose.headZ;
  } else {
    // sitting: hips low, thighs forward, shins down, slight recline
    rig.position.y = 0.98 + t*(p.y - 0.98);
    rig.rotation.x = t*(p.recline || 0.1);
    rig.rotation.z = 0;
    player.rotation.y = p.yaw;
    legL.rotation.x =  t*1.35; legR.rotation.x =  t*1.35;    // thighs forward
    armL.rotation.x = -t*0.35; armR.rotation.x = -t*0.35;    // hands to lap
    armL.rotation.z = 0.14;    armR.rotation.z = -0.14;
    pHead.rotation.x = 0;
  }
}
var lastSeat = null;

// four sleep poses, picked at random each time the player lies down. All deltas are kept small and
// applied on top of the single flattening rotation (rig.rotation.x) so limbs never fight the parent's
// own rotation — that's what caused the earlier "twisted blob" look when a full body roll was added.
//   bodyLean : slight rig.rotation.z tilt (small — a few degrees, not a real roll)
//   hipShift : small sideways drift of the hips, for curled-up poses
//   arm*/leg*: per-limb rotation deltas, X = fold toward the body, Z = swing away from centre
var SLEEP_POSES = [
  { name:'back', bodyLean:0, hipShift:0, yawOff:0,                 // flat on the back, arms loosely out
    armLX:0.1, armLZ:0.55, armRX:0.1, armRZ:0.55,
    legLX:-0.04, legRX:-0.04, legLZ:-0.1, legRZ:0.1,
    headX:0.35, headZ:0 },
  { name:'side', bodyLean:0.18, hipShift:0.05, yawOff:0.12,        // curled gently onto one side, knees drawn up
    armLX:0.5, armLZ:0.15, armRX:0.75, armRZ:0.05,
    legLX:0.85, legRX:1.05, legLZ:-0.08, legRZ:0.12,
    headX:0.25, headZ:0.12 },
  { name:'starfish', bodyLean:0, hipShift:0, yawOff:0,             // arms and legs spread wide
    armLX:0.05, armLZ:0.95, armRX:0.05, armRZ:0.95,
    legLX:-0.05, legRX:-0.05, legLZ:-0.4, legRZ:0.4,
    headX:0.3, headZ:0.06 },
  { name:'dead-side', bodyLean:-0.16, hipShift:-0.05, yawOff:-0.12, // flopped face-down-ish, one arm tucked
    armLX:-0.15, armLZ:0.35, armRX:0.85, armRZ:0.5,
    legLX:0.55, legRX:0.15, legLZ:0.1, legRZ:0.15,
    headX:0.2, headZ:-0.12 }
];
var lastSleepPose = null;

var REST_LINES = [
  'you can put it all down for a minute.',
  'nothing needs you right now.',
  'just breathe. the room will hold the rest.',
  'you are allowed to rest.',
  'the ceiling isn\'t going anywhere. neither are you.',
  'close your eyes if you want to.'
];
var restPhraseEl = document.getElementById('restPhrase');

function sitDown(it){
  seated = it; lastSeat = it;
  var p = it.pose;
  player.position.x = p.x;
  player.position.z = p.z;
  for(var k in keys) keys[k] = false;
  if(it.kind === 'sleep'){
    var pick;
    do { pick = SLEEP_POSES[(Math.random()*SLEEP_POSES.length)|0]; }
    while(SLEEP_POSES.length > 1 && pick === lastSleepPose);
    lastSleepPose = pick;
    restPhraseEl.textContent = REST_LINES[(Math.random()*REST_LINES.length)|0];
    setTimeout(function(){ if(seated && seated.kind === 'sleep') restPhraseEl.classList.add('show'); }, 700);
  }
}
function standUp(){
  if(!seated) return;
  var it = seated;
  seated = null;
  restPhraseEl.classList.remove('show');
  // step off to the stand-clear spot (find one that isn't blocked)
  var sx = it.stand.x, sz = it.stand.z;
  if(blocked(sx, sz)){ sz += 0.4; if(blocked(sx, sz)){ sx += 0.4; } }
  player.position.x = sx;
  player.position.z = sz;
  player.rotation.y = 0;
  pHead.rotation.x = 0;
}
function triggerInteract(){
  if(nbOpen) return;
  if(seated){ standUp(); return; }
  var it = nearInteract;
  if(!it) return;
  if(it.run) it.run();
  else if(it.pose) sitDown(it);
}

// keyboard: E for the notebook, F for sit / sleep
window.addEventListener('keydown', function(e){
  if(!gameActive || editing || nbOpen) return;
  if(e.target && e.target.tagName === 'INPUT') return;
  var k = e.key.toLowerCase();
  if(k === 'e' && nearInteract && nearInteract.key === 'E'){ triggerInteract(); }
  else if(k === 'f'){
    if(seated){ standUp(); }
    else if(nearInteract && nearInteract.key === 'F'){ triggerInteract(); }
  }
});
// tap a prompt (touch)
nbPromptEl.addEventListener('click', function(){ if(nearInteract && nearInteract.key === 'E') triggerInteract(); });
actPromptEl.addEventListener('click', function(){ triggerInteract(); });

/* ============================================================
   MENU PROPS — the empty room + a centre table with the notebook.
   Shown only on the menu; hidden once a slot loads.
   ============================================================ */
target = menuProps;
(function menuScene(){
  // rug under the table
  box(0, 0.03, 0, 3.4, 0.04, 3.0, mat(0x4a4048, 1), false);   // border
  box(0, 0.05, 0, 2.9, 0.04, 2.5, mat(0x5b5262, 1), false);   // inner
  // round-ish centre table
  var topMat = mat(0x8a6647, 0.6);
  box(0, 0.78, 0, 1.5, 0.14, 1.2, topMat, false);
  box(0, 0.4, 0, 0.16, 0.9, 0.16, M.wood, false);           // pedestal
  box(0, 0.05, 0, 0.9, 0.1, 0.7, M.wood, false);            // foot
  // the notebook, closed, cover facing up toward the camera
  var cover = new THREE.MeshStandardMaterial({ color:0x6b4a2f, roughness:0.5 });
  box(0, 0.87, 0, 0.62, 0.06, 0.82, mat(0xf3ecdd, 0.95), false); // pages
  box(0, 0.85, 0, 0.68, 0.09, 0.9, cover, false);               // cover
  box(-0.35, 0.85, 0, 0.06, 0.11, 0.9, cover, false);           // spine
  // "Your Safe Place" embossed on the cover (canvas texture), matching the .nb-ctitle in the HTML.
  var lc = document.createElement('canvas'); lc.width = 512; lc.height = 640;
  var g = lc.getContext('2d');
  g.fillStyle = '#6b4a2f'; g.fillRect(0,0,512,640);
  g.strokeStyle = 'rgba(240,225,200,0.35)'; g.lineWidth = 4;
  g.strokeRect(34,34,444,572);
  g.fillStyle = '#f1e4cb';
  g.textAlign = 'center'; g.font = '600 62px Georgia, serif';
  g.fillText('Your', 256, 300);
  g.fillText('Safe Place', 256, 372);
  var lt = new THREE.CanvasTexture(lc);
  var label = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.78),
    new THREE.MeshStandardMaterial({ map: lt, roughness:0.6 }));
  label.rotation.x = -Math.PI/2;
  label.position.set(0, 0.902, 0);
  menuProps.add(label);
  // soft warm light over the table (low, so the cover text stays readable)
  var ml = new THREE.PointLight(0xffcf95, 0.7, 8, 2);
  ml.position.set(0.6, 2.4, 0.9);
  menuProps.add(ml);
  // matching wall-mounted shelves (thin planks + small brackets, no big panel)
  var bookCols = [0x8a4b3c,0x3c6e8a,0x7a8a3c,0xb0894a,0x5a3c8a,0x8a3c6e,0x4a7a5a,0x9a5a3a];
  function shelfRow(cx, cy, cz, along, span, count){
    // plank
    if(along === 'z'){
      box(cx, cy, cz, 0.32, 0.08, span, M.woodL, false);
      box(cx, cy-0.12, cz-span/2+0.2, 0.28, 0.16, 0.06, M.wood, false);   // brackets
      box(cx, cy-0.12, cz+span/2-0.2, 0.28, 0.16, 0.06, M.wood, false);
    } else {
      box(cx, cy, cz, span, 0.08, 0.32, M.woodL, false);
      box(cx-span/2+0.2, cy-0.12, cz, 0.06, 0.16, 0.28, M.wood, false);
      box(cx+span/2-0.2, cy-0.12, cz, 0.06, 0.16, 0.28, M.wood, false);
    }
    // books with individual printed titles
    for(var b=0;b<count;b++){
      var bh = 0.45 + (b % 3) * 0.06;
      var t = (b + 0.5) / count;
      if(along === 'z'){
        titledBook(cx + 0.02, cy + 0.04 + bh/2, cz - span/2 + 0.25 + t*(span-0.5), 'z', bh);
      } else {
        titledBook(cx - span/2 + 0.25 + t*(span-0.5), cy + 0.04 + bh/2, cz + 0.02, 'x', bh);
      }
    }
  }
  // left wall: 3 stacked shelves
  shelfRow(-HALF_X + 0.28, 1.15, -2.4, 'z', 2.4, 7);
  shelfRow(-HALF_X + 0.28, 2.15, -2.4, 'z', 2.4, 7);
  shelfRow(-HALF_X + 0.28, 3.15, -2.4, 'z', 2.4, 7);
  // back wall: 2 stacked shelves
  shelfRow(2.9, 1.6, -HALF_Z + 0.26, 'x', 2.6, 8);
  shelfRow(2.9, 2.7, -HALF_Z + 0.26, 'x', 2.6, 8);

  // gentle room glow (kept soft so the notebook reads clearly)
  var g1 = new THREE.PointLight(0x9f8dff, 0.35, 16);
  g1.position.set(-3, 4, -3); menuProps.add(g1);
  var g2 = new THREE.PointLight(0xffb06a, 0.4, 14);
  g2.position.set(3, 3.5, 2); menuProps.add(g2);
})();
target = room;

// visibility: start on the MENU look
furniture.visible = false;
menuProps.visible = true;

// ============================================================
//  CHARACTER  (head + torso + jointed arms & legs, walk animation)
// ============================================================
var CH = {
  skin : mat(0xd9a17c, 0.7),
  hair : mat(0x241d1a, 0.85),
  hood : mat(0x3f4a63, 0.9),        // hoodie
  hoodD: mat(0x333c53, 0.9),        // hood / darker panels
  jeans: mat(0x2f3543, 0.85),
  shoe : mat(0xe8e4da, 0.55),       // light sneakers
  sole : mat(0x1c1c22, 0.6)
};
var player = new THREE.Group();
player.position.set(0.5, 0, 3.6);
player.visible = false;   // shown once a slot loads
scene.add(player);

// pelvis anchor so the whole body bobs together
var rig = new THREE.Group();
rig.position.y = 0.98;                 // hip height (slightly taller, leaner)
player.add(rig);

// torso — one smooth tapered hoodie (no separate stuck-on bits)
var pTorso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.52, 10, 16), CH.hood);
pTorso.scale.set(1.1, 1, 0.82);
pTorso.position.y = 0.36; pTorso.castShadow = true; rig.add(pTorso);
// hips: a capsule too, so it blends with the torso rather than a box
var pHips = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.14, 8, 14), CH.jeans);
pHips.scale.set(1.05, 1, 0.85);
pHips.position.y = 0.05; pHips.castShadow = true; rig.add(pHips);
// neck
var pNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 12), CH.skin);
pNeck.position.y = 0.66; rig.add(pNeck);
// head
var pHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 22), CH.skin);
pHead.scale.set(0.95, 1.05, 0.97);
pHead.position.y = 0.83; pHead.castShadow = true; rig.add(pHead);
// ears
[-0.16, 0.16].forEach(function(ex){
  var ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), CH.skin);
  ear.scale.set(0.6, 1, 0.5); ear.position.set(ex, 0.83, 0); rig.add(ear);
});

// ---- FACE texture (redrawable per gender) ----
var faceCanvas = document.createElement('canvas'); faceCanvas.width = 256; faceCanvas.height = 256;
var fx = faceCanvas.getContext('2d');
var faceTex = new THREE.CanvasTexture(faceCanvas);
function drawFace(female){
  var c = fx, W = 256, H = 256;
  c.clearRect(0,0,W,H);
  var eyeY = 118, eyeDX = 34;
  // eye whites
  c.fillStyle = '#ffffff';
  c.beginPath(); c.ellipse(128-eyeDX, eyeY, 15, 18, 0, 0, 7); c.fill();
  c.beginPath(); c.ellipse(128+eyeDX, eyeY, 15, 18, 0, 0, 7); c.fill();
  // irises
  c.fillStyle = female ? '#5b3b2a' : '#3a2a20';
  c.beginPath(); c.arc(128-eyeDX, eyeY+2, 9, 0, 7); c.fill();
  c.beginPath(); c.arc(128+eyeDX, eyeY+2, 9, 0, 7); c.fill();
  // pupils + shine
  c.fillStyle = '#1a1410';
  c.beginPath(); c.arc(128-eyeDX, eyeY+2, 4.5, 0, 7); c.fill();
  c.beginPath(); c.arc(128+eyeDX, eyeY+2, 4.5, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.beginPath(); c.arc(128-eyeDX-3, eyeY-3, 3, 0, 7); c.fill();
  c.beginPath(); c.arc(128+eyeDX-3, eyeY-3, 3, 0, 7); c.fill();
  // lashes / lids
  c.strokeStyle = '#1c1512'; c.lineWidth = female ? 5 : 3; c.lineCap = 'round';
  c.beginPath(); c.arc(128-eyeDX, eyeY, 16, Math.PI*1.05, Math.PI*1.95); c.stroke();
  c.beginPath(); c.arc(128+eyeDX, eyeY, 16, Math.PI*1.05, Math.PI*1.95); c.stroke();
  if(female){
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(128-eyeDX-16, eyeY-2); c.lineTo(128-eyeDX-24, eyeY-8); c.stroke();
    c.beginPath(); c.moveTo(128+eyeDX+16, eyeY-2); c.lineTo(128+eyeDX+24, eyeY-8); c.stroke();
  }
  // brows
  c.strokeStyle = '#241d1a'; c.lineWidth = female ? 4 : 6;
  c.beginPath(); c.moveTo(128-eyeDX-14, eyeY-26); c.quadraticCurveTo(128-eyeDX, eyeY-32, 128-eyeDX+14, eyeY-24); c.stroke();
  c.beginPath(); c.moveTo(128+eyeDX-14, eyeY-24); c.quadraticCurveTo(128+eyeDX, eyeY-32, 128+eyeDX+14, eyeY-26); c.stroke();
  // nose
  c.strokeStyle = 'rgba(150,110,90,0.6)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(128, eyeY+6); c.lineTo(126, eyeY+34); c.lineTo(132, eyeY+38); c.stroke();
  // mouth
  c.strokeStyle = female ? '#c15a63' : 'rgba(150,90,75,0.85)';
  c.lineWidth = female ? 6 : 4;
  c.beginPath(); c.arc(128, eyeY+58, 20, 0.15*Math.PI, 0.85*Math.PI); c.stroke();
  // blush
  c.fillStyle = female ? 'rgba(224,120,120,0.28)' : 'rgba(210,130,110,0.18)';
  c.beginPath(); c.arc(128-52, eyeY+30, 13, 0, 7); c.fill();
  c.beginPath(); c.arc(128+52, eyeY+30, 13, 0, 7); c.fill();
  faceTex.needsUpdate = true;
}
drawFace(false);
// curved face card on the front of the head
var faceGeo = new THREE.PlaneGeometry(0.26, 0.26, 10, 10);
(function(){
  var p = faceGeo.attributes.position;
  for(var vi=0; vi<p.count; vi++){
    var a = p.getX(vi), b = p.getY(vi);
    p.setZ(vi, -(a*a + b*b) * 1.5);
  }
  faceGeo.computeVertexNormals();
})();
var faceMesh = new THREE.Mesh(faceGeo,
  new THREE.MeshStandardMaterial({ map: faceTex, transparent:true, roughness:0.9 }));
faceMesh.position.set(0, 0.84, 0.15);
rig.add(faceMesh);

// ---- HAIR: male short cap + female long hair, both real meshes ----
var maleHair = new THREE.Group();
var mCap = new THREE.Mesh(new THREE.SphereGeometry(0.178, 24, 20, 0, Math.PI*2, 0, Math.PI*0.66), CH.hair);
mCap.position.set(0, 0.84, 0); maleHair.add(mCap);
var mSweep = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.14), CH.hair);
mSweep.position.set(0.03, 0.92, 0.11); mSweep.rotation.z = -0.25; maleHair.add(mSweep);
rig.add(maleHair);

var femHair = new THREE.Group();
var fCap = new THREE.Mesh(new THREE.SphereGeometry(0.185, 24, 20, 0, Math.PI*2, 0, Math.PI*0.8), CH.hair);
fCap.position.set(0, 0.84, 0); femHair.add(fCap);
// side curtains framing the face
[-0.15, 0.15].forEach(function(sx){
  var strand = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.32, 6, 10), CH.hair);
  strand.scale.set(1, 1, 0.55);
  strand.position.set(sx, 0.66, 0.03); strand.rotation.x = 0.1; femHair.add(strand);
});
// long back fall
var back = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.5, 8, 14), CH.hair);
back.scale.set(1.15, 1, 0.55);
back.position.set(0, 0.5, -0.09); femHair.add(back);
// low bun / thickness at the crown
var bun = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), CH.hair);
bun.position.set(0, 0.78, -0.16); femHair.add(bun);
femHair.visible = false;
rig.add(femHair);
femHair.traverse(function(o){ if(o.isMesh) o.castShadow = true; });
maleHair.traverse(function(o){ if(o.isMesh) o.castShadow = true; });

// limb helper: pivot at the joint, capsule hangs below
function limb(px, py, pz, len, rad, m){
  var pivot = new THREE.Group();
  pivot.position.set(px, py, pz);
  var seg = new THREE.Mesh(new THREE.CapsuleGeometry(rad, len, 6, 10), m);
  seg.position.y = -len/2 - rad*0.5;
  seg.castShadow = true;
  pivot.add(seg);
  rig.add(pivot);
  return pivot;
}
var armL = limb(-0.26, 0.58, 0, 0.46, 0.055, CH.hood);
var armR = limb( 0.26, 0.58, 0, 0.46, 0.055, CH.hood);
// hands
[armL, armR].forEach(function(a){
  var h = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), CH.skin);
  h.position.set(0, -0.58, 0); a.add(h);
});
var legL = limb(-0.11, 0.0, 0, 0.56, 0.075, CH.jeans);
var legR = limb( 0.11, 0.0, 0, 0.56, 0.075, CH.jeans);
// sneakers (sole + upper)
function shoe(pivot){
  var up = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.24), CH.shoe);
  up.position.set(0, -0.66, 0.05); up.castShadow = true; pivot.add(up);
  var sole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.27), CH.sole);
  sole.position.set(0, -0.72, 0.06); pivot.add(sole);
}
shoe(legL); shoe(legR);

// ---- GENDER SWITCH ----
var gender = 'male';
function setGender(gRaw){
  gender = (gRaw === 'female') ? 'female' : 'male';
  var female = gender === 'female';
  maleHair.visible = !female;
  femHair.visible = female;
  drawFace(female);
  // silhouette + palette tweaks
  pTorso.scale.set(female ? 1.02 : 1.10, 1, female ? 0.78 : 0.82);
  pHips.scale.set(female ? 1.12 : 1.05, 1, 0.85);
  CH.hood.color.set(female ? 0x9a5c74 : 0x3f4a63);   // rose vs navy hoodie
  CH.jeans.color.set(female ? 0x394a6b : 0x2f3543);
  CH.hair.color.set(female ? 0x3a2a20 : 0x241d1a);
  // buttons
  var mb = document.getElementById('chMale'), fb = document.getElementById('chFemale');
  if(mb && fb){ mb.classList.toggle('active', !female); fb.classList.toggle('active', female); }
}
setGender('male');

var PLAYER_R = 0.32;
function blocked(x, z){
  if(x < -HALF_X+PLAYER_R || x > HALF_X-PLAYER_R) return true;
  if(z < -HALF_Z+PLAYER_R || z > HALF_Z-PLAYER_R) return true;
  for(var i=0;i<colliders.length;i++){
    var c = colliders[i];
    if(x+PLAYER_R > c.minX && x-PLAYER_R < c.maxX && z+PLAYER_R > c.minZ && z-PLAYER_R < c.maxZ) return true;
  }
  return false;
}

// ============================================================
//  INPUT
// ============================================================
var keys = Object.create(null);
window.addEventListener('keydown', function(e){ keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup',   function(e){ keys[e.key.toLowerCase()] = false; });

var joy = { active:false, x:0, y:0 };
(function joystick(){
  var base = document.getElementById('joy'), stick = document.getElementById('stick'), R = 45, id = null;
  function set(dx,dy){
    var len = Math.hypot(dx,dy);
    if(len > R){ dx = dx/len*R; dy = dy/len*R; }
    stick.style.transform = 'translate('+dx+'px,'+dy+'px)';
    joy.x = dx/R; joy.y = dy/R;
  }
  function reset(){ joy.active=false; joy.x=0; joy.y=0; stick.style.transform='translate(0,0)'; id=null; }
  base.addEventListener('touchstart', function(e){
    var t = e.changedTouches[0]; id = t.identifier; joy.active = true;
    var r = base.getBoundingClientRect();
    set(t.clientX-(r.left+r.width/2), t.clientY-(r.top+r.height/2)); e.preventDefault();
  }, {passive:false});
  base.addEventListener('touchmove', function(e){
    for(var i=0;i<e.changedTouches.length;i++){
      var t = e.changedTouches[i]; if(t.identifier !== id) continue;
      var r = base.getBoundingClientRect();
      set(t.clientX-(r.left+r.width/2), t.clientY-(r.top+r.height/2));
    }
    e.preventDefault();
  }, {passive:false});
  base.addEventListener('touchend', function(e){
    for(var i=0;i<e.changedTouches.length;i++) if(e.changedTouches[i].identifier===id) reset();
  }, {passive:false});
  base.addEventListener('touchcancel', reset, {passive:false});
})();

