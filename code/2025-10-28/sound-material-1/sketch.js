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

// audio engine
let engine = null;

// mapping color -> channel name used by gibberish.js
const COLOR_TO_CHANNEL = { gold: 'coin', brown: 'leaf', red: 'glass', gray: 'metal' };

function preload() {
  // Adjust path depending on where your image is relative to HTML
  bgImg = loadImage('proto1.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Initialize MediaPipe
  setupHands();
  setupVideo();

  // create engine lazily; user gesture required to resume audio
  if (typeof GibberishEngine !== 'undefined') engine = new GibberishEngine();

  createStartAudioHint();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // --- Draw background ---
  if (bgImg) {
    push();
    tint(255, 230); // add light transparency so hands stand out
    image(bgImg, 0, 0, width, height);
    pop();
  } else {
    background(255);
  }

  strokeWeight(2);

  // Reset flags
  leftHandDetected = false;
  rightHandDetected = false;
  leftIndexPos = null;
  rightIndexPos = null;

  // --- Process MediaPipe detections ---
  if (detections && detections.multiHandLandmarks && detections.multiHandLandmarks.length > 0) {
    for (let i = 0; i < detections.multiHandLandmarks.length; i++) {
      try {
        let hand = detections.multiHandLandmarks[i];
        let handedness = (detections.multiHandedness && detections.multiHandedness[i] && detections.multiHandedness[i].label) ? detections.multiHandedness[i].label : 'Unknown';
        // ensure FINGER_TIPS exists and index landmark present
        const tipIdx = (typeof FINGER_TIPS !== 'undefined' && FINGER_TIPS.index !== undefined) ? FINGER_TIPS.index : 8;
        let indexTip = hand && hand[tipIdx];
        if (!indexTip) continue;

        let fingerPos = {
          x: indexTip.x * width,
          y: indexTip.y * height
        };

        // Store position
        if (handedness === 'Left') {
          leftHandDetected = true;
          leftIndexPos = fingerPos;
        } else if (handedness === 'Right') {
          rightHandDetected = true;
          rightIndexPos = fingerPos;
        }

        // Draw index tip & connections where possible
        try { drawIndex(hand); } catch(e) { /* ignore draw errors */ }
        try { drawConnections(hand); } catch(e) { /* ignore draw errors */ }
      } catch (e) {
        console.warn('[sketch] error processing hand', e);
      }
    }
  }

  // --- Color detection for fingers ---
  if (leftIndexPos) {
    try {
      if (!bgImg) { leftHoverColor = 'Unknown'; }
      else {
        let imgPt = canvasToImageCoords(leftIndexPos.x, leftIndexPos.y, bgImg, width, height);
        let avgRgb = sampleAvgColor(bgImg, imgPt.x, imgPt.y, 5);
        leftHoverColor = detectColor(rgbToHsv(...avgRgb));
        console.debug('[sketch] left sample', avgRgb, '->', leftHoverColor);
        // trigger engine for left hand
        updateEngineForHand('left', leftHoverColor, leftIndexPos);
      }
    } catch (e) { console.warn('[sketch] left sampling error', e); leftHoverColor = 'Unknown'; }
  } else {
    leftHoverColor = "Unknown";
  }

  if (rightIndexPos) {
    try {
      if (!bgImg) { rightHoverColor = 'Unknown'; }
      else {
        let imgPt = canvasToImageCoords(rightIndexPos.x, rightIndexPos.y, bgImg, width, height);
        let avgRgb = sampleAvgColor(bgImg, imgPt.x, imgPt.y, 5);
        rightHoverColor = detectColor(rgbToHsv(...avgRgb));
        console.debug('[sketch] right sample', avgRgb, '->', rightHoverColor);
        // trigger engine for right hand
        updateEngineForHand('right', rightHoverColor, rightIndexPos);
      }
    } catch (e) { console.warn('[sketch] right sampling error', e); rightHoverColor = 'Unknown'; }
  } else {
    rightHoverColor = "Unknown";
  }

  // --- Draw text feedback ---
  drawColorOverlay();
}

// ----------------- Audio mapping helpers -----------------
function normPosFromCanvas(pos) {
  return { x: constrain(pos.x / width, 0, 1), y: constrain(pos.y / height, 0, 1) };
}

function mapToFreq(channelKey, normX) {
  const base = { coin:880, leaf:220, glass:660, metal:150 }[channelKey] || 220;
  const octaveOffset = (normX - 0.5) * 2; // -1..1
  return base * Math.pow(2, octaveOffset);
}

function mapToIntensity(normY) {
  return constrain(lerp(0.15, 1.0, 1 - normY), 0.02, 1);
}

function updateEngineForHand(handSide, hoverColor, pos) {
  if (!engine) return;
  if (!hoverColor) return;

  const key = (typeof hoverColor === 'string') ? hoverColor.toLowerCase() : '';
  let normalized = key;
  if (normalized === 'silver') normalized = 'gray';
  if (normalized === 'unknown') { stopEngineChannelForHand(handSide, null); return; }

  const channel = COLOR_TO_CHANNEL[normalized];
  if (!channel) { stopEngineChannelForHand(handSide, null); return; }

  const norm = normPosFromCanvas(pos);
  const freq = mapToFreq(channel, norm.x);
  const intensity = mapToIntensity(norm.y);

  try { if (engine.ensure) engine.ensure(); if (engine.ctx && engine.ctx.state === 'suspended') engine.ctx.resume(); } catch(e) { console.warn('audio resume err', e); }

  try { engine.triggerOn(channel, { freq: freq, intensity: intensity, x: norm.x, y: norm.y, hand: handSide }); } catch(e){ console.error('triggerOn error', e); }

  if (!window._handChannelMap) window._handChannelMap = {};
  window._handChannelMap[handSide] = channel;
}

function stopEngineChannelForHand(handSide, currentHoverColor) {
  if (!engine) return;
  if (!window._handChannelMap) return;
  const prev = window._handChannelMap[handSide];
  if (!prev) return;
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
    if (!engine && typeof GibberishEngine !== 'undefined') engine = new GibberishEngine();
    if (engine && engine.ensure) engine.ensure();
    testTone();
    btn.remove();
  });

  const testBtn = createButton('Play Test Tone');
  testBtn.position(20, 56);
  testBtn.style('padding', '6px 10px');
  testBtn.mousePressed(()=>{ if (!engine && typeof GibberishEngine !== 'undefined') engine = new GibberishEngine(); if (engine && engine.ensure) engine.ensure(); testTone(); });
}

function testTone() {
  try {
    const Ctx = (engine && engine.ctx) ? engine.ctx : (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) { console.warn('[audio-debug] No AudioContext available'); return; }
    if (engine && engine.ctx) {
      const ctx = engine.ctx; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type='sine'; o.frequency.value = 440; g.gain.value = 0.0001; o.connect(g); g.connect(ctx.destination); const now = ctx.currentTime; g.gain.exponentialRampToValueAtTime(0.18, now + 0.01); o.start(now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7); o.stop(now + 0.75); return; }
    const ctx = new Ctx(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.type='sine'; o.frequency.value = 440; g.gain.value = 0.0001; o.connect(g); g.connect(ctx.destination); const now = ctx.currentTime; g.gain.exponentialRampToValueAtTime(0.18, now + 0.01); o.start(now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7); o.stop(now + 0.75);
  } catch (e) { console.error('[audio-debug] testTone failed', e); }
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
