const carousel = document.getElementById("carousel");
const label = document.getElementById("label");

let items = [];
let index = 0;

fetch("links.json", { cache: "no-store" })
  .then(res => {
    if (!res.ok) throw new Error(`links.json não encontrado (HTTP ${res.status})`);
    return res.json();
  })
  .then(data => {
    items = data.items || data.links || [];
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('links.json precisa ter "items" (lista de links)');
    }
    render();
    setupSwipe();
  })
  .catch(err => {
    console.error(err);
    label.textContent = "Erro: " + err.message;
  });

function render() {
  carousel.innerHTML = "";

  items.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "circle" + (i === index ? " active" : "");

    const imgSrc = item.image || "assets/profile.png";
    div.innerHTML = `<img src="${imgSrc}" alt="${item.name || "Link"}">`;

    div.onclick = () => {
      if (i === index) window.open(item.url, "_blank");
      else { index = i; render(); }
    };

    carousel.appendChild(div);
  });

  label.textContent = items[index].name || "Sem nome";
}

// ===== Swipe =====
function setupSwipe() {
  let startX = 0;
  let dragging = false;

  const onStart = (x) => {
    dragging = true;
    startX = x;
  };

  const onEnd = (x) => {
    if (!dragging) return;
    dragging = false;

    const dx = x - startX;

    // ajuste a sensibilidade aqui
    const threshold = 40;

    if (dx > threshold) {
      // arrastou pra direita -> volta
      index = (index - 1 + items.length) % items.length;
      render();
    } else if (dx < -threshold) {
      // arrastou pra esquerda -> avança
      index = (index + 1) % items.length;
      render();
    }
  };

  // Touch
  carousel.addEventListener("touchstart", (e) => onStart(e.touches[0].clientX), { passive: true });
  carousel.addEventListener("touchend", (e) => onEnd(e.changedTouches[0].clientX));

  // Mouse (pra testar no PC)
  carousel.addEventListener("mousedown", (e) => onStart(e.clientX));
  window.addEventListener("mouseup", (e) => onEnd(e.clientX));
}
