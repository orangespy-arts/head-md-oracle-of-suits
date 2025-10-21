class Planet {
    constructor(posX, posY, diameter, color, strokeColor, transparency) {
        this.posX = posX;
        this.posY = posY;  
        this.diameter = diameter;
        this.color = color;
        this.strokeColor = strokeColor;
        this.transparency = transparency;
    }
    
    draw() {
        fill(this.color);
        noStroke();
        fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], this.transparency);
        this.posX += random(-1, 1);
        this.posY += random(-1, 1);
        ellipse(this.posX, this.posY, this.diameter);
    }
}

let planets = [];

function setup() {
    createCanvas(windowWidth, windowHeight)
}

function windowResized(){
    resizeCanvas(windowWidth, windowHeight)
}

function draw(){
    background(255)
    //draw a sun in the center
    
    
    // ellipse(width/2, height/2, 150);

    //make all planets orbit around the sun when i added them, with a 

    for (let planet of planets) {
        planet.posX += random(-1, 1);
        planet.posY += random(-1, 1);
        planet.draw();
    }
}

function mouseDragged() {
    let newPlanet = new Planet(mouseX, mouseY, random(20, 100), color(random(255), random(255), random(255)), color(0));
    planets.push(newPlanet);
}

function keyPressed() {
  // DEL: Clear drawing canvas
  if (key == 'd' || key == 'D') {
    background(255);
    planets = [];
  }
  // S: Save image
  if (key == 's' || key == 'S') {
    saveCanvas('random_walk', 'png');
  }
}