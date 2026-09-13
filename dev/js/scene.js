/* ============================================================
   YOUR SAFE PLACE
   Fixed diorama camera (never follows the player) + walkable room.
   ============================================================ */

// ---------- device / quality profile ----------
// Works on any PC or phone: we pick a starting quality from the hardware,
// then an adaptive watchdog (see the loop) nudges it up or down so the
// frame-rate stays smooth no matter what the device can handle.
var IS_TOUCH = (window.matchMedia && window.matchMedia('(hover:none) and (pointer:coarse)').matches) ||
               ('ontouchstart' in window && navigator.maxTouchPoints > 0);
var CPU_CORES = navigator.hardwareConcurrency || (IS_TOUCH ? 4 : 8);
var DEVMEM   = navigator.deviceMemory || (IS_TOUCH ? 4 : 8);
var LOW_END  = IS_TOUCH || CPU_CORES <= 4 || DEVMEM <= 4;

var Q = {
  // dpr cap — the single biggest lever for fill-rate on phones / hi-dpi laptops
  dprCap  : LOW_END ? 1.5 : 2,
  dpr     : 1,
  shadows : !LOW_END,
  shadowMap : LOW_END ? 1024 : 2048,
  // how often the animated screen-canvases (TV, code monitor, clocks) repaint, in fps
  screenFps : LOW_END ? 4 : 12
};

// ---------- renderer ----------
var renderer = new THREE.WebGLRenderer({ antialias:!LOW_END, powerPreference:'high-performance' });
Q.dpr = Math.min(window.devicePixelRatio || 1, Q.dprCap);
renderer.setPixelRatio(Q.dpr);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = Q.shadows;
renderer.shadowMap.type = LOW_END ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
if('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
document.body.appendChild(renderer.domElement);

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0b12);

// ---------- FIXED diorama camera ----------
var camera = new THREE.PerspectiveCamera(13, window.innerWidth/window.innerHeight, 0.1, 200);
var CAM_DIST = 52;
var azim = Math.PI/4;              // look into the back corner
var elev = 35*Math.PI/180;        // 35° above horizontal
var CAM_LOOK = new THREE.Vector3(0, 1.6, 0);
camera.position.set(
  CAM_LOOK.x + CAM_DIST*Math.cos(elev)*Math.sin(azim),
  CAM_LOOK.y + CAM_DIST*Math.sin(elev),
  CAM_LOOK.z + CAM_DIST*Math.cos(elev)*Math.cos(azim)
);
camera.lookAt(CAM_LOOK);

// ---------- EDIT-MODE camera orbit / zoom (only while editing; resets on close) ----------
var CAM_HOME = { azim:azim, elev:elev, dist:CAM_DIST };
var camView  = { azim:azim, elev:elev, dist:CAM_DIST };
var camDefault = true;   // true = snap-to-home fixed diorama; false = user has orbited

function applyCameraView(){
  var a = camView.azim, e = camView.elev, d = camView.dist;
  camera.position.set(
    CAM_LOOK.x + d*Math.cos(e)*Math.sin(a),
    CAM_LOOK.y + d*Math.sin(e),
    CAM_LOOK.z + d*Math.cos(e)*Math.cos(a)
  );
  camera.lookAt(CAM_LOOK);
}
function resetCameraView(){
  camView.azim = CAM_HOME.azim; camView.elev = CAM_HOME.elev; camView.dist = CAM_HOME.dist;
  camDefault = true;
  applyCameraView();
}
(function editCamControls(){
  var el = renderer.domElement;
  var dragging = false, lx = 0, ly = 0, moved = 0;
  el.addEventListener('pointerdown', function(e){
    if(!editing) return;
    dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
    el.setPointerCapture && el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', function(e){
    if(!editing || !dragging) return;
    var dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    camView.azim -= dx * 0.006;
    camView.elev += dy * 0.005;
    camView.elev = Math.max(0.12, Math.min(1.45, camView.elev));
    camDefault = false;
    applyCameraView();
  });
  window._camDidDrag = function(){ return moved > 6; };
  function endDrag(e){ dragging = false; try{ el.releasePointerCapture(e.pointerId); }catch(_){} }
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);
  el.addEventListener('wheel', function(e){
    if(!editing) return;
    e.preventDefault();
    camView.dist *= (1 + Math.sign(e.deltaY) * 0.08);
    camView.dist = Math.max(18, Math.min(90, camView.dist));
    camDefault = false;
    applyCameraView();
  }, { passive:false });
})();

// ---------- lighting ----------
scene.add(new THREE.HemisphereLight(0xd8dcff, 0x4a4250, 0.75));
scene.add(new THREE.AmbientLight(0xffffff, 0.32));

var warm = new THREE.DirectionalLight(0xffe4c2, 1.45);
warm.position.set(7, 11, 8);
warm.castShadow = Q.shadows;
warm.shadow.mapSize.set(Q.shadowMap, Q.shadowMap);
warm.shadow.camera.left = -10; warm.shadow.camera.right = 10;
warm.shadow.camera.top = 10;   warm.shadow.camera.bottom = -10;
warm.shadow.camera.near = 1;   warm.shadow.camera.far = 40;
warm.shadow.bias = -0.0004;
scene.add(warm);

var cool = new THREE.DirectionalLight(0x9f8dff, 0.7);
cool.position.set(-6, 5, -6);
scene.add(cool);

var topFill = new THREE.DirectionalLight(0xffffff, 0.32);
topFill.position.set(0, 12, 2);
scene.add(topFill);

// soft procedural environment for gentle reflections
(function(){
  var c = document.createElement('canvas'); c.width = c.height = 16;
  var g = c.getContext('2d');
  var grd = g.createLinearGradient(0,0,0,16);
  grd.addColorStop(0,'#3a3550'); grd.addColorStop(0.5,'#5a5266'); grd.addColorStop(1,'#2a2530');
  g.fillStyle = grd; g.fillRect(0,0,16,16);
  var tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = tex;
})();

// ---------- materials ----------
function mat(c, r, m){ return new THREE.MeshStandardMaterial({ color:c, roughness:(r==null?0.9:r), metalness:(m==null?0:m) }); }
var M = {
  floor : mat(0x8a6045, 0.7),
  wall  : mat(0x413a4c, 0.95),
  wallB : mat(0x4a4256, 0.95),
  rim   : mat(0xf2eee9, 0.85),
  wood  : mat(0x5b3f2c, 0.7),
  woodL : mat(0x8a6647, 0.65),
  sheet : mat(0x9c8aa8, 1),
  pillow: mat(0xe9e0d6, 0.95),
  couch : mat(0x4a4048, 0.95),
  dark  : mat(0x1c1a20, 0.5),
  screen: new THREE.MeshStandardMaterial({ color:0x0a0a0f, emissive:0x2a3a6a, emissiveIntensity:0.6, roughness:0.3 }),
  rug   : mat(0x5b5262, 1),
  glass : new THREE.MeshStandardMaterial({ color:0x1b2f4a, roughness:0.08, metalness:0.15, transparent:true, opacity:0.4 }),
  skin  : mat(0xc98f6d, 0.8),
  cloth : mat(0x6a7fb0, 0.9),
  plant : mat(0x4f6b46, 0.9)
};

// ---------- world ----------
var room = new THREE.Group(); scene.add(room);
var furniture = new THREE.Group(); room.add(furniture);   // hidden on the menu
var menuProps = new THREE.Group(); room.add(menuProps);   // shown only on the menu
var target = room;                                        // where box() adds meshes
var colliders = [];
function box(x,y,z, sx,sy,sz, m, collide){
  var mesh = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), m);
  mesh.position.set(x,y,z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  target.add(mesh);
  if(collide) colliders.push({ minX:x-sx/2, maxX:x+sx/2, minZ:z-sz/2, maxZ:z+sz/2 });
  return mesh;
}

var HALF_X = 5.5, HALF_Z = 5.0, WALL_H = 5;

// ---- book helper: a spine with a printed title ----
var BOOK_TITLES = [
  'ATLAS','the quiet','NORTH','embers','SALT & SKY','after rain','MERIDIAN',
  'small hours','THE LONG WAY','stillness','driftwood','HOMEBOUND','low tide',
  'PAPER MOON','the good dark','fathoms','WANDER','solace','THE SHORE','kindling'
];
var BOOK_COLS = [0x8a4b3c,0x3c6e8a,0x6f7a34,0xb0894a,0x5a3c8a,0x8a3c6e,0x3f6f5a,0x9a5a3a,0x445a8a,0x7a5a3a];
var _bookIdx = 0;
function titledBook(cx, cy, cz, axis, h){
  // axis 'z' = spine faces +X (books along the Z wall); 'x' = spine faces +Z
  var col = BOOK_COLS[_bookIdx % BOOK_COLS.length];
  var title = BOOK_TITLES[_bookIdx % BOOK_TITLES.length];
  _bookIdx++;
  var c = document.createElement('canvas'); c.width = 64; c.height = 256;
  var g = c.getContext('2d');
  g.fillStyle = '#' + col.toString(16).padStart(6,'0'); g.fillRect(0,0,64,256);
  g.fillStyle = 'rgba(255,245,225,0.85)';
  g.translate(32,128); g.rotate(-Math.PI/2);
  g.textAlign = 'center'; g.font = '600 20px Georgia, serif';
  g.fillText(title, 0, 6);
  var tex = new THREE.CanvasTexture(c);
  var spineMat = new THREE.MeshStandardMaterial({ map:tex, roughness:0.85 });
  var plain = mat(col, 0.85);
  var thick = 0.11, depth = 0.34;
  var geo = (axis === 'z')
    ? new THREE.BoxGeometry(depth, h, thick)
    : new THREE.BoxGeometry(thick, h, depth);
  // face materials: put the titled texture on the spine face
  var mats;
  if(axis === 'z') mats = [plain,plain,plain,plain,spineMat,plain];   // +X face
  else             mats = [plain,plain,plain,plain,plain,spineMat];   // +Z face
  var m = new THREE.Mesh(geo, mats);
  m.position.set(cx, cy, cz); m.castShadow = true; m.receiveShadow = true;
  target.add(m);
  return m;
}

// shell
box(0, -0.15, 0, HALF_X*2, 0.3, HALF_Z*2, M.floor);
box(0, WALL_H/2, -HALF_Z, HALF_X*2, WALL_H, 0.3, M.wallB);
box(-HALF_X, WALL_H/2, 0, 0.3, WALL_H, HALF_Z*2, M.wall);
colliders.push({ minX:HALF_X-0.2, maxX:HALF_X+0.2, minZ:-HALF_Z, maxZ:HALF_Z });
colliders.push({ minX:-HALF_X, maxX:HALF_X, minZ:HALF_Z-0.2, maxZ:HALF_Z+0.2 });

// bright rim caps + trims
var RIM_T = 0.28, RIM_D = 0.5;
box(0, WALL_H+RIM_T/2, -HALF_Z+RIM_D/2-0.15, HALF_X*2+RIM_D, RIM_T, RIM_D, M.rim);
box(-HALF_X+RIM_D/2-0.15, WALL_H+RIM_T/2, 0, RIM_D, RIM_T, HALF_Z*2+RIM_D, M.rim);
box(HALF_X-0.02, WALL_H/2, -HALF_Z+0.15, 0.06, WALL_H, 0.3, M.rim);
box(-HALF_X+0.15, WALL_H/2, HALF_Z-0.02, 0.3, WALL_H, 0.06, M.rim);
box(0, 0.09, -HALF_Z+0.18, HALF_X*2, 0.18, 0.08, M.rim);
box(-HALF_X+0.18, 0.09, 0, 0.08, 0.18, HALF_Z*2, M.rim);

/* ===== everything from here on is FURNITURE (hidden on the menu) ===== */
target = furniture;

/* ---- WINDOW: left wall, real frame + blind + curtains + night view ---- */
var WIN_CZ = -1.0, WIN_CY = 3.05, WIN_W = 3.2, WIN_H = 2.6;
var wx = -HALF_X + 0.16;
(function windowUnit(){
  var frameMat = mat(0xece7df, 0.7);
  var barMat = mat(0xe4ddd2, 0.7);
  box(wx, WIN_CY+WIN_H/2+0.12, WIN_CZ, 0.22, 0.24, WIN_W+0.5, frameMat);
  box(wx, WIN_CY-WIN_H/2-0.12, WIN_CZ, 0.22, 0.24, WIN_W+0.5, frameMat);
  box(wx, WIN_CY, WIN_CZ+WIN_W/2+0.12, 0.22, WIN_H+0.5, 0.24, frameMat);
  box(wx, WIN_CY, WIN_CZ-WIN_W/2-0.12, 0.22, WIN_H+0.5, 0.24, frameMat);
  box(-HALF_X+0.45, WIN_CY-WIN_H/2-0.18, WIN_CZ, 0.7, 0.14, WIN_W+0.8, frameMat); // sill
  box(wx-0.02, WIN_CY, WIN_CZ, 0.05, WIN_H, WIN_W, M.glass);
  box(wx+0.01, WIN_CY, WIN_CZ, 0.09, WIN_H, 0.1, barMat);
  box(wx+0.01, WIN_CY, WIN_CZ, 0.09, 0.1, WIN_W, barMat);
  // roller blind (half down)
  box(-HALF_X+0.22, WIN_CY+WIN_H/2-0.05, WIN_CZ, 0.05, WIN_H*0.5, WIN_W+0.1, mat(0xd9cdb8, 0.95));
  // curtains
  var curt = new THREE.MeshStandardMaterial({ color:0xbfc7d8, roughness:1, transparent:true, opacity:0.75 });
  box(-HALF_X+0.30, WIN_CY, WIN_CZ-WIN_W/2-0.15, 0.08, WIN_H+0.7, 0.5, curt);
  box(-HALF_X+0.30, WIN_CY, WIN_CZ+WIN_W/2+0.15, 0.08, WIN_H+0.7, 0.5, curt);
  box(-HALF_X+0.30, WIN_CY+WIN_H/2+0.4, WIN_CZ, 0.08, 0.1, WIN_W+1.2, mat(0x2a2a2a, 0.5));
})();
var winLight = new THREE.PointLight(0x9fb8ff, 1.1, 12);
winLight.position.set(-HALF_X+1.0, WIN_CY, WIN_CZ);
furniture.add(winLight);
// ---------- WINDOW VIEW — acts like a screen mounted just inside the glass, sized tight to the opening.
// (placed INSIDE the room, not behind the wall, so the solid wall box never occludes it) ----------
var winViewMat = new THREE.MeshBasicMaterial({ color:0x111c30, depthWrite:false });
(function outside(){
  var sky = new THREE.Mesh(new THREE.PlaneGeometry(WIN_W - 0.06, WIN_H - 0.06), winViewMat);
  sky.rotation.y = Math.PI/2;
  sky.position.set(-HALF_X + 0.16, WIN_CY, WIN_CZ);   // sits inside the glass, in front of the wall — like a screen
  sky.renderOrder = 1;
  furniture.add(sky);
})();
function windowViewTex(styleIdx){
  var c = document.createElement('canvas'); c.width = 256; c.height = 208;
  var g = c.getContext('2d');
  function bg(a,b){ var gr=g.createLinearGradient(0,0,0,208); gr.addColorStop(0,a); gr.addColorStop(1,b);
    g.fillStyle=gr; g.fillRect(0,0,256,208); }
  function stars(n, alphaMax){
    for(var s=0;s<n;s++){ g.fillStyle='rgba(255,255,255,'+(0.3+Math.random()*(alphaMax-0.3)).toFixed(2)+')';
      g.beginPath(); g.arc(Math.random()*256,Math.random()*120,Math.random()*1.3+0.3,0,7); g.fill(); }
  }
  if(styleIdx===0){ // night sky — moon + stars (the original view)
    bg('#111c30','#0a0f22'); stars(40,0.9);
    g.fillStyle='#f3f0e2'; g.beginPath(); g.arc(190,40,18,0,7); g.fill();
    g.fillStyle='#0d1230'; g.beginPath(); g.arc(197,35,16,0,7); g.fill();
  } else if(styleIdx===1){ // ocean with palm trees
    bg('#8fd0e8','#e8c98a'); g.fillStyle='#2f9fc7'; g.fillRect(0,130,256,20);
    g.fillStyle='#1f7fa8'; g.fillRect(0,150,256,58);
    g.fillStyle='rgba(255,255,255,0.6)'; for(var w=0;w<5;w++){ g.fillRect(10+w*48,140+((w%2)*4),26,3); }
    function palm(px,py,s){
      g.strokeStyle='#4a3420'; g.lineWidth=5*s; g.beginPath();
      g.moveTo(px,py); g.quadraticCurveTo(px+10*s,py-40*s,px+4*s,py-70*s); g.stroke();
      g.fillStyle='#2f6b34';
      for(var l=0;l<5;l++){ var a=l/5*Math.PI*2;
        g.beginPath(); g.ellipse(px+4*s+Math.cos(a)*16*s, py-70*s+Math.sin(a)*10*s, 16*s, 6*s, a, 0, 7); g.fill(); }
    }
    palm(50,150,1); palm(210,146,0.8);
  } else if(styleIdx===2){ // city skyline
    bg('#2a3a5c','#0f1420');
    for(var b1=0;b1<9;b1++){ var bw=18+Math.random()*14, bh=40+Math.random()*90, bx=b1*29;
      g.fillStyle='#1a2236'; g.fillRect(bx,208-bh,bw,bh);
      g.fillStyle='rgba(255,222,140,0.85)';
      for(var wy=208-bh+8; wy<200; wy+=14) for(var wx=bx+4; wx<bx+bw-4; wx+=10)
        if(Math.random()<0.6) g.fillRect(wx,wy,4,6);
    }
  } else if(styleIdx===3){ // advanced city — neon futuristic skyline
    bg('#150826','#3a1a4a');
    for(var b2=0;b2<7;b2++){ var bw2=20+Math.random()*16, bh2=60+Math.random()*110, bx2=b2*37;
      g.fillStyle='#0d0a1a'; g.fillRect(bx2,208-bh2,bw2,bh2);
      g.strokeStyle=['#ff5ac8','#5ad9ff','#9a5aff'][b2%3]; g.lineWidth=1.5;
      for(var wy2=208-bh2+6; wy2<204; wy2+=10) g.strokeRect(bx2+3,wy2,bw2-6,5);
    }
    g.fillStyle='rgba(154,90,255,0.5)'; g.fillRect(0,190,256,18);
  } else if(styleIdx===4){ // forest / nature
    bg('#cfe8c0','#8fbf7a');
    g.fillStyle='#4f6b34';
    for(var t1=0;t1<7;t1++){ var tx=t1*38+10, th=70+Math.random()*40;
      g.beginPath(); g.moveTo(tx,208); g.lineTo(tx-24,208-th*0.5); g.lineTo(tx+24,208-th*0.5); g.fill();
      g.beginPath(); g.moveTo(tx,208-th*0.35); g.lineTo(tx-18,208-th*0.85); g.lineTo(tx+18,208-th*0.85); g.fill();
    }
    g.fillStyle='#3a5024'; g.fillRect(0,195,256,13);
  } else if(styleIdx===5){ // mountains at dawn
    bg('#f4c9a0','#e69a7a');
    g.fillStyle='#8a6f92'; g.beginPath(); g.moveTo(0,208); g.lineTo(70,90); g.lineTo(150,208); g.fill();
    g.fillStyle='#6a5578'; g.beginPath(); g.moveTo(90,208); g.lineTo(180,60); g.lineTo(256,208); g.fill();
    g.fillStyle='rgba(255,255,255,0.85)'; g.beginPath(); g.moveTo(165,95); g.lineTo(180,60); g.lineTo(196,94); g.fill();
    g.fillStyle='#f0a24a'; g.beginPath(); g.arc(210,150,20,0,7); g.fill();
  } else if(styleIdx===6){ // cherry blossoms / spring
    bg('#dff0f5','#bfe0e8');
    g.fillStyle='#5a4030'; g.fillRect(30,120,10,88); g.fillRect(190,110,10,98);
    for(var pc=0;pc<70;pc++){ g.fillStyle='rgba(250,190,205,'+(0.5+Math.random()*0.5).toFixed(2)+')';
      var cx3=(Math.random()<0.5)?(20+Math.random()*90):(160+Math.random()*90), cy3=40+Math.random()*100;
      g.beginPath(); g.arc(cx3,cy3,3.5,0,7); g.fill();
    }
  } else { // aurora / northern lights
    bg('#050b1a','#0a1330'); stars(30,0.8);
    ['rgba(60,220,150,0.35)','rgba(110,90,255,0.3)','rgba(60,200,255,0.25)'].forEach(function(col,i){
      g.strokeStyle=col; g.lineWidth=20;
      g.beginPath();
      for(var x2=0;x2<=256;x2+=8) g.lineTo(x2, 60+i*22+Math.sin(x2*0.03+i)*26);
      g.stroke();
    });
  }
  var t = new THREE.CanvasTexture(c);
  return t;
}
function applyWindow(styleIdx){
  winViewMat.map = windowViewTex(styleIdx);
  winViewMat.color.setHex(0xffffff);
  winViewMat.needsUpdate = true;
}

/* ---- TV: sleek wall-mounted flat panel (no glow light) ---- */
var TVX = 2.6, TV_CY = 2.4;
var tvDark = mat(0x14141a, 0.35, 0.2);
var tvScreenOff = mat(0x0c0d12, 0.15, 0.4);        // matte-off screen, no emissive
var TV_FINISH = [0.35,0.6,0.2,0.5,0.15,0.8,0.5,0.3];
function applyTV(styleIdx, colHex){
  var col = (colHex!=null) ? colHex : EDIT_ITEMS.tv.styles[styleIdx].color;
  tvDark.color.setHex(col);
  tvDark.roughness = TV_FINISH[styleIdx] != null ? TV_FINISH[styleIdx] : 0.35;
  tvDark.metalness = (styleIdx===2||styleIdx===4||styleIdx===7) ? 0.7 : 0.2;
  tvDark.needsUpdate = true;
}
// ---- media console: carcass + real recessed centre bay + side cabinet doors ----
var CFz = -HALF_Z + 0.86;     // front face plane of the console
box(TVX, 0.32, -HALF_Z + 0.55, 3.0, 0.56, 0.6, M.woodL, true);        // carcass
box(TVX, 0.62, -HALF_Z + 0.55, 3.1, 0.05, 0.66, mat(0x8a6647, 0.5));  // top slab
box(TVX, 0.05, -HALF_Z + 0.55, 2.9, 0.05, 0.6, mat(0x6d4b36, 0.6));   // bottom rail
// centre OPEN BAY: a dark recess set back from the front face
box(TVX, 0.34, -HALF_Z + 0.70, 1.05, 0.42, 0.42, mat(0x201b26, 0.8));
box(TVX, 0.14, CFz - 0.02, 1.05, 0.02, 0.04, mat(0x5a3f2e, 0.6));     // bay shelf lip
// LEFT + RIGHT cabinet: a single door each, inset with a small round knob
function cabDoor(cx){
  box(cx, 0.34, CFz, 0.86, 0.44, 0.03, mat(0x7c5942, 0.5));           // door panel (sits proud)
  box(cx, 0.34, CFz + 0.005, 0.78, 0.36, 0.015, mat(0x6e4e3a, 0.5));  // inset bevel
  var knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), mat(0x1c1c1c, 0.35));
  knob.position.set(cx + 0.34, 0.34, CFz + 0.03); knob.castShadow = true; furniture.add(knob);
}
cabDoor(TVX - 0.95);
cabDoor(TVX + 0.95);
// four short legs
[-1.35, -0.45, 0.45, 1.35].forEach(function(lx){
  box(TVX + lx, -0.02, -HALF_Z + 0.42, 0.06, 0.12, 0.06, mat(0x3a2a1e, 0.6));
});
// the panel: thin bezel + screen, sitting ~0.14 off the wall
box(TVX, TV_CY, -HALF_Z+0.22, 3.0, 1.74, 0.06, tvDark);               // bezel
box(TVX, TV_CY, -HALF_Z+0.14, 0.5, 0.5, 0.10, tvDark);               // wall mount block
// LIVE screen (canvas texture: Netflix + rotating posters)
var tvCanvas = document.createElement('canvas'); tvCanvas.width = 640; tvCanvas.height = 360;
var tvCtx = tvCanvas.getContext('2d');
var tvTex = new THREE.CanvasTexture(tvCanvas);
var tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.82, 1.56),
  new THREE.MeshBasicMaterial({ map: tvTex }));
tvScreen.position.set(TVX, TV_CY, -HALF_Z+0.255);
furniture.add(tvScreen);
// soundbar tucked under the TV
box(TVX, 0.63, -HALF_Z+0.55, 2.0, 0.1, 0.14, mat(0x232028, 0.5));
var CONZ = -HALF_Z + 0.55, CONY = 0.60;   // console surface

// LEFT: a small potted plant (single clean accent)
box(TVX - 1.05, CONY + 0.06, CONZ, 0.22, 0.24, 0.22, mat(0x9a7d63, 0.8));
var cPlant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), M.plant);
cPlant.position.set(TVX - 1.05, CONY + 0.26, CONZ); cPlant.castShadow = true; furniture.add(cPlant);

// CENTRE: a working digital clock
var clkCanvas = document.createElement('canvas'); clkCanvas.width = 256; clkCanvas.height = 128;
var clkCtx = clkCanvas.getContext('2d');
var clkTex = new THREE.CanvasTexture(clkCanvas);
box(TVX, CONY + 0.08, CONZ, 0.42, 0.2, 0.12, mat(0x1a1a1e, 0.4));       // clock body
var clkFace = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.15),
  new THREE.MeshBasicMaterial({ map: clkTex }));
clkFace.position.set(TVX, CONY + 0.09, CONZ + 0.061);
furniture.add(clkFace);

// RIGHT: a small stack of two books + a candle (calm, uncluttered)
box(TVX + 1.05, CONY + 0.07, CONZ, 0.34, 0.08, 0.24, mat(0x3f6f5a, 0.85));
box(TVX + 1.05, CONY + 0.13, CONZ + 0.01, 0.3, 0.06, 0.2, mat(0x8a4b3c, 0.85));
var conCandle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16), mat(0xe8ddc8, 0.6));
conCandle.position.set(TVX + 1.05, CONY + 0.21, CONZ); conCandle.castShadow = true;
furniture.add(conCandle);

/* ---- COUCH facing the TV (closer to it now) ---- */
var COUCHZ = 1.5;
var couchGroup = new THREE.Group(); furniture.add(couchGroup);
var couchCollider = null;
function buildCouch(styleIdx, colHex){
  while(couchGroup.children.length) couchGroup.remove(couchGroup.children[0]);
  if(couchCollider){ var ci = colliders.indexOf(couchCollider); if(ci>=0) colliders.splice(ci,1); couchCollider = null; }
  var col = (colHex != null) ? colHex : EDIT_ITEMS.couch.styles[styleIdx].color;
  var body = mat(col, 0.95);
  var accent = mat((col>>1)&0x7f7f7f, 0.95);
  function b(x,y,z,sx,sy,sz,m){
    var me = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), m||body);
    me.position.set(x,y,z); me.castShadow = true; me.receiveShadow = true;
    couchGroup.add(me); return me;
  }
  function cyl(x,y,z,r,h,m){
    var me = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16), m||body);
    me.rotation.z = Math.PI/2; me.position.set(x,y,z); me.castShadow = true;
    couchGroup.add(me); return me;
  }
  if(styleIdx === 0){ // classic — original look
    b(TVX,0.42,COUCHZ+0.30,3.1,0.5,1.05);
    b(TVX,0.72,COUCHZ+0.20,2.7,0.22,0.85,accent);
    b(TVX,1.02,COUCHZ+0.72,3.1,0.9,0.28);
    b(TVX-1.45,0.75,COUCHZ+0.20,0.28,0.75,1.0);
    b(TVX+1.45,0.75,COUCHZ+0.20,0.28,0.75,1.0);
    [[-1.4,-0.15],[-1.4,0.75],[1.4,-0.15],[1.4,0.75]].forEach(function(p){
      b(TVX+p[0],0.085,COUCHZ+p[1],0.12,0.17,0.12,mat(0x2a1e14,0.6));
    });
  } else if(styleIdx === 1){ // chesterfield — deep buttoned back, low rolled arms
    b(TVX,0.38,COUCHZ+0.30,2.4,0.40,1.15);                 // deep seat base (narrower — arms sit outside it)
    b(TVX,0.60,COUCHZ+0.16,1.9,0.22,0.95,accent);          // two-seat cushion
    b(TVX,0.60,COUCHZ+0.16,0.04,0.24,0.95,body);           // cushion split
    b(TVX,0.94,COUCHZ+0.74,2.7,0.78,0.26);                 // low buttoned back
    // rolled arms — short scroll bolsters standing proud at each end, clear of the seat cushion
    [-1,1].forEach(function(s){
      var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.24,0.9,16), body);
      arm.rotation.x = Math.PI/2;                             // lie the roll along Z (couch depth)
      arm.position.set(TVX+s*1.25,0.66,COUCHZ+0.30);
      arm.castShadow = true; couchGroup.add(arm);
      b(TVX+s*1.25,0.46,COUCHZ+0.30,0.22,0.5,0.9);            // solid support block under the roll
    });
    // deep-button tufting grid on the back
    for(var tr=0;tr<2;tr++) for(var tx=-2;tx<=2;tx++)
      b(TVX+tx*0.52,0.78+tr*0.34,COUCHZ+0.87,0.05,0.05,0.05,accent);
    // turned bun feet, directly under the arms and the back corners
    [[-1.25,0.30],[1.25,0.30],[-1.1,-0.2],[1.1,-0.2]].forEach(function(p){
      var f=new THREE.Mesh(new THREE.SphereGeometry(0.07,10,8),M.wood);
      f.position.set(TVX+p[0],0.06,COUCHZ+p[1]); f.castShadow=true; couchGroup.add(f);
    });
  } else if(styleIdx === 2){ // sectional L — extra chaise to the left, kept clear of the table
    b(TVX+0.2,0.42,COUCHZ+0.30,2.7,0.5,1.05);
    b(TVX+0.2,0.72,COUCHZ+0.20,2.4,0.22,0.85,accent);
    b(TVX+0.2,1.02,COUCHZ+0.72,2.7,0.9,0.28);
    b(TVX+1.5,0.75,COUCHZ+0.20,0.28,0.75,1.0);
    b(TVX-1.25,0.42,COUCHZ+0.15,1.0,0.5,1.3);          // chaise seat, shortened to clear the table
    b(TVX-1.25,0.72,COUCHZ+0.15,0.8,0.22,1.1,accent);
    b(TVX-1.68,0.75,COUCHZ+0.15,0.28,0.75,1.3);         // chaise outer arm
    [[-0.85,-0.15],[-0.85,0.75],[1.45,-0.15],[1.45,0.75]].forEach(function(p){
      b(TVX+p[0],0.085,COUCHZ+p[1],0.12,0.17,0.12,mat(0x2a1e14,0.6));
    });
    [[-1.6,-0.4],[-1.6,0.7]].forEach(function(p){
      b(TVX+p[0],0.085,COUCHZ+p[1],0.12,0.17,0.12,mat(0x2a1e14,0.6));
    });
  } else if(styleIdx === 3){ // mid-century — tapered wood legs, boxy, thin
    b(TVX,0.52,COUCHZ+0.30,3.0,0.34,1.0);
    b(TVX,0.74,COUCHZ+0.22,2.8,0.16,0.8,accent);
    b(TVX,1.04,COUCHZ+0.70,3.0,0.72,0.20);
    b(TVX-1.45,0.66,COUCHZ+0.22,0.16,0.5,0.9);
    b(TVX+1.45,0.66,COUCHZ+0.22,0.16,0.5,0.9);
    [[-1.35,-0.35],[-1.35,0.9],[1.35,-0.35],[1.35,0.9]].forEach(function(p){
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.02,0.34,8), M.wood);
      leg.position.set(TVX+p[0],0.17,COUCHZ+p[1]); leg.rotation.x=0.12; couchGroup.add(leg);
    });
  } else if(styleIdx === 4){ // cloud / puffy — big soft blobs, no visible frame
    function blob(x,y,z,sx,sy,sz){
      var me = new THREE.Mesh(new THREE.SphereGeometry(0.5,16,12), body);
      me.scale.set(sx,sy,sz); me.position.set(x,y,z); me.castShadow=true; couchGroup.add(me);
    }
    blob(TVX,0.5,COUCHZ+0.3,3.4,0.9,1.3);
    blob(TVX,0.85,COUCHZ+0.75,3.4,1.0,0.7);
    blob(TVX-1.5,0.75,COUCHZ+0.25,0.9,1.0,1.2);
    blob(TVX+1.5,0.75,COUCHZ+0.25,0.9,1.0,1.2);
    blob(TVX-0.8,0.78,COUCHZ+0.15,1.0,0.5,0.9);
    blob(TVX+0.8,0.78,COUCHZ+0.15,1.0,0.5,0.9);
  } else if(styleIdx===5){ // futon — low platform, flat, floor cushions
    b(TVX,0.24,COUCHZ+0.35,3.0,0.28,1.2,M.wood);
    b(TVX,0.44,COUCHZ+0.30,2.9,0.16,1.1,accent);
    b(TVX,0.70,COUCHZ+0.82,2.9,0.6,0.20);
    b(TVX-1.0,0.62,COUCHZ+0.2,0.7,0.3,0.7,accent);
    b(TVX+0.4,0.62,COUCHZ+0.1,0.7,0.3,0.7,accent);
  } else if(styleIdx===6){ // camelback — serpentine arched back, exposed wood, no bulky arms
    b(TVX,0.44,COUCHZ+0.30,2.7,0.42,1.0);                  // seat base
    b(TVX,0.66,COUCHZ+0.22,2.4,0.16,0.82,accent);          // seat cushion
    // serpentine back: taller in the centre, sweeping down to the ends
    for(var cb=-3;cb<=3;cb++){
      var hh = 0.5 + Math.cos(cb/3 * Math.PI/2) * 0.55;
      b(TVX+cb*0.42,0.66+hh/2,COUCHZ+0.72,0.44,hh,0.2);
    }
    // slim scrolled wood arms (much thinner, pulled in)
    [-1,1].forEach(function(sgn){
      var arm=new THREE.Mesh(new THREE.TorusGeometry(0.26,0.05,10,16,Math.PI),M.wood);
      arm.rotation.y=Math.PI/2; arm.rotation.z=sgn>0?0:Math.PI;
      arm.position.set(TVX+sgn*1.2,0.9,COUCHZ+0.25); arm.castShadow=true; couchGroup.add(arm);
      var post=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.5,10),M.wood);
      post.position.set(TVX+sgn*1.2,0.62,COUCHZ+0.25); couchGroup.add(post);
    });
    // 4 turned tapered wood legs
    [[-1.15,-0.3],[-1.15,0.72],[1.15,-0.3],[1.15,0.72]].forEach(function(p){
      var l=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.03,0.4,10),M.wood);
      l.position.set(TVX+p[0],0.2,COUCHZ+p[1]); l.castShadow=true; couchGroup.add(l);
    });
  } else { // settee — small, formal, exposed carved wood frame + tight upholstery
    var frameW = mat((col>>1)&0x7f7f7f | 0x201810, 0.5);
    b(TVX,0.46,COUCHZ+0.28,2.6,0.16,0.9,frameW);          // seat rail
    b(TVX,0.62,COUCHZ+0.24,2.3,0.14,0.72);                // tight seat cushion
    b(TVX,1.02,COUCHZ+0.66,2.5,0.8,0.16);                 // tight back
    b(TVX,1.44,COUCHZ+0.66,2.7,0.12,0.2,frameW);          // carved crest rail
    b(TVX-1.3,0.9,COUCHZ+0.3,0.14,0.9,0.8,frameW);        // open arm L
    b(TVX+1.3,0.9,COUCHZ+0.3,0.14,0.9,0.8,frameW);        // open arm R
    [[-1.15,-0.1],[-1.15,0.6],[1.15,-0.1],[1.15,0.6]].forEach(function(p){
      var l=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.03,0.4,10),frameW);
      l.position.set(TVX+p[0],0.2,COUCHZ+p[1]); l.castShadow=true; couchGroup.add(l);
    });
  }
  couchCollider = { minX:TVX-1.55, maxX:TVX+1.55, minZ:COUCHZ-0.55, maxZ:COUCHZ+0.95 };
  colliders.push(couchCollider);
}

/* ---- COFFEE TABLE (in front of the couch, still with a gap) ---- */
var TBLZ = COUCHZ - 1.35;
var tableGroup = new THREE.Group(); furniture.add(tableGroup);
var tableCollider = null;
function buildTable(styleIdx, colHex){
  while(tableGroup.children.length) tableGroup.remove(tableGroup.children[0]);
  if(tableCollider){ var ci = colliders.indexOf(tableCollider); if(ci>=0) colliders.splice(ci,1); tableCollider=null; }
  var col = (colHex!=null) ? colHex : EDIT_ITEMS.table.styles[styleIdx].color;
  var top = mat(col, 0.5), leg = mat((col>>1)&0x7f7f7f, 0.6);
  function b(x,y,z,sx,sy,sz,m){
    var me=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), m||top);
    me.position.set(x,y,z); me.castShadow=true; me.receiveShadow=true; tableGroup.add(me); return me;
  }
  if(styleIdx===0){ // wood two-tier (original)
    b(TVX,0.40,TBLZ,1.7,0.12,0.95);
    b(TVX,0.30,TBLZ,1.5,0.08,0.78,leg);
    [[-0.72,-0.33],[-0.72,0.33],[0.72,-0.33],[0.72,0.33]].forEach(function(p){
      b(TVX+p[0],0.20,TBLZ+p[1],0.1,0.34,0.1,leg);
    });
  } else if(styleIdx===1){ // round glass + gold hairpin legs
    var g = new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.95,0.05,32), M.glass);
    g.position.set(TVX,0.42,TBLZ); g.castShadow=true; tableGroup.add(g);
    for(var a=0;a<4;a++){
      var ang=a/4*Math.PI*2;
      var l=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.4,10),
        new THREE.MeshStandardMaterial({color:col,metalness:0.8,roughness:0.3}));
      l.position.set(TVX+Math.cos(ang)*0.7,0.2,TBLZ+Math.sin(ang)*0.6); l.rotation.x=0.15; tableGroup.add(l);
    }
  } else if(styleIdx===2){ // chunky live-edge slab on box legs
    var slab=b(TVX,0.44,TBLZ,1.9,0.18,1.0);
    b(TVX-0.8,0.2,TBLZ,0.12,0.4,0.9,leg);
    b(TVX+0.8,0.2,TBLZ,0.12,0.4,0.9,leg);
  } else if(styleIdx===3){ // nested pair of trapezoid tables
    b(TVX-0.35,0.42,TBLZ,1.1,0.1,0.9);
    b(TVX-0.35,0.22,TBLZ-0.38,0.1,0.4,0.1,leg);
    b(TVX-0.35,0.22,TBLZ+0.38,0.1,0.4,0.1,leg);
    b(TVX+0.75,0.34,TBLZ+0.1,0.8,0.1,0.7,leg);
    b(TVX+0.75,0.18,TBLZ+0.1,0.6,0.32,0.5,top);
  } else if(styleIdx===4){ // drum / pedestal
    var d=new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.7,0.45,24), top);
    d.position.set(TVX,0.25,TBLZ); d.castShadow=true; tableGroup.add(d);
    var t2=new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.85,0.06,24), leg);
    t2.position.set(TVX,0.5,TBLZ); tableGroup.add(t2);
  } else if(styleIdx===5){ // industrial — metal frame + wheels
    b(TVX,0.42,TBLZ,1.8,0.1,0.95);
    var fm=mat(0x2a2a30,0.5,0.3);
    [[-0.8,-0.4],[-0.8,0.4],[0.8,-0.4],[0.8,0.4]].forEach(function(p){
      b(TVX+p[0],0.2,TBLZ+p[1],0.06,0.4,0.06,fm);
    });
    b(TVX,0.12,TBLZ,1.7,0.05,0.05,fm);
  } else if(styleIdx===6){ // carved — solid apron + turned legs + lower stretcher
    var cw=mat(col,0.5);
    b(TVX,0.44,TBLZ,1.8,0.12,0.95,cw);
    b(TVX,0.34,TBLZ,1.6,0.12,0.78,cw);                 // carved apron
    [[-0.75,-0.36],[-0.75,0.36],[0.75,-0.36],[0.75,0.36]].forEach(function(p){
      var l=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.05,0.34,10),cw);
      l.position.set(TVX+p[0],0.17,TBLZ+p[1]); l.castShadow=true; tableGroup.add(l);
    });
    b(TVX,0.12,TBLZ,1.5,0.05,0.06,cw); b(TVX,0.12,TBLZ,0.06,0.05,0.7,cw); // H-stretcher
  } else { // ornate — gilt-edge top, cabriole-ish legs, scrolled feet
    var ow=mat(col,0.45,0.1);
    var gilt=new THREE.MeshStandardMaterial({color:0xb98a4a,metalness:0.7,roughness:0.3});
    b(TVX,0.44,TBLZ,1.7,0.1,0.9,ow);
    b(TVX,0.49,TBLZ,1.78,0.03,0.98,gilt);              // gilt rim
    b(TVX,0.34,TBLZ,1.5,0.12,0.72,ow);
    [[-0.7,-0.34],[-0.7,0.34],[0.7,-0.34],[0.7,0.34]].forEach(function(p){
      var l=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.03,0.32,10),ow);
      l.position.set(TVX+p[0],0.17,TBLZ+p[1]); l.rotation.x=p[1]<0?0.14:-0.14; l.castShadow=true;
      tableGroup.add(l);
      var foot=new THREE.Mesh(new THREE.SphereGeometry(0.05,10,8),gilt);
      foot.position.set(TVX+p[0],0.03,TBLZ+p[1]*1.15); tableGroup.add(foot);
    });
  }
  tableCollider = { minX:TVX-0.95, maxX:TVX+0.95, minZ:TBLZ-0.55, maxZ:TBLZ+0.55 };
  colliders.push(tableCollider);
}
// props: stacked books + a candle + a small bowl
box(TVX-0.45, 0.50, TBLZ, 0.44, 0.1, 0.3, mat(0x7a8a3c, 0.85));
box(TVX-0.45, 0.58, TBLZ, 0.4, 0.07, 0.26, mat(0x8a4b3c, 0.85));
var candle = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.12,14), mat(0xe8ddc8, 0.6));
candle.position.set(TVX+0.35, 0.51, TBLZ+0.15); furniture.add(candle);
var bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.09,0.09,16), mat(0x3a3a44, 0.4));
bowl.position.set(TVX+0.4, 0.49, TBLZ-0.2); furniture.add(bowl);

/* ---- RUG under the whole seating area ---- */
var rugGroup = new THREE.Group(); furniture.add(rugGroup);
function rugTex(styleIdx, col){
  var c = document.createElement('canvas'); c.width = c.height = 256;
  var g = c.getContext('2d');
  var base = '#' + (col>>>0).toString(16).padStart(6,'0');
  var dark = '#' + (((col>>1)&0x7f7f7f)>>>0).toString(16).padStart(6,'0');
  var light = 'rgba(255,255,255,0.22)';
  g.fillStyle = base; g.fillRect(0,0,256,256);
  if(styleIdx===0){ /* solid */ }
  else if(styleIdx===1){ // border frame
    g.strokeStyle=light; g.lineWidth=14; g.strokeRect(22,22,212,212);
    g.strokeStyle=dark; g.lineWidth=4; g.strokeRect(40,40,176,176);
  } else if(styleIdx===2){ // diamond trellis
    g.strokeStyle=light; g.lineWidth=5;
    for(var i=-256;i<256;i+=40){ g.beginPath();g.moveTo(i,0);g.lineTo(i+256,256);g.stroke();
      g.beginPath();g.moveTo(i,256);g.lineTo(i+256,0);g.stroke(); }
  } else if(styleIdx===3){ // stripes
    for(var s=0;s<256;s+=32){ g.fillStyle = (s/32)%2? dark:light; g.fillRect(0,s,256,16); }
  } else if(styleIdx===4){ // persian medallion
    g.fillStyle=dark; g.fillRect(30,30,196,196);
    g.fillStyle=light; g.beginPath(); g.ellipse(128,128,70,50,0,0,7); g.fill();
    g.fillStyle=base; g.beginPath(); g.ellipse(128,128,40,26,0,0,7); g.fill();
    g.strokeStyle=light;g.lineWidth=8;g.strokeRect(14,14,228,228);
  } else if(styleIdx===5){ // shag / speckle
    for(var k=0;k<900;k++){ g.fillStyle = Math.random()<0.5?light:dark;
      g.fillRect(Math.random()*256,Math.random()*256,3,3); }
  } else if(styleIdx===6){ // oriental — dense bordered field with a central medallion + corners
    g.strokeStyle=light; g.lineWidth=18; g.strokeRect(24,24,208,208);
    g.strokeStyle=dark; g.lineWidth=6; g.strokeRect(46,46,164,164);
    g.fillStyle=dark;
    (function di(cx,cy,r){ g.beginPath();
      for(var a=0;a<16;a++){ var rr = r*(a%2?0.6:1); var an=a/16*Math.PI*2;
        g.lineTo(cx+Math.cos(an)*rr, cy+Math.sin(an)*rr); } g.closePath(); g.fill(); })(128,128,52);
    g.fillStyle=light;
    [[46,46],[210,46],[46,210],[210,210]].forEach(function(p){
      g.beginPath(); g.arc(p[0],p[1],20,0,7); g.fill(); });
  } else { // aubusson — soft floral scatter on a pale ground, faint border
    g.strokeStyle=dark; g.lineWidth=8; g.strokeRect(20,20,216,216);
    for(var fl=0;fl<26;fl++){
      var fx=20+Math.random()*216, fy=20+Math.random()*216;
      g.fillStyle = Math.random()<0.5?light:dark;
      for(var pt=0;pt<5;pt++){ var pa=pt/5*Math.PI*2;
        g.beginPath(); g.ellipse(fx+Math.cos(pa)*7,fy+Math.sin(pa)*7,5,9,pa,0,7); g.fill(); }
    }
  }
  var t = new THREE.CanvasTexture(c);
  return t;
}
function buildRug(styleIdx, colHex){
  while(rugGroup.children.length) rugGroup.remove(rugGroup.children[0]);
  var col = (colHex!=null) ? colHex : EDIT_ITEMS.rug.styles[styleIdx].color;
  var border = new THREE.Mesh(new THREE.BoxGeometry(5.0,0.03,4.4),
    mat((col>>1)&0x7f7f7f, 1));
  border.position.set(TVX,0.03,COUCHZ-0.5); border.receiveShadow=true; rugGroup.add(border);
  var top = new THREE.Mesh(new THREE.BoxGeometry(4.4,0.03,3.8),
    new THREE.MeshStandardMaterial({ map: rugTex(styleIdx,col), roughness:1 }));
  top.position.set(TVX,0.045,COUCHZ-0.5); top.receiveShadow=true; rugGroup.add(top);
}

/* ---- BEAN BAGS — rebuildable, 6 styles + colour ---- */
var beanGroup = new THREE.Group(); furniture.add(beanGroup);
function buildBeanbags(styleIdx, colHex){
  while(beanGroup.children.length){
    var ch = beanGroup.children[0]; beanGroup.remove(ch);
  }
  // clear old beanbag colliders (last two we push here); simplest: rebuild whole list not safe.
  // instead track them:
  buildBeanbags._cols && buildBeanbags._cols.forEach(function(c){
    var i = colliders.indexOf(c); if(i>=0) colliders.splice(i,1);
  });
  buildBeanbags._cols = [];
  var col = (colHex!=null) ? colHex : EDIT_ITEMS.beanbag.styles[styleIdx].color;
  var col2 = (styleIdx%2===0) ? col : ((col>>1)&0x7f7f7f);
  function one(x,z,c){
    var g = new THREE.Group(); g.position.set(x,0,z);
    var fab = new THREE.MeshStandardMaterial({ color:c, roughness:0.98 });
    function blob(w,h,d,px,py,pz){
      var m=new THREE.Mesh(new THREE.SphereGeometry(0.5,18,14),fab);
      m.scale.set(w,h,d); m.position.set(px,py,pz); m.castShadow=true; g.add(m); return m;
    }
    if(styleIdx===0){ // classic scooped (original-ish)
      g.rotation.x=-0.12;
      blob(1.15,0.55,1.25,0,0.26,-0.05);
      var seat=new THREE.Mesh(new THREE.SphereGeometry(0.42,16,10,0,7,0,Math.PI*0.55),fab);
      seat.scale.set(1,0.5,0.95); seat.rotation.x=Math.PI; seat.position.set(0,0.48,-0.12); g.add(seat);
      var bk=blob(1.0,0.95,0.55,0,0.68,0.42); bk.rotation.x=0.28;
      blob(0.42,0.7,0.95,-0.62,0.48,0); blob(0.42,0.7,0.95,0.62,0.48,0);
      blob(1.0,0.4,0.5,0,0.24,-0.62);
    } else if(styleIdx===1){ // round pouffe — low drum
      var d=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.7,0.5,20),fab);
      d.position.y=0.28; d.castShadow=true; g.add(d);
      blob(1.1,0.3,1.1,0,0.5,0);
    } else if(styleIdx===2){ // teardrop lounge — tall leaning back
      blob(1.2,0.5,1.3,0,0.28,0);
      var t=new THREE.Mesh(new THREE.SphereGeometry(0.5,18,16),fab);
      t.scale.set(1.0,1.6,0.9); t.position.set(0,0.9,0.25); t.castShadow=true; g.add(t);
    } else if(styleIdx===3){ // gaming rocker — L shaped floor seat
      blob(1.3,0.35,1.2,0,0.2,0);
      var back=blob(1.3,1.1,0.4,0,0.6,0.5); back.rotation.x=0.35;
    } else if(styleIdx===4){ // floor cushion stack
      blob(1.2,0.3,1.2,0,0.16,0);
      blob(1.05,0.28,1.05,0.05,0.42,0.05);
      blob(0.9,0.26,0.9,-0.05,0.66,-0.03);
    } else if(styleIdx===5){ // giant pod — huge sphere squashed
      var p=new THREE.Mesh(new THREE.SphereGeometry(0.8,20,16),fab);
      p.scale.set(1.4,0.9,1.4); p.position.y=0.6; p.castShadow=true; g.add(p);
      var scoop=new THREE.Mesh(new THREE.SphereGeometry(0.5,16,12),
        new THREE.MeshStandardMaterial({color:(c>>1)&0x7f7f7f,roughness:1}));
      scoop.scale.set(1.1,0.6,1.0); scoop.position.set(0,0.9,-0.2); g.add(scoop);
    } else if(styleIdx===6){ // tufted ottoman — firm box with a buttoned top + wood feet
      var ot=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.5,1.2),fab);
      ot.position.y=0.35; ot.castShadow=true; g.add(ot);
      for(var bx=-1;bx<=1;bx++) for(var bz=-1;bz<=1;bz++){
        var btn=new THREE.Mesh(new THREE.SphereGeometry(0.04,8,8),
          new THREE.MeshStandardMaterial({color:(c>>1)&0x7f7f7f,roughness:1}));
        btn.position.set(bx*0.32,0.6,bz*0.32); g.add(btn);
      }
      [[-0.5,-0.5],[0.5,-0.5],[-0.5,0.5],[0.5,0.5]].forEach(function(fp){
        var f=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.04,0.16,8),M.wood);
        f.position.set(fp[0],0.08,fp[1]); g.add(f);
      });
    } else { // floor sofa — low wide seat + a soft backrest bolster
      var seatB=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.32,1.1),fab);
      seatB.position.y=0.2; seatB.castShadow=true; g.add(seatB);
      var backB=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,1.7,16),fab);
      backB.rotation.z=Math.PI/2; backB.position.set(0,0.46,0.5); backB.castShadow=true; g.add(backB);
      blob(1.6,0.2,1.0,0,0.4,-0.05);
    }
    beanGroup.add(g);
    var cc={ minX:x-0.6, maxX:x+0.6, minZ:z-0.6, maxZ:z+0.6 };
    colliders.push(cc); buildBeanbags._cols.push(cc);
  }
  one(TVX - 1.9, TBLZ - 0.9, col);
  one(TVX + 1.85, TBLZ - 0.9, col2);
}

/* ---- DESK on the back wall (left) — a proper desk with detail ---- */
var DESKX = -2.7;
var DTOP = 1.1;                          // desk surface height
var deskTop = mat(0x9a7350, 0.45);
var deskFrame = mat(0x24242c, 0.5, 0.2);
var DESK_FINISH = [0.45,0.25,0.9,0.35,0.6,0.15,0.3,0.4];
function applyDesk(styleIdx, colHex){
  var col = (colHex!=null) ? colHex : EDIT_ITEMS.desk.styles[styleIdx].color;
  deskTop.color.setHex(col);
  deskTop.roughness = DESK_FINISH[styleIdx] != null ? DESK_FINISH[styleIdx] : 0.45;
  deskTop.metalness = (styleIdx===4) ? 0.6 : 0;
  deskFrame.color.setHex(
    styleIdx===2 ? 0x3a2a1e :
    styleIdx===5 ? 0x0d0d10 :
    (styleIdx===6 || styleIdx===7) ? 0x3a281c : 0x24242c);
  deskTop.needsUpdate = true;
}
// thick wooden top with a front lip
box(DESKX, DTOP - 0.03, -HALF_Z + 0.56, 2.7, 0.06, 1.02, deskTop, true);
box(DESKX, DTOP - 0.08, -HALF_Z + 1.05, 2.7, 0.05, 0.05, deskFrame);   // front edge rail
// steel A-frame legs
[-1.2, 1.2].forEach(function(sx){
  box(DESKX + sx, 0.55, -HALF_Z + 0.56, 0.05, 1.05, 0.05, deskFrame, true);   // vertical
  box(DESKX + sx, 0.08, -HALF_Z + 0.56, 0.06, 0.06, 0.8, deskFrame);          // foot
  box(DESKX + sx, DTOP - 0.12, -HALF_Z + 0.56, 0.06, 0.06, 0.8, deskFrame);   // top rail
});
box(DESKX, 0.4, -HALF_Z + 0.9, 2.2, 0.05, 0.05, deskFrame);            // cross brace
// 2-drawer pedestal on the right with handles
box(DESKX + 0.75, 0.62, -HALF_Z + 0.56, 0.85, 0.9, 0.75, mat(0x6d4b36, 0.65));
box(DESKX + 0.75, 0.82, -HALF_Z + 0.94, 0.7, 0.28, 0.02, mat(0x7c5942, 0.6));   // drawer face
box(DESKX + 0.75, 0.5, -HALF_Z + 0.94, 0.7, 0.28, 0.02, mat(0x7c5942, 0.6));
box(DESKX + 0.75, 0.82, -HALF_Z + 0.96, 0.18, 0.03, 0.04, mat(0x1a1a1a, 0.4));  // handles
box(DESKX + 0.75, 0.5, -HALF_Z + 0.96, 0.18, 0.03, 0.04, mat(0x1a1a1a, 0.4));
// cable-management tray + a couple of cables to the wall
box(DESKX - 0.4, DTOP - 0.16, -HALF_Z + 0.3, 0.5, 0.04, 0.16, mat(0x2a2a30, 0.5));
box(DESKX - 0.2, DTOP - 0.3, -HALF_Z + 0.18, 0.02, 0.3, 0.02, mat(0x14141a, 0.5));

// ---- MONITOR: screen faces the room (+Z); stand runs DOWN-BEHIND it toward the wall ----
var MON_Z = -HALF_Z + 0.34;                 // screen plane
box(DESKX, DTOP + 0.02, MON_Z - 0.10, 0.42, 0.035, 0.22, mat(0x1a1a20, 0.4)); // base (behind screen)
box(DESKX, DTOP + 0.28, MON_Z - 0.13, 0.05, 0.5, 0.05, mat(0x22222a, 0.4));   // pole (leans to wall)
box(DESKX, DTOP + 0.52, MON_Z - 0.09, 0.14, 0.08, 0.10, mat(0x22222a, 0.4));  // tilt arm to the panel
var monBodyMat = mat(0x101014, 0.35);
var kbMat = mat(0x2c2c34, 0.5);
var kbDeckMat = mat(0x17171c, 0.4);
function applyPC(styleIdx, colHex){
  var col = (colHex!=null) ? colHex : EDIT_ITEMS.pc.styles[styleIdx].color;
  monBodyMat.color.setHex(col);
  kbDeckMat.color.setHex(col);
  kbMat.color.setHex((col>>1)&0x7f7f7f | 0x101010);
  monBodyMat.metalness = (styleIdx===3) ? 0.6 : 0;
  monBodyMat.needsUpdate = true;
  monGlow.color.setHex(EDIT_ITEMS.pc.styles[styleIdx].glow || 0x2fbf5a);
}
box(DESKX, 1.62, MON_Z - 0.03, 1.62, 0.98, 0.05, monBodyMat);        // panel body
var monCanvas = document.createElement('canvas'); monCanvas.width = 512; monCanvas.height = 320;
var monCtx = monCanvas.getContext('2d');
var monTex = new THREE.CanvasTexture(monCanvas);
var monScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.86),
  new THREE.MeshBasicMaterial({ map: monTex }));
monScreen.position.set(DESKX, 1.62, MON_Z);
furniture.add(monScreen);
var monGlow = new THREE.PointLight(0x2fbf5a, 0.3, 2.6);
monGlow.position.set(DESKX, 1.5, MON_Z + 0.5); furniture.add(monGlow);

// keyboard — angled slightly, shifted left
(function keyboard(){
  var kg = new THREE.Group();
  kg.position.set(DESKX - 0.35, DTOP + 0.015, -HALF_Z + 0.86);
  kg.rotation.y = 0.12;                       // slight twist
  var kw = 0.82, kd = 0.27;
  var deck = new THREE.Mesh(new THREE.BoxGeometry(kw, 0.028, kd), kbDeckMat);
  deck.castShadow = true; kg.add(deck);
  var keyMat = kbMat;
  var cols = 13, rows = 4;
  for(var r=0;r<rows;r++){
    for(var cc=0;cc<cols;cc++){
      var k = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.018, 0.042), keyMat);
      k.position.set(-kw/2 + 0.05 + cc*(kw-0.09)/(cols-1), 0.024,
                     -kd/2 + 0.05 + r*(kd-0.09)/(rows-1));
      kg.add(k);
    }
  }
  var space = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.018, 0.042), keyMat);
  space.position.set(0, 0.024, kd/2 - 0.05); kg.add(space);
  furniture.add(kg);
})();
// mouse — angled to match, on a pad, shifted left
(function mouseUnit(){
  var mgx = DESKX + 0.4, mgz = -HALF_Z + 0.88;
  var pad = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.006, 0.32), mat(0x101014, 0.7));
  pad.position.set(mgx, DTOP + 0.004, mgz); pad.rotation.y = -0.15; furniture.add(pad);
  var m = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.05, 6, 10), mat(0x1b1b22, 0.4));
  m.rotation.x = Math.PI/2; m.rotation.z = -0.15;
  m.scale.set(1, 1, 1.35);
  m.position.set(mgx, DTOP + 0.025, mgz); m.castShadow = true; furniture.add(m);
})();

// DESK LAMP — classic architect lamp: round base, two jointed arms, bell shade
(function deskLamp(){
  var lg = new THREE.Group();
  lg.position.set(DESKX - 1.05, DTOP, -HALF_Z + 0.42);
  lg.rotation.y = -1.15;                      // arm reaches OUT toward the room / camera
  var metal = new THREE.MeshStandardMaterial({ color:0x6f97a6, roughness:0.45, metalness:0.35 });

  // round weighted base + neck
  var base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.035, 24), metal);
  base.position.y = 0.018; base.castShadow = true; lg.add(base);
  var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.06, 14), metal);
  hub.position.y = 0.06; lg.add(hub);

  function joint(y, x){
    var j = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 12), metal);
    j.position.set(x, y, 0); lg.add(j); return j;
  }
  function armSeg(len){
    var a = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, len, 12), metal);
    a.castShadow = true; return a;
  }
  // lower arm: from base hub up-and-forward
  var lowJ = joint(0.08, 0);
  var a1 = armSeg(0.4);
  a1.position.set(0.11, 0.28, 0); a1.rotation.z = -0.7;   // leans forward (+x)
  lg.add(a1);
  // elbow
  var elbow = joint(0.46, 0.24);
  // upper arm: from elbow up-and-back toward the shade
  var a2 = armSeg(0.42);
  a2.position.set(0.14, 0.62, 0); a2.rotation.z = 0.85;   // leans back
  lg.add(a2);
  // head joint
  var headJ = joint(0.78, 0.02);

  // bell-shaped shade (cone) tilted to point down at the desk
  var shade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.2, 24, 1, true),
    new THREE.MeshStandardMaterial({ color:0x5f8a99, roughness:0.5, metalness:0.3, side:THREE.DoubleSide }));
  shade.position.set(0.16, 0.8, 0);
  shade.rotation.z = Math.PI * 0.72;          // opening faces down-forward
  shade.castShadow = true; lg.add(shade);
  var cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10, 0, Math.PI*2, 0, Math.PI/2), metal);
  cap.position.set(0.09, 0.86, 0); cap.rotation.z = -0.6; lg.add(cap);

  // glowing bulb + warm pool of light
  var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10),
    new THREE.MeshStandardMaterial({ color:0xffe9c4, emissive:0xffbe66, emissiveIntensity:1.6 }));
  bulb.position.set(0.2, 0.74, 0); lg.add(bulb);
  var glow = new THREE.PointLight(0xffdca8, 0.7, 2.6, 2);
  glow.position.set(0.28, 0.6, 0); lg.add(glow);

  furniture.add(lg);
})();

// ---- LAPTOP: sits on the desk between the lamp and the keyboard, screen open toward the room. ----
var LAPX = DESKX - 0.62, LAPZ = -HALF_Z + 0.64;
var laptopScreenMat = new THREE.MeshBasicMaterial({ color:0x0c0c10 });
(function laptopUnit(){
  var lg = new THREE.Group();
  lg.position.set(LAPX, DTOP, LAPZ);
  lg.rotation.y = 0.22;                          // angled slightly toward the room, like the keyboard
  var body = new THREE.MeshStandardMaterial({ color:0xb9bcc2, roughness:0.35, metalness:0.5 });
  // base / keyboard deck
  var base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.014, 0.24), body);
  base.position.y = 0.007; base.castShadow = true; lg.add(base);
  // a hint of keys pressed into the deck
  var keyMat = new THREE.MeshStandardMaterial({ color:0x2a2a30, roughness:0.6 });
  for(var kr=0; kr<3; kr++) for(var kc=0; kc<8; kc++){
    var kk = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.004, 0.022), keyMat);
    kk.position.set(-0.13 + kc*0.037, 0.016, -0.05 + kr*0.03);
    lg.add(kk);
  }
  // trackpad
  var pad = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.003, 0.07),
    new THREE.MeshStandardMaterial({ color:0x8a8d92, roughness:0.4, metalness:0.3 }));
  pad.position.set(0, 0.016, 0.09); lg.add(pad);
  // hinged screen, tilted open
  var screenGroup = new THREE.Group();
  screenGroup.position.set(0, 0.012, -0.115);
  screenGroup.rotation.x = -1.15;                // opened up toward the player
  var lid = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.012), body);
  lid.position.y = 0.11; lid.castShadow = true; screenGroup.add(lid);
  var bezel = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.185, 0.004),
    new THREE.MeshStandardMaterial({ color:0x0c0c10, roughness:0.4 }));
  bezel.position.set(0, 0.11, 0.0075); screenGroup.add(bezel);
  var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.276, 0.163), laptopScreenMat);
  screen.position.set(0, 0.11, 0.0102);
  screenGroup.add(screen);
  lg.add(screenGroup);
  furniture.add(lg);
})();

// the NOTEBOOK — right side of the desk, sitting toward the front-right area
var notebookCoverMat = new THREE.MeshStandardMaterial({ color:0x5a3a26, roughness:0.45 });
var notebookBandMat  = new THREE.MeshStandardMaterial({ color:0x1c1c1c, roughness:0.6 });
var NOTEBOOK_FINISH = [0.45, 0.2, 0.9, 0.35, 0.6, 0.15, 0.55, 0.4];  // roughness per style
function applyNotebook(styleIdx, colHex){
  var col = (colHex!=null) ? colHex : EDIT_ITEMS.notebook.styles[styleIdx].color;
  notebookCoverMat.color.setHex(col);
  notebookCoverMat.roughness = NOTEBOOK_FINISH[styleIdx] != null ? NOTEBOOK_FINISH[styleIdx] : 0.45;
  notebookCoverMat.metalness = (styleIdx===1||styleIdx===5) ? 0.4 : 0;  // 1=leather sheen,5=metallic
  notebookBandMat.color.setHex((styleIdx===3) ? 0xc9a86a : 0x1c1c1c);
  notebookCoverMat.needsUpdate = true;
}
(function notebook(){
  var nx = DESKX + 1.05, nz = -HALF_Z + 0.78;
  var nb = new THREE.Group();
  nb.position.set(nx, DTOP, nz);
  nb.rotation.y = -0.12;

  var W = 0.42, L = 0.58;
  var coverMat = notebookCoverMat;
  var pageWhite = new THREE.MeshStandardMaterial({ color:0xf1e9d8, roughness:0.95 });
  var pageLine  = new THREE.MeshStandardMaterial({ color:0xe1d5bd, roughness:1 });

  // slightly domed hardcover (a shallow box scaled so the top bows up a touch)
  var cover = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, L, 3, 1, 4), coverMat);
  var cp = cover.geometry.attributes.position;
  for(var i=0;i<cp.count;i++){
    if(cp.getY(i) > 0){
      var xx = cp.getX(i)/(W/2), zz = cp.getZ(i)/(L/2);
      cp.setY(i, cp.getY(i) + (1 - xx*xx)*(1 - zz*zz)*0.012);
    }
  }
  cover.geometry.computeVertexNormals();
  cover.position.y = 0.05; cover.castShadow = true; cover.receiveShadow = true; nb.add(cover);

  // page block peeking out from under the cover on 3 sides
  var pages = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, 0.05, L - 0.02), pageWhite);
  pages.position.y = 0.026; nb.add(pages);
  // fine page-edge lines on the fore edge
  for(var pl=0; pl<6; pl++){
    var line = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, L - 0.06), pageLine);
    line.position.set((W-0.02)/2 - 0.001, 0.012 + pl*0.007, 0); nb.add(line);
  }
  // rounded cloth spine
  var spine = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, L, 16, 1, false, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color:0x4a2f1e, roughness:0.55 }));
  spine.rotation.z = Math.PI/2; spine.rotation.y = Math.PI/2;
  spine.position.set(-W/2 + 0.005, 0.03, 0); spine.castShadow = true; nb.add(spine);
  // black elastic band around the closed book
  var band = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 24), notebookBandMat);
  band.rotation.y = Math.PI/2; band.scale.set(1, 1.8, 1);
  band.position.set(W/2 - 0.06, 0.03, 0); nb.add(band);
  // thin ribbon marker slipping out the bottom
  var ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.003, 0.18),
    new THREE.MeshStandardMaterial({ color:0x9a3b3b, roughness:0.8 }));
  ribbon.position.set(0.06, 0.006, L/2 + 0.06); nb.add(ribbon);

  // ---- extra detail ----
  // corner protectors (little metal caps on the two outer cover corners)
  var brass = new THREE.MeshStandardMaterial({ color:0xcaa76a, roughness:0.3, metalness:0.7 });
  [[W/2-0.03, L/2-0.03],[W/2-0.03, -(L/2-0.03)]].forEach(function(p){
    var c = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.05), brass);
    c.position.set(p[0], 0.075, p[1]); nb.add(c);
  });
  // debossed title panel + a couple of ruled text lines on the cover
  var tc = document.createElement('canvas'); tc.width = 128; tc.height = 160;
  var tg = tc.getContext('2d');
  tg.fillStyle = 'rgba(0,0,0,0)'; tg.fillRect(0,0,128,160);
  tg.strokeStyle = 'rgba(240,225,200,0.5)'; tg.lineWidth = 3;
  tg.strokeRect(16,20,96,120);
  tg.fillStyle = 'rgba(240,228,205,0.75)';
  tg.font = '600 20px Georgia, serif'; tg.textAlign = 'center';
  tg.fillText('journal', 64, 62);
  tg.strokeStyle = 'rgba(240,225,200,0.28)'; tg.lineWidth = 2;
  for(var ln=0; ln<4; ln++){ tg.beginPath(); tg.moveTo(30, 84+ln*14); tg.lineTo(98, 84+ln*14); tg.stroke(); }
  var titleTex = new THREE.CanvasTexture(tc);
  var titlePlate = new THREE.Mesh(new THREE.PlaneGeometry(W*0.78, L*0.7),
    new THREE.MeshStandardMaterial({ map: titleTex, transparent:true, roughness:0.7 }));
  titlePlate.rotation.x = -Math.PI/2;
  titlePlate.position.set(0, 0.076, 0);
  nb.add(titlePlate);
  // a folded sticky note poking from between the pages
  var sticky = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.004, 0.1),
    new THREE.MeshStandardMaterial({ color:0xe8d98a, roughness:0.9 }));
  sticky.position.set(0.05, 0.03, -L/2 - 0.03); sticky.rotation.y = 0.3; nb.add(sticky);
  // elastic anchor loop on the back edge
  var anchor = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.05),
    new THREE.MeshStandardMaterial({ color:0x1c1c1c, roughness:0.6 }));
  anchor.position.set(-W/2 + 0.01, 0.03, 0.18); nb.add(anchor);

  // a nice PEN resting diagonally ON the closed cover
  var pen = new THREE.Group();
  pen.position.set(-0.02, 0.078, 0.02);
  pen.rotation.set(0, 0.55, 0.02);
  var gold = new THREE.MeshStandardMaterial({ color:0xd8c48a, roughness:0.25, metalness:0.8 });
  var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.30, 16),
    new THREE.MeshStandardMaterial({ color:0x1b2430, roughness:0.3, metalness:0.35 }));
  barrel.rotation.z = Math.PI/2; barrel.castShadow = true; pen.add(barrel);
  var cone = new THREE.Mesh(new THREE.ConeGeometry(0.0095, 0.05, 14), gold);
  cone.rotation.z = -Math.PI/2; cone.position.x = -0.175; pen.add(cone);
  var nibTip = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.02, 10), gold);
  nibTip.rotation.z = -Math.PI/2; nibTip.position.x = -0.205; pen.add(nibTip);
  var capEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.06, 16), gold);
  capEnd.rotation.z = Math.PI/2; capEnd.position.x = 0.135; pen.add(capEnd);
  var clip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.01), gold);
  clip.position.set(0.12, 0.012, 0); pen.add(clip);
  nb.add(pen);

  furniture.add(nb);
})();

// desk CHAIR — rebuildable, 6 styles + colour
var chairGroup = new THREE.Group(); furniture.add(chairGroup);
var chairCollider = null;
function buildChair(styleIdx, colHex){
  while(chairGroup.children.length) chairGroup.remove(chairGroup.children[0]);
  if(chairCollider){ var ci = colliders.indexOf(chairCollider); if(ci>=0) colliders.splice(ci,1); chairCollider=null; }
  var cx = DESKX, cz = -HALF_Z + 1.85;
  var col = (colHex!=null) ? colHex : EDIT_ITEMS.chair.styles[styleIdx].color;
  var pad = mat(col, 0.8);
  var frame = mat(0x1e1e24, 0.45, 0.2);
  var wood = M.wood;
  function b(x,y,z,sx,sy,sz,m,rx){
    var me=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), m||pad);
    me.position.set(x,y,z); if(rx) me.rotation.x=rx; me.castShadow=true; me.receiveShadow=true;
    chairGroup.add(me); return me;
  }
  function starBase(){
    b(cx,0.32,cz,0.09,0.4,0.09,frame);
    for(var s=0;s<5;s++){
      var a=s/5*Math.PI*2;
      var leg=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.05,0.09),frame);
      leg.position.set(cx+Math.cos(a)*0.17,0.09,cz+Math.sin(a)*0.17);
      leg.rotation.y=-a; leg.castShadow=true; chairGroup.add(leg);
      var w=new THREE.Mesh(new THREE.SphereGeometry(0.05,8,8),frame);
      w.position.set(cx+Math.cos(a)*0.34,0.05,cz+Math.sin(a)*0.34); chairGroup.add(w);
    }
  }
  if(styleIdx===0){ // ergonomic mesh (original)
    b(cx,0.62,cz,0.72,0.12,0.68);
    b(cx,0.55,cz,0.62,0.06,0.58,frame);
    b(cx,1.15,cz+0.34,0.66,0.95,0.12,pad,-0.12);
    b(cx,0.85,cz+0.3,0.5,0.3,0.1);
    b(cx,1.66,cz+0.36,0.4,0.2,0.1,pad,-0.12);
    b(cx-0.42,0.86,cz,0.1,0.06,0.4,frame); b(cx+0.42,0.86,cz,0.1,0.06,0.4,frame);
    b(cx-0.42,0.74,cz+0.02,0.06,0.2,0.06,frame); b(cx+0.42,0.74,cz+0.02,0.06,0.2,0.06,frame);
    starBase();
  } else if(styleIdx===1){ // executive leather — tall padded, wings
    b(cx,0.64,cz,0.8,0.2,0.74);
    b(cx,1.2,cz+0.36,0.78,1.1,0.2,pad,-0.14);
    b(cx-0.36,1.2,cz+0.28,0.1,1.0,0.34,pad,-0.14);
    b(cx+0.36,1.2,cz+0.28,0.1,1.0,0.34,pad,-0.14);
    b(cx-0.44,0.9,cz,0.12,0.1,0.44,pad); b(cx+0.44,0.9,cz,0.12,0.1,0.44,pad);
    b(cx-0.44,0.78,cz,0.08,0.24,0.08,frame); b(cx+0.44,0.78,cz,0.08,0.24,0.08,frame);
    starBase();
  } else if(styleIdx===2){ // gaming — racing bucket, RGB edges
    b(cx,0.64,cz,0.78,0.16,0.72);
    b(cx-0.34,0.7,cz,0.12,0.14,0.7,frame); b(cx+0.34,0.7,cz,0.12,0.14,0.7,frame);
    b(cx,1.28,cz+0.34,0.66,1.3,0.16,pad,-0.12);
    b(cx-0.3,1.28,cz+0.3,0.12,1.2,0.3,frame,-0.12); b(cx+0.3,1.28,cz+0.3,0.12,1.2,0.3,frame,-0.12);
    var rgb=new THREE.MeshStandardMaterial({color:0x111,emissive:0x2b6bff,emissiveIntensity:1.4});
    b(cx,1.9,cz+0.3,0.44,0.16,0.14,pad,-0.12); // headrest
    b(cx-0.31,1.28,cz+0.16,0.03,1.2,0.04,rgb,-0.12); b(cx+0.31,1.28,cz+0.16,0.03,1.2,0.04,rgb,-0.12);
    b(cx-0.42,0.94,cz,0.1,0.1,0.4,frame); b(cx+0.42,0.94,cz,0.1,0.1,0.4,frame);
    b(cx-0.42,0.8,cz,0.07,0.24,0.07,frame); b(cx+0.42,0.8,cz,0.07,0.24,0.07,frame);
    starBase();
  } else if(styleIdx===3){ // wooden captain's chair — spindles, no wheels
    b(cx,0.6,cz,0.7,0.1,0.66,wood);
    for(var sp=0;sp<6;sp++){
      var px=cx-0.3+sp*0.12;
      var sd=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.7,8),wood);
      sd.position.set(px,1.0,cz+0.32); chairGroup.add(sd);
    }
    b(cx,1.36,cz+0.32,0.7,0.1,0.08,wood);
    b(cx,1.0,cz+0.3,0.62,0.12,0.06,pad); // lumbar cushion
    [[-0.3,-0.28],[-0.3,0.28],[0.3,-0.28],[0.3,0.28]].forEach(function(p){
      var l=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.028,0.6,8),wood);
      l.position.set(cx+p[0],0.3,cz+p[1]); l.castShadow=true; chairGroup.add(l);
    });
  } else if(styleIdx===4){ // velvet tub — solid rounded shell, low arms wrap around
    var vel = new THREE.MeshStandardMaterial({ color:col, roughness:0.6, metalness:0.03 });
    // seat cushion
    var cush=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.4,0.2,20),vel);
    cush.position.set(cx,0.66,cz); cush.castShadow=true; chairGroup.add(cush);
    // solid curved back+arm band (a thick torus-ish wall, closed) — open side faces −Z, toward the desk
    for(var seg=0; seg<14; seg++){
      var a0raw = -Math.PI*0.78 + seg*(Math.PI*1.56/13);
      var a0 = a0raw + Math.PI/2;   // rotate the whole band so the backrest bulges toward +Z, gap toward −Z
      var bx = cx + Math.cos(a0)*0.5, bz = cz + Math.sin(a0)*0.5;
      var h = 0.5 + Math.max(0, Math.cos(a0raw))*0.55;   // taller at the back (+Z side)
      var segM=new THREE.Mesh(new THREE.BoxGeometry(0.16,h,0.2),vel);
      segM.position.set(bx, 0.55+h/2, bz); segM.rotation.y = -a0; segM.castShadow=true;
      chairGroup.add(segM);
    }
    b(cx,0.5,cz,0.86,0.18,0.86,vel);      // base block
    [[-0.3,-0.3],[0.3,-0.3],[-0.3,0.3],[0.3,0.3]].forEach(function(p){
      var l=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.025,0.42,10),
        new THREE.MeshStandardMaterial({color:0xb98a4a,metalness:0.7,roughness:0.3}));
      l.position.set(cx+p[0],0.25,cz+p[1]); l.castShadow=true; chairGroup.add(l);
    });
  } else if(styleIdx===5){ // minimalist stool — backless, 3 legs
    var seat=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.1,20), pad);
    seat.position.set(cx,0.62,cz); seat.castShadow=true; chairGroup.add(seat);
    for(var t=0;t<3;t++){
      var a=t/3*Math.PI*2+0.4;
      var l=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.02,0.62,8),wood);
      l.position.set(cx+Math.cos(a)*0.24,0.3,cz+Math.sin(a)*0.24);
      l.rotation.z=Math.cos(a)*0.12; l.rotation.x=-Math.sin(a)*0.12; l.castShadow=true;
      chairGroup.add(l);
    }
  } else if(styleIdx===6){ // wingchair — classic high padded back + wings + turned legs
    var wf = new THREE.MeshStandardMaterial({ color:col, roughness:0.7 });
    b(cx,0.6,cz,0.86,0.22,0.82,wf);
    b(cx,0.72,cz,0.7,0.14,0.66,wf);                    // seat cushion
    b(cx,1.28,cz+0.36,0.82,1.4,0.22,wf,-0.08);         // tall back
    b(cx-0.42,1.15,cz+0.14,0.16,1.0,0.5,wf,-0.05);     // left wing
    b(cx+0.42,1.15,cz+0.14,0.16,1.0,0.5,wf,-0.05);     // right wing
    b(cx-0.44,0.86,cz,0.12,0.44,0.7,wf);               // rolled arm L
    b(cx+0.44,0.86,cz,0.12,0.44,0.7,wf);               // rolled arm R
    [[-0.34,-0.3],[0.34,-0.3],[-0.34,0.3],[0.34,0.3]].forEach(function(p){
      var l=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.035,0.46,10),wood);
      l.position.set(cx+p[0],0.24,cz+p[1]); l.castShadow=true; chairGroup.add(l);
    });
  } else { // throne — heavy carved wood frame, padded seat & back panel
    var carv = mat((col>>1)&0x7f7f7f | 0x201810, 0.5);
    var seatMat = mat(col, 0.6);
    b(cx,0.66,cz,0.9,0.16,0.86,seatMat);
    b(cx,1.35,cz+0.38,0.86,1.5,0.14,seatMat);          // padded back panel
    // frame
    b(cx,0.5,cz,1.0,0.2,0.96,carv);                    // base
    [-1,1].forEach(function(sgn){
      var post=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.08,2.3,12),carv);
      post.position.set(cx+sgn*0.5,1.2,cz+0.42); post.castShadow=true; chairGroup.add(post);
      var fin=new THREE.Mesh(new THREE.SphereGeometry(0.11,14,12),carv);
      fin.position.set(cx+sgn*0.5,2.35,cz+0.42); chairGroup.add(fin);
      b(cx+sgn*0.5,0.9,cz,0.12,0.1,0.8,carv);          // arm
      b(cx+sgn*0.62,0.62,cz+0.3,0.1,0.5,0.1,carv);     // front arm post
    });
    b(cx,2.15,cz+0.42,1.1,0.16,0.16,carv);             // crown rail
    [[-0.4,-0.4],[0.4,-0.4]].forEach(function(p){
      var l=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.5,0.12),carv);
      l.position.set(cx+p[0],0.25,cz+p[1]); l.castShadow=true; chairGroup.add(l);
    });
  }
  chairCollider = { minX:cx-0.5, maxX:cx+0.5, minZ:cz-0.5, maxZ:cz+0.5 };
  colliders.push(chairCollider);
}

/* ---- BED on the left wall — layered like a made bed ---- */
var BEDZ = 2.4, BEDX = -HALF_X + 1.95;
var BED_W = 3.5;    // along X (into room), = bed length
var BED_D = 2.35;   // along Z (along the wall), = bed width
var HEADX = -HALF_X + 0.32;

// wooden frame + 4 short legs
box(BEDX, 0.28, BEDZ, BED_W, 0.24, BED_D, M.wood, true);
[[-1.6,-1.0],[-1.6,1.0],[1.6,-1.0],[1.6,1.0]].forEach(function(p){
  box(BEDX + p[0], 0.09, BEDZ + p[1], 0.12, 0.18, 0.12, M.wood);
});
// mattress (static)
box(BEDX + 0.05, 0.46, BEDZ, BED_W - 0.12, 0.2, BED_D - 0.12, mat(0xf3ede2, 0.95));
box(BEDX + 0.05, 0.55, BEDZ, BED_W - 0.06, 0.06, BED_D - 0.02, mat(0xe9e2d4, 0.95));

// ---- BEDDING + HEADBOARD — rebuildable, 6 styles + colour ----
var bedGroup = new THREE.Group(); furniture.add(bedGroup);
function bedTex(styleIdx, col){
  var c = document.createElement('canvas'); c.width = c.height = 128;
  var g = c.getContext('2d');
  var base = '#' + (col>>>0).toString(16).padStart(6,'0');
  var lt = 'rgba(255,255,255,0.16)', dk = 'rgba(0,0,0,0.14)';
  g.fillStyle = base; g.fillRect(0,0,128,128);
  if(styleIdx===3){ for(var s=0;s<128;s+=20){ g.fillStyle=(s/20)%2?lt:dk; g.fillRect(0,s,128,10);} } // stripes
  else if(styleIdx===2){ g.strokeStyle=lt; g.lineWidth=3;                                            // quilt grid
    for(var i=0;i<128;i+=24){ g.beginPath();g.moveTo(i,0);g.lineTo(i,128);g.stroke();
      g.beginPath();g.moveTo(0,i);g.lineTo(128,i);g.stroke(); } }
  else if(styleIdx===5){ g.fillStyle=lt;                                                             // boho dots
    for(var k=0;k<40;k++){ g.beginPath();g.arc(Math.random()*128,Math.random()*128,3,0,7);g.fill(); } }
  return new THREE.CanvasTexture(c);
}
function buildBed(styleIdx, colHex){
  while(bedGroup.children.length) bedGroup.remove(bedGroup.children[0]);
  var col = (colHex!=null) ? colHex : EDIT_ITEMS.bed.styles[styleIdx].color;
  var cuffCol = (col>>1)&0x7f7f7f | 0x101010;
  function b(x,y,z,sx,sy,sz,m){
    var me=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), m);
    me.position.set(x,y,z); me.castShadow=true; me.receiveShadow=true; bedGroup.add(me); return me;
  }
  function cylX(x,y,z,r,len,m){ // a cylinder lying along Z (across the bed)
    var me=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,16), m);
    me.rotation.x=Math.PI/2; me.position.set(x,y,z); me.castShadow=true; bedGroup.add(me); return me;
  }
  function post(x,z,h,r,m,topY){
    var me=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.1,h,12), m);
    me.position.set(x, (topY!=null?topY:h/2), z); me.castShadow=true; bedGroup.add(me); return me;
  }
  var patterned = (styleIdx===2||styleIdx===3||styleIdx===5);
  var duvetMat = patterned
    ? new THREE.MeshStandardMaterial({ map: bedTex(styleIdx,col), roughness:1 })
    : mat(col, styleIdx===4?0.55:1);

  // ---------- 8 genuinely different headboards ----------
  if(styleIdx===0){ // 0 Tufted — plush low upholstered panel, diamond buttons, NO protruding bits
    var uh = mat(col, 0.8);
    b(HEADX+0.02, 0.95, BEDZ, 0.16, 1.25, BED_D, uh);              // flat padded panel, modest height
    // diamond button grid, flush to the surface
    for(var r0=0;r0<3;r0++) for(var c0=-2;c0<=2;c0++){
      var zz = BEDZ + c0*(BED_D/5) + (r0%2?BED_D/10:0);
      b(HEADX+0.10, 0.7+r0*0.32, zz, 0.03, 0.03, 0.03, mat((col>>1)&0x7f7f7f,0.85));
    }
  } else if(styleIdx===1){ // 1 Wingback — modest height, with side wings that curve forward
    var wb = mat(col, 0.85);
    b(HEADX+0.02, 1.02, BEDZ, 0.18, 1.45, BED_D-0.02, wb);          // main panel
    [-1,1].forEach(function(s){
      b(HEADX+0.22, 1.02, BEDZ + s*(BED_D/2-0.14), 0.5, 1.45, 0.22, wb);     // wing
      b(HEADX+0.46, 1.02, BEDZ + s*(BED_D/2-0.26), 0.12, 1.45, 0.5, wb);     // wing return
    });
    cylX(HEADX+0.04, 1.76, BEDZ, 0.1, BED_D, wb);                  // soft rolled crown
  } else if(styleIdx===2){ // 2 Wood slat — mid-height horizontal planks, warm oak, airy
    var pl = mat(col, 0.55), plD = mat((col>>1)&0x7f7f7f,0.6);
    [-1,1].forEach(function(s){ post(HEADX+0.04, BEDZ+s*(BED_D/2-0.06), 1.35, 0.06, pl); });
    for(var w=0;w<5;w++) b(HEADX+0.06, 0.55+w*0.19, BEDZ, 0.1, 0.14, BED_D-0.18, (w%2?plD:pl));
  } else if(styleIdx===3){ // 3 Rattan — arched cane panel in a bentwood frame
    var ratF = mat(0x8a6d48, 0.7), cane = mat(0xc7a874, 0.85);
    // arch: stack of narrowing bars
    for(var a=0;a<7;a++){
      var wdt = (BED_D-0.1) * (1 - Math.pow(a/8, 2)*0.35);
      b(HEADX+0.05, 0.6+a*0.2, BEDZ, 0.12, 0.16, wdt, a>=6?ratF:cane);
    }
    [-1,1].forEach(function(s){ post(HEADX+0.05, BEDZ+s*(BED_D/2-0.05), 1.9, 0.055, ratF); });
  } else if(styleIdx===4){ // 4 Velvet — clean single curved panel, subtle sheen, nothing sticking out
    var vel = new THREE.MeshStandardMaterial({ color:col, roughness:0.5, metalness:0.05 });
    // one gently domed panel built from 3 shallow segments — reads curved, no floating cylinder
    b(HEADX+0.04, 1.15, BEDZ, 0.2, 1.5, BED_D-0.5, vel);                    // centre, tallest
    [-1,1].forEach(function(s){
      var seg=b(HEADX+0.06, 1.08, BEDZ + s*(BED_D/2-0.12), 0.18, 1.36, 0.28, vel);
      seg.rotation.x = s*0.12;
    });
    // vertical channel seams pressed INTO the face (thin, flush)
    for(var vt=-2;vt<=2;vt++) b(HEADX+0.14, 1.12, BEDZ+vt*(BED_D/6), 0.015, 1.2, 0.02, mat((col>>1)&0x7f7f7f,0.7));
  } else if(styleIdx===5){ // 5 Boho — woven hanging with a dowel + soft fringe, low
    var dowel = mat(0x8a6d48,0.7);
    cylX(HEADX+0.06, 1.5, BEDZ, 0.05, BED_D+0.1, dowel);                    // hanging dowel
    b(HEADX+0.05, 1.05, BEDZ, 0.06, 0.8, BED_D-0.2, mat(0xe8dfce,0.95));    // woven panel
    for(var f=0;f<16;f++){
      var fz = BEDZ - (BED_D-0.2)/2 + f*((BED_D-0.2)/15);
      b(HEADX+0.06, 0.5, fz, 0.05, 0.45, 0.035, mat(f%2?0xd8cdb6:0xe8dfce,1));  // fringe strands
    }
  } else if(styleIdx===6){ // 6 Carved oak — panelled, low crown moulding, small finials (NOT towering)
    var oak = mat(col, 0.45);
    b(HEADX+0.04, 1.05, BEDZ, 0.22, 1.5, BED_D, oak);                       // main panel, moderate height
    b(HEADX+0.02, 1.82, BEDZ, 0.3, 0.14, BED_D+0.14, oak);                  // crown moulding
    // two recessed panels on the face
    [-1,1].forEach(function(s){ b(HEADX+0.16, 1.0, BEDZ+s*(BED_D/4), 0.03, 0.9, BED_D/3, mat((col>>1)&0x7f7f7f,0.5)); });
    [-1,1].forEach(function(s){
      post(HEADX+0.04, BEDZ+s*(BED_D/2), 1.7, 0.08, oak);
      var fin=new THREE.Mesh(new THREE.SphereGeometry(0.1,14,12),oak);
      fin.position.set(HEADX+0.04, 1.78, BEDZ+s*(BED_D/2)); bedGroup.add(fin);
    });
  } else { // 7 Four-poster — slim tall posts + a light canopy frame (only this one is tall)
    var fp = mat(col, 0.5);
    b(HEADX+0.04, 1.0, BEDZ, 0.16, 1.4, BED_D-0.1, fp);                     // headboard panel (low)
    var FX = BEDX + BED_W/2 - 0.2;
    [[HEADX+0.06,-1],[HEADX+0.06,1],[FX,-1],[FX,1]].forEach(function(p){
      post(p[0], BEDZ+p[1]*(BED_D/2-0.08), 2.9, 0.06, fp);
      var fin=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.2,12),fp);
      fin.position.set(p[0], 2.95, BEDZ+p[1]*(BED_D/2-0.08)); bedGroup.add(fin);
    });
    var midX=(HEADX+FX)/2;
    b(midX, 2.88, BEDZ-(BED_D/2-0.08), BED_W-0.5, 0.06, 0.06, fp);
    b(midX, 2.88, BEDZ+(BED_D/2-0.08), BED_W-0.5, 0.06, 0.06, fp);
    b(HEADX+0.06, 2.88, BEDZ, 0.06, 0.06, BED_D-0.14, fp);
    b(FX, 2.88, BEDZ, 0.06, 0.06, BED_D-0.14, fp);
  }

  // ---------- bedding — a little different per style ----------
  var duvetLen = BED_W - 0.9;
  b(BEDX+0.35, 0.62, BEDZ, duvetLen, 0.17, BED_D-0.04, duvetMat);           // duvet body
  if(!patterned) b(BEDX+0.35, 0.71, BEDZ, duvetLen, 0.015, BED_D-0.04, mat((col|0x111111),1)); // sheen
  b(HEADX+1.0, 0.69, BEDZ, 0.5, 0.09, BED_D-0.04, mat(cuffCol,1));          // folded top cuff
  b(BEDX+1.5, 0.63, BEDZ, 0.16, 0.2, BED_D-0.04, duvetMat);                 // foot roll
  // a throw blanket draped over the foot — colour/position varies by style
  var throwCol = (styleIdx===5) ? 0xcbb89a : (styleIdx===4) ? ((col>>2)|0x403040) : ((col>>2)|0x805030);
  b(BEDX+1.15, 0.60, BEDZ, 0.55, 0.14, BED_D+0.15, mat(throwCol,1));
  b(BEDX+1.15, 0.68, BEDZ, 0.5, 0.02, BED_D+0.15, mat(throwCol&0xefefef,1));

  // pillows
  function pillow(px,w,d,h,pc,tilt){
    var p=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(pc,0.95));
    p.position.set(px,0.62+h/2,BEDZ); p.rotation.z=tilt||0; p.castShadow=true; bedGroup.add(p);
    var cr=new THREE.Mesh(new THREE.BoxGeometry(w*0.7,0.03,d*0.6),mat(pc,0.9));
    cr.position.set(px,0.62+h+0.005,BEDZ); cr.rotation.z=tilt||0; bedGroup.add(cr);
  }
  pillow(HEADX+0.44, 0.5, BED_D-0.7, 0.26, 0xf6f1e7, 0.12);
  pillow(HEADX+0.44, 0.5, BED_D-0.7, 0.24, 0xf1ece0, -0.1);
  pillow(HEADX+0.82, 0.4, BED_D-1.0, 0.22, (col|0xb8b8b8), 0);              // accent, tinted
}

/* ---- SIDE TABLE + LAMP — set well clear of the couch's right arm ---- */
var SIDEX = TVX + 2.35;
box(SIDEX, 0.55, COUCHZ, 0.8, 0.14, 0.8, M.woodL, true);
box(SIDEX, 1.3, COUCHZ, 0.44, 0.48, 0.44,
  new THREE.MeshStandardMaterial({ color:0xffcf9e, emissive:0xff9a4a, emissiveIntensity:1.1, roughness:0.6 }));
box(SIDEX, 0.9, COUCHZ, 0.08, 0.6, 0.08, M.dark);
var lampLight = new THREE.PointLight(0xffb06a, 1.7, 7, 2);
lampLight.position.set(SIDEX, 1.5, COUCHZ); lampLight.castShadow = true; furniture.add(lampLight);

/* ---- PLANT front-right corner ---- */
box(HALF_X-0.8, 0.45, HALF_Z-0.8, 0.5, 0.9, 0.5, M.wood, true);
var foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), M.plant);
foliage.position.set(HALF_X-0.8, 1.25, HALF_Z-0.8); foliage.castShadow = true; furniture.add(foliage);

/* ---- POSTERS: quotes / art / motivation, on the back wall over the desk ---- */
function posterTex(kind){
  var c = document.createElement('canvas'); c.width = 300; c.height = 400;
  var g = c.getContext('2d');
  if(kind === 'quote1'){
    g.fillStyle = '#f2ece0'; g.fillRect(0,0,300,400);
    g.fillStyle = '#2a2a30'; g.textAlign = 'center';
    g.font = '700 30px Georgia, serif';
    g.fillText('breathe.', 150, 150);
    g.fillText("you're", 150, 195);
    g.fillText('doing okay.', 150, 240);
    g.strokeStyle = '#c9a26a'; g.lineWidth = 3; g.strokeRect(20,20,260,360);
  } else if(kind === 'quote2'){
    g.fillStyle = '#1c2230'; g.fillRect(0,0,300,400);
    g.fillStyle = '#e9e2d2'; g.textAlign = 'center';
    g.font = '600 24px Georgia, serif';
    g.fillText('one', 150, 150);
    g.fillText('day', 150, 185);
    g.fillText('at a time', 150, 220);
    g.fillStyle = '#c98a6a';
    g.fillRect(110, 250, 80, 4);
  } else { // abstract art
    var cols = ['#c98a6a','#6d5aa8','#4a6f8a','#7a8a3c','#e9e2d2'];
    for(var i=0;i<6;i++){
      g.fillStyle = cols[i % cols.length];
      g.fillRect(Math.random()*200, Math.random()*300, 40+Math.random()*120, 30+Math.random()*90);
    }
    g.globalAlpha = 0.15; g.fillStyle = '#000';
    g.fillRect(0,0,300,400);
  }
  return new THREE.CanvasTexture(c);
}
function poster(x, y, z, w, h, kind, framed){
  if(framed) box(x, y, z+0.02, w+0.1, h+0.1, 0.04, mat(0x1a1a1a, 0.5));
  var p = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: posterTex(kind), roughness:0.85 }));
  p.position.set(x, y, z + 0.045);
  furniture.add(p);
}
poster(-3.7, 3.35, -HALF_Z+0.06, 1.1, 1.5, 'quote1', true);
poster(-2.3, 3.55, -HALF_Z+0.06, 0.95, 1.3, 'art', false);
poster(-1.1, 3.35, -HALF_Z+0.06, 0.9, 1.25, 'quote2', true);

/* ---- ONE clean shelf above the TV: a tidy run of books + a single plant ---- */
var SHZ = -HALF_Z + 0.28;
box(TVX, 3.5, SHZ, 2.8, 0.08, 0.34, M.woodL);                       // plank
box(TVX - 1.2, 3.4, SHZ, 0.06, 0.14, 0.28, M.wood);                 // bracket
box(TVX + 1.2, 3.4, SHZ, 0.06, 0.14, 0.28, M.wood);                 // bracket
for(var i2=0;i2<9;i2++){
  var bh2 = 0.42 + (i2 % 3) * 0.05;
  titledBook(TVX - 1.15 + i2*0.24, 3.54 + 0.04 + bh2/2, SHZ, 'x', bh2);
}
// a single small plant as the one accent
box(TVX + 1.05, 3.62, SHZ, 0.2, 0.22, 0.2, mat(0x9a7d63, 0.8));
var shelfLeaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 1), M.plant);
shelfLeaf.position.set(TVX + 1.05, 3.82, SHZ); shelfLeaf.castShadow = true; furniture.add(shelfLeaf);

/* ---- soft overhead room light (invisible source, no fixture) ---- */
var roomLight = new THREE.PointLight(0xffe9cf, 1.0, 16, 2);
roomLight.position.set(TVX, WALL_H-0.6, 1.0); furniture.add(roomLight);

/* ---- WALL CLOCK above the bed — a real ticking clock, mounted on the LEFT wall ---- */
var wallHourHand, wallMinHand, wallSecHand;
(function wallClock(){
  // left wall inner face is at x = -HALF_X + 0.15; hang the clock just in front of it
  var cx = -HALF_X + 0.18, cy = 3.45, cz = BEDZ;
  var clock = new THREE.Group();
  clock.position.set(cx, cy, cz);
  clock.rotation.y = Math.PI / 2;     // face +X (into the room)
  clock.renderOrder = 1;

  var rim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.07, 40),
    new THREE.MeshStandardMaterial({ color:0x1e1e24, roughness:0.5, metalness:0.2 }));
  rim.rotation.x = Math.PI / 2; clock.add(rim);
  var face = new THREE.Mesh(new THREE.CircleGeometry(0.33, 40),
    new THREE.MeshStandardMaterial({ color:0xf8f3e8, roughness:0.55 }));
  face.position.z = 0.037; clock.add(face);

  var tickMat = new THREE.MeshStandardMaterial({ color:0x1e1e24, roughness:0.5 });
  for(var t=0;t<12;t++){
    var a = t/12 * Math.PI*2;
    var big = (t % 3 === 0);
    var tk = new THREE.Mesh(new THREE.BoxGeometry(big?0.03:0.016, big?0.075:0.045, 0.012), tickMat);
    tk.position.set(Math.sin(a)*0.26, Math.cos(a)*0.26, 0.043);
    tk.rotation.z = -a; clock.add(tk);
  }
  var handMat = new THREE.MeshStandardMaterial({ color:0x141414, roughness:0.4 });
  var redMat  = new THREE.MeshStandardMaterial({ color:0xc0392b, roughness:0.5 });
  // pivot at centre; bar points +Y (12 o'clock) and we rotate on Z
  function hand(len, w, m, z){
    var pv = new THREE.Group(); pv.position.z = z;
    var bar = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.01), m);
    bar.position.y = len/2 - 0.03;
    pv.add(bar); clock.add(pv); return pv;
  }
  wallHourHand = hand(0.16, 0.028, handMat, 0.05);
  wallMinHand  = hand(0.25, 0.02, handMat, 0.058);
  wallSecHand  = hand(0.27, 0.008, redMat, 0.066);
  var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 12), redMat);
  hub.rotation.x = Math.PI/2; hub.position.z = 0.07; clock.add(hub);

  clock.traverse(function(o){ if(o.isMesh){ o.castShadow = true; } });
  furniture.add(clock);
})();

/* ============================================================
   EDIT ROOM  — styles, colours, walls, neon, wall frames.  Saved per slot.
   ============================================================ */

// palette shared by every colour picker
var EDIT_PALETTE = [
  0xf3ece0, 0xe9e2d4, 0xd8cdb6, 0xc9a86a, 0xb98a4a, 0x8a5b3c,
  0x5a3c28, 0xc98a6a, 0xb85c4a, 0x8a3c3c, 0x6a2b2b, 0x9a5c74,
  0x6f4a6a, 0x7f6fa8, 0x5a4b8a, 0x4a6f8a, 0x35607a, 0x2f4a6a,
  0x4f6b46, 0x35503c, 0x6f7a34, 0x8a8f98, 0x4a4a54, 0x3a3a44,
  0x24242c, 0x1c1a20, 0xc9b98a, 0xd4af6a
];

// every editable item: label, apply-fn key, and 8 named styles (each a default colour).
// styles 6 & 7 are the "old classic days" set — carved wood, ornate, brass, heavy.
var EDIT_ITEMS = {
  bed:      { label:'Bed', apply:'buildBed', styles:[
    {name:'Tufted',    color:0x7f6fa8}, {name:'Wingback',  color:0x5b6f9a},
    {name:'Wood slat', color:0x8a9a6a}, {name:'Rattan',    color:0xc9a86a},
    {name:'Velvet',    color:0x6f4a6a}, {name:'Boho',      color:0xd8cdb6},
    {name:'Carved oak',color:0x6a4a30}, {name:'Four-poster',color:0x4a3220} ] },
  chair:    { label:'Chair', apply:'buildChair', styles:[
    {name:'Mesh',      color:0x33323c}, {name:'Executive', color:0x3a2a22},
    {name:'Gaming',    color:0x1e1e28}, {name:'Wooden',    color:0x8a6647},
    {name:'Velvet tub',color:0x6f4a6a}, {name:'Stool',     color:0xc98a6a},
    {name:'Wingchair', color:0x6a2b2b}, {name:'Throne',    color:0x4a3220} ] },
  couch:    { label:'Couch', apply:'buildCouch', styles:[
    {name:'Classic',   color:0x554a58}, {name:'Chesterfield',color:0x5a3c28},
    {name:'Sectional', color:0x4a6f8a}, {name:'Mid-century',color:0x7a8a3c},
    {name:'Cloud',     color:0xe4dcd0}, {name:'Futon',     color:0x4f5560},
    {name:'Camelback', color:0x6a2b2b}, {name:'Settee',    color:0x8a6a4a} ] },
  beanbag:  { label:'Bean bags', apply:'buildBeanbags', styles:[
    {name:'Scooped',   color:0x9a5636}, {name:'Pouffe',    color:0x4f6b46},
    {name:'Teardrop',  color:0x5b6f9a}, {name:'Rocker',    color:0x8a4b3c},
    {name:'Cushions',  color:0xc9a86a}, {name:'Giant pod', color:0x7f6fa8},
    {name:'Ottoman',   color:0x6a2b2b}, {name:'Floor sofa',color:0x8a6a4a} ] },
  table:    { label:'Coffee table', apply:'buildTable', styles:[
    {name:'Wood tier', color:0x8a6647}, {name:'Glass',     color:0xc9a86a},
    {name:'Live-edge', color:0x6d4b36}, {name:'Nested',    color:0x9a7350},
    {name:'Drum',      color:0x4f5560}, {name:'Industrial',color:0x3a3a44},
    {name:'Carved',    color:0x5a3c28}, {name:'Ornate',    color:0x4a3220} ] },
  rug:      { label:'Rug', apply:'buildRug', styles:[
    {name:'Solid',     color:0x5b5262}, {name:'Bordered',  color:0x8a4b3c},
    {name:'Trellis',   color:0x4a6f8a}, {name:'Striped',   color:0x6f7a34},
    {name:'Persian',   color:0x7a3c3c}, {name:'Shag',      color:0xc9a86a},
    {name:'Oriental',  color:0x6a2b2b}, {name:'Aubusson',  color:0x8a6a4a} ] },
  desk:     { label:'Desk', apply:'applyDesk', styles:[
    {name:'Oak',       color:0x9a7350}, {name:'Walnut',    color:0x5a3c28},
    {name:'Ash',       color:0xc9b28c}, {name:'Black',     color:0x26262e},
    {name:'Steel',     color:0x8a8f98}, {name:'Glass-black',color:0x14141a},
    {name:'Mahogany',  color:0x5a2f24}, {name:'Antique',   color:0x6a4a30} ] },
  notebook: { label:'Journal', apply:'applyNotebook', styles:[
    {name:'Kraft',     color:0x5a3a26}, {name:'Leather',   color:0x6a2b2b},
    {name:'Linen',     color:0xd8cdb6}, {name:'Gold-edge', color:0x2a2a30},
    {name:'Forest',    color:0x35503c}, {name:'Chrome',    color:0x9aa0a8},
    {name:'Tooled',    color:0x4a2f1e}, {name:'Marbled',   color:0x7a5a3a} ] },
  tv:       { label:'TV', apply:'applyTV', styles:[
    {name:'Matte',     color:0x14141a}, {name:'Graphite',  color:0x2a2a30},
    {name:'Silver',    color:0x9aa0a8}, {name:'White',     color:0xe4e0d8},
    {name:'Brushed',   color:0x6a6f78}, {name:'Gloss',     color:0x0d0d10},
    {name:'Wood-frame',color:0x6a4a30}, {name:'Brass trim',color:0xb98a4a} ] },
  pc:       { label:'PC / keys', apply:'applyPC', styles:[
    {name:'Green',  color:0x141418, glow:0x2fbf5a}, {name:'Blue',  color:0x141418, glow:0x2b6bff},
    {name:'Purple', color:0x161620, glow:0x9a4bff}, {name:'Silver',color:0x9aa0a8, glow:0x8fdfff},
    {name:'Amber',  color:0x18140f, glow:0xff9a3a}, {name:'Pink',  color:0x1a1016, glow:0xff5aa0},
    {name:'Warm white',color:0x1a1712, glow:0xffd9a8}, {name:'Ice', color:0x101418, glow:0xbfe6ff} ] },
  wall:     { label:'Walls', apply:'applyWalls', styles:[
    {name:'Plain',     color:0x413a4c}, {name:'Panelled',  color:0x6a5a4a},
    {name:'Brick',     color:0x8a5b48}, {name:'Stripe',    color:0x5b5266},
    {name:'Concrete',  color:0x6a6a70}, {name:'Damask',    color:0x4a3a52},
    {name:'Wainscot',  color:0x8a7a68}, {name:'Floral',    color:0x7a6a5a} ] },
  floor:    { label:'Floor', apply:'applyFloor', styles:[
    {name:'Warm wood', color:0x8a6045}, {name:'Dark wood', color:0x4a3325},
    {name:'Grey wash', color:0x8a8a90}, {name:'Herringbone',color:0x9a7350},
    {name:'Concrete',  color:0x767680}, {name:'Carpet',    color:0x6a5f66},
    {name:'Parquet',   color:0x8a5f3a}, {name:'Chequer',   color:0x6a5a4a} ] },
  window:   { label:'Window view', apply:'applyWindow', styles:[
    {name:'Night sky', color:0x111c30}, {name:'Ocean & palms',color:0x8fd0e8},
    {name:'City',      color:0x2a3a5c}, {name:'Neon city', color:0x150826},
    {name:'Forest',    color:0x8fbf7a}, {name:'Mountains', color:0xe69a7a},
    {name:'Blossoms',  color:0xbfe0e8}, {name:'Aurora',    color:0x0a1330} ] }
};

// ---------- WALLS ---------- (0 plain,1 panelled,2 brick,3 stripe,4 concrete,5 damask,6 wainscot,7 floral)
function wallTex(styleIdx, col){
  var c = document.createElement('canvas'); c.width = c.height = 256;
  var g = c.getContext('2d');
  var base = '#' + (col>>>0).toString(16).padStart(6,'0');
  var lt = 'rgba(255,255,255,0.10)', dk = 'rgba(0,0,0,0.16)';
  g.fillStyle = base; g.fillRect(0,0,256,256);
  if(styleIdx===1){ // panelled — moulded rectangles
    g.strokeStyle = lt; g.lineWidth = 5;
    for(var x=18;x<256;x+=76) for(var y=18;y<256;y+=94){ g.strokeRect(x,y,58,74);
      g.strokeStyle=dk; g.strokeRect(x+5,y+5,48,64); g.strokeStyle=lt; }
  } else if(styleIdx===2){ // brick
    for(var r=0;r<9;r++){ var off=(r%2)*26;
      for(var b=-1;b<6;b++){ g.fillStyle = (b+r)%3? dk:lt; g.fillRect(off+b*52,r*30,48,26); } }
  } else if(styleIdx===3){ // vertical stripe
    for(var s=0;s<256;s+=40){ g.fillStyle=(s/40)%2?lt:dk; g.fillRect(s,0,20,256); }
  } else if(styleIdx===4){ // concrete speckle
    for(var k=0;k<1400;k++){ g.fillStyle=Math.random()<0.5?lt:dk;
      g.fillRect(Math.random()*256,Math.random()*256,2,2); }
  } else if(styleIdx===5){ // damask — repeating ogee motif
    g.strokeStyle=lt; g.lineWidth=3;
    for(var i=0;i<4;i++) for(var j=0;j<4;j++){
      var cx=i*64+32+(j%2?32:0), cy=j*64+32;
      g.beginPath(); g.moveTo(cx,cy-22);
      g.bezierCurveTo(cx+20,cy-10,cx+20,cy+10,cx,cy+22);
      g.bezierCurveTo(cx-20,cy+10,cx-20,cy-10,cx,cy-22); g.stroke();
      g.beginPath(); g.arc(cx,cy,4,0,7); g.stroke();
    }
  } else if(styleIdx===6){ // wainscot — lower panelled dado + plain top + chair rail
    g.fillStyle=dk; g.fillRect(0,150,256,106);
    g.strokeStyle=lt; g.lineWidth=4;
    for(var wx=14;wx<256;wx+=60) g.strokeRect(wx,164,46,78);
    g.fillStyle=lt; g.fillRect(0,146,256,6);       // chair rail
  } else if(styleIdx===7){ // floral — scattered small blooms
    for(var f=0;f<40;f++){
      var fx=Math.random()*256, fy=Math.random()*256;
      g.fillStyle=Math.random()<0.5?lt:dk;
      for(var pt=0;pt<5;pt++){ var pa=pt/5*Math.PI*2;
        g.beginPath(); g.ellipse(fx+Math.cos(pa)*5,fy+Math.sin(pa)*5,3,6,pa,0,7); g.fill(); }
    }
  }
  var t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2,2);
  return t;
}
function applyWalls(styleIdx, colHex){
  var col = (colHex!=null) ? colHex : EDIT_ITEMS.wall.styles[styleIdx].color;
  var tex = (styleIdx===0) ? null : wallTex(styleIdx,col);
  [M.wall, M.wallB].forEach(function(m){
    m.color.setHex(col); m.map = tex; m.needsUpdate = true;
  });
}
// ---------- FLOOR ----------
function floorTex(styleIdx, col){
  var c = document.createElement('canvas'); c.width = c.height = 256;
  var g = c.getContext('2d');
  var base = '#' + (col>>>0).toString(16).padStart(6,'0');
  var lt = 'rgba(255,255,255,0.08)', dk = 'rgba(0,0,0,0.2)';
  g.fillStyle = base; g.fillRect(0,0,256,256);
  if(styleIdx===0||styleIdx===1){ // planks
    for(var y=0;y<256;y+=32){ g.strokeStyle=dk; g.lineWidth=2; g.beginPath();g.moveTo(0,y);g.lineTo(256,y);g.stroke();
      for(var x=(y/32%2)*64;x<256;x+=128){ g.beginPath();g.moveTo(x,y);g.lineTo(x,y+32);g.stroke(); } }
  } else if(styleIdx===3){ // herringbone
    g.strokeStyle=dk; g.lineWidth=2;
    for(var i=-256;i<256;i+=32){ g.beginPath();g.moveTo(i,0);g.lineTo(i+128,128);g.stroke();
      g.beginPath();g.moveTo(i,128);g.lineTo(i+128,0);g.stroke(); }
  } else if(styleIdx===4){ // concrete
    for(var k=0;k<1200;k++){ g.fillStyle=Math.random()<0.5?lt:dk;
      g.fillRect(Math.random()*256,Math.random()*256,2,2); }
  } else if(styleIdx===5){ // carpet weave
    for(var a=0;a<256;a+=6){ g.fillStyle=(a/6)%2?lt:dk; g.fillRect(a,0,3,256); g.fillRect(0,a,256,3); }
  } else if(styleIdx===2){ // grey wash planks
    for(var y2=0;y2<256;y2+=40){ g.strokeStyle=lt; g.lineWidth=3; g.beginPath();g.moveTo(0,y2);g.lineTo(256,y2);g.stroke(); }
  } else if(styleIdx===6){ // parquet — square blocks of alternating grain
    for(var px=0;px<256;px+=64) for(var py=0;py<256;py+=64){
      var horiz = ((px/64)+(py/64))%2===0;
      g.strokeStyle=dk; g.lineWidth=2;
      for(var ln=0;ln<64;ln+=10){
        g.beginPath();
        if(horiz){ g.moveTo(px,py+ln); g.lineTo(px+64,py+ln); }
        else { g.moveTo(px+ln,py); g.lineTo(px+ln,py+64); }
        g.stroke();
      }
      g.strokeStyle=lt; g.strokeRect(px,py,64,64);
    }
  } else if(styleIdx===7){ // chequer — two-tone tiles
    for(var cx2=0;cx2<256;cx2+=64) for(var cy2=0;cy2<256;cy2+=64){
      g.fillStyle = ((cx2/64)+(cy2/64))%2 ? lt : dk;
      g.fillRect(cx2,cy2,64,64);
    }
  }
  var t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3,3);
  return t;
}
function applyFloor(styleIdx, colHex){
  var col = (colHex!=null) ? colHex : EDIT_ITEMS.floor.styles[styleIdx].color;
  M.floor.color.setHex(col);
  M.floor.map = floorTex(styleIdx,col);
  M.floor.needsUpdate = true;
}

// ---------- NEON — multiple zones can be lit at once, each its own colour ----------
// zones: 0 ceiling glow, 1 behind TV, 2 under bed, 3 full outline, 4 desk, 5 doorway, 6 bookshelf
var NEON_PRESETS = [0x8a4bff, 0xff5aa0, 0x2fdcff, 0x39ff88, 0xffae3a, 0xff3b3b, 0xffffff, 0x3a6bff];
var NEON_MODES = ['Ceiling glow','Behind TV','Under bed','Wall outline','Over desk','Doorway','Bookshelf'];
var DOORWAY_NEON_IDX = NEON_MODES.indexOf('Doorway');   // removed from the UI; index kept so old saves stay in bounds
// runtime state: zones[i] = { on:bool, color:hex }
var neonZones = [];
for(var _nz=0;_nz<NEON_MODES.length;_nz++) neonZones.push({ on:false, color:0x8a4bff });

var neonGroup = new THREE.Group(); furniture.add(neonGroup);
// a pool of point-lights, two assigned per active zone
var neonLightPool = [];
for(var _nl=0;_nl<NEON_MODES.length*2;_nl++){
  var _pl = new THREE.PointLight(0x8a4bff, 0, 20, 2);
  neonLightPool.push(_pl); neonGroup.add(_pl);
}

function _neonZoneTubes(s, addTube){
  if(s===0){ // ceiling glow
    addTube(0, WALL_H-0.22, -HALF_Z+0.18, HALF_X*2-0.6, 0.08, 0.1);
    addTube(-HALF_X+0.18, WALL_H-0.22, 0, 0.1, 0.08, HALF_Z*2-0.6);
    return [[-2, WALL_H-0.5, -2],[2.5, WALL_H-0.5, 1.5]];
  } else if(s===1){ // behind TV
    addTube(TVX, TV_CY+0.95, -HALF_Z+0.18, 3.0, 0.08, 0.08);
    addTube(TVX, TV_CY-0.95, -HALF_Z+0.18, 3.0, 0.08, 0.08);
    addTube(TVX-1.55, TV_CY, -HALF_Z+0.18, 0.08, 1.9, 0.08);
    addTube(TVX+1.55, TV_CY, -HALF_Z+0.18, 0.08, 1.9, 0.08);
    return [[TVX-1, TV_CY, -HALF_Z+0.7],[TVX+1, TV_CY, -HALF_Z+0.7]];
  } else if(s===2){ // under bed
    addTube(BEDX, 0.12, BEDZ-BED_D/2+0.05, BED_W-0.3, 0.06, 0.06);
    addTube(BEDX, 0.12, BEDZ+BED_D/2-0.05, BED_W-0.3, 0.06, 0.06);
    addTube(BEDX+BED_W/2-0.05, 0.12, BEDZ, 0.06, 0.06, BED_D-0.1);
    return [[BEDX, 0.3, BEDZ],[BEDX-0.6, 0.3, BEDZ]];
  } else if(s===3){ // wall outline
    addTube(0, WALL_H-0.2, -HALF_Z+0.18, HALF_X*2-0.4, 0.09, 0.09);
    addTube(-HALF_X+0.18, WALL_H-0.2, 0, 0.09, 0.09, HALF_Z*2-0.4);
    addTube(-HALF_X+0.18, WALL_H/2, -HALF_Z+0.18, 0.09, WALL_H-0.6, 0.09);
    return [[-2.5, WALL_H-0.6, -2.5],[2.5, WALL_H-0.6, 2]];
  } else if(s===4){ // over desk
    addTube(DESKX, 2.2, -HALF_Z+0.2, 2.4, 0.07, 0.07);
    addTube(DESKX-1.15, 1.5, -HALF_Z+0.2, 0.07, 1.4, 0.07);
    addTube(DESKX+1.15, 1.5, -HALF_Z+0.2, 0.07, 1.4, 0.07);
    return [[DESKX, 1.7, -HALF_Z+0.7],[DESKX, 2.1, -HALF_Z+0.6]];
  } else if(s===5){ // doorway — vertical strips down the left wall front edge
    addTube(-HALF_X+0.18, WALL_H/2, HALF_Z-0.6, 0.08, WALL_H-0.5, 0.08);
    addTube(-HALF_X+0.6, WALL_H-0.25, HALF_Z-0.6, 0.9, 0.08, 0.08);
    return [[-HALF_X+0.8, 1.6, HALF_Z-0.9],[-HALF_X+0.8, 3.4, HALF_Z-0.9]];
  } else { // bookshelf accent — under the shelf on the right wall
    addTube(2.7, 3.05, -HALF_Z+0.2, 2.2, 0.06, 0.06);
    addTube(2.7, 2.35, -HALF_Z+0.2, 2.2, 0.06, 0.06);
    return [[2.7, 2.7, -HALF_Z+0.6],[3.4, 2.7, -HALF_Z+0.6]];
  }
}

function buildNeon(){
  for(var i=neonGroup.children.length-1;i>=0;i--){
    if(neonGroup.children[i].isMesh) neonGroup.remove(neonGroup.children[i]);
  }
  neonLightPool.forEach(function(l){ l.intensity = 0; });
  var lightIdx = 0;
  neonZones.forEach(function(z, s){
    if(!z.on) return;
    var glowMat = new THREE.MeshBasicMaterial({ color:z.color });
    function addTube(x,y,z2,sx,sy,sz){
      var m = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), glowMat);
      m.position.set(x,y,z2); neonGroup.add(m);
    }
    var lp = _neonZoneTubes(s, addTube);
    var inten = [1.7, 1.4];
    lp.forEach(function(pos, k){
      var L = neonLightPool[lightIdx++]; if(!L) return;
      L.position.set(pos[0], pos[1], pos[2]);
      L.color.setHex(z.color);
      L.intensity = inten[k] != null ? inten[k] : 1.4;
    });
  });
}
function anyNeonOn(){ return neonZones.some(function(z){ return z.on; }); }

// ---------- WALL FRAMES — art / quotes / poems / music, in a real frame ----------
var frameGroup = new THREE.Group(); furniture.add(frameGroup);
var placedFrames = [];   // [{ id }]
var FRAME_ART = [
  { id:'starry',  label:'Starry night', kind:'art' },
  { id:'waves',   label:'The wave',     kind:'art' },
  { id:'sun',     label:'Sun & field',  kind:'art' },
  { id:'mountains',label:'Blue ridge',  kind:'art' },
  { id:'q_breathe',label:'"breathe"',   kind:'quote' },
  { id:'q_okay',  label:'"you\'re okay"',kind:'quote' },
  { id:'q_home',  label:'"you are home"',kind:'quote' },
  { id:'poem_room',label:'a small poem', kind:'poem' },
  { id:'poem_light',label:'on light',    kind:'poem' },
  { id:'music_note',label:'a song lyric',kind:'music' },
  { id:'music_vinyl',label:'now playing',kind:'music' },
  { id:'photo',   label:'an old photo',  kind:'art' }
];
var FRAME_TEX_SCALE = 3;   // render frame art at 3x for sharp text/line detail on close inspection
function frameCanvas(id){
  var FW = 320*FRAME_TEX_SCALE, FH = 420*FRAME_TEX_SCALE;
  var c = document.createElement('canvas'); c.width = FW; c.height = FH;
  var g = c.getContext('2d');
  g.scale(FRAME_TEX_SCALE, FRAME_TEX_SCALE);
  function bg(a,b){ var gr=g.createLinearGradient(0,0,0,420); gr.addColorStop(0,a); gr.addColorStop(1,b);
    g.fillStyle=gr; g.fillRect(0,0,320,420); }
  function centreText(lines, col, font, y0, lh){
    g.fillStyle=col; g.font=font; g.textAlign='center'; g.textBaseline='middle';
    lines.forEach(function(ln,i){ g.fillText(ln, 160, y0 + i*lh); });
  }
  if(id==='starry'){
    bg('#1a2350','#0d1230');
    for(var s=0;s<80;s++){ g.fillStyle='rgba(220,225,255,'+(0.3+Math.random()*0.7).toFixed(2)+')';
      g.beginPath(); g.arc(Math.random()*320,Math.random()*420,Math.random()*1.8+0.4,0,7); g.fill(); }
    g.fillStyle='#f3ecc0'; g.beginPath(); g.arc(230,90,34,0,7); g.fill();
    g.fillStyle='#0d1230'; g.beginPath(); g.arc(244,82,30,0,7); g.fill();
    g.fillStyle='#111c1a'; g.beginPath(); g.moveTo(0,420); g.quadraticCurveTo(160,320,320,420); g.fill();
  } else if(id==='waves'){
    bg('#cfe3e6','#3a6f82');
    g.strokeStyle='rgba(255,255,255,0.5)'; g.lineWidth=3;
    for(var w=0;w<9;w++){ g.beginPath();
      for(var x=0;x<=320;x+=10) g.lineTo(x, 140+w*32 + Math.sin(x*0.05+w)*10); g.stroke(); }
  } else if(id==='sun'){
    bg('#f4d9a6','#e6b877');
    g.fillStyle='#f0a24a'; g.beginPath(); g.arc(160,150,60,0,7); g.fill();
    g.fillStyle='#7a8a3c'; g.fillRect(0,300,320,120);
    g.strokeStyle='rgba(60,50,20,0.3)'; g.lineWidth=2;
    for(var f=0;f<40;f++){ var fx=Math.random()*320; g.beginPath(); g.moveTo(fx,420); g.lineTo(fx,300+Math.random()*40); g.stroke(); }
  } else if(id==='mountains'){
    bg('#dfe8f0','#9fb4c8');
    g.fillStyle='#6a7f96'; g.beginPath(); g.moveTo(0,420); g.lineTo(110,180); g.lineTo(220,420); g.fill();
    g.fillStyle='#54697f'; g.beginPath(); g.moveTo(120,420); g.lineTo(240,140); g.lineTo(360,420); g.fill();
    g.fillStyle='rgba(255,255,255,0.85)'; g.beginPath(); g.moveTo(210,210); g.lineTo(240,140); g.lineTo(268,208); g.fill();
  } else if(id==='q_breathe'){
    bg('#f2ece0','#e6dcc6'); centreText(['breathe.',"you're",'doing okay.'],'#2a2a30','700 34px Georgia, serif',170,50);
    g.strokeStyle='#c9a26a'; g.lineWidth=3; g.strokeRect(24,24,272,372);
  } else if(id==='q_okay'){
    bg('#1c2230','#141a26'); centreText(['it is okay','to just','be here'],'#e9e2d2','600 30px Georgia, serif',175,46);
    g.fillStyle='#c98a6a'; g.fillRect(120,300,80,4);
  } else if(id==='q_home'){
    bg('#efe3cc','#e0d0b0'); centreText(['you are','home now'],'#3a2c1c','700 36px Georgia, serif',190,54);
    g.strokeStyle='rgba(90,70,45,0.4)'; g.lineWidth=2; g.strokeRect(30,30,260,360);
  } else if(id==='poem_room'){
    bg('#f0e8d6','#e2d6bd');
    centreText(['a room remembers','the shape of you','long after','you have gone',' ','— for later'],'#43331f',
      'italic 20px Georgia, serif',120,42);
  } else if(id==='poem_light'){
    bg('#eae0ff','#d6c8f0');
    centreText(['the light comes in','sideways in the','afternoon and','stays a while'],'#3a2c5a',
      'italic 21px Georgia, serif',150,46);
  } else if(id==='music_note'){
    bg('#12131a','#0a0b12');
    g.fillStyle='#e9e2d2'; g.font='90px serif'; g.textAlign='center'; g.fillText('♪',160,150);
    centreText(['"and if the sky','comes falling down','for you, there\'s','nothing in this','world I wouldn\'t do"'],'#c9c2b2',
      '18px Georgia, serif',240,34);
  } else if(id==='music_vinyl'){
    bg('#1a1620','#100c16');
    g.fillStyle='#0c0c0c'; g.beginPath(); g.arc(160,200,110,0,7); g.fill();
    g.strokeStyle='rgba(255,255,255,0.08)'; g.lineWidth=1;
    for(var rr=20;rr<110;rr+=10){ g.beginPath(); g.arc(160,200,rr,0,7); g.stroke(); }
    g.fillStyle='#c98a6a'; g.beginPath(); g.arc(160,200,34,0,7); g.fill();
    centreText(['now playing'],'#efe9e2','600 20px Georgia, serif',360,0);
  } else if(id==='photo'){
    bg('#d8cdb6','#c4b79c');
    g.fillStyle='#b0a184'; g.fillRect(30,30,260,300);
    g.fillStyle='#8a7a60'; g.beginPath(); g.arc(160,150,50,0,7); g.fill();
    g.fillStyle='#8a7a60'; g.beginPath(); g.moveTo(70,330); g.quadraticCurveTo(160,220,250,330); g.fill();
    centreText(['summer, a while ago'],'#5a4a32','italic 18px Georgia, serif',372,0);
  } else { bg('#e8dcc5','#d8c9ad'); }
  var tex = new THREE.CanvasTexture(c);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}
// placedFrames entries: { id, wall:'back'|'left', u, v }
//   'back' wall: u = x position (world), v = y position (world)
//   'left' wall: u = z position (world), v = y position (world)
var FRAME_FALLBACKS = [
  { wall:'back', u:-3.9, v:1.7 }, { wall:'back', u:-2.55, v:1.7 }, { wall:'back', u:-1.2, v:1.7 },
  { wall:'back', u:-3.9, v:3.3 }, { wall:'back', u:-2.55, v:3.3 }, { wall:'back', u:-1.2, v:3.3 },
  { wall:'left', u:-2.2, v:1.7 }, { wall:'left', u:-0.7, v:1.7 },
  { wall:'left', u:-2.2, v:3.2 }, { wall:'left', u:-0.7, v:3.2 }
];
function buildOneFrame(fr){
  var frameMat = new THREE.MeshStandardMaterial({ color:0x2a2018, roughness:0.6 });
  var matte   = new THREE.MeshStandardMaterial({ color:0xf1ece0, roughness:0.9 });
  var art = new THREE.Mesh(new THREE.PlaneGeometry(0.78,1.02),
    new THREE.MeshBasicMaterial({ map: frameCanvas(fr.id) }));
  var grp = new THREE.Group();
  var back = new THREE.Mesh(new THREE.BoxGeometry(1.06,1.3,0.05), frameMat);
  var mat2 = new THREE.Mesh(new THREE.PlaneGeometry(0.92,1.16), matte);
  grp.add(back);
  mat2.position.z = 0.028; art.position.z = 0.03;
  grp.add(mat2); grp.add(art);
  var v = Math.max(1.0, Math.min(WALL_H-0.8, fr.v));
  if(fr.wall === 'left'){
    grp.rotation.y = Math.PI/2;
    var u = Math.max(-HALF_Z+0.8, Math.min(HALF_Z-0.8, fr.u));
    grp.position.set(-HALF_X+0.17, v, u);
  } else {
    var ux = Math.max(-HALF_X+0.8, Math.min(HALF_X-0.8, fr.u));
    grp.position.set(ux, v, -HALF_Z+0.17);
  }
  grp.traverse(function(o){ if(o.isMesh) o.castShadow = false; o.userData.isPlacedFrame = true; });
  return grp;
}
function rebuildFrames(){
  while(frameGroup.children.length) frameGroup.remove(frameGroup.children[0]);
  placedFrames.forEach(function(fr, idx){
    if(!fr.wall){ var fb = FRAME_FALLBACKS[idx % FRAME_FALLBACKS.length];
      fr.wall = fb.wall; fr.u = fb.u; fr.v = fb.v; }
    frameGroup.add(buildOneFrame(fr));
  });
}
function addFrame(id, spot){
  if(placedFrames.length >= 10) return null;
  var fb = spot || FRAME_FALLBACKS[placedFrames.length % FRAME_FALLBACKS.length];
  var fr = { id:id, wall:fb.wall, u:fb.u, v:fb.v };
  placedFrames.push(fr);
  rebuildFrames();
  return fr;
}
function clearFrames(){ placedFrames = []; rebuildFrames(); }
function framesToConfig(){
  return placedFrames.map(function(f){ return { id:f.id, wall:f.wall, u:f.u, v:f.v }; });
}

/* ---- FRAME PLACEMENT: pick a frame, then click a wall to hang it ---- */
var placing = null;              // frame id currently being placed
var placingBtnEl = null;
var _rayc = new THREE.Raycaster();
var _rayv = new THREE.Vector2();
var placeToastEl = document.getElementById('placeToast');
var _toastTimer = null;
function showPlaceToast(msg, ok){
  placeToastEl.textContent = msg;
  placeToastEl.classList.toggle('ok', !!ok);
  placeToastEl.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function(){ placeToastEl.classList.remove('show'); }, 1400);
}
var frameCarryEl = document.getElementById('frameCarry');
var stopPlacingBtnEl = document.getElementById('stopPlacingBtn');
function startFramePlacing(id, btnEl){
  if(placingExcludeIdx < 0 && placedFrames.length >= 10){ showPlaceToast('Wall is full (10 max)'); return; }
  placing = id;
  document.body.classList.add('placing');
  if(placingBtnEl) placingBtnEl.classList.remove('picking');
  placingBtnEl = btnEl || null;
  if(placingBtnEl) placingBtnEl.classList.add('picking');
  frameCarryEl.src = frameThumb(id);
  showPlaceToast('Click a wall to hang it', true);
}
function stopFramePlacing(){
  placing = null;
  placingExcludeIdx = -1;
  document.body.classList.remove('placing');
  if(placingBtnEl){ placingBtnEl.classList.remove('picking'); placingBtnEl = null; }
  if(frameGhost) frameGhost.visible = false;
}
stopPlacingBtnEl.addEventListener('click', function(){ stopFramePlacing(); if(activeTab === 'frames') renderTabBody(); });
document.addEventListener('mousemove', function(e){
  if(!placing) return;
  frameCarryEl.style.left = e.clientX + 'px';
  frameCarryEl.style.top = e.clientY + 'px';
});
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && placing){ stopFramePlacing(); if(activeTab === 'frames') renderTabBody(); }
});
var placingExcludeIdx = -1;   // when re-placing an already-hung frame, its own slot doesn't count as an obstacle
var FRAME_FW = 0.55, FRAME_FH = 0.72;   // half-extents of a hung frame, for clearance checks

// keep-out zones: {wall, minU,maxU, minV,maxV} — a frame's footprint must not overlap these
function frameKeepoutZones(){
  return [
    { wall:'back', minU:TVX-1.8,  maxU:TVX+1.8,  minV:TV_CY-1.2, maxV:TV_CY+1.2, label:'the TV' },
    { wall:'back', minU:DESKX-1.1, maxU:DESKX+1.1, minV:1.2,      maxV:2.6,      label:'the monitor' },
    { wall:'left', minU:WIN_CZ-WIN_W/2-0.5, maxU:WIN_CZ+WIN_W/2+0.5,
      minV:WIN_CY-WIN_H/2-0.4, maxV:WIN_CY+WIN_H/2+0.6, label:'the window' },
    { wall:'left', minU:BEDZ-0.5, maxU:BEDZ+0.5, minV:3.0, maxV:3.9, label:'the clock' }
  ];
}
function rectOverlap(minU,maxU,minV,maxV, u,v,fw,fh){
  return (u + fw > minU && u - fw < maxU && v + fh > minV && v - fh < maxV);
}
// checks a candidate wall placement against furniture keep-outs AND every other hung frame; returns {ok, label}
function checkFramePlacement(wall, u, v, excludeIdx){
  var zones = frameKeepoutZones();
  for(var ki=0; ki<zones.length; ki++){
    var z = zones[ki];
    if(z.wall === wall && rectOverlap(z.minU,z.maxU,z.minV,z.maxV, u,v, FRAME_FW,FRAME_FH)) return { ok:false, label:z.label };
  }
  for(var fi=0; fi<placedFrames.length; fi++){
    if(fi === excludeIdx) continue;
    var f = placedFrames[fi];
    if(f.wall !== wall) continue;
    if(rectOverlap(f.u-FRAME_FW,f.u+FRAME_FW, f.v-FRAME_FH,f.v+FRAME_FH, u,v, FRAME_FW,FRAME_FH)){
      return { ok:false, label:'another frame' };
    }
  }
  return { ok:true };
}
// raycast the mouse against the room, resolve to a wall + u/v (or null if not on a hangable wall)
function raycastWallSpot(e){
  var r = renderer.domElement.getBoundingClientRect();
  _rayv.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  _rayv.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  _rayc.setFromCamera(_rayv, camera);
  var hits = _rayc.intersectObjects(room.children, true).filter(function(hit){
    return !hit.object.userData.isFrameGhost && !hit.object.userData.isPlacedFrame;
  });
  if(!hits.length) return null;
  var h = hits[0];
  var n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : null;
  var p = h.point;
  var onBack = n && Math.abs(n.z) > 0.7 && p.z < -HALF_Z + 0.6;
  var onLeft = n && Math.abs(n.x) > 0.7 && p.x < -HALF_X + 0.6;
  var wall = onBack ? 'back' : (onLeft ? 'left' : null);
  if(!wall) return null;
  return { wall:wall, u:(onBack ? p.x : p.z), v:p.y };
}

// ---- ghost outline: a translucent frame-shaped box that follows the cursor while placing,
// green when the spot is valid, red when it's not — so you always see exactly where/how it'll land
var frameGhost = (function(){
  var grp = new THREE.Group();
  // a real-looking preview of the frame it will become — same proportions as buildOneFrame()
  var back = new THREE.Mesh(new THREE.BoxGeometry(1.06,1.3,0.05),
    new THREE.MeshBasicMaterial({ color:0x2a2018, transparent:true, opacity:0.9 }));
  var matte = new THREE.Mesh(new THREE.PlaneGeometry(0.92,1.16),
    new THREE.MeshBasicMaterial({ color:0xf1ece0, transparent:true, opacity:0.92 }));
  var art = new THREE.Mesh(new THREE.PlaneGeometry(0.78,1.02),
    new THREE.MeshBasicMaterial({ transparent:true, opacity:0.92 }));
  matte.position.z = 0.028; art.position.z = 0.03;
  grp.add(back); grp.add(matte); grp.add(art);
  // crisp outline that turns green (ok) / red (blocked)
  var okCol = 0x6fdc8a, badCol = 0xe0524a;
  var edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1,1.34,0.06)),
    new THREE.LineBasicMaterial({ color:okCol, transparent:true, opacity:0.95, depthTest:false }));
  edges.position.z = 0.03;
  grp.add(edges);
  grp.traverse(function(o){ o.userData.isFrameGhost = true; });
  grp.userData.isFrameGhost = true;
  grp.userData.art = art; grp.userData.edges = edges;
  grp.userData.okCol = okCol; grp.userData.badCol = badCol;
  grp.userData.artId = null;
  grp.renderOrder = 999;
  grp.visible = false;
  furniture.add(grp);
  return grp;
})();
function updateFrameGhost(spot){
  if(!spot){ frameGhost.visible = false; return; }
  var res = checkFramePlacement(spot.wall, spot.u, spot.v, placingExcludeIdx);
  // show the actual art that's being hung
  if(placing && frameGhost.userData.artId !== placing){
    frameGhost.userData.artId = placing;
    frameGhost.userData.art.material.map = frameCanvas(placing);
    frameGhost.userData.art.material.needsUpdate = true;
  }
  frameGhost.userData.edges.material.color.setHex(res.ok ? frameGhost.userData.okCol : frameGhost.userData.badCol);
  var v = Math.max(1.0, Math.min(WALL_H-0.8, spot.v));
  if(spot.wall === 'left'){
    frameGhost.rotation.y = Math.PI/2;
    frameGhost.position.set(-HALF_X + 0.17, v, spot.u);
  } else {
    frameGhost.rotation.y = 0;
    frameGhost.position.set(spot.u, v, -HALF_Z + 0.17);
  }
  frameGhost.visible = true;
  return res;
}
renderer.domElement.addEventListener('mousemove', function(e){
  if(!editing || !placing) return;
  updateFrameGhost(raycastWallSpot(e));
});
renderer.domElement.addEventListener('click', function(e){
  if(!editing || !placing) return;
  if(window._camDidDrag && window._camDidDrag()) return;   // that was an orbit, not a click
  var spot = raycastWallSpot(e);
  if(!spot){ showPlaceToast('Invalid Placement'); return; }
  var res = checkFramePlacement(spot.wall, spot.u, spot.v, placingExcludeIdx);
  if(!res.ok){ showPlaceToast('Not over ' + res.label); return; }

  if(placingExcludeIdx >= 0){
    var fr = placedFrames[placingExcludeIdx];
    fr.wall = spot.wall; fr.u = spot.u; fr.v = spot.v;
    rebuildFrames();
  } else {
    addFrame(placing, { wall:spot.wall, u:spot.u, v:spot.v });
  }
  roomConfig.frames = framesToConfig();
  saveSlot();
  stopFramePlacing();
  if(activeTab === 'frames') renderTabBody();
});

// ---------- ROOM CONFIG (current selections) + apply ----------
var APPLY_FNS = {
  buildBed:buildBed, buildChair:buildChair, buildCouch:buildCouch, buildBeanbags:buildBeanbags,
  buildTable:buildTable, buildRug:buildRug, applyDesk:applyDesk, applyNotebook:applyNotebook,
  applyTV:applyTV, applyPC:applyPC, applyWalls:applyWalls, applyFloor:applyFloor, applyWindow:applyWindow
};
var roomConfig = null;
function defaultConfig(){
  var cfg = { items:{}, neonZones:[], frames:[] };
  for(var z=0;z<NEON_MODES.length;z++) cfg.neonZones.push({ on:false, color:0x8a4bff });
  for(var key in EDIT_ITEMS) cfg.items[key] = { style:0, color:null };
  return cfg;
}
function applyItem(key){
  var it = EDIT_ITEMS[key], sel = roomConfig.items[key];
  var maxS = it.styles.length - 1;
  if(sel.style < 0 || sel.style > maxS) sel.style = 0;
  var col = (sel.color != null) ? sel.color : it.styles[sel.style].color;
  APPLY_FNS[it.apply](sel.style, col);
}
function applyRoomConfig(){
  for(var key in EDIT_ITEMS) applyItem(key);
  // migrate legacy single-neon config -> zones
  if(roomConfig.neon && !roomConfig.neonZones){
    roomConfig.neonZones = [];
    for(var z=0;z<NEON_MODES.length;z++) roomConfig.neonZones.push({ on:false, color:0x8a4bff });
    var legacyStyle = Math.min(Math.max(roomConfig.neon.style|0, 0), NEON_MODES.length-1);
    if(roomConfig.neon.on) roomConfig.neonZones[legacyStyle] = { on:true, color:roomConfig.neon.color||0x8a4bff };
    delete roomConfig.neon;
  }
  if(!roomConfig.neonZones){
    roomConfig.neonZones = [];
    for(var z2=0;z2<NEON_MODES.length;z2++) roomConfig.neonZones.push({ on:false, color:0x8a4bff });
  }
  neonZones = roomConfig.neonZones.map(function(z){ return { on:!!z.on, color:(z.color!=null?z.color:0x8a4bff) }; });
  while(neonZones.length < NEON_MODES.length) neonZones.push({ on:false, color:0x8a4bff });
  if(neonZones[DOORWAY_NEON_IDX]) neonZones[DOORWAY_NEON_IDX].on = false;   // option removed — force off
  roomConfig.neonZones = neonZones;
  buildNeon();
  placedFrames = (roomConfig.frames || []).map(function(f){
    return { id:f.id, wall:f.wall||null, u:(f.u!=null?f.u:0), v:(f.v!=null?f.v:1.7) };
  });
  rebuildFrames();
}

/* ============================================================
   EDIT ROOM  — UI panel
   ============================================================ */
var editing = false;
var epTabsEl = document.getElementById('epTabs');
var epBodyEl = document.getElementById('epBody');
var TAB_ORDER = ['wall','floor','window','bed','couch','chair','beanbag','table','rug','desk','notebook','tv','pc','frames','neon'];
var NO_COLOR_TABS = { window:true };   // items whose styles are fixed painted scenes, not tintable
var TAB_LABELS = { neon:'Neon', frames:'Frames' };
var activeTab = 'wall';

function hex(n){ return '#' + (n>>>0 & 0xffffff).toString(16).padStart(6,'0'); }

function buildTabs(){
  epTabsEl.innerHTML = '';
  TAB_ORDER.forEach(function(key){
    var btn = document.createElement('button');
    btn.textContent = TAB_LABELS[key] || EDIT_ITEMS[key].label;
    btn.className = (key === activeTab) ? 'active' : '';
    btn.addEventListener('click', function(){ activeTab = key; buildTabs(); renderTabBody(); });
    epTabsEl.appendChild(btn);
  });
}

function colorRow(currentCol, onPick){
  var wrap = document.createElement('div'); wrap.className = 'ep-colors';
  EDIT_PALETTE.forEach(function(c){
    var d = document.createElement('div');
    d.className = 'ep-color' + (currentCol === c ? ' active' : '');
    d.style.background = hex(c);
    d.addEventListener('click', function(){ onPick(c); });
    wrap.appendChild(d);
  });
  var cust = document.createElement('label');
  cust.className = 'ep-color custom'; cust.textContent = '🎨';
  var inp = document.createElement('input'); inp.type = 'color';
  inp.value = hex(currentCol == null ? 0xffffff : currentCol);
  inp.addEventListener('input', function(){ onPick(parseInt(inp.value.slice(1),16)); });
  cust.appendChild(inp); wrap.appendChild(cust);
  return wrap;
}

function renderTabBody(){
  epBodyEl.innerHTML = '';
  if(activeTab === 'neon'){ renderNeon(); return; }
  if(activeTab === 'frames'){ renderFrames(); return; }

  var key = activeTab, it = EDIT_ITEMS[key], sel = roomConfig.items[key];

  var sl = document.createElement('div'); sl.className = 'ep-section-label'; sl.textContent = 'Style';
  epBodyEl.appendChild(sl);
  var styles = document.createElement('div'); styles.className = 'ep-styles';
  it.styles.forEach(function(st, idx){
    var d = document.createElement('div');
    d.className = 'ep-style' + (sel.style === idx ? ' active' : '');
    var sw = document.createElement('div'); sw.className = 'ep-swatch';
    sw.style.background = hex(st.color);
    d.appendChild(sw);
    d.appendChild(document.createTextNode(st.name));
    d.addEventListener('click', function(){
      sel.style = idx; sel.color = null;     // new style resets to its own default colour
      applyItem(key); saveSlot(); renderTabBody();
    });
    styles.appendChild(d);
  });
  epBodyEl.appendChild(styles);

  if(NO_COLOR_TABS[key]) return;

  var cl = document.createElement('div'); cl.className = 'ep-section-label'; cl.textContent = 'Colour';
  epBodyEl.appendChild(cl);
  var current = (sel.color != null) ? sel.color : it.styles[sel.style].color;
  epBodyEl.appendChild(colorRow(current, function(c){
    sel.color = c; applyItem(key); saveSlot(); renderTabBody();
  }));
}

function renderNeon(){
  epBodyEl.innerHTML = '';
  var intro = document.createElement('div'); intro.className = 'ep-hint';
  intro.style.marginBottom = '8px';
  intro.textContent = 'Light as many zones as you like — each keeps its own colour.';
  epBodyEl.appendChild(intro);

  NEON_MODES.forEach(function(nm, idx){
    if(idx === DOORWAY_NEON_IDX) return;   // doorway option removed — kept in the array for saved-slot compatibility
    var z = neonZones[idx];

    var card = document.createElement('div');
    card.className = 'ep-neon-zone' + (z.on ? ' on' : '');

    var head = document.createElement('div'); head.className = 'ep-neon-head';
    var name = document.createElement('span'); name.className = 'ep-neon-name'; name.textContent = nm;
    var btn = document.createElement('button'); btn.className = 'ep-neon-toggle' + (z.on ? ' on' : '');
    btn.textContent = z.on ? 'ON' : 'OFF';
    btn.addEventListener('click', function(){
      z.on = !z.on;
      roomConfig.neonZones[idx].on = z.on;
      buildNeon(); saveSlot(); renderNeon();
    });
    head.appendChild(name); head.appendChild(btn);
    card.appendChild(head);

    if(z.on){
      var wrap = document.createElement('div'); wrap.className = 'ep-colors';
      wrap.style.marginTop = '8px';
      NEON_PRESETS.forEach(function(c){
        var d = document.createElement('div');
        d.className = 'ep-color' + (z.color === c ? ' active' : '');
        d.style.background = hex(c); d.style.boxShadow = '0 0 10px ' + hex(c);
        d.addEventListener('click', function(){
          z.color = c; roomConfig.neonZones[idx].color = c; buildNeon(); saveSlot(); renderNeon();
        });
        wrap.appendChild(d);
      });
      var cust = document.createElement('label'); cust.className = 'ep-color custom'; cust.textContent = '🎨';
      var inp = document.createElement('input'); inp.type = 'color'; inp.value = hex(z.color);
      inp.addEventListener('input', function(){
        var c = parseInt(inp.value.slice(1),16);
        z.color = c; roomConfig.neonZones[idx].color = c; buildNeon(); saveSlot();
      });
      cust.appendChild(inp); wrap.appendChild(cust);
      card.appendChild(wrap);
    }
    epBodyEl.appendChild(card);
  });

  var all = document.createElement('div'); all.className = 'ep-toggle'; all.style.marginTop = '10px';
  var off = document.createElement('button'); off.textContent = 'Turn all off';
  off.addEventListener('click', function(){
    neonZones.forEach(function(z, i){ z.on = false; roomConfig.neonZones[i].on = false; });
    buildNeon(); saveSlot(); renderNeon();
  });
  all.appendChild(off); epBodyEl.appendChild(all);
}

var _frameThumbCache = {};
function frameThumb(id){
  if(_frameThumbCache[id]) return _frameThumbCache[id];
  var tex = frameCanvas(id);        // reuse the same canvas drawing
  var url = tex.image.toDataURL ? tex.image.toDataURL() : '';
  _frameThumbCache[id] = url;
  return url;
}
function showFramePreview(id){
  var meta = FRAME_ART.filter(function(a){ return a.id === id; })[0];
  var ov = document.createElement('div'); ov.className = 'ep-fpreview-ov';
  var card = document.createElement('div'); card.className = 'ep-fpreview-card';
  var img = document.createElement('img'); img.src = frameThumb(id);
  var cap = document.createElement('div'); cap.className = 'ep-fpreview-cap';
  cap.textContent = meta ? meta.label : id;
  card.appendChild(img); card.appendChild(cap); ov.appendChild(card);
  ov.addEventListener('click', function(){ ov.remove(); });
  document.body.appendChild(ov);
}
function renderFrames(){
  epBodyEl.innerHTML = '';
  var lbl = document.createElement('div'); lbl.className = 'ep-section-label';
  lbl.textContent = placing ? 'Now click a wall in the room — the outline shows where it will hang' : 'Pick one, then click where it goes';
  epBodyEl.appendChild(lbl);
  var grid = document.createElement('div'); grid.className = 'ep-frames';
  FRAME_ART.forEach(function(fr){
    var d = document.createElement('div'); d.className = 'ep-frame' + (placing === fr.id ? ' picking' : '');
    var img = document.createElement('img'); img.className = 'ep-fthumb';
    img.src = frameThumb(fr.id);
    img.addEventListener('click', function(e){ e.stopPropagation(); showFramePreview(fr.id); });
    d.appendChild(img);
    d.appendChild(document.createTextNode(fr.label));
    var k = document.createElement('div'); k.className = 'ep-fkind'; k.textContent = fr.kind;
    d.appendChild(k);
    d.addEventListener('click', function(){
      if(placing === fr.id){ stopFramePlacing(); renderFrames(); return; }
      placingExcludeIdx = -1;
      startFramePlacing(fr.id, d);
    });
    grid.appendChild(d);
  });
  epBodyEl.appendChild(grid);
  if(placedFrames.length){
    var hung = document.createElement('div'); hung.className = 'ep-section-label';
    hung.textContent = 'On the walls — move or remove'; hung.style.marginTop = '10px';
    epBodyEl.appendChild(hung);
    var hgrid = document.createElement('div'); hgrid.className = 'ep-frames';
    placedFrames.forEach(function(f, i){
      var d = document.createElement('div'); d.className = 'ep-frame' + (placingExcludeIdx === i ? ' picking' : '');
      var img = document.createElement('img'); img.className = 'ep-fthumb';
      img.src = frameThumb(f.id);
      img.addEventListener('click', function(e){ e.stopPropagation(); showFramePreview(f.id); });
      d.appendChild(img);
      var meta = FRAME_ART.filter(function(a){ return a.id === f.id; })[0];
      d.appendChild(document.createTextNode(meta ? meta.label : f.id));
      var actions = document.createElement('div'); actions.className = 'ep-fkind';
      var moveBtn = document.createElement('span'); moveBtn.textContent = 'move';
      moveBtn.style.cursor = 'pointer'; moveBtn.style.textDecoration = 'underline';
      moveBtn.addEventListener('click', function(e){
        e.stopPropagation();
        if(placingExcludeIdx === i){ stopFramePlacing(); renderFrames(); return; }
        placingExcludeIdx = i;
        startFramePlacing(f.id, d);
      });
      var removeBtn = document.createElement('span'); removeBtn.textContent = ' · remove';
      removeBtn.style.cursor = 'pointer'; removeBtn.style.textDecoration = 'underline';
      removeBtn.addEventListener('click', function(e){
        e.stopPropagation();
        if(placingExcludeIdx === i) stopFramePlacing();
        placedFrames.splice(i, 1); rebuildFrames();
        roomConfig.frames = framesToConfig(); saveSlot(); renderFrames();
      });
      actions.appendChild(moveBtn); actions.appendChild(removeBtn);
      d.appendChild(actions);
      hgrid.appendChild(d);
    });
    epBodyEl.appendChild(hgrid);
  }
  var count = document.createElement('div'); count.className = 'ep-hint';
  count.textContent = placedFrames.length + ' / 10 on the walls';
  epBodyEl.appendChild(count);
  var clr = document.createElement('div'); clr.className = 'ep-toggle'; clr.style.marginTop = '8px';
  var cb = document.createElement('button'); cb.textContent = 'Take them all down';
  cb.addEventListener('click', function(){
    clearFrames(); roomConfig.frames = []; saveSlot(); renderFrames();
  });
  clr.appendChild(cb); epBodyEl.appendChild(clr);
}

function openEdit(){
  editing = true;
  if(typeof seated !== 'undefined' && seated){ seated = null; seatBlend = 0; }
  if(typeof restPhraseEl !== 'undefined' && restPhraseEl) restPhraseEl.classList.remove('show');
  document.body.classList.add('editing');
  player.visible = false;
  document.getElementById('editPanel').classList.add('show');
  document.getElementById('editBtn').classList.remove('show');
  activeTab = 'wall'; buildTabs(); renderTabBody();
}
function closeEdit(){
  editing = false;
  stopFramePlacing();
  document.body.classList.remove('editing');
  player.visible = true;
  document.getElementById('editPanel').classList.remove('show');
  document.getElementById('editBtn').classList.add('show');
  resetCameraView();
  saveSlot();
}
document.getElementById('editBtn').addEventListener('click', openEdit);
document.getElementById('epDone').addEventListener('click', closeEdit);

// build every editable item once with defaults so the room is populated
roomConfig = defaultConfig();
applyRoomConfig();

