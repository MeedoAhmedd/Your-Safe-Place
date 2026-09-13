// ============================================================
//  UI.JS -- save/slot system, menu wiring helpers, menu ambience
// ============================================================

// ============================================================
//  SLOTS + SAVE SYSTEM  (localStorage, 3 independent slots)
// ============================================================
var SAVE_KEY = 'yoursafeplace.slots.v1';
var activeSlot = null;

function loadAll(){
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }
  catch(e){ return {}; }
}
function saveAll(data){
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch(e){}
}
function saveSlot(){
  if(activeSlot == null) return;
  var all = loadAll();
  var prev = all['slot'+activeSlot] || {};
  all['slot'+activeSlot] = {
    px: player.position.x, pz: player.position.z, ry: player.rotation.y,
    gender: gender,
    room: roomConfig,
    notebook: { answers: nbAnswers, page: nbIndex, furthest: nbFurthest },
    ambient: AmbientSound.snapshot(),
    music: Music.snapshot(),
    visits: prev.visits || 1,
    updated: Date.now()
  };
  saveAll(all);
}
function loadNotebookFor(s){
  nbAnswers = {}; nbIndex = 0; nbFurthest = 0;
  if(s && s.notebook){
    try {
      if(s.notebook.answers && typeof s.notebook.answers === 'object') nbAnswers = s.notebook.answers;
      nbIndex = Math.min(Math.max(s.notebook.page|0, 0), NB_PAGES.length - 1);
      nbFurthest = Math.min(Math.max(s.notebook.furthest|0, 0), NB_PAGES.length - 1);
    } catch(e){}
  }
}
function loadRoomFor(s){
  var cfg = defaultConfig();
  if(s && s.room){
    try {
      if(s.room.items) for(var k in cfg.items)
        if(s.room.items[k]) cfg.items[k] = { style: s.room.items[k].style|0, color: s.room.items[k].color };
      if(Array.isArray(s.room.neonZones)){
        cfg.neonZones = [];
        for(var nz=0;nz<NEON_MODES.length;nz++){
          var src = s.room.neonZones[nz];
          cfg.neonZones.push(src ? { on:!!src.on, color:(src.color!=null?src.color:0x8a4bff) } : { on:false, color:0x8a4bff });
        }
      } else if(s.room.neon && s.room.neon.on){
        var li = Math.min(Math.max(s.room.neon.style|0, 0), NEON_MODES.length-1);
        cfg.neonZones[li] = { on:true, color:(s.room.neon.color!=null?s.room.neon.color:0x8a4bff) };
      }
      if(Array.isArray(s.room.frames)) cfg.frames = s.room.frames.filter(function(f){ return f && f.id; }).map(function(f){ return { id:f.id, wall:f.wall||null, u:(f.u!=null?f.u:0), v:(f.v!=null?f.v:1.7) }; });
    } catch(e){}
  }
  roomConfig = cfg;
  applyRoomConfig();
}
function fmtDate(ts){
  if(!ts) return 'new';
  var d = new Date(ts);
  return d.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + ' ' +
         d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
}

function renderSlots(){
  var all = loadAll();
  var row = document.getElementById('slotRow');
  row.innerHTML = '';
  for(var i=1;i<=3;i++){
    (function(i){
      var s = all['slot'+i];
      var el = document.createElement('div');
      el.className = 'slot';
      el.innerHTML =
        '<div class="lbl">Slot '+i+'</div>' +
        '<div class="name">'+(s ? 'Your room' : 'Empty')+'</div>' +
        '<div class="meta">'+(s ? 'last visited '+fmtDate(s.updated) : 'tap to begin')+'</div>' +
        (s ? '<button type="button" class="del">delete</button>' : '');
      el.addEventListener('click', function(ev){
        if(ev.target && ev.target.classList.contains('del')) return;
        enterSlot(i);
      });
      var del = el.querySelector('.del');
      if(del) del.addEventListener('click', function(ev){
        ev.stopPropagation();
        var a = loadAll(); delete a['slot'+i]; saveAll(a); renderSlots();
      });
      row.appendChild(el);
    })(i);
  }
}

function enterSlot(i){
  MenuAudio.stop();
  activeSlot = i;
  seated = null; seatBlend = 0;
  var all = loadAll();
  var s = all['slot'+i];
  if(s){
    player.position.x = s.px != null ? s.px : 0.5;
    player.position.z = s.pz != null ? s.pz : 3.6;
    player.rotation.y = s.ry || 0;
  } else {
    player.position.set(0.5, 0, 3.6);
    player.rotation.y = 0;
  }
  setGender(s && s.gender ? s.gender : 'male');
  loadRoomFor(s);
  loadNotebookFor(s);
  AmbientSound.stopAll();
  Music.stop();
  if(s && s.ambient){
    // accept both the old {layers,volume} shape and the new snapshot
    AmbientSound.restore(s.ambient);
  }
  if(s && s.music) Music.restore(s.music);
  updateAmbBtn();
  // mark visited + persist
  all['slot'+i] = {
    px: player.position.x, pz: player.position.z, ry: player.rotation.y,
    gender: gender,
    visits: (s && s.visits ? s.visits : 0) + 1,
    updated: Date.now()
  };
  saveAll(all);

  furniture.visible = true;
  menuProps.visible = false;
  player.visible = true;

  document.getElementById('pfName').textContent = 'Slot ' + i;
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('profile').classList.add('show');
  document.getElementById('charCard').classList.add('show');
  document.getElementById('hint').classList.add('show');
  document.getElementById('editBtn').classList.add('show');
  document.getElementById('ambBtn').classList.add('show');
  gameActive = true;
}

function backToMenu(){
  saveSlot();
  if(nbOpen) closeNotebook();
  if(editing) closeEdit();
  if(seated){ seated = null; seatBlend = 0; }
  restPhraseEl.classList.remove('show');
  gameActive = false;
  activeSlot = null;
  AmbientSound.stopAll();
  Music.stop();
  toggleAmbPanel(false);
  furniture.visible = false;
  menuProps.visible = true;
  player.visible = false;
  document.getElementById('profile').classList.remove('show');
  document.getElementById('charCard').classList.remove('show');
  document.getElementById('hint').classList.remove('show');
  document.getElementById('editBtn').classList.remove('show');
  document.getElementById('ambBtn').classList.remove('show');
  document.getElementById('slots').classList.remove('show');
  document.getElementById('titleblock').style.display = '';
  document.getElementById('menu').classList.remove('hidden');
  MenuAudio.start();
}


// ============================================================
//  MENU / LOADING AMBIENCE
//  Soft piano + rain + birdsong under the title & slot screens.
//  Browsers block audio until the first gesture, so we also arm
//  it on the very first pointer / key / touch.
// ============================================================
var MenuAudio = (function(){
  var piano = null, armed = false, active = false;

  function ensure(){
    if(piano) return piano;
    piano = new Audio('assets/audio/alex-morgan-piano-background-gentle-study-flow-578490.mp3');
    piano.loop = true;
    piano.preload = 'auto';
    piano.volume = 0;
    return piano;
  }
  function fadeTo(target, ms){
    ensure();
    var from = piano.volume, start = performance.now();
    (function step(){
      var k = Math.min(1, (performance.now() - start) / ms);
      piano.volume = from + (target - from) * k;
      if(k < 1 && active === (target > 0)) requestAnimationFrame(step);
    })();
  }
  function start(){
    if(active) return;
    active = true;
    ensure();
    piano.play().then(function(){ fadeTo(0.34, 2200); }).catch(function(){ active = false; });
    // gentle rain + birds to match the loading screen art
    try{
      AmbientSound.setVolume(0.5);
      AmbientSound.setLayer('rain', true);
      AmbientSound.setLayer('birds', true);
    }catch(e){}
  }
  function stop(){
    active = false;
    if(piano){ fadeTo(0, 700); setTimeout(function(){ if(!active && piano){ piano.pause(); piano.currentTime = 0; } }, 750); }
    try{ AmbientSound.setLayer('rain', false); AmbientSound.setLayer('birds', false); }catch(e){}
  }
  function arm(){
    if(armed) return;
    armed = true;
    // only auto-start while the menu is up (not if we're already in a room)
    if(!gameActive) start();
    window.removeEventListener('pointerdown', arm);
    window.removeEventListener('keydown', arm);
    window.removeEventListener('touchstart', arm);
  }
  window.addEventListener('pointerdown', arm, { once:false });
  window.addEventListener('keydown', arm, { once:false });
  window.addEventListener('touchstart', arm, { once:false });
  // try immediately too (works if the tab already had interaction, e.g. reload)
  setTimeout(function(){ if(!gameActive) start(); }, 300);

  return { start:start, stop:stop };
})();

