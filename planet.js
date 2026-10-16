// Orbit's planet: a cached, softly lit gas giant beneath the original ring system.
// All expensive atmosphere noise is generated once. Nova and orbital physics unchanged.
const orbitPlanetTextureSize = 256;
let orbitPlanetTexture = null;

function orbitPlanetHash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function orbitPlanetNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = orbitPlanetHash(ix, iy);
  const b = orbitPlanetHash(ix + 1, iy);
  const c = orbitPlanetHash(ix, iy + 1);
  const d = orbitPlanetHash(ix + 1, iy + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

function orbitPlanetFractal(x, y) {
  let sum = 0, amplitude = 0.55, weight = 0;
  for (let k = 0; k < 4; k++) {
    sum += orbitPlanetNoise(x, y) * amplitude;
    weight += amplitude;
    x = x * 2.03 + 6.23;
    y = y * 2.03 - 3.81;
    amplitude *= 0.49;
  }
  return sum / weight;
}

function orbitBuildPlanetTexture() {
  if (orbitPlanetTexture) return orbitPlanetTexture;
  const sheet = document.createElement("canvas");
  sheet.width = sheet.height = orbitPlanetTextureSize;
  const g = sheet.getContext("2d");
  if (!g) return null;
  const image = g.createImageData(orbitPlanetTextureSize, orbitPlanetTextureSize);
  const pixels = image.data;
  const size = orbitPlanetTextureSize;
  for (let y = 0; y < size; y++) {
    const ny = (y + 0.5 - size / 2) / (size / 2);
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5 - size / 2) / (size / 2);
      const r2 = nx * nx + ny * ny;
      if (r2 >= 1) continue;
      const z = Math.sqrt(1 - r2);
      // Project the texture across a curved hemisphere, rather than a flat disk.
      const longitude = Math.atan2(nx, z);
      const latitude = Math.asin(ny);
      const warp = orbitPlanetFractal(longitude * 1.25 + 9.2, latitude * 2.2 + 4.1) - 0.5;
      const clouds = orbitPlanetFractal(
        longitude * 4.4 + warp * 2.7 + 8.7,
        latitude * 6.1 + warp * 1.8 + 12.3
      );
      const filaments = orbitPlanetFractal(
        longitude * 10.5 + warp * 3.4,
        latitude * 12.7 - warp * 2.4 + 3.7
      );
      // A hint of atmospheric circulation, broken up by turbulent cloud noise.
      const circulation = Math.sin(latitude * 8.2 + warp * 2.5) * 0.045;
      const density = Math.max(0, Math.min(1,
        (clouds - 0.35) * 2.0 + (filaments - 0.5) * 0.48 + circulation
      ));
      const cloudLight = 0.23 + Math.pow(density, 1.25) * 0.77;
      const shadow = 0.30 + 0.70 * Math.pow(
        Math.max(0, nx * -0.38 + ny * -0.29 + z * 0.88), 0.86
      );
      const curvedLimb = 0.72 + 0.28 * Math.min(1, z / 0.55);
      const shade = shadow * curvedLimb;
      const offset = (y * size + x) * 4;
      pixels[offset] = Math.round((30 + 108 * cloudLight) * shade);
      pixels[offset + 1] = Math.round((68 + 139 * cloudLight) * shade);
      pixels[offset + 2] = Math.round((114 + 135 * cloudLight) * shade);
      // A one-pixel feather prevents a harsh jagged circular edge.
      pixels[offset + 3] = Math.round(255 * Math.min(1, (1 - Math.sqrt(r2)) * size * 0.51));
    }
  }
  g.putImageData(image, 0, 0);
  orbitPlanetTexture = sheet;
  return sheet;
}

// Render the same tilted ring as multiple fine, translucent dust lanes.
// The back half is naturally occluded by the solid planet surface drawn next.
function drawPlanetRingBands(radius, ringWidth, ringHeight, tilt, front) {
  const begin = front ? 0 : Math.PI;
  const end = front ? Math.PI : TAU;
  const strands = front
    ? [
        { rx: 1, ry: 1, width: 0.052, color: "rgba(159,194,210,0.50)" },
        { rx: 1.037, ry: 1.048, width: 0.014, color: "rgba(182,209,222,0.28)" },
        { rx: 0.968, ry: 0.948, width: 0.017, color: "rgba(112,161,190,0.37)" },
        // A hairline division gives the broad lane some grain rather than a solid strip.
        { rx: 1.003, ry: 1.003, width: 0.010, color: "rgba(17,43,65,0.25)" },
        { rx: 1.012, ry: 1.007, width: 0.008, color: "rgba(226,238,239,0.20)" },
      ]
    : [
        { rx: 1, ry: 1, width: 0.050, color: "rgba(102,144,173,0.19)" },
        { rx: 1.037, ry: 1.048, width: 0.013, color: "rgba(154,183,194,0.11)" },
        { rx: 0.968, ry: 0.948, width: 0.016, color: "rgba(95,138,166,0.15)" },
      ];
  for (const strand of strands) {
    ctx.beginPath();
    ctx.ellipse(
      centerX, centerY,
      ringWidth * strand.rx, ringHeight * strand.ry,
      tilt, begin, end
    );
    ctx.lineWidth = Math.max(front ? 0.75 : 0.65, radius * strand.width);
    ctx.strokeStyle = strand.color;
    ctx.stroke();
  }
}

function drawPlanet() {
  const r = planetRadius;
  if (!(r > 0)) return;
  const lowPower = !!window.orbitPerformance?.lowPower;
  const tilt = -0.28, ringWidth = r * 1.72, ringHeight = r * 0.36;

  ctx.save();

  if (!lowPower) {
    const air = ctx.createRadialGradient(centerX, centerY, r * 0.87, centerX, centerY, r * 1.38);
    air.addColorStop(0, "rgba(75,159,193,0.07)");
    air.addColorStop(0.40, "rgba(74,153,200,0.045)");
    air.addColorStop(1, "rgba(60,138,201,0)");
    ctx.fillStyle = air;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r * 1.38, 0, TAU);
    ctx.fill();
  }

  // Dust lanes behind the globe are faint and partially hidden by its body.
  drawPlanetRingBands(r, ringWidth, ringHeight, tilt, false);

  const surface = orbitBuildPlanetTexture();
  if (surface) {
    ctx.drawImage(surface, centerX - r, centerY - r, 2 * r, 2 * r);
  } else {
    // Context loss / restricted canvas fallback.
    ctx.fillStyle = "#345e92";
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, TAU);
    ctx.fill();
  }

  // Weather belongs on the planet, UNDER the foreground ring.
  window.orbitRenderPlanetWeather?.();

  // A narrow cast shadow falls onto the planet, but not into space. Clip the
  // offset arc to the globe so the ring feels suspended over the atmosphere.
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, r * 0.993, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = "rgba(7,20,35,0.18)";
  ctx.lineWidth = Math.max(2.0, r * 0.066);
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + r * 0.039,
    ringWidth, ringHeight, tilt, 0, Math.PI);
  ctx.stroke();
  ctx.restore();

  // Retain a thin atmospheric rim without producing a neon outline.
  ctx.strokeStyle = "rgba(124,191,220,0.21)";
  ctx.lineWidth = Math.max(0.8, r * 0.015);
  ctx.beginPath();
  ctx.arc(centerX, centerY, r, 0, TAU);
  ctx.stroke();

  // Semi-transparent foreground ring, with a dark division and two
  // subtly different dust tracks. Its angle and radius are unchanged.
  drawPlanetRingBands(r, ringWidth, ringHeight, tilt, true);

  ctx.restore();
}
