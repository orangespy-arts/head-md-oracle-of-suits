function detectColor(hsv) {
  let [h, s, v] = hsv.map(Math.round);

  // --- Red (glossy / red-wine) ---
  // Rich hue around 0°, high saturation, medium–high brightness
  if ((h >= 0 && h <= 15 || h >= 345 && h <= 360) && s >= 60 && v >= 40)
    return "Red";

  // --- Gold (yellow-golden) ---
  // Hue roughly 40–55°, warm yellow tone, high saturation and brightness
  if (h >= 40 && h <= 60 && s >= 50 && v >= 50)
    return "Gold";

  // --- Brown (wood tone) ---
  // Hue between 20–35°, medium saturation, lower brightness than gold
  if (h >= 20 && h <= 35 && s >= 40 && s <= 100 && v >= 20 && v <= 70)
    return "Brown";

  // --- Silver (grey/silver) ---
  // Low saturation, mid–high brightness (avoid white)
  if (s <= 25 && v >= 40 && v <= 85)
    return "Silver";

  // --- Fallback ---
  return "Unknown";
}

function rgbToHsv(r, g, b) {
r /= 255;
g /= 255;
b /= 255;
let maxVal = Math.max(r, g, b),
minVal = Math.min(r, g, b);
let h, s, v = maxVal;
let d = maxVal - minVal;
s = maxVal === 0 ? 0 : d / maxVal;
if (maxVal === minVal) {
h = 0;
} else {
switch (maxVal) {
case r: h = (g - b) / d + (g < b ? 6 : 0); break;
case g: h = (b - r) / d + 2; break;
case b: h = (r - g) / d + 4; break;
}
h /= 6;
}
return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
}


// Map canvas coords (cx,cy) where bgImg is drawn to the pixel coords of bgImg
function canvasToImageCoords(cx, cy, img, canvasW, canvasH) {
  let ix = Math.floor((cx / canvasW) * img.width);
  let iy = Math.floor((cy / canvasH) * img.height);
  // clamp
  ix = constrain(ix, 0, img.width - 1);
  iy = constrain(iy, 0, img.height - 1);
  return { x: ix, y: iy };
}

// Sample average color from bgImg around the image coordinates (ix,iy)
// sampleSize should be odd (e.g. 5 or 7). Returns [r,g,b]
function sampleAvgColor(img, ix, iy, sampleSize = 5) {
  const half = Math.floor(sampleSize / 2);
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const sx = constrain(ix + dx, 0, img.width - 1);
      const sy = constrain(iy + dy, 0, img.height - 1);
      const c = img.get(sx, sy); // [r,g,b,a]
      rSum += c[0];
      gSum += c[1];
      bSum += c[2];
      count++;
    }
  }
  return [Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count)];
}