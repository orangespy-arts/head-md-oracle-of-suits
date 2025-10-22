// single VertexAgent driven by 5 fingertip control points
let rightHandVertex = null;
let trailGraphics = null; // persistent graphics for trails
const RIGHT_TIP_INDICES = [4, 8, 12, 16, 20];
// control values driven by left-hand index
let hueValue = 0; // 0..360
let morphSpeedMultiplier = 1; // affects shape morph speed
let moveSpeedMultiplier = 0.12; // affects agent movement speed
let opacityValue = 20; // fill opacity (0..255) controlled by left-hand thumb-index distance

function setup() {

  // full window canvas
  createCanvas(windowWidth, windowHeight);

  // persistent graphics layer to keep previous frames' drawings
  trailGraphics = createGraphics(windowWidth, windowHeight);
  trailGraphics.clear();

  // initialize MediaPipe settings
  setupHands();
  // start camera using MediaPipeHands.js helper
  setupVideo();

  // instantiate a single VertexAgent which will be driven by 5 fingertip control points
  // VertexAgent class must be loaded (vertex-agent.js)
  rightHandVertex = new VertexAgent();
  rightHandVertex.formResolution = 30; // more vertices for smoothness
  rightHandVertex.diameter = 100;
  rightHandVertex.speed = 0.12;

}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (trailGraphics) trailGraphics.resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // clear the canvas
  background(0);


  // if the video connection is ready
  if (isVideoReady()) {
    // draw the capture image
    image(videoElement, 0, 0);
  }

  // draw persistent trails first (they sit on top of the video)
  if (trailGraphics) image(trailGraphics, 0, 0);

  // use thicker lines for drawing hand connections
  strokeWeight(2);

  // make sure we have detections to draw
  if (detections) {

    // iterate by index so we can check handedness
    for (let i = 0; i < detections.multiHandLandmarks.length; i++) {
      const hand = detections.multiHandLandmarks[i];

      // friendly-guard: skip if no landmarks
      if (!hand) continue;

      // check handedness (MediaPipe usually provides detections.multiHandedness[i].label)
      const handLabel = detections.multiHandedness && detections.multiHandedness[i] && detections.multiHandedness[i].label;
      // if this is the left hand, show thumb-index connection and use its index fingertip to control color and speed
      if (handLabel && handLabel.toLowerCase() === 'left') {
        drawThumbIndexConnection(hand);
        const vw = (typeof videoElement !== 'undefined' && videoElement.width) ? videoElement.width : width;
        const vh = (typeof videoElement !== 'undefined' && videoElement.height) ? videoElement.height : height;
        const idxLm = hand[FINGER_TIPS.index];
        if (idxLm) {
          const ix = idxLm.x * vw;
          const iy = idxLm.y * vh;
          // vertical (up/down) -> hue (invert so moving up increases hue)
          hueValue = map(iy, vh, 0, 0, 360);
          // horizontal (left/right) -> speed multipliers
          moveSpeedMultiplier = map(ix, 0, vw, 0.01, 0.5);
          morphSpeedMultiplier = map(ix, 0, vw, 0.2, 2);
          // draw a small marker for left-hand index fingertip
          push();
          noStroke();
          fill(0, 0, 100); // bright white (will be interpreted in HSB later if colorMode changed)
          ellipse(ix, iy, 16, 16);
          fill(0);
          textSize(12);
          textAlign(CENTER, CENTER);
          text('L', ix, iy - 18);
          pop();
        }
      }
      if (handLabel && handLabel.toLowerCase() === 'right') {
        const vw = (typeof videoElement !== 'undefined' && videoElement.width) ? videoElement.width : width;
        const vh = (typeof videoElement !== 'undefined' && videoElement.height) ? videoElement.height : height;
          // gather fingertip positions as control points for the single vertex
          const controlPoints = [];
          for (let j = 0; j < RIGHT_TIP_INDICES.length; j++) {
            const tipIndex = RIGHT_TIP_INDICES[j];
            const lm = hand[tipIndex];
            if (!lm) continue;
            const px = lm.x * vw;
            const py = lm.y * vh;
            controlPoints.push({ x: px, y: py });
          }

  // update internal agent motion and draw using the five fingertips as control points
  // require exactly 5 detected fingertips to avoid malformed shapes
  if (rightHandVertex && controlPoints.length === 5) {
          // set vertex center/target to average of control points for subtle motion
          let avgX = 0, avgY = 0;
          for (let p of controlPoints) { avgX += p.x; avgY += p.y; }
          avgX /= controlPoints.length; avgY /= controlPoints.length;
          rightHandVertex.targetX = avgX;
          rightHandVertex.targetY = avgY;
          rightHandVertex.update();
          // draw onto the persistent graphics so shapes remain across frames
          rightHandVertex.drawWithControlPoints(controlPoints, trailGraphics);
        }
      } // end if right hand
    } // end for hands

  } // end of if detections

} // end of draw

// 按 C 清除持久轨迹
function keyPressed() {
  if ((key === 'c' || key === 'C') && trailGraphics) {
    trailGraphics.clear();
  }
}


// drawThumbIndexConnection retained; other helper drawing functions removed per request
function drawThumbIndexConnection(landmarks) {
  if (!landmarks) return;
  const markThumb = landmarks[FINGER_TIPS.thumb];
  const markIndex = landmarks[FINGER_TIPS.index];
  if (!markThumb || !markIndex) return;

  const x1 = markIndex.x * videoElement.width;
  const y1 = markIndex.y * videoElement.height;
  const x2 = markThumb.x * videoElement.width;
  const y2 = markThumb.y * videoElement.height;

  stroke(255);
  line(x1, y1, x2, y2);
}