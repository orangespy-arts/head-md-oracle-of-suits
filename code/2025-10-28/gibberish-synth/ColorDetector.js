// Simple ColorDetector: set targets, parse color strings, match a single pixel
class ColorDetector {
  constructor(targets=[]) {
    this.targets = [];
    this.setTargets(targets);
  }

  setTargets(targets){
    this.targets = (targets||[]).map(t=>{
      const p = ColorDetector.parseColor(t.color||'#000000');
      return { name: t.name||'', r:p[0], g:p[1], b:p[2], a:p[3]||1, tolerance: t.tolerance||60 };
    });
  }

  // match a single pixel RGB -> returns name or null
  matchColor(r,g,b){
    for(const t of this.targets){
      const d2 = ColorDetector.colorDistanceSquared(r,g,b,t.r,t.g,t.b);
      if (d2 <= t.tolerance*t.tolerance) return t.name;
    }
    return null;
  }

  static colorDistanceSquared(r1,g1,b1,r2,g2,b2){
    const dr=r1-r2, dg=g1-g2, db=b1-b2; return dr*dr+dg*dg+db*db;
  }

  static parseColor(s){
    if (!s) return [0,0,0,1];
    if (Array.isArray(s)) return [s[0]||0,s[1]||0,s[2]||0,s[3]!==undefined?s[3]:1];
    const str = s.toString().trim();
    const rgba = str.match(/rgba?\s*\(([^)]+)\)/i);
    if (rgba){
      const parts = rgba[1].split(',').map(p=>parseFloat(p.trim()));
      return [parts[0]||0, parts[1]||0, parts[2]||0, parts[3]!==undefined?parts[3]:1];
    }
    const hex = str.replace('#','');
    if (/^[0-9a-fA-F]{3}$/.test(hex)){
      return [parseInt(hex[0]+hex[0],16), parseInt(hex[1]+hex[1],16), parseInt(hex[2]+hex[2],16), 1];
    }
    if (/^[0-9a-fA-F]{6}$/.test(hex)){
      return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16), 1];
    }
    if (/^[0-9a-fA-F]{8}$/.test(hex)){
      return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16), parseInt(hex.slice(6,8),16)/255];
    }
    return [0,0,0,1];
  }
}

if (typeof window !== 'undefined') window.ColorDetector = ColorDetector;
