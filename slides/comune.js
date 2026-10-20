/*! Progetto 16. Parti comuni delle lezioni, dall'incontro 2 in poi (l'incontro 1 ha una sua copia).
 *
 * Si carica dopo palette.js, barattolo.js, motore.js e gruppi.js. Poi, nella lezione:
 *   const C = Comune.avvia({ dopoGruppi: "accoglienza" });
 * Fornisce:
 *   C.P (palette), C.G (colori dei gruppi), C.forma(g), C.chip(g)
 *   C.oggi        gruppi confermati oggi dal programma dei gruppi (null se mancano)
 *   C.presenti    [{ g, n }] gruppi di oggi, oppure 8 gruppi di prova
 *   C.membri      [{ g, m: [{ nome, ruolo }] }] (nomi solo dal browser del PC d'aula)
 *   C.prova       true se si stanno usando dati di prova
 *   C.meta(g)     "A" o "B": metà fissa della classe per colore, per gli esperimenti a due versioni
 *                 (A: rosso, verde, azzurro, viola, giallo; B: arancio, petrolio, blu, rosa). Le carte
 *                 stampate seguono la stessa divisione: non cambiarla senza ristampare.
 * Slide riconosciute per data-id: "appello" (bottone #apri-appello) e "gruppi" (#pianta, #gruppi-demo).
 * Pianta dell'aula: window.P16_PIANTA = { colonne, righe, pos: { colore: [colonna, riga] } } prima di avvia().
 */
(function () {
  "use strict";
  const P = window.P16_PALETTE, G = P.gruppi;
  const forma = (g, cls) => `<svg viewBox="0 0 24 24" fill="${g.hex}" ${cls ? 'class="' + cls + '"' : ""}>${P.forme_svg_24[g.forma]}</svg>`;
  const chip = g => `<span class="chip" data-g="${g.id}">${forma(g)}${g.nome}</span>`;
  const META_A = ["rosso", "verde", "azzurro", "viola", "giallo"];
  const RUOLI4 = ["Facilitatore", "Custode", "Verificatore", "Segretario"], RUOLI3 = ["Facilitatore e custode", "Verificatore", "Segretario"];
  const SIGLA = n => /^Facilitatore/.test(n) ? "F" : /^Custode/.test(n) ? "C" : /erificatore/.test(n) ? "V" : "S";
  const ICONE_RUOLO = {
    F: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 5 L15 12 L12 19 L9 12 Z" fill="currentColor"/>',
    C: '<path d="M6 3 H18 M6 21 H18 M7 3 C7 9 17 9 17 12 C17 15 7 15 7 21 M17 3 C17 9 7 9 7 12 C7 15 17 15 17 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    V: '<circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M14.5 14.5 L20 20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    S: '<path d="M4 20 L5 15 L16 4 L20 8 L9 19 Z M14 6 L18 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  };
  // Aula vera (D-91): 4 isole davanti (vicino alla lavagna) e 3 dietro, centrate. Rosa e giallo servirebbero solo oltre 28 presenti.
  const PIANTA_PRED = { colonne: 4, righe: 2, pos: { rosso: [0, 0], arancio: [1, 0], verde: [2, 0], petrolio: [3, 0], azzurro: [0.5, 1], blu: [1.5, 1], viola: [2.5, 1], rosa: [3.5, 1], giallo: [-0.5, 1] } };

  function avvia(opz) {
    opz = opz || {};
    let oggi = null;
    try { oggi = JSON.parse(localStorage.getItem("p16-gruppi-oggi") || "null"); } catch (e) {}
    const d = new Date(), iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    if (oggi && oggi.data !== iso) oggi = null;                     // gruppi di un altro giorno: non valgono
    const veri = !!(oggi && oggi.gruppi && oggi.gruppi.length);
    const presenti = veri ? oggi.gruppi.map(x => ({ g: G.find(c => c.id === x.id), n: x.n }))
      : (window.Gruppi ? Gruppi.colori : G).slice(0, 8).map((g, k) => ({ g, n: k < 6 ? 4 : 3 }));
    const membri = (veri && oggi.gruppi[0].membri) ? oggi.gruppi.map(x => ({ g: G.find(c => c.id === x.id), m: x.membri }))
      : presenti.map((p, k) => ({ g: p.g, m: Array.from({ length: p.n }, (_, j) => ({ nome: "Studente " + (k * 4 + j + 1), ruolo: (p.n === 3 ? RUOLI3 : RUOLI4)[j] })) }));

    // slide 0: appello e gruppi
    window.P16_DOPO_GRUPPI = opz.dopoGruppi || "accoglienza";
    const bott = document.getElementById("apri-appello");
    if (bott) bott.addEventListener("click", () => window.Gruppi && Gruppi.apri());
    Motore.registra("appello", { entra() { setTimeout(() => window.Gruppi && Gruppi.apri(), 300); } });

    // pianta dell'aula
    const pianta = document.getElementById("pianta");
    if (pianta) {
      const PI = window.P16_PIANTA || PIANTA_PRED;
      membri.forEach(x => {
        const el = document.createElement("div"); el.className = "isola-p"; el.dataset.g = x.g.id;
        el.style.setProperty("--g", x.g.hex);
        const nome = m => `<span class="nome">${m.nome ? `<svg viewBox="0 0 24 24">${ICONE_RUOLO[SIGLA(m.ruolo)]}</svg>${m.nome}` : ""}</span>`;
        const sx = x.m.filter((_, j) => j % 2 === 0), dx = x.m.filter((_, j) => j % 2 === 1);
        el.innerHTML = `<div class="lato sx">${sx.map(nome).join("")}</div><div class="banchi"><i></i><i></i><span class="etg"><svg viewBox="0 0 24 24">${P.forme_svg_24[x.g.forma]}</svg>${x.g.nome}</span></div><div class="lato dx">${dx.map(nome).join("")}</div>`;
        pianta.appendChild(el);
      });
      const disponi = () => {
        const W = pianta.clientWidth, H = pianta.clientHeight;
        let k = 1;   // un solo fattore per tutte le isole: si rimpiccioliscono insieme quanto basta per stare nella pianta
        pianta.querySelectorAll(".isola-p").forEach(el => {
          const [c, r] = PI.pos[el.dataset.g] || [0, 0];
          el.style.left = (W * (c + 0.5) / PI.colonne) + "px";
          el.style.top = (18 + (H - 18) * (r + 0.5) / PI.righe) + "px";
          k = Math.min(k, Math.min(1, (W / PI.colonne - 10) / el.offsetWidth, ((H - 22) / PI.righe - 12) / el.offsetHeight));
        });
        pianta.style.setProperty("--k", k.toFixed(3));
      };
      let tt = [];
      Motore.registra("gruppi", {
        entra() {
          tt.forEach(clearTimeout); tt = []; disponi();
          const isole = [...pianta.querySelectorAll(".isola-p")];
          isole.forEach(e => { e.classList.remove("on"); e.querySelectorAll(".nome").forEach(n => n.classList.remove("on")); });
          isole.forEach((is, k) => {
            tt.push(setTimeout(() => is.classList.add("on"), 300 + k * 400));
            [...is.querySelectorAll(".nome")].forEach((n, j) => tt.push(setTimeout(() => n.classList.add("on"), 700 + k * 400 + j * 160)));
          });
        },
      });
      window.addEventListener("resize", disponi);
      const demo = document.getElementById("gruppi-demo");
      if (demo) demo.textContent = veri && oggi.gruppi[0].membri ? "" : "Dati di prova.";
    }
    return { P, G, forma, chip, oggi, presenti, membri, prova: !veri, meta: g => META_A.includes(g.id) ? "A" : "B", ICONE_RUOLO, SIGLA };
  }
  window.Comune = { avvia };
})();
