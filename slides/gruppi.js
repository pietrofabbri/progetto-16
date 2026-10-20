/* Progetto 16. Programma dei gruppi (appello, gruppi, ruoli, storico).
 *
 * Si usa sul PC d'aula PRIMA di collegare il proiettore: tasto G nelle slide.
 * 1. Appello: un pulsante per ogni numero (o nome). Un clic: assente. Due clic: esce prima.
 *    Tre clic: di nuovo presente.
 * 2. "Forma i gruppi". Due misure, si sceglie nel pannello (D-93):
 *    - da 3 (predefinita): massimo numero di gruppi da 3, il resto da 4 (21: 7x3; 22: 6x3 + 1x4;
 *      23: 5x3 + 2x4). Si formano con chi c'è; i ritardatari entrano nei gruppi da 3, che diventano da 4.
 *    - da 4: massimo numero di gruppi da 4, il resto da 3 (16: 4x4; 17: 2x4 + 3x3; 20: 5x4).
 *    Fino a 30 persone, al massimo 9 gruppi.
 * 3. Ruoli sempre coperti. Ognuno cambia ruolo rispetto alla volta prima e capita il meno
 *    possibile con le stesse persone. Chi esce prima non fa il custode (riordino finale)
 *    e, se si può, nemmeno il segretario o il facilitatore; mai due nello stesso gruppo.
 * 4. "Conferma e mostra": salva i gruppi del giorno nello storico e li mostra nella slide.
 *
 * Storico persistente (D-76): oltre al browser, lo storico (solo numeri, nessun nome) entra nel
 * file di "Fine lezione"; nella repo privata un'azione di GitHub lo raccoglie in
 * incontri/gruppi/storico.json, che le slide rileggono all'avvio (window.P16_STORICO_URL) e
 * uniscono a quello del browser. Così lo storico sopravvive anche se il browser viene ripulito.
 *
 * Dati: nel browser del PC d'aula (localStorage) e nelle copie esportate a mano. Nella repo
 * PRIVATA, con l'autorizzazione di Pietro (D-92), i nomi stanno in incontri/gruppi/classe.js
 * (window.P16_CLASSE), da cancellare a fine progetto. Mai nomi nella repo pubblica. Lo storico
 * si legge anche da incontri/gruppi/storico.js (window.P16_STORICO): i file .js funzionano
 * anche aprendo le slide da file://, dove fetch non funziona. Senza nomi si usano i numeri
 * del registro. Il riepilogo per "Fine lezione" (p16-gruppi-riepilogo) non contiene nomi.
 */
(function () {
  "use strict";
  const K = { misura: "p16-gruppi-misura", classe: "p16-classe", storico: "p16-storico", oggi: "p16-gruppi-oggi", riep: "p16-gruppi-riepilogo", appello: "p16-appello" };
  const leggi = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } };
  const scrivi = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  const P = window.P16_PALETTE;
  // Ordine in cui si usano i colori: il giallo sempre per ultimo (D-75).
  const ORDINE = ["rosso", "arancio", "verde", "petrolio", "azzurro", "blu", "viola", "rosa", "giallo"];
  const COLORI = P ? ORDINE.map(id => P.gruppi.find(g => g.id === id)).filter(Boolean) : [];
  const RUOLI = {
    F: "Facilitatore", C: "Custode", V: "Verificatore", S: "Segretario",
    FC: "Facilitatore e custode", V2: "Secondo verificatore",
  };
  const BASE = { F: ["F"], C: ["C"], V: ["V"], S: ["S"], FC: ["F", "C"], V2: ["V"] };

  // ------------------------------------------------------------ dimensioni dei gruppi
  const misura = () => leggi(K.misura, 3) === 4 ? 4 : 3;
  function dimensioni(n, m) {
    m = m || misura();
    if (n <= 0) return [];
    if (n < 6) return [n];                         // 1-5 presenti: un solo gruppo
    let tre, quattro;
    if (m === 3) { quattro = n % 3 === 0 ? 0 : n % 3 === 1 ? 1 : 2; tre = (n - 4 * quattro) / 3; }   // massimo dei gruppi da 3
    else { tre = (4 - (n % 4)) % 4; quattro = (n - 3 * tre) / 4; }                                  // massimo dei gruppi da 4
    return Array(quattro).fill(4).concat(Array(tre).fill(3));
  }
  function ruoliPer(d) {
    if (d >= 5) return ["F", "C", "V", "S"].concat(Array(d - 4).fill("V2"));
    if (d === 4) return ["F", "C", "V", "S"];
    if (d === 3) return ["FC", "V", "S"];
    if (d === 2) return ["FC", "S"];
    return ["FC"];
  }
  function descrivi(n) {
    const d = dimensioni(n); if (!d.length) return "nessun presente";
    const q = d.filter(x => x === 4).length, t = d.filter(x => x === 3).length, a = d.filter(x => x !== 4 && x !== 3);
    const p = [];
    if (q) p.push(q + (q === 1 ? " gruppo da 4" : " gruppi da 4"));
    if (t) p.push(t + (t === 1 ? " gruppo da 3" : " gruppi da 3"));
    if (a.length) p.push("1 gruppo da " + a[0]);
    return p.join(" e ");
  }

  // ------------------------------------------------------------ storico
  // storico = { lezioni: [ { data, gruppi: [ { id, membri: [ { num, ruolo } ] } ] } ] }
  function statistiche(storico, escludiData) {
    const insieme = {}, conteggi = {}, ultimo = {};
    for (const lez of storico.lezioni) {
      if (lez.data === escludiData) continue;
      for (const g of lez.gruppi) {
        const nums = g.membri.map(m => m.num);
        for (let a = 0; a < nums.length; a++) for (let b = a + 1; b < nums.length; b++) {
          const k = Math.min(nums[a], nums[b]) + "-" + Math.max(nums[a], nums[b]);
          insieme[k] = (insieme[k] || 0) + 1;
        }
        for (const m of g.membri) {
          const c = conteggi[m.num] || (conteggi[m.num] = { F: 0, C: 0, V: 0, S: 0 });
          for (const r of BASE[m.ruolo] || []) c[r]++;
          ultimo[m.num] = m.ruolo;                 // le lezioni sono in ordine: resta l'ultima
        }
      }
    }
    return { insieme, conteggi, ultimo };
  }

  // ------------------------------------------------------------ costo di una proposta
  function costoRuolo(num, ruolo, st, esceSet) {
    let c = 0;
    const basi = BASE[ruolo];
    const prima = st.ultimo[num];
    if (prima && BASE[prima].some(r => basi.includes(r))) c += 150;     // stesso ruolo della volta prima
    const cnt = st.conteggi[num];
    if (cnt) for (const r of basi) c += cnt[r] * 6;                      // ruolo già fatto tante volte
    if (esceSet.has(num)) c += { C: 400, FC: 450, S: 120, F: 90, V: 0, V2: 0 }[ruolo];
    return c;
  }
  function permutazioni(a) {
    if (a.length <= 1) return [a.slice()];
    const out = [];
    a.forEach((x, i) => permutazioni(a.slice(0, i).concat(a.slice(i + 1))).forEach(p => out.push([x].concat(p))));
    return out;
  }
  const PERM = {};
  function migliorRuoli(membri, st, esceSet) {
    const ruoli = ruoliPer(membri.length);
    const perms = PERM[membri.length] || (PERM[membri.length] = permutazioni(ruoli.map((_, i) => i)));
    let best = null, bc = Infinity;
    for (const p of perms) {
      let c = 0;
      for (let i = 0; i < membri.length; i++) c += costoRuolo(membri[i], ruoli[p[i]], st, esceSet);
      if (c < bc - 1e-9 || (Math.abs(c - bc) < 1e-9 && Math.random() < 0.5)) { bc = c; best = p; }
    }
    return { ruoli: best.map(i => ruoli[i]), costo: bc };
  }
  function costoGruppo(membri, st, esceSet) {
    let c = 0;
    for (let a = 0; a < membri.length; a++) for (let b = a + 1; b < membri.length; b++) {
      const k = Math.min(membri[a], membri[b]) + "-" + Math.max(membri[a], membri[b]);
      const v = st.insieme[k] || 0; c += 25 * v * v;                    // già stati insieme
    }
    const usc = membri.filter(m => esceSet.has(m)).length;
    if (usc > 1) c += 300 * (usc - 1);                                   // due uscite nello stesso gruppo
    const r = migliorRuoli(membri, st, esceSet);
    return { costo: c + r.costo, ruoli: r.ruoli };
  }

  function mescola(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function forma(presenti, esce, st) {
    const dims = dimensioni(presenti.length);
    const esceSet = new Set(esce);
    let migliore = null;
    const giri = presenti.length > 20 ? 40 : 60;
    for (let g = 0; g < giri; g++) {
      const ord = mescola(presenti.slice());
      let gruppi = [], k = 0;
      for (const d of dims) { gruppi.push(ord.slice(k, k + d)); k += d; }
      let costi = gruppi.map(m => costoGruppo(m, st, esceSet));
      let migliorato = true, passi = 0;
      while (migliorato && passi < 60) {
        migliorato = false; passi++;
        for (let a = 0; a < gruppi.length; a++) for (let b = a + 1; b < gruppi.length; b++)
          for (let i = 0; i < gruppi[a].length; i++) for (let j = 0; j < gruppi[b].length; j++) {
            const ga = gruppi[a].slice(), gb = gruppi[b].slice();
            [ga[i], gb[j]] = [gb[j], ga[i]];
            const ca = costoGruppo(ga, st, esceSet), cb = costoGruppo(gb, st, esceSet);
            if (ca.costo + cb.costo < costi[a].costo + costi[b].costo - 1e-9) {
              gruppi[a] = ga; gruppi[b] = gb; costi[a] = ca; costi[b] = cb; migliorato = true;
            }
          }
      }
      const tot = costi.reduce((s, c) => s + c.costo, 0);
      if (!migliore || tot < migliore.tot) migliore = { tot, gruppi, costi };
    }
    const ORD = { F: 0, FC: 0, C: 1, V: 2, V2: 3, S: 4 };
    return migliore.gruppi.map((m, i) => ({
      id: COLORI[i] ? COLORI[i].id : "g" + (i + 1),
      membri: m.map((num, j) => ({ num, ruolo: migliore.costi[i].ruoli[j], esce: esceSet.has(num) || undefined }))
        .sort((a, b) => ORD[a.ruolo] - ORD[b.ruolo]),
    }));
  }

  // ------------------------------------------------------------ stato
  const oggiData = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  let classe = leggi(K.classe, { iscritti: 25, nomi: {} });   // iscritti del corso 2026/27 (D-91); i nomi si incollano nel pannello, mai in una repo
  let storico = leggi(K.storico, { lezioni: [] });
  let appello = leggi(K.appello, null);
  if (!appello || appello.data !== oggiData()) appello = { data: oggiData(), stato: {} };   // stato[num] = "assente" | "esce"
  let proposta = null;
  let daFile = 0;

  function unisci(altro) {
    // unione per data; a parità di data vale quella del browser
    if (!altro || !Array.isArray(altro.lezioni)) return 0;
    const date = new Set(storico.lezioni.map(l => l.data));
    let nuove = 0;
    for (const l of altro.lezioni) if (l && l.data && Array.isArray(l.gruppi) && !date.has(l.data)) { storico.lezioni.push(l); nuove++; }
    storico.lezioni.sort((a, b) => a.data < b.data ? -1 : 1);
    if (nuove) scrivi(K.storico, storico);
    return nuove;
  }
  // Link con i nomi (D-92): .../incontro-NN/#classe=<base64url di {"iscritti","nomi"}>. Il frammento dopo #
  // non arriva mai al server: i nomi passano solo dal link (privato, di Pietro) al browser, che li salva
  // e toglie il frammento dall'indirizzo. Basta aprirlo una volta per ogni browser.
  try {
    const m = /^#classe=([A-Za-z0-9_-]+)$/.exec(location.hash);
    if (m) {
      const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
      const j = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))));
      if (j && j.nomi) { classe = { iscritti: j.iscritti || classe.iscritti, nomi: j.nomi }; scrivi(K.classe, classe); }
      history.replaceState(null, "", location.pathname + location.search);
    }
  } catch (e) {}
  // Pulizia una tantum (20/10/2026, richiesta di Pietro): le lezioni fatte per prova prima della
  // prima lezione vera si cancellano dallo storico del browser, una sola volta, e solo prima delle 12.
  try {
    if (!localStorage.getItem("p16-pulizia-prove") && new Date() < new Date("2026-10-20T12:00:00+02:00")) {
      storico = { lezioni: [] }; scrivi(K.storico, storico);
      localStorage.removeItem(K.oggi); localStorage.removeItem(K.riep);
      localStorage.setItem("p16-pulizia-prove", "1");
    } else if (!localStorage.getItem("p16-pulizia-prove")) localStorage.setItem("p16-pulizia-prove", "1");
  } catch (e) {}
  if (window.P16_STORICO) { daFile = (window.P16_STORICO.lezioni || []).length; unisci(window.P16_STORICO); }
  // nomi della classe dal file della repo privata (D-92): valgono se nel browser non ci sono nomi
  if (window.P16_CLASSE && window.P16_CLASSE.nomi && !Object.keys(classe.nomi || {}).length) {
    classe = { iscritti: window.P16_CLASSE.iscritti || classe.iscritti, nomi: window.P16_CLASSE.nomi }; scrivi(K.classe, classe);
  }
  if (window.P16_STORICO_URL) {
    fetch(window.P16_STORICO_URL, { cache: "no-store" }).then(r => r.ok ? r.json() : null)
      .then(j => { daFile = j && j.lezioni ? j.lezioni.length : 0; unisci(j); if (pann) disegna(); })
      .catch(() => { /* file:// o file assente: resta lo storico del browser */ });
  }

  const nome = num => (classe.nomi && classe.nomi[num]) ? classe.nomi[num] : "N. " + num;
  const numeri = () => Array.from({ length: classe.iscritti }, (_, i) => i + 1);
  const presenti = () => numeri().filter(n => appello.stato[n] !== "assente");
  const uscite = () => numeri().filter(n => appello.stato[n] === "esce");

  // ------------------------------------------------------------ interfaccia
  const css = `
.p16g-pann{position:fixed;inset:0;z-index:9600;background:var(--p16-carta,#F5F6F8);color:var(--p16-inchiostro,#1B2130);overflow:auto;font-family:"Atkinson Hyperlegible",system-ui,sans-serif;padding:24px max(16px,3vw) 40px}
.p16g-pann h2{margin:0 0 4px;font-size:28px}
.p16g-pann .nota{color:var(--p16-grigio,#5B6475);font-size:15px;margin:0 0 14px;max-width:70ch}
.p16g-riga{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0}
.p16g-pann button{font:inherit;font-size:15px;border:1px solid var(--p16-linea,#D5DAE2);background:var(--p16-bianco,#fff);color:inherit;border-radius:8px;padding:8px 14px;cursor:pointer}
.p16g-pann button.prim{background:var(--p16-inchiostro,#1B2130);color:var(--p16-bianco,#fff);border-color:transparent;font-weight:700}
.p16g-pann button:focus-visible{outline:3px solid #2C8BC9;outline-offset:2px}
.p16g-chiudi{position:absolute;top:16px;right:max(16px,3vw)}
.p16g-appello{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin:12px 0}
.p16g-appello button{text-align:left;display:flex;flex-direction:column;gap:2px;min-height:58px}
.p16g-appello button b{font-size:18px}
.p16g-appello button small{font-size:12px;color:var(--p16-grigio,#5B6475)}
.p16g-appello button.assente{opacity:.45;text-decoration:line-through;background:transparent}
.p16g-appello button.esce{border:3px solid var(--p16-attenzione,#E3A008)}
.p16g-conta{font-size:17px;font-weight:700}
.p16g-gruppi{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-top:12px}
.p16g-gr{background:var(--p16-bianco,#fff);border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(13,19,34,.1)}
.p16g-gr .t{padding:6px 10px;color:#FFFFFF;font-weight:700}
.p16g-gr ul{list-style:none;margin:0;padding:4px 10px 8px;font-size:15px}
.p16g-gr li{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-top:1px solid var(--p16-linea,#D5DAE2)}
.p16g-gr li span{color:var(--p16-grigio,#5B6475);font-size:13px}
.p16g-gr li em{font-style:normal;font-size:12px;font-weight:700;border-bottom:3px solid var(--p16-attenzione,#E3A008)}
.p16g-pann details{margin-top:22px;background:var(--p16-bianco,#fff);border-radius:10px;padding:10px 14px}
.p16g-pann summary{cursor:pointer;font-weight:700}
.p16g-pann textarea{width:100%;min-height:160px;font:inherit;font-size:14px;box-sizing:border-box}
.p16g-pann input[type=number]{font:inherit;width:5em;padding:6px}
.p16g-msg{min-height:1.4em;color:var(--p16-blocco,#D9482B);font-size:15px}
`;
  let pann = null;

  function apri() {
    if (pann) return;
    if (!document.getElementById("p16g-stile")) { const s = document.createElement("style"); s.id = "p16g-stile"; s.textContent = css; document.head.appendChild(s); }
    pann = document.createElement("div"); pann.className = "p16g-pann"; pann.setAttribute("role", "dialog"); pann.setAttribute("aria-label", "Appello e gruppi");
    document.body.appendChild(pann);
    pann.addEventListener("keydown", e => { if (e.key === "Escape") chiudi(); });
    disegna();
    const b = pann.querySelector("#p16g-appello button"); if (b) b.focus();
  }
  function chiudi() { if (pann) { pann.remove(); pann = null; } }

  function disegna() {
    if (!pann) return;
    const pres = presenti().length, usc = uscite().length;
    const ultimaVolta = storico.lezioni.length ? storico.lezioni[storico.lezioni.length - 1].data : null;
    pann.innerHTML = `
<button class="p16g-chiudi" id="p16g-chiudi" type="button">Chiudi (Esc)</button>
<h2>Appello e gruppi</h2>
<p class="nota">Da fare prima di collegare il proiettore. Clic su un numero: <b>assente</b>. Secondo clic: <b>esce prima</b> (permesso di uscita anticipata). Terzo clic: di nuovo presente. Chiedi sempre: "Qualcuno oggi esce prima?"</p>
<div class="p16g-appello" id="p16g-appello">${numeri().map(n => {
      const s = appello.stato[n] || "";
      const et = s === "assente" ? "assente" : s === "esce" ? "esce prima" : "presente";
      return `<button type="button" data-n="${n}" class="${s}" aria-label="${nome(n)}: ${et}"><b>${classe.nomi && classe.nomi[n] ? n + ". " + nome(n) : nome(n)}</b><small>${et}</small></button>`;
    }).join("")}</div>
<div class="p16g-riga"><label>Misura dei gruppi <select id="p16g-misura"><option value="3"${misura() === 3 ? " selected" : ""}>da 3 (i ritardatari li portano a 4)</option><option value="4"${misura() === 4 ? " selected" : ""}>da 4 (il resto da 3)</option></select></label></div>
<div class="p16g-riga"><span class="p16g-conta">${pres} presenti${usc ? ", " + usc + " esce prima" : ""}: ${descrivi(pres)}</span></div>
<div class="p16g-riga">
  <button class="prim" type="button" id="p16g-forma">${proposta ? "Rifai i gruppi" : "Forma i gruppi"}</button>
  ${proposta ? '<button class="prim" type="button" id="p16g-conferma">Conferma e mostra</button>' : ""}
  <span class="nota" style="margin:0">Lezioni nello storico: ${storico.lezioni.length}${ultimaVolta ? " (ultima: " + ultimaVolta + ")" : ""}${daFile ? "; nel file della repo: " + daFile : ""}</span>
</div>
<div class="p16g-msg" id="p16g-msg"></div>
${proposta ? `<div class="p16g-gruppi">${proposta.map(g => {
      const c = COLORI.find(x => x.id === g.id) || { nome: g.id, hex: "#5B6475" };
      return `<div class="p16g-gr"><div class="t" style="background:${c.hex}">${c.nome}</div><ul>${g.membri.map(m => `<li>${nome(m.num)}${m.esce ? " <em>esce prima</em>" : ""}<span>${RUOLI[m.ruolo]}</span></li>`).join("")}</ul></div>`;
    }).join("")}</div>` : ""}
${proposta ? `<div class="p16g-riga"><span class="nota" style="margin:0">Ritardatario: </span><select id="p16g-rit" aria-label="Ritardatario">${numeri().filter(n => appello.stato[n] === "assente").map(n => `<option value="${n}">${n}. ${nome(n)}</option>`).join("")}</select><button type="button" id="p16g-agg">Aggiungi a un gruppo</button></div>` : ""}
<details>
  <summary>Classe, nomi e copia di sicurezza</summary>
  <p class="nota">I nomi restano solo in questo browser. Uno per riga, nell'ordine del registro: la riga 1 è il numero 1. Senza nomi si usano i numeri.</p>
  <div class="p16g-riga"><label>Iscritti <input type="number" id="p16g-iscr" min="1" max="30" value="${classe.iscritti}"></label></div>
  <textarea id="p16g-nomi" aria-label="Elenco dei nomi">${numeri().map(n => (classe.nomi && classe.nomi[n]) || "").join("\n").replace(/\n+$/, "")}</textarea>
  <div class="p16g-riga">
    <button type="button" id="p16g-salvanomi">Salva classe</button>
    <button type="button" id="p16g-esporta">Scarica copia (classe e storico)</button>
    <button type="button" id="p16g-togli-oggi">Togli dallo storico i gruppi di oggi</button>
    <button type="button" id="p16g-azzera">Azzera tutto lo storico</button>
    <label><button type="button" id="p16g-importa-btn">Carica copia o file di una lezione</button><input type="file" id="p16g-importa" accept=".json,application/json" hidden></label>
  </div>
  <p class="nota">La copia contiene i nomi: tienila sul PC o su una chiavetta, mai in una repo o online.</p>
</details>`;
    pann.querySelector("#p16g-chiudi").onclick = chiudi;
    pann.querySelector("#p16g-misura").onchange = e => { scrivi(K.misura, +e.target.value); proposta = null; disegna(); };
    pann.querySelector("#p16g-appello").onclick = e => {
      const b = e.target.closest("button[data-n]"); if (!b) return;
      const n = +b.dataset.n, s = appello.stato[n];
      if (!s) appello.stato[n] = "assente"; else if (s === "assente") appello.stato[n] = "esce"; else delete appello.stato[n];
      scrivi(K.appello, appello); proposta = null; disegna();
      const nb = pann.querySelector(`button[data-n="${n}"]`); if (nb) nb.focus();
    };
    pann.querySelector("#p16g-forma").onclick = () => {
      const pr = presenti();
      if (!pr.length) { msg("Nessun presente."); return; }
      if (dimensioni(pr.length).length > COLORI.length) { msg("Troppi gruppi per i colori disponibili."); return; }
      proposta = forma(pr, uscite(), statistiche(storico, oggiData()));
      disegna();
    };
    const conf = pann.querySelector("#p16g-conferma"); if (conf) conf.onclick = conferma;
    const agg = pann.querySelector("#p16g-agg"); if (agg) agg.onclick = () => {
      const sel = pann.querySelector("#p16g-rit"); if (!sel.value) return;
      aggiungi(+sel.value);
    };
    // azzeramenti: si chiede una conferma con un secondo clic (niente finestre del browser)
    const conSecondoClic = (id, testo, fai) => {
      const b = pann.querySelector(id); let armato = false;
      b.onclick = () => { if (!armato) { armato = true; b.textContent = "Clicca di nuovo per confermare"; setTimeout(() => { armato = false; b.textContent = testo; }, 4000); return; } fai(); };
    };
    conSecondoClic("#p16g-togli-oggi", "Togli dallo storico i gruppi di oggi", () => {
      storico.lezioni = storico.lezioni.filter(l => l.data !== oggiData()); scrivi(K.storico, storico);
      try { localStorage.removeItem(K.oggi); localStorage.removeItem(K.riep); } catch (e) {}
      proposta = null; disegna(); msg("Gruppi di oggi tolti dallo storico.");
    });
    conSecondoClic("#p16g-azzera", "Azzera tutto lo storico", () => {
      storico = { lezioni: [] }; scrivi(K.storico, storico);
      try { localStorage.removeItem(K.oggi); localStorage.removeItem(K.riep); } catch (e) {}
      proposta = null; disegna(); msg("Storico azzerato in questo browser.");
    });
    pann.querySelector("#p16g-salvanomi").onclick = () => {
      const righe = pann.querySelector("#p16g-nomi").value.split("\n").map(s => s.trim());
      let iscr = Math.max(1, Math.min(30, +pann.querySelector("#p16g-iscr").value || 30));
      const conNome = righe.filter(Boolean).length;
      if (conNome > iscr) iscr = Math.min(30, righe.length);
      const nomi = {}; righe.slice(0, iscr).forEach((s, i) => { if (s) nomi[i + 1] = s; });
      classe = { iscritti: iscr, nomi }; scrivi(K.classe, classe); proposta = null; disegna(); msg("Classe salvata.");
    };
    pann.querySelector("#p16g-esporta").onclick = () => {
      const blob = new Blob([JSON.stringify({ tipo: "p16-classe-e-storico", versione: 1, classe, storico }, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "p16-classe-e-storico-" + oggiData() + ".json";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    const inp = pann.querySelector("#p16g-importa");
    pann.querySelector("#p16g-importa-btn").onclick = () => inp.click();
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      f.text().then(t => {
        const j = JSON.parse(t);
        if (j && j.storico_gruppi) { const n = unisci(j.storico_gruppi); proposta = null; disegna(); msg("Lezioni aggiunte allo storico: " + n + "."); return; }
        if (!j || j.tipo !== "p16-classe-e-storico") throw new Error("file non riconosciuto");
        classe = j.classe; storico = j.storico; scrivi(K.classe, classe); scrivi(K.storico, storico); proposta = null; disegna(); msg("Copia caricata.");
      }).catch(e => msg("Non riesco a leggere il file: " + e.message));
    };
  }
  function msg(t) { const m = pann && pann.querySelector("#p16g-msg"); if (m) m.textContent = t; }

  function aggiungi(num) {
    // Il ritardatario entra nel gruppo più piccolo (D-79). In un gruppo da 3 i ruoli tornano quattro:
    // chi era facilitatore e custode resta facilitatore, il ritardatario fa il custode.
    // In un gruppo da 4 fa il secondo verificatore; in un gruppo da 2 il verificatore.
    delete appello.stato[num]; scrivi(K.appello, appello);
    let g = proposta.slice().sort((a, b) => a.membri.length - b.membri.length)[0];
    if (g.membri.length === 3) {
      const fc = g.membri.find(m => m.ruolo === "FC"); if (fc) fc.ruolo = "F";
      g.membri.push({ num, ruolo: "C" });
    } else g.membri.push({ num, ruolo: g.membri.length >= 4 ? "V2" : "V" });
    const ORD = { F: 0, FC: 0, C: 1, V: 2, V2: 3, S: 4 };
    g.membri.sort((a, b) => ORD[a.ruolo] - ORD[b.ruolo]);
    if (salvatoOggi()) conferma(); else disegna();
  }
  const salvatoOggi = () => storico.lezioni.some(l => l.data === oggiData());

  function conferma() {
    const data = oggiData();
    storico.lezioni = storico.lezioni.filter(l => l.data !== data);
    storico.lezioni.push({ data, gruppi: proposta.map(g => ({ id: g.id, membri: g.membri.map(m => ({ num: m.num, ruolo: m.ruolo })) })) });
    storico.lezioni.sort((a, b) => a.data < b.data ? -1 : 1);
    scrivi(K.storico, storico);
    scrivi(K.oggi, { data, gruppi: proposta.map(g => ({ id: g.id, n: g.membri.length, membri: g.membri.map(m => ({ num: m.num, nome: nome(m.num), ruolo: RUOLI[m.ruolo] })) })) });   // num: le slide rileggono il nome aggiornato
    scrivi(K.riep, {
      data, presenti: presenti().length, escono_prima: uscite().length,
      gruppi: proposta.map(g => ({ id: g.id, n: g.membri.length, ruoli: g.membri.map(m => m.ruolo) })),
    });
    try { sessionStorage.setItem("p16-vai", window.P16_DOPO_GRUPPI || "gruppi"); } catch (e) {}   // le slide possono scegliere dove ripartire
    location.reload();                              // le slide rileggono i gruppi del giorno
  }

  // ------------------------------------------------------------ avvio
  document.addEventListener("keydown", e => {
    if (pann) return;
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (document.querySelector(".p16b-pann")) return;
    if (e.key === "g" || e.key === "G") { e.preventDefault(); apri(); }
  });
  window.addEventListener("load", () => {
    let vai = null; try { vai = sessionStorage.getItem("p16-vai"); sessionStorage.removeItem("p16-vai"); } catch (e) {}
    if (vai && window.Motore) {
      const n = [...document.querySelectorAll("section.slide")].findIndex(s => s.dataset.id === vai);
      if (n >= 0) setTimeout(() => Motore.vai(n), 50);
    }
  });

  window.Gruppi = { apri, chiudi, nome: num => nome(num), dimensioni, descrivi, colori: COLORI, nomiRuoli: RUOLI, _forma: forma, _statistiche: statistiche };
})();
