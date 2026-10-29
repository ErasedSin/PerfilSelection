const net = document.getElementById("net");
const wires = document.getElementById("wires");
const status = document.getElementById("status");
const NS = "http://www.w3.org/2000/svg";
const MAX_LINKS = 8;
const STORE = "perfilselection:v2";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

let items = [], config = { name: "", cp: "", bg: "rede", links: [] };
const nodes = [], wireEls = [], paths = [];
let ring, hub;
let W = 0, H = 0, rot = 0, speed = 1, px = 0, py = 0, tx = 0, ty = 0, last = 0;

/* ===== Redes: como montar o link e de onde vem a foto ===== */
const unav = (p) => (v) => `https://unavatar.io/${p}/${encodeURIComponent(v)}?fallback=false`;
const PLATFORMS = {
  gh: { label: "GitHub", host: ["github.com"], url: (v) => `https://github.com/${v}`, avatar: (v) => `https://github.com/${v}.png?size=256` },
  ln: { label: "LinkedIn", host: ["linkedin.com"], url: (v) => `https://www.linkedin.com/in/${v}`, avatar: unav("linkedin") },
  ig: { label: "Instagram", host: ["instagram.com"], group: "pessoal", url: (v) => `https://www.instagram.com/${v}/`, avatar: unav("instagram") },
  tt: { label: "TikTok", host: ["tiktok.com"], group: "pessoal", url: (v) => `https://www.tiktok.com/@${v}`, avatar: unav("tiktok") },
  x: { label: "X (Twitter)", host: ["x.com", "twitter.com"], group: "pessoal", url: (v) => `https://x.com/${v}`, avatar: unav("x") },
  yt: { label: "YouTube", host: ["youtube.com"], group: "pessoal", url: (v) => `https://www.youtube.com/@${v}`, avatar: unav("youtube") },
  tw: { label: "Twitch", host: ["twitch.tv"], group: "pessoal", url: (v) => `https://www.twitch.tv/${v}`, avatar: unav("twitch") },
  pf: { label: "Portfólio", site: true },
  site: { label: "Site", site: true },
};

// Valida a entrada (também a que vem da URL, que é não confiável): só http(s) e usuários simples.
function normalize(k, raw) {
  const P = PLATFORMS[k];
  if (!P) return null;
  raw = String(raw || "").trim();
  if (P.site) {
    if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
    try {
      const u = new URL(raw);
      return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? { k, v: u.href } : null;
    } catch { return null; }
  }
  const v = raw.replace(/^@/, "");
  return /^[\w.-]{1,50}$/.test(v) ? { k, v } : null;
}

// Reconhece a rede e o usuário a partir de um link colado.
function detect(text) {
  text = String(text).trim();
  if (!/^(https?:\/\/|www\.)/i.test(text)) return null;
  try {
    const u = new URL(/^https?:/i.test(text) ? text : "https://" + text);
    const host = u.hostname.replace(/^www\./, "");
    const k = Object.keys(PLATFORMS).find((key) => (PLATFORMS[key].host || []).some((h) => host === h || host.endsWith("." + h)));
    if (!k) return { k: "site", v: u.href };
    const seg = u.pathname.split("/").filter(Boolean);
    const v = (k === "ln" ? seg[1] : seg[0] || "").replace(/^@/, "");
    return v ? { k, v } : null;
  } catch { return null; }
}

function resolve(k, raw) {
  const d = detect(raw);
  return d && !(d.k === "site" && PLATFORMS[k].site) ? normalize(d.k, d.v) : normalize(k, raw);
}

function toItem({ k, v, p }) {
  const P = PLATFORMS[k];
  const url = P.site ? v : P.url(encodeURIComponent(v));
  const host = new URL(url).hostname.replace(/^www\./, "");
  const images = [];
  if (p) images.push(p);
  if (P.avatar) images.push(P.avatar(v));
  images.push(`https://www.google.com/s2/favicons?domain=${host}&sz=256`);
  return { name: k === "site" ? host : P.label, url, group: P.group, images };
}

/* ===== Dados: salvos no navegador (localStorage) e, sem fotos, no #hash do link ===== */
const BGS = { rede: "Rede de partículas", chuva: "Chuva digital", estrelas: "Estrelas", aurora: "Aurora", nenhum: "Nenhum (mais leve)" };
const isPhoto = (p) => typeof p === "string" && p.length < 200000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p);

function encode(cfg) {
  const p = new URLSearchParams();
  if (cfg.name) p.set("n", cfg.name);
  if (cfg.bg && cfg.bg !== "rede") p.set("b", cfg.bg);
  cfg.links.forEach((l) => p.append("l", `${l.k}:${l.v}`));
  return p.toString();
}

function decode(str) {
  const p = new URLSearchParams(str);
  const links = p.getAll("l").slice(0, MAX_LINKS).map((s) => {
    const i = s.indexOf(":");
    return i > 0 ? normalize(s.slice(0, i), s.slice(i + 1)) : null;
  }).filter(Boolean);
  return { name: (p.get("n") || "").slice(0, 40), cp: "", bg: BGS[p.get("b")] ? p.get("b") : "rede", links };
}

function fromStored(o) {
  if (!o || typeof o !== "object") return null;
  const links = (Array.isArray(o.links) ? o.links : []).slice(0, MAX_LINKS).map((l) => {
    const n = normalize(l?.k, l?.v);
    if (n && isPhoto(l.p)) n.p = l.p;
    return n;
  }).filter(Boolean);
  return { name: String(o.name || "").slice(0, 40), cp: isPhoto(o.cp) ? o.cp : "", bg: BGS[o.bg] ? o.bg : "rede", links };
}

function readLocal() {
  try { return fromStored(JSON.parse(localStorage.getItem(STORE))); } catch { return null; }
}

function loadConfig() {
  const local = readLocal();
  if (location.hash.length > 1) {
    const c = decode(location.hash.slice(1));
    if (c.links.length) {
      // Fotos enviadas ficam só neste aparelho: reaproveita as que combinam com o mesmo link.
      c.links.forEach((l) => { const m = local?.links.find((x) => x.k === l.k && x.v === l.v); if (m?.p) l.p = m.p; });
      c.cp = local?.cp || "";
      return c;
    }
  }
  return local && local.links.length ? local : { name: "", cp: "", bg: "rede", links: [] };
}

function saveConfig(cfg) {
  let ok = true;
  try { localStorage.setItem(STORE, JSON.stringify(cfg)); } catch { ok = false; }
  history.replaceState(null, "", "#" + encode(cfg));
  return ok;
}

/* ===== Montagem da rede ===== */
function svg(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function initials(name) {
  const p = (name || "?").trim().split(/\s+/);
  return ((p[0]?.[0] || "?") + (p[1]?.[0] || "")).toUpperCase();
}

function loadIcon(face, item) {
  const img = face.querySelector("img");
  const fb = face.querySelector(".fb");
  const list = item.images || [];
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

function clearNet() {
  net.querySelectorAll(".hub,.node").forEach((e) => e.remove());
  wires.innerHTML = "";
  nodes.length = 0; paths.length = 0; wireEls.length = 0;
  net.classList.remove("has-active");
}

function render() {
  clearNet();
  Bg.set(config.bg);
  items = config.links.map(toItem);
  const name = config.name || "Seu nome";

  hub = document.createElement("div");
  hub.className = "hub";
  hub.innerHTML = `<span class="spin"></span>` + faceHTML;
  typeName(hub.querySelector(".name"), name);
  net.appendChild(hub);
  loadIcon(hub.querySelector(".face"), { name, images: config.cp ? [config.cp] : items[0]?.images });

  ring = svg("path", { class: "ring" });
  wires.appendChild(ring);

  items.forEach((item, i) => {
    const group = item.group ? ` g-${item.group}` : "";

    const g = svg("g", { class: "wire" + group });
    g.style.setProperty("--d", `${0.15 * i}s`);
    g.style.setProperty("--t", `${1.8 + (i % 3) * 0.5}s`);
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
    a.setAttribute("aria-label", `Abrir ${item.name}`);
    a.style.setProperty("--nd", `${0.5 + 0.12 * i}s`);
    a.innerHTML = faceHTML;
    a.querySelector(".name").textContent = item.name;

    const set = (on) => { g.classList.toggle("on", on); net.classList.toggle("has-active", on); };
    a.addEventListener("mouseenter", () => set(true));
    a.addEventListener("mouseleave", () => set(false));
    a.addEventListener("focus", () => set(true));
    a.addEventListener("blur", () => set(false));
    a.addEventListener("click", () => {
      a.classList.remove("burst");
      void a.offsetWidth;
      a.classList.add("burst");
    });

    net.appendChild(a);
    nodes.push(a);
    loadIcon(a.querySelector(".face"), item);
  });

  status.textContent = items.length ? "" : "Toque em Editar e adicione os seus links.";
}

/* ===== Editor ===== */
const dlg = document.getElementById("editor");
const edForm = document.getElementById("edForm");
const edName = document.getElementById("edName");
const edBg = document.getElementById("edBg");
const edCenterPhoto = document.getElementById("edCenterPhoto");
const edRows = document.getElementById("edRows");
const edAdd = document.getElementById("edAdd");
const edCopy = document.getElementById("edCopy");
const edMsg = document.getElementById("edMsg");
const selectHTML = Object.entries(PLATFORMS).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join("");
edBg.innerHTML = Object.entries(BGS).map(([k, label]) => `<option value="${k}">${label}</option>`).join("");

// Foto enviada: recorta o centro em quadrado, reduz para 192 px e guarda como JPEG pequeno.
async function resizeToJpeg(file, size = 192) {
  const bmp = await createImageBitmap(file);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const s = Math.min(bmp.width, bmp.height);
  c.getContext("2d").drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
  if (bmp.close) bmp.close();
  return c.toDataURL("image/jpeg", 0.85);
}

function pickPhoto(done) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.addEventListener("change", async () => {
    const f = inp.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 15e6) { edMsg.textContent = "Escolha uma imagem de até 15 MB."; return; }
    try { done(await resizeToJpeg(f)); } catch { edMsg.textContent = "Não consegui ler essa imagem."; }
  });
  inp.click();
}

function setPhotoBtn(btn, p) {
  btn.dataset.p = p || "";
  btn.style.backgroundImage = p ? `url("${p}")` : "";
  btn.classList.toggle("has", !!p);
  btn.innerHTML = p ? '<span class="ph-del" title="Remover foto">×</span>' : "📷";
  btn.title = p ? "Trocar foto" : "Enviar foto";
}

function wirePhoto(btn) {
  btn.addEventListener("click", (e) => {
    if (e.target.closest(".ph-del")) { setPhotoBtn(btn, ""); autosave(); return; }
    pickPhoto((data) => { setPhotoBtn(btn, data); autosave(); });
  });
}

function addRow(k = "gh", v = "", p = "") {
  if (edRows.children.length >= MAX_LINKS) return;
  const row = document.createElement("div");
  row.className = "row";
  row.innerHTML = `<select aria-label="Rede">${selectHTML}</select><input type="text" placeholder="link do perfil ou usuário" aria-label="Link ou usuário" autocomplete="off"><button type="button" class="ph" aria-label="Foto deste link"></button><button type="button" class="x" aria-label="Remover link">✕</button>`;
  const sel = row.querySelector("select");
  const inp = row.querySelector("input");
  const ph = row.querySelector(".ph");
  sel.value = k;
  inp.value = v;
  setPhotoBtn(ph, p);
  wirePhoto(ph);
  inp.addEventListener("change", () => {
    const d = detect(inp.value);
    if (d && !(d.k === "site" && PLATFORMS[sel.value].site)) { sel.value = d.k; inp.value = d.v; }
  });
  row.querySelector(".x").addEventListener("click", () => { row.remove(); edAdd.disabled = false; autosave(); });
  edRows.appendChild(row);
  edAdd.disabled = edRows.children.length >= MAX_LINKS;
}

function readForm() {
  const links = [...edRows.children].map((r) => {
    const l = resolve(r.querySelector("select").value, r.querySelector("input").value);
    const p = r.querySelector(".ph").dataset.p;
    if (l && p) l.p = p;
    return l;
  }).filter(Boolean);
  return { name: edName.value.trim().slice(0, 40), cp: edCenterPhoto.dataset.p || "", bg: edBg.value, links };
}

function openEditor() {
  edName.value = config.name;
  edBg.value = config.bg;
  setPhotoBtn(edCenterPhoto, config.cp);
  edRows.innerHTML = "";
  edMsg.textContent = "";
  (config.links.length ? config.links : [{ k: "gh", v: "" }]).forEach((l) => addRow(l.k, l.v, l.p));
  if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
}

wirePhoto(edCenterPhoto);
edBg.addEventListener("change", () => Bg.set(edBg.value));
document.getElementById("editBtn").addEventListener("click", openEditor);
edAdd.addEventListener("click", () => { addRow("ig"); autosave(); });

// Salva sozinho enquanto a pessoa mexe; a rede só é redesenhada ao fechar o painel.
let saveTimer = 0;
let dirty = false;

function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = 0;
  config = readForm();
  dirty = true;
  edMsg.textContent = saveConfig(config) ? "Salvo automaticamente ✓" : "Não foi possível salvar neste navegador.";
}

function autosave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
}

edForm.addEventListener("input", autosave);
edForm.addEventListener("change", autosave);
dlg.addEventListener("close", () => {
  if (saveTimer) saveNow();
  if (dirty) { dirty = false; render(); }
});
window.addEventListener("pagehide", () => { if (saveTimer) saveNow(); });

edCopy.addEventListener("click", async () => {
  const cfg = readForm();
  const hasPhoto = cfg.cp || cfg.links.some((l) => l.p);
  const link = location.href.split("#")[0] + "#" + encode(cfg);
  try {
    await navigator.clipboard.writeText(link);
    edMsg.textContent = "Link copiado." + (hasPhoto ? " As fotos enviadas ficam só neste aparelho e não vão no link." : "");
  } catch {
    edMsg.textContent = link;
  }
});

/* ===== Início ===== */
config = loadConfig();
render();
resize();
window.addEventListener("resize", resize);
window.addEventListener("pointermove", (e) => {
  tx = (e.clientX / innerWidth - 0.5) * 28;
  ty = (e.clientY / innerHeight - 0.5) * 28;
});
requestAnimationFrame(frame);
if (!config.links.length) openEditor();

function typeName(el, text) {
  if (reduce) { el.textContent = text; return; }
  el.textContent = "";
  setTimeout(() => {
    let i = 0;
    const id = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(id);
    }, 90);
  }, 500);
}

function resize() {
  W = net.clientWidth;
  H = net.clientHeight;
  wires.setAttribute("viewBox", `0 0 ${W} ${H}`);
  Bg.resize();
}

function frame(t) {
  const dt = Math.min(50, t - last) / 1000;
  last = t;
  if (!reduce) {
    // Passar o mouse num link pausa a órbita aos poucos, para facilitar o clique.
    const target = net.classList.contains("has-active") ? 0 : 1;
    speed += (target - speed) * 0.08;
    rot += dt * 0.12 * speed;
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;
    Bg.draw(t);
  }
  place(t);
  if (!reduce) requestAnimationFrame(frame);
}

// Posiciona nós e linhas: órbita lenta, respiração do raio e parallax com o mouse.
function place(t) {
  if (!hub) return;
  const n = items.length;
  const R = Math.min(W, H) * 0.36;
  const cx = W / 2 - px * 0.5;
  const cy = H / 2 - py * 0.5;
  hub.style.transform = `translate(${-px * 0.5}px,${-py * 0.5}px)`;

  const pts = items.map((_, i) => {
    const a = -Math.PI / 2 + rot + (i * 2 * Math.PI) / n;
    const r = R * (1 + 0.05 * Math.sin(t * 0.0013 + i * 1.7));
    return { a, r, x: W / 2 + px + r * Math.cos(a), y: H / 2 + py + r * Math.sin(a) };
  });

  pts.forEach((p, i) => {
    nodes[i].style.left = `${p.x}px`;
    nodes[i].style.top = `${p.y}px`;

    const side = i % 2 ? 1 : -1;
    const mx = cx + (p.x - cx) * 0.45 - Math.sin(p.a) * p.r * 0.12 * side;
    const my = cy + (p.y - cy) * 0.45 + Math.cos(p.a) * p.r * 0.12 * side;
    const d = `M${cx} ${cy} L${mx} ${my} L${p.x} ${p.y}`;
    paths[i].forEach((path) => path.setAttribute("d", d));
  });

  ring.setAttribute("d", n > 2 ? "M" + pts.map((p) => `${p.x} ${p.y}`).join(" L") + " Z" : "");
}
