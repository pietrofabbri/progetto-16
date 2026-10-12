/*!
 * Progetto 16. "Il barattolo": segnalatore del rumore per le slide HTML.
 *
 * Metafora: il barattolo della calma. Il rumore dell'aula agita i brillantini;
 * il silenzio li fa posare. Se il rumore resta sopra la soglia, lo schermo si
 * ferma e il barattolo riempie tutta la proiezione: la lezione riparte solo
 * quando la classe, insieme, lascia posare i brillantini.
 *
 * Nessun audio viene registrato, salvato o trasmesso: si usa solo il livello
 * istantaneo (un numero) calcolato in memoria. Funziona offline.
 *
 * Uso nelle slide:
 *   <script src="../semaforo/barattolo.js"></script>
 *   <script> Barattolo.monta(); Barattolo.modalita('discussione'); </script>
 *   Ogni slide può dichiarare data-rumore="silenzio|discussione|spento";
 *   il template chiama Barattolo.modalita(...) a ogni cambio slide.
 *
 * Tasti: B attiva/spegne · T apre la taratura · U (o Esc) sblocca subito.
 * URL ?simula : livello simulato con un cursore (per provare senza microfono).
 */
(function () {
  "use strict";

  // ------------------------------------------------------------ palette
  const COL = {
    notte: "#0D1322", inchiostro: "#1B2130", grigio: "#5B6475", carta: "#F5F6F8",
    calma: "#2FA36B", attenzione: "#E3A008", blocco: "#D9482B",
    gruppi: ["#C8372D", "#DB6A1C", "#E2B007", "#3A8A3E", "#0E7C7B",
             "#2C8BC9", "#2E4A9B", "#6B3FA0", "#C2387F"],
  };
  const CHIAVE = "p16-barattolo-v1";

  // ------------------------------------------------------------ impostazioni
  // Le soglie sono in dB SOPRA il livello di silenzio misurato (base).
  const PREDEFINITE = {
    base: -60,              // dBFS, misurato in taratura
    discussione: -45,       // dBFS, misurato in taratura (facoltativo)
    soglie: {
      silenzio:    { giallo: 5,  blocco: 9 },
      discussione: { giallo: 18, blocco: 22 },
    },
    quiete: 4,              // sotto questa soglia (dB sopra base) i brillantini si posano
    tenuta: 3,              // s sopra la soglia di blocco prima di bloccare
    perSbloccare: 5,        // s di quiete continua per sbloccare
    pausa: 60,              // s minimi tra due blocchi
    suono: true,
    volume: 0.5,
  };

  function carica() {
    try {
      const s = JSON.parse(localStorage.getItem(CHIAVE) || "null");
      if (s && s.soglie) return Object.assign(structuredClone(PREDEFINITE), s);
    } catch (e) { /* storage non disponibile */ }
    return structuredClone(PREDEFINITE);
  }
  function salva() {
    try { localStorage.setItem(CHIAVE, JSON.stringify(cfg)); } catch (e) {}
  }

  let cfg = carica();

  // ------------------------------------------------------------ stato
  const S = {
    attivo: false, modo: "discussione", bloccato: false,
    livello: -90,          // dBFS smussato
    istantaneo: -90,
    sopra: 0,              // s accumulati sopra la soglia di blocco
    progresso: 0,          // 0..1 durante il blocco
    ultimoBlocco: -1e9,
    ignoraFino: 0,
    simula: /[?&]simula\b/.test(location.search),
    simLivello: -58,
    blocchi: 0,
  };
  let actx = null, analyser = null, buf = null, stream = null;

  // ------------------------------------------------------------ audio in
  async function avviaMicrofono() {
    if (S.simula) return true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      avviso("Microfono non disponibile: " + (e && e.name === "NotAllowedError"
        ? "permesso negato. Consenti il microfono per questa pagina e premi B."
        : "nessun ingresso audio trovato."));
      return false;
    }
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    await actx.resume();
    const src = actx.createMediaStreamSource(stream);
    analyser = actx.createAnalyser();
    analyser.fftSize = 2048;
    buf = new Float32Array(analyser.fftSize);
    src.connect(analyser);
    return true;
  }
  function fermaMicrofono() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null; analyser = null;
  }
  function leggiLivello() {
    if (S.simula) return S.simLivello + (Math.random() - 0.5) * 1.5;
    if (!analyser) return -90;
    analyser.getFloatTimeDomainData(buf);
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    const rms = Math.sqrt(s / buf.length);
    return Math.max(-90, 20 * Math.log10(rms + 1e-9));
  }

  // ------------------------------------------------------------ audio out
  function suona(tipo) {
    if (!cfg.suono) return;
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime;
    const out = actx.createGain();
    out.gain.value = 0.22 * cfg.volume;
    out.connect(actx.destination);
    // campana tibetana sintetica: parziali inarmoniche con decadimento lento
    const base = tipo === "blocco" ? 196 : 392;
    const parziali = tipo === "blocco" ? [[1, 1, 5], [2.76, .45, 3.2], [5.4, .2, 1.8]]
                                       : [[1, .8, 1.6], [2.0, .3, 1.0]];
    parziali.forEach(([r, a, dec]) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = "sine"; o.frequency.value = base * r;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(a, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dec);
      o.connect(g).connect(out); o.start(t0); o.stop(t0 + dec + 0.1);
    });
    // il microfono sentirebbe la campana: la ignoro mentre suona
    S.ignoraFino = performance.now() + (tipo === "blocco" ? 3500 : 1500);
  }

  // ------------------------------------------------------------ soglie
  const sogliaDb = (nome) => cfg.base + cfg.soglie[S.modo === "silenzio" ? "silenzio" : "discussione"][nome];
  const quieteDb = () => cfg.base + cfg.quiete;

  // ------------------------------------------------------------ particelle
  function Sciame(n, rMin, rMax) {
    const p = [];
    for (let i = 0; i < n; i++) {
      p.push({ x: Math.random(), y: 0.7 + Math.random() * 0.3, vx: 0, vy: 0,
               r: rMin + Math.random() * (rMax - rMin), a: Math.random() * 6.28,
               va: (Math.random() - .5) * 4, c: COL.gruppi[i % COL.gruppi.length],
               k: Math.random() * 100 });
    }
    return p;
  }
  // agit: 0 = calma, 1 = soglia di blocco
  function muovi(sciame, W, H, dt, agit, t, forza) {
    const A = Math.pow(Math.max(0, agit), 1.4) * forza;
    const g = 0.35 + 0.65 * (1 - Math.min(1, agit));   // gravità più forte nella calma
    for (const q of sciame) {
      let ax = Math.sin(q.y * 9 + t * 1.3 + q.k) * A + (Math.random() - .5) * A * 0.9;
      let ay = Math.cos(q.x * 7 - t * 1.1 + q.k * .5) * A - A * 0.55 + (Math.random() - .5) * A * 0.9;
      ay += g * 0.9;
      q.vx = (q.vx + ax * dt) * Math.exp(-2.2 * dt);
      q.vy = (q.vy + ay * dt) * Math.exp(-2.2 * dt);
      q.x += q.vx * dt * (H / W); q.y += q.vy * dt;
      q.a += q.va * dt * (0.3 + agit);
      const mx = q.r / W, my = q.r / H;
      if (q.x < mx) { q.x = mx; q.vx = Math.abs(q.vx) * .4; }
      if (q.x > 1 - mx) { q.x = 1 - mx; q.vx = -Math.abs(q.vx) * .4; }
      if (q.y < my) { q.y = my; q.vy = Math.abs(q.vy) * .4; }
      if (q.y > 1 - my) { q.y = 1 - my; q.vy = -Math.abs(q.vy) * .15; q.vx *= .8; }
    }
  }
  function disegnaSciame(ctx, sciame, x0, y0, W, H) {
    for (const q of sciame) {
      const luce = 0.55 + 0.45 * Math.abs(Math.sin(q.a));
      ctx.save();
      ctx.translate(x0 + q.x * W, y0 + q.y * H);
      ctx.rotate(q.a);
      ctx.globalAlpha = luce;
      ctx.fillStyle = q.c;
      ctx.fillRect(-q.r, -q.r * 0.55, q.r * 2, q.r * 1.1);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function scuoti(sciame, forza) {
    for (const q of sciame) { q.vx += (Math.random() - .5) * forza; q.vy -= Math.random() * forza; }
  }

  // ------------------------------------------------------------ DOM
  let lato, latoCanvas, latoCtx, etichetta, velo, veloCanvas, veloCtx, veloBarra, pannello, toast;
  const sciameLato = Sciame(110, 1.6, 2.8);
  let sciameVelo = null;

  const CSS = `
.p16b-lato{position:fixed;right:14px;top:50%;transform:translateY(-50%);z-index:9000;
  display:flex;flex-direction:column;align-items:center;gap:6px;font-family:var(--p16-font,system-ui,sans-serif);
  user-select:none;cursor:pointer}
.p16b-lato canvas{display:block}
.p16b-et{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#5B6475;white-space:nowrap}
.p16b-velo{position:fixed;inset:0;z-index:9500;background:#0D1322;opacity:0;pointer-events:none;
  transition:opacity .6s ease;font-family:var(--p16-font,system-ui,sans-serif);color:#F5F6F8}
.p16b-velo.on{opacity:1;pointer-events:auto}
.p16b-velo canvas{position:absolute;inset:0;width:100%;height:100%}
.p16b-testo{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;gap:2.2vh;padding:0 6vw;pointer-events:none}
.p16b-azioni{display:flex;flex-wrap:wrap;justify-content:center;gap:1.2vh 4vw;font-size:clamp(28px,4.4vw,72px);
  font-weight:700;line-height:1.1;text-shadow:0 2px 24px rgba(13,19,34,.9)}
.p16b-azioni span{opacity:0;transform:translateY(12px);transition:opacity .8s ease,transform .8s ease}
.p16b-velo.on .p16b-azioni span{opacity:1;transform:none}
.p16b-velo.on .p16b-azioni span:nth-child(2){transition-delay:.9s}
.p16b-velo.on .p16b-azioni span:nth-child(3){transition-delay:1.8s}
.p16b-sotto{font-size:clamp(16px,1.7vw,28px);color:#C9CFDA;max-width:40em;text-shadow:0 1px 12px rgba(13,19,34,.9)}
.p16b-barra{position:absolute;left:0;bottom:0;height:6px;width:0;background:#2FA36B;transition:width .2s linear}
.p16b-pann{position:fixed;inset:0;z-index:9800;background:rgba(13,19,34,.55);display:flex;align-items:center;
  justify-content:center;font-family:var(--p16-font,system-ui,sans-serif);padding:16px}
.p16b-box{background:#fff;color:#1B2130;border-radius:10px;width:min(720px,100%);max-height:92vh;overflow:auto;
  padding:22px 26px;box-shadow:0 20px 60px rgba(0,0,0,.35);font-size:15px;line-height:1.4}
.p16b-box h2{margin:0 0 4px;font-size:22px}
.p16b-box .sub{color:#5B6475;margin:0 0 16px}
.p16b-metro{position:relative;height:30px;border-radius:6px;background:#EEF0F4;overflow:hidden;margin:6px 0 2px}
.p16b-metro .liv{position:absolute;left:0;top:0;bottom:0;background:#2FA36B;transition:width .08s linear}
.p16b-metro .seg{position:absolute;top:0;bottom:0;width:2px}
.p16b-scala{display:flex;justify-content:space-between;font-size:11px;color:#5B6475;font-variant-numeric:tabular-nums}
.p16b-passi{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}
.p16b-box button{font:inherit;border-radius:7px;border:1.5px solid #1B2130;background:#fff;color:#1B2130;
  padding:9px 12px;cursor:pointer;text-align:left}
.p16b-box button.pri{background:#1B2130;color:#fff}
.p16b-box button:focus-visible,.p16b-box input:focus-visible{outline:3px solid #2C8BC9;outline-offset:2px}
.p16b-box button[disabled]{opacity:.5;cursor:wait}
.p16b-box fieldset{border:1px solid #D5DAE2;border-radius:8px;margin:10px 0;padding:8px 14px 12px}
.p16b-box legend{font-weight:700;padding:0 6px}
.p16b-riga{display:grid;grid-template-columns:150px 1fr 70px;gap:10px;align-items:center;margin:6px 0}
.p16b-riga output{font-variant-numeric:tabular-nums;text-align:right}
.p16b-pie{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;margin-top:16px}
.p16b-pie div{display:flex;gap:10px;flex-wrap:wrap}
.p16b-nota{font-size:13px;color:#5B6475}
.p16b-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9900;background:#1B2130;color:#fff;
  padding:10px 16px;border-radius:8px;font-family:var(--p16-font,system-ui,sans-serif);font-size:15px;
  max-width:90vw;box-shadow:0 8px 30px rgba(0,0,0,.3)}
.p16b-sim{position:fixed;left:14px;bottom:14px;z-index:9990;background:#fff;border:1px solid #D5DAE2;border-radius:8px;
  padding:8px 12px;font:13px system-ui,sans-serif;color:#1B2130;display:flex;gap:8px;align-items:center}
@media (max-width:600px){.p16b-riga{grid-template-columns:1fr;}.p16b-passi{grid-template-columns:1fr}}
`;

  function monta(opz) {
    opz = opz || {};
    if (lato) return;
    const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

    lato = document.createElement("div");
    lato.className = "p16b-lato";
    lato.title = "Barattolo del rumore: B attiva o spegne, T taratura";
    latoCanvas = document.createElement("canvas");
    etichetta = document.createElement("div"); etichetta.className = "p16b-et";
    lato.append(latoCanvas, etichetta);
    lato.addEventListener("click", () => S.attivo ? apriTaratura() : attiva());
    document.body.appendChild(lato);
    latoCtx = latoCanvas.getContext("2d");

    velo = document.createElement("div");
    velo.className = "p16b-velo";
    velo.setAttribute("role", "alertdialog");
    velo.setAttribute("aria-label", "Pausa per il silenzio");
    veloCanvas = document.createElement("canvas");
    const testo = document.createElement("div"); testo.className = "p16b-testo";
    testo.innerHTML = `<div class="p16b-azioni"><span>Smetti di parlare.</span><span>Appoggia quello che hai in mano.</span><span>Fai un respiro.</span></div>
      <div class="p16b-sotto">La lezione riparte quando i brillantini si sono posati.</div>`;
    veloBarra = document.createElement("div"); veloBarra.className = "p16b-barra";
    velo.append(veloCanvas, testo, veloBarra);
    document.body.appendChild(velo);
    veloCtx = veloCanvas.getContext("2d");

    if (S.simula) montaSimulatore();
    document.addEventListener("keydown", tasti);
    window.addEventListener("resize", dimensiona);
    dimensiona();
    if (opz.modalita) S.modo = opz.modalita;
    requestAnimationFrame(ciclo);
  }

  function dimensiona() {
    const dpr = window.devicePixelRatio || 1;
    const h = Math.round(Math.min(window.innerHeight * 0.62, 520)), w = 64;
    latoCanvas.style.width = w + "px"; latoCanvas.style.height = h + "px";
    latoCanvas.width = w * dpr; latoCanvas.height = h * dpr;
    latoCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    veloCanvas.width = window.innerWidth * dpr; veloCanvas.height = window.innerHeight * dpr;
    veloCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function tasti(e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === "b") { S.attivo ? spegni() : attiva(); }
    else if (k === "t") { apriTaratura(); }
    else if ((k === "u" || k === "escape") && S.bloccato) { sblocca(true); }
    else return;
    e.preventDefault();
  }

  async function attiva() {
    if (S.attivo) return;
    const ok = await avviaMicrofono();
    if (!ok) return;
    S.attivo = true; S.sopra = 0;
    apriTaratura();
  }
  function spegni() {
    S.attivo = false; if (S.bloccato) sblocca(true);
    fermaMicrofono();
    avviso("Barattolo spento. Premi B per riattivarlo.");
  }

  // ------------------------------------------------------------ blocco
  function blocca() {
    S.bloccato = true; S.progresso = 0; S.blocchi++;
    sciameVelo = sciameVelo || Sciame(Math.round(Math.min(380, window.innerWidth * window.innerHeight / 5200)), 3, 7);
    for (const q of sciameVelo) { q.x = Math.random(); q.y = 0.6 + Math.random() * 0.4; }
    scuoti(sciameVelo, 3.5);
    velo.classList.add("on");
    suona("blocco");
    document.dispatchEvent(new CustomEvent("barattolo:blocco", { detail: { numero: S.blocchi } }));
  }
  function sblocca(manuale) {
    S.bloccato = false; S.sopra = 0; S.ultimoBlocco = performance.now();
    velo.classList.remove("on");
    veloBarra.style.width = "0";
    if (!manuale) suona("sblocco");
    document.dispatchEvent(new CustomEvent("barattolo:sblocco", { detail: { manuale: !!manuale } }));
  }

  // ------------------------------------------------------------ ciclo
  let tPrec = performance.now();
  function ciclo(now) {
    const dt = Math.min(0.1, (now - tPrec) / 1000); tPrec = now;
    const t = now / 1000;

    if (S.attivo && now > S.ignoraFino) {
      S.istantaneo = leggiLivello();
      const tau = 1.0; const a = 1 - Math.exp(-dt / tau);
      S.livello += (S.istantaneo - S.livello) * a;
    }

    const acceso = S.attivo && S.modo !== "spento";
    if (acceso && !S.bloccato) {
      const pausaOk = (now - S.ultimoBlocco) / 1000 > cfg.pausa;
      if (S.livello > sogliaDb("blocco") && pausaOk) S.sopra += dt;
      else S.sopra = Math.max(0, S.sopra - dt * 2);
      if (S.sopra >= cfg.tenuta) blocca();
    }
    if (S.bloccato) {
      if (now > S.ignoraFino) {
        if (S.livello < quieteDb()) S.progresso += dt / cfg.perSbloccare;
        else if (S.livello > quieteDb() + 3) S.progresso -= dt / cfg.perSbloccare * 1.5;
        S.progresso = Math.max(0, Math.min(1, S.progresso));
      }
      veloBarra.style.width = (S.progresso * 100).toFixed(1) + "%";
      if (S.progresso >= 1) sblocca(false);
    }

    disegnaLato(dt, t, acceso);
    if (S.bloccato || velo.classList.contains("on")) disegnaVelo(dt, t);
    if (pannello) aggiornaMetro();
    requestAnimationFrame(ciclo);
  }

  function agitazione() {
    const b = cfg.base, bl = sogliaDb("blocco");
    return Math.max(0, Math.min(1.25, (S.livello - b) / Math.max(3, bl - b)));
  }

  function colStato() {
    if (!S.attivo || S.modo === "spento") return "#9AA3B2";
    if (S.livello >= sogliaDb("blocco")) return COL.blocco;
    if (S.livello >= sogliaDb("giallo")) return COL.attenzione;
    return COL.calma;
  }

  function disegnaLato(dt, t, acceso) {
    const W = 64, H = latoCanvas.height / (window.devicePixelRatio || 1);
    const ctx = latoCtx; ctx.clearRect(0, 0, W, H);
    const pad = 6, top = 14, jx = pad, jy = top, jw = W - pad * 2, jh = H - top - pad;
    const col = colStato();
    const agit = acceso ? agitazione() : 0;
    muovi(sciameLato, jw, jh, dt, agit, t, 7);

    // bagliore
    const gl = ctx.createLinearGradient(0, jy, 0, jy + jh);
    gl.addColorStop(0, hexA(col, 0.06)); gl.addColorStop(1, hexA(col, acceso ? 0.28 : 0.10));
    tracciaVaso(ctx, jx, jy, jw, jh);
    ctx.fillStyle = gl; ctx.fill();
    ctx.save(); tracciaVaso(ctx, jx, jy, jw, jh); ctx.clip();
    disegnaSciame(ctx, sciameLato, jx, jy, jw, jh);
    // livello come "marea" sottile
    if (acceso) {
      const lv = Math.min(1, agit);
      ctx.fillStyle = hexA(col, 0.12);
      ctx.fillRect(jx, jy + jh * (1 - lv), jw, jh * lv);
    }
    ctx.restore();
    // vetro
    tracciaVaso(ctx, jx, jy, jw, jh);
    ctx.lineWidth = 2.2; ctx.strokeStyle = acceso ? col : "#B9C0CC"; ctx.stroke();
    // coperchio
    ctx.fillStyle = acceso ? col : "#B9C0CC";
    roundRect(ctx, jx + jw * 0.12, 2, jw * 0.76, 9, 3); ctx.fill();
    // riflesso
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(jx + 8, jy + 18); ctx.lineTo(jx + 8, jy + jh * 0.45); ctx.stroke();

    etichetta.textContent = !S.attivo ? "clic per attivare"
      : S.modo === "spento" ? "in pausa" : S.modo;
    etichetta.style.color = acceso ? col : "#5B6475";
  }

  function disegnaVelo(dt, t) {
    const W = window.innerWidth, H = window.innerHeight, ctx = veloCtx;
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.75);
    g.addColorStop(0, "#1A2440"); g.addColorStop(1, COL.notte);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // respiro: alone che si espande e si contrae (4 s + 4 s)
    const r = Math.min(W, H) * (0.22 + 0.06 * Math.sin(t * Math.PI / 4));
    const hb = ctx.createRadialGradient(W / 2, H * 0.47, r * 0.2, W / 2, H * 0.47, r);
    hb.addColorStop(0, "rgba(47,163,107,0.16)"); hb.addColorStop(1, "rgba(47,163,107,0)");
    ctx.fillStyle = hb; ctx.beginPath(); ctx.arc(W / 2, H * 0.47, r, 0, 6.283); ctx.fill();

    const rumore = Math.max(0, (S.livello - quieteDb()) / Math.max(3, sogliaDb("blocco") - quieteDb()));
    const agit = Math.max(Math.pow(1 - S.progresso, 1.2) * 0.9, Math.min(1.3, rumore));
    muovi(sciameVelo, W, H, dt, agit, t, 5);
    disegnaSciame(ctx, sciameVelo, 0, 0, W, H);
  }

  // ------------------------------------------------------------ taratura
  function apriTaratura() {
    if (pannello) return;
    pannello = document.createElement("div");
    pannello.className = "p16b-pann";
    const r = (id, nome, min, max, passo, val, unita) => `
      <div class="p16b-riga"><label for="p16b-${id}">${nome}</label>
      <input type="range" id="p16b-${id}" min="${min}" max="${max}" step="${passo}" value="${val}">
      <output id="p16b-${id}-o"></output></div>`;
    pannello.innerHTML = `<div class="p16b-box" role="dialog" aria-label="Taratura del barattolo">
      <h2>Taratura del barattolo</h2>
      <p class="sub">Da fare all'inizio di ogni lezione, nell'aula vera. Le soglie sono in decibel sopra il silenzio misurato.</p>
      <div class="p16b-metro" id="p16b-metro"><div class="liv"></div></div>
      <div class="p16b-scala"><span>silenzio</span><span id="p16b-letto"></span><span>forte</span></div>
      <div class="p16b-passi">
        <button id="p16b-m1" class="pri">1 · Misura il silenzio (5 s)<br><small>Classe ferma e zitta</small></button>
        <button id="p16b-m2">2 · Misura una discussione normale (5 s)<br><small>Gruppi che lavorano a voce normale</small></button>
      </div>
      <fieldset><legend>Lavoro individuale (modalità silenzio)</legend>
        ${r("sg", "Giallo da", 1, 30, 1, cfg.soglie.silenzio.giallo)}
        ${r("sb", "Blocco da", 2, 35, 1, cfg.soglie.silenzio.blocco)}
      </fieldset>
      <fieldset><legend>Lavoro a gruppi (modalità discussione)</legend>
        ${r("dg", "Giallo da", 1, 40, 1, cfg.soglie.discussione.giallo)}
        ${r("db", "Blocco da", 2, 45, 1, cfg.soglie.discussione.blocco)}
      </fieldset>
      <fieldset><legend>Sblocco e tempi</legend>
        ${r("q", "Quiete sotto", 1, 20, 1, cfg.quiete)}
        ${r("te", "Tenuta prima del blocco", 1, 10, 0.5, cfg.tenuta)}
        ${r("ps", "Quiete per sbloccare", 2, 15, 0.5, cfg.perSbloccare)}
        ${r("pa", "Pausa tra due blocchi", 10, 300, 10, cfg.pausa)}
        ${r("vo", "Volume campana", 0, 1, 0.05, cfg.volume)}
        <div class="p16b-riga"><label for="p16b-su">Campana</label>
          <label><input type="checkbox" id="p16b-su" ${cfg.suono ? "checked" : ""}> suona al blocco e allo sblocco</label><span></span></div>
      </fieldset>
      <p class="p16b-nota">Nella barra: il tratto <b style="color:#E3A008">giallo</b> e quello <b style="color:#D9482B">rosso</b> sono le soglie della modalità attuale (<span id="p16b-modo"></span>), quello <b style="color:#2FA36B">verde</b> è la quiete per sbloccare. Durante le spiegazioni metti la slide in modalità <i>spento</i>: la tua voce vicino al microfono farebbe scattare il blocco.</p>
      <div class="p16b-pie"><div><button id="p16b-prova">Prova il blocco</button><button id="p16b-reset">Valori iniziali</button></div>
        <div><button id="p16b-chiudi" class="pri">Salva e chiudi</button></div></div>
    </div>`;
    document.body.appendChild(pannello);
    const $ = (id) => pannello.querySelector("#p16b-" + id);
    const lega = (id, set, fmt) => {
      const el = $(id), o = $(id + "-o");
      const upd = () => { set(parseFloat(el.value)); o.textContent = fmt(parseFloat(el.value)); };
      el.addEventListener("input", upd); upd();
    };
    const db = v => "+" + v + " dB", sec = v => v + " s";
    lega("sg", v => cfg.soglie.silenzio.giallo = v, db);
    lega("sb", v => cfg.soglie.silenzio.blocco = v, db);
    lega("dg", v => cfg.soglie.discussione.giallo = v, db);
    lega("db", v => cfg.soglie.discussione.blocco = v, db);
    lega("q", v => cfg.quiete = v, db);
    lega("te", v => cfg.tenuta = v, sec);
    lega("ps", v => cfg.perSbloccare = v, sec);
    lega("pa", v => cfg.pausa = v, sec);
    lega("vo", v => cfg.volume = v, v => Math.round(v * 100) + "%");
    $("su").addEventListener("change", e => cfg.suono = e.target.checked);
    $("m1").addEventListener("click", () => misura("base"));
    $("m2").addEventListener("click", () => misura("discussione"));
    $("prova").addEventListener("click", () => { chiudiTaratura(); S.ultimoBlocco = -1e9; blocca(); });
    $("reset").addEventListener("click", () => { cfg = structuredClone(PREDEFINITE); chiudiTaratura(); apriTaratura(); });
    $("chiudi").addEventListener("click", chiudiTaratura);
    pannello.addEventListener("keydown", e => { if (e.key === "Escape") chiudiTaratura(); });
    $("chiudi").focus();
  }
  function chiudiTaratura() {
    if (!pannello) return;
    // coerenza minima: blocco almeno 2 dB sopra il giallo
    for (const m of ["silenzio", "discussione"]) {
      const s = cfg.soglie[m]; if (s.blocco < s.giallo + 2) s.blocco = s.giallo + 2;
    }
    salva(); pannello.remove(); pannello = null; S.sopra = 0;
  }

  function misura(cosa) {
    if (!S.attivo) { avviso("Prima attiva il barattolo (tasto B)."); return; }
    const btn = pannello.querySelector(cosa === "base" ? "#p16b-m1" : "#p16b-m2");
    const orig = btn.innerHTML; const campioni = [];
    pannello.querySelectorAll("button").forEach(b => b.disabled = true);
    const t0 = performance.now();
    const passo = () => {
      const el = (performance.now() - t0) / 1000;
      campioni.push(S.istantaneo);
      btn.innerHTML = `Misuro… ${Math.max(0, 5 - el).toFixed(1)} s`;
      if (el < 5) return requestAnimationFrame(passo);
      campioni.sort((a, b) => a - b);
      // silenzio: mediana bassa (ignora colpi isolati); discussione: mediana
      const val = cosa === "base" ? campioni[Math.floor(campioni.length * 0.4)]
                                  : campioni[Math.floor(campioni.length * 0.5)];
      if (cosa === "base") { cfg.base = val; }
      else { cfg.discussione = val; }
      ricalcola();
      pannello.querySelectorAll("button").forEach(b => b.disabled = false);
      btn.innerHTML = orig;
      // riapro per aggiornare i cursori
      const p = pannello; pannello = null; p.remove(); apriTaratura();
      avviso(cosa === "base" ? "Silenzio misurato." : "Discussione misurata: soglie ricalcolate.");
    };
    requestAnimationFrame(passo);
  }
  function ricalcola() {
    const D = Math.max(6, (cfg.discussione ?? cfg.base + 15) - cfg.base); // dB tra silenzio e discussione
    const r = Math.round;
    cfg.soglie.silenzio = { giallo: Math.max(2, r(D * 0.35)), blocco: Math.max(4, r(D * 0.6)) };
    cfg.soglie.discussione = { giallo: r(D + 2), blocco: r(D + 6) };
    cfg.quiete = Math.max(2, r(D * 0.25));
  }

  function aggiornaMetro() {
    const m = pannello.querySelector("#p16b-metro"); if (!m) return;
    const min = cfg.base - 6, max = cfg.base + 50;
    const pct = v => Math.max(0, Math.min(100, (v - min) / (max - min) * 100));
    const liv = m.querySelector(".liv");
    liv.style.width = pct(S.istantaneo) + "%";
    liv.style.background = colStato();
    let segni = m.querySelectorAll(".seg");
    if (!segni.length) {
      ["#E3A008", "#D9482B", "#2FA36B"].forEach(c => { const s = document.createElement("div"); s.className = "seg"; s.style.background = c; m.appendChild(s); });
      segni = m.querySelectorAll(".seg");
    }
    const modo = S.modo === "silenzio" ? "silenzio" : "discussione";
    segni[0].style.left = pct(cfg.base + cfg.soglie[modo].giallo) + "%";
    segni[1].style.left = pct(cfg.base + cfg.soglie[modo].blocco) + "%";
    segni[2].style.left = pct(cfg.base + cfg.quiete) + "%";
    pannello.querySelector("#p16b-letto").textContent =
      S.attivo ? "+" + Math.max(0, S.istantaneo - cfg.base).toFixed(0) + " dB" : "barattolo spento";
    pannello.querySelector("#p16b-modo").textContent = S.modo === "spento" ? "spento (soglie di discussione)" : S.modo;
  }

  // ------------------------------------------------------------ utilità
  function avviso(msg) {
    if (toast) toast.remove();
    toast = document.createElement("div"); toast.className = "p16b-toast"; toast.textContent = msg;
    document.body.appendChild(toast);
    const t = toast; setTimeout(() => t.remove(), 4000);
  }
  function montaSimulatore() {
    const d = document.createElement("div"); d.className = "p16b-sim";
    d.innerHTML = `<label for="p16b-simr">Rumore simulato</label><input id="p16b-simr" type="range" min="-66" max="-20" value="${S.simLivello}">`;
    d.querySelector("input").addEventListener("input", e => S.simLivello = +e.target.value);
    document.body.appendChild(d);
  }
  function tracciaVaso(ctx, x, y, w, h) { roundRect(ctx, x, y, w, h, Math.min(16, w / 3)); }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ------------------------------------------------------------ API
  window.Barattolo = {
    monta,
    modalita(m) { if (["silenzio", "discussione", "spento"].includes(m)) { S.modo = m; S.sopra = 0; } return S.modo; },
    attiva, spegni, apriTaratura, blocca: () => { S.ultimoBlocco = -1e9; blocca(); }, sblocca: () => sblocca(true),
    stato: () => ({ attivo: S.attivo, modo: S.modo, bloccato: S.bloccato, livelloSopraBase: +(S.livello - cfg.base).toFixed(1), blocchi: S.blocchi }),
    impostazioni: () => structuredClone(cfg),
  };
})();
