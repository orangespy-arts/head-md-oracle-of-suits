

// 8个方向常量
const NORTH = 0;
const NORTHEAST = 1;
const EAST = 2;
const SOUTHEAST = 3;
const SOUTH = 4;
const SOUTHWEST = 5;
const WEST = 6;
const NORTHWEST = 6;

class CircleAgent {
    constructor() {
        // 初始化位置和属性
        this.x = random(width);
        this.y = random(height);
        this.diameter = random(1, 10);
        this.targetX = random(width);
        this.targetY = random(height);
        this.speed = 0.05;
        this.stepSize = random(1, 3);
        this.color = color(random(255), random(255), random(255), 150);
    }
    
    // 更新位置
    update() {
        // 朝目标位置移动（缓动效果）
        this.x += (this.targetX - this.x) * this.speed;
        this.y += (this.targetY - this.y) * this.speed;
        
        // 如果接近目标，设置新的随机目标
        let distance = dist(this.x, this.y, this.targetX, this.targetY);
        if (distance < 5) {
            this.targetX = random(width);
            this.targetY = random(height);
        }
        
        // 如果超出边界，设置新目标
        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
            this.x = constrain(this.x, 0, width);
            this.y = constrain(this.y, 0, height);
            this.targetX = random(width);
            this.targetY = random(height);
        }
    }
    
    // 绘制圆圈
    display() {
        fill(this.color);
        noStroke();
        ellipse(this.x, this.y, this.diameter, this.diameter);
    }
    
    // 重置到随机位置
    reset() {
        this.x = random(width);
        this.y = random(height);
        this.targetX = random(width);
        this.targetY = random(height);
    }
    
    // 随机游走（使用8个方向）
    randomWalk() {
        let direction = int(random(0, 8));
        
        if (direction == NORTH) {
            this.y -= this.stepSize;
        } else if (direction == NORTHEAST) {
            this.x += this.stepSize;
            this.y -= this.stepSize;
        } else if (direction == EAST) {
            this.x += this.stepSize;
        } else if (direction == SOUTHEAST) {
            this.x += this.stepSize;
            this.y += this.stepSize;
        } else if (direction == SOUTH) {
            this.y += this.stepSize;
        } else if (direction == SOUTHWEST) {
            this.x -= this.stepSize;
            this.y += this.stepSize;
        } else if (direction == WEST) {
            this.x -= this.stepSize;
        } else if (direction == NORTHWEST) {
            this.x -= this.stepSize;
            this.y -= this.stepSize;
        }
        
        // 边界环绕
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
    }
}