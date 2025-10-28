// object of blendshape names we want to track
let blendshapes = [];
// and what sounds they are going to make (snare, kick, hihat)
blendshapes.push(new Blendshape("jawOpen", "kik"));
blendshapes.push(new Blendshape("eyeBlinkLeft", "snare"));
blendshapes.push(new Blendshape("browInnerUp", "hat"));

function setup() {
  // full window canvas
  createCanvas(windowWidth, windowHeight);
  // initialize MediaPipe
  setupFace();
  setupVideo();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  
  // clear the canvas
  background(128);

  if (isVideoReady()) {
    // show video frame
    image(videoElement, 0, 0);
  }

  // get detected faces
  let faces = getFaceLandmarks();
  // update each blendshape score
  updateBlendshapeScores();
  // show the scores on the screen
  showBlendshapeScores();

}