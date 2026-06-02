# Datenschutzerklärung — MoreSchnapper

_Stand: 2026-06-02_

Diese Datenschutzerklärung beschreibt, welche Daten die Chrome-Erweiterung **MoreSchnapper** (im Folgenden "die Erweiterung") verarbeitet.

## Zusammenfassung

Die Erweiterung erhebt **keine** personenbezogenen Daten, sendet **keine** Daten an externe Server und nutzt **keine** Analyse-, Tracking- oder Werbedienste.

Alle Daten verbleiben ausschließlich lokal im Browser des Nutzers.

## Welche Daten werden gespeichert?

Die Erweiterung speichert in `chrome.storage.local` (also lokal im Browser) folgende Informationen, die der Nutzer selbst über die Benutzeroberfläche eingibt:

- Die aktuell ausgewählten Produkte und Mengen
- Den geplanten Drop-Zeitpunkt
- Konfigurationsoptionen (z. B. maximale Anzahl Versuche, Sound an/aus, Auto-Checkout an/aus)
- Ein internes Aktivitäts-Log (Versuche, Erfolg, Fehler) der letzten Sitzungen

Diese Daten dienen ausschließlich dazu, der Erweiterung beim nächsten Öffnen die zuvor gewählten Einstellungen wiederherzustellen und den geplanten Vorgang auszuführen.

## Welche Daten werden NICHT erhoben?

- ❌ Keine personenidentifizierbaren Informationen (Name, Adresse, E-Mail, Geburtsdatum)
- ❌ Keine Zahlungs- oder Finanzdaten
- ❌ Keine Login-Daten, Passwörter oder Sicherheitscodes
- ❌ Keine Standortdaten
- ❌ Kein Browserverlauf
- ❌ Keine Klicks, Tastatureingaben oder sonstige Nutzeraktivität
- ❌ Keine Inhalte besuchter Websites

## Datenübermittlung an Dritte

Die Erweiterung sendet **keine** Daten an Server der Autoren oder andere Dritte.

Die einzige externe Kommunikation erfolgt direkt zwischen dem Browser des Nutzers und [morenutrition.de](https://morenutrition.de) — und zwar:

- Produkt-Variant-Daten lesen: `GET https://morenutrition.de/products/<handle>.js`
- Warenkorb-Anfrage senden: `POST https://morenutrition.de/cart/add.js`

Diese Anfragen werden unter Verwendung der bestehenden Browser-Session des Nutzers gesendet, genau wie sie auch beim manuellen Surfen entstehen würden. Es werden keine zusätzlichen Cookies, Header oder Identifier gesetzt.

## Cookies

Die Erweiterung selbst setzt keine Cookies. Bestehende Cookies der Domain morenutrition.de werden vom Browser wie üblich verwaltet und verwendet — die Erweiterung liest, ändert oder kopiert diese Cookies nicht.

## Berechtigungen

Die in der Manifest-Datei deklarierten Berechtigungen werden ausschließlich für den im Web Store angegebenen alleinigen Zweck verwendet — siehe [README.md](README.md). Im Einzelnen:

- `storage` — lokales Speichern der Nutzerkonfiguration
- `alarms` — Auslösen zum geplanten Drop-Zeitpunkt
- `tabs` — Öffnen des Checkout-Tabs auf morenutrition.de
- `scripting` — Ausführen des Warenkorb-Requests im Seitenkontext von morenutrition.de
- `notifications` — Anzeige des Erfolgs- bzw. Fehler-Hinweises am Ende des Vorgangs
- `offscreen` — Abspielen eines kurzen Hinweistons (in MV3 nicht direkt im Service Worker möglich)
- Hostberechtigung `https://morenutrition.de/*` — einzige Domain mit der die Erweiterung kommuniziert

## Daten löschen

Alle gespeicherten Daten kannst du jederzeit selbst löschen:

- In der Erweiterung über den **"leeren"**-Button im Log-Bereich (löscht das Log)
- Über `chrome://extensions` → MoreSchnapper → **Entfernen** (löscht alle lokal gespeicherten Daten der Erweiterung)
- Über `chrome://settings/cookies` → Cookies und andere Websitedaten

## Open Source

Der vollständige Quellcode der Erweiterung ist öffentlich einsehbar unter:
https://github.com/mikefdy/moreschnapper

Du kannst jederzeit selbst überprüfen, dass die Erweiterung sich genau so verhält wie hier beschrieben.

## Änderungen dieser Datenschutzerklärung

Bei wesentlichen Änderungen wird das Datum oben in diesem Dokument aktualisiert. Da der Quellcode öffentlich ist, sind alle Änderungen transparent über die Git-Historie nachvollziehbar.

## Kontakt

Bei Fragen zur Datenverarbeitung kannst du ein [GitHub Issue](https://github.com/mikefdy/moreschnapper/issues) öffnen.

Verantwortlich für diese Erweiterung: **mikefdy** (GitHub-Handle).
