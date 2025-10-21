// Direction constants
var NORTH = 0;
var NORTHEAST = 1;
var EAST = 2;
var SOUTHEAST = 3;
var SOUTH = 4;
var SOUTHWEST = 5;
var WEST = 6;
var NORTHWEST = 7;

var stepSize = 3;
var diameter = 1;

var posX, posY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(255);
  posX = width / 2;
  posY = height / 2;
}

function draw() {
  for (var i = 0; i <= mouseX; i++) {
    direction = int(random(0, 8));
    
    if (direction == NORTH) {
      posY -= stepSize;
    } else if (direction == NORTHEAST) {
      posX += stepSize;
      posY -= stepSize;
    } else if (direction == EAST) {
      posX += stepSize;
    } else if (direction == SOUTHEAST) {
      posX += stepSize;
      posY += stepSize;
    } else if (direction == SOUTH) {
      posY += stepSize;
    } else if (direction == SOUTHWEST) {
      posX -= stepSize;
      posY += stepSize;
    } else if (direction == WEST) {
      posX -= stepSize;
    } else if (direction == NORTHWEST) {
      posX -= stepSize;
      posY -= stepSize;
    }
    
    // Wrap around edges
    if (posX > width) posX = 0;
    if (posX < 0) posX = width;
    if (posY < 0) posY = height;
    if (posY > height) posY = 0;
    
    ellipse(posX + stepSize / 2, posY + stepSize / 2, diameter, diameter);
  }
}

function keyPressed() {
  // DEL: Clear drawing canvas
  if (key == 'd' || key == 'D') {
    background(255);
    posX = width / 2;
    posY = height / 2;
  }
  // S: Save image
  if (key == 's' || key == 'S') {
    saveCanvas('random_walk', 'png');
  }
}

//Make the canvas full screen
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
