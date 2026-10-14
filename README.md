# Progetto 16. Quanto sono veramente tue le scelte che fai?

Materiali **presentati** in aula e al pubblico per mettere in pratica il **Progetto 16 "Psicologia e dati"**: 13 incontri da 90 minuti (75 netti) più un incontro bonus (l'8) per classi 4ª e 5ª di istituto tecnico, IIS Copernico-Carpeggiani, Ferrara. Il docente referente è Pietro Fabbri (A041).

Tutto funziona **offline** su un PC d'aula con proiettore. Versione online: **https://pietrofabbri.github.io/progetto-16/** (pubblicata da GitHub Actions a ogni push su `main`). Nessuno strumento registra, salva o trasmette audio o dati degli studenti.

## Contenuto

Questa repo contiene **solo ciò che viene presentato** (slide, strumenti, kit, diari degli incontri). La progettazione, le decisioni e la ricerca stanno in una repo privata collegata.


| Cartella | Che cosa c'è | Stato |
|---|---|---|
| `design/` | Palette comune (`palette.json` è la fonte unica, `palette.css` la versione per il web) e font Atkinson Hyperlegible (licenza SIL OFL). | v1 |
| `semaforo/` | **Il barattolo**: segnalatore del rumore da inserire nelle slide HTML (`barattolo.js`) e pagina di prova (`demo.html`). | v1 |
| `kit/` | Kit di stampa: generatore `genera_kit.py` e un PDF per ogni oggetto in `kit/pdf/`. | v4 |
| `slides/` | Template delle slide HTML (da fare). Per ora: `regole-prima-slide.md`, il testo della prima slide di ogni lezione. | da fare |

## Pubblicazione web

Il workflow `.github/workflows/pages.yml` copia `index.html`, `design/`, `semaforo/` e `slides/` nel branch `gh-pages` a ogni push su `main`; GitHub Pages pubblica quel branch su **https://pietrofabbri.github.io/progetto-16/**. Online il microfono funziona (la pagina è servita in https); il browser chiede il permesso. Il branch `gh-pages` non va modificato a mano.

**Privacy:** la repo e il sito sono pubblici. Nessun nome di studente va mai nella repo: gli elenchi restano solo sul PC del docente.

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

### Registro del rumore e impostazioni predefinite
- **Registro:** mentre il barattolo è attivo salva un campione al secondo (livello in dB sopra il silenzio, modalità, stato), i blocchi (inizio, durata, sblocco per silenzio o manuale) e le tarature. Solo numeri, nessun audio. Resta nel browser per 3 ore anche se si ricarica la pagina; dal pannello di taratura si scarica come JSON completo o CSV dei campioni. Serve a documentare la lezione.
- **Impostazioni predefinite:** "Esporta le impostazioni" scarica `impostazioni.json`. Copiato in `semaforo/impostazioni.json`, diventa il valore predefinito per tutti i browser che non hanno una taratura salvata. "Valori predefiniti" nel pannello riporta a quel file. Le soglie sono relative al silenzio, che si misura a ogni lezione.
- **Picco:** il pannello mostra il picco raggiunto (utile per una prova di massima confusione) e lo azzera.
- **Il blocco dura finché c'è rumore:** la lezione riparte solo dopo alcuni secondi continui sotto la soglia di quiete; se il rumore riprende, l'avanzamento torna indietro (verificato in simulazione: 15 secondi di rumore moderato, schermo ancora bloccato).

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
python3 kit/genera_kit.py
```
Produce un PDF per ogni oggetto in `kit/pdf/`, senza numeri di pagina:

| File | Contenuto |
|---|---|
| `istruzioni-e-gruppi.pdf` | Che cosa stampare, quante copie, legenda dei 9 gruppi |
| `tessere-ruolo.pdf` | 9 set di tessere ruolo, uno per gruppo (colore e simbolo), 100×70 mm per porta-badge A7 |
| `scheda-gruppo.pdf` | Scheda del gruppo A4 |
| `fogli-prima-dopo.pdf` | Foglio individuale: PRIMA sul fronte, DOPO sul retro; 2 biglietti per A4, stampa fronte-retro sul lato lungo |
| `etichette-scatole.pdf` | Etichette delle 9 piccole scatole dei gruppi |

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

Il barattolo usa solo il livello sonoro istantaneo, calcolato in memoria e mai salvato. I fogli individuali non hanno nomi né codici: PRIMA e DOPO stanno sul fronte e sul retro dello stesso biglietto. Gli aspetti formali (informativa, consensi) sono gestiti dal docente con il dirigente e non sono trattati qui.

## Convenzioni

- **Nessun trattino lungo** (lineetta o trattino medio) in nessun testo, materiale, slide, codice o documento. Si usano punto, virgola, due punti o parentesi; per gli intervalli il trattino corto (15-30). Controllo: `LC_ALL=C.UTF-8 grep -rnP "\x{2014}|\x{2013}" --exclude-dir=.git .`
- Le decisioni di progetto si registrano nella repo privata collegata, non qui.
- Qui non vanno mai soluzioni delle attività, sorprese, ipotesi di ricerca, dati non aggregati o nomi di studenti. Le pagine di un incontro si pubblicano dopo quell'incontro.
- Colori solo da `design/palette.json` (o `palette.css`); font Atkinson Hyperlegible.

