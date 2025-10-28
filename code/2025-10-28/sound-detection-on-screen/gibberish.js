// gibberish.js - small algorithmic synth engine for 4 channels (no samples)
class ChannelBase {
  constructor(ctx){ this.ctx = ctx; this.output = ctx.createGain(); this.output.gain.value = 0.9; this.out = this.output; }
}

class ChannelCoin extends ChannelBase {
  constructor(ctx){ super(ctx); this.car = null; this.mod = null; this.gain = ctx.createGain(); this.filter = ctx.createBiquadFilter(); this.filter.type='bandpass'; this.filter.Q.value=6; this.filter.connect(this.gain); this.gain.connect(this.output); }
  start(freq, brightness=0.6){ const now=this.ctx.currentTime; this.stop(); this.car=this.ctx.createOscillator(); this.mod=this.ctx.createOscillator(); const modGain=this.ctx.createGain(); this.mod.frequency.value = freq*2.1; modGain.gain.value = freq*0.5; this.mod.connect(modGain); modGain.connect(this.car.frequency); this.car.type='sine'; this.mod.type='sine'; this.car.frequency.value = freq; this.car.connect(this.filter); this.gain.gain.setValueAtTime(0.0001, now); this.gain.gain.exponentialRampToValueAtTime(Math.max(0.001, brightness), now+0.005); this.car.start(now); this.mod.start(now); }
  setParams(freq, brightness){ if (this.car) this.car.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05); this.gain.gain.setTargetAtTime(Math.max(0.001, brightness), this.ctx.currentTime, 0.05); }
  stop(){ const now=this.ctx.currentTime; try{ if(this.gain) this.gain.gain.exponentialRampToValueAtTime(0.0001, now+0.2);}catch(e){} try{ if(this.car){ this.car.stop(now+0.22); this.car.disconnect(); } if(this.mod){ this.mod.stop(now+0.22); this.mod.disconnect(); } }catch(e){} }
}

class ChannelLeaf extends ChannelBase {
  constructor(ctx){ super(ctx); this.osc=null; this.noise=null; this.gain=ctx.createGain(); this.filter=ctx.createBiquadFilter(); this.filter.type='lowpass'; this.filter.Q.value=1; this.filter.connect(this.gain); this.gain.connect(this.output); }
  start(freq, intensity=0.6){ const now=this.ctx.currentTime; this.stop(); // soft pad: two detuned sines
    this.osc = [this.ctx.createOscillator(), this.ctx.createOscillator()]; this.osc[0].type='sine'; this.osc[1].type='sine'; this.osc[0].frequency.value = freq; this.osc[1].frequency.value = freq*1.003; const mix = this.ctx.createGain(); const g = this.gain; this.osc[0].connect(this.filter); this.osc[1].connect(this.filter); this.gain.gain.setValueAtTime(0.0001, now); this.gain.gain.linearRampToValueAtTime(intensity*0.6, now+0.3); this.osc.forEach(o=>o.start(now)); }
  setParams(freq, intensity, cutoff){ if (this.osc) this.osc[0].frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.2); if (this.filter) this.filter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.2); this.gain.gain.setTargetAtTime(Math.max(0.001, intensity*0.6), this.ctx.currentTime, 0.1); }
  stop(){ const now=this.ctx.currentTime; try{ this.gain.gain.exponentialRampToValueAtTime(0.0001, now+1.0);}catch(e){} try{ if(this.osc){ this.osc.forEach(o=>{ try{o.stop(now+1.02);}catch(e){} }); } }catch(e){} }
}

class ChannelGlass extends ChannelBase {
  constructor(ctx){ super(ctx); this.partials=[]; this.gain=ctx.createGain(); this.filter=ctx.createBiquadFilter(); this.filter.type='highshelf'; this.filter.gain.value=6; this.filter.connect(this.gain); this.gain.connect(this.output); }
  start(freq, intensity=0.6){ const now=this.ctx.currentTime; this.stop(); // layered FM-ish bells
    for(let i=0;i<3;i++){ const o=this.ctx.createOscillator(); o.type='sine'; o.frequency.value = freq*(1+i*1.5); o.connect(this.filter); o.start(now); this.partials.push(o); }
    this.gain.gain.setValueAtTime(0.0001, now); this.gain.gain.exponentialRampToValueAtTime(Math.max(0.001, intensity*0.5), now+0.02);
  }
  setParams(freq,intensity,shimmer){ for(let i=0;i<this.partials.length;i++){ const o=this.partials[i]; o.frequency.setTargetAtTime(freq*(1+i*1.5), this.ctx.currentTime, 0.05); } this.gain.gain.setTargetAtTime(Math.max(0.001, intensity*0.5), this.ctx.currentTime, 0.05); }
  stop(){ const now=this.ctx.currentTime; try{ this.gain.gain.exponentialRampToValueAtTime(0.0001, now+0.6);}catch(e){} try{ this.partials.forEach(o=>{ try{o.stop(now+0.62);}catch(e){} }); this.partials=[];}catch(e){} }
}

class ChannelMetal extends ChannelBase {
  constructor(ctx){ super(ctx); this.noiseBuffer=null; this.noise=null; this.filter=ctx.createBiquadFilter(); this.filter.type='bandpass'; this.filter.Q.value=8; this.gain=ctx.createGain(); this.filter.connect(this.gain); this.gain.connect(this.output); }
  start(freq, intensity=0.8){ const now=this.ctx.currentTime; this.stop(); // create short metallic click via noise burst + resonant filter
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate*0.06, this.ctx.sampleRate); const data = buf.getChannelData(0); for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.exp(-i/(this.ctx.sampleRate*0.02)); this.noise = this.ctx.createBufferSource(); this.noise.buffer = buf; this.noise.loop = false; this.filter.frequency.value = freq*2; this.noise.connect(this.filter); this.gain.gain.setValueAtTime(0.0001, now); this.gain.gain.exponentialRampToValueAtTime(Math.max(0.001, intensity), now+0.01); this.noise.start(now); }
  setParams(freq,intensity,q){ this.filter.frequency.setTargetAtTime(freq*2, this.ctx.currentTime, 0.02); this.gain.gain.setTargetAtTime(Math.max(0.001, intensity), this.ctx.currentTime, 0.05); }
  stop(){ /* noise is one-shot */ }
}

class GibberishEngine {
  constructor(){ this.ctx = null; this.master=null; this.channels=null; this.active = {}; }
  ensure(){ if (this.ctx) return; this.ctx = new (window.AudioContext||window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination); this.channels = { coin: new ChannelCoin(this.ctx), leaf: new ChannelLeaf(this.ctx), glass: new ChannelGlass(this.ctx), metal: new ChannelMetal(this.ctx) }; // connect outputs
    for(const k in this.channels) this.channels[k].out.connect(this.master);
  }
  triggerOn(name, params){ this.ensure(); const ch = this.channels[name]; if(!ch) return; this.active[name]=Date.now(); ch.start(params.freq||220, params.intensity||0.6); ch.setParams(params.freq||220, params.intensity||0.6, params.extra||0); }
  triggerOff(name){ const ch = this.channels[name]; if(!ch) return; if(ch.stop) ch.stop(); delete this.active[name]; }
  sweep(timeout=900){ const now=Date.now(); for(const n in this.active) if(now-this.active[n]>timeout) this.triggerOff(n); }
}

if (typeof window !== 'undefined') window.GibberishEngine = GibberishEngine;
