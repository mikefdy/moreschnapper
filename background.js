const SHOP_ORIGIN = "https://morenutrition.de";
const ALARM_NAME = "moreschnapper-fire";
const PRE_FIRE_MS = 2000;

let cancelRequested = false;

function interruptibleSleep(ms) {
  return new Promise((resolve) => {
    const step = 100;
    let waited = 0;
    const id = setInterval(() => {
      waited += step;
      if (cancelRequested || waited >= ms) {
        clearInterval(id);
        resolve();
      }
    }, step);
  });
}

async function log(text, level = "info") {
  const { logs = [] } = await chrome.storage.local.get("logs");
  logs.push({ t: Date.now(), msg: text, level });
  await chrome.storage.local.set({ logs: logs.slice(-100) });
  try { chrome.runtime.sendMessage({ type: "LOG", text, level }); } catch {}
}

async function ensureShopTab() {
  const tabs = await chrome.tabs.query({ url: `${SHOP_ORIGIN}/*` });
  if (tabs[0]) return tabs[0];
  return await chrome.tabs.create({ url: `${SHOP_ORIGIN}/`, active: false });
}

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (contexts.length) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Drop-Sound abspielen wenn Sniper feuert.",
  });
}

async function playDropSound() {
  const { soundEnabled = true } = await chrome.storage.local.get("soundEnabled");
  if (!soundEnabled) return;
  try {
    await ensureOffscreen();
    chrome.runtime.sendMessage({ type: "PLAY_SOUND" });
  } catch (e) {
    console.error("playDropSound", e);
  }
}

async function bulkAddToCart(items) {
  const tab = await ensureShopTab();
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (its) => {
      const r = await fetch("/cart/add.js", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ items: its }),
      });
      let body = {};
      try { body = await r.json(); } catch {}
      return {
        ok: r.ok,
        status: r.status,
        body,
        retryAfter: parseInt(r.headers.get("Retry-After") || "0", 10) || null,
      };
    },
    args: [items.map((i) => ({ id: i.variantId, quantity: i.quantity }))],
    world: "MAIN",
  });
  return result.result;
}

async function runJob(job) {
  cancelRequested = false;
  playDropSound();
  const items = job.items || [];
  if (!items.length) {
    await finishJob(false, "Keine Items im Job");
    return;
  }

  await log(`🚀 Drop! ${items.length} Produkt(e): ${items.map(i => i.label).join(", ")}`, "info");

  const deadline = Date.now() + 90_000;
  const MAX_ATTEMPTS = job.maxAttempts || 10;
  let attempt = 0;
  let lastError = "";
  let delayMs = 1500;
  const BASE_DELAY = 1500;
  const MAX_DELAY = 15000;

  while (Date.now() < deadline && attempt < MAX_ATTEMPTS) {
    if (cancelRequested) {
      await log("⏹ Vom Benutzer abgebrochen.", "warn");
      await finishJob(false, "Abgebrochen");
      return;
    }
    attempt++;
    try {
      const { ok, status, body, retryAfter } = await bulkAddToCart(items);
      if (ok) {
        await log(`✅ Alles im Warenkorb (Versuch ${attempt}).`, "success");
        if (job.autoCheckout) {
          await chrome.tabs.create({ url: `${SHOP_ORIGIN}/checkout` });
        }
        await finishJob(true);
        return;
      }
      lastError = `HTTP ${status}: ${body?.description || body?.message || "unbekannt"}`;

      if (status === 429) {
        const serverWait = retryAfter ? retryAfter * 1000 : 0;
        delayMs = Math.max(serverWait, Math.min(delayMs * 2, MAX_DELAY));
        if (attempt % 3 === 0) {
          await log(`Rate-Limit — warte ${Math.round(delayMs/1000)}s (Versuch ${attempt})`, "warn");
        }
      } else if (status === 422 && /sold out|nicht verfügbar|ausverkauft/i.test(lastError)) {
        delayMs = BASE_DELAY;
        if (attempt % 5 === 0) await log(`Noch nicht verfügbar (Versuch ${attempt})…`, "warn");
      } else {
        delayMs = BASE_DELAY;
        await log(`Fehler: ${lastError}`, "warn");
      }
    } catch (e) {
      lastError = e.message;
      delayMs = Math.min(delayMs * 2, MAX_DELAY);
      await log(`Netzwerkfehler: ${e.message}`, "warn");
    }
    await interruptibleSleep(delayMs);
  }

  const reason = attempt >= MAX_ATTEMPTS
    ? `Max. Versuche (${MAX_ATTEMPTS}) erreicht — ${lastError}`
    : (lastError || "Timeout");
  await finishJob(false, reason);
}

async function finishJob(success, errorMsg = "") {
  await chrome.storage.local.remove("activeJob");
  await chrome.alarms.clear(ALARM_NAME);
  if (!success) await log("❌ " + (errorMsg || "Fehlgeschlagen"), "error");
  try { chrome.runtime.sendMessage({ type: "JOB_DONE", success }); } catch {}
  try {
    chrome.notifications?.create?.({
      type: "basic",
      iconUrl: "icon.png",
      title: success ? "MoreSchnapper: Erfolg" : "MoreSchnapper: Fehler",
      message: success ? "Im Warenkorb — Checkout läuft." : (errorMsg || "Drop verpasst."),
    });
  } catch {}
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "PREVIEW_SOUND") {
        await ensureOffscreen();
        chrome.runtime.sendMessage({ type: "PLAY_SOUND" });
        sendResponse({ ok: true });
        return;
      }
      if (msg.type === "ARM_JOB") {
        const fireAt = new Date(msg.job.dropTime).getTime() - PRE_FIRE_MS;
        await chrome.storage.local.set({ activeJob: msg.job });
        await chrome.alarms.clear(ALARM_NAME);
        await chrome.alarms.create(ALARM_NAME, { when: Math.max(fireAt, Date.now() + 100) });
        await log(`Scharf für ${new Date(msg.job.dropTime).toLocaleString("de-DE")} — ${msg.job.items.length} Produkt(e).`, "info");
        sendResponse({ ok: true });
      } else if (msg.type === "CANCEL_JOB") {
        cancelRequested = true;
        await chrome.alarms.clear(ALARM_NAME);
        await chrome.storage.local.remove("activeJob");
        sendResponse({ ok: true });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();
  return true;
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const { activeJob } = await chrome.storage.local.get("activeJob");
  if (!activeJob) return;
  const wait = new Date(activeJob.dropTime).getTime() - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  runJob(activeJob);
});
