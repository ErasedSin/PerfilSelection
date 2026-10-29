const track = document.getElementById("track");
const label = document.getElementById("label");
const sub = document.getElementById("sub");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const viewport = document.getElementById("viewport");
const hint = document.getElementById("hint");

const MAX_SIDE = 3;   // bolhas visíveis de cada lado do centro
const MOVE_MS = 420;  // mesmo tempo da transição no CSS
const SWIPE_MIN = 50; // px mínimos para contar como arraste

let items = [];
let bubbles = [];
let prevOffsets = [];
let index = 0;
let locked = false;
let suppressClick = false;

setTimeout(() => { if (hint) hint.style.opacity = "0"; }, 2200);

fetch("links.json", { cache: "no-store" })
  .then((res) => {
    if (!res.ok) throw new Error(`links.json não encontrado (HTTP ${res.status})`);
    return res.json();
  })
  .then((data) => {
    items = data.items || data.links || [];
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('links.json precisa ter "items" (lista de links).');
    }
    buildBubbles();
    render(0);
    setupControls();
  })
  .catch(showError);

function showError(err) {
  console.error(err);
  label.textContent = "Erro: " + err.message;
  sub.textContent = location.protocol === "file:"
    ? "Abra por um servidor local (veja o README) ou pelo GitHub Pages."
    : "Verifique o links.json e recarregue a página.";
}

const mod = (n, m) => ((n % m) + m) % m;

// Distância circular do item i até o centro (negativo = esquerda).
function offsetOf(i) {
  const n = items.length;
  let d = mod(i - index, n);
  if (d > n / 2) d -= n;
  return d;
}

function initials(name) {
  if (!name) return "?";
  const parts = name.replace(/[()]/g, "").trim().split(/\s+/);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
}

function iconCandidates(url) {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return [
      `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    ];
  } catch {
    return [];
  }
}

// Posição de cada slot em arco: y, escala, opacidade, rotação, blur e profundidade.
function slotFor(off) {
  const a = Math.min(Math.abs(off), 3);
  const side = off < 0 ? -1 : 1;
  return {
    y: [-10, 18, 42, 58][a],
    sc: [1.35, 0.92, 0.72, 0.56][a],
    op: [1, 0.74, 0.48, 0.28][a],
    ry: side * [0, 14, 28, 40][a],
    blur: [0, 0, 1, 2][a],
    z: [30, 10, 0, -10][a],
  };
}

function buildBubbles() {
  track.innerHTML = "";
  bubbles = items.map((item, i) => {
    const el = document.createElement("a");
    el.className = "bubble";
    el.href = item.url;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    el.draggable = false;
    el.setAttribute("aria-label", `Abrir ${item.name || "link"}`);
    el.style.setProperty("--delay", `${(i % 7) * 0.12}s`);
    el.innerHTML = `<img alt="" hidden draggable="false"><span class="fallback" hidden></span>`;

    // Centro abre o link; os outros só navegam (até 2 passos).
    el.addEventListener("click", (e) => {
      const off = offsetOf(i);
      if (suppressClick || off !== 0) {
        e.preventDefault();
        if (!suppressClick) go(Math.max(-2, Math.min(2, off)));
      }
    });

    track.appendChild(el);
    loadIcon(el, item);
    return el;
  });
}

function loadIcon(el, item) {
  const img = el.querySelector("img");
  const fb = el.querySelector(".fallback");
  const candidates = item.image ? [item.image] : iconCandidates(item.url);
  let k = 0;

  const useFallback = () => {
    img.hidden = true;
    fb.hidden = false;
    fb.textContent = initials(item.name);
  };

  const tryNext = () => {
    if (k >= candidates.length) return useFallback();
    const probe = new Image();
    probe.onload = () => { img.src = probe.src; img.hidden = false; fb.hidden = true; };
    probe.onerror = tryNext;
    probe.src = candidates[k++];
  };

  tryNext();
}

function applySlot(el, off) {
  const s = slotFor(off);
  const hidden = Math.abs(off) > MAX_SIDE;

  el.style.setProperty("--ox", off);
  el.style.setProperty("--y", `${s.y}px`);
  el.style.setProperty("--sc", s.sc);
  el.style.setProperty("--op", hidden ? 0 : s.op);
  el.style.setProperty("--ry", `${s.ry}deg`);
  el.style.setProperty("--blur", `${s.blur}px`);
  el.style.setProperty("--z", `${s.z}px`);

  el.classList.toggle("is-center", off === 0);
  el.classList.toggle("is-hidden", hidden);
  el.tabIndex = off === 0 ? 0 : -1;
  el.setAttribute("aria-hidden", hidden ? "true" : "false");
}

// Cada bolha pertence a um item e só muda de posição: o CSS anima o movimento.
function render(delta) {
  items.forEach((_, i) => {
    const el = bubbles[i];
    const off = offsetOf(i);
    const prev = prevOffsets[i];

    // Quem "dá a volta" no círculo reaparece do outro lado sem atravessar a tela.
    const wrapped = prev !== undefined && delta !== 0 && off !== prev - delta;
    if (wrapped) el.style.transition = "none";
    applySlot(el, off);
    if (wrapped) { void el.offsetWidth; el.style.transition = ""; }

    prevOffsets[i] = off;
  });

  label.textContent = items[index].name || "Sem nome";
}

function go(delta) {
  if (locked || delta === 0) return;
  locked = true;
  index = mod(index + delta, items.length);
  render(delta);
  setTimeout(() => { locked = false; }, MOVE_MS);
}

function setupControls() {
  btnPrev.addEventListener("click", () => go(-1));
  btnNext.addEventListener("click", () => go(1));

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });

  // Arrastar com dedo ou mouse (pointer events cobrem os dois).
  let startX = 0;
  let startY = 0;
  let tracking = false;

  viewport.addEventListener("pointerdown", (e) => {
    tracking = true;
    suppressClick = false;
    startX = e.clientX;
    startY = e.clientY;
  });

  window.addEventListener("pointerup", (e) => {
    if (!tracking) return;
    tracking = false;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy)) return;

    // Soltar depois de arrastar não pode abrir o link da bolha sob o cursor.
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    go(dx < 0 ? 1 : -1);
  });

  window.addEventListener("pointercancel", () => { tracking = false; });
}
