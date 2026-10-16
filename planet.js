// Orbit's planet: a cached, softly lit gas giant beneath the original ring system.
// All expensive atmosphere noise is generated once. Nova and orbital physics unchanged.
const orbitPlanetTextureSize = 256;
const orbitPlanetMapWidth = 384;
const orbitPlanetMapHeight = 160;
let orbitPlanetTexture = null;
let orbitPlanetSurfaceMap = null;
let orbitPlanetSurfaceCtx = null;
let orbitPlanetImage = null;
let orbitPlanetSamples = null;
let orbitPlanetLastPhase = -1;

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

// A wrapping longitude/latitude cloud map. The entire atmospheric texture,
// not merely a faint overlay, travels across the spherical projection.
function orbitBuildPlanetMap() {
  if (orbitPlanetSurfaceMap) return;
  const width = orbitPlanetMapWidth, height = orbitPlanetMapHeight;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const latitude = ((y + 0.5) / height - 0.5) * Math.PI;
    for (let x = 0; x < width; x++) {
      const longitude = ((x + 0.5) / width) * TAU;
      // Periodic coordinates avoid a visible vertical seam every rotation.
      const cx = Math.cos(longitude), cy = Math.sin(longitude);
      const warp = orbitPlanetFractal(
        cx * 2.25 + latitude * 0.8 + 9.2,
        cy * 2.25 + latitude * 1.1 + 4.1
      ) - 0.5;
      const clouds = orbitPlanetFractal(
        cx * 3.8 + latitude * 2.7 + warp * 2.6 + 8.7,
        cy * 3.8 - latitude * 2.4 + warp * 1.8 + 12.3
      );
      const filaments = orbitPlanetFractal(
        cx * 8.7 + latitude * 7.2 + warp * 3.1,
        cy * 8.7 - latitude * 5.2 - warp * 2.2 + 3.7
      );
      const circulation = Math.sin(latitude * 8.2 + warp * 2.5) * 0.04;
      // One broad distinguishable storm region makes motion noticeable.
      const dLon = Math.atan2(Math.sin(longitude - 0.42), Math.cos(longitude - 0.42));
      const storm = Math.exp(
        -1.7 * (dLon / 0.43) ** 2 -
        1.5 * ((latitude - 0.21) / 0.28) ** 2
      );
      const density = Math.max(0, Math.min(1,
        (clouds - 0.34) * 2.1 +
        (filaments - 0.5) * 0.47 + circulation +
        storm * 0.27
      ));
      const light = 0.23 + Math.pow(density, 1.25) * 0.77;
      const i = (y * width + x) * 4;
      pixels[i] = Math.round(30 + 108 * light);
      pixels[i + 1] = Math.round(68 + 139 * light);
      pixels[i + 2] = Math.round(114 + 135 * light);
      pixels[i + 3] = 255;
    }
  }
  orbitPlanetSurfaceMap = pixels;
}

function orbitBuildPlanetTexture() {
  if (!orbitPlanetTexture) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = orbitPlanetTextureSize;
    const g = canvas.getContext("2d");
    if (!g) return null;
    orbitBuildPlanetMap();
    const image = g.createImageData(orbitPlanetTextureSize, orbitPlanetTextureSize);
    const width = orbitPlanetTextureSize;
    const offsets = [], lons = [], rows = [], shades = [], alphas = [];
    for (let y = 0; y < width; y++) {
      const ny = (y + 0.5 - width / 2) / (width / 2);
      for (let x = 0; x < width; x++) {
        const nx = (x + 0.5 - width / 2) / (width / 2);
        const r2 = nx * nx + ny * ny;
        if (r2 >= 1) continue;
        const z = Math.sqrt(1 - r2);
        const lon = Math.atan2(nx, z);
        const lat = Math.asin(ny);
        const illumination = 0.30 + 0.70 * Math.pow(
          Math.max(0, nx * -0.38 + ny * -0.29 + z * 0.88), 0.86
        );
        const limb = 0.72 + 0.28 * Math.min(1, z / 0.55);
        offsets.push((y * width + x) * 4);
        lons.push(((lon / TAU + 1) % 1) * orbitPlanetMapWidth);
        rows.push(Math.max(0, Math.min(orbitPlanetMapHeight - 1,
          Math.floor((lat / Math.PI + 0.5) * orbitPlanetMapHeight))));
        shades.push(illumination * limb);
        alphas.push(Math.round(255 * Math.min(1, (1 - Math.sqrt(r2)) * width * 0.51)));
      }
    }
    orbitPlanetSamples = {
      offsets: new Uint32Array(offsets),
      lons: new Float32Array(lons),
      rows: new Uint16Array(rows),
      shades: new Float32Array(shades),
      alphas: new Uint8Array(alphas)
    };
    orbitPlanetTexture = canvas;
    orbitPlanetSurfaceCtx = g;
    orbitPlanetImage = image;
  }

  // The update clock belongs to weather.js, so pausing freezes the surface.
  // Repaint only when the longitude changes one cached-map pixel.
  const angle = window.orbitPlanetRotationAngle?.() || 0;
  const phase = ((Math.floor(angle * orbitPlanetMapWidth / TAU) %
    orbitPlanetMapWidth) + orbitPlanetMapWidth) % orbitPlanetMapWidth;
  if (phase === orbitPlanetLastPhase) return orbitPlanetTexture;

  const { offsets, lons, rows, shades, alphas } = orbitPlanetSamples;
  const target = orbitPlanetImage.data, source = orbitPlanetSurfaceMap;
  const mapWidth = orbitPlanetMapWidth;
  for (let i = 0; i < offsets.length; i++) {
    const longitude = (Math.floor(lons[i] + phase)) % mapWidth;
    const src = (rows[i] * mapWidth + longitude) * 4;
    const dst = offsets[i];
    const shade = shades[i];
    target[dst] = Math.round(source[src] * shade);
    target[dst + 1] = Math.round(source[src + 1] * shade);
    target[dst + 2] = Math.round(source[src + 2] * shade);
    target[dst + 3] = alphas[i];
  }
  orbitPlanetSurfaceCtx.putImageData(orbitPlanetImage, 0, 0);
  orbitPlanetLastPhase = phase;
  return orbitPlanetTexture;
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
