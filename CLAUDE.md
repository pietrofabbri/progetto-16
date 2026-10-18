# Istruzioni per chi lavora su questa repo (persone o AI)

- Questa repo è **pubblica** e contiene solo ciò che viene presentato. Documenti di progetto, decisioni, progettazione degli incontri e ricerca stanno nella repo privata `pietrofabbri/p16-ricerca` (che include questa come sottomodulo `presentato/`): leggi lì `docs/decisioni.md` prima di lavorare.
- Qui non vanno mai: ipotesi della ricerca, dati non aggregati, nomi di studenti. Le slide degli incontri si pubblicano appena pronte (D-83, decisione di Pietro del 18/10/2026), tranne le soluzioni delle attività usate per l'indagine PRIMA/DOPO, che si pubblicano dopo l'incontro.
- Nessun trattino lungo (lineetta o trattino medio) in nessun file: usa punto, virgola, due punti, parentesi; per gli intervalli il trattino corto (15-30). Verifica prima di ogni commit con `LC_ALL=C.UTF-8 grep -rnP "\x{2014}|\x{2013}" --exclude-dir=.git .` (deve non trovare nulla).
- Colori solo da `design/palette.json` / `design/palette.css`; font Atkinson Hyperlegible (`design/fonts/`).
- Tutto deve funzionare offline sul PC d'aula. Nessun dato degli studenti o audio va salvato o trasmesso.
- Dopo una modifica al kit, rigenera i PDF con `python3 kit/genera_kit.py` e committa anche `kit/pdf/`.
- Lingua: italiano, frasi brevi e chiare; materiali per studenti senza dare nulla per scontato.
