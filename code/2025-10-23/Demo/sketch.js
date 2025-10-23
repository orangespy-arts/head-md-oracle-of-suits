// the blendshapes we are going to track
let leftEyeBlink = 0.0;
let rightEyeBlink = 0.0;
let jawOpen = 0.0;
// background audio
let phoneSound;
let phoneSoundStarted = false;
// plain HTML audio element for autoplaying muted background playback
let bgAudioElement = null;
// word particle system
const wordPool = ['hello','flow','whisper','echo','sound','word','whoa','open','voice','drip','hush','tell','say','sing'];
let particles = [];
let mouthCenter = null; // {x,y} updated by drawMouthStructure

function setup() {
  // full window canvas
  const cnv = createCanvas(windowWidth, windowHeight);
  // ensure canvas fills the viewport and sits behind UI
  cnv.style('position', 'fixed');
  cnv.style('top', '0');
  cnv.style('left', '0');
  cnv.style('z-index', '0');
  pixelDensity(displayDensity());
  // initialize MediaPipe
  setupFace();
  setupVideo(true, 640*1.5, 480*1.5);

  // grab the background audio element (autoplay muted) so we can control volume
  bgAudioElement = document.getElementById('bgAudio');

  // Try to unmute the HTML audio and start p5.sound immediately.
  // Note: browsers may block audible playback until a user gesture.
  if (bgAudioElement) {
    try { bgAudioElement.muted = false; } catch(e) { /* ignore */ }
    bgAudioElement.play().catch(() => {
      console.warn('bgAudio.play() rejected — autoplay likely blocked');
    });
  }

  if (phoneSound && !phoneSoundStarted) {
    try {
      phoneSound.setLoop(true);
      phoneSound.play();
      phoneSoundStarted = true;
    } catch (e) {
      console.warn('p5.sound play blocked until user gesture');
    }
  }

  // Try to ensure the HTML audio is playing (autoplay muted). If the
  // promise rejects, it's fine — browsers may still autoplay muted.
  if (bgAudioElement) {
    bgAudioElement.play().catch(() => {});
  }

  // Attempt to start p5 phoneSound automatically. This may be blocked until
  // a user gesture due to autoplay policies; if so it will remain muted until
  // the user clicks and mousePressed() handles that.
  if (phoneSound && !phoneSoundStarted) {
    try {
      phoneSound.setLoop(true);
      phoneSound.play();
      phoneSoundStarted = true;
    } catch (e) {
      // blocked until user gesture
      // console.warn('p5.sound blocked until user gesture');
    }
  }
}

// spawn a word particle at the mouth center
function spawnWordParticle(pos) {
  const w = random(wordPool);
  const angle = random(-PI / 2 - 0.6, -PI / 2 + 0.6); // mostly upward
  const speed = random(0.5, 2.0) * map(jawOpen, 0, 0.6, 0.5, 1.5);
  const size = random(12, 20) * map(jawOpen, 0, 0.6, 0.8, 1.6);
  particles.push({
    word: w,
    x: pos.x,
    y: pos.y,
    vx: cos(angle) * speed + random(-0.3, 0.3),
    vy: sin(angle) * speed + random(-0.3, 0.3),
    ax: 0,
    ay: -0.02, // slight upward acceleration
    size,
    life: 2.0,
    maxLife: 2.0,
    alpha: 1
  });
}

// tiny map helper (same as p5.map but available even if called outside)
function map(v, a, b, c, d) {
  return c + (d - c) * ((v - a) / (b - a));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
 // get detected faces
  let faces = getFaceLandmarks();

  // see blendshapes.txt for full list of possible blendshapes
  leftEyeBlink = getBlendshapeScore('eyeBlinkLeft');
  // read jaw open blendshape so we can drive audio volume
  jawOpen = getBlendshapeScore('jawOpen');
  // clear the canvas
  background(128);
  
  
  if (isVideoReady()) {
    // show video frame
    image(videoElement, 0, 0);
  }

  
  
  // draw the left eye blink value
  fill(255);
  textSize(32);
  textAlign(LEFT, TOP);
  // text('Left Eye Blink: ' + leftEyeBlink.toFixed(2), 10, 10);
  // draw jaw open value for debugging
  text('Speak Volume: ' + jawOpen.toFixed(2), 10, 50);

  // draw audio status / instructions
  // const audioStatus = phoneSoundStarted ? 'Audio: unlocked — playing' : 'Audio: locked — click/tap to enable';
  textSize(20);
  // text(audioStatus, 10, 90);
  // draw mouth structure
  drawMouthStructure(faces);
  // spawn word particles when jawOpen is above a small threshold
  if (mouthCenter && jawOpen > 0.08) {
    // spawn rate proportional to jawOpen
    const rate = Math.ceil(map(jawOpen, 0.08, 0.6, 1, 6));
    for (let i = 0; i < rate; i++) spawnWordParticle(mouthCenter);
  }

  // update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vx += p.ax; p.vy += p.ay;
    p.x += p.vx; p.y += p.vy;
    p.life -= deltaTime / 1000;
    p.alpha = Math.max(0, p.life / p.maxLife);
    fill(255, 255 * p.alpha);
    noStroke();
    textSize(p.size);
    textAlign(CENTER, CENTER);
    text(p.word, p.x, p.y);
    if (p.life <= 0) particles.splice(i, 1);
  }
  // update audio volume based on jaw openness
  updateSound();

}

//use the sound sources/Telephone-Audio.mp3 file
//draw the mouth structure based on the face detected

function drawMouthStructure(faces) {
  if (!faces || faces.length === 0) return;

  // Use MediaPipe connector rings for lips if available
  const rings = getFeatureRings('FACE_LANDMARKS_LIPS');
  if (!rings || !rings.length) return;

  // rings[0] = outer lip ring, rings[1] = inner lip ring/hole (if present)
  // Each ring is an array of pixel {x,y} points because we call with default toPixels=true
  const outer = rings[0];
  const inner = rings[1] || null;

  // Draw outer lip outline
  stroke(255, 0, 0);
  strokeWeight(2);
  noFill();
  beginShape();
  for (const p of outer) vertex(p.x, p.y);
  endShape(CLOSE);
  // compute centroid of outer ring for mouth center
  let ocx = 0, ocy = 0;
  for (const p of outer) { ocx += p.x; ocy += p.y; }
  ocx /= outer.length; ocy /= outer.length;
  mouthCenter = { x: ocx, y: ocy };

  // Draw inner lip (mouth hole) and optionally scale it by jawOpen to simulate opening
  if (inner && inner.length) {
    // compute a simple scale factor from jawOpen
    const scale = 1 + Math.max(0, Math.min(1, jawOpen / 0.6)) * 0.6; // 1.0 - 1.6

    // compute centroid to scale around
    let cx = 0, cy = 0;
    for (const p of inner) { cx += p.x; cy += p.y; }
    cx /= inner.length; cy /= inner.length;

    // draw scaled inner ring filled (dark) to indicate open mouth
    stroke(255, 0, 0);
    noFill();
    beginShape();
    for (const p of inner) {
      const sx = cx + (p.x - cx) * scale;
      const sy = cy + (p.y - cy) * scale;
      vertex(sx, sy);
    }
    endShape(CLOSE);
  }
  //draw random words on the canvas from the center of the mouth
  

}


function preload() {
  // loadSound uses the path relative to index.html
  // provide success and error callbacks to help debugging
  phoneSound = loadSound('sources/talking.mp3',
    () => { console.log('p5: talking.mp3 loaded'); },
    (err) => { console.error('p5: loadSound failed', err); }
  );
}
//when the mouth is open,make the sound louder based on jawOpen value
function updateSound() {
  // only adjust volume after the sound has been started/unlocked
  // Map jawOpen to volume 0..1
  const maxJaw = 0.6;
  let vol = jawOpen / maxJaw;
  vol = Math.max(0, Math.min(1, vol));

  // Update p5.Sound if started
  if (phoneSound && phoneSoundStarted) {
    phoneSound.setVolume(vol, 0.05);
  }

  // Update HTML audio element (immediate set — no fade API)
  if (bgAudioElement) {
    // If the element is muted (autoplay requirement) we still set volume so
    // when unmuted it will reflect jawOpen. Volume range is 0..1.
    bgAudioElement.volume = vol;
  }
}
//change this function to play the sound when the program is running，not only when mouse is pressed

function mousePressed() {
  // unlock audio on user gesture
  // unmute the HTML audio element so playback becomes audible
  if (bgAudioElement) {
    bgAudioElement.muted = false;
  }

  userStartAudio().then(() => {
    if (phoneSound && !phoneSoundStarted) {
      // loop the sound so it plays continuously
      phoneSound.setLoop(true);
      phoneSound.play();
      phoneSoundStarted = true;
    }
  });
}

