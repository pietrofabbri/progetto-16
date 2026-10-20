/*!
 * Progetto 16. Motore delle slide (comune a tutti gli incontri).
 *
 * Una lezione è un file HTML con tante <section class="slide">. Attributi:
 *   data-rumore="silenzio|discussione|spento"  modalità del barattolo (predefinita: spento)
 *   data-fase="solo|gruppo|tutti"              icona fissa della fase (routine visibile)
 *   data-timer="90"                            timer in secondi (anello in alto a destra)
 *   data-timer-auto                            il timer parte appena si entra nella slide
 *   data-id="nome"                             nome della slide nel registro
 * Gli elementi con classe .passo compaiono uno alla volta con la freccia avanti.
 *
 * Tasti: freccia destra / pagina giù = avanti; freccia sinistra / pagina su = indietro;
 *   spazio = avvia o ferma il timer; R = riavvia il timer; H = aiuto;
 *   F due volte = "Fine lezione" (scarica il file della lezione); B, T, U, M, K = barattolo.
 *
 * Logiche speciali di una slide: Motore.registra("id-slide", { entra, esci, avanti, indietro, tasto }).
 * avanti() e indietro() restituiscono true se hanno gestito loro il tasto.
 *
 * Registro della lezione (raccolta automatica, D-36): entrata e uscita da ogni slide, timer
 * avviati, più il registro del barattolo e il riepilogo dei gruppi senza nomi. Nessun nome,
 * nessun audio.
 */
(function () {
  "use strict";
  const slides = [...document.querySelectorAll("section.slide")];
  const logica = {};
  let i = -1, passi = 0;
  const inizio = new Date();
  const registro = { versione: 1, inizio: inizio.toISOString(), lezione: document.title, slide: [], eventi: [] };
  const t = () => +((Date.now() - inizio.getTime()) / 1000).toFixed(1);

  // ---------- icone delle fasi
  const ICONE = {
    solo: { testo: "Da solo", svg: '<circle cx="12" cy="7" r="4"/><path d="M4 22c0-5 3.6-8 8-8s8 3 8 8z"/>' },
    gruppo: { testo: "Nel gruppo", svg: '<circle cx="6" cy="8" r="3"/><circle cx="12" cy="6" r="3.3"/><circle cx="18" cy="8" r="3"/><path d="M0 21c0-4 2.6-7 6-7s6 3 6 7zM6 21c0-4.4 2.7-7.5 6-7.5s6 3.1 6 7.5zM12 21c0-4 2.6-7 6-7s6 3 6 7z"/>' },
    tutti: { testo: "Tutti insieme", svg: '<rect x="2" y="3" width="20" height="13" rx="2"/><path d="M8 21h8M12 16v5" stroke="currentColor" stroke-width="2"/>' },
  };

  // ---------- interfaccia comune
  const testata = document.createElement("div"); testata.className = "p16m-testata";
  const fase = document.createElement("div"); fase.className = "p16m-fase"; fase.hidden = true;
  const timer = document.createElement("div"); timer.className = "p16m-timer"; timer.hidden = true;
  timer.innerHTML = '<svg viewBox="0 0 100 100"><circle class="fondo" cx="50" cy="50" r="44"/><circle class="arco" cx="50" cy="50" r="44" pathLength="100" stroke-dasharray="100 100"/></svg><div class="cifre"></div>';
  testata.append(fase, timer);
  const barra = document.createElement("div"); barra.className = "p16m-barra";
  const aiuto = document.createElement("div"); aiuto.className = "p16m-aiuto"; aiuto.hidden = true;
  aiuto.innerHTML = "<kbd>→</kbd> avanti · <kbd>←</kbd> indietro · <kbd>spazio</kbd> timer · <kbd>R</kbd> riavvia timer<br><kbd>B</kbd> barattolo · <kbd>T</kbd> taratura · <kbd>U</kbd> sblocca · <kbd>M</kbd> modalità del barattolo (solo questa slide) · <kbd>K</kbd> blocco sì/no<br><kbd>G</kbd> appello e gruppi · <kbd>F</kbd> <kbd>F</kbd> fine lezione · <kbd>H</kbd> aiuto";
  document.body.append(testata, barra, aiuto);

  // ---------- timer
  const T = { durata: 0, resto: 0, va: false, ultimo: 0, inPausaPerBlocco: false };
  const arco = timer.querySelector(".arco"), cifre = timer.querySelector(".cifre");
  function mostraTimer() {
    const s = Math.max(0, Math.ceil(T.resto));
    cifre.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    arco.setAttribute("stroke-dasharray", (T.durata ? (T.resto / T.durata) * 100 : 0) + " 100");
    timer.classList.toggle("fine", T.durata > 0 && T.resto <= 0);
    timer.classList.toggle("pausa", !T.va && T.resto > 0);
  }
  function impostaTimer(sec, auto) {
    T.durata = sec; T.resto = sec; T.va = false; timer.hidden = !sec;
    if (sec && auto) avviaTimer(); else mostraTimer();
  }
  function avviaTimer() { if (!T.durata) return; if (T.resto <= 0) T.resto = T.durata; T.va = true; T.ultimo = performance.now(); registro.eventi.push({ t: t(), evento: "timer", slide: idSlide(), secondi: T.durata }); mostraTimer(); }
  function fermaTimer() { T.va = false; mostraTimer(); }
  function giro(now) {
    if (T.va) {
      T.resto -= (now - T.ultimo) / 1000; T.ultimo = now;
      if (T.resto <= 0) { T.resto = 0; T.va = false; campanella(); }
      mostraTimer();
    }
    requestAnimationFrame(giro);
  }
  requestAnimationFrame(giro);
  document.addEventListener("barattolo:blocco", () => { if (T.va) { T.inPausaPerBlocco = true; fermaTimer(); } });
  document.addEventListener("barattolo:sblocco", () => { if (T.inPausaPerBlocco) { T.inPausaPerBlocco = false; avviaTimer(); } });

  let actx = null;
  function campanella() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = actx.currentTime, g = actx.createGain(); g.connect(actx.destination);
      [[880, 0.18], [1320, 0.08]].forEach(([f, a]) => {
        const o = actx.createOscillator(), gg = actx.createGain(); o.frequency.value = f;
        gg.gain.setValueAtTime(a, t0); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
        o.connect(gg).connect(g); o.start(t0); o.stop(t0 + 1.3);
      });
    } catch (e) {}
  }

  // ---------- navigazione
  const idSlide = (k = i) => (slides[k] && (slides[k].dataset.id || "slide-" + (k + 1))) || "";
  function vai(k, daDietro) {
    if (k < 0 || k >= slides.length) return;
    if (i >= 0) {
      const L = logica[idSlide()]; if (L && L.esci) L.esci(slides[i]);
      slides[i].classList.remove("attiva");
      const ultimo = registro.slide[registro.slide.length - 1]; if (ultimo) ultimo.uscita = t();
    }
    i = k;
    const s = slides[i];
    s.classList.add("attiva");
    const tutti = [...s.querySelectorAll(".passo")];
    passi = daDietro ? tutti.length : 0;
    tutti.forEach((el, n) => el.classList.toggle("visto", n < passi));
    const f = s.dataset.fase;
    fase.hidden = !ICONE[f];
    if (ICONE[f]) fase.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor">' + ICONE[f].svg + "</svg>" + ICONE[f].testo;
    impostaTimer(+s.dataset.timer || 0, s.hasAttribute("data-timer-auto"));
    if (window.Barattolo) Barattolo.modalita(s.dataset.rumore || "spento");
    barra.style.width = ((i + 1) / slides.length * 100) + "%";
    registro.slide.push({ id: idSlide(), entrata: t() });
    const L = logica[idSlide()]; if (L && L.entra) L.entra(s);
    try { history.replaceState(null, "", "#" + (i + 1)); } catch (e) {}
  }
  function avanti() {
    const L = logica[idSlide()];
    if (L && L.avanti && L.avanti(slides[i])) return;
    const tutti = [...slides[i].querySelectorAll(".passo")];
    if (passi < tutti.length) { tutti[passi].classList.add("visto"); passi++; return; }
    vai(i + 1);
  }
  function indietro() {
    const L = logica[idSlide()];
    if (L && L.indietro && L.indietro(slides[i])) return;
    const tutti = [...slides[i].querySelectorAll(".passo")];
    if (passi > 0) { passi--; tutti[passi].classList.remove("visto"); return; }
    vai(i - 1, true);
  }

  // ---------- fine lezione
  let fPremuto = 0;
  function fineLezione() {
    const ultimo = registro.slide[registro.slide.length - 1]; if (ultimo && ultimo.uscita === undefined) ultimo.uscita = t();
    let gruppi = null;
    let storicoGruppi = null;
    try { gruppi = JSON.parse(localStorage.getItem("p16-gruppi-riepilogo") || "null"); } catch (e) {}
    try { storicoGruppi = JSON.parse(localStorage.getItem("p16-storico") || "null"); } catch (e) {}
    const pacchetto = {
      lezione: registro,
      barattolo: window.Barattolo ? { registro: Barattolo.registro(), impostazioni: Barattolo.impostazioni() } : null,
      gruppi: gruppi,
      storico_gruppi: storicoGruppi,          // solo numeri del registro e ruoli, nessun nome
      nota: "Raccolta automatica del Progetto 16: nessun nome, nessun audio.",
    };
    const d = inizio, z = n => String(n).padStart(2, "0");
    const nome = `lezione-${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}.json`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(pacchetto, null, 1)], { type: "application/json" }));
    a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    avviso("Lezione salvata: " + nome + ". Caricalo nella cartella dell'incontro.");
  }
  function avviso(msg) {
    const el = document.createElement("div"); el.className = "p16m-avviso"; el.textContent = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), 4000);
  }

  // ---------- tastiera
  document.addEventListener("keydown", e => {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (document.querySelector(".p16b-pann")) return;           // pannello del barattolo aperto
    if (document.querySelector(".p16g-pann")) return;           // pannello dei gruppi aperto
    if (document.querySelector(".p16b-velo.on")) return;        // schermo fermo
    const k = e.key;
    const L = logica[idSlide()];
    if (L && L.tasto && L.tasto(k, slides[i])) { e.preventDefault(); return; }
    if (k === "ArrowRight" || k === "PageDown") avanti();
    else if (k === "ArrowLeft" || k === "PageUp") indietro();
    else if (k === " ") { T.va ? fermaTimer() : avviaTimer(); }
    else if (k === "r" || k === "R") { T.resto = T.durata; T.va = false; mostraTimer(); }
    else if (k === "h" || k === "H") aiuto.hidden = !aiuto.hidden;
    else if (k === "f" || k === "F") {
      const ora = Date.now();
      if (ora - fPremuto < 1500) { fineLezione(); fPremuto = 0; } else { fPremuto = ora; avviso("Premi di nuovo F per salvare la lezione."); }
    }
    else return;
    e.preventDefault();
  });

  // ---------- API
  window.Motore = {
    registra(id, l) { logica[id] = l; },
    vai: n => vai(n), avanti, indietro,
    timer: { imposta: impostaTimer, avvia: avviaTimer, ferma: fermaTimer, resto: () => T.resto },
    evento(nome, dati) { registro.eventi.push(Object.assign({ t: t(), evento: nome, slide: idSlide() }, dati || {})); },
    fineLezione, avviso, campanella,
    avvia() {
      if (window.Barattolo) Barattolo.monta({ modalita: "spento" });
      const h = parseInt((location.hash || "").slice(1), 10);
      vai(h > 0 && h <= slides.length ? h - 1 : 0);
    },
  };
})();
