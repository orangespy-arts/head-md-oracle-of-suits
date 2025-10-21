let x;
let y;

function setup() {
    createCanvas(windowWidth, windowHeight);
    
    x = width / 2;
    y = height / 2;
    noFill();
    background(25);

}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function draw() {
    stroke(255);
    circle(x, y, 50)
    x += random(-1, 1);
    y += random(-1, 1);

    circle(x+100, y+10, 50)
    x += random(-1, 1);
    y += random(-1, 1);
    print("x = " + x);

}

function mousePressed() {
    x = mouseX;
    y = mouseY;
}