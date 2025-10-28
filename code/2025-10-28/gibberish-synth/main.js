// main.js - wire p5 canvas, MediaPipe hands, ColorDetector, GibberishEngine and HandMapper
let engine, cd, mapper;

function setup(){
  const w=640, h=480;
  const canvas = createCanvas(w,h);
  canvas.parent('canvas-wrap');

  // color targets: use simple names matching HandMapper
  cd = new ColorDetector([
    { name:'gold', color:'#ffd700', tolerance:90 },
    { name:'brown', color:'#8b5a2b', tolerance:90 },
    { name:'red', color:'#ff4d4d', tolerance:90 },
    { name:'gray', color:'#9ea0a0', tolerance:90 }
  ]);

  // setup MediaPipe
  setupHands();
  setupVideo(w,h,true);

  // engine + mapper
  engine = new GibberishEngine();
  mapper = new HandMapper(engine, cd);

  // offscreen canvas for sampling video pixels
  window._off = document.createElement('canvas'); window._off.width=w; window._off.height=h; window._offCtx = window._off.getContext('2d');

  select('#status').html('状态：准备中，等待摄像头/手部检测');
}

function draw(){
  background(20);
  if (!isVideoReady()){ fill(200); text('等待摄像头…',20,30); return; }

  // draw video
  image(videoElement,0,0,width,height);

  // draw hand landmarks if available
  if (detections && detections.multiHandLandmarks && detections.multiHandLandmarks.length>0){
    const hand = detections.multiHandLandmarks[0];
    const mark = hand[FINGER_TIPS.index];
    const px = Math.floor(mark.x*width), py = Math.floor(mark.y*height);

    // sample pixel from video using offscreen canvas (use videoElement.elt)
    try{
      window._offCtx.drawImage(videoElement.elt,0,0,window._off.width, window._off.height);
      const id = window._offCtx.getImageData(px,py,1,1).data;
      const pixel = { r:id[0], g:id[1], b:id[2], a:id[3] };

      // map to engine
      mapper.sampleAt(mark.x, mark.y, pixel);

      // HUD
      noStroke(); fill(255,240,0); ellipse(mark.x*width, mark.y*height, 14,14);
      fill(255); textSize(12); text(`(${px},${py})`, mark.x*width+12, mark.y*height+6);
      select('#status').html('检测中：手部就绪');
    }catch(e){ console.warn('sample error',e); }
  } else {
    engine && engine.sweep && engine.sweep(900);
    select('#status').html('未检测到手部');
  }
}

function mousePressed(){ // resume audio on user gesture
  if (engine && engine.ctx && engine.ctx.state==='suspended') engine.ctx.resume();
}
