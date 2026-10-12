#!/usr/bin/env python3
"""Progetto 16. Kit di stampa comune.

Genera un PDF A4 separato per ogni oggetto, nella cartella kit/pdf/:
  istruzioni-e-gruppi.pdf   che cosa stampare, quante copie, legenda dei 9 gruppi
  tessere-ruolo.pdf         9 set (uno per gruppo): 4 ruoli + tessera accorpata per i gruppi da 3
  scheda-gruppo.pdf         scheda del gruppo A4 (versione breve / ragionamento / completa)
  scheda-breve.pdf          scheda del gruppo breve A5, 2 per foglio
  fogli-prima-dopo.pdf      fogli individuali PRIMA/DOPO con sigle anonime accoppiate
  biglietti-uscita.pdf      biglietti di uscita, 4 per foglio
  etichette-scatole.pdf     etichette delle due scatole
  poster-regole.pdf         poster delle regole

Uso:  python3 genera_kit.py [--fogli-individuali N] [--seed S]
Richiede: weasyprint. Colori da design/palette.json, font da design/fonts/
(se mancano i font, ripiega su un sans-serif di sistema).
"""
import argparse
import json
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
PALETTE = json.loads((ROOT / "design" / "palette.json").read_text(encoding="utf-8"))
FONTS = ROOT / "design" / "fonts"

# ---------------------------------------------------------------- contenuti
RUOLI = [
    dict(id="fac", nome="Facilitatore", sotto="",
         testo="Tieni il gruppo sulla consegna e fai uscire tutte le idee. "
               "Non decidi tu chi ha ragione.",
         icona="bussola"),
    dict(id="cus", nome="Custode dei turni", sotto="",
         testo="Gestisci gettone e timer: parla uno alla volta. "
               "Dai la parola a chi non ha ancora parlato.",
         icona="clessidra"),
    dict(id="ver", nome="Verificatore", sotto="",
         testo="Chiedi «Come lo sappiamo?». "
               "Separa fatti e opinioni, cerca altre spiegazioni.",
         icona="lente"),
    dict(id="seg", nome="Segretario", sotto="e responsabile della continuità",
         testo="Scrivi la risposta del gruppo. Aggiorna i ritardatari "
               "e raccogli le idee di chi esce.",
         icona="matita"),
]
RUOLO_ACCORPATO = dict(
    id="facus", nome="Facilitatore", sotto="+ Custode dei turni (gruppi da 3)",
    testo="Tieni il gruppo sul compito e gestisci i turni. "
          "Non decidi tu chi ha ragione.",
         icona="bussola")

ICONE = {
    "bussola": '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>'
               '<path d="M12 5 L15 12 L12 19 L9 12 Z" fill="currentColor"/>',
    "clessidra": '<path d="M6 3 H18 M6 21 H18 M7 3 C7 9 17 9 17 12 C17 15 7 15 7 21 '
                 'M17 3 C17 9 7 9 7 12 C7 15 17 15 17 21" fill="none" stroke="currentColor" '
                 'stroke-width="2" stroke-linejoin="round"/>',
    "lente": '<circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2.2"/>'
             '<path d="M14.5 14.5 L20 20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    "matita": '<path d="M4 20 L5 15 L16 4 L20 8 L9 19 Z M14 6 L18 10" fill="none" '
              'stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
}

REGOLE = [
    ("Fatto, interpretazione, ipotesi",
     "Fatto: si può verificare. Interpretazione: il significato che gli diamo. "
     "Ipotesi: una spiegazione possibile che va controllata."),
    ("Prima penso, poi confronto",
     "Quando serve, scrivo la mia risposta prima di ascoltare il gruppo."),
    ("Cambiare idea non è una sconfitta",
     "Posso cambiare idea, oppure diventare meno sicuro. Tutte e due le cose "
     "possono voler dire che sto ragionando meglio."),
    ("Si criticano le idee, non le persone",
     "Prima di contestare, provo a ripetere l'idea dell'altro con parole sue."),
    ("Partecipare non vuol dire parlare tanto",
     "Valgono anche scrivere, osservare, fare domande, segnalare un dubbio. "
     "Nessuno è obbligato a raccontare fatti personali."),
]
DOMANDA_FINALE = ("Che cosa, oggi, mi ha fatto cambiare idea, oppure mi ha "
                  "convinto che devo ancora verificare?")
SCHERMO_FERMO = ("Quando lo schermo si ferma: smetti di parlare, appoggia quello "
                 "che hai in mano, fai un respiro. Quando la classe resta in "
                 "silenzio per qualche secondo, si riparte da dove eravamo.")

ALFABETO = "ACDEFHJKMNPRTUVWXY347"  # niente caratteri ambigui (0/O, 1/I, 5/S, 2/Z, 8/B)


# ---------------------------------------------------------------- helpers
def svg(nome, size="9mm"):
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" '
            f'aria-hidden="true">{ICONE[nome]}</svg>')


def righe(n, cls="riga"):
    return "".join(f'<div class="{cls}"></div>' for _ in range(n))


def scala_sicurezza():
    celle = "".join(f'<div class="cella"><span class="box"></span>{v}</div>'
                    for v in range(0, 101, 10))
    return f'<div class="scala">{celle}</div>'


def forma(gr, size="6mm"):
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" aria-hidden="true" '
            f'fill="{gr["hex"]}">{PALETTE["forme_svg_24"][gr["forma"]]}</svg>')


def tessera(r, gr):
    sotto = f'<div class="t-sotto">{r["sotto"]}</div>' if r["sotto"] else ""
    return f'''
<div class="tessera" style="--g:{gr["hex"]}">
  <div class="t-banda"></div>
  <div class="t-gruppo">{forma(gr)}<span>{gr["nome"]}</span></div>
  <div class="t-corpo">
    <div class="t-testa"><span class="t-icona">{svg(r["icona"])}</span>
      <div><div class="t-nome">{r["nome"]}</div>{sotto}</div></div>
    <p class="t-testo">{r["testo"]}</p>
  </div>
  <div class="t-piede">Progetto 16 · restituisci la tessera a fine lezione</div>
</div>'''


def fogli_tessere():
    """9 set (uno per gruppo): 4 ruoli + 1 tessera accorpata per i gruppi da 3."""
    # prima i 4 ruoli, due gruppi per foglio; poi le 9 tessere accorpate
    carte = [tessera(r, gr) for gr in PALETTE["gruppi"] for r in RUOLI]
    carte += [tessera(RUOLO_ACCORPATO, gr) for gr in PALETTE["gruppi"]]
    pagine = [carte[i:i + 8] for i in range(0, len(carte), 8)]
    return "".join(f'<section class="pag pag-tessere">{"".join(p)}</section>' for p in pagine)


def legenda_gruppi():
    voci = "".join(f'<div class="leg">{forma(g, "7mm")}<b>{g["nome"]}</b><span>{g["hex"]}</span></div>'
                   for g in PALETTE["gruppi"])
    return f'<div class="legenda">{voci}</div>'


def intestazione_scheda(titolo, extra=""):
    return f'''
<div class="sc-testa">
  <div class="sc-titolo">{titolo}</div>
  <div class="campi">
    <span class="campo">Attività <i style="width:38mm"></i></span>
    <span class="campo">Codice <i style="width:16mm"></i></span>
    <span class="campo">Gruppo (colore) <i style="width:18mm"></i></span>
    <span class="campo">Data <i style="width:20mm"></i></span>
  </div>{extra}
</div>'''


def sezione(num, titolo, domanda, nrighe):
    return f'''
<div class="sez"><div class="sez-t"><span class="num">{num}</span>{titolo}</div>
<div class="sez-d">{domanda}</div>{righe(nrighe)}</div>'''


def scheda_completa():
    versioni = ('<div class="versione">Compilate: '
                '<span><b class="box"></b>breve (1-2)</span>'
                '<span><b class="box"></b>ragionamento (1-3)</span>'
                '<span><b class="box"></b>completa (tutto)</span>'
                '<em>Bastano parole chiave.</em></div>')
    dopo = f'''
<div class="sez dopo"><div class="sez-t">DOPO IL CONFRONTO CON GLI ALTRI GRUPPI</div>
<div class="sez-d">La nostra idea è cambiata?</div>
<div class="scelte"><span><b class="box"></b>No</span><span><b class="box"></b>Sì</span>
<span><b class="box"></b>Siamo meno sicuri</span></div>
<div class="sez-d">Se è cambiata o siamo meno sicuri: che cosa ci ha fatto cambiare?</div>
{righe(3)}</div>'''
    return f'''
<section class="pag pag-scheda">
{intestazione_scheda("Scheda del gruppo", versioni)}
{sezione(1, "LA NOSTRA RISPOSTA", "Che cosa abbiamo deciso o concluso?", 4)}
{sezione(2, "PERCHÉ?", "Qual è la ragione principale? Quale elemento sostiene la nostra risposta?", 4)}
{sezione(3, "CHE COSA CI RESTA DA CAPIRE?", "Quale dubbio rimane? Quale informazione manca, o quale alternativa è possibile?", 4)}
{dopo}
<div class="sc-piede">Progetto 16 · Scheda del gruppo · Scatola 2 se l'attività lo prevede</div>
</section>'''


def scheda_breve():
    una = f'''
<div class="breve">
{intestazione_scheda("Scheda del gruppo · breve")}
{sezione(1, "LA NOSTRA RISPOSTA", "Che cosa abbiamo deciso o concluso?", 3)}
{sezione(2, "PERCHÉ?", "Qual è la ragione principale? Quale elemento la sostiene?", 3)}
</div>'''
    return f'<section class="pag pag-breve">{una}<div class="taglio-h"><span>taglia qui</span></div>{una}</section>'


def codice(rng, usati):
    while True:
        c = "".join(rng.choice(ALFABETO) for _ in range(4))
        if c not in usati:
            usati.add(c)
            return c


def individuale(c):
    motivi = ["un'informazione nuova", "un ragionamento di un compagno",
              "quello che pensava la maggioranza", "non so / altro"]
    motivi_html = "".join(f'<span><b class="box"></b>{m}</span>' for m in motivi)
    return f'''
<div class="ind">
  <div class="ind-parte">
    <div class="ind-testa"><span class="tag">PRIMA</span><span class="cod">{c}</span></div>
    <div class="ind-campi"><span class="campo">Attività <i style="width:20mm"></i></span>
      <span class="campo">Gruppo (colore) <i style="width:14mm"></i></span></div>
    <div class="ind-d">La mia risposta, prima di parlarne</div>
    <div class="spazio"></div>
    <div class="ind-d">Quanto sono sicuro? Segna una casella</div>
    {scala_sicurezza()}
    <div class="ind-nota">Non scrivere il nome. Stacca questa parte e mettila nella Scatola 2.</div>
  </div>
  <div class="strappo"><span>strappa qui</span></div>
  <div class="ind-parte">
    <div class="ind-testa"><span class="tag tag-dopo">DOPO</span><span class="cod">{c}</span></div>
    <div class="ind-d">La mia risposta, dopo il confronto</div>
    <div class="spazio corto"></div>
    <div class="ind-d">Quanto sono sicuro adesso?</div>
    {scala_sicurezza()}
    <div class="ind-d">Rispetto a prima, la mia risposta è
      <span class="inline"><b class="box"></b>uguale</span>
      <span class="inline"><b class="box"></b>cambiata</span></div>
    <div class="ind-d">Che cosa ha contato di più?</div>
    <div class="motivi">{motivi_html}</div>
  </div>
</div>'''


def fogli_individuali(n_fogli, rng):
    usati = set()
    out = []
    for _ in range(n_fogli):
        a, b = codice(rng, usati), codice(rng, usati)
        out.append(f'<section class="pag pag-ind">{individuale(a)}'
                   f'<div class="taglio-h"><span>taglia qui</span></div>{individuale(b)}</section>')
    return "".join(out)


def biglietti():
    uno = f'''
<div class="big">
  <div class="big-t">Biglietto di uscita</div>
  <div class="big-d">{DOMANDA_FINALE}</div>
  {righe(4)}
  <div class="big-d piccolo">Una domanda, un dubbio, un'idea <em>(facoltativo)</em></div>
  {righe(2)}
  <div class="big-piede">Scatola 1 · non scrivere il tuo nome</div>
</div>'''
    return f'<section class="pag pag-big">{uno * 4}</section>'


def etichette():
    s1 = ("Domande, dubbi e idee",
          "Biglietti di uscita, domande rimaste aperte, dubbi, proposte, osservazioni. "
          "Scrivi quello che vuoi, senza il tuo nome.")
    s2 = ("Risposte delle attività",
          "Solo i fogli che il docente chiede di consegnare qui: parti PRIMA e DOPO "
          "dei fogli individuali, schede indicate nella consegna.")
    blocchi = "".join(
        f'<div class="etic"><div class="etic-n">Scatola {i}</div>'
        f'<div class="etic-t">{t}</div><div class="etic-d">{d}</div></div>'
        for i, (t, d) in enumerate([s1, s2], start=1))
    return f'<section class="pag pag-etic">{blocchi}</section>'


def poster():
    items = "".join(f'<li><div class="p-t">{t}</div><div class="p-d">{d}</div></li>'
                    for t, d in REGOLE)
    return f'''
<section class="pag pag-poster">
  <div class="p-occhiello">Progetto 16 · Quanto sono veramente tue le scelte che fai?</div>
  <h1 class="p-h">Come ragioniamo qui</h1>
  <ol class="p-lista">{items}</ol>
  <div class="p-schermo"><b>Il semaforo del rumore.</b> {SCHERMO_FERMO}</div>
  <div class="p-finale"><span>Ogni volta, alla fine</span>{DOMANDA_FINALE}</div>
</section>'''


def istruzioni(n_ind):
    righe_tab = [
        ("tessere-ruolo.pdf", "Tessere ruolo: 9 set, uno per gruppo", "1 copia",
         "Ogni set ha il colore e il simbolo del suo gruppo: 4 ruoli, più 1 tessera Facilitatore + Custode per quando il gruppo è da 3 (raccolte in fondo). 45 tessere in tutto. Cartoncino 160-200 g, a colori. Tessere 100×70 mm: entrano nei porta-badge A7 (105×74 mm) lasciando il margine alla stampante."),
        ("scheda-gruppo.pdf", "Scheda del gruppo (A4)", "8-10 per incontro",
         "Carta normale. Il docente dice quale versione compilare; il gruppo spunta la casella."),
        ("scheda-breve.pdf", "Scheda breve (A5, 2 per foglio)", "4-5 fogli per incontro",
         "Per le attività rapide (solo sezioni 1 e 2)."),
        ("fogli-prima-dopo.pdf", f"Foglio individuale PRIMA/DOPO (2 per foglio, {n_ind * 2} sigle diverse)", "1 copia del blocco",
         "Ogni modulo ha la stessa sigla sulle due parti: è il solo collegamento tra prima e dopo, nessun nome. La parte PRIMA va nella Scatola 2 prima della discussione. Riusabile tra incontri: il campo Attività distingue le raccolte."),
        ("biglietti-uscita.pdf", "Biglietti di uscita (4 per foglio)", "8 fogli per incontro",
         "Domanda conclusiva fissa. Vanno nella Scatola 1."),
        ("etichette-scatole.pdf", "Etichette delle scatole", "1 copia", "Incollare sulle due scatole."),
        ("poster-regole.pdf", "Poster delle regole", "1 copia", "Stampabile anche in A3 (ingrandimento 141%)."),
    ]
    tr = "".join(f"<tr><td><b>{b}</b><div class='file'>{a}</div></td><td class='q'>{c}</td><td>{d}</td></tr>"
                 for a, b, c, d in righe_tab)
    return f'''
<section class="pag pag-istr">
  <div class="p-occhiello">Progetto 16 · Kit di stampa comune · v3</div>
  <h1 class="istr-h">Che cosa stampare</h1>
  <table class="istr"><thead><tr><th>Materiale e file</th><th>Quante</th><th>Note</th></tr></thead>
  <tbody>{tr}</tbody></table>
  <p class="istr-nota">Stampa sempre al 100% (senza "adatta alla pagina"), altrimenti le tessere non
  entrano nei porta-badge. Font: Atkinson Hyperlegible, scelto per la leggibilità anche con DSA.
  Materiali da procurare a parte: 9 gettoni della parola (uno per gruppo), laccetti, due scatole.</p>
  <h2 class="istr-h2">I nove gruppi</h2>
  <p class="istr-nota">Colore e simbolo insieme: i gruppi restano distinguibili anche in bianco e nero e per chi
  non distingue bene i colori. Gli stessi colori tornano nelle slide (design/palette.json).</p>
  {legenda_gruppi()}
</section>'''


# ---------------------------------------------------------------- stile
def css():
    font = (FONTS / "AtkinsonHyperlegible-Regular.ttf")
    fontb = (FONTS / "AtkinsonHyperlegible-Bold.ttf")
    ff = ""
    if font.exists():
        ff = (f'@font-face{{font-family:"Atkinson";src:url("{font.as_uri()}");font-weight:400}}'
              f'@font-face{{font-family:"Atkinson";src:url("{fontb.as_uri()}");font-weight:700}}')
    return ff + """
/* Kit di stampa: carta bianca, inchiostro blu-grigio, colori solo per i ruoli */
:root{--ink:#1B2130;--soft:#5B6475;--line:#B9C0CC;--hair:#DDE1E8;--paper:#FFFFFF;--tint:#F2F4F8;
      --f:"Atkinson","DejaVu Sans","Helvetica",sans-serif}
@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:var(--f);color:var(--ink);background:var(--paper);font-size:10.5pt;line-height:1.35}
.pag{width:210mm;height:297mm;position:relative;page-break-after:always;overflow:hidden}
.box{display:inline-block;width:3.6mm;height:3.6mm;border:1.2px solid var(--ink);border-radius:.6mm;
     vertical-align:-0.6mm;margin-right:1.4mm;flex:none}
.riga{border-bottom:1px solid var(--line);height:8mm}
.campi{display:flex;flex-wrap:wrap;gap:3mm 6mm}
.campo{font-size:9pt;color:var(--soft);white-space:nowrap}
.campo i{display:inline-block;border-bottom:1px solid var(--ink);height:4mm;vertical-align:-1mm;margin-left:1.5mm}

/* istruzioni */
.pag-istr{padding:18mm 16mm}
.p-occhiello{font-size:8.5pt;letter-spacing:.08em;text-transform:uppercase;color:var(--soft)}
.istr-h{font-size:24pt;margin:2mm 0 8mm}
table.istr{width:100%;border-collapse:collapse;font-size:9.5pt}
.istr th{text-align:left;font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:var(--soft);
         border-bottom:1.5px solid var(--ink);padding:2mm 2mm}
.istr td{border-bottom:1px solid var(--hair);padding:2.6mm 2mm;vertical-align:top}
.istr .file{font-size:8pt;color:var(--soft);margin-top:.8mm}.istr td.q{white-space:nowrap;width:30mm}
.istr-nota{margin-top:8mm;font-size:9.5pt;color:var(--soft);max-width:160mm}

/* tessere: 100x70, griglia 2x4 centrata; colore del gruppo nella banda e nel simbolo */
.pag-tessere{display:grid;grid-template-columns:100mm 100mm;grid-auto-rows:70mm;
             padding:8.5mm 5mm;align-content:start}
.tessera{position:relative;border:0.6px dashed #9AA3B2;display:flex;flex-direction:column;background:var(--paper)}
.t-banda{height:4.5mm;background:var(--g)}
.t-gruppo{position:absolute;right:5mm;top:7.5mm;display:flex;align-items:center;gap:1.6mm;
          font-size:8.5pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--soft)}
.t-corpo{padding:9mm 6mm 0;flex:1}
.t-testa{display:flex;align-items:center;gap:3mm;color:var(--ink)}
.t-icona{display:flex}
.t-nome{font-size:21pt;font-weight:700;line-height:1.05;color:var(--ink)}
.t-sotto{font-size:9pt;color:var(--soft);margin-top:.6mm}
.t-testo{margin:4mm 0 0;font-size:12.5pt;line-height:1.35;color:var(--ink)}
.t-piede{font-size:6.5pt;color:var(--soft);padding:0 6mm 3mm;letter-spacing:.02em}
.istr-h2{font-size:15pt;margin:9mm 0 1mm}
.legenda{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm 6mm;margin-top:4mm}
.leg{display:flex;align-items:center;gap:2.5mm;font-size:11pt}
.leg span{color:var(--soft);font-size:8pt;font-variant-numeric:tabular-nums}

/* scheda A4 */
.pag-scheda{padding:14mm 16mm 12mm;display:flex;flex-direction:column}
.sc-testa{border-bottom:2px solid var(--ink);padding-bottom:3mm;margin-bottom:4mm}
.sc-titolo{font-size:20pt;font-weight:700;margin-bottom:3mm}
.versione{margin-top:3mm;font-size:9pt;display:flex;flex-wrap:wrap;gap:2mm 6mm;align-items:center}
.versione em{color:var(--soft)}
.sez{margin-top:4mm}
.sez-t{font-weight:700;font-size:11.5pt;letter-spacing:.03em;display:flex;align-items:center;gap:2.5mm}
.num{display:inline-flex;width:6.5mm;height:6.5mm;border-radius:50%;background:var(--ink);color:var(--paper);
     align-items:center;justify-content:center;font-size:9.5pt}
.sez-d{font-size:9.5pt;color:var(--soft);margin:1mm 0 0}
.dopo{background:var(--tint);padding:3mm 4mm 2mm;border-radius:1.5mm;margin-top:5mm}
.dopo .riga{border-color:#AEB6C3}
.scelte{display:flex;gap:8mm;margin:2mm 0 1mm;font-size:10.5pt}
.sc-piede{margin-top:auto;font-size:7.5pt;color:var(--soft)}

/* scheda breve A5 x2 */
.pag-breve,.pag-ind{display:flex;flex-direction:column}
.breve{height:148.5mm;padding:10mm 16mm 6mm}
.breve .sc-titolo{font-size:15pt}
.taglio-h{position:relative;height:0;border-top:0.6px dashed #9AA3B2}
.taglio-h span,.strappo span{position:absolute;font-size:6.5pt;color:#8A93A3;background:var(--paper);padding:0 2mm}
.taglio-h span{left:50%;top:-1.6mm;transform:translateX(-50%)}

/* foglio individuale: due parti affiancate con strappo verticale */
.ind{height:148.5mm;display:grid;grid-template-columns:1fr 0 1fr;padding:9mm 10mm 7mm}
.ind-parte{display:block;padding:0 5mm;min-width:0}
.strappo{width:0;border-left:0.8px dashed #8A93A3;position:relative}
.strappo span{top:-4mm;left:-7mm;width:14mm;text-align:center;padding:0}
.ind-testa{display:flex;justify-content:space-between;align-items:center;margin-bottom:3mm}
.tag{font-weight:700;font-size:13pt;letter-spacing:.1em;border:2px solid var(--ink);padding:.6mm 3mm;border-radius:1mm}
.tag-dopo{background:var(--ink);color:var(--paper)}
.cod{font-size:15pt;font-weight:700;letter-spacing:.18em;font-variant-numeric:tabular-nums}
.ind-campi{display:flex;gap:4mm;margin-bottom:2mm}
.ind-d{font-size:9.5pt;font-weight:700;margin-top:2.5mm}
.spazio{border:1px solid var(--line);border-radius:1.2mm;height:30mm;margin-top:1.2mm}
.spazio.corto{height:20mm}
.scala{margin-top:1.5mm;white-space:nowrap}
.cella{display:inline-block;width:8.4mm;text-align:center;font-size:7.5pt;color:var(--soft);
       font-variant-numeric:tabular-nums}
.cella .box{display:block;margin:0 auto .8mm;width:4.4mm;height:4.4mm}
.inline{margin-left:3mm;font-weight:400}
.motivi{margin-top:1.2mm;font-size:9pt}.motivi span{display:block;margin-bottom:1.3mm}
.ind-nota{margin-top:6mm;font-size:8pt;color:var(--soft)}

/* biglietti 2x2 */
.pag-big{display:grid;grid-template-columns:105mm 105mm;grid-template-rows:148.5mm 148.5mm}
.big{border:0.6px dashed #9AA3B2;padding:9mm 8mm 6mm;display:flex;flex-direction:column}
.big-t{font-size:8pt;letter-spacing:.1em;text-transform:uppercase;color:var(--soft)}
.big-d{font-size:12pt;font-weight:700;margin:2mm 0 1mm;line-height:1.3}
.big-d.piccolo{font-size:9.5pt;margin-top:5mm}
.big-d em{font-weight:400;color:var(--soft)}
.big-piede{margin-top:auto;font-size:7.5pt;color:var(--soft)}

/* etichette */
.pag-etic{display:flex;flex-direction:column}
.etic{height:148.5mm;padding:22mm 20mm;border-bottom:0.6px dashed #9AA3B2}
.etic-n{font-size:16pt;letter-spacing:.12em;text-transform:uppercase;color:var(--soft)}
.etic-t{font-size:38pt;font-weight:700;line-height:1.05;margin:3mm 0 6mm}
.etic-d{font-size:14pt;max-width:150mm;color:var(--ink)}

/* poster */
.pag-poster{padding:18mm 18mm 14mm;display:flex;flex-direction:column}
.p-h{font-size:34pt;margin:2mm 0 7mm;line-height:1}
.p-lista{margin:0;padding:0;list-style:none;counter-reset:r}
.p-lista li{counter-increment:r;display:grid;grid-template-columns:12mm 1fr;padding:3.6mm 0;
            border-top:1px solid var(--hair)}
.p-lista li::before{content:counter(r);font-size:20pt;font-weight:700;color:var(--soft);grid-row:span 2;line-height:1}
.p-t{font-size:15pt;font-weight:700}
.p-d{font-size:11pt;color:var(--soft);margin-top:1mm;max-width:150mm}
.p-schermo{margin-top:6mm;padding:4mm 5mm;border:1.5px solid var(--ink);border-radius:2mm;font-size:11pt}
.p-finale{margin-top:auto;background:var(--ink);color:var(--paper);padding:6mm 7mm;border-radius:2mm;
          font-size:15pt;font-weight:700;line-height:1.3}
.p-finale span{display:block;font-size:8.5pt;letter-spacing:.1em;text-transform:uppercase;font-weight:400;
               opacity:.75;margin-bottom:1.5mm}
"""


OGGETTI = [
    ("istruzioni-e-gruppi", "Istruzioni e gruppi", lambda n, rng: istruzioni(n)),
    ("tessere-ruolo", "Tessere ruolo", lambda n, rng: fogli_tessere()),
    ("scheda-gruppo", "Scheda del gruppo", lambda n, rng: scheda_completa()),
    ("scheda-breve", "Scheda del gruppo breve", lambda n, rng: scheda_breve()),
    ("fogli-prima-dopo", "Fogli individuali prima e dopo", lambda n, rng: fogli_individuali(n, rng)),
    ("biglietti-uscita", "Biglietti di uscita", lambda n, rng: biglietti()),
    ("etichette-scatole", "Etichette delle scatole", lambda n, rng: etichette()),
    ("poster-regole", "Poster delle regole", lambda n, rng: poster()),
]


def documento(titolo, corpo):
    return (f'<!doctype html><html lang="it"><head><meta charset="utf-8">'
            f'<title>Progetto 16. {titolo}</title><style>{css()}</style></head>'
            f'<body>{corpo}</body></html>')


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--fogli-individuali", type=int, default=15,
                    help="fogli PRIMA/DOPO (2 moduli per foglio). Default 15 = 30 moduli")
    ap.add_argument("--seed", type=int, default=None, help="seme per le sigle (default casuale)")
    a = ap.parse_args()
    from weasyprint import HTML
    rng = random.Random(a.seed)
    out = HERE / "pdf"
    out.mkdir(exist_ok=True)
    for nome, titolo, fn in OGGETTI:
        html = documento(titolo, fn(a.fogli_individuali, rng))
        HTML(string=html, base_url=str(HERE)).write_pdf(out / f"{nome}.pdf")
        print("ok:", out / f"{nome}.pdf")
