// 重新结构化的 gibberish.js
// - 四个通道职责（keys 保持为 coin/leaf/glass/metal 以兼容现有映射）
//   coin  -> Melody (低声部，金属质感的旋律)
//   glass -> Melody (高声部，明亮的钟声/部分音叠加)
//   leaf  -> Drum   (节奏/打击，短促噪声/滤波器)
//   metal -> Ambience (长衰减的 gong / 禅意空间声)
// - 保留 GibberishEngine API (ensure, triggerOn, triggerOff, sweep)

class ChannelBase {
  constructor(ctx){
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 0.9;
    this.out = this.output;
  }
}

/* ====================================================
   ChannelCoin - Melody (低声部，金属质感)
   - 使用带有缓冲包络的简单 FM / pluck 风格合成
   - start 启动声音（可为持续或短音），setParams 用于平滑调音
   - 设计为在 triggerOn 时可持续发声（用于手指停留），也支持短敲击
   ==================================================== */
class ChannelCoin extends ChannelBase {
  constructor(ctx){
    super(ctx);
    this.car = null;
    this.mod = null;
    this.modGain = null;
    this.filter = ctx.createBiquadFilter(); // 带通用于突出谐波
    this.filter.type = 'bandpass';
    this.filter.Q.value = 8;
    this.gain = ctx.createGain();
    // 轻微饱和器：用 waveshaper 可以后续扩展（此处未创建复杂节点以节省 CPU）
    this.filter.connect(this.gain);
    this.gain.connect(this.output);

    // legato support: if already playing, subsequent trigger 会平滑改变频率
    this.isPlaying = false;
  }

  // freq: 目标频率
  // brightness: 控制输出增益（0..1）
  // sustainish: 如果为 true 则保持持续发声，否则做短击（默认短）
  start(freq, brightness=0.6, sustainish=false){
    const now = this.ctx.currentTime;
    // 如果是短击，立刻产生短 envelope（不重用已有振荡器）
    if (!sustainish){
      // 短 FM hit
      const car = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const mg = this.ctx.createGain();
      mod.frequency.value = Math.max(1, freq * 2.2);
      mg.gain.value = Math.max(1, freq * 0.6);
      mod.connect(mg); mg.connect(car.frequency);
      car.type='sine'; mod.type='sine';
      car.frequency.value = freq;
      const hitFilter = this.ctx.createBiquadFilter();
      hitFilter.type='bandpass'; hitFilter.Q.value=10; hitFilter.frequency.value = freq * 2.0;
      const hitGain = this.ctx.createGain();
      // envelope
      hitGain.gain.setValueAtTime(0.0001, now);
      hitGain.gain.exponentialRampToValueAtTime(Math.max(0.001, brightness), now+0.004);
      hitGain.gain.exponentialRampToValueAtTime(0.0001, now+0.45);
      // connect
      car.connect(hitFilter); hitFilter.connect(hitGain); hitGain.connect(this.output);
      // start/stop
      car.start(now); mod.start(now);
      car.stop(now+0.46); mod.stop(now+0.46);
      // disconnect after stop to avoid leaks
      setTimeout(()=>{ try{ car.disconnect(); mod.disconnect(); hitFilter.disconnect(); hitGain.disconnect(); }catch(e){} }, 600);
      return;
    }

    // 持续模式：若已在播放则平滑切换频率 & brightness
    if (this.isPlaying){
      if (this.car) this.car.frequency.setTargetAtTime(freq, now, 0.05);
      if (this.mod) this.mod.frequency.setTargetAtTime(freq*2.2, now, 0.05);
      if (this.modGain) this.modGain.gain.setTargetAtTime(Math.max(0.001, freq*0.4), now, 0.05);
      this.gain.gain.setTargetAtTime(Math.max(0.001, brightness), now, 0.05);
      return;
    }

    // 真实启动并保持
    this.car = this.ctx.createOscillator();
    this.mod = this.ctx.createOscillator();
    this.modGain = this.ctx.createGain();

    this.car.type='sine';
    this.mod.type='sine';
    this.car.frequency.value = freq;
    this.mod.frequency.value = freq * 2.2;
    this.modGain.gain.value = Math.max(0.001, freq * 0.4);

    this.mod.connect(this.modGain);
    this.modGain.connect(this.car.frequency);
    this.car.connect(this.filter);

    // attack
    this.gain.gain.setValueAtTime(0.0001, now);
    this.gain.gain.exponentialRampToValueAtTime(Math.max(0.001, brightness), now+0.02);

    this.car.start(now);
    this.mod.start(now);
    this.isPlaying = true;
  }

  // 平滑更新参数（用于持续手指控制）
  setParams(freq, brightness){
    const now = this.ctx.currentTime;
    if (this.car) this.car.frequency.setTargetAtTime(freq, now, 0.05);
    if (this.mod) this.mod.frequency.setTargetAtTime(freq*2.2, now, 0.05);
    if (this.modGain) this.modGain.gain.setTargetAtTime(Math.max(0.001, freq*0.4), now, 0.05);
    this.gain.gain.setTargetAtTime(Math.max(0.001, brightness), now, 0.05);
  }

  // 停止持续声音（短衰减）
  stop(){
    const now = this.ctx.currentTime;
    try{ this.gain.gain.exponentialRampToValueAtTime(0.0001, now+0.6); }catch(e){}
    try{
      if (this.car){ this.car.stop(now+0.62); this.car.disconnect(); this.car=null; }
      if (this.mod){ this.mod.stop(now+0.62); this.mod.disconnect(); this.mod=null; }
      if (this.modGain){ this.modGain.disconnect(); this.modGain=null; }
    }catch(e){}
    this.isPlaying = false;
  }
}

/* ====================================================
   ChannelLeaf - Drum (节奏)
   - 每次 start() 产生一次短促的打击 / 嗒声
   - 使用噪声包络 + 窄带滤波 或 短脉冲振荡器
   - 设计为 one-shot（triggerOn 对应一次敲击）
   ==================================================== */
class ChannelLeaf extends ChannelBase {
  constructor(ctx){
    super(ctx);
    this.tmpNodes = []; // 保存临时节点以在短时间后断开
  }

  // freq 可映射到滤波频率以改变音色（低→重， 高→脆）
  // intensity 控制音量
  start(freq, intensity=0.8){
    const now = this.ctx.currentTime;
    // 生成短噪声缓冲
    const len = Math.floor(this.ctx.sampleRate * 0.04); // 40 ms
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i=0;i<len;i++){
      // 快速衰减的噪声包络
      data[i] = (Math.random()*2-1) * Math.exp(-i/(this.ctx.sampleRate*0.008));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 6;
    bp.frequency.value = Math.max(200, freq*1.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, intensity), now+0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, now+0.12);
    // connect & start
    src.connect(bp); bp.connect(g); g.connect(this.output);
    src.start(now);
    // schedule cleanup
    const cleanup = () => { try{ src.disconnect(); bp.disconnect(); g.disconnect(); }catch(e){} };
    setTimeout(cleanup, 300);
    // keep ref in case stop() called immediately
    this.tmpNodes.push({src, bp, g, cleanup});
  }

  // Drum 为一次性声音，stop 可做无操作或立即降低音量
  stop(){
    // 尝试快速衰减当前临时节点
    const now = this.ctx.currentTime;
    this.tmpNodes.forEach(n=>{
      try{ n.g.gain.exponentialRampToValueAtTime(0.0001, now+0.02); }catch(e){}
      try{ n.src.stop(now+0.03); }catch(e){}
      if (n.cleanup) n.cleanup();
    });
    this.tmpNodes = [];
  }

  // setParams: 可用于实时微调滤波器 Q / 等（当前无持续参数）
  setParams(freq, intensity){
    // no-op for one-shot drum, kept for API consistency
  }
}

/* ====================================================
   ChannelGlass - Melody 高声部（明亮铃声）
   - 使用多个部分音（partials）叠加，短/中等 decay
   - 适合用作高旋律或点缀
   ==================================================== */
class ChannelGlass extends ChannelBase {
  constructor(ctx){
    super(ctx);
    this.partials = [];
    this.gain = ctx.createGain();
    this.shimmerDelay = ctx.createDelay();
    this.filter = ctx.createBiquadFilter();
    // 高频增强
    this.filter.type = 'highshelf';
    this.filter.gain.value = 6;
    // 简单 shimmer 用短 delay + feedback gain（不做复杂 pitch-shift）
    this.fb = ctx.createGain();
    this.shimmerDelay.delayTime.value = 0.08; // 80ms
    this.fb.gain.value = 0.20;
    // chain: partials -> filter -> gain -> delay feedback -> output
    this.filter.connect(this.gain);
    this.gain.connect(this.shimmerDelay);
    this.shimmerDelay.connect(this.fb);
    this.fb.connect(this.shimmerDelay);
    this.shimmerDelay.connect(this.output);
    // direct dry also to output
    this.gain.connect(this.output);
  }

  // start: 创建 3 个部分振荡器，带短 attack 和中等 decay
  start(freq, intensity=0.5){
    const now = this.ctx.currentTime;
    this.stop();
    for (let i=0;i<3;i++){
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * (1 + i * 1.6); // 分别为基频的倍频
      o.connect(this.filter);
      o.start(now);
      this.partials.push(o);
    }
    this.gain.gain.setValueAtTime(0.0001, now);
    this.gain.gain.exponentialRampToValueAtTime(Math.max(0.001, intensity*0.6), now+0.02);
    // 中等 decay
    this.gain.gain.exponentialRampToValueAtTime(0.0001, now+1.2);
  }

  setParams(freq, intensity, shimmer=0.2){
    const now = this.ctx.currentTime;
    for (let i=0;i<this.partials.length;i++){
      try{ this.partials[i].frequency.setTargetAtTime(freq * (1 + i * 1.6), now, 0.05); }catch(e){}
    }
    this.gain.gain.setTargetAtTime(Math.max(0.001, intensity*0.6), now, 0.05);
    // 调整 shimmer 反馈强度
    try{ this.fb.gain.setTargetAtTime(Math.min(0.9, shimmer), now, 0.1); }catch(e){}
  }

  stop(){
    const now = this.ctx.currentTime;
    try{ this.gain.gain.exponentialRampToValueAtTime(0.0001, now+0.8);}catch(e){}
    try{
      this.partials.forEach(o=>{ try{o.stop(now+0.82);}catch(e){} });
      this.partials = [];
    }catch(e){}
  }
}

/* ====================================================
   ChannelMetal - Ambience (Gong / 长衰减的禅意空间)
   - 使用窄带共鸣（多个 resonant filters）与低速调制 + 反馈延迟
   - 设计为触发后能持续或长时间衰减（适合作为环境声）
   ==================================================== */
class ChannelMetal extends ChannelBase {
  constructor(ctx){
    super(ctx);
    this.resonators = []; // 多个窄带滤波器，每个由振荡器或噪声激发
    this.excitation = null; // 用于一次性激发（噪声或短脉冲）
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.9;
    // 反馈延迟营造长尾
    this.delay = ctx.createDelay();
    this.delay.delayTime.value = 0.6;
    this.delayFB = ctx.createGain();
    this.delayFB.gain.value = 0.45;
    // 连接：resonators -> masterGain -> delay -> feedback -> masterGain -> output
    this.masterGain.connect(this.delay);
    this.delay.connect(this.delayFB);
    this.delayFB.connect(this.masterGain);
    this.masterGain.connect(this.output);
    this.active = false;
  }

  // start(freq: 基音频率或基准, intensity: 音量, sustainish: 如果为 true 则持续激活)
  start(freq, intensity=0.6, sustainish=true){
    const now = this.ctx.currentTime;
    this.stop(); // 清理旧的
    // 创建若干窄带共鸣器 (Biquad bandpass) 并用正弦源或噪声驱动
    const harmonics = [1, 1.8, 2.9, 4.2];
    this.resonators = harmonics.map((h,i)=>{
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 12 + i*4;
      bp.frequency.value = Math.max(40, freq * h);
      const g = this.ctx.createGain();
      g.gain.value = 0.0;
      bp.connect(g);
      g.connect(this.masterGain);
      return {bp, g};
    });

    // excitation: 使用一个短冲击噪声 buffer 驱动共鸣器
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate*0.1, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i=0;i<data.length;i++) data[i] = (Math.random()*2-1) * Math.exp(-i/(this.ctx.sampleRate*0.02));
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = false;
    // 将 excitation 连接到每个 resonator 输入
    this.resonators.forEach(r=>{
      const splitter = this.ctx.createGain();
      splitter.gain.value = 1.0;
      src.connect(r.bp);
    });
    // master gain envelope: 长 release
    this.masterGain.gain.setValueAtTime(0.0001, now);
    this.masterGain.gain.exponentialRampToValueAtTime(Math.max(0.001, intensity), now+0.01);
    // 持续模式下不要立刻衰减；否则做长尾衰减
    if (!sustainish){
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now+5.5);
    }
    // start excitation
    src.start(now);
    // keep ref
    this.excitation = src;
    this.active = true;
  }

  // 动态更新共鸣频率 / 强度 / 反馈
  setParams(freq, intensity, q){
    const now = this.ctx.currentTime;
    if (this.resonators){
      this.resonators.forEach((r, i)=>{
        try{ r.bp.frequency.setTargetAtTime(Math.max(30, freq * [1,1.8,2.9,4.2][i]), now, 0.5); }catch(e){}
        try{ r.g.gain.setTargetAtTime(Math.max(0.001, intensity * (0.6/(i+1))), now, 0.5); }catch(e){}
      });
    }
    try{ this.delayFB.gain.setTargetAtTime(Math.min(0.95, 0.2 + (q||0)*0.6), now, 0.5); }catch(e){}
    try{ this.masterGain.gain.setTargetAtTime(Math.max(0.001, intensity), now, 0.3); }catch(e){}
  }

  stop(){
    const now = this.ctx.currentTime;
    try{ this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now+4.0); }catch(e){}
    try{
      if (this.excitation) { try{ this.excitation.stop(now+0.05);}catch(e){} this.excitation.disconnect(); this.excitation=null; }
    }catch(e){}
    // schedule disconnect of resonators later to allow long tail
    setTimeout(()=>{
      try{
        if (this.resonators){
          this.resonators.forEach(r=>{ try{ r.bp.disconnect(); r.g.disconnect(); }catch(e){} });
          this.resonators = [];
        }
      }catch(e){}
      this.active = false;
    }, 5200);
  }
}

/* ====================================================
   GibberishEngine 管理器（API 保持不变）
   - ensure(): 延迟创建 AudioContext 与通道实例
   - triggerOn(name, params): 激活通道
   - triggerOff(name): 关闭通道
   - sweep(timeout): 自动回收超时通道
   ==================================================== */
class GibberishEngine {
  constructor(){
    this.ctx = null;
    this.master = null;
    this.channels = null;
    this.active = {};
  }

  ensure(){
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error('Failed to create AudioContext', e);
      throw e;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    // instantiate channels and connect
    this.channels = {
      coin: new ChannelCoin(this.ctx),   // 低声部 Melody（金属质感）
      leaf: new ChannelLeaf(this.ctx),   // Drum
      glass: new ChannelGlass(this.ctx), // 高声部 Melody
      metal: new ChannelMetal(this.ctx)  // Ambience Gong
    };
    for (const k in this.channels) this.channels[k].out.connect(this.master);
    console.debug('[gibberish] AudioContext created, channels initialized');
  }

  // params: { freq, intensity, extra, sustain }
  triggerOn(name, params={}){
    this.ensure();
    const ch = this.channels[name];
    if (!ch) return;
    this.active[name] = Date.now();
    console.debug('[gibberish] triggerOn', name, params);
    // route params sensibly depending on channel type
    if (name === 'leaf'){
      // Drum: use start for one-shot hits
      ch.start(params.freq || 200, params.intensity || 0.8);
    } else if (name === 'coin'){
      // Melody (low): allow sustain if params.sustain true
      ch.start(params.freq || 220, params.intensity || 0.6, !!params.sustain);
      ch.setParams(params.freq || 220, params.intensity || 0.6);
    } else if (name === 'glass'){
      // High melody: usually short/med decay; start will schedule decay if not sustained
      ch.start(params.freq || 440, params.intensity || 0.5);
      ch.setParams(params.freq || 440, params.intensity || 0.5, params.extra||0.2);
    } else if (name === 'metal'){
      // Ambience: start with sustain by default
      ch.start(params.freq || 80, params.intensity || 0.5, params.sustain === undefined ? true : !!params.sustain);
      ch.setParams(params.freq || 80, params.intensity || 0.5, params.extra || 0.3);
    } else {
      // generic fallback
      ch.start && ch.start(params.freq || 220, params.intensity || 0.6);
    }
  }

  triggerOff(name){
    const ch = this.channels && this.channels[name];
    if (!ch) return;
    try{ ch.stop && ch.stop(); }catch(e){ console.warn('[gibberish] triggerOff stop error', e); }
    delete this.active[name];
    console.debug('[gibberish] triggerOff', name);
  }

  sweep(timeout=900){
    const now = Date.now();
    for (const n in this.active){
      if (now - this.active[n] > timeout) this.triggerOff(n);
    }
  }
}

if (typeof window !== 'undefined') window.GibberishEngine = GibberishEngine;
