// 存储所有代理的数组
let values = [];

// 速度控制
let morphSpeedMultiplier = 1;  // 变形速度倍数
let moveSpeedMultiplier = 1;   // 移动速度倍数
let opacityValue = 150;        // 透明度值 (0-255)
let hueValue = 0;              // 色相值 (0-360)
let morphSpeedSlider;
let moveSpeedSlider;
let opacitySlider;
let hueSlider;

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(255); // 只在开始时清空一次画布
    
    // 创建变形速度滑块
    morphSpeedSlider = createSlider(0.1, 5, 1, 0.1);
    morphSpeedSlider.position(20, 20);
    morphSpeedSlider.style('width', '200px');
    
    // 创建移动速度滑块
    moveSpeedSlider = createSlider(0, 0.2, 0.05, 0.01);
    moveSpeedSlider.position(20, 60);
    moveSpeedSlider.style('width', '200px');
    
    // 创建透明度滑块
    opacitySlider = createSlider(10, 255, 150, 1);
    opacitySlider.position(20, 100);
    opacitySlider.style('width', '200px');
    
    // 创建色相滑块 (色环 0-360度)
    hueSlider = createSlider(0, 360, 0, 1);
    hueSlider.position(20, 140);
    hueSlider.style('width', '200px');
    
    // 创建10个代理
    for (let i = 0; i < 1; i++){
        values.push(new VertexAgent());
    }  
}

function windowResized(){
    resizeCanvas(windowWidth, windowHeight);
}

function draw(){
    // 不再刷新背景，图像会永久保留
    // background(255, 20) // 半透明背景产生轨迹
    
    // 从滑块获取速度倍数、透明度和色相值
    morphSpeedMultiplier = morphSpeedSlider.value();
    moveSpeedMultiplier = moveSpeedSlider.value();
    opacityValue = opacitySlider.value();
    hueValue = hueSlider.value();
    
    // 显示信息面板
    drawInfoPanel();
    
    // 遍历每个代理
    for (let agent of values){
        agent.update(); // 更新位置（使用moveSpeedMultiplier）
        agent.draw();   // 绘制形状（使用morphSpeedMultiplier、opacityValue和hueValue）
    }
}

// 绘制信息面板
function drawInfoPanel() {
    // 不再绘制白色背景
    
    // 文字信息（黑色文字，带白色描边增加可读性）
    stroke(255);
    strokeWeight(4);
    fill(0);
    textSize(14);
    textAlign(LEFT);
    
    // 显示色相对应的颜色名称
    let colorName = getColorName(hueValue);
    
    text(`Morph Speed: ${morphSpeedMultiplier.toFixed(1)}x`, 240, 35);
    text(`Move Speed: ${moveSpeedMultiplier.toFixed(2)}`, 240, 75);
    text(`Opacity: ${opacityValue}`, 240, 115);
    text(`Hue: ${hueValue}° (${colorName})`, 240, 155);
    text(`D: Clear | S: Save`, 20, 175);
}

// 根据色相值返回颜色名称
function getColorName(hue) {
    if (hue >= 0 && hue < 30) return 'Red';
    if (hue >= 30 && hue < 60) return 'Orange';
    if (hue >= 60 && hue < 90) return 'Yellow';
    if (hue >= 90 && hue < 150) return 'Green';
    if (hue >= 150 && hue < 210) return 'Cyan';
    if (hue >= 210 && hue < 270) return 'Blue';
    if (hue >= 270 && hue < 330) return 'Purple';
    if (hue >= 330 && hue <= 360) return 'Magenta';
    return 'Red';
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