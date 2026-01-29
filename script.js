const track = document.getElementById("track");
const label = document.getElementById("label");
const sub = document.getElementById("sub");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const viewport = document.getElementById("viewport");

let baseItems = [];
let index = 0;
let animLock = false;

// 7 slots: [-3,-2,-1,0,+1,+2,+3]
const OFFSETS = [-3, -2, -1, 0, 1, 2, 3];
let bubbleEls = [];

// cache de imagem (URL -> "ok"/"fail")
const imgCache = new Map();

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
    measureStep();
    preloadAround(); // pré-carrega o que vai aparecer
    paintAll();

    setupControls();
  })
  .catch((err) => {
    console.error(err);
    label.textContent = "Erro: " + err.message;
    sub.textContent = "Verifique links.json e faça Ctrl+Shift+R.";
  });

function mod(n, m) {
  return ((n % m) + m) % m;
}

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

function initBubbles() {
  track.innerHTML = "";
  bubbleEls = OFFSETS.map(() => {
    const el = document.createElement("div");
    el.className = "bubble";
    el.innerHTML = `
      <img alt="" draggable="false">
      <div class="fallback" style="display:none"></div>
    `;
    track.appendChild(el);
    return el;
  });

  // Click: centro abre, laterais navegam (até 2 passos)
  bubbleEls.forEach((el, slotIdx) => {
    el.addEventListener("click", () => {
      if (animLock) return;
      const off = OFFSETS[slotIdx];

      if (off === 0) {
        window.open(baseItems[index].url, "_blank");
        return;
      }

      const steps = Math.max(-2, Math.min(2, off));
      if (steps > 0) next(steps);
      else prev(-steps);
    });
  });
}

function setBubbleState(el, off) {
  el.classList.remove("buffer", "far", "near", "active");
  if (off === 0) el.classList.add("active");
  else if (Math.abs(off) === 1) el.classList.add("near");
  else if (Math.abs(off) === 2) el.classList.add("far");
  else el.classList.add("buffer");
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
    if (k >= candidates.length) {
      useFallback();
      return;
    }
    const src = candidates[k++];

    // cache: se já falhou, pula
    const c = imgCache.get(src);
    if (c === "fail") {
      tryNext();
      return;
    }

    // se já ok, usa direto
    if (c === "ok") {
      useImg(src);
      return;
    }

    // testa sem travar: cria Image() fora do DOM
    const tester = new Image();
    tester.onload = () => {
      imgCache.set(src, "ok");
      useImg(src);
    };
    tester.onerror = () => {
      imgCache.set(src, "fail");
      tryNext();
    };
    tester.src = src;
  };

  tryNext();
}

function paintAll() {
  OFFSETS.forEach((off, slotIdx) => {
    const i = mod(index + off, baseItems.length);
    const item = baseItems[i];
    const el = bubbleEls[slotIdx];

    setBubbleState(el, off);
    setBubbleContent(el, item);
  });

  label.textContent = baseItems[index].name || "Sem nome";
  sub.textContent = "Clique no círculo central para abrir";
}

function preloadAround() {
  // pré-carrega as imagens dos 7 itens em volta pra não engasgar na troca
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

function measureStep() {
  const style = getComputedStyle(track);
  const gap = parseFloat(style.gap || style.columnGap || "18") || 18;

  const normal = bubbleEls.find((b) => !b.classList.contains("active")) || bubbleEls[0];
  const rect = normal.getBoundingClientRect();
  const size = rect.width || 86;

  const step = size + gap;
  track.style.setProperty("--step", `${step}px`);
}

function transitionOnce(cls) {
  return new Promise((resolve) => {
    const onEnd = (e) => {
      if (e.target !== track) return;
      track.removeEventListener("transitionend", onEnd);
      resolve();
    };
    track.addEventListener("transitionend", onEnd);

    // força garantir que a transição vai acontecer
    track.classList.remove("anim-next", "anim-prev");
    void track.offsetHeight; // reflow
    track.classList.add(cls);
  });
}

async function next(steps = 1) {
  if (animLock) return;
  animLock = true;

  for (let s = 0; s < steps; s++) {
    await transitionOnce("anim-next");

    index = mod(index + 1, baseItems.length);

    // reset sem piscar
    track.classList.remove("anim-next");
    track.style.transition = "none";
    track.style.transform = "translate3d(0,0,0)";
    void track.offsetHeight;
    track.style.transition = "";

    preloadAround();
    paintAll();
  }

  animLock = false;
}

async function prev(steps = 1) {
  if (animLock) return;
  animLock = true;

  for (let s = 0; s < steps; s++) {
    await transitionOnce("anim-prev");

    index = mod(index - 1, baseItems.length);

    track.classList.remove("anim-prev");
    track.style.transition = "none";
    track.style.transform = "translate3d(0,0,0)";
    void track.offsetHeight;
    track.style.transition = "";

    preloadAround();
    paintAll();
  }

  animLock = false;
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

  // Swipe: step
  let startX = 0;
  let startY = 0;

  viewport.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
    },
    { passive: true }
  );

  viewport.addEventListener(
    "touchend",
    (e) => {
      if (animLock) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;

      if (dx < 0) next(1);
      else prev(1);
    },
    { passive: true }
  );

  // Mouse swipe: step
  let mDown = false;
  let mStartX = 0;

  viewport.addEventListener("mousedown", (e) => {
    mDown = true;
    mStartX = e.clientX;
  });

  window.addEventListener("mouseup", (e) => {
    if (!mDown || animLock) {
      mDown = false;
      return;
    }
    mDown = false;

    const dx = e.clientX - mStartX;
    if (Math.abs(dx) < 60) return;
    if (dx < 0) next(1);
    else prev(1);
  });

  let r;
  window.addEventListener("resize", () => {
    clearTimeout(r);
    r = setTimeout(() => measureStep(), 120);
  });
}
