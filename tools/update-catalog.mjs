#!/usr/bin/env node
// Non-interactive catalog updater for CI.
//
// Usage:
//   node tools/update-catalog.mjs                       # liest products.txt (Default)
//   node tools/update-catalog.mjs <handle> [<handle>…]  # explizite Handles/URLs
//   echo "handle\n..." | node tools/update-catalog.mjs --stdin
//   node tools/update-catalog.mjs --refresh             # fetcht zusätzlich alle aus catalog.json
//
// Adds every variant of each product. Prints a summary to stdout.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHOP = "https://morenutrition.de";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.resolve(__dirname, "..", "catalog.json");
const PRODUCTS_TXT = path.resolve(__dirname, "..", "products.txt");

const args = process.argv.slice(2);
const refresh = args.includes("--refresh");
const fromStdin = args.includes("--stdin");
const noFile = args.includes("--no-file");
const inputs = args.filter((a) => !a.startsWith("--"));

let catalog;
try {
  catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf8"));
} catch {
  catalog = { updated: "", products: [] };
}

let handles = inputs.map(extractHandle).filter(Boolean);

if (fromStdin) {
  const stdinData = await readStdin();
  handles.push(...parseList(stdinData));
}

const hasExplicitInput = inputs.length > 0 || fromStdin;
if (!hasExplicitInput && !noFile) {
  try {
    const file = await fs.readFile(PRODUCTS_TXT, "utf8");
    const fromFile = parseList(file);
    handles.push(...fromFile);
    console.log(`📄 ${fromFile.length} Einträge aus products.txt geladen.`);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}

if (refresh) {
  handles.push(...catalog.products.map((p) => p.id));
}

handles = [...new Set(handles)];

if (!handles.length) {
  console.error("Keine Handles übergeben.");
  process.exit(1);
}

console.log(`📦 Verarbeite ${handles.length} Produkt(e): ${handles.join(", ")}`);

let totalAdded = 0;
let totalUpdated = 0;
const failures = [];

for (const handle of handles) {
  process.stdout.write(`→ ${handle} … `);
  try {
    const res = await fetch(`${SHOP}/products/${handle}.js`);
    if (!res.ok) {
      console.log(`❌ HTTP ${res.status}`);
      failures.push(`${handle} (HTTP ${res.status})`);
      continue;
    }
    const data = await res.json();
    let product = catalog.products.find((p) => p.id === handle);
    const isNew = !product;
    if (isNew) {
      product = { id: handle, name: data.title, variants: [] };
      catalog.products.push(product);
    } else {
      product.name = data.title;
    }

    let added = 0;
    for (const v of data.variants) {
      const url = `${SHOP}/products/${handle}?variant=${v.id}`;
      if (product.variants.some((existing) => existing.url === url)) continue;
      product.variants.push({ size: v.title, url });
      added++;
    }
    totalAdded += added;
    if (isNew) totalUpdated++;
    console.log(`${isNew ? "✓ neu" : "= update"} (+${added} Varianten, ${product.variants.length} gesamt)`);
  } catch (e) {
    console.log(`❌ ${e.message}`);
    failures.push(`${handle} (${e.message})`);
  }
}

catalog.updated = new Date().toISOString().slice(0, 10);
catalog.products.sort((a, b) => a.name.localeCompare(b.name));

await fs.writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n");

console.log(`\n📝 catalog.json: ${catalog.products.length} Produkte, ${totalAdded} neue Varianten hinzugefügt.`);
if (failures.length) {
  console.log(`⚠️  Fehlgeschlagen: ${failures.join(", ")}`);
}

function parseList(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean)
    .map(extractHandle)
    .filter(Boolean);
}

function extractHandle(s) {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  if (trimmed.includes("/products/")) {
    return trimmed.match(/\/products\/([^/?#]+)/)?.[1] || null;
  }
  return trimmed;
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}
