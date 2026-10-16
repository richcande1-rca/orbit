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
      const cloudLight = 0.18 + Math.pow(density, 1.25) * 0.82;
      const shadow = 0.21 + 0.79 * Math.pow(
        Math.max(0, nx * -0.38 + ny * -0.29 + z * 0.88), 0.86
      );
      const curvedLimb = 0.62 + 0.38 * Math.min(1, z / 0.55);
      const shade = shadow * curvedLimb;
      const offset = (y * size + x) * 4;
      pixels[offset] = Math.round((25 + 104 * cloudLight) * shade);
      pixels[offset + 1] = Math.round((61 + 129 * cloudLight) * shade);
      pixels[offset + 2] = Math.round((111 + 119 * cloudLight) * shade);
      // A one-pixel feather prevents a harsh jagged circular edge.
      pixels[offset + 3] = Math.round(255 * Math.min(1, (1 - Math.sqrt(r2)) * size * 0.51));
    }
  }
  g.putImageData(image, 0, 0);
  orbitPlanetTexture = sheet;
  return sheet;
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

  // Back half of the existing ring, obscured by the globe.
  ctx.strokeStyle = lowPower ? "rgba(109,174,212,0.42)" : "rgba(110,186,222,0.48)";
  ctx.lineWidth = Math.max(4, r * 0.095);
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, ringWidth, ringHeight, tilt, Math.PI, TAU);
  ctx.stroke();

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

  // Subtle atmospheric rim; no neon bloom across the sphere.
  ctx.strokeStyle = "rgba(124,191,220,0.23)";
  ctx.lineWidth = Math.max(0.8, r * 0.016);
  ctx.beginPath();
  ctx.arc(centerX, centerY, r, 0, TAU);
  ctx.stroke();

  // Preserve the familiar icy-blue front ring and its tilted perspective.
  ctx.strokeStyle = lowPower ? "rgba(179,218,237,0.64)" : "rgba(184,224,245,0.72)";
  ctx.lineWidth = Math.max(4, r * 0.095);
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, ringWidth, ringHeight, tilt, 0, Math.PI);
  ctx.stroke();

  ctx.strokeStyle = "rgba(220,246,255,0.20)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, ringWidth * 0.97, ringHeight * 0.95, tilt, 0, Math.PI);
  ctx.stroke();

  ctx.restore();
}
