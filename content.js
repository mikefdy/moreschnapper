// Content script — currently a placeholder for future enhancements
// (e.g. auto-filling shipping address, auto-clicking the "Jetzt bezahlen"
// button on the checkout page, or scraping product pages for upcoming drops).

// Expose a tiny helper that the popup/background can invoke via
// chrome.scripting.executeScript if needed later.
window.__moreschnapper = {
  version: "0.1.0",
  ready: true,
};
