const track = document.getElementById("track");
const label = document.getElementById("label");
const sub = document.getElementById("sub");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const viewport = document.getElementById("viewport");

let items = [];
let index = 0;

const VISIBLE = 5;
const offsets = [-2, -1, 0, 1, 2];

fetch("links.json", { cache: "no-store" })
  .then(res => {
    if (!res.ok) throw new Error(`links.json não encontrado (HTTP ${res.status})`);
    return res.json();
  })
  .then(data => {
    items = data.items || data.links || [];
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('links.json precisa ter "items" (lista de links).');
    }
    index = 0;
    render();
    setupControls();
    snapToCenter(true);
  })
  .catch(err => {
    console.error(err);
    label.textContent = "Erro: " + err.message;
    sub.textContent = "Verifique se links.json está correto.";
  });

function mod(n, m){ return ((n % m) + m) % m; }

function getInitials(name){
  if (!name) return "?";
  const parts = name.replace(/[()]/g,"").trim().split(/\s+/);
  const a = parts[0]?.[0] || "?";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}


function autoIconFromUrl(url){
  try{
    const u = new URL(url);
    const domain = u.hostname;
   
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
  }catch{
    return "";
  }
}

function makeBubble(item, state, off){
  const div = document.createElement("div");
  div.className = `bubble ${state}`.trim();

  const img = document.createElement("img");
  const fallback = document.createElement("div");
  fallback.className = "fallback";
  fallback.textContent = getInitials(item.name);

  const src = item.image || autoIconFromUrl(item.url) || "";
  img.src = src;
  img.alt = item.name || "Link";

  img.addEventListener("error", () => {
    div.innerHTML = "";
    div.appendChild(fallback);
  });

  div.appendChild(img);

  div.addEventListener("click", () => {
    if (off === 0) window.open(item.url, "_blank");
    else { index = mod(index + off, items.length); render(); snapToCenter(); }
  });

  return div;
}

function render(){
  track.innerHTML = "";

  const n = items.length;
  const count = Math.min(VISIBLE, n);

  const offs = count === 5 ? offsets
            : (count === 3 ? [-1,0,1]
            : [...Array(count)].map((_,i)=> i - Math.floor(count/2)));

  offs.forEach((off) => {
    const i = mod(index + off, n);
    const item = items[i];

    let state = "far";
    if (off === 0) state = "active";
    else if (Math.abs(off) === 1) state = "near";

    track.appendChild(makeBubble(item, state, off));
  });

  label.textContent = items[index].name || "Sem nome";
  sub.textContent = "Clique/toque no círculo central para abrir";
}


function snapToCenter(instant = false){
  const bubbles = track.querySelectorAll(".bubble");
  if (!bubbles.length) return;

  
  const centerBubble = bubbles[Math.floor(bubbles.length / 2)];

  const viewportRect = viewport.getBoundingClientRect();
  const bubbleRect = centerBubble.getBoundingClientRect();

  const viewportCenter = viewportRect.left + viewportRect.width / 2;
  const bubbleCenter = bubbleRect.left + bubbleRect.width / 2;

  const dx = viewportCenter - bubbleCenter;

  if (instant) track.style.transition = "none";
  else track.style.transition = "";

  const current = getTranslateX(track);
  track.style.transform = `translateX(${current + dx}px)`;

  if (instant) {
    // força reflow e restaura animação
    void track.offsetHeight;
    track.style.transition = "";
  }
}

function getTranslateX(el){
  const style = getComputedStyle(el);
  const transform = style.transform;
  if (!transform || transform === "none") return 0;
  const m = new DOMMatrixReadOnly(transform);
  return m.m41;
}

function prev(){ index = mod(index - 1, items.length); render(); snapToCenter(); }
function next(){ index = mod(index + 1, items.length); render(); snapToCenter(); }

function setupControls(){
  btnPrev.addEventListener("click", prev);
  btnNext.addEventListener("click", next);

  
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
    if (e.key === "Enter") window.open(items[index].url, "_blank");
  });

 
  let startX = 0;
  let startTX = 0;
  let dragging = false;

  const threshold = 60; 

  const onStart = (x) => {
    dragging = true;
    startX = x;
    startTX = getTranslateX(track);
    track.style.transition = "none";
  };

  const onMove = (x) => {
    if (!dragging) return;
    const dx = x - startX;
    track.style.transform = `translateX(${startTX + dx}px)`;
  };

  const onEnd = (x) => {
    if (!dragging) return;
    dragging = false;
    track.style.transition = "";

    const dx = x - startX;
    if (dx > threshold) prev();
    else if (dx < -threshold) next();
    else snapToCenter(); 
  };


  viewport.addEventListener("touchstart", (e)=> onStart(e.touches[0].clientX), { passive: true });
  viewport.addEventListener("touchmove", (e)=> onMove(e.touches[0].clientX), { passive: true });
  viewport.addEventListener("touchend", (e)=> onEnd(e.changedTouches[0].clientX));

  
  viewport.addEventListener("mousedown", (e)=> onStart(e.clientX));
  window.addEventListener("mousemove", (e)=> onMove(e.clientX));
  window.addEventListener("mouseup", (e)=> onEnd(e.clientX));
}
