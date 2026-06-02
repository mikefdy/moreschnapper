chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "PLAY_SOUND") return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    // Three rising chirps — short, punchy, hard to miss.
    const notes = [
      { freq: 880, start: 0.00, dur: 0.15 },
      { freq: 1175, start: 0.18, dur: 0.15 },
      { freq: 1568, start: 0.36, dur: 0.30 },
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0.0001, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + n.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.05);
    }
    setTimeout(() => ctx.close(), 1500);
  } catch (e) {
    console.error("sound failed", e);
  }
});
