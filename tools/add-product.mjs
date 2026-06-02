#!/usr/bin/env node
// Usage:
//   node tools/add-product.mjs <product-url-or-handle>
//
// Examples:
//   node tools/add-product.mjs https://morenutrition.de/products/protein-iced-coffee
//   node tools/add-product.mjs protein-iced-coffee
//
// Fetches all variants from Shopify, lets you pick which to add, writes to catalog.json.

import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const SHOP = "https://morenutrition.de";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.resolve(__dirname, "..", "catalog.json");

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node tools/add-product.mjs <product-url-or-handle>");
  process.exit(1);
}

const handle = arg.includes("/products/")
  ? arg.match(/\/products\/([^/?#]+)/)?.[1]
  : arg.trim();

if (!handle) {
  console.error("❌ Konnte Produkt-Handle nicht aus URL extrahieren.");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => rl.question(q);

console.log(`🔎 Lade /products/${handle}.js …`);
const res = await fetch(`${SHOP}/products/${handle}.js`);
if (!res.ok) {
  console.error(`❌ HTTP ${res.status} — Produkt nicht gefunden oder noch nicht veröffentlicht.`);
  if (res.status === 404) {
    console.error("   Tipp: Bei Pre-Drops kannst du den Handle + Variant-ID auch manuell in catalog.json setzen.");
  }
  process.exit(1);
}
const data = await res.json();

console.log(`\n✓ ${data.title}`);
console.log(`  ${data.variants.length} Variante(n):\n`);
data.variants.forEach((v, i) => {
  const avail = v.available ? "✓" : "✗ (aus)";
  const price = (v.price / 100).toFixed(2);
  console.log(`  [${i + 1}] ${v.title.padEnd(28)} ${avail.padEnd(8)} ${price} €  (id ${v.id})`);
});

const sel = (await ask(`\nWelche hinzufügen? (Zahlen kommagetrennt, "all" oder Enter für alle): `)).trim();
let chosen;
if (!sel || sel.toLowerCase() === "all") {
  chosen = data.variants;
} else {
  const idxs = sel.split(",").map((s) => parseInt(s.trim(), 10) - 1);
  chosen = idxs.map((i) => data.variants[i]).filter(Boolean);
}

if (!chosen.length) {
  console.error("Nichts ausgewählt — abgebrochen.");
  process.exit(1);
}

let catalog;
try {
  catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf8"));
} catch {
  catalog = { updated: "", products: [] };
}

let product = catalog.products.find((p) => p.id === handle);
if (!product) {
  product = { id: handle, name: data.title, variants: [] };
  catalog.products.push(product);
  console.log(`+ Neues Produkt: ${product.name}`);
} else {
  console.log(`= Bestehendes Produkt: ${product.name} — Varianten werden gemerged.`);
}

let added = 0;
for (const v of chosen) {
  const url = `${SHOP}/products/${handle}?variant=${v.id}`;
  if (product.variants.some((existing) => existing.url === url)) continue;
  product.variants.push({ size: v.title, url });
  added++;
}

catalog.updated = new Date().toISOString().slice(0, 10);
catalog.products.sort((a, b) => a.name.localeCompare(b.name));

await fs.writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n");
console.log(`\n✅ ${added} neue Variante(n) in catalog.json geschrieben.`);
console.log(`   ${catalog.products.length} Produkte gesamt.`);

rl.close();
