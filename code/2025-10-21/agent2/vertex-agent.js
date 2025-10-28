class VertexAgent {
    constructor() {
        // 初始化位置和属性
        this.x = random(width);
        this.y = random(height);
        this.targetX = random(width);
        this.targetY = random(height);
        
        this.diameter = random(50, 150);
        this.speed = 0.05;
        this.stepSize = random(1, 3);
        this.color = color(random(255), random(255), random(255), 150);
        
        // 形状顶点数量
        this.formResolution = 15;
        
        // 用于存储顶点坐标
        this.vertexX = [];
        this.vertexY = [];
        
        // 每个顶点的偏移量和变化速度
        this.angleOffset = [];
        this.radiusOffset = [];
        this.offsetSpeed = [];
        this.offsetAngle = [];
        
        // 初始化顶点数组和变形参数
        for (let i = 0; i < this.formResolution; i++) {
            this.vertexX[i] = 0;
            this.vertexY[i] = 0;
            this.angleOffset[i] = random(TWO_PI);      // 随机起始角度
            this.radiusOffset[i] = random(0.5, 1.5);   // 半径偏移倍数
            this.offsetSpeed[i] = random(0.01, 0.05);  // 变化速度
            this.offsetAngle[i] = random(TWO_PI);      // 用于噪声的角度
        }
    }
    
    // 更新位置
    update() {
        // 获取全局移动速度倍数（如果未定义则使用默认速度）
        let moveSpeed = (typeof moveSpeedMultiplier !== 'undefined') ? moveSpeedMultiplier : this.speed;
        
        // 朝目标位置移动（缓动效果）
        this.x += (this.targetX - this.x) * moveSpeed;
        this.y += (this.targetY - this.y) * moveSpeed;
        
        // 如果接近目标，设置新的随机目标
        let distance = dist(this.x, this.y, this.targetX, this.targetY);
        if (distance < 5) {
            this.targetX = random(width);
            this.targetY = random(height);
        }
        
        // 边界检查
        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
            this.x = constrain(this.x, 0, width);
            this.y = constrain(this.y, 0, height);
            this.targetX = random(width);
            this.targetY = random(height);
        }
    }
    
    // 绘制形状（每一帧都变化）
    draw() {
        // 获取全局变形速度倍数（如果未定义则使用1）
        let speed = (typeof morphSpeedMultiplier !== 'undefined') ? morphSpeedMultiplier : 1;
        
        // 计算所有顶点位置，加入动态变形
        for (let i = 0; i < this.formResolution; i++) {
            // 更新每个顶点的变形参数（应用速度倍数）
            this.angleOffset[i] += this.offsetSpeed[i] * speed;
            this.offsetAngle[i] += this.offsetSpeed[i] * 0.5 * speed;
            
            // 使用噪声和正弦波创建有机的变形
            let noiseValue = noise(
                cos(this.offsetAngle[i]) * 0.5 + 0.5,
                sin(this.offsetAngle[i]) * 0.5 + 0.5,
                frameCount * 0.01
            );
            
            // 计算动态半径（结合多种变化）
            let dynamicRadius = this.diameter * this.radiusOffset[i] * 
                               (0.5 + sin(this.angleOffset[i]) * 0.3 + noiseValue * 0.4);
            
            // 计算顶点位置
            let angle = TWO_PI / this.formResolution * i;
            this.vertexX[i] = this.x + sin(angle) * dynamicRadius;
            this.vertexY[i] = this.y + cos(angle) * dynamicRadius;
        }
        
        // 绘制曲线形状
        noFill();
        
        // 获取全局透明度值
        let opacity = (typeof opacityValue !== 'undefined') ? opacityValue : 150;
        
        // 获取全局色相值
        let currentHue = (typeof hueValue !== 'undefined') ? hueValue : 0;
        
        // 使用 HSB 色彩空间根据色相值生成颜色
        // H (Hue): 色相 0-360°
        // S (Saturation): 饱和度 80% (鲜艳的颜色)
        // B (Brightness): 亮度 100% (最亮)
        push(); // 保存当前设置
        colorMode(HSB, 360, 100, 100, 255);
        let c = color(currentHue, 80, 100, opacity);
        pop(); // 恢复设置
        
        stroke(c);
        strokeWeight(2);
        
        beginShape();
        // 添加第一个控制点
        curveVertex(this.vertexX[this.formResolution-1], this.vertexY[this.formResolution-1]); 
        
        // 添加所有顶点
        for (let i = 0; i < this.formResolution; i++) {
            curveVertex(this.vertexX[i], this.vertexY[i]);
        }
        
        // 添加结束控制点，使曲线闭合
        curveVertex(this.vertexX[0], this.vertexY[0]); 
        curveVertex(this.vertexX[1], this.vertexY[1]);
        endShape();
    }
    
    // 重置到随机位置
    reset() {
        this.x = random(width);
        this.y = random(height);
        this.targetX = random(width);
        this.targetY = random(height);
    }
}

