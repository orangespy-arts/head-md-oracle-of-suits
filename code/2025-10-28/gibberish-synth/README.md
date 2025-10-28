Gibberish Synth — 4 Channel Algorithmic Orchestrator

这是一个最小原型：使用 MediaPipe Hands 识别手势（食指），颜色检测决定声部触发，四个声部全部用算法合成（不使用采样）。

如何运行
- 在项目根目录启动本地静态服务器（浏览器不允许 file:// 下使用摄像头）

  ```bash
  # 在仓库父目录运行（示例）
  python3 -m http.server 8000
  # 然后在浏览器打开：
  # http://localhost:8000/gibberish-synth/
  ```

注意
- 首次加载 MediaPipe 需要下载模型，可能会有延迟。
- 浏览器须允许摄像头访问（并在 localhost 或 https 上）。

文件
- `index.html` — 页面与脚本挂载
- `main.js` — 程序入口（保持简洁）
- `MediaPipeHands.js` — MediaPipe helper (p5 capture)
- `ColorDetector.js` — 颜色解析与匹配
- `gibberish.js` — 四个算法声部与引擎
- `HandMapper.js` — 指尖坐标与声部参数映射
- `style.css` — 简单样式

如果你想我可以：
- 把每个声部细化为更复杂的合成器（FM、granular、物理建模等）。
- 加入 GUI 控件调节参数（tolerance, cutoff, attack, release）。
- 加入录制 / 导出功能或 OSC/MIDI 输出。
