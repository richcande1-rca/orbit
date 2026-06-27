// Starfield-only tuning for Orbit.
// More visible twinkle without changing gameplay, controls, scoring, or hazards.
makeBackground = function makeBackgroundTwinkleTune() {
  const starDensity = orbitLowPowerMode ? 8600 : 3900;
  const minStars = orbitLowPowerMode ? 38 : 96;
  const maxStars = orbitLowPowerMode ? 88 : 285;
  const starCount = Math.floor(clamp((width * height) / starDensity, minStars, maxStars));

  bgStars = Array.from({ length: starCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: rand(0.45, orbitLowPowerMode ? 1.25 : 1.9),
    twinkle: rand(0, TAU),
    speed: rand(0.52, orbitLowPowerMode ? 1.45 : 1.75),
    sparkle: rand(0.86, 1.18),
  }));

  const dustCount = orbitLowPowerMode ? 4 : 26;
  dust = Array.from({ length: dustCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: rand(24, orbitLowPowerMode ? 54 : 90),
    drift: rand(-0.06, 0.06),
    alpha: rand(0.018, orbitLowPowerMode ? 0.026 : 0.055),
  }));
};

drawBackground = function drawBackgroundTwinkleTune() {
  const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, Math.max(width, height));
  gradient.addColorStop(0, "#14275d");
  gradient.addColorStop(0.28, "#081331");
  gradient.addColorStop(0.62, "#030713");
  gradient.addColorStop(1, "#000106");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const maxAlpha = orbitLowPowerMode ? 0.82 : 0.94;

  for (const star of bgStars) {
    const shimmer = 0.5 + Math.sin(star.twinkle) * 0.5;
    const alpha = 0.14 + shimmer * 0.68 * (star.sparkle || 1);
    ctx.globalAlpha = clamp(alpha, 0.08, maxAlpha);
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, TAU);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  ctx.globalAlpha = 1;
};

makeBackground();
