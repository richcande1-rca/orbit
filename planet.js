// Visual override for the central planet.
// Keeps gameplay untouched while making the center feel more like a small world
// and less like an atom diagram.
function drawPlanet() {
  ctx.save();

  const shimmer = 0.5 + Math.sin(performance.now() / 1800) * 0.5;

  const atmosphere = ctx.createRadialGradient(
    centerX,
    centerY,
    planetRadius * 0.82,
    centerX,
    centerY,
    planetRadius * 2.75
  );
  atmosphere.addColorStop(0, "rgba(82, 218, 255, 0.22)");
  atmosphere.addColorStop(0.46, "rgba(49, 123, 255, 0.08)");
  atmosphere.addColorStop(1, "rgba(82, 218, 255, 0)");

  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = atmosphere;
  ctx.beginPath();
  ctx.arc(centerX, centerY, planetRadius * 2.75, 0, TAU);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 28;
  ctx.shadowColor = "rgba(78, 203, 255, 0.42)";

  const surface = ctx.createRadialGradient(
    centerX - planetRadius * 0.38,
    centerY - planetRadius * 0.46,
    2,
    centerX + planetRadius * 0.12,
    centerY + planetRadius * 0.14,
    planetRadius * 1.18
  );
  surface.addColorStop(0, "#b9fbff");
  surface.addColorStop(0.18, "#62d7ff");
  surface.addColorStop(0.45, "#236dc6");
  surface.addColorStop(0.76, "#0b2466");
  surface.addColorStop(1, "#020516");

  ctx.fillStyle = surface;
  ctx.beginPath();
  ctx.arc(centerX, centerY, planetRadius, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, planetRadius, 0, TAU);
  ctx.clip();

  const nightSide = ctx.createRadialGradient(
    centerX + planetRadius * 0.46,
    centerY + planetRadius * 0.28,
    planetRadius * 0.08,
    centerX + planetRadius * 0.25,
    centerY + planetRadius * 0.16,
    planetRadius * 1.08
  );
  nightSide.addColorStop(0, "rgba(0, 3, 22, 0)");
  nightSide.addColorStop(0.55, "rgba(0, 3, 22, 0.2)");
  nightSide.addColorStop(1, "rgba(0, 2, 14, 0.82)");
  ctx.fillStyle = nightSide;
  ctx.fillRect(centerX - planetRadius, centerY - planetRadius, planetRadius * 2, planetRadius * 2);

  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = 8;
  ctx.shadowColor = "rgba(165, 242, 255, 0.65)";
  ctx.strokeStyle = `rgba(201, 250, 255, ${0.17 + shimmer * 0.08})`;
  ctx.lineWidth = Math.max(1.4, planetRadius * 0.045);

  const cloudBands = [
    { y: -0.34, w: 0.92, bow: -0.12 },
    { y: -0.12, w: 1.18, bow: 0.08 },
    { y: 0.1, w: 1.05, bow: -0.06 },
    { y: 0.32, w: 0.78, bow: 0.1 },
  ];

  for (const band of cloudBands) {
    const y = centerY + planetRadius * band.y;
    const half = planetRadius * band.w * 0.5;
    ctx.beginPath();
    ctx.moveTo(centerX - half, y);
    ctx.bezierCurveTo(
      centerX - half * 0.38,
      y + planetRadius * band.bow,
      centerX + half * 0.18,
      y - planetRadius * band.bow,
      centerX + half * 0.78,
      y + planetRadius * band.bow * 0.25
    );
    ctx.stroke();
  }

  const storm = ctx.createRadialGradient(
    centerX - planetRadius * 0.25,
    centerY + planetRadius * 0.18,
    0,
    centerX - planetRadius * 0.25,
    centerY + planetRadius * 0.18,
    planetRadius * 0.28
  );
  storm.addColorStop(0, "rgba(142, 246, 255, 0.24)");
  storm.addColorStop(1, "rgba(142, 246, 255, 0)");
  ctx.fillStyle = storm;
  ctx.beginPath();
  ctx.arc(centerX - planetRadius * 0.25, centerY + planetRadius * 0.18, planetRadius * 0.3, 0, TAU);
  ctx.fill();

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
