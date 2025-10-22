//draw a vertex class for each landmark for 5 fingers
class Vertex {
  constructor(x, y, z, name) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.name = name; // name of the landmark
  }

  // method to draw the vertex
  draw(size = 10, col = [255, 0, 0]) {
    fill(col[0], col[1], col[2]);
    noStroke();
    circle(this.x, this.y, size);
  }
}
// ...existing code...
let rightHandVertex = null;
let trailGraphics = null; // 新增持久画布
const RIGHT_TIP_INDICES = [4, 8, 12, 16, 20];

function setup() {
    // full window canvas
    createCanvas(windowWidth, windowHeight);

    // 持久画布（不在每帧清空）
    trailGraphics = createGraphics(windowWidth, windowHeight);
    trailGraphics.clear(); // 初始清空为透明

    // initialize MediaPipe settings
    setupHands();
    // start camera using MediaPipeHands.js helper
    setupVideo();

    // instantiate a single VertexAgent which will be driven by 5 fingertip control points
    rightHandVertex = new VertexAgent();
    rightHandVertex.formResolution = 30;
    rightHandVertex.diameter = 100;
    rightHandVertex.speed = 0.12;
}

// 调整窗口大小时同步调整持久画布
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (trailGraphics) trailGraphics.resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // 清除主画布（仍然显示视频），但不清除 trailGraphics
  background(0);

  // if the video connection is ready
  if (isVideoReady()) {
    image(videoElement, 0, 0);
  }

  // 在主画布上先绘制 trailGraphics（包含历史 vertex）
  if (trailGraphics) {
    image(trailGraphics, 0, 0);
  }

  strokeWeight(2);

  // make sure we have detections to draw
  if (detections) {
    for (let i = 0; i < detections.multiHandLandmarks.length; i++) {
      const hand = detections.multiHandLandmarks[i];
      if (!hand) continue;

      // 你仍然可以在主画布上绘制调试点/连接
      drawIndex(hand);
      drawThumb(hand);
      drawTips(hand);
      drawConnections(hand);
      drawLandmarks(hand);
      drawThumbIndexConnection(hand);

      const handLabel = detections.multiHandedness && detections.multiHandedness[i] && detections.multiHandedness[i].label;
      if (handLabel && handLabel.toLowerCase() === 'right') {
        const vw = (typeof videoElement !== 'undefined' && videoElement.width) ? videoElement.width : width;
        const vh = (typeof videoElement !== 'undefined' && videoElement.height) ? videoElement.height : height;

        // gather fingertip positions
        const controlPoints = [];
        for (let j = 0; j < RIGHT_TIP_INDICES.length; j++) {
          const tipIndex = RIGHT_TIP_INDICES[j];
          const lm = hand[tipIndex];
          if (!lm) continue;
          const px = lm.x * vw;
          const py = lm.y * vh;
          controlPoints.push({ x: px, y: py });
        }

        // 强制需要 5 指才绘制（并把绘制写到 trailGraphics 上以保留历史）
        if (rightHandVertex && controlPoints.length === 5) {
          // 平滑目标位置（可选）
          let avgX = 0, avgY = 0;
          for (let p of controlPoints) { avgX += p.x; avgY += p.y; }
          avgX /= controlPoints.length; avgY /= controlPoints.length;
          rightHandVertex.targetX = avgX;
          rightHandVertex.targetY = avgY;
          rightHandVertex.update();

          // 将当前 vertex 绘制到持久画布（trailGraphics），以便保留历史
          rightHandVertex.drawWithControlPoints(controlPoints, trailGraphics);
        }
      } // end if right hand
    } // end for hands
  } // end of if detections
} // end of draw

// 按 C 清除持久轨迹
function keyPressed() {
  if ((key === 'c' || key === 'C') && trailGraphics) {
    trailGraphics.clear();
  }
}
// ...existing code...
// draw the index finger tip landmark
function drawIndex(landmarks) {
  if (!landmarks) return;
  const markIndex = landmarks[FINGER_TIPS.index];
  if (!markIndex) return;
  const x1 = markIndex.x * videoElement.width;
  const y1 = markIndex.y * videoElement.height;

  noStroke();
  fill(0, 255, 255);
  circle(x1, y1, 20);
}
  // draw each fingertip
  const fingerTips = [
    FINGER_TIPS.thumb,
    FINGER_TIPS.index,
    FINGER_TIPS.middle,
    FINGER_TIPS.ring,
    FINGER_TIPS.pinky
  ];

  for (let tip of fingerTips) {
    const mark = landmarks[tip];
    if (!mark) continue;
    const x = mark.x * videoElement.width;
    const y =
     mark.y * videoElement.height;
    noStroke();
    fill(0, 255, 0);
    circle(x, y, 15);
  }
