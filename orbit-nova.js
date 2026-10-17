// Nova's little spacecraft silhouette. Rendering only: no changes to
// movement, collision radius, scoring, difficulty, or gameplay controls.
// The nose points along Nova's clockwise orbital velocity.
(() => {
  const SPRITE_SIZE = 64;
  let liteSprite = null;

  // Local +X is forward. The two swept wings, pointed nose, dark outline,
  // and bright cyan canopy stay recognizable even at mobile canvas scale.
  function paintNovaShip(c, subtleGlow) {
    c.save();
    c.lineJoin = "round";
    c.lineCap = "round";

    // Small engine, drawn behind the actual hull.
    c.fillStyle = "rgba(25, 195, 255, 0.62)";
    c.beginPath();
    c.moveTo(-7.7, -2.1);
    c.lineTo(-13.3, 0);
    c.lineTo(-7.7, 2.1);
    c.closePath();
    c.fill();

    if (subtleGlow) {
      c.shadowColor = "#48dfff";
      c.shadowBlur = 8;
    }

    // The two fins give Nova a definite silhouette, not a round marker.
    c.fillStyle = "#83bce8";
    c.strokeStyle = "#18396e";
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(2.1, -2.2);
    c.lineTo(-6.2, -9.0);
    c.lineTo(-10.5, -8.0);
    c.lineTo(-6.5, -1.7);
    c.closePath();
    c.fill();
    c.stroke();

    c.beginPath();
    c.moveTo(2.1, 2.2);
    c.lineTo(-6.2, 9.0);
    c.lineTo(-10.5, 8.0);
    c.lineTo(-6.5, 1.7);
    c.closePath();
    c.fill();
    c.stroke();

    // A silver wedge with a brighter needle-point nose.
    c.fillStyle = "#e4f4ff";
    c.strokeStyle = "#153964";
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(12.2, 0);
    c.lineTo(2.2, -3.8);
    c.lineTo(-6.8, -3.5);
    c.lineTo(-9.2, 0);
    c.lineTo(-6.8, 3.5);
    c.lineTo(2.2, 3.8);
    c.closePath();
    c.fill();
    c.stroke();

    // Small symmetric hull highlights preserve the dart-like shape.
    c.strokeStyle = "rgba(255,255,255,0.92)";
    c.lineWidth = 0.85;
    c.beginPath();
    c.moveTo(9.4, 0);
    c.lineTo(1.3, -2.3);
    c.moveTo(9.4, 0);
    c.lineTo(1.3, 2.3);
    c.stroke();

    // Distinct central electric-blue canopy/heart.
    c.shadowColor = "#45eaff";
    c.shadowBlur = subtleGlow ? 6 : 0;
    c.fillStyle = "#07578d";
    c.beginPath();
    c.ellipse(-0.7, 0, 3.7, 2.7, 0, 0, TAU);
    c.fill();
    c.fillStyle = "#45eaff";
    c.beginPath();
    c.ellipse(-0.2, 0, 2.25, 1.75, 0, 0, TAU);
    c.fill();
    c.fillStyle = "#e9feff";
    c.beginPath();
    c.arc(0.45, -0.55, 0.75, 0, TAU);
    c.fill();

    c.restore();
  }

  function getLiteSprite() {
    if (liteSprite) return liteSprite;
    // Paint once; LITE mode only rotates a cached 64px sprite per frame.
    liteSprite = document.createElement("canvas");
    liteSprite.width = SPRITE_SIZE;
    liteSprite.height = SPRITE_SIZE;
    const c = liteSprite.getContext("2d");
    c.translate(SPRITE_SIZE / 2, SPRITE_SIZE / 2);
    paintNovaShip(c, true);
    return liteSprite;
  }

  drawPlayer = function drawNovaAsShip() {
    if (state === "waiting") return;

    const p = pointOnRing(player.lane, player.angle);
    const blink = invulnerable > 0
      ? 0.46 + Math.sin(performance.now() / 70) * 0.34
      : 1;
    const tail = pointOnRing(player.lane, player.angle - 0.18);

    ctx.save();
    ctx.globalAlpha = blink;
    ctx.lineCap = "round";

    // Preserve a clean orbital contrail; keep it behind the ship.
    if (orbitPerformance.lowPower) {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(64, 207, 255, 0.22)";
      ctx.lineWidth = 6;
    } else {
      ctx.globalCompositeOperation = "lighter";
      const gradient = ctx.createLinearGradient(tail.x, tail.y, p.x, p.y);
      gradient.addColorStop(0, "rgba(76, 216, 255, 0)");
      gradient.addColorStop(1, "rgba(151, 240, 255, 0.70)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 5;
    }
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // Player angle increases clockwise; its tangent is angle + PI/2.
    ctx.translate(p.x, p.y);
    ctx.rotate(player.angle + Math.PI / 2);
    ctx.globalCompositeOperation = "source-over";
    if (orbitPerformance.lowPower) {
      ctx.drawImage(getLiteSprite(), -SPRITE_SIZE / 2, -SPRITE_SIZE / 2);
    } else {
      paintNovaShip(ctx, true);
    }

    ctx.restore();
  };
})();
