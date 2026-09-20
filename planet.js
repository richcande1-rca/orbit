// Visual override for the central planet.
// Keeps gameplay untouched while making the center feel like a stylized ringed world.
function drawPlanet() {
  ctx.save();

  const shimmer = 0.5 + Math.sin(performance.now() / 1800) * 0.5;
  const ringTilt = -0.28;
  const ringWidth = planetRadius * 1.72;
  const ringHeight = planetRadius * 0.36;

  const atmosphere = ctx.createRadialGradient(
    centerX,
    centerY,
    planetRadius * 0.82,
    centerX,
    centerY,
    planetRadius * 2.85
  );
  atmosphere.addColorStop(0, "rgba(82, 218, 255, 0.2)");
  atmosphere.addColorStop(0.46, "rgba(85, 91, 255, 0.08)");
  atmosphere.addColorStop(1, "rgba(82, 218, 255, 0)");

  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = atmosphere;
  ctx.beginPath();
  ctx.arc(centerX, centerY, planetRadius * 2.85, 0, TAU);
  ctx.fill();

  // Back half of the ring system. The planet body is drawn over this,
  // so the rings feel wrapped around the world instead of pasted on top.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.shadowBlur = 16;
  ctx.shadowColor = "rgba(125, 225, 255, 0.5)";

  const backRing = ctx.createLinearGradient(
    centerX - ringWidth,
    centerY,
    centerX + ringWidth,
    centerY
  );
  backRing.addColorStop(0, "rgba(64, 162, 255, 0)");
  backRing.addColorStop(0.26, "rgba(116, 213, 255, 0.22)");
  backRing.addColorStop(0.52, "rgba(226, 249, 255, 0.3)");
  backRing.addColorStop(0.78, "rgba(116, 213, 255, 0.22)");
  backRing.addColorStop(1, "rgba(64, 162, 255, 0)");

  ctx.strokeStyle = backRing;
  ctx.lineWidth = Math.max(5, planetRadius * 0.13);
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, ringWidth, ringHeight, ringTilt, Math.PI, TAU);
  ctx.stroke();

  ctx.strokeStyle = `rgba(219, 251, 255, ${0.12 + shimmer * 0.06})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, ringWidth * 1.06, ringHeight * 1.08, ringTilt, Math.PI, TAU);
  ctx.stroke();
  ctx.restore();

  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 28;
  ctx.shadowColor = "rgba(78, 203, 255, 0.42)";

  const surface = ctx.createRadialGradient(
    centerX - planetRadius * 0.4,
    centerY - planetRadius * 0.48,
    2,
    centerX + planetRadius * 0.12,
    centerY + planetRadius * 0.14,
    planetRadius * 1.18
  );
  surface.addColorStop(0, "#b9fbff");
  surface.addColorStop(0.18, "#63d8ff");
  surface.addColorStop(0.45, "#3953c7");
  surface.addColorStop(0.76, "#1a1b5f");
  surface.addColorStop(1, "#030416");

  ctx.fillStyle = surface;
  ctx.beginPath();
  ctx.arc(centerX, centerY, planetRadius, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, planetRadius, 0, TAU);
  ctx.clip();

  const nightSide = ctx.createRadialGradient(
    centerX + planetRadius * 0.48,
    centerY + planetRadius * 0.28,
    planetRadius * 0.08,
    centerX + planetRadius * 0.24,
    centerY + planetRadius * 0.16,
    planetRadius * 1.08
  );
  nightSide.addColorStop(0, "rgba(0, 3, 22, 0)");
  nightSide.addColorStop(0.54, "rgba(0, 3, 22, 0.2)");
  nightSide.addColorStop(1, "rgba(0, 2, 14, 0.84)");
  ctx.fillStyle = nightSide;
  ctx.fillRect(centerX - planetRadius, centerY - planetRadius, planetRadius * 2, planetRadius * 2);

  ctx.globalCompositeOperation = "lighter";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "rgba(165, 242, 255, 0.46)";

  const bandGradient = ctx.createLinearGradient(
    centerX - planetRadius,
    centerY,
    centerX + planetRadius,
    centerY
  );
  bandGradient.addColorStop(0, "rgba(157, 216, 255, 0.02)");
  bandGradient.addColorStop(0.32, `rgba(189, 243, 255, ${0.08 + shimmer * 0.04})`);
  bandGradient.addColorStop(0.62, `rgba(119, 186, 255, ${0.12 + shimmer * 0.04})`);
  bandGradient.addColorStop(1, "rgba(157, 216, 255, 0.02)");
  ctx.fillStyle = bandGradient;

  const cloudBands = [
    { y: -0.28, h: 0.12, w: 1.5, bow: -0.08 },
    { y: -0.03, h: 0.16, w: 1.65, bow: 0.07 },
    { y: 0.24, h: 0.13, w: 1.34, bow: -0.06 },
  ];

  for (const band of cloudBands) {
    const y = centerY + planetRadius * band.y;
    const half = planetRadius * band.w * 0.5;
    const bandHeight = planetRadius * band.h;

    ctx.beginPath();
    ctx.moveTo(centerX - half, y - bandHeight * 0.5);
    ctx.bezierCurveTo(
      centerX - half * 0.35,
      y + planetRadius * band.bow - bandHeight,
      centerX + half * 0.25,
      y - planetRadius * band.bow - bandHeight * 0.4,
      centerX + half,
      y - bandHeight * 0.35
    );
    ctx.lineTo(centerX + half, y + bandHeight * 0.45);
    ctx.bezierCurveTo(
      centerX + half * 0.28,
      y - planetRadius * band.bow + bandHeight,
      centerX - half * 0.2,
      y + planetRadius * band.bow + bandHeight * 0.35,
      centerX - half,
      y + bandHeight * 0.5
    );
    ctx.closePath();
    ctx.fill();
  }

  const storm = ctx.createRadialGradient(
    centerX - planetRadius * 0.24,
    centerY + planetRadius * 0.18,
    0,
    centerX - planetRadius * 0.24,
    centerY + planetRadius * 0.18,
    planetRadius * 0.28
  );
  storm.addColorStop(0, "rgba(151, 247, 255, 0.22)");
  storm.addColorStop(0.58, "rgba(93, 183, 255, 0.08)");
  storm.addColorStop(1, "rgba(151, 247, 255, 0)");
  ctx.fillStyle = storm;
  ctx.beginPath();
  ctx.ellipse(
    centerX - planetRadius * 0.24,
    centerY + planetRadius * 0.18,
    planetRadius * 0.26,
    planetRadius * 0.16,
    -0.36,
    0,
    TAU
  );
  ctx.fill();

  ctx.restore();

  // Front half of the rings, drawn after the sphere so the planet has depth.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "rgba(144, 236, 255, 0.72)";

  const frontRing = ctx.createLinearGradient(
    centerX - ringWidth,
    centerY,
    centerX + ringWidth,
    centerY
  );
  frontRing.addColorStop(0, "rgba(66, 158, 255, 0)");
  frontRing.addColorStop(0.22, "rgba(120, 219, 255, 0.48)");
  frontRing.addColorStop(0.52, "rgba(241, 253, 255, 0.62)");
  frontRing.addColorStop(0.82, "rgba(120, 219, 255, 0.48)");
  frontRing.addColorStop(1, "rgba(66, 158, 255, 0)");

  ctx.strokeStyle = frontRing;
  ctx.lineWidth = Math.max(5, planetRadius * 0.13);
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, ringWidth, ringHeight, ringTilt, 0, Math.PI);
  ctx.stroke();

  ctx.strokeStyle = "rgba(235, 253, 255, 0.34)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, ringWidth * 0.84, ringHeight * 0.78, ringTilt, 0, Math.PI);
  ctx.stroke();
  ctx.restore();

  ctx.globalCompositeOperation = "lighter";
  ctx.shadowBlur = 16;
  ctx.shadowColor = "rgba(148, 235, 255, 0.72)";
  ctx.strokeStyle = "rgba(166, 239, 255, 0.34)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(centerX, centerY, planetRadius + 0.8, 0, TAU);
  ctx.stroke();

  ctx.restore();
}

// Keeps phone movement from slowing down when the frame rate drops.
const orbitMobileStepMode = window.matchMedia("(pointer: coarse), (max-width: 720px)").matches;
const orbitMobileStepMax = 0.06;
const orbitOriginalUpdateStep = update;
let orbitLastMobileStepAt = performance.now();

update = function updateWithMobileFrameStep(cappedDt) {
  if (!orbitMobileStepMode) {
    orbitOriginalUpdateStep(cappedDt);
    return;
  }

  const now = performance.now();
  const realDt = Math.min(orbitMobileStepMax, (now - orbitLastMobileStepAt) / 1000 || cappedDt);
  orbitLastMobileStepAt = now;
  orbitOriginalUpdateStep(realDt);
};
