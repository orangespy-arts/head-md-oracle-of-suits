// ColorDetector - simple color detection helper for p5 / canvas
// Supports detecting up to multiple target colors (we'll use 4 by default).
// API summary:
//   const cd = new ColorDetector([{name:'red', color:'#ff0000', tolerance:60}, ...]);
//   const results = cd.detectFromCanvas(canvas); // or detectFromImageData(imageData)
//   results => [{name, count, centroid:{x,y}, bbox:{xMin,yMin,xMax,yMax}}...]

class ColorDetector {
  constructor(targets) {
    this.targets = [];
    if (Array.isArray(targets)) this.setTargets(targets);
  }

  // targets: array of { name, color (hex string or [r,g,b]), tolerance (number) }
  setTargets(targets) {
    this.targets = (targets || []).map(t => {
      const rgb = Array.isArray(t.color) ? t.color : ColorDetector.hexToRgb(t.color || '#000000');
      return {
        name: t.name || (t.color || '').toString(),
        r: rgb[0],
        g: rgb[1],
        b: rgb[2],
        tolerance: typeof t.tolerance === 'number' ? t.tolerance : 60,
      };
    });
  }

  // Accepts an HTMLCanvasElement and reads its pixels
  detectFromCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    return this.detectFromImageData(imageData);
  }

  // Accepts ImageData (with .data Uint8ClampedArray) and returns detection results
  detectFromImageData(imageData) {
    const { data, width, height } = imageData;

    // initialize stats for each target
    const stats = this.targets.map(t => ({
      name: t.name,
      count: 0,
      sumX: 0,
      sumY: 0,
      xMin: Infinity,
      yMin: Infinity,
      xMax: -Infinity,
      yMax: -Infinity,
    }));

    // iterate pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // skip fully transparent
        if (data[i + 3] === 0) continue;

        for (let ti = 0; ti < this.targets.length; ti++) {
          const t = this.targets[ti];
          if (ColorDetector.colorDistanceSquared(r, g, b, t.r, t.g, t.b) <= t.tolerance * t.tolerance) {
            const s = stats[ti];
            s.count++;
            s.sumX += x;
            s.sumY += y;
            if (x < s.xMin) s.xMin = x;
            if (y < s.yMin) s.yMin = y;
            if (x > s.xMax) s.xMax = x;
            if (y > s.yMax) s.yMax = y;
          }
        }
      }
    }

    // produce results
    const results = stats.map(s => {
      if (s.count === 0) {
        return {
          name: s.name,
          count: 0,
          centroid: null,
          bbox: null,
        };
      }
      return {
        name: s.name,
        count: s.count,
        centroid: { x: s.sumX / s.count, y: s.sumY / s.count },
        bbox: { xMin: s.xMin, yMin: s.yMin, xMax: s.xMax, yMax: s.yMax },
      };
    });

    return results;
  }

  // Convenience: return the result with largest count (or null)
  getPrimaryMatch(results) {
    if (!Array.isArray(results) || results.length === 0) return null;
    let best = null;
    for (const r of results) {
      if (r.count > 0 && (!best || r.count > best.count)) best = r;
    }
    return best;
  }

  // Helpers
  static hexToRgb(hex) {
    if (!hex) return [0, 0, 0];
    const s = hex.replace('#', '').trim();
    const shorthand = s.length === 3;
    let r, g, b;
    if (shorthand) {
      r = parseInt(s[0] + s[0], 16);
      g = parseInt(s[1] + s[1], 16);
      b = parseInt(s[2] + s[2], 16);
    } else {
      r = parseInt(s.substring(0, 2), 16);
      g = parseInt(s.substring(2, 4), 16);
      b = parseInt(s.substring(4, 6), 16);
    }
    return [r, g, b];
  }

  static colorDistanceSquared(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return dr * dr + dg * dg + db * db;
  }
}

// Export for environments that support module.exports (Node/testing) and attach to window for browsers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ColorDetector;
} else if (typeof window !== 'undefined') {
  window.ColorDetector = ColorDetector;
}
