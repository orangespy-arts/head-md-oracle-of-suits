// create an empty Blendshape class
class Blendshape {
  constructor(name, sound) {
    this.name = name;
    this.sound = sound;
    this.score = 0.0;
    this.threshold = 0.5;
    this.state = false;
    this.didChange = false;
  }

  update() {
    // if we have changed state
    if(this.didChange) {
        // play the sound
        hit(this.sound);
    }
  }

}



// blendshape helper functions

function updateBlendshapeScores() {
  // for each blendshape we want to track
  for(let blendshape of blendshapes) {
    // get its score from MediaPipe results
    let score = getBlendshapeScore(blendshape.name);
    blendshape.score = score;
    // check if the blendshape state has changed
    let previousState = blendshape.state;
    blendshape.state = (score > blendshape.threshold);
    blendshape.didChange = (blendshape.state !== previousState);
  }
  // for each blendshape, update it
  for(let blendshape of blendshapes) {
    blendshape.update();
  }
}




function showBlendshapeScores() {
  // create a text message
  let message = "";
  // for each blendshape we want to track
  for(let blendshape of blendshapes) {
    // show its score on screen
    message += blendshape.name
            + " - " + nf(blendshape.score, 1, 2) 
            + " - " + blendshape.state
            + "\n";
  }
  // draw the message on screen
  fill(255);
  textSize(16);
  textAlign(LEFT, TOP);
  text(message, 10, videoElement.height + 10);
}

