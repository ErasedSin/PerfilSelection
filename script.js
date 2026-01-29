const track = document.getElementById("track");
const label = document.getElementById("label");
const sub = document.getElementById("sub");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const viewport = document.getElementById("viewport");

let baseItems = [];
let index = 0;           // index no array base
let animLock = false;    // trava durante transição

// 7 slots: [-3,-2,-1,0,+1,+2,+3] (0 é o centro)
const OFFSETS = [-3,-2,-1,0,1,2,3];
let bubbleEls = [];

fetch("links.json", { cache: "no-store" })
  .then(res => {
    if (!res.ok) throw new Error(`links.json não encontrado (HTTP ${res.status})`);
    return res.json();
  })
  .then(data => {
    baseItems = data.items || data.links || [];
    if (!Array.isArray(baseItems) || baseItems.length === 0) {
      throw new Error('links.json precisa ter "items" (lista de links).');
    }
    index = 0;
    initBubbles();
    measureStep();
    paintAll();
    setupControls();
  })
  .catch(err => {
    console.error(err);
    label.textContent = "Erro: " + err.message;
    sub.textContent = "Verifique links.json e faça Ctrl+Shift+R.";
  });

function mod(n, m){ return ((n % m) + m) % m; }

function getInitials(name){
  if (!name) return "?";
  const parts = name.replace(/[()]/g,"").trim().split(/\s+/);
  const a = parts[0]?.[0] || "?";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

// Ícones nítidos (sem precisar salvar assets)
function iconCandidates(url){
  try{
    const u = new URL(url);
    const domain = u.hostname.replace(/^www\./, "");
    return [
      `https://logo.clearbit.com/${domain}`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=512`
    ];
  }catch{
    return [];
  }
}

function initBubbles(){
  track.innerHTML = "";
  bubbleEls = OFFSETS.map(() => {
    const el = document.createElement("div");
    el.className = "bubble";
    el.innerHTML = `<img alt=""><div class="fallback" style="display:none"></div>`;
    track.appendChild(el);
    return el;
  });

  // click handlers: clicar no centro abre; perto navega
  bubbleEls.forEach((el, slotIdx) => {
    el.addEventListener("click", () => {
      if (animLock) return;

      const off = OFFSETS[slotIdx];
      if (off === 0) {
        const item = baseItems[index];
        window.open(item.url, "_blank");
        return;
      }

      // permite clicar nos adjacentes (±1) e próximos (±2) com feel de jogo
      const steps = Math.max(-2, Math.min(2, off));
      if (steps > 0) next(steps);
      else prev(-steps);
    });
  });
}

function setBubbleContent(el, item){
  const img = el.querySelector("img");
  const fb = el.querySelector(".fallback");

  const candidates = item.image ? [item.image] : iconCandidates(item.url);
  let k = 0;

  const useFallback = () => {
    img.style.display = "none";
    fb.style.display = "grid";
    fb.textContent = getInitials(item.name);
  };

  const tryNext = () => {
    if (k >= candidates.length) { useFallback(); return; }
    img.style.display = "block";
    fb.style.display = "none";
    img.src = candidates[k++];
  };

  img.onerror = tryNext;
  img.onload = () => { /* ok */ };

  img.alt = item.name || "Link";
  tryNext();
}

function setBubbleState(el, off){
  // estados: buffer (±3), far (±2), near (±1), active (0)
  el.classList.remove("buffer","far","near","active");
  if (off === 0) el.classList.add("active");
  else if (Math.abs(off) === 1) el.classList.add("near");
  else if (Math.abs(off) === 2) el.classList.add("far");
  else el.classList.add("buffer");
}

function paintAll(){
  // atualiza os 7 slots ao redor do index central
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

function measureStep(){
  // calcula step baseado no tamanho do elemento + gap do CSS
  const style = getComputedStyle(track);
  const gap = parseFloat(style.gap || style.columnGap || "18") || 18;

  // escolhe um bubble "normal" (não active) pra medir
  const normal = bubbleEls.find(b => !b.classList.contains("active")) || bubbleEls[0];
  const rect = normal.getBoundingClientRect();
  const size = rect.width || 86;

  const step = size + gap;
  track.style.setProperty("--step", `${step}px`);
}

function transitionOnce(cls){
  return new Promise((resolve) => {
    const onEnd = (e) => {
      if (e.target !== track) return;
      track.removeEventListener("transitionend", onEnd);
      resolve();
    };
    track.addEventListener("transitionend", onEnd);
    track.classList.add(cls);
  });
}

async function next(steps = 1){
  if (animLock) return;
  animLock = true;

  for (let s = 0; s < steps; s++) {
    await transitionOnce("anim-next");
    // após a animação, atualiza índice (passou pro lado)
    index = mod(index + 1, baseItems.length);
    // reseta transform
    track.classList.remove("anim-next");
    track.style.transition = "none";
    track.style.transform = "translate3d(0,0,0)";
    // força reflow
    void track.offsetHeight;
    track.style.transition = "";
    // repinta para dar a ilusão de roda infinita
    paintAll();
  }

  animLock = false;
}

async function prev(steps = 1){
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
    paintAll();
  }

  animLock = false;
}

function setupControls(){
  btnPrev.addEventListener("click", () => prev(1));
  btnNext.addEventListener("click", () => next(1));

  // teclado
  window.addEventListener("keydown", (e) => {
    if (animLock) return;
    if (e.key === "ArrowLeft") prev(1);
    if (e.key === "ArrowRight") next(1);
    if (e.key === "Enter") window.open(baseItems[index].url, "_blank");
  });

  // swipe (B: step, não drag livre)
  let startX = 0;
  let startY = 0;
  let moved = false;

  viewport.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    moved = false;
  }, { passive: true });

  viewport.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) moved = true;
  }, { passive: true });

  viewport.addEventListener("touchend", (e) => {
    if (animLock) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    // só considera swipe horizontal
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) next(1);
    else prev(1);
  });

  // mouse swipe (arrasto curto, mas step)
  let mDown = false;
  let mStartX = 0;
  viewport.addEventListener("mousedown", (e) => { mDown = true; mStartX = e.clientX; });
  window.addEventListener("mouseup", (e) => {
    if (!mDown || animLock) { mDown = false; return; }
    mDown = false;
    const dx = e.clientX - mStartX;
    if (Math.abs(dx) < 60) return;
    if (dx < 0) next(1);
    else prev(1);
  });

  // recalcula step no resize
  let r;
  window.addEventListener("resize", () => {
    clearTimeout(r);
    r = setTimeout(() => {
      measureStep();
    }, 120);
  });
}
