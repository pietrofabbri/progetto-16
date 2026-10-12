# Progetto 16. Quanto sono veramente tue le scelte che fai?

Materiali per mettere in pratica il **Progetto 16 "Psicologia e dati"**: 13 incontri da 90 minuti (75 netti) più un incontro bonus (l'8) per classi 4ª e 5ª di istituto tecnico, IIS Copernico-Carpeggiani, Ferrara. Il docente referente è Pietro Fabbri (A041).

Tutto funziona **offline** su un PC d'aula con proiettore. Nessuno strumento registra, salva o trasmette audio o dati degli studenti.

## Contenuto

| Cartella | Che cosa c'è | Stato |
|---|---|---|
| `docs/` | `decisioni.md`: registro delle decisioni (data, motivo, effetto). `progetto16-scelte.md`: quadro completo (specifica, decisioni, ipotesi di ricerca, criticità, domande aperte), leggibile senza altro contesto. `specifica-originale.md`: testo del progetto come ricevuto. | aggiornato |
| `design/` | Palette comune (`palette.json` è la fonte unica, `palette.css` la versione per il web) e font Atkinson Hyperlegible (licenza SIL OFL). | v1 |
| `semaforo/` | **Il barattolo**: segnalatore del rumore da inserire nelle slide HTML (`barattolo.js`) e pagina di prova (`demo.html`). | v1 |
| `kit/` | Kit di stampa: generatore `genera_kit.py` e un PDF per ogni oggetto in `kit/pdf/`. | v3 |
| `slides/` | Template delle slide HTML (da fare). | da fare |

## Il barattolo del rumore

Al posto di un semaforo c'è un **barattolo della calma**: un barattolo di vetro, stretto, sul bordo destro della slide, pieno di brillantini nei nove colori dei gruppi.

- Il rumore dell'aula agita i brillantini; il vetro è **verde** quando il livello va bene e **giallo** quando sale.
- Se il rumore resta oltre la soglia di blocco per qualche secondo (iniziale: 3 s), **lo schermo si ferma**: il barattolo riempie la proiezione, suona una campana e compaiono le tre azioni (*smetti di parlare · appoggia quello che hai in mano · fai un respiro*).
- La lezione riparte **solo quando la classe, insieme, lascia posare i brillantini**: serve qualche secondo di quiete continua (iniziale: 5 s). Se il rumore riprende, i brillantini si rialzano e l'avanzamento torna indietro. Una barra in basso mostra quanto manca.
- Dopo un blocco c'è una pausa minima (iniziale: 60 s) prima che possa scattarne un altro.

### Modalità per slide
Ogni slide dichiara `data-rumore="silenzio"`, `"discussione"` o `"spento"`:
- **silenzio**: lavoro individuale e rituali, soglie basse;
- **discussione**: lavoro nelle isole, soglie alte (il rumore di molti gruppi che discutono è voluto);
- **spento**: spiegazioni del docente e plenaria. Serve davvero: la voce del docente vicino al microfono farebbe scattare il blocco.

### Taratura (a ogni lezione)
Premi **B** per attivare il barattolo: il browser chiede il permesso del microfono e si apre il pannello di taratura.
1. **Misura il silenzio** (5 s, classe ferma e zitta).
2. **Misura una discussione normale** (5 s, gruppi che parlano a voce normale). Le soglie si ricalcolano da queste due misure.
3. Se serve, aggiusta a mano le soglie con i cursori: sono in decibel *sopra il silenzio misurato*. La barra in alto mostra il livello in tempo reale con i segni delle soglie.
4. **Salva e chiudi.** I valori restano memorizzati nel browser e si ripropongono alla lezione successiva, ma la taratura va rifatta ogni volta perché aula, finestre e numero di studenti cambiano.

Tasti: **B** attiva o spegne · **T** riapre la taratura · **U** (o Esc) sblocca subito.
Per provare senza microfono: apri `semaforo/demo.html?simula` e muovi il cursore "Rumore simulato".

### Come aprirlo in aula
Apri `semaforo/demo.html` (o una slide) con Chrome o Edge. Se il browser non concede il microfono a un file locale, apri un terminale nella cartella del progetto e lancia:

```
python3 -m http.server 8016
```

poi vai su `http://localhost:8016/semaforo/demo.html`. Provare sul PC dell'aula prima del primo incontro.

Consigli: se possibile usa un microfono USB in posizione centrale (il microfono del portatile in cattedra sente di più le isole vicine). La campana viene ignorata dal microfono mentre suona.

### Uso nelle slide
```html
<link rel="stylesheet" href="../design/palette.css">
<script src="../semaforo/barattolo.js"></script>
<script>
  Barattolo.monta({ modalita: "discussione" });
  // a ogni cambio slide:
  Barattolo.modalita(slide.dataset.rumore);
</script>
```
Eventi: `barattolo:blocco` e `barattolo:sblocco` su `document` (il template li userà per mettere in pausa il timer). `Barattolo.stato()` restituisce anche il numero di blocchi della lezione, utile per il registro post-lezione.

## Kit di stampa

```
pip install weasyprint
python3 kit/genera_kit.py              # sigle casuali nuove
python3 kit/genera_kit.py --seed 16    # sigle riproducibili
```
Produce un PDF per ogni oggetto in `kit/pdf/`, senza numeri di pagina:

| File | Contenuto |
|---|---|
| `istruzioni-e-gruppi.pdf` | Che cosa stampare, quante copie, legenda dei 9 gruppi |
| `tessere-ruolo.pdf` | 9 set di tessere ruolo, uno per gruppo (colore e simbolo), 100×70 mm per porta-badge A7 |
| `scheda-gruppo.pdf` | Scheda del gruppo A4 |
| `scheda-breve.pdf` | Scheda del gruppo breve, A5, 2 per foglio |
| `fogli-prima-dopo.pdf` | Fogli individuali PRIMA/DOPO con sigle anonime accoppiate |
| `biglietti-uscita.pdf` | Biglietti di uscita, 4 per foglio |
| `etichette-scatole.pdf` | Etichette delle due scatole |
| `poster-regole.pdf` | Poster delle regole |

## Palette e gruppi

Nove gruppi, ognuno con **colore + simbolo + nome**, così restano distinguibili anche in bianco e nero e per chi non distingue bene i colori:

| Gruppo | Colore | Simbolo |
|---|---|---|
| Rosso | `#C8372D` | cerchio |
| Arancio | `#DB6A1C` | triangolo |
| Giallo | `#E2B007` | quadrato |
| Verde | `#3A8A3E` | rombo |
| Petrolio | `#0E7C7B` | esagono |
| Azzurro | `#2C8BC9` | stella |
| Blu | `#2E4A9B` | croce |
| Viola | `#6B3FA0` | mezzaluna |
| Rosa | `#C2387F` | anello |

Base: carta `#F5F6F8`, inchiostro `#1B2130`, grigio `#5B6475`, linea `#D5DAE2`, notte `#0D1322` (schermo del blocco). Stati: calma `#2FA36B`, attenzione `#E3A008`, blocco `#D9482B`. Le slide usano sfondo chiaro e testo scuro; i colori dei gruppi sono accenti, mai sfondo di testi lunghi. Font: Atkinson Hyperlegible.

## Privacy

Il barattolo usa solo il livello sonoro istantaneo, calcolato in memoria e mai salvato. I fogli individuali non hanno nomi: le due parti si collegano con una sigla casuale prestampata. Gli aspetti formali (informativa, consensi) sono gestiti dal docente con il dirigente e non sono trattati qui.

## Convenzioni

- **Nessun trattino lungo** (lineetta o trattino medio) in nessun testo, materiale, slide, codice o documento. Si usano punto, virgola, due punti o parentesi; per gli intervalli il trattino corto (15-30).
- Ogni decisione presa va registrata in `docs/decisioni.md` e riportata nel quadro `docs/progetto16-scelte.md`.
- Colori solo da `design/palette.json` (o `palette.css`); font Atkinson Hyperlegible.

