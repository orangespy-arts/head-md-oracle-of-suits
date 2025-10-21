let values = []

function setup() {
    createCanvas(windowWidth, windowHeight)
    background(255); // 只在开始时清空一次画布

    // 创建1000个代理
    for (let i = 0; i < 10; i++){
        values.push(new IntelligentAgent());
    }   
}

function windowResized(){
    resizeCanvas(windowWidth, windowHeight)
}

function draw(){
    // 不再每帧刷新背景，这样线条会保留
    // background(255, 20) // 半透明背景产生轨迹
    
    // 统计活跃的代理数量
    let activeCount = 0;
    
    // 遍历每个代理
    for (let agent of values){
        if (agent.isAlive()) {
            agent.update();   // 更新位置
            activeCount++;
        }
        agent.display();  // 显示代理状态（停止的代理显示红点）
    }
    
    // 显示信息（带白色背景框）
    fill(255, 240); // 半透明白色背景
    noStroke();
    rect(5, 5, 250, 50);
    
    fill(0); // 黑色文字
    textSize(14);
    textAlign(LEFT);
    text(`Active agents: ${activeCount} / ${values.length}`, 10, 20);
    text(`Mouse X: Speed control`, 10, 40);
    
    // 如果所有代理都停止了
    if (activeCount === 0) {
        fill(255, 0, 0);
        textSize(32);
        textAlign(CENTER);
        text("All agents stopped!", width/2, height/2);
        noLoop(); // 停止动画
    }
}


function keyReleased() {
    if (key == 'd' || key == 'D') {
        // 重置所有代理
        for (let agent of values) {
            agent.reset();
        }
        background(255);
        loop(); // 重新开始动画
    }
    if (key == 's' || key == 'S') {
        saveCanvas('agent_trails', 'png');
    }
}

// 鼠标绘制功能
function mouseDragged() {
    stroke(100, 150, 255);
    strokeWeight(20);
    line(mouseX, mouseY, pmouseX, pmouseY);
}