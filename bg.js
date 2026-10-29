// Fundos animados desenhados no <canvas id="fx">.
const Bg = (() => {
  const cv = document.getElementById("fx");
  const ctx = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CH = "01ABCDEF<>/{}$#";
  let mode = "rede";
  let dots = [], cols = [], stars = [];

  const newStar = (anywhere) => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: anywhere ? Math.random() : 1 });

  function seed() {
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    dots = []; cols = []; stars = [];
    if (reduce || mode === "nenhum") return;
    if (mode === "rede") {
      dots = Array.from({ length: Math.min(70, Math.floor((w * h) / 16000)) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      }));
    } else if (mode === "chuva") {
      cols = Array.from({ length: Math.ceil(w / 18) }, () => ({ y: Math.random() * (h / 16), v: 0.25 + Math.random() * 0.5 }));
      ctx.fillStyle = "#05070b";
      ctx.fillRect(0, 0, w, h);
    } else if (mode === "estrelas") {
      stars = Array.from({ length: 140 }, () => newStar(true));
    }
  }

  function resize() { cv.width = innerWidth; cv.height = innerHeight; seed(); }
  function set(m) { mode = ["rede", "chuva", "estrelas", "aurora", "nenhum"].includes(m) ? m : "rede"; seed(); }

  function draw(t) {
    if (reduce || mode === "nenhum") return;
    const w = cv.width, h = cv.height;

    if (mode === "rede") {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,200,255,.55)";
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.fillRect(d.x, d.y, 2, 2);
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y, d2 = dx * dx + dy * dy;
          if (d2 < 12100) {
            ctx.strokeStyle = `rgba(0,200,255,${(1 - d2 / 12100) * 0.18})`;
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.stroke();
          }
        }
      }
    } else if (mode === "chuva") {
      ctx.fillStyle = "rgba(5,7,11,.06)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = "15px monospace";
      cols.forEach((c, i) => {
        const p = Math.floor(c.y);
        c.y += c.v;
        const q = Math.floor(c.y);
        if (q !== p) {
          ctx.fillStyle = Math.random() < 0.04 ? "#fff" : "rgba(0,200,255,.85)";
          ctx.fillText(CH[(Math.random() * CH.length) | 0], i * 18, q * 16);
        }
        if (c.y * 16 > h + 200 && Math.random() > 0.97) c.y = 0;
      });
    } else if (mode === "estrelas") {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.z -= 0.0035;
        const sx = w / 2 + (s.x / s.z) * w * 0.12;
        const sy = h / 2 + (s.y / s.z) * w * 0.12;
        if (s.z < 0.03 || sx < 0 || sx > w || sy < 0 || sy > h) { Object.assign(s, newStar(false)); continue; }
        const size = (1 - s.z) * 2.2 + 0.4;
        ctx.fillStyle = `rgba(180,230,255,${1 - s.z * 0.7})`;
        ctx.fillRect(sx, sy, size, size);
      }
    } else if (mode === "aurora") {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      [[0, 200, 255, 0.0002, 0], [255, 60, 150, 0.00016, 2], [90, 255, 160, 0.00012, 4]].forEach(([r, g, b, sp, ph]) => {
        const x = w * (0.5 + 0.35 * Math.sin(t * sp + ph));
        const y = h * (0.5 + 0.3 * Math.cos(t * sp * 0.85 + ph));
        const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.5);
        grad.addColorStop(0, `rgba(${r},${g},${b},.22)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      });
      ctx.globalCompositeOperation = "source-over";
    }
  }

  return { set, resize, draw };
})();
