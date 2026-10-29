const net = document.getElementById("net");
const wires = document.getElementById("wires");
const status = document.getElementById("status");
const NS = "http://www.w3.org/2000/svg";

let items = [];
const nodes = [];
const wireEls = [];
const paths = [];
let ring;

fetch("links.json", { cache: "no-store" })
  .then((res) => {
    if (!res.ok) throw new Error(`links.json não encontrado (HTTP ${res.status})`);
    return res.json();
  })
  .then((data) => {
    items = data.items || [];
    if (!Array.isArray(items) || items.length === 0) throw new Error('links.json precisa ter "items".');
    build(data.center || {});
    layout();
    window.addEventListener("resize", layout);
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
  const hub = document.createElement("div");
  hub.className = "hub";
  hub.innerHTML = faceHTML;
  hub.querySelector(".name").textContent = center.name || "";
  net.appendChild(hub);
  loadIcon(hub.querySelector(".face"), { name: center.name, image: center.image });

  ring = svg("path", { class: "ring" });
  wires.appendChild(ring);

  items.forEach((item, i) => {
    const group = item.group ? ` g-${item.group}` : "";

    const g = svg("g", { class: "wire" + group });
    g.style.setProperty("--d", `${0.15 * i}s`);
    g.style.setProperty("--t", `${2.4 + (i % 3) * 0.6}s`);
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

    net.appendChild(a);
    nodes.push(a);
    loadIcon(a.querySelector(".face"), item);
  });
}

// Posiciona os nós em círculo e redesenha as linhas (caminhos de circuito com uma dobra).
function layout() {
  const W = net.clientWidth;
  const H = net.clientHeight;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) * 0.36;
  const n = items.length;
  wires.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const pts = items.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { a, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });

  pts.forEach((p, i) => {
    nodes[i].style.left = `${p.x}px`;
    nodes[i].style.top = `${p.y}px`;

    const side = i % 2 ? 1 : -1;
    const mx = cx + (p.x - cx) * 0.45 + -Math.sin(p.a) * R * 0.12 * side;
    const my = cy + (p.y - cy) * 0.45 + Math.cos(p.a) * R * 0.12 * side;
    const d = `M${cx} ${cy} L${mx} ${my} L${p.x} ${p.y}`;
    paths[i].forEach((path) => path.setAttribute("d", d));
  });

  ring.setAttribute("d", n > 2 ? "M" + pts.map((p) => `${p.x} ${p.y}`).join(" L") + " Z" : "");
}
