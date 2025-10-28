let cd;
let offCanvas, offCtx;
let lastSpoken = null;
let lastSpokenAt = 0;
const SPEAK_COOLDOWN = 1400; // ms

function setup() {
  // use the same size as the MediaPipe helper (640x480)
  const w = 640;
  const h = 480;
  createCanvas(w, h);
  background(0);

  // create detector for 4 colors
  cd = new ColorDetector([
    { name: 'red', color: 'rgba(228, 15, 15, 1)', tolerance: 90 },
    { name: 'green', color: '#596259ff', tolerance: 90 },
    { name: 'blue', color: '#805500ff', tolerance: 90 },
    { name: 'yellow', color: '#eded07ff', tolerance: 90 },
  ]);

  // setup MediaPipe hands and video
  setupHands();
  setupVideo();

  // offscreen canvas used to sample pixels from videoElement
  offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  offCtx = offCanvas.getContext('2d');
}

function draw() {
  background(0);

  // wait until the MediaPipe video is ready
  if (!isVideoReady()) {
    fill(255);
    textSize(16);
    text('Waiting for camera / MediaPipe...', 20, 30);
    return;
  }

  // draw the video frame to the p5 canvas
  image(videoElement, 0, 0, width, height);

  // also draw to offscreen canvas at native video size for exact sampling
  try {
    offCtx.drawImage(videoElement.elt, 0, 0, offCanvas.width, offCanvas.height);
  } catch (e) {
    // sometimes video not ready for drawing
    return;
  }

  // if we have hand detections, check index fingertip
  if (detections && detections.multiHandLandmarks && detections.multiHandLandmarks.length > 0) {
    // use first detected hand
    const hand = detections.multiHandLandmarks[0];
    const mark = hand[FINGER_TIPS.index];
    const px = Math.round(mark.x * offCanvas.width);
    const py = Math.round(mark.y * offCanvas.height);

    // get pixel color under fingertip
    let pixel = null;
    try {
      const id = offCtx.getImageData(px, py, 1, 1).data;
      pixel = { r: id[0], g: id[1], b: id[2], a: id[3] };
    } catch (e) {
      // ignore
    }

    // draw fingertip marker
    noStroke();
    fill(255, 255, 255, 180);
    ellipse(mark.x * width, mark.y * height, 16, 16);

    if (pixel) {
      const match = cd.matchColor(pixel.r, pixel.g, pixel.b);
      if (match) {
        // show label
        fill(0);
        textSize(16);
        textAlign(LEFT, TOP);
        text(`This is ${match} color on the screen`, mark.x * width + 12, mark.y * height + 12);

        // speak once per cooldown and only when changed
        const now = Date.now();
        if (match !== lastSpoken || now - lastSpokenAt > SPEAK_COOLDOWN) {
          lastSpoken = match;
          lastSpokenAt = now;
          if (window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance(`This is ${match} color on the screen`);
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(u);
          }
        }
      }
    }
  } else {
    // no hands: optional hint
    fill(255);
    textSize(12);
    text('Show your hand (index finger) to the camera to identify color under the fingertip.', 10, height - 24);
  }
}

function windowResized() {
  // keep canvas fixed size for now
}
