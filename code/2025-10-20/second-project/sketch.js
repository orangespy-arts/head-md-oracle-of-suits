function setup() {
  // create a canvas fill the entire window
  createCanvas(windowWidth, windowHeight);
  //set the background color to pink

}

function draw() {

  background(255, 192, 203);
  for (let i = 0; i < 150; i++) {
    noFill();
    // stroke(0, 102, 153, 255 - i * 25);
    ellipse(width / 2, height / 2, 10 + i * 10);
  }


  translate(mouseX - width / 2, mouseY - height / 2);
  for (let i = 0; i < 150; i++) {
    noFill();
    // stroke(0, 102, 153, 255 - i * 25);
    ellipse(width / 2, height / 2, 10 + i * 10);
  }
}

//create a function resize the canvas when the window is resized
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
