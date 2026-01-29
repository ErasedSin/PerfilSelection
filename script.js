const carousel = document.getElementById("carousel");
const label = document.getElementById("label");
const sub = document.getElementById("sub");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");

let items = [];
let index = 0;


const VISIBLE = 5; 

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
    index = 0;
    render();
    setupControls();
  })
  .catch((err) => {
    console.error(err);
    label.textContent = "Erro: " + err.message;
    sub.textContent = "Verifique se links.json está na raiz do repositório.";
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

function makeBubble(item, cls, isActive, onClick) {
  const div = document.createElement("div");
  div.className = `bubble ${cls}`.trim();

  
  const img = document.createElement("img");
  img.src = item.image || "";
  img.alt = item.name || "Link";

  const fallback = document.createElement("div");
  fallback.className = "fallback";
  fallback.textContent = getInitials(item.name);

  let imgOk = false;

  img.addEventListener("load", () => {
    imgOk = true;
  });

  img.addEventListener("error", () => {
    k
    if (!imgOk) {
      div.innerHTML = "";
      div.appendChild(fallback);
    }
  });

  // default: coloca imagem e fallback (fallback só aparece se der erro)
  div.appendChild(img);

  div.addEventListener("click", onClick);

  // dica de UX
  if (isActive) div.setAttribute("aria-current", "true");

  return div;
}

function render() {
  carousel.innerHTML = "";

  const n = items.length;

  
  const count = Math.min(VISIBLE, n);

  
  const offsets = count === 5 ? [-2, -1, 0, 1, 2] : (count === 3 ? [-1, 0, 1] : [...Array(count)].map((_, i) => i - Math.floor(count/2)));

  offsets.forEach((off) => {
    const i = mod(index + off, n);
    const item = items[i];

    let cls = "";
    if (off === 0) cls = "active";
    else if (Math.abs(off) === 1) cls = "near";
    else cls = "far";

    const bubble = makeBubble(
      item,
      cls,
      off === 0,
      () => {
        if (off === 0) {
          window.open(item.url, "_blank");
        } else {
          index = i;
          render();
        }
      }
    );

    carousel.appendChild(bubble);
  });

  label.textContent = items[index].name || "Sem nome";
  sub.textContent = "Toque/click no círculo central para abrir";
}

function prev() {
  index = mod(index - 1, items.length);
  render();
}

function next() {
  index = mod(index + 1, items.length);
  render();
}

function setupControls() {
  btnPrev.addEventListener("click", prev);
  btnNext.addEventListener("click", next);

  
  let startX = 0;
  let dragging = false;

  const threshold = 45; 

  const onStart = (x) => {
    dragging = true;
    startX = x;
  };

  const onEnd = (x) => {
    if (!dragging) return;
    dragging = false;

    const dx = x - startX;
    if (dx > threshold) prev();
    else if (dx < -threshold) next();
  };

  
  carousel.addEventListener("touchstart", (e) => onStart(e.touches[0].clientX), { passive: true });
  carousel.addEventListener("touchend", (e) => onEnd(e.changedTouches[0].clientX));

  
  carousel.addEventListener("mousedown", (e) => onStart(e.clientX));
  window.addEventListener("mouseup", (e) => onEnd(e.clientX));
}
