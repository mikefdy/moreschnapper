# MoreSchnapper

> Chrome-Extension die deine Wunschprodukte zum Drop-Zeitpunkt auf [morenutrition.de](https://morenutrition.de) blitzschnell in den Warenkorb legt — bevor alles ausverkauft ist. **Bezahlt wird nichts automatisch:** du reviewst den Warenkorb und schließt den Kauf selbst ab.

![manifest v3](https://img.shields.io/badge/manifest-v3-blue) ![license](https://img.shields.io/badge/license-MIT-green) ![status](https://img.shields.io/badge/status-beta-orange)

## Was es macht

Wenn More Nutrition Sonntag um 11 Uhr neue Produkte droppt, sind sie in Minuten weg. MoreSchnapper:

1. Lässt dich aus einem kuratierten Katalog ein oder mehrere Produkte vorab wählen
2. Schedulet einen exakten Drop-Zeitpunkt (z.B. So 11:00) per `chrome.alarms`
3. Sendet im Moment des Drops `POST /cart/add.js` an Shopify mit deinen Cookies
4. Wiederholt mit exponentialem Backoff bei 429 / sold-out (default max 10 Versuche)
5. Öffnet bei Erfolg deinen Checkout-Tab mit allem im Warenkorb — **du** prüfst und bezahlst manuell
6. Spielt einen Sound + Notification

Alles läuft **in deinem Browser, mit deiner Session** — keine Credentials werden gespeichert oder weitergegeben.

## Installation (Chrome / Edge / Brave)

### Option A — Fertiges Release (empfohlen)

1. Auf der [Releases-Seite](../../releases) das neueste `moreschnapper-X.Y.Z.zip` herunterladen
2. ZIP entpacken
3. `chrome://extensions` öffnen
4. **Entwicklermodus** oben rechts aktivieren
5. **Entpackte Erweiterung laden** → den entpackten Ordner wählen
6. MoreSchnapper-Icon erscheint in der Toolbar

### Option B — Aus dem Source

1. Repo klonen (`git clone …`)
2. `chrome://extensions` → Entwicklermodus → "Entpackte Erweiterung laden" → Repo-Ordner wählen

> Kein Build-Step nötig — pures HTML/CSS/JS.

## Benutzung

1. Bei morenutrition.de einloggen, Lieferadresse + Bezahlmethode (Shop Pay / PayPal / Klarna) im Account speichern
2. Extension öffnen
3. Aus dem Dropdown ein Produkt + Größe wählen → erscheint als Reihe
4. Beliebig viele weitere hinzufügen, Mengen setzen
5. Drop-Zeit setzen (Chip "So 11:00" für den Standard-Drop)
6. **⚡ Sniper scharfschalten**

Browser muss zur Drop-Zeit offen sein — Tab darf minimiert sein. Der Sound spielt auch wenn das Popup zu ist.

## Katalog pflegen

Der Katalog (`catalog.json`) enthält welche Produkte + Größen im Picker auftauchen. Verwaltet wird er über `products.txt`:

```text
# Eine Handle (oder volle URL) pro Zeile
more-protein-milkshake
more-protein-iced-matcha-latte
protein-iced-coffee
```

**Lokal aktualisieren:**

```bash
node tools/update-catalog.mjs           # liest products.txt, fetcht alle Varianten von Shopify
node tools/update-catalog.mjs --refresh # zusätzlich alles aus catalog.json re-fetchen
```

**Auf GitHub:** Bei jedem Push auf `products.txt` läuft die GitHub Action und öffnet automatisch einen PR mit dem aktualisierten Katalog. Sonntags 08:00 UTC läuft sie zusätzlich, um neue Geschmacksrichtungen vor dem Drop zu erfassen.

## Releases

Versionsbumps in `manifest.json` triggern automatisch einen Build-Workflow:

1. `"version"` in `manifest.json` erhöhen → commit + push
2. GitHub Action baut ein installierbares ZIP, taggt das Repo als `vX.Y.Z` und veröffentlicht ein [Release](../../releases) mit auto-generierten Release Notes
3. Endnutzer laden das ZIP, entpacken, fertig

## Architektur

```
manifest.json        →  Manifest V3, Permissions, Icons
popup.{html,css,js}  →  UI: Produkt-Picker, Countdown, Log
background.js        →  Service Worker: Alarm-Scheduling, Add-to-Cart-Loop
offscreen.{html,js}  →  Audio-Wiedergabe (Workers können kein Audio)
content.js           →  (reserviert für zukünftige Checkout-Automatisierung)
catalog.json         →  Aus products.txt generierter Produkt-Index
products.txt         →  Master-Liste der Produkte (du pflegst diese)
tools/               →  CLI-Skripte für Katalog-Wartung
.github/workflows/   →  Auto-Update via GitHub Actions + PR
```

## Privatsphäre

- Die Extension speichert nur lokal (`chrome.storage.local`): aktuelle Auswahl, Job-Konfig, Log-Einträge, Sound-Toggle
- **Keine Tracker, keine Analytics, keine externen API-Calls** außer direkt an morenutrition.de
- Cookies werden nicht weitergegeben — Shopify-Session bleibt bei dir
- Keine Konten / Lizenzen / Registrierung nötig

## Mitmachen

PRs willkommen. Besonders nützlich:

- Neue Produkte in `products.txt` ergänzen (Action macht den Rest)
- Bugfixes, vor allem Edge-Cases bei der Rate-Limit-Logik
- Firefox-Port (Manifest V2 / V3 Anpassungen)
- Übersetzungen (aktuell DE only)
- Tests

Für größere Änderungen bitte vorher Issue öffnen.

## Roadmap

Feature-Wünsche bitte als [GitHub Issue](../../issues) anlegen.

## Disclaimer

⚠️ **MoreSchnapper bestellt nichts für dich.** Das Tool legt deine ausgewählten Produkte zum Drop-Zeitpunkt nur in den Warenkorb und öffnet die Checkout-Seite. Den Kauf selbst tätigst du — du prüfst Warenkorb, Lieferadresse und Zahlungsmethode und drückst dann eigenhändig auf "Jetzt kaufen". Es wird **niemals** automatisch eine Zahlung ausgelöst.

Nutzung auf eigenes Risiko. Weitere Hinweise:

- Nur für persönlichen Bedarf gedacht — kein Reselling, kein Massen-Scraping, keine kommerzielle Nutzung
- Kann gegen die AGB von morenutrition.de oder Shopify verstoßen — du bist selbst verantwortlich
- Bei aggressiver Nutzung kann More Nutrition deinen Account oder deine IP sperren
- Die Autoren übernehmen keine Haftung für verlorene Bestellungen, gesperrte Konten oder andere Schäden

Keine Affiliation mit More Nutrition GmbH.

## Lizenz

MIT — siehe [LICENSE](LICENSE).
