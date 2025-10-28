// HandMapper: maps fingertip position + sampled color into engine triggers
class HandMapper {
  constructor(engine, colorDetector){
    this.engine = engine;
    this.cd = colorDetector;
    this.map = { 'gold':'coin', 'brown':'leaf', 'red':'glass', 'gray':'metal' };
    this.colorNames = { coin:'gold', leaf:'brown', glass:'red', metal:'gray' };
    this.last = null;
  }

  // pixel: {r,g,b,a}, normX/normY in 0..1
  sampleAt(normX, normY, pixel){
    const name = this.cd.matchColor(pixel.r, pixel.g, pixel.b);
    const channel = name ? this.map[name] : null;
    // compute parameters
    const freq = 220 * Math.pow(2, (normX-0.5)*2); // +-2 octaves
    const intensity = 0.2 + 0.9*normY; // vertical increases intensity
    const cutoff = 800 + normY*6000;

    // release previous if changed
    if (this.last && this.last !== channel){ this.engine.triggerOff(this.last); }

    if (channel){ this.engine.triggerOn(channel, { freq, intensity, extra: cutoff }); this.last = channel; }
    else { this.last = null; }
  }
}

if (typeof window !== 'undefined') window.HandMapper = HandMapper;
