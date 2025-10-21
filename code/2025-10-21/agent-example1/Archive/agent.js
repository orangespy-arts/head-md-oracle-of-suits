var posX = mouseX
var posY = mouseY
var stepSize = 5
var diameter = 10

function setup(){
    createCanvas(windowWidth, windowHeight)
}

function windowResized(){
    resizeCanvas(windowWidth, windowHeight)
}

function draw(){
    background(25)
    ellipse(posX + stepSize, posY + stepSize, diameter)
}


    