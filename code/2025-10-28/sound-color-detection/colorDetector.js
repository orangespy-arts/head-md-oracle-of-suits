// ColorDetector - simple color detection helper for p5 / canvas
// Supports detecting multiple target colors and matching a single pixel.

class ColorDetector {
  constructor(targets) {
    this.targets = [];
    if (Array.isArray(targets)) this.setTargets(targets);
  }

  // targets: array of { name, color (hex string or [r,g,b] or rgba()), tolerance (number) }
  setTargets(targets) {
    this.targets = (targets || []).map(t => {
      const parsed = Array.isArray(t.color) ? t.color : ColorDetector.parseColor(t.color || '#000000');
      return {
        name: t.name || (t.color || '').toString(),
        r: parsed[0],
        g: parsed[1],
        b: parsed[2],
        a: parsed[3] !== undefined ? parsed[3] : 1,
        tolerance: typeof t.tolerance === 'number' ? t.tolerance : 60,
      };
    });
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

  // Given a single rgb triple, return the best matching target name or null
  matchColor(r, g, b) {
    let best = null;
    for (const t of this.targets) {
      const d2 = ColorDetector.colorDistanceSquared(r, g, b, t.r, t.g, t.b);
      if (d2 <= t.tolerance * t.tolerance) {
        if (!best || d2 < best.d2) best = { name: t.name, d2 };
      }
    }
    return best ? best.name : null;
  }

  // Helpers
  static parseColor(input) {
    if (!input) return [0, 0, 0, 1];
    if (Array.isArray(input)) return [input[0] || 0, input[1] || 0, input[2] || 0, input[3] !== undefined ? input[3] : 1];
    const s = input.toString().trim();
    // rgba(...) or rgb(...)
    const rgbaMatch = s.match(/rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*\.?\d+))?\s*\)/i);
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1], 10);
      const g = parseInt(rgbaMatch[2], 10);
      const b = parseInt(rgbaMatch[3], 10);
      const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
      return [r, g, b, a];
    }

    // hex, allow #rrggbb or #rrggbbaa or #rgb
    const hex = s.replace('#', '');
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return [r, g, b, 1];
    }
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return [r, g, b, 1];
    }
    if (/^[0-9a-fA-F]{8}$/.test(hex)) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const a = parseInt(hex.substring(6, 8), 16) / 255;
      return [r, g, b, a];
    }

    // fallback: try to parse comma-separated numbers
    const nums = s.split(',').map(v => parseFloat(v)).filter(n => !Number.isNaN(n));
    if (nums.length >= 3) return [nums[0], nums[1], nums[2], nums[3] !== undefined ? nums[3] : 1];
    return [0, 0, 0, 1];
  }

  static colorDistanceSquared(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return dr * dr + dg * dg + db * db;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ColorDetector;
} else if (typeof window !== 'undefined') {
  window.ColorDetector = ColorDetector;
}
