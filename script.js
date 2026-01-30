const track = document.getElementById("track");
const label = document.getElementById("label");
const sub = document.getElementById("sub");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const viewport = document.getElementById("viewport");
const hint = document.getElementById("hint");

let baseItems = [];
let index = 0;
let animLock = false;

// 7 slots: [-3,-2,-1,0,+1,+2,+3]
const OFFSETS = [-3, -2, -1, 0, 1, 2, 3];
let bubbleEls = [];

// cache: src -> "ok"/"fail"
const imgCache = new Map();

setTimeout(() => { if (hint) hint.style.opacity = "0"; }, 2200);

fetch("links.json", { cache: "no-store" })
  .then((res) => {
    if (!res.ok) throw new Error(`links.json não encontrado (HTTP ${res.status})`);
    return res.json();
  })
  .then((data) => {
    baseItems = data.items || data.links || [];
    if (!Array.isArray(baseItems) || baseItems.length === 0) {
      throw new Error('links.json precisa ter "items" (lista de links).');
    }

    index = 0;
    initBubbles();
    applySlots();      // aplica posições iniciais
    preloadAround();   // pré-carrega
    paintAll();        // coloca imagens e textos
    setupControls();
  })
  .catch((err) => {
    console.error(err);
    label.textContent = "Erro: " + err.message;
    sub.textContent = "Verifique links.json e faça Ctrl+Shift+R.";
  });

function mod(n, m) { return ((n % m) + m) % m; }

function getInitials(name) {
  if (!name) return "?";
  const parts = name.replace(/[()]/g, "").trim().split(/\s+/);
  const a = parts[0]?.[0] || "?";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

function iconCandidates(url) {
  try {
    const u = new URL(url);
    const domain = u.hostname.replace(/^www\./, "");
    return [
      `https://logo.clearbit.com/${domain}`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=512`,
    ];
  } catch {
    return [];
  }
}

/**
 * Slots “Budokai”: posições em ARCO (x,y,scale,opacity,rotateY,blur,z)
 * Ajusta aqui se quiser mais curvado/agressivo.
 */
function slotForOffset(off) {
  const a = Math.abs(off);

  // X em função do slot (mais longe, mais para o lado)
  const x = off * 110; // espaçamento horizontal
  // Y dá o “arco” (mais longe, mais baixo)
  const y = a === 0 ? -10 : a === 1 ? 18 : a === 2 ? 42 : 58;

  const sc = a === 0 ? 1.35 : a === 1 ? 0.92 : a === 2 ? 0.72 : 0.56;
  const op = a === 0 ? 1 : a === 1 ? 0.74 : a === 2 ? 0.48 : 0.28;

  // rotação 3D (lado esquerdo invertido)
  const ryBase = a === 0 ? 0 : a === 1 ? 14 : a === 2 ? 28 : 40;
  const ry = off < 0 ? -ryBase : ryBase;

  const blur = a === 0 ? 0 : a === 1 ? 0 : a === 2 ? 1 : 2;
  const z = a === 0 ? 30 : a === 1 ? 10 : a === 2 ? 0 : -10;

  return { x, y, sc, op, ry, blur, z };
}

function initBubbles() {
  track.innerHTML = "";
  bubbleEls = OFFSETS.map((off) => {
    const el = document.createElement("div");
    el.className = "bubble";
    el.innerHTML = `
      <img alt="" draggable="false">
      <div class="fallback"></div>
    `;
    track.appendChild(el);

    // delay diferente na flutuação
    el.style.setProperty("--delay", `${Math.abs(off) * 0.12}s`);

    // click: centro abre, adjacentes navegam (até 2)
    el.addEventListener("click", () => {
      if (animLock) return;
      if (off === 0) {
        window.open(baseItems[index].url, "_blank");
        return;
      }
      const steps = Math.max(-2, Math.min(2, off));
      if (steps > 0) next(steps);
      else prev(-steps);
    });

    return el;
  });
}

function applySlots() {
  // Só posiciona as bolhas nos slots. NÃO troca conteúdo aqui.
  OFFSETS.forEach((off, slotIdx) => {
    const el = bubbleEls[slotIdx];
    const s = slotForOffset(off);

    el.style.setProperty("--x", `${s.x}px`);
    el.style.setProperty("--y", `${s.y}px`);
    el.style.setProperty("--sc", `${s.sc}`);
    el.style.setProperty("--op", `${s.op}`);
    el.style.setProperty("--ry", `${s.ry}deg`);
    el.style.setProperty("--blur", `${s.blur}px`);
    el.style.setProperty("--z", `${s.z}px`);

    el.classList.toggle("is-center", off === 0);
  });
}

function setBubbleContent(el, item) {
  const img = el.querySelector("img");
  const fb = el.querySelector(".fallback");

  const candidates = item.image ? [item.image] : iconCandidates(item.url);
  let k = 0;

  const useFallback = () => {
    img.style.display = "none";
    fb.style.display = "grid";
    fb.textContent = getInitials(item.name);
  };

  const useImg = (src) => {
    img.style.display = "block";
    fb.style.display = "none";
    img.alt = item.name || "Link";
    img.src = src;
  };

  const tryNext = () => {
    if (k >= candidates.length) { useFallback(); return; }
    const src = candidates[k++];

    const c = imgCache.get(src);
    if (c === "fail") { tryNext(); return; }
    if (c === "ok") { useImg(src); return; }

    const tester = new Image();
    tester.onload = () => { imgCache.set(src, "ok"); useImg(src); };
    tester.onerror = () => { imgCache.set(src, "fail"); tryNext(); };
    tester.src = src;
  };

  tryNext();
}

function paintAll() {
  // Coloca conteúdo (imagens) para os 7 itens em volta do index
  OFFSETS.forEach((off, slotIdx) => {
    const i = mod(index + off, baseItems.length);
    const item = baseItems[i];
    const el = bubbleEls[slotIdx];
    setBubbleContent(el, item);
  });

  label.textContent = baseItems[index].name || "Sem nome";
  sub.textContent = "Clique no círculo central para abrir";
}

function preloadAround() {
  OFFSETS.forEach((off) => {
    const i = mod(index + off, baseItems.length);
    const item = baseItems[i];
    const candidates = item.image ? [item.image] : iconCandidates(item.url);

    candidates.slice(0, 2).forEach((src) => {
      if (imgCache.has(src)) return;
      const im = new Image();
      im.onload = () => imgCache.set(src, "ok");
      im.onerror = () => imgCache.set(src, "fail");
      im.src = src;
    });
  });
}

/**
 * Animação por slots:
 * 1) troca os OFFSETS de cada bolha (em memória)
 * 2) aplica novos slots => CSS anima
 * 3) no fim, atualiza index e repinta conteúdo
 */
function animateStep(dir /* +1 next, -1 prev */) {
  if (animLock) return Promise.resolve();
  animLock = true;

  // vamos “rotacionar” os OFFSETS visualmente:
  // next: a bolha do lado esquerdo vai pra direita etc.
  // Porém como os slots são fixos, a gente só reaplica slots
  // e depois troca os conteúdos.

  applySlots(); // garante slots ok antes

  return new Promise((resolve) => {
    // força reflow antes de começar (garante transição)
    void track.offsetHeight;

    // Nada a fazer no DOM para mover: slots já estão com transition.
    // O efeito real vem do update do INDEX + repintar no final.
    // Então aqui usamos um timeout igual ao tempo de transition do CSS.
    setTimeout(() => {
      index = mod(index + dir, baseItems.length);
      preloadAround();
      paintAll();
      // slots continuam os mesmos (o que muda é o conteúdo em cada slot)
      animLock = false;
      resolve();
    }, 430);
  });
}

async function next(steps = 1) {
  for (let s = 0; s < steps; s++) {
    await animateStep(+1);
  }
}

async function prev(steps = 1) {
  for (let s = 0; s < steps; s++) {
    await animateStep(-1);
  }
}

function setupControls() {
  btnPrev.addEventListener("click", () => prev(1));
  btnNext.addEventListener("click", () => next(1));

  window.addEventListener("keydown", (e) => {
    if (animLock) return;
    if (e.key === "ArrowLeft") prev(1);
    if (e.key === "ArrowRight") next(1);
    if (e.key === "Enter") window.open(baseItems[index].url, "_blank");
  });

  // swipe step (celular)
  let startX = 0;
  let startY = 0;

  viewport.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: true });

  viewport.addEventListener("touchend", (e) => {
    if (animLock) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) next(1);
    else prev(1);
  }, { passive: true });

  // mouse swipe step
  let mDown = false;
  let mStartX = 0;

  viewport.addEventListener("mousedown", (e) => {
    mDown = true;
    mStartX = e.clientX;
  });

  window.addEventListener("mouseup", (e) => {
    if (!mDown || animLock) { mDown = false; return; }
    mDown = false;

    const dx = e.clientX - mStartX;
    if (Math.abs(dx) < 60) return;

    if (dx < 0) next(1);
    else prev(1);
  });
}
