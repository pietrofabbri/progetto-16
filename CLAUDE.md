# Istruzioni per chi lavora su questa repo (persone o AI)

- Prima di tutto leggi `docs/decisioni.md` (decisioni in vigore) e `docs/progetto16-scelte.md` (quadro completo). Le decisioni prevalgono su `docs/specifica-originale.md`.
- Ogni nuova decisione presa con Pietro va aggiunta a `docs/decisioni.md` (ID, data, decisione, motivo, effetto, stato) e riportata nel quadro, nello stesso commit. Le voci superate non si cancellano: si segnano come superate.
- Nessun trattino lungo (lineetta o trattino medio) in nessun file: usa punto, virgola, due punti, parentesi; per gli intervalli il trattino corto (15-30). Verifica prima di ogni commit con `grep -rnP "\x{2014}|\x{2013}" --exclude-dir=.git .` (deve non trovare nulla).
- Colori solo da `design/palette.json` / `design/palette.css`; font Atkinson Hyperlegible (`design/fonts/`).
- Tutto deve funzionare offline sul PC d'aula. Nessun dato degli studenti o audio va salvato o trasmesso.
- Dopo una modifica al kit, rigenera i PDF con `python3 kit/genera_kit.py --seed 16` e committa anche `kit/pdf/`.
- Lingua: italiano, frasi brevi e chiare; materiali per studenti senza dare nulla per scontato.
