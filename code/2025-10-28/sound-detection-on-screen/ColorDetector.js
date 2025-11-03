// ColorDetector.js
// Small wrapper that exposes a ColorDetector class with matchColor(r,g,b)
// It reuses the global rgbToHsv/detectColor helpers defined in colordetect.js

class ColorDetector {
  constructor(targets){
    // targets optional; we keep it for API compatibility with other projects
    this.targets = targets || null;
  }

  // Accepts r,g,b (0-255) and returns a normalized name matching HandMapper expectations
  // Returns one of: 'gold', 'brown', 'red', 'gray' or null if unknown
  matchColor(r, g, b){
    try {
      if (typeof rgbToHsv !== 'function' || typeof detectColor !== 'function') {
        // fallback: simple brightness-based guess
        const avg = (r+g+b)/3;
        if (avg < 40) return null;
        if (r > 200 && g > 200 && b < 150) return 'gold';
        if (r > 180 && g < 100 && b < 100) return 'red';
        return null;
      }

      const hsv = rgbToHsv(r, g, b);
      let name = detectColor(hsv);
      if (!name) return null;
      name = name.toString().toLowerCase();
      // harmonize names to HandMapper keys
      if (name === 'silver') name = 'gray';
      if (name === 'unknown') return null;
      return name;
    } catch (e) {
      console.warn('ColorDetector.matchColor error', e);
      return null;
    }
  }
}

// expose globally for sketches that call new ColorDetector(...)
if (typeof window !== 'undefined') window.ColorDetector = ColorDetector;
