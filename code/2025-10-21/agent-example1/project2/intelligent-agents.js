// 方向常量
const NORTH = 0;
const EAST = 1;
const SOUTH = 2;
const WEST = 3;

class IntelligentAgent {  
    constructor() { 
        // 初始化线条起点位置和属性
        this.posX = random(width);
        this.posY = random(height);
        this.posXcross = this.posX;
        this.posYcross = this.posY;
        
        this.angle = random(360);
        this.direction = int(random(4)); // 随机初始方向
        this.stepSize = random(1, 3);
        this.minLength = random(10, 30);
        this.color = color(random(255), random(255), random(255), 150);
    
        // 停止条件相关
        this.isActive = true;      // 是否还在活动
        this.stuckCount = 0;       // 卡住计数器
        this.maxStuckCount = 50;   // 最大卡住次数
        this.lineCount = 0;        // 已画线条数量
        this.maxLines = 100;       // 最大线条数量
    }   

    // 更新位置
    update() {
        // 如果已停止，不再更新
        if (!this.isActive) {
            return;
        }
        
        // 根据鼠标X位置控制速度
        let speed = int(map(mouseX, 0, width, 1, 20));
        
        for (let i = 0; i < speed; i++) {
            // 保存旧位置
            let oldX = this.posX;
            let oldY = this.posY;
            
            // 计算新位置
            this.posX += cos(radians(this.angle)) * this.stepSize;
            this.posY += sin(radians(this.angle)) * this.stepSize;
            
            // 检查是否移动太少（卡住）
            let moved = dist(oldX, oldY, this.posX, this.posY);
            if (moved < 0.5) {
                this.stuckCount++;
                if (this.stuckCount > this.maxStuckCount) {
                    this.isActive = false;
                    return;
                }
            } else {
                this.stuckCount = max(0, this.stuckCount - 1); // 慢慢减少卡住计数
            }
            
            // 检查当前像素颜色
            loadPixels();
            let pixelColor = get(floor(this.posX), floor(this.posY));
            
            // 判断是否是白色（未被画过的区域）
            let isWhite = (pixelColor[0] > 250 && 
                           pixelColor[1] > 250 && 
                           pixelColor[2] > 250);
            
            // 边界检测
            let reachedBorder = false;
            if (this.posY <= 5) {
                this.direction = SOUTH;
                reachedBorder = true;
            } else if (this.posX >= width - 5) {
                this.direction = WEST;
                reachedBorder = true;
            } else if (this.posY >= height - 5) {
                this.direction = NORTH;
                reachedBorder = true;
            } else if (this.posX <= 5) {
                this.direction = EAST;
                reachedBorder = true;
            }
            
            // 停止条件：碰到边界太多次
            if (reachedBorder) {
                this.stuckCount++;
                if (this.stuckCount > this.maxStuckCount) {
                    this.isActive = false;
                    return;
                }
            }
            
            // 如果遇到非白色像素或边界，改变方向并画线
            if (!isWhite || reachedBorder) {
                // 计算距离上次交叉点的距离
                let distance = dist(this.posX, this.posY, 
                               this.posXcross, this.posYcross);                // 如果距离够长，画一条线
                if (distance >= this.minLength) {
                    stroke(this.color);
                    strokeWeight(2);
                    line(this.posXcross, this.posYcross, this.posX, this.posY);
                    
                    // 更新交叉点
                    this.posXcross = this.posX;
                    this.posYcross = this.posY;
                    
                    // 增加线条计数
                    this.lineCount++;
                    
                    // 停止条件：画了足够多的线
                    if (this.lineCount >= this.maxLines) {
                        this.isActive = false;
                        return;
                    }
                }
                
                // 改变角度
                this.angle = this.getRandomAngle(this.direction);
            }
        }
    }

    // 根据当前方向生成随机角度
    getRandomAngle(currentDirection) {
        let angleCount = 8; // 可能的角度数量
        let a = floor(random(-angleCount, angleCount + 0.5)) * 90 / angleCount;
        
        if (currentDirection == NORTH) return a - 90;
        if (currentDirection == EAST) return a;
        if (currentDirection == SOUTH) return a + 90;
        if (currentDirection == WEST) return a + 180;
        
        return 0;
    }

    // 绘制代理状态（可选，用于调试）
    display() {
        if (!this.isActive) {
            // 显示停止的代理（小红点）
            fill(255, 0, 0, 150);
            // noStroke();
            ellipse(this.posX, this.posY, 5, 5);
        }
    }

    // 检查是否还活跃
    isAlive() {
        return this.isActive;
    }

    // 重置到随机位置
    reset() {
        this.posX = random(width);
        this.posY = random(height);
        this.posXcross = this.posX;
        this.posYcross = this.posY;
        this.angle = random(360);
        this.direction = int(random(4));
        this.stepSize = random(1, 3);
        this.minLength = random(10, 30);
        
        // 重置停止条件
        this.isActive = true;
        this.stuckCount = 0;
        this.lineCount = 0;
    }   
}