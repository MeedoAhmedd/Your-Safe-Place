// ============================================================
//  MAIN.JS -- entry point: game loop + menu button wiring
// ============================================================

var gameActive = false;


// ============================================================
//  LOOP  (camera basis derived once; camera never touched again)
// ============================================================
var SPEED = 2.6;
var clock = new THREE.Clock();
var walkPhase = 0, walkAmt = 0;
var camFlat = new THREE.Vector3(); camera.getWorldDirection(camFlat); camFlat.y = 0; camFlat.normalize();
var camRight = new THREE.Vector3().crossVectors(camFlat, new THREE.Vector3(0,1,0)).normalize();

// ---- adaptive quality watchdog: keep the frame-rate smooth on any device ----
var _fpsSamples = [], _lastQCheck = 0, _screenAcc = 0, _tabHidden = false;
document.addEventListener('visibilitychange', function(){ _tabHidden = document.hidden; });

function adaptQuality(dt, nowMs){
  // rolling average fps over ~1s
  if(dt > 0) _fpsSamples.push(1/dt);
  if(_fpsSamples.length > 60) _fpsSamples.shift();
  if(nowMs - _lastQCheck < 2000 || _fpsSamples.length < 30) return;
  _lastQCheck = nowMs;
  var avg = _fpsSamples.reduce(function(a,b){return a+b;},0) / _fpsSamples.length;

  if(avg < 45){
    // struggling — shed load, step by step
    if(Q.dpr > 1){
      Q.dpr = Math.max(1, Q.dpr - 0.25); renderer.setPixelRatio(Q.dpr);
    } else if(Q.shadows){
      Q.shadows = false; renderer.shadowMap.enabled = false; warm.castShadow = false;
    } else if(Q.screenFps > 3){
      Q.screenFps = 3;
    }
    _fpsSamples.length = 0;
  } else if(avg > 58 && Q.dpr < Q.dprCap){
    // headroom — creep quality back up
    Q.dpr = Math.min(Q.dprCap, Q.dpr + 0.25); renderer.setPixelRatio(Q.dpr);
    _fpsSamples.length = 0;
  }
}

function frame(){
  requestAnimationFrame(frame);
  if(_tabHidden) return;                       // don't burn cycles in a background tab
  var dt = Math.min(clock.getDelta(), 0.05);
  var nowMs = performance.now();
  adaptQuality(dt, nowMs);

  var ix = 0, iz = 0;
  // any movement input while seated → stand up
  var wantMove = false;
  if(typeof gameActive !== 'undefined' && gameActive && !editing && !nbOpen){
    if(keys['w'] || keys['arrowup'])    { iz += 1; wantMove = true; }
    if(keys['s'] || keys['arrowdown'])  { iz -= 1; wantMove = true; }
    if(keys['a'] || keys['arrowleft'])  { ix -= 1; wantMove = true; }
    if(keys['d'] || keys['arrowright']) { ix += 1; wantMove = true; }
    if(joy.active){ ix += joy.x; iz -= joy.y; wantMove = true; }
  }
  if(seated && wantMove){ standUp(); }
  if(seated){ ix = 0; iz = 0; }

  var move = new THREE.Vector3().addScaledVector(camFlat, iz).addScaledVector(camRight, ix);
  var moving = move.lengthSq() > 0.0001;
  if(moving){
    move.normalize();
    var step = SPEED*dt;
    var nx = player.position.x + move.x*step;
    var nz = player.position.z + move.z*step;
    if(!blocked(nx, player.position.z)) player.position.x = nx;
    if(!blocked(player.position.x, nz)) player.position.z = nz;
    var targetYaw = Math.atan2(move.x, move.z);
    var dd = targetYaw - player.rotation.y;
    dd = Math.atan2(Math.sin(dd), Math.cos(dd));
    player.rotation.y += dd * Math.min(1, dt*12);
  }

  // ---- seated / lying pose takes over the body ----
  if(seated || seatBlend > 0.002){
    applySeatPose(dt);
  } else {
    // ---- walk animation ----
    var walkTarget = moving ? 1 : 0;
    walkAmt += (walkTarget - walkAmt) * Math.min(1, dt*9);       // ease in / out
    walkPhase += dt * 8.5 * (0.5 + walkAmt);
    var sw = Math.sin(walkPhase);
    var swing = sw * 0.85 * walkAmt;
    // legs oppose; arms counter-swing
    legL.rotation.x =  swing;      legR.rotation.x = -swing;
    armL.rotation.x = -swing*0.75; armR.rotation.x =  swing*0.75;
    armL.rotation.z =  0.06 + walkAmt*0.02;   // arms rest slightly out
    armR.rotation.z = -0.06 - walkAmt*0.02;
    // vertical bob (twice per stride), slight forward lean, hip sway
    rig.position.y = 0.98 + Math.abs(sw) * 0.045 * walkAmt;
    rig.rotation.z = Math.sin(walkPhase) * 0.035 * walkAmt;       // hip sway
    rig.rotation.x = 0.08 * walkAmt;                              // lean into the walk
    pHead.rotation.z = -Math.sin(walkPhase) * 0.03 * walkAmt;     // head counter-steady
    // idle: gentle breathing + tiny weight shift
    if(!moving){
      var b = Math.sin(clock.elapsedTime*1.5);
      pTorso.position.y = 0.36 + b*0.008;
      rig.rotation.z = b*0.012;
      armL.rotation.x = -0.02 + b*0.02;
      armR.rotation.x = -0.02 - b*0.02;
    }
  }

  lampLight.intensity = 1.65 + Math.sin(clock.elapsedTime*2.3)*0.06;

  // animated screen canvases (TV / code monitor / clocks) are expensive:
  // repaint them at a low fixed rate instead of every frame.
  _screenAcc += dt;
  var screenStep = 1 / Q.screenFps;
  if(_screenAcc >= screenStep){
    _screenAcc = _screenAcc % screenStep;
    updateScreens(clock.elapsedTime);
  }

  updateNotebookPrompt();
  renderer.render(scene, camera);
}
frame();

var _resizeT = null;
window.addEventListener('resize', function(){
  clearTimeout(_resizeT);
  _resizeT = setTimeout(function(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Q.dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, 120);
});


// ============================================================
//  MENU WIRING
// ============================================================
document.getElementById('loading').classList.add('hidden');

document.getElementById('playBtn').addEventListener('click', function(){
  document.getElementById('titleblock').style.display = 'none';
  document.getElementById('slots').classList.add('show');
  renderSlots();
});
document.getElementById('slotBack').addEventListener('click', function(){
  document.getElementById('slots').classList.remove('show');
  document.getElementById('titleblock').style.display = '';
});
document.getElementById('pfMenu').addEventListener('click', backToMenu);

// character gender toggle (saves into the active slot)
document.getElementById('chMale').addEventListener('click', function(){
  setGender('male'); if(gameActive) saveSlot();
});
document.getElementById('chFemale').addEventListener('click', function(){
  setGender('female'); if(gameActive) saveSlot();
});

// autosave every few seconds + on leaving the page
setInterval(function(){ if(gameActive) saveSlot(); }, 4000);
window.addEventListener('beforeunload', function(){ if(gameActive) saveSlot(); });

// lighten the menu's blurred colour blobs on low-end / mobile GPUs
if(LOW_END){
  var _st = document.createElement('style');
  _st.textContent = '.aura{filter:blur(45px);opacity:.42;animation-duration:36s}';
  document.head.appendChild(_st);
}

// drifting dust motes for the menu void
(function motes(){
  var wrap = document.getElementById('motes');
  if(!wrap) return;
  var COUNT = LOW_END ? 8 : 16;
  for(var i=0;i<COUNT;i++){
    var m = document.createElement('div');
    m.className = 'mote';
    m.style.left = (Math.random()*100) + 'vw';
    m.style.bottom = '-10px';
    m.style.animationDuration = (11 + Math.random()*14) + 's';
    m.style.animationDelay = (-Math.random()*22) + 's';
    m.style.opacity = 0.3 + Math.random()*0.5;
    wrap.appendChild(m);
  }
})();

