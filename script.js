const net = document.getElementById("net");
const wires = document.getElementById("wires");
const status = document.getElementById("status");
const NS = "http://www.w3.org/2000/svg";

let items = [];
const nodes = [];
const wireEls = [];
const paths = [];
let ring, hub;
let W = 0, H = 0, rot = 0, speed = 1, px = 0, py = 0, tx = 0, ty = 0, last = 0;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fx = document.getElementById("fx");
const fctx = fx.getContext("2d");
let dots = [];

fetch("links.json", { cache: "no-store" })
  .then((res) => {
    if (!res.ok) throw new Error(`links.json não encontrado (HTTP ${res.status})`);
    return res.json();
  })
  .then((data) => {
    items = data.items || [];
    if (!Array.isArray(items) || items.length === 0) throw new Error('links.json precisa ter "items".');
    build(data.center || {});
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", (e) => {
      tx = (e.clientX / innerWidth - 0.5) * 28;
      ty = (e.clientY / innerHeight - 0.5) * 28;
    });
    requestAnimationFrame(frame);
  })
  .catch((err) => {
    console.error(err);
    status.textContent = "Erro: " + err.message +
      (location.protocol === "file:" ? " Abra por um servidor local (veja o README)." : "");
  });

function svg(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function initials(name) {
  const p = (name || "?").replace(/[()]/g, "").trim().split(/\s+/);
  return ((p[0]?.[0] || "?") + (p[1]?.[0] || "")).toUpperCase();
}

function iconCandidates(url) {
  try {
    const d = new URL(url).hostname.replace(/^www\./, "");
    return [`https://www.google.com/s2/favicons?domain=${d}&sz=256`, `https://icons.duckduckgo.com/ip3/${d}.ico`];
  } catch { return []; }
}

function loadIcon(face, item) {
  const img = face.querySelector("img");
  const fb = face.querySelector(".fb");
  const list = item.image ? [item.image] : iconCandidates(item.url);
  let k = 0;
  const next = () => {
    if (k >= list.length) { img.hidden = true; fb.hidden = false; fb.textContent = initials(item.name); return; }
    const probe = new Image();
    probe.onload = () => { img.src = probe.src; img.hidden = false; fb.hidden = true; };
    probe.onerror = next;
    probe.src = list[k++];
  };
  next();
}

const faceHTML = `<span class="face"><img alt="" hidden draggable="false"><span class="fb" hidden></span></span><span class="name"></span>`;

function build(center) {
  hub = document.createElement("div");
  hub.className = "hub";
  hub.innerHTML = `<span class="spin"></span>` + faceHTML;
  typeName(hub.querySelector(".name"), center.name || "");
  net.appendChild(hub);
  loadIcon(hub.querySelector(".face"), { name: center.name, image: center.image });

  ring = svg("path", { class: "ring" });
  wires.appendChild(ring);

  items.forEach((item, i) => {
    const group = item.group ? ` g-${item.group}` : "";

    const g = svg("g", { class: "wire" + group });
    g.style.setProperty("--d", `${0.15 * i}s`);
    g.style.setProperty("--t", `${1.8 + (i % 3) * 0.5}s`);
    const line = svg("path", { class: "line", pathLength: 100 });
    const pulse = svg("path", { class: "pulse", pathLength: 100 });
    g.append(line, pulse);
    wires.appendChild(g);
    wireEls.push(g);
    paths.push([line, pulse]);

    const a = document.createElement("a");
    a.className = "node" + group;
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", `Abrir ${item.name || "link"}`);
    a.style.setProperty("--nd", `${0.5 + 0.12 * i}s`);
    a.innerHTML = faceHTML;
    a.querySelector(".name").textContent = item.name || "Link";

    const set = (on) => { g.classList.toggle("on", on); net.classList.toggle("has-active", on); };
    a.addEventListener("mouseenter", () => set(true));
    a.addEventListener("mouseleave", () => set(false));
    a.addEventListener("focus", () => set(true));
    a.addEventListener("blur", () => set(false));

    a.addEventListener("click", () => {
      a.classList.remove("burst");
      void a.offsetWidth;
      a.classList.add("burst");
    });

    net.appendChild(a);
    nodes.push(a);
    loadIcon(a.querySelector(".face"), item);
  });
}

function typeName(el, text) {
  if (reduce) { el.textContent = text; return; }
  el.textContent = "";
  setTimeout(() => {
    let i = 0;
    const id = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(id);
    }, 90);
  }, 500);
}

function resize() {
  W = net.clientWidth;
  H = net.clientHeight;
  wires.setAttribute("viewBox", `0 0 ${W} ${H}`);
  fx.width = innerWidth;
  fx.height = innerHeight;
  const count = reduce ? 0 : Math.min(70, Math.floor((innerWidth * innerHeight) / 16000));
  dots = Array.from({ length: count }, () => ({
    x: Math.random() * fx.width, y: Math.random() * fx.height,
    vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
  }));
}

// Rede de partículas ao fundo.
function drawFx() {
  fctx.clearRect(0, 0, fx.width, fx.height);
  fctx.fillStyle = "rgba(0,200,255,.55)";
  for (const d of dots) {
    d.x += d.vx; d.y += d.vy;
    if (d.x < 0 || d.x > fx.width) d.vx *= -1;
    if (d.y < 0 || d.y > fx.height) d.vy *= -1;
    fctx.fillRect(d.x, d.y, 2, 2);
  }
  for (let i = 0; i < dots.length; i++) {
    for (let j = i + 1; j < dots.length; j++) {
      const dx = dots[i].x - dots[j].x;
      const dy = dots[i].y - dots[j].y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 12100) {
        fctx.strokeStyle = `rgba(0,200,255,${(1 - d2 / 12100) * 0.18})`;
        fctx.beginPath();
        fctx.moveTo(dots[i].x, dots[i].y);
        fctx.lineTo(dots[j].x, dots[j].y);
        fctx.stroke();
      }
    }
  }
}

function frame(t) {
  const dt = Math.min(50, t - last) / 1000;
  last = t;
  if (!reduce) {
    // Passar o mouse num link pausa a órbita aos poucos, para facilitar o clique.
    const target = net.classList.contains("has-active") ? 0 : 1;
    speed += (target - speed) * 0.08;
    rot += dt * 0.12 * speed;
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;
    drawFx();
  }
  place(t);
  if (!reduce) requestAnimationFrame(frame);
}

// Posiciona nós e linhas: órbita lenta, respiração do raio e parallax com o mouse.
function place(t) {
  const n = items.length;
  const R = Math.min(W, H) * 0.36;
  const cx = W / 2 - px * 0.5;
  const cy = H / 2 - py * 0.5;
  hub.style.transform = `translate(${-px * 0.5}px,${-py * 0.5}px)`;

  const pts = items.map((_, i) => {
    const a = -Math.PI / 2 + rot + (i * 2 * Math.PI) / n;
    const r = R * (1 + 0.05 * Math.sin(t * 0.0013 + i * 1.7));
    return { a, r, x: W / 2 + px + r * Math.cos(a), y: H / 2 + py + r * Math.sin(a) };
  });

  pts.forEach((p, i) => {
    nodes[i].style.left = `${p.x}px`;
    nodes[i].style.top = `${p.y}px`;

    const side = i % 2 ? 1 : -1;
    const mx = cx + (p.x - cx) * 0.45 - Math.sin(p.a) * p.r * 0.12 * side;
    const my = cy + (p.y - cy) * 0.45 + Math.cos(p.a) * p.r * 0.12 * side;
    const d = `M${cx} ${cy} L${mx} ${my} L${p.x} ${p.y}`;
    paths[i].forEach((path) => path.setAttribute("d", d));
  });

  ring.setAttribute("d", n > 2 ? "M" + pts.map((p) => `${p.x} ${p.y}`).join(" L") + " Z" : "");
}
