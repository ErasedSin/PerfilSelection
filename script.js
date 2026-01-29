const carousel = document.getElementById("carousel");
const label = document.getElementById("label");

let items = [];
let index = 0;

fetch("links.json", { cache: "no-store" })
  .then((res) => {
    if (!res.ok) throw new Error(`links.json não encontrado (HTTP ${res.status})`);
    return res.json();
  })
  .then((data) => {
    // aceita dois formatos: { items: [...] } ou { links: [...] }
    items = data.items || data.links || [];

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('links.json precisa ter "items" ou "links" com uma lista de links');
    }

    render();
  })
  .catch((err) => {
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
      if (i === index) {
        window.open(item.url, "_blank");
      } else {
        index = i;
        render();
      }
    };

    carousel.appendChild(div);
  });

  label.textContent = items[index].name || "Sem nome";
}
