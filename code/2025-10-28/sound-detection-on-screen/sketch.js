// sketch.js

let bgImg;

// Hand detection globals
let leftHandDetected = false;
let rightHandDetected = false;
let leftIndexPos = null;
let rightIndexPos = null;

// Color feedback
let leftHoverColor = "Unknown";
let rightHoverColor = "Unknown";

// Gibberish engine
let engine = null;
// mapping from detected color -> engine channel key
const COLOR_TO_CHANNEL = {
  gold: 'coin',    // 金色 -> ChannelCoin
  brown: 'leaf',   // 棕色 -> ChannelLeaf
  red: 'glass',    // 红色 -> ChannelGlass
  gray: 'metal',   // 灰色 -> ChannelMetal
};

// base frequencies per channel (used when mapping X -> pitch)
const BASE_FREQ = {
  coin: 880,
  leaf: 220,
  glass: 660,
  metal: 150
};

function preload() {
  // Adjust path depending on where your image is relative to HTML
  bgImg = loadImage('proto1.png');
}

function setup() {
  // use fixed size canvas matching video
  const w = 640, h = 480;
  const canvas = createCanvas(w, h);
  const wrap = select('#canvas-wrap');
  if (wrap) canvas.parent('canvas-wrap');

  // color detector targets (match HandMapper expectations)
  cd = new ColorDetector([
    { name: 'gold', color: '#ffd700', tolerance: 90 },
    { name: 'brown', color: '#8b5a2b', tolerance: 90 },
    { name: 'red', color: '#ff4d4d', tolerance: 90 },
    { name: 'gray', color: '#9ea0a0', tolerance: 90 }
  ]);

  // setup MediaPipe hands & video
  setupHands();
  setupVideo(w, h, true);

  // engine + mapper
  engine = new GibberishEngine();
  mapper = new HandMapper(engine, cd);

  // offscreen canvas for sampling video pixels
  window._off = document.createElement('canvas');
  window._off.width = w;
  window._off.height = h;
  window._offCtx = window._off.getContext('2d');

  select('#status').html('状态：准备中，等待摄像头/手部检测');

  // ensure audio can start on user gesture
  createStartAudioHint();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(20);
  if (!isVideoReady()) { fill(200); text('等待摄像头…', 20, 30); return; }

  // draw video
  image(videoElement, 0, 0, width, height);

  // draw hand landmarks if available
  if (detections && detections.multiHandLandmarks && detections.multiHandLandmarks.length > 0) {
    const hand = detections.multiHandLandmarks[0];
    const mark = hand[FINGER_TIPS.index];
    const px = Math.floor(mark.x * width), py = Math.floor(mark.y * height);

    // sample pixel from video using offscreen canvas (use videoElement.elt)
    try {
      window._offCtx.drawImage(videoElement.elt, 0, 0, window._off.width, window._off.height);
      const id = window._offCtx.getImageData(px, py, 1, 1).data;
      const pixel = { r: id[0], g: id[1], b: id[2], a: id[3] };

      // map to engine via HandMapper
      mapper.sampleAt(mark.x, mark.y, pixel);

      // HUD
      noStroke(); fill(255, 240, 0); ellipse(mark.x * width, mark.y * height, 14, 14);
      fill(255); textSize(12); text(`(${px},${py})`, mark.x * width + 12, mark.y * height + 6);
      select('#status').html('检测中：手部就绪');
    } catch (e) { console.warn('sample error', e); }
  } else {
    engine && engine.sweep && engine.sweep(900);
    select('#status').html('未检测到手部');
  }
}

// === Overlay UI ===
function drawColorOverlay() {
  const pad = 12;
  const lines = [
    `Left: ${leftHoverColor}`,
    `Right: ${rightHoverColor}`
  ];

  textSize(18);
  textAlign(RIGHT, BOTTOM);

  let boxW = max(textWidth(lines[0]), textWidth(lines[1])) + pad * 2;
  let boxH = lines.length * 22 + pad;

  noStroke();
  fill(0, 150);
  rect(width - boxW - 20, height - boxH - 20, boxW, boxH, 8);

  fill(255);
  for (let i = 0; i < lines.length; i++) {
    text(
      lines[i],
      width - 20 - pad / 2,
      height - 20 - (lines.length - 1 - i) * 22 - pad / 2
    );
  }
}

// ----------------- Audio mapping helpers -----------------
function normPosFromCanvas(pos) {
  return { x: constrain(pos.x / width, 0, 1), y: constrain(pos.y / height, 0, 1) };
}

function mapToFreq(channelKey, normX) {
  const base = BASE_FREQ[channelKey] || 220;
  // map normX (0..1) to -1..+1 octave (2 octaves range)
  const octaveOffset = (normX - 0.5) * 2; // -1..1
  return base * Math.pow(2, octaveOffset);
}

function mapToIntensity(normY) {
  // invert Y so top = louder/brighter if desired
  return constrain(lerp(0.15, 1.0, 1 - normY), 0.02, 1);
}

// update engine when a hand is over a color
function updateEngineForHand(handSide, hoverColor, pos) {
  if (!engine) {
    console.log('[audio-debug] no engine available');
    return;
  }
  if (!hoverColor) return;

  const key = (typeof hoverColor === 'string') ? hoverColor.toLowerCase() : '';
  const channel = COLOR_TO_CHANNEL[key];
  if (!channel) {
    // if color not mapped, ensure any previously active channel for this hand is turned off
    stopEngineChannelForHand(handSide, null);
    return;
  }

  const norm = normPosFromCanvas(pos);
  const freq = mapToFreq(channel, norm.x);
  const intensity = mapToIntensity(norm.y);

  console.log(`[audio-debug] hand=${handSide} color=${hoverColor} -> channel=${channel} freq=${freq.toFixed(1)} int=${intensity.toFixed(2)} x=${norm.x.toFixed(2)} y=${norm.y.toFixed(2)}`);

  // ensure audio context exists and is resumed
  try {
    if (engine.ensure) engine.ensure();
    if (engine.ctx && engine.ctx.state === 'suspended') engine.ctx.resume().then(()=>{
      console.log('[audio-debug] resumed audio context');
    }).catch(e=>console.warn('[audio-debug] resume failed', e));
  } catch(e) {
    console.warn('[audio-debug] engine.ensure/resume error', e);
  }

  // pass params object; engine implementation decides what to use
  try {
    engine.triggerOn(channel, { freq: freq, intensity: intensity, x: norm.x, y: norm.y, hand: handSide });
  } catch (e) {
    console.error('[audio-debug] triggerOn error', e);
  }

  // store last-hand-to-channel mapping to allow turn-off when hand leaves or color changes
  if (!window._handChannelMap) window._handChannelMap = {};
  window._handChannelMap[handSide] = channel;
}

// stop engine channel previously associated with a hand
function stopEngineChannelForHand(handSide, currentHoverColor) {
  if (!engine) return;
  if (!window._handChannelMap) return;
  const prev = window._handChannelMap[handSide];
  if (!prev) return;

  // if currentHoverColor maps to same channel, keep it; otherwise stop
  const currentKey = (typeof currentHoverColor === 'string') ? currentHoverColor.toLowerCase() : '';
  const currentChannel = COLOR_TO_CHANNEL[currentKey];
  if (currentChannel === prev) return;

  engine.triggerOff(prev);
  delete window._handChannelMap[handSide];
}

// ----- helper: show a small hint button to enable audio (user gesture) -----
function createStartAudioHint() {
  const btn = createButton('Enable Audio');
  btn.position(20, 20);
  btn.style('padding', '8px 12px');
  btn.mousePressed(() => {
    if (!engine) {
      if (typeof GibberishEngine !== 'undefined') engine = new GibberishEngine();
      else return;
    }
    if (engine.ensure) engine.ensure(); // create/resume AudioContext inside engine
    // play a quick test tone so user hears immediate feedback
    testTone();
    // remove hint
    btn.remove();
  });

  const testBtn = createButton('Play Test Tone');
  testBtn.position(20, 56);
  testBtn.style('padding', '6px 10px');
  testBtn.mousePressed(()=>{
    // ensure engine exists
    if (!engine && typeof GibberishEngine !== 'undefined') engine = new GibberishEngine();
    if (engine && engine.ensure) engine.ensure();
    testTone();
  });
}

// quick test tone (independent small AudioContext or reuse engine.ctx)
function testTone() {
  try {
    const Ctx = (engine && engine.ctx) ? engine.ctx : (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) { console.warn('[audio-debug] No AudioContext available'); return; }

    if (engine && engine.ctx) {
      // use existing engine context
      const ctx = engine.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 440;
      g.gain.value = 0.0001;
      o.connect(g); g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      o.stop(now + 0.75);
      console.log('[audio-debug] played test tone via engine.ctx');
      return;
    }

    // create a temporary audio context for test
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 440;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    o.stop(now + 0.75);
    console.log('[audio-debug] played test tone via new AudioContext');
  } catch (e) {
    console.error('[audio-debug] testTone failed', e);
  }

}
