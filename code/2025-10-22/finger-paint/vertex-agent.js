class VertexAgent {
    constructor() {
        this.x = random(width);
        this.y = random(height);
        this.targetX = random(width);
        this.targetY = random(height);
        this.diameter = random(50, 150);
        this.speed = 0.05;
        this.stepSize = random(1, 3);
        this.color = color(random(255), random(255), random(255), 150);
        this.formResolution = 15;
        this.vertexX = [];
        this.vertexY = [];
        this.angleOffset = [];
        this.radiusOffset = [];
        this.offsetSpeed = [];
        this.offsetAngle = [];
        for (let i = 0; i < this.formResolution; i++) {
            this.vertexX[i] = 0;
            this.vertexY[i] = 0;
            this.angleOffset[i] = random(TWO_PI);
            this.radiusOffset[i] = random(0.5, 1.5);
            this.offsetSpeed[i] = random(0.01, 0.05);
            this.offsetAngle[i] = random(TWO_PI);
        }
    }

    update() {
        let moveSpeed = (typeof moveSpeedMultiplier !== 'undefined') ? moveSpeedMultiplier : this.speed;
        this.x += (this.targetX - this.x) * moveSpeed;
        this.y += (this.targetY - this.y) * moveSpeed;
        let distance = dist(this.x, this.y, this.targetX, this.targetY);
        if (distance < 5) {
            this.targetX = random(width);
            this.targetY = random(height);
        }
        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
            this.x = constrain(this.x, 0, width);
            this.y = constrain(this.y, 0, height);
            this.targetX = random(width);
            this.targetY = random(height);
        }
    }

    draw() {
        let speed = (typeof morphSpeedMultiplier !== 'undefined') ? morphSpeedMultiplier : 1;
        for (let i = 0; i < this.formResolution; i++) {
            this.angleOffset[i] += this.offsetSpeed[i] * speed;
            this.offsetAngle[i] += this.offsetSpeed[i] * 0.5 * speed;
            let noiseValue = noise(
                cos(this.offsetAngle[i]) * 0.5 + 0.5,
                sin(this.offsetAngle[i]) * 0.5 + 0.5,
                frameCount * 0.01
            );
            let dynamicRadius = this.diameter * this.radiusOffset[i] *
                (0.5 + sin(this.angleOffset[i]) * 0.3 + noiseValue * 0.4);
            let angle = TWO_PI / this.formResolution * i;
            this.vertexX[i] = this.x + sin(angle) * dynamicRadius;
            this.vertexY[i] = this.y + cos(angle) * dynamicRadius;
        }

        noFill();
        let opacity = (typeof opacityValue !== 'undefined') ? opacityValue : 150;
        let currentHue = (typeof hueValue !== 'undefined') ? hueValue : 0;

        push();
        colorMode(HSB, 360, 100, 100, 255);
        let c = color(currentHue, 80, 100, opacity);
        pop();

        stroke(c);
        strokeWeight(2);

        beginShape();
        curveVertex(this.vertexX[this.formResolution - 1], this.vertexY[this.formResolution - 1]);
        for (let i = 0; i < this.formResolution; i++) {
            curveVertex(this.vertexX[i], this.vertexY[i]);
        }
        curveVertex(this.vertexX[0], this.vertexY[0]);
        curveVertex(this.vertexX[1], this.vertexY[1]);
        endShape();
    }

    // 新增：用外部 control points（例如 5 个手指）驱动形状
    drawWithControlPoints(points, pg = null) {
        if (!points || points.length !== 5) return; // 强制要求 5 点
        // pg: optional p5.Graphics to draw onto. If null, draw on main canvas.
        const g = pg || null;
        // 以当前 agent 的位置为中心（允许 update() 平滑移动）
        // 在控制点之间线性插值，生成 formResolution 个顶点
        const n = points.length;
        for (let i = 0; i < this.formResolution; i++) {
            // map i 到 0..n range
            const t = (i / this.formResolution) * n;
            const seg = Math.floor(t) % n;
            const next = (seg + 1) % n;
            const local = t - Math.floor(t);
            // 线性插值
            let baseX = lerp(points[seg].x, points[next].x, local);
            let baseY = lerp(points[seg].y, points[next].y, local);

            // 加入动态偏移（保持已有的噪声/角度机制）
            const idx = i % this.offsetSpeed.length;
            const speed = (typeof morphSpeedMultiplier !== 'undefined') ? morphSpeedMultiplier : 1;
            this.angleOffset[idx] += this.offsetSpeed[idx] * 0.5 * speed;
            this.offsetAngle[idx] += this.offsetSpeed[idx] * 0.25 * speed;
            const noiseValue = noise(
                cos(this.offsetAngle[idx]) * 0.5 + 0.5,
                sin(this.offsetAngle[idx]) * 0.5 + 0.5,
                frameCount * 0.01
            );
            const jitter = (sin(this.angleOffset[idx]) * 0.5 + noiseValue * 0.5) * (this.diameter * 0.15) * this.radiusOffset[idx];

            // 从 control point 向外偏移，方向为相对于 agent 中心的向量
            const dirX = baseX - this.x;
            const dirY = baseY - this.y;
            const len = max(0.0001, sqrt(dirX * dirX + dirY * dirY));
            const nx = baseX + (dirX / len) * jitter;
            const ny = baseY + (dirY / len) * jitter;

            this.vertexX[i] = nx;
            this.vertexY[i] = ny;
        }

        // 绘制：使用 curveVertex 让曲线更平滑
        const opacity = (typeof opacityValue !== 'undefined') ? opacityValue : 150;
        const currentHue = (typeof hueValue !== 'undefined') ? hueValue : 0;

        if (g) {
            // fill shape on the graphics buffer with opacity controlled color
            g.push();
            g.colorMode(HSB, 360, 100, 100, 255);
            const c = g.color(currentHue, 80, 100, opacity);
            g.noStroke();
            g.fill(c);
            g.beginShape();
            g.curveVertex(this.vertexX[this.formResolution - 1], this.vertexY[this.formResolution - 1]);
            for (let i = 0; i < this.formResolution; i++) {
                g.curveVertex(this.vertexX[i], this.vertexY[i]);
            }
            g.curveVertex(this.vertexX[0], this.vertexY[0]);
            g.curveVertex(this.vertexX[1], this.vertexY[1]);
            g.endShape(g.CLOSE);
            g.pop();
        } else {
            // fill on main canvas
            push();
            colorMode(HSB, 360, 100, 100, 255);
            const c = color(currentHue, 80, 100, opacity);
            noStroke();
            fill(c);
            beginShape();
            curveVertex(this.vertexX[this.formResolution - 1], this.vertexY[this.formResolution - 1]);
            for (let i = 0; i < this.formResolution; i++) {
                curveVertex(this.vertexX[i], this.vertexY[i]);
            }
            curveVertex(this.vertexX[0], this.vertexY[0]);
            curveVertex(this.vertexX[1], this.vertexY[1]);
            endShape(CLOSE);
            pop();
        }
    }

    reset() {
        this.x = random(width);
        this.y = random(height);
        this.targetX = random(width);
        this.targetY = random(height);
    }
}
