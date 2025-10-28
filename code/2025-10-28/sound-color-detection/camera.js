// CameraCapture - simple webcam helper
// Creates a hidden video and internal canvas to grab frames from the webcam.
// Methods:
//   const cam = new CameraCapture(constraints)
//   await cam.start()
//   cam.getImageData() -> ImageData of current frame (camera native size)
//   cam.drawToCanvas(targetCanvas) -> draws the current camera frame onto a given canvas
//   cam.stop()

class CameraCapture {
  constructor(constraints = { video: { width: 640, height: 480 }, audio: false }) {
    this.constraints = constraints;
    this.video = null;
    this.stream = null;
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia not supported in this browser');
    }
    this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.srcObject = this.stream;

    await new Promise(resolve => {
      this.video.addEventListener('loadedmetadata', resolve, { once: true });
    });

    // try to get actual video size
    this.width = this.video.videoWidth || (this.constraints.video && this.constraints.video.width) || 640;
    this.height = this.video.videoHeight || (this.constraints.video && this.constraints.video.height) || 480;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');

    return this;
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
  }

  // Draws the current video frame into the internal canvas and returns its ImageData
  getImageData() {
    if (!this.video || !this.ctx) return null;
    try {
      this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
      return this.ctx.getImageData(0, 0, this.width, this.height);
    } catch (e) {
      // drawing might fail if video not ready
      return null;
    }
  }

  // Draws current camera frame onto a visible canvas element (will scale to its size)
  drawToCanvas(targetCanvas) {
    if (!this.video || !targetCanvas) return;
    const tctx = targetCanvas.getContext('2d');
    try {
      // draw video frame directly into the target canvas, scaling to fit
      tctx.drawImage(this.video, 0, 0, targetCanvas.width, targetCanvas.height);
    } catch (e) {
      // ignore if not ready
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CameraCapture;
} else if (typeof window !== 'undefined') {
  window.CameraCapture = CameraCapture;
}
