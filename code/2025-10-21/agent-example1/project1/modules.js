let values = []

function setup() {
    createCanvas(windowWidth, windowHeight)

    // 创建1000个代理
    for (let i = 0; i < 1000; i++){
        values.push(new CircleAgent());
    }   
}

function windowResized(){
    resizeCanvas(windowWidth, windowHeight)
}

function draw(){
    background(255, 20) // 半透明背景产生轨迹
    
    // 遍历每个代理
    for (let agent of values){
        agent.update();   // 更新位置
        agent.display();  // 绘制圆圈
    }
}


function keyReleased() {
    if (key == 'd' || key == 'D') {
        // 重置所有代理
        for (let agent of values) {
            agent.reset();
        }
        background(255);
    }
    if (key == 's' || key == 'S') {
        saveCanvas('agent_trails', 'png');
    }
}