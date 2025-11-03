// gibberish.js - 小型算法合成引擎，包含 4 个声道（不使用样本），用于即时触发音效。

/*
  文件说明（中文注释）
  - ChannelBase: 所有通道的基类，负责创建基本的输出节点。
  - ChannelCoin: “硬币/金属”类声音（短暂的 FM/带通滤波）
  - ChannelLeaf: “叶子/垫”类声音（柔和的双振荡器 pad）
  - ChannelGlass: “玻璃/金属谐波”类声音（层叠振荡器，模拟铃声）
  - ChannelMetal: 使用噪声和带通滤波产生的金属敲击声
  - GibberishEngine: 管理 AudioContext、通道集合、触发和关闭逻辑

  设计要点：
  - 每个通道负责自己内部的节点（oscillator、filter、gain 等）并暴露 start/setParams/stop 方法。
  - 引擎延迟创建 AudioContext（在 ensure() 中），以便遵守浏览器的用户手势要求。
  - triggerOn 会记录活动时间戳，sweep 可以根据超时自动关闭长时间未刷新的通道。
*/

// 基类：为每个通道准备一个输出 GainNode（便于统一连接到 master）
class ChannelBase {
  constructor(ctx){
    // ctx: Web Audio AudioContext
    this.ctx = ctx;
    // output: 该通道的最终输出节点（GainNode），上游节点连接到它
    this.output = ctx.createGain();
    // 默认略高增益，可由引擎或上层调整 master 音量
    this.output.gain.value = 0.9;
    // out 是对外统一属性（方便在引擎中连接）
    this.out = this.output;
  }
}

// ChannelCoin: 类似短促的钟声/硬币敲击，使用简单的载波+调制器实现 FM 风格音色，然后经过带通滤波
class ChannelCoin extends ChannelBase {
  constructor(ctx){
    super(ctx);
    // 振荡器引用（在 start 时创建）
    this.car = null; // 载波
    this.mod = null; // 调制载波
    this.gain = ctx.createGain();
    // 使用带通滤波器增强打击感
    this.filter = ctx.createBiquadFilter();
    this.filter.type='bandpass';
    this.filter.Q.value=6; // 谐振度
    // 连接顺序：filter -> gain -> output
    this.filter.connect(this.gain);
    this.gain.connect(this.output);
  }

  // start: 启动声音
  // freq: 基频，brightness: 音量/亮度控制
  start(freq, brightness=0.6){
    const now=this.ctx.currentTime;
    // 任何新触发前先停止上一个实例（做包络过渡）
    this.stop();

    // 创建载波与调制器，构成简单的 FM 结构
    this.car=this.ctx.createOscillator();
    this.mod=this.ctx.createOscillator();
    const modGain=this.ctx.createGain();

    // 调制频率和深度基于输入频率配置
    this.mod.frequency.value = freq*2.1;
    modGain.gain.value = freq*0.5;
    this.mod.connect(modGain);
    modGain.connect(this.car.frequency);

    this.car.type='sine';
    this.mod.type='sine';
    this.car.frequency.value = freq;
    this.car.connect(this.filter);

    // 包络：从非常小的增益快速增长到指定亮度
    this.gain.gain.setValueAtTime(0.0001, now);
    this.gain.gain.exponentialRampToValueAtTime(Math.max(0.001, brightness), now+0.005);

    // 开始振荡器
    this.car.start(now);
    this.mod.start(now);
  }

  // setParams: 用于实时更新频率或亮度（平滑过渡）
  setParams(freq, brightness){
    if (this.car) this.car.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    this.gain.gain.setTargetAtTime(Math.max(0.001, brightness), this.ctx.currentTime, 0.05);
  }

  // stop: 关闭并释放节点，使用短时间衰减避免断裂音
  stop(){
    const now=this.ctx.currentTime;
    try{ if(this.gain) this.gain.gain.exponentialRampToValueAtTime(0.0001, now+0.2);}catch(e){}
    try{
      if(this.car){ this.car.stop(now+0.22); this.car.disconnect(); }
      if(this.mod){ this.mod.stop(now+0.22); this.mod.disconnect(); }
    }catch(e){}
  }
}

// ChannelLeaf: 柔和的 pad / 垫声，使用两台微微不同步（detune）的正弦振荡器并用低通滤波塑形
class ChannelLeaf extends ChannelBase {
  constructor(ctx){
    super(ctx);
    this.osc=null; // 会保存振荡器数组
    this.noise=null;
    this.gain=ctx.createGain();
    this.filter=ctx.createBiquadFilter();
    this.filter.type='lowpass';
    this.filter.Q.value=1; // 温和的低通
    this.filter.connect(this.gain);
    this.gain.connect(this.output);
  }

  // start: 创建两个微微错开的正弦振荡器，作为 pad 的基础
  start(freq, intensity=0.6){
    const now=this.ctx.currentTime;
    this.stop();
    // 两个微微失调的振荡器（制造宽度和厚度）
    this.osc = [this.ctx.createOscillator(), this.ctx.createOscillator()];
    this.osc[0].type='sine';
    this.osc[1].type='sine';
    this.osc[0].frequency.value = freq;
    this.osc[1].frequency.value = freq*1.003; // 轻微失调
    this.osc[0].connect(this.filter);
    this.osc[1].connect(this.filter);

    // pad 包络：慢速上升
    this.gain.gain.setValueAtTime(0.0001, now);
    this.gain.gain.linearRampToValueAtTime(intensity*0.6, now+0.3);
    this.osc.forEach(o=>o.start(now));
  }

  // setParams: 平滑地更新频率、滤波截止和强度
  setParams(freq, intensity, cutoff){
    if (this.osc) this.osc[0].frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.2);
    if (this.filter) this.filter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.2);
    this.gain.gain.setTargetAtTime(Math.max(0.001, intensity*0.6), this.ctx.currentTime, 0.1);
  }

  // stop: 慢速衰减适合 pad
  stop(){
    const now=this.ctx.currentTime;
    try{ this.gain.gain.exponentialRampToValueAtTime(0.0001, now+1.0);}catch(e){}
    try{ if(this.osc){ this.osc.forEach(o=>{ try{o.stop(now+1.02);}catch(e){} }); } }catch(e){}
  }
}

// ChannelGlass: 模拟铃/玻璃般的明亮音色，使用多路（layered）正弦部分音
class ChannelGlass extends ChannelBase {
  constructor(ctx){
    super(ctx);
    this.partials=[]; // 保存多个振荡器（声部）
    this.gain=ctx.createGain();
    this.filter=ctx.createBiquadFilter();
    this.filter.type='highshelf';
    this.filter.gain.value=6; // 提升高频以产生明亮感
    this.filter.connect(this.gain);
    this.gain.connect(this.output);
  }

  // start: 创建多路振荡器来构成丰富的谐波结构
  start(freq, intensity=0.6){
    const now=this.ctx.currentTime;
    this.stop();
    // 创建若干部分音并连接到滤波器
    for(let i=0;i<3;i++){
      const o=this.ctx.createOscillator();
      o.type='sine';
      o.frequency.value = freq*(1+i*1.5); // 每个部分音不同的倍频
      o.connect(this.filter);
      o.start(now);
      this.partials.push(o);
    }
    // 迅速上升的包络
    this.gain.gain.setValueAtTime(0.0001, now);
    this.gain.gain.exponentialRampToValueAtTime(Math.max(0.001, intensity*0.5), now+0.02);
  }

  // setParams: 更新各部分音的基频以及音量强度
  setParams(freq,intensity,shimmer){
    for(let i=0;i<this.partials.length;i++){
      const o=this.partials[i];
      o.frequency.setTargetAtTime(freq*(1+i*1.5), this.ctx.currentTime, 0.05);
    }
    this.gain.gain.setTargetAtTime(Math.max(0.001, intensity*0.5), this.ctx.currentTime, 0.05);
  }

  // stop: 适度衰减并停止所有部分音
  stop(){
    const now=this.ctx.currentTime;
    try{ this.gain.gain.exponentialRampToValueAtTime(0.0001, now+0.6);}catch(e){}
    try{
      this.partials.forEach(o=>{ try{o.stop(now+0.62);}catch(e){} });
      this.partials=[];
    }catch(e){}
  }
}

// ChannelMetal: 使用短噪声缓冲与带通滤波器产生金属敲击感
class ChannelMetal extends ChannelBase {
  constructor(ctx){
    super(ctx);
    this.noiseBuffer=null; // 可选的缓冲引用
    this.noise=null; // BufferSource
    this.filter=ctx.createBiquadFilter();
    this.filter.type='bandpass';
    this.filter.Q.value=8; // 高 Q 值产生共鸣峰
    this.gain=ctx.createGain();
    this.filter.connect(this.gain);
    this.gain.connect(this.output);
  }

  // start: 生成短时噪声缓冲并通过带通滤波器以形成敲击
  start(freq, intensity=0.8){
    const now=this.ctx.currentTime;
    this.stop();
    // 创建短噪声缓冲（一次性播放）
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate*0.06, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.exp(-i/(this.ctx.sampleRate*0.02));
    this.noise = this.ctx.createBufferSource();
    this.noise.buffer = buf;
    this.noise.loop = false;
    // 将滤波器频率基于基础频率设置
    this.filter.frequency.value = freq*2;
    this.noise.connect(this.filter);

    // 包络：快速上升以产生冲击感
    this.gain.gain.setValueAtTime(0.0001, now);
    this.gain.gain.exponentialRampToValueAtTime(Math.max(0.001, intensity), now+0.01);
    this.noise.start(now);
  }

  // setParams: 可调整滤波频率与音量（用于持续控制）
  setParams(freq,intensity,q){
    this.filter.frequency.setTargetAtTime(freq*2, this.ctx.currentTime, 0.02);
    this.gain.gain.setTargetAtTime(Math.max(0.001, intensity), this.ctx.currentTime, 0.05);
  }

  // stop: 噪声是一次性事件，不需要显式 stop（缓冲自行结束），但保留接口
  stop(){ /* noise is one-shot */ }
}

// GibberishEngine: 管理 AudioContext、创建通道并响应触发命令
class GibberishEngine {
  constructor(){
    // ctx: AudioContext（延迟创建以等待用户手势）
    this.ctx = null;
    this.master=null; // 总控输出
    this.channels=null; // 存放各通道实例的对象
    this.active = {}; // 记录当前被激活通道的时间戳，用于超时回收
  }

  // ensure: 延迟构建 AudioContext 与通道实例，遵守浏览器要求的用户手势
  ensure(){
    if (this.ctx) return;
    this.ctx = new (window.AudioContext||window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    // 实例化4个通道并连接到 master
    this.channels = {
      coin: new ChannelCoin(this.ctx),
      leaf: new ChannelLeaf(this.ctx),
      glass: new ChannelGlass(this.ctx),
      metal: new ChannelMetal(this.ctx)
    };
    for(const k in this.channels) this.channels[k].out.connect(this.master);
  }

  // triggerOn: 激活指定通道并传入参数（freq, intensity, extra）
  // - name: 通道名（'coin'|'leaf'|'glass'|'metal'）
  // - params: { freq, intensity, extra }
  triggerOn(name, params){
    this.ensure();
    const ch = this.channels[name];
    if(!ch) return;
    // 记录激活时间，用于后续 sweep 回收
    this.active[name]=Date.now();
    // 启动通道声音并设置初始参数
    ch.start(params.freq||220, params.intensity||0.6);
    ch.setParams(params.freq||220, params.intensity||0.6, params.extra||0);
  }

  // triggerOff: 关闭指定通道
  triggerOff(name){
    const ch = this.channels[name];
    if(!ch) return;
    if(ch.stop) ch.stop();
    delete this.active[name];
  }

  // sweep: 清理长时间未更新的激活通道
  // timeout: 超时时间（毫秒），超过则关闭
  sweep(timeout=900){
    const now=Date.now();
    for(const n in this.active) if(now-this.active[n]>timeout) this.triggerOff(n);
  }
}

// 将引擎暴露到全局，方便外部脚本直接 new GibberishEngine()
if (typeof window !== 'undefined') window.GibberishEngine = GibberishEngine;
