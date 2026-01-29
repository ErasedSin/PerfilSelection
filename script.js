const carousel = document.getElementById("carousel");
const label = document.getElementById("label");

let items = [];
let index = 0;

fetch("links.json")
  .then(res => res.json())
  .then(data => {
    items = data.items;
    render();
  });

function render() {
  carousel.innerHTML = "";

  items.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "circle" + (i === index ? " active" : "");
    div.innerHTML = `<img src="${item.image}" alt="${item.name}">`;

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

  label.textContent = items[index].name;
}

