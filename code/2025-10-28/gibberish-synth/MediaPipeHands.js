// Minimal MediaPipe Hands helper (uses p5 capture internally)
// Exposes: videoElement (p5 capture), detections (results), setupHands(), setupVideo(), isVideoReady()

let videoElement = null;
let detections = null;

if (!window.hands) {
  window.hands = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
}
const hands = window.hands;

const FINGER_TIPS = { thumb:4, index:8, middle:12, ring:16, pinky:20 };

function setupHands() {
  hands.setOptions({ maxNumHands: 1, modelComplexity:1, minDetectionConfidence:0.6, minTrackingConfidence:0.5, selfieMode:true });
  hands.onResults(onHandsResults);
}

function onHandsResults(results) {
  detections = results;
}

// creates a p5 capture and a MediaPipe Camera util
function setupVideo(width=640, height=480, selfie=true) {
  videoElement = createCapture(VIDEO, { flipped: selfie });
  videoElement.size(width, height);
  videoElement.hide();

  // MediaPipe Camera util expects DOM video element
  const cam = new Camera(videoElement.elt, {
    onFrame: async () => { await hands.send({ image: videoElement.elt }); },
    width, height
  });
  cam.start();
}

function isVideoReady() {
  return videoElement && videoElement.loadedmetadata;
}

// export to window for other modules
if (typeof window !== 'undefined') {
  window.videoElement = videoElement;
  window.detections = detections;
  window.setupHands = setupHands;
  window.setupVideo = setupVideo;
  window.isVideoReady = isVideoReady;
  window.FINGER_TIPS = FINGER_TIPS;
}
