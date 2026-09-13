// ============================================================
//  ANIMATED SCREENS  (TV = Netflix + rotating posters; PC/laptop = code)
// ============================================================
// each "channel" is a mini animated scene painted onto the TV canvas
var TV_SCENES = ['drive', 'rain', 'campfire', 'ocean', 'city', 'space'];
var tvSceneIndex = 0, tvLastSwap = -999, tvMode = 'logo', tvModeStart = 0;
var tvRain = [], tvStars = [], tvEmber = [];
for(var i=0;i<90;i++) tvRain.push({ x:Math.random(), y:Math.random(), s:0.4+Math.random()*0.8 });
for(var i=0;i<70;i++) tvStars.push({ x:Math.random(), y:Math.random()*0.7, t:Math.random()*6 });
for(var i=0;i<40;i++) tvEmber.push({ x:0.5+(Math.random()-0.5)*0.3, y:0, v:0.2+Math.random()*0.5, r:1+Math.random()*2 });

function drawTV(now){
  var g = tvCtx, W = tvCanvas.width, H = tvCanvas.height;
  if(now - tvLastSwap > 120){                     // new channel every 2 min
    tvLastSwap = now;
    tvSceneIndex = (tvSceneIndex + 1) % TV_SCENES.length;
    tvMode = 'logo'; tvModeStart = now;
  }
  if(tvMode === 'logo' && now - tvModeStart > 2.5) tvMode = 'scene';

  if(tvMode === 'logo'){
    g.fillStyle = '#0b0b0b'; g.fillRect(0,0,W,H);
    g.fillStyle = '#e50914';
    g.font = '700 80px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('NETFLIX', W/2, H/2);
    tvTex.needsUpdate = true; return;
  }

  var s = TV_SCENES[tvSceneIndex], t = now;
  if(s === 'drive'){
    // night road from a car, dashed centre line scrolling
    var sky = g.createLinearGradient(0,0,0,H*0.55);
    sky.addColorStop(0,'#1a1440'); sky.addColorStop(1,'#4a2f5a');
    g.fillStyle = sky; g.fillRect(0,0,W,H*0.55);
    g.fillStyle = '#141018'; g.beginPath();
    g.moveTo(0,H); g.lineTo(W*0.38,H*0.55); g.lineTo(W*0.62,H*0.55); g.lineTo(W,H); g.fill();
    g.strokeStyle = '#e8d98a'; g.lineWidth = 6;
    for(var d=0; d<8; d++){
      var pz = ((d + (t*1.4 % 1)) / 8);
      var y = H*0.55 + pz*pz*(H*0.45);
      var w = 3 + pz*10;
      g.beginPath(); g.moveTo(W/2 - w, y); g.lineTo(W/2 + w, y); g.stroke();
    }
    // oncoming headlights
    var hx = W*0.5 + Math.sin(t*0.6)*W*0.12;
    g.fillStyle = 'rgba(255,245,200,0.9)';
    g.beginPath(); g.arc(hx-14, H*0.5, 4, 0, 7); g.arc(hx+14, H*0.5, 4, 0, 7); g.fill();
  } else if(s === 'rain'){
    g.fillStyle = '#22303f'; g.fillRect(0,0,W,H);
    g.fillStyle = 'rgba(160,190,220,0.35)';
    for(var r=0;r<tvRain.length;r++){
      var p = tvRain[r];
      p.y += p.s*0.04; if(p.y>1){ p.y = 0; p.x = Math.random(); }
      g.fillRect(p.x*W, p.y*H, 1.5, 12*p.s);
    }
    g.fillStyle = 'rgba(255,220,150,0.5)';
    g.beginPath(); g.arc(W*0.7, H*0.35, 26, 0, 7); g.fill();   // blurred streetlamp
  } else if(s === 'campfire'){
    g.fillStyle = '#0e0a12'; g.fillRect(0,0,W,H);
    g.fillStyle = '#2a1c14';
    g.fillRect(W*0.35, H*0.7, W*0.3, 20);
    for(var e=0;e<tvEmber.length;e++){
      var p = tvEmber[e];
      p.y += p.v*0.02; if(p.y>1){ p.y = 0; p.x = 0.5+(Math.random()-0.5)*0.3; }
      var a = 1 - p.y;
      g.fillStyle = 'rgba(255,'+Math.floor(120+120*a)+',60,'+a.toFixed(2)+')';
      g.beginPath(); g.arc(p.x*W + Math.sin(p.y*10)*8, H*0.7 - p.y*H*0.55, p.r, 0, 7); g.fill();
    }
    var fl = 0.5 + Math.sin(t*9)*0.1 + Math.random()*0.1;
    var fg = g.createRadialGradient(W/2, H*0.66, 10, W/2, H*0.66, 120);
    fg.addColorStop(0,'rgba(255,170,70,'+fl.toFixed(2)+')');
    fg.addColorStop(1,'rgba(255,120,40,0)');
    g.fillStyle = fg; g.fillRect(0,0,W,H);
  } else if(s === 'ocean'){
    var og = g.createLinearGradient(0,0,0,H);
    og.addColorStop(0,'#f0b57a'); og.addColorStop(0.45,'#c97b6a'); og.addColorStop(0.5,'#2a4a6a'); og.addColorStop(1,'#132938');
    g.fillStyle = og; g.fillRect(0,0,W,H);
    g.fillStyle = 'rgba(255,220,170,0.9)';
    g.beginPath(); g.arc(W*0.5, H*0.42, 34, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2;
    for(var w=0; w<6; w++){
      var yy = H*0.55 + w*20;
      g.beginPath();
      for(var xx=0; xx<=W; xx+=12) g.lineTo(xx, yy + Math.sin(xx*0.05 + t*2 + w)*4);
      g.stroke();
    }
  } else if(s === 'city'){
    g.fillStyle = '#141024'; g.fillRect(0,0,W,H);
    for(var st=0; st<tvStars.length; st++){
      var p = tvStars[st];
      var tw = 0.4 + 0.6*Math.abs(Math.sin(t*2 + p.t));
      g.fillStyle = 'rgba(220,230,255,'+tw.toFixed(2)+')';
      g.fillRect(p.x*W, p.y*H, 1.6, 1.6);
    }
    for(var b=0; b<14; b++){
      var bw = W/14, bh = (0.25 + (b*7 % 5)/10) * H;
      g.fillStyle = '#0c0a18'; g.fillRect(b*bw, H-bh, bw-3, bh);
      for(var wy=0; wy<bh-20; wy+=18)
        for(var wx=4; wx<bw-8; wx+=14){
          if((b*13 + wy + wx) % 7 < 3){
            g.fillStyle = 'rgba(255,'+(200+((wx)%40))+',120,0.8)';
            g.fillRect(b*bw+wx, H-bh+wy+10, 6, 8);
          }
        }
    }
  } else { // space
    g.fillStyle = '#05060f'; g.fillRect(0,0,W,H);
    for(var st2=0; st2<tvStars.length; st2++){
      var p = tvStars[st2];
      g.fillStyle = 'rgba(255,255,255,'+(0.3+0.7*Math.abs(Math.sin(t + p.t))).toFixed(2)+')';
      g.fillRect(p.x*W, (p.y+0.1)*H, 1.6, 1.6);
    }
    var pg = g.createRadialGradient(W*0.62, H*0.4, 8, W*0.62, H*0.4, 60);
    pg.addColorStop(0,'#6a8ad0'); pg.addColorStop(1,'#243a66');
    g.fillStyle = pg; g.beginPath(); g.arc(W*0.62, H*0.4, 46, 0, 7); g.fill();
    g.strokeStyle = 'rgba(200,180,150,0.5)'; g.lineWidth = 6;
    g.beginPath(); g.ellipse(W*0.62, H*0.4, 78, 20, -0.4, 0, 7); g.stroke();
  }

  // subtle scanline + vignette so it reads as a screen
  g.fillStyle = 'rgba(0,0,0,0.06)';
  for(var y2=0; y2<H; y2+=4) g.fillRect(0, y2, W, 1);
  var vg = g.createRadialGradient(W/2,H/2,H*0.3, W/2,H/2,W*0.6);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.4)');
  g.fillStyle = vg; g.fillRect(0,0,W,H);
  tvTex.needsUpdate = true;
}

// scrolling green code
var codeLines = [];
var CODE_SNIPPETS = [
  'function render(scene){','  const dt = clock.delta();','  player.update(dt);','  for (const e of world) e.tick(dt);',
  'if (!ready) return init();','const path = a.star(grid, start, goal);','room.save(slot, state);','// TODO: polish the lighting',
  'export default function App(){','  return <Room camera={fixed} />;','}','npm run build  ✓','commit -m "cozy room pass"',
  'let glow = 0.65;','mesh.material.emissiveIntensity = glow;','requestAnimationFrame(frame);','await load("assets/room.glb");',
  'const ok = tests.every(t => t.pass);','print("build complete")','git push origin main'
];
for(var ci=0;ci<22;ci++) codeLines.push(CODE_SNIPPETS[ci % CODE_SNIPPETS.length]);
var codeScroll = 0;

function drawCode(ctx, cvs, now, fontSize){
  var g = ctx, W = cvs.width, H = cvs.height;
  g.fillStyle = '#04120a'; g.fillRect(0,0,W,H);
  g.font = fontSize + 'px "Courier New", monospace';
  g.textBaseline = 'top';
  var lh = fontSize + 4;
  codeScroll += 0.35;
  if(codeScroll > lh){
    codeScroll -= lh;
    codeLines.push(CODE_SNIPPETS[Math.floor(Math.random()*CODE_SNIPPETS.length)]);
    codeLines.shift();
  }
  for(var i=0;i<codeLines.length;i++){
    var y = i*lh - codeScroll;
    var fade = 0.35 + 0.6 * (i / codeLines.length);
    g.fillStyle = 'rgba(70,230,120,' + fade.toFixed(2) + ')';
    g.fillText(codeLines[i], 10, y);
  }
  // cursor blink
  if(Math.floor(now*2) % 2 === 0){
    g.fillStyle = 'rgba(120,255,160,0.9)';
    g.fillRect(10, codeLines.length*lh - codeScroll - lh + 2, fontSize*0.5, fontSize);
  }
}

function drawDigitalClock(){
  var d = new Date();
  var hh = String(d.getHours()).padStart(2,'0');
  var mm = String(d.getMinutes()).padStart(2,'0');
  var g = clkCtx, W = clkCanvas.width, H = clkCanvas.height;
  g.fillStyle = '#0a0a0c'; g.fillRect(0,0,W,H);
  g.fillStyle = '#4fd1ff';
  g.font = '700 78px "Courier New", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  var colon = (d.getSeconds() % 2 === 0) ? ':' : ' ';
  g.shadowColor = '#4fd1ff'; g.shadowBlur = 16;
  g.fillText(hh + colon + mm, W/2, H/2 + 4);
  g.shadowBlur = 0;
  clkTex.needsUpdate = true;
}

function tickWallClock(){
  if(!wallHourHand) return;
  var d = new Date();
  var s = d.getSeconds() + d.getMilliseconds()/1000;
  var m = d.getMinutes() + s/60;
  var h = (d.getHours() % 12) + m/60;
  // hands point "up" at 12; rotate clockwise => negative Z
  wallSecHand.rotation.z  = -s/60 * Math.PI*2;
  wallMinHand.rotation.z  = -m/60 * Math.PI*2;
  wallHourHand.rotation.z = -h/12 * Math.PI*2;
}

function updateScreens(now){
  drawTV(now);
  drawCode(monCtx, monCanvas, now, 18); monTex.needsUpdate = true;
  drawDigitalClock();
  tickWallClock();
}

// ============================================================
//  AMBIENT SOUND  — layered soundscapes, synthesized (no assets).
//  Each layer is a small WebAudio graph you can fade in/out and mix.
//  To use real recordings later: give a layer a `url` (data-URI or
//  same-origin file) and buildLayer() will stream+loop it instead.
// ============================================================
var AmbientSound = (function(){
  var ac = null, master = null, started = false;
  var layers = {};              // id -> { on, gain, nodes:[], stop:fn }
  var volume = 0.55;

  function ctx(){
    if(ac) return ac;
    try{ ac = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e){ ac = null; return null; }
    master = ac.createGain();
    master.gain.value = volume;
    // a touch of soft-clip + gentle high-shelf roll-off so layers glue together
    var shelf = ac.createBiquadFilter(); shelf.type='highshelf'; shelf.frequency.value=9000; shelf.gain.value=-4;
    master.connect(shelf); shelf.connect(ac.destination);
    return ac;
  }

  // ---- reusable noise buffers (stereo, looped) ----
  var _bufs = {};
  function noiseBuffer(kind){
    if(_bufs[kind]) return _bufs[kind];
    var len = Math.floor(ac.sampleRate * 3);
    var buf = ac.createBuffer(2, len, ac.sampleRate);
    for(var ch=0; ch<2; ch++){
      var d = buf.getChannelData(ch);
      if(kind === 'white'){
        for(var i=0;i<len;i++) d[i] = (Math.random()*2 - 1) * 0.5;
      } else if(kind === 'brown'){
        var last = 0;
        for(var i=0;i<len;i++){
          var w = Math.random()*2 - 1;
          last = (last + 0.02*w) / 1.02;
          d[i] = last * 3.2;
        }
      } else { // pink
        var b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
        for(var i=0;i<len;i++){
          var w = Math.random()*2 - 1;
          b0 = 0.99886*b0 + w*0.0555179;
          b1 = 0.99332*b1 + w*0.0750759;
          b2 = 0.96900*b2 + w*0.1538520;
          b3 = 0.86650*b3 + w*0.3104856;
          b4 = 0.55000*b4 + w*0.5329522;
          b5 = -0.7616*b5 - w*0.0168980;
          d[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) * 0.06;
          b6 = w*0.115926;
        }
      }
    }
    _bufs[kind] = buf;
    return buf;
  }
  function noiseSource(kind){
    var s = ac.createBufferSource();
    s.buffer = noiseBuffer(kind || 'pink'); s.loop = true;
    s.playbackRate.value = 0.97 + Math.random()*0.06;   // detune each instance a hair
    return s;
  }
  // short convolution reverb (exponential-decay noise impulse)
  var _verb = null;
  function reverb(seconds, decay){
    var len = Math.floor(ac.sampleRate * (seconds || 2.4));
    var imp = ac.createBuffer(2, len, ac.sampleRate);
    for(var ch=0; ch<2; ch++){
      var d = imp.getChannelData(ch);
      for(var i=0;i<len;i++){
        d[i] = (Math.random()*2 - 1) * Math.pow(1 - i/len, decay || 3);
      }
    }
    var c = ac.createConvolver(); c.buffer = imp;
    return c;
  }
  // stereo spread helper: split a mono-ish node into a widened pair
  function widen(node, out, amount){
    var sp = ac.createStereoPanner ? ac.createStereoPanner() : null;
    if(sp){ sp.pan.value = 0; node.connect(sp); sp.connect(out); }
    else node.connect(out);
    // slow autopan
    if(sp){
      var lfo = ac.createOscillator(); lfo.frequency.value = 0.03 + Math.random()*0.04;
      var lg = ac.createGain(); lg.gain.value = (amount==null?0.6:amount);
      lfo.connect(lg); lg.connect(sp.pan); lfo.start();
      return { stop:function(){ try{lfo.stop();}catch(e){} } };
    }
    return { stop:function(){} };
  }

  // small util: schedule a repeating randomised callback, return a stopper
  function every(minMs, maxMs, fn){
    var alive = true, h = null;
    function loop(){
      if(!alive) return;
      fn();
      h = setTimeout(loop, minMs + Math.random()*(maxMs - minMs));
    }
    h = setTimeout(loop, minMs + Math.random()*(maxMs - minMs));
    return function(){ alive = false; clearTimeout(h); };
  }

  // ---- layer builders -> return { stop:fn } ----
  var BUILDERS = {
    rain: function(out){
      var stops = [];
      // 1. steady hiss bed — pink noise, gently band-limited, slow "sheet" swells
      var bed = noiseSource('pink');
      var hp = ac.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=600;
      var lp = ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=6800;
      var bedG = ac.createGain(); bedG.gain.value = 0.34;
      var sway = ac.createOscillator(); sway.type='sine'; sway.frequency.value = 0.06;
      var swayG = ac.createGain(); swayG.gain.value = 1500;
      sway.connect(swayG); swayG.connect(lp.frequency);
      bed.connect(hp); hp.connect(lp); lp.connect(bedG);
      var w1 = widen(bedG, out, 0.35); stops.push(w1.stop);
      bed.start(); sway.start();
      // 2. distant low rumble
      var rum = noiseSource('brown');
      var rlp = ac.createBiquadFilter(); rlp.type='lowpass'; rlp.frequency.value=180;
      var rumG = ac.createGain(); rumG.gain.value = 0.16;
      rum.connect(rlp); rlp.connect(rumG); rumG.connect(out);
      rum.start();
      // 3. individual droplets / patter — short filtered noise bursts, panned
      var dropStop = every(38, 130, function(){
        var t = ac.currentTime;
        var n = noiseSource('white');
        var bp = ac.createBiquadFilter(); bp.type='bandpass';
        bp.frequency.value = 1400 + Math.random()*3800; bp.Q.value = 2 + Math.random()*4;
        var dg = ac.createGain(); dg.gain.value = 0;
        var pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
        n.connect(bp); bp.connect(dg);
        if(pan){ pan.pan.value = Math.random()*2-1; dg.connect(pan); pan.connect(out); }
        else dg.connect(out);
        var amp = 0.02 + Math.random()*0.05;
        dg.gain.setValueAtTime(0.0001, t);
        dg.gain.exponentialRampToValueAtTime(amp, t + 0.002);
        dg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03 + Math.random()*0.05);
        n.start(t); n.stop(t + 0.12);
      });
      stops.push(dropStop);
      // 4. occasional closer splashes
      var splashStop = every(1200, 4200, function(){
        var t = ac.currentTime;
        var n = noiseSource('white');
        var bp = ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value = 700 + Math.random()*900; bp.Q.value=1.2;
        var sg = ac.createGain(); sg.gain.value = 0;
        n.connect(bp); bp.connect(sg); sg.connect(out);
        sg.gain.setValueAtTime(0.0001, t);
        sg.gain.exponentialRampToValueAtTime(0.05 + Math.random()*0.06, t + 0.01);
        sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12 + Math.random()*0.15);
        n.start(t); n.stop(t + 0.4);
      });
      stops.push(splashStop);
      return { stop:function(){ stops.forEach(function(s){s();}); try{bed.stop();sway.stop();rum.stop();}catch(e){} } };
    },

    wind: function(out){
      var stops = [];
      // layered band-passed noise, each band with its own slow gust envelope
      var src = noiseSource('pink');
      var bands = [
        { f:220,  q:0.7, g:0.30, lfo:0.037 },
        { f:600,  q:0.9, g:0.18, lfo:0.053 },
        { f:1500, q:1.1, g:0.10, lfo:0.071 }
      ];
      bands.forEach(function(b){
        var bp = ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=b.f; bp.Q.value=b.q;
        var g = ac.createGain(); g.gain.value = b.g*0.4;
        var base = ac.createConstantSource(); base.offset.value = b.g*0.5;
        var lfo = ac.createOscillator(); lfo.type='sine'; lfo.frequency.value = b.lfo;
        var lg = ac.createGain(); lg.gain.value = b.g*0.5;
        base.connect(g.gain); lfo.connect(lg); lg.connect(g.gain);
        // gust also sweeps the band centre a little
        var fl = ac.createOscillator(); fl.frequency.value = b.lfo*0.7;
        var flg = ac.createGain(); flg.gain.value = b.f*0.4;
        fl.connect(flg); flg.connect(bp.frequency);
        src.connect(bp); bp.connect(g);
        var w = widen(g, out, 0.7); stops.push(w.stop);
        base.start(); lfo.start(); fl.start();
        stops.push(function(){ try{base.stop();lfo.stop();fl.stop();}catch(e){} });
      });
      src.start();
      // rare whistle through a gap
      var whistleStop = every(9000, 22000, function(){
        var t = ac.currentTime;
        var o = ac.createOscillator(); o.type='sine';
        var og = ac.createGain(); og.gain.value = 0;
        var f0 = 700 + Math.random()*500;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.linearRampToValueAtTime(f0*1.4, t + 1.5);
        o.frequency.linearRampToValueAtTime(f0*0.9, t + 3.2);
        og.gain.setValueAtTime(0.0001, t);
        og.gain.linearRampToValueAtTime(0.03, t + 0.8);
        og.gain.linearRampToValueAtTime(0.0001, t + 3.2);
        o.connect(og); og.connect(out);
        o.start(t); o.stop(t + 3.4);
      });
      stops.push(whistleStop);
      return { stop:function(){ stops.forEach(function(s){s();}); try{src.stop();}catch(e){} } };
    },

    leaves: function(out){
      var stops = [];
      var src = noiseSource('white');
      var hp = ac.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1800;
      var bp = ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=4200; bp.Q.value=0.6;
      var g = ac.createGain(); g.gain.value = 0.02;
      src.connect(hp); hp.connect(bp); bp.connect(g);
      var w = widen(g, out, 0.8); stops.push(w.stop);
      src.start();
      // rustle bursts — a gust catches the tree
      var rustleStop = every(1400, 4500, function(){
        var t = ac.currentTime;
        var peak = 0.04 + Math.random()*0.16;
        var rise = 0.25 + Math.random()*0.6, hold = 0.4 + Math.random()*1.4;
        g.gain.cancelScheduledValues(t);
        g.gain.setTargetAtTime(peak, t, rise);
        g.gain.setTargetAtTime(0.02, t + rise + hold, 0.8);
        bp.frequency.cancelScheduledValues(t);
        bp.frequency.setTargetAtTime(3200 + Math.random()*2600, t, rise);
      });
      stops.push(rustleStop);
      return { stop:function(){ stops.forEach(function(s){s();}); try{src.stop();}catch(e){} } };
    },

    birds: function(out){
      var stops = [];
      var verb = reverb(1.8, 3.2);
      var wet = ac.createGain(); wet.gain.value = 0.25;
      var dry = ac.createGain(); dry.gain.value = 0.8;
      verb.connect(wet); wet.connect(out); dry.connect(out);
      function voice(node){ node.connect(dry); node.connect(verb); }

      // one bird "song" = a phrase of 2–6 notes with a species-ish character
      function song(){
        var t0 = ac.currentTime + 0.05;
        var pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
        var busG = ac.createGain(); busG.gain.value = 0.6 + Math.random()*0.4;
        if(pan){ pan.pan.value = Math.random()*1.6 - 0.8; busG.connect(pan); voice(pan); }
        else voice(busG);
        var kind = Math.random();
        var baseF = kind < 0.4 ? 2600 + Math.random()*1400      // small songbird, high
                  : kind < 0.75 ? 1700 + Math.random()*900       // robin-ish, mid
                  : 900 + Math.random()*500;                     // dove/low
        var notes = 2 + (Math.random()*4|0);
        var gap = 0.09 + Math.random()*0.14;
        var tw = 0.5 + Math.random();                            // "trill" speed factor
        for(var n=0;n<notes;n++){
          var st = t0 + n*gap;
          var o = ac.createOscillator(); o.type = Math.random()<0.5 ? 'sine':'triangle';
          var og = ac.createGain();
          var f = baseF * (0.9 + Math.random()*0.35) * (1 + n*0.03);
          var dur = 0.06 + Math.random()*0.10;
          o.frequency.setValueAtTime(f, st);
          // chirp contour: up-slur then quick fall, or a little warble
          if(Math.random() < 0.6){
            o.frequency.exponentialRampToValueAtTime(f*(1.2+Math.random()*0.5), st+dur*0.5);
            o.frequency.exponentialRampToValueAtTime(f*0.75, st+dur);
          } else {
            for(var wv=0; wv<3; wv++)
              o.frequency.setValueAtTime(f*(wv%2?1.18:0.92), st + dur*(wv/3));
          }
          og.gain.setValueAtTime(0.0001, st);
          og.gain.exponentialRampToValueAtTime(0.35, st + 0.008);
          og.gain.exponentialRampToValueAtTime(0.0001, st + dur);
          o.connect(og); og.connect(busG);
          o.start(st); o.stop(st + dur + 0.03);
        }
      }
      // a few birds, each on its own loose timer
      stops.push(every(1500, 5000, function(){ if(Math.random()<0.85) song(); }));
      stops.push(every(3200, 9000, function(){ if(Math.random()<0.7) song(); }));
      setTimeout(song, 400);
      return { stop:function(){ stops.forEach(function(s){s();}); } };
    },

    night: function(out){
      var stops = [];
      // cricket voice: pulse-modulated resonant tone, slightly detuned per voice
      function cricket(freq, rate, level, panPos){
        var o = ac.createOscillator(); o.type='sawtooth'; o.frequency.value = freq;
        var bp = ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=freq; bp.Q.value=18;
        var g = ac.createGain(); g.gain.value = 0;
        var pulse = ac.createOscillator(); pulse.type='square'; pulse.frequency.value = rate;
        var pg = ac.createGain(); pg.gain.value = level;
        var base = ac.createConstantSource(); base.offset.value = level*0.15;
        pulse.connect(pg); pg.connect(g.gain); base.connect(g.gain);
        o.connect(bp); bp.connect(g);
        var pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
        if(pan){ pan.pan.value = panPos; g.connect(pan); pan.connect(out); } else g.connect(out);
        o.start(); pulse.start(); base.start();
        // slow drift in chirp rate (temperature-ish)
        var drift = ac.createOscillator(); drift.frequency.value = 0.02 + Math.random()*0.03;
        var dg = ac.createGain(); dg.gain.value = rate*0.06;
        drift.connect(dg); dg.connect(pulse.frequency); drift.start();
        stops.push(function(){ try{o.stop();pulse.stop();base.stop();drift.stop();}catch(e){} });
      }
      cricket(4500, 32, 0.05, -0.5);
      cricket(4720, 28, 0.04,  0.55);
      cricket(3900, 36, 0.03,  0.1);
      // low night air
      var air = noiseSource('brown');
      var alp = ac.createBiquadFilter(); alp.type='lowpass'; alp.frequency.value=200;
      var ag = ac.createGain(); ag.gain.value = 0.14;
      air.connect(alp); alp.connect(ag); ag.connect(out); air.start();
      stops.push(function(){ try{air.stop();}catch(e){} });
      // distant owl, rarely
      var owlStop = every(15000, 40000, function(){
        var t = ac.currentTime;
        function hoot(delay){
          var st = t + delay;
          var o = ac.createOscillator(); o.type='sine';
          var og = ac.createGain(); og.gain.value = 0;
          o.frequency.setValueAtTime(360, st);
          o.frequency.linearRampToValueAtTime(330, st + 0.18);
          og.gain.setValueAtTime(0.0001, st);
          og.gain.linearRampToValueAtTime(0.05, st + 0.05);
          og.gain.exponentialRampToValueAtTime(0.0001, st + 0.4);
          o.connect(og); og.connect(out);
          o.start(st); o.stop(st + 0.5);
        }
        hoot(0); hoot(0.55);
      });
      stops.push(owlStop);
      return { stop:function(){ stops.forEach(function(s){s();}); } };
    },

    fire: function(out){
      var stops = [];
      // body roar — low brown noise, slow flicker
      var roar = noiseSource('brown');
      var rlp = ac.createBiquadFilter(); rlp.type='lowpass'; rlp.frequency.value=420;
      var rg = ac.createGain(); rg.gain.value = 0.18;
      var flick = ac.createOscillator(); flick.type='sine'; flick.frequency.value = 3.5;
      var flg = ac.createGain(); flg.gain.value = 0.05;
      var flick2 = ac.createOscillator(); flick2.type='sine'; flick2.frequency.value = 7.3;
      var flg2 = ac.createGain(); flg2.gain.value = 0.03;
      flick.connect(flg); flg.connect(rg.gain);
      flick2.connect(flg2); flg2.connect(rg.gain);
      roar.connect(rlp); rlp.connect(rg); rg.connect(out);
      roar.start(); flick.start(); flick2.start();
      // hiss layer — mid noise, low level
      var hiss = noiseSource('pink');
      var hbp = ac.createBiquadFilter(); hbp.type='bandpass'; hbp.frequency.value=1600; hbp.Q.value=0.5;
      var hg = ac.createGain(); hg.gain.value = 0.04;
      hiss.connect(hbp); hbp.connect(hg); hg.connect(out); hiss.start();
      // crackles + pops — sharp transients, panned, sometimes a quick burst of several
      function crackle(){
        var t = ac.currentTime;
        var count = Math.random() < 0.25 ? 2 + (Math.random()*4|0) : 1;
        for(var c=0;c<count;c++){
          var st = t + c*(0.015 + Math.random()*0.04);
          var n = noiseSource('white');
          var bp = ac.createBiquadFilter(); bp.type='bandpass';
          bp.frequency.value = 1200 + Math.random()*3500; bp.Q.value = 8 + Math.random()*10;
          var cg = ac.createGain(); cg.gain.value = 0;
          var pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
          n.connect(bp); bp.connect(cg);
          if(pan){ pan.pan.value = Math.random()*1.2 - 0.6; cg.connect(pan); pan.connect(out); }
          else cg.connect(out);
          var amp = 0.04 + Math.random()*0.22;
          cg.gain.setValueAtTime(0.0001, st);
          cg.gain.exponentialRampToValueAtTime(amp, st + 0.002);
          cg.gain.exponentialRampToValueAtTime(0.0001, st + 0.02 + Math.random()*0.06);
          n.start(st); n.stop(st + 0.15);
        }
      }
      stops.push(every(120, 700, crackle));
      return { stop:function(){ stops.forEach(function(s){s();}); try{roar.stop();flick.stop();flick2.stop();hiss.stop();}catch(e){} } };
    },

    waves: function(out){
      var stops = [];
      // two offset swell voices so it never fully goes silent
      function swellVoice(period, phase, pan){
        var src = noiseSource('pink');
        var lp = ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=500;
        var hp = ac.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=120;
        var g = ac.createGain(); g.gain.value = 0.04;
        src.connect(hp); hp.connect(lp); lp.connect(g);
        var p = ac.createStereoPanner ? ac.createStereoPanner() : null;
        if(p){ p.pan.value = pan; g.connect(p); p.connect(out); } else g.connect(out);
        src.start();
        function cycle(){
          var t = ac.currentTime;
          var rise = period*0.35, fall = period*0.65;
          g.gain.cancelScheduledValues(t);
          g.gain.setValueAtTime(0.03, t);
          g.gain.linearRampToValueAtTime(0.34, t + rise);
          g.gain.linearRampToValueAtTime(0.04, t + rise + fall);
          lp.frequency.cancelScheduledValues(t);
          lp.frequency.setValueAtTime(350, t);
          lp.frequency.linearRampToValueAtTime(1300, t + rise);      // "hiss" as it breaks
          lp.frequency.linearRampToValueAtTime(350, t + rise + fall);
          // foam fizz near the peak
          var ft = t + rise*0.8;
          var fz = noiseSource('white');
          var fbp = ac.createBiquadFilter(); fbp.type='highpass'; fbp.frequency.value=2400;
          var fg = ac.createGain(); fg.gain.value = 0;
          fz.connect(fbp); fbp.connect(fg); fg.connect(out);
          fg.gain.setValueAtTime(0.0001, ft);
          fg.gain.linearRampToValueAtTime(0.03, ft + 0.4);
          fg.gain.exponentialRampToValueAtTime(0.0001, ft + 1.8);
          fz.start(ft); fz.stop(ft + 2.2);
        }
        var h = setTimeout(function run(){ cycle(); h = setTimeout(run, period*1000); }, phase*1000);
        stops.push(function(){ clearTimeout(h); try{src.stop();}catch(e){} });
      }
      swellVoice(9.5, 0,   -0.3);
      swellVoice(11.0, 5.0,  0.35);
      // deep ocean rumble under it
      var rum = noiseSource('brown');
      var rlp = ac.createBiquadFilter(); rlp.type='lowpass'; rlp.frequency.value=110;
      var rg = ac.createGain(); rg.gain.value = 0.13;
      rum.connect(rlp); rlp.connect(rg); rg.connect(out); rum.start();
      stops.push(function(){ try{rum.stop();}catch(e){} });
      return { stop:function(){ stops.forEach(function(s){s();}); } };
    }
  };

  // baseline mix so nothing overpowers; user scales this per-layer with layerVol
  var LEVELS = { rain:1.0, wind:0.9, leaves:1.0, birds:0.85, night:1.0, fire:1.0, waves:1.0 };
  var layerVol = { rain:1, wind:1, leaves:1, birds:1, night:1, fire:1, waves:1 };  // 0..1 user scalar

  function targetGain(id){ return (LEVELS[id] || 1) * (layerVol[id] != null ? layerVol[id] : 1); }

  function setLayer(id, on){
    if(!ctx()) return;
    if(ac.state === 'suspended') ac.resume();
    var L = layers[id];
    if(on){
      if(L && L.on) return;
      var g = ac.createGain(); g.gain.value = 0;
      g.connect(master);
      var built = BUILDERS[id] ? BUILDERS[id](g) : null;
      g.gain.setTargetAtTime(targetGain(id), ac.currentTime, 1.6);   // fade in
      layers[id] = { on:true, gain:g, built:built };
    } else if(L && L.on){
      L.on = false;
      L.gain.gain.setTargetAtTime(0, ac.currentTime, 0.8);  // fade out
      var toStop = L.built;
      setTimeout(function(){ if(toStop && toStop.stop) toStop.stop(); }, 1400);
    }
  }
  function isOn(id){ return !!(layers[id] && layers[id].on); }
  function setLayerVolume(id, v){
    layerVol[id] = Math.max(0, Math.min(1, v));
    var L = layers[id];
    if(L && L.on && ac) L.gain.gain.setTargetAtTime(targetGain(id), ac.currentTime, 0.15);
  }
  function getLayerVolume(id){ return layerVol[id] != null ? layerVol[id] : 1; }
  function setVolume(v){
    volume = Math.max(0, Math.min(1, v));
    if(master) master.gain.setTargetAtTime(volume, ac.currentTime, 0.1);
  }
  function getVolume(){ return volume; }
  function stopAll(){
    for(var id in layers) if(layers[id].on) setLayer(id, false);
  }
  function activeList(){
    var a = []; for(var id in layers) if(layers[id].on) a.push(id); return a;
  }
  function restore(state){
    state = state || {};
    if(typeof state.volume === 'number') setVolume(state.volume);
    if(state.layerVol) for(var k in state.layerVol) setLayerVolume(k, state.layerVol[k]);
    (state.layers || []).forEach(function(id){ if(BUILDERS[id]) setLayer(id, true); });
  }
  function snapshot(){
    var lv = {}; for(var k in layerVol) lv[k] = layerVol[k];
    return { layers:activeList(), volume:volume, layerVol:lv };
  }

  return { setLayer:setLayer, isOn:isOn, setVolume:setVolume, getVolume:getVolume,
           setLayerVolume:setLayerVolume, getLayerVolume:getLayerVolume,
           stopAll:stopAll, activeList:activeList, restore:restore, snapshot:snapshot,
           LAYERS:['rain','wind','leaves','birds','night','fire','waves'] };
})();

// ============================================================
//  MUSIC  — royalty-free tracks shipped under assets/audio/.
//  Streamed via <audio> (same-origin), so no giant base64 in the file.
// ============================================================
var Music = (function(){
  var TRACKS = [
    { file:'assets/audio/alex-morgan-piano-background-gentle-study-flow-578490.mp3', name:'Gentle Study Flow', by:'Alex Morgan' },
    { file:'assets/audio/relaxingtime-lullaby-music-vol20-186394.mp3',               name:'Lullaby, Vol. 20',  by:'RelaxingTime' },
    { file:'assets/audio/lofi_hour-in-the-room-when-the-rain-pouring-117209.mp3',    name:'Rain on the Window', by:'Lofi Hour' },
    { file:'assets/audio/celeronbeats-gentle-night-rain-for-sleep-574972.mp3',       name:'Gentle Night Rain',  by:'CeleronBeats' },
    { file:'assets/audio/yokaicircle-arancina-ambient-yokai-raining-386502.mp3',     name:'Ambient Rain',       by:'Yokai Circle' },
    { file:'assets/audio/lorenzobuczek-sleepy-rain-116521.mp3',                      name:'Sleepy Rain',        by:'Lorenzo Buczek' }
  ];
  var audio = null, idx = -1, vol = 0.6, playing = false;

  function ensure(){
    if(audio) return audio;
    audio = new Audio();
    audio.preload = 'none';
    audio.volume = vol;
    audio.addEventListener('ended', function(){ next(); });
    audio.addEventListener('error', function(){ playing = false; if(onChange) onChange(); });
    return audio;
  }
  var onChange = null;
  function load(i, autoplay){
    ensure();
    idx = (i + TRACKS.length) % TRACKS.length;
    audio.src = TRACKS[idx].file;
    if(autoplay){ audio.play().then(function(){ playing = true; if(onChange) onChange(); })
                      .catch(function(){ playing = false; if(onChange) onChange(); }); }
    if(onChange) onChange();
  }
  function play(){
    ensure();
    if(idx < 0){ load(0, true); return; }
    audio.play().then(function(){ playing = true; if(onChange) onChange(); })
         .catch(function(){ playing = false; if(onChange) onChange(); });
  }
  function pause(){ if(audio){ audio.pause(); playing = false; if(onChange) onChange(); } }
  function toggle(){ playing ? pause() : play(); }
  function next(){ load(idx + 1, true); }
  function prev(){ load(idx - 1, true); }
  function setVolume(v){ vol = Math.max(0, Math.min(1, v)); if(audio) audio.volume = vol; }
  function getVolume(){ return vol; }
  function isPlaying(){ return playing; }
  function current(){ return idx >= 0 ? TRACKS[idx] : null; }
  function currentIndex(){ return idx; }
  function stop(){ if(audio){ audio.pause(); audio.currentTime = 0; playing = false; if(onChange) onChange(); } }
  function setOnChange(fn){ onChange = fn; }
  function snapshot(){ return { index:idx, playing:playing, volume:vol }; }
  function restore(s){
    if(!s) return;
    if(typeof s.volume === 'number') setVolume(s.volume);
    if(typeof s.index === 'number' && s.index >= 0) load(s.index, !!s.playing);
  }
  return { TRACKS:TRACKS, load:load, play:play, pause:pause, toggle:toggle, next:next, prev:prev,
           setVolume:setVolume, getVolume:getVolume, isPlaying:isPlaying, current:current,
           currentIndex:currentIndex, stop:stop, setOnChange:setOnChange,
           snapshot:snapshot, restore:restore };
})();

// ---- Ambient UI ----
var AMB_META = {
  rain:   { icon:'🌧️', name:'Rain' },
  wind:   { icon:'🍃', name:'Wind' },
  leaves: { icon:'🌳', name:'Leaves' },
  birds:  { icon:'🐦', name:'Birdsong' },
  night:  { icon:'🌙', name:'Night / crickets' },
  fire:   { icon:'🔥', name:'Fireplace' },
  waves:  { icon:'🌊', name:'Ocean waves' }
};
var ambBtn = document.getElementById('ambBtn');
var ambPanel = document.getElementById('ambPanel');
var ambViewEl = document.getElementById('ambView');
var ambVolEl = document.getElementById('ambVol');
var ambVolLblEl = document.getElementById('ambVolLbl');
var ambTabAmb = document.getElementById('ambTabAmb');
var ambTabMus = document.getElementById('ambTabMus');
var ambPanelOpen = false;
var ambTab = 'amb';   // 'amb' | 'mus'

function renderAmbView(){
  if(ambTab === 'amb') renderAmbLayers(); else renderMusic();
  ambTabAmb.classList.toggle('active', ambTab === 'amb');
  ambTabMus.classList.toggle('active', ambTab === 'mus');
  if(ambTab === 'amb'){
    ambVolLblEl.textContent = 'master';
    ambVolEl.value = Math.round(AmbientSound.getVolume()*100);
  } else {
    ambVolLblEl.textContent = 'music';
    ambVolEl.value = Math.round(Music.getVolume()*100);
  }
}

function renderAmbLayers(){
  ambViewEl.innerHTML = '';
  var ttl = document.createElement('div'); ttl.className='amb-ttl'; ttl.textContent='Layer the sounds you like';
  ambViewEl.appendChild(ttl);
  AmbientSound.LAYERS.forEach(function(id){
    var m = AMB_META[id];
    var on = AmbientSound.isOn(id);
    var row = document.createElement('div');
    row.className = 'amb-row' + (on ? ' on' : '');
    row.innerHTML = '<span class="amb-ic">'+m.icon+'</span><span class="amb-nm">'+m.name+
                    '</span><span class="amb-state">'+(on?'ON':'OFF')+'</span>';
    row.addEventListener('click', function(){
      var next = !AmbientSound.isOn(id);
      AmbientSound.setLayer(id, next);
      updateAmbBtn(); saveSlot(); renderAmbLayers();
    });
    ambViewEl.appendChild(row);

    // per-layer volume, shown only while that layer is on
    var sub = document.createElement('div');
    sub.className = 'amb-sub' + (on ? ' show' : '');
    var lab = document.createElement('span'); lab.textContent = 'vol';
    var sld = document.createElement('input'); sld.type='range'; sld.min='0'; sld.max='100';
    sld.value = Math.round(AmbientSound.getLayerVolume(id)*100);
    sld.addEventListener('input', function(){ AmbientSound.setLayerVolume(id, sld.value/100); });
    sld.addEventListener('change', saveSlot);
    sub.appendChild(lab); sub.appendChild(sld);
    ambViewEl.appendChild(sub);
  });
}

function renderMusic(){
  ambViewEl.innerHTML = '';
  var cur = Music.current();
  var now = document.createElement('div'); now.className = 'mus-now';
  now.innerHTML = '<div class="mus-nm">'+(cur ? cur.name : 'Nothing playing')+'</div>' +
                  '<div class="mus-by">'+(cur ? cur.by : 'pick a track below')+'</div>';
  var ctrl = document.createElement('div'); ctrl.className = 'mus-ctrl';
  var prev = document.createElement('button'); prev.textContent = '⏮';
  var play = document.createElement('button'); play.className = 'mus-play';
  play.textContent = Music.isPlaying() ? '❚❚' : '▶';
  var next = document.createElement('button'); next.textContent = '⏭';
  prev.addEventListener('click', function(){ Music.prev(); });
  next.addEventListener('click', function(){ Music.next(); });
  play.addEventListener('click', function(){ Music.toggle(); });
  ctrl.appendChild(prev); ctrl.appendChild(play); ctrl.appendChild(next);
  now.appendChild(ctrl);
  ambViewEl.appendChild(now);

  var list = document.createElement('div'); list.className = 'mus-list';
  Music.TRACKS.forEach(function(t, i){
    var it = document.createElement('div');
    it.className = 'mus-item' + (i === Music.currentIndex() ? ' active' : '');
    it.innerHTML = t.name + ' <span class="mus-i-by">· '+t.by+'</span>';
    it.addEventListener('click', function(){ Music.load(i, true); });
    list.appendChild(it);
  });
  ambViewEl.appendChild(list);
}

Music.setOnChange(function(){
  updateAmbBtn();
  if(ambPanelOpen && ambTab === 'mus') renderMusic();
  saveSlot();
});

function updateAmbBtn(){
  ambBtn.classList.toggle('playing', AmbientSound.activeList().length > 0 || Music.isPlaying());
}
function toggleAmbPanel(force){
  ambPanelOpen = (force != null) ? force : !ambPanelOpen;
  ambPanel.classList.toggle('show', ambPanelOpen);
  if(ambPanelOpen) renderAmbView();
}
ambBtn.addEventListener('click', function(){ toggleAmbPanel(); });
ambTabAmb.addEventListener('click', function(){ ambTab = 'amb'; renderAmbView(); });
ambTabMus.addEventListener('click', function(){ ambTab = 'mus'; renderAmbView(); });
ambVolEl.addEventListener('input', function(){
  if(ambTab === 'amb') AmbientSound.setVolume(ambVolEl.value/100);
  else Music.setVolume(ambVolEl.value/100);
});
ambVolEl.addEventListener('change', saveSlot);
// The panel stays open while you layer sounds / pick tracks.
// It only closes when you press the ♪ button again (or hit Esc / 'm').
window.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && ambPanelOpen && !editing && !nbOpen){ toggleAmbPanel(false); }
});
// 'm' toggles the sound panel
window.addEventListener('keydown', function(e){
  if((e.key === 'm' || e.key === 'M') && gameActive && !editing && !nbOpen &&
     !(e.target && e.target.classList && e.target.classList.contains('nb-answer'))){
    toggleAmbPanel();
  }
});

