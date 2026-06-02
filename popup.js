const $ = (id) => document.getElementById(id);

const productPicker = $("productPicker");
const selectedItemsEl = $("selectedItems");
const catalogMeta = $("catalogMeta");
const dropTime = $("dropTime");
const presetNow = $("presetNow");
const presetSundayBtn = $("presetSunday11");
const maxAttempts = $("maxAttempts");
const autoCheckout = $("autoCheckout");
const soundEnabled = $("soundEnabled");
const armBtn = $("armBtn");
const cancelBtn = $("cancelBtn");
const statusPill = $("status-pill");
const countdown = $("countdown");
const logEl = $("log");
const clearLogBtn = $("clearLog");
const itemTemplate = $("item-template");

let catalog = { products: [] };

function log(msg, level = "info") {
  const li = document.createElement("li");
  li.className = level;
  const t = new Date().toLocaleTimeString("de-DE");
  li.textContent = `[${t}] ${msg}`;
  logEl.prepend(li);
  while (logEl.children.length > 50) logEl.lastChild.remove();
}

function setStatus(state, text) {
  statusPill.className = `pill ${state}`;
  statusPill.textContent = text;
}

function parseVariantId(url) {
  const m = url?.match(/[?&]variant=(\d+)/);
  return m ? m[1] : null;
}

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nextSundayAt(hour, minute = 0) {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSunday = (7 - day) % 7;
  d.setDate(d.getDate() + (daysUntilSunday === 0 && d.getHours() >= hour ? 7 : daysUntilSunday));
  d.setHours(hour, minute, 0, 0);
  return d;
}

presetNow.addEventListener("click", () => {
  const d = new Date();
  d.setSeconds(0, 0);
  dropTime.value = toLocalInputValue(d);
});

presetSundayBtn.addEventListener("click", () => {
  dropTime.value = toLocalInputValue(nextSundayAt(11));
});

clearLogBtn.addEventListener("click", async () => {
  logEl.innerHTML = "";
  await chrome.storage.local.set({ logs: [] });
});

async function loadCatalog() {
  try {
    const url = chrome.runtime.getURL("catalog.json");
    const res = await fetch(url);
    catalog = await res.json();
    catalogMeta.textContent = `${catalog.products.length} Produkte · ${catalog.updated || ""}`;
    renderCatalog();
  } catch (e) {
    log("Katalog konnte nicht geladen werden: " + e.message, "error");
  }
}

function flatVariants() {
  const out = [];
  for (const p of catalog.products) {
    for (const v of p.variants) {
      out.push({
        key: v.url,
        productId: p.id,
        productName: p.name,
        size: v.size,
        url: v.url,
        label: `${p.name} — ${v.size}`,
      });
    }
  }
  return out;
}

function renderCatalog() {
  productPicker.innerHTML = '<option value="">+ Produkt hinzufügen…</option>';
  for (const v of flatVariants()) {
    const opt = document.createElement("option");
    opt.value = v.key;
    opt.textContent = v.label;
    productPicker.appendChild(opt);
  }
}

function refreshPickerAvailability() {
  const used = new Set([...selectedItemsEl.querySelectorAll(".selected-item")].map((li) => li.dataset.variantKey));
  for (const opt of productPicker.options) {
    if (!opt.value) continue;
    opt.disabled = used.has(opt.value);
  }
}

function addItemRow(variantKey, presetQty = 1) {
  const variant = flatVariants().find((v) => v.key === variantKey);
  if (!variant) return;
  if (selectedItemsEl.querySelector(`[data-variant-key="${CSS.escape(variantKey)}"]`)) return;

  const node = itemTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.variantKey = variantKey;
  node.dataset.url = variant.url;
  node.querySelector(".item-name").textContent = variant.productName;
  node.querySelector(".item-size").textContent = variant.size;

  const qtyInput = node.querySelector(".item-qty");
  qtyInput.value = presetQty;

  qtyInput.addEventListener("input", saveSelection);
  node.querySelector(".qty-btn.minus").addEventListener("click", () => {
    qtyInput.value = Math.max(1, parseInt(qtyInput.value, 10) - 1);
    saveSelection();
  });
  node.querySelector(".qty-btn.plus").addEventListener("click", () => {
    qtyInput.value = Math.min(10, parseInt(qtyInput.value, 10) + 1);
    saveSelection();
  });
  node.querySelector(".item-remove").addEventListener("click", () => {
    node.remove();
    refreshPickerAvailability();
    saveSelection();
  });

  selectedItemsEl.appendChild(node);
  refreshPickerAvailability();
}

productPicker.addEventListener("change", () => {
  const key = productPicker.value;
  if (!key) return;
  addItemRow(key);
  productPicker.value = "";
  saveSelection();
});

function getSelection() {
  const items = [];
  for (const li of selectedItemsEl.querySelectorAll(".selected-item")) {
    const qty = parseInt(li.querySelector(".item-qty").value, 10);
    const variantId = parseVariantId(li.dataset.url);
    if (!variantId) continue;
    const productName = li.querySelector(".item-name").textContent;
    const size = li.querySelector(".item-size").textContent;
    items.push({ variantId, quantity: qty, label: `${productName} (${size})` });
  }
  return items;
}

async function saveSelection() {
  const snapshot = [];
  for (const li of selectedItemsEl.querySelectorAll(".selected-item")) {
    snapshot.push({
      key: li.dataset.variantKey,
      qty: li.querySelector(".item-qty").value,
    });
  }
  await chrome.storage.local.set({ selection: snapshot });
}

async function restoreSelection() {
  const { selection = [] } = await chrome.storage.local.get("selection");
  for (const s of selection) {
    addItemRow(s.key, parseInt(s.qty, 10) || 1);
  }
}

armBtn.addEventListener("click", async () => {
  const items = getSelection();
  if (!items.length) return log("Wähle mindestens ein Produkt.", "warn");
  if (!dropTime.value) return log("Drop-Zeit fehlt.", "warn");

  const fireAt = new Date(dropTime.value);
  if (fireAt <= new Date()) {
    fireAt.setTime(Date.now() + 3000);
    log("Drop-Zeit in der Vergangenheit — feuere in 3 s.", "warn");
  }

  const job = {
    items,
    dropTime: fireAt.toISOString(),
    autoCheckout: autoCheckout.checked,
    maxAttempts: parseInt(maxAttempts.value, 10),
  };
  const res = await chrome.runtime.sendMessage({ type: "ARM_JOB", job });
  if (res?.ok) {
    log(`Scharf für ${items.length} Produkt(e).`, "success");
    renderArmed(job);
  } else {
    log("Konnte nicht scharfschalten: " + (res?.error || "?"), "error");
  }
});

cancelBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "CANCEL_JOB" });
  log("Abgebrochen.", "warn");
  renderIdle();
});

function renderArmed(job) {
  setStatus("armed", "Scharf");
  armBtn.hidden = true;
  cancelBtn.hidden = false;
  startCountdown(new Date(job.dropTime));
}

function renderIdle() {
  setStatus("idle", "Bereit");
  armBtn.hidden = false;
  cancelBtn.hidden = true;
  countdown.textContent = "—";
  if (countdownTimer) clearInterval(countdownTimer);
}

let countdownTimer = null;
function startCountdown(target) {
  if (countdownTimer) clearInterval(countdownTimer);
  const tick = () => {
    const ms = target - new Date();
    if (ms <= 0) {
      countdown.textContent = "00:00:00";
      setStatus("firing", "Feuer!");
      clearInterval(countdownTimer);
      return;
    }
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    countdown.textContent =
      String(h).padStart(2, "0") + ":" +
      String(m).padStart(2, "0") + ":" +
      String(s).padStart(2, "0");
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

soundEnabled.addEventListener("change", async () => {
  await chrome.storage.local.set({ soundEnabled: soundEnabled.checked });
  if (soundEnabled.checked) {
    chrome.runtime.sendMessage({ type: "PREVIEW_SOUND" });
  }
});

(async function init() {
  await loadCatalog();
  await restoreSelection();
  const { activeJob, logs = [], soundEnabled: storedSound } = await chrome.storage.local.get(["activeJob", "logs", "soundEnabled"]);
  soundEnabled.checked = storedSound !== false;
  for (const entry of logs.slice(-20)) log(entry.msg, entry.level);
  if (activeJob) {
    dropTime.value = toLocalInputValue(new Date(activeJob.dropTime));
    autoCheckout.checked = activeJob.autoCheckout;
    if (activeJob.maxAttempts) maxAttempts.value = activeJob.maxAttempts;
    renderArmed(activeJob);
  } else {
    presetNow.click();
    renderIdle();
  }
})();

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "LOG") log(msg.text, msg.level || "info");
  if (msg.type === "JOB_DONE") {
    setStatus(msg.success ? "success" : "error", msg.success ? "Erfolg" : "Fehler");
    renderIdle();
  }
});
