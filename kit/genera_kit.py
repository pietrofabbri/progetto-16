#!/usr/bin/env python3
"""Progetto 16. Kit di stampa comune.

Genera un PDF A4 separato per ogni oggetto, nella cartella kit/pdf/:
  istruzioni-e-gruppi.pdf   che cosa stampare, quante copie, legenda dei 9 gruppi
  tessere-ruolo.pdf         9 set (uno per gruppo): 4 ruoli + tessera accorpata per i gruppi da 3
  scheda-gruppo.pdf         scheda del gruppo A4
  fogli-prima-dopo.pdf      foglio individuale: PRIMA sul fronte, DOPO sul retro (2 biglietti per A4)
  etichette-scatole.pdf     etichette delle 9 scatole dei gruppi

Uso:  python3 genera_kit.py
Richiede: weasyprint. Colori da design/palette.json, font da design/fonts/
(se mancano i font, ripiega su un sans-serif di sistema).
"""
import json
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


def campo_gruppo(larghezza="40mm"):
    return f'<span class="campo">Gruppo (colore) <i style="width:{larghezza}"></i></span>'


def sezione(num, titolo, domanda, nrighe):
    return f'''
<div class="sez"><div class="sez-t"><span class="num">{num}</span>{titolo}</div>
<div class="sez-d">{domanda}</div>{righe(nrighe)}</div>'''


def scheda_completa():
    dopo = f'''
<div class="sez dopo"><div class="sez-t">DOPO IL CONFRONTO CON GLI ALTRI GRUPPI</div>
<div class="sez-d">La nostra idea è cambiata?</div>
<div class="scelte"><span><b class="box"></b>No</span><span><b class="box"></b>Sì</span>
<span><b class="box"></b>Siamo meno sicuri</span></div>
<div class="sez-d">Se è cambiata o siamo meno sicuri: che cosa ci ha fatto cambiare?</div>
{righe(4)}</div>'''
    return f'''
<section class="pag pag-scheda">
<div class="sc-testa"><div class="sc-titolo">Scheda del gruppo</div>{campo_gruppo()}</div>
{sezione(1, "LA NOSTRA RISPOSTA", "Che cosa abbiamo deciso o concluso?", 5)}
{sezione(2, "PERCHÉ?", "Qual è la ragione principale? Quale elemento sostiene la nostra risposta?", 5)}
{sezione(3, "CHE COSA CI RESTA DA CAPIRE?", "Quale dubbio rimane? Quale informazione manca, o quale alternativa è possibile?", 5)}
{dopo}
<div class="sc-piede">Progetto 16 · Bastano parole chiave · A fine lezione la scheda va nella scatola del gruppo</div>
</section>'''


# Foglio individuale: fronte (PRIMA) e retro (DOPO) dello stesso biglietto.
# Un A4 = 2 biglietti (metà alta e metà bassa). Stampa fronte-retro sul lato lungo:
# la metà alta del fronte corrisponde alla metà alta del retro. Margini ampi
# (14 mm da ogni bordo e dalla linea di taglio) perché un taglio impreciso o un
# fronte-retro non perfettamente allineato non tagli via nessuna informazione.
def prima():
    return f'''
<div class="ind">
  <div class="ind-testa"><span class="tag">PRIMA</span>{campo_gruppo("34mm")}</div>
  <div class="ind-d">La mia risposta, prima di parlarne con il gruppo</div>
  <div class="spazio"></div>
  <div class="ind-d">Quanto sono sicuro? Segna una casella</div>
  {scala_sicurezza()}
  <div class="ind-nota">Non scrivere il tuo nome. Quando hai finito, gira il foglio a faccia in giù: il fronte non si corregge più.</div>
</div>'''


def dopo():
    motivi = ["un'informazione nuova", "un ragionamento di un compagno",
              "quello che pensava la maggioranza", "non so, oppure altro"]
    motivi_html = "".join(f'<span><b class="box"></b>{m}</span>' for m in motivi)
    return f'''
<div class="ind">
  <div class="ind-testa"><span class="tag tag-dopo">DOPO</span></div>
  <div class="dopo-griglia">
    <div>
      <div class="ind-d">La mia risposta, dopo il confronto</div>
      <div class="spazio corto"></div>
      <div class="ind-d">Quanto sono sicuro adesso?</div>
      {scala_sicurezza()}
    </div>
    <div>
      <div class="ind-d">Rispetto a prima, la mia risposta è</div>
      <div class="motivi"><span><b class="box"></b>uguale</span><span><b class="box"></b>cambiata</span></div>
      <div class="ind-d">Che cosa ha contato di più?</div>
      <div class="motivi">{motivi_html}</div>
    </div>
  </div>
</div>'''


def segni_taglio():
    return '<span class="segno sx"></span><span class="segno dx"></span>'


def fogli_individuali():
    fronte = f'<section class="pag pag-ind">{prima()}{segni_taglio()}{prima()}</section>'
    retro = f'<section class="pag pag-ind">{dopo()}{segni_taglio()}{dopo()}</section>'
    return fronte + retro


def etichetta(gr):
    return f'''
<div class="etic" style="--g:{gr["hex"]}">
  <div class="etic-banda"></div>
  <div class="etic-corpo">
    <div class="etic-t">{forma(gr, "11mm")}<span>Gruppo {gr["nome"]}</span></div>
    <div class="etic-d">Qui dentro: tessere con cordino, gettone della parola, schede del gruppo,
    fogli individuali. A fine lezione rimetti tutto qui.</div>
  </div>
</div>'''


def etichette():
    return f'<section class="pag pag-etic">{"".join(etichetta(g) for g in PALETTE["gruppi"])}</section>'


def istruzioni():
    righe_tab = [
        ("tessere-ruolo.pdf", "Tessere ruolo: 9 set, uno per gruppo", "1 copia",
         "Ogni set ha il colore e il simbolo del suo gruppo: 4 ruoli, più 1 tessera Facilitatore + Custode per quando il gruppo è da 3 (raccolte in fondo). 45 tessere in tutto. Cartoncino 160-200 g, a colori. Tessere 100×70 mm: entrano nei porta-badge A7 (105×74 mm) lasciando il margine alla stampante."),
        ("scheda-gruppo.pdf", "Scheda del gruppo (A4)", "8-10 per incontro",
         "Carta normale. Il docente dice quali sezioni compilare."),
        ("fogli-prima-dopo.pdf", "Foglio individuale PRIMA (fronte) e DOPO (retro)", "1 foglio A4 ogni 2 studenti, per ogni raccolta",
         "Stampa fronte-retro, rilegatura sul lato lungo. Poi taglia ogni A4 a metà, sui segni ai bordi: escono 2 biglietti. Margini ampi: un taglio impreciso non toglie nulla. Nessun nome, nessun codice: fronte e retro stanno sullo stesso biglietto."),
        ("etichette-scatole.pdf", "Etichette delle 9 scatole dei gruppi", "1 copia",
         "Una piccola scatola per gruppo, con tutto il materiale del gruppo dentro. Carta adesiva o colla."),
    ]
    tr = "".join(f"<tr><td><b>{b}</b><div class='file'>{a}</div></td><td class='q'>{c}</td><td>{d}</td></tr>"
                 for a, b, c, d in righe_tab)
    return f'''
<section class="pag pag-istr">
  <div class="p-occhiello">Progetto 16 · Kit di stampa comune · v4</div>
  <h1 class="istr-h">Che cosa stampare</h1>
  <table class="istr"><thead><tr><th>Materiale e file</th><th>Quante</th><th>Note</th></tr></thead>
  <tbody>{tr}</tbody></table>
  <p class="istr-nota">Stampa sempre al 100% (senza "adatta alla pagina"), altrimenti le tessere non
  entrano nei porta-badge. Font: Atkinson Hyperlegible, scelto per la leggibilità anche con DSA.
  Materiali da procurare a parte: 9 piccole scatole (una per gruppo), 9 gettoni della parola, 45 porta-badge A7 con cordino.</p>
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

/* foglio individuale: 2 biglietti per A4, fronte PRIMA e retro DOPO */
.pag-ind{position:relative}
.ind{height:148.5mm;padding:14mm 16mm}
.ind-testa{display:flex;justify-content:space-between;align-items:center;margin-bottom:3mm}
.tag{font-weight:700;font-size:14pt;letter-spacing:.1em;border:2px solid var(--ink);padding:.6mm 3mm;border-radius:1mm}
.tag-dopo{background:var(--ink);color:var(--paper)}
.ind-d{font-size:10pt;font-weight:700;margin-top:3mm}
.spazio{border:1px solid var(--line);border-radius:1.2mm;height:42mm;margin-top:1.5mm}
.spazio.corto{height:38mm}
.scala{margin-top:1.5mm;white-space:nowrap}
.cella{display:inline-block;width:8.4mm;text-align:center;font-size:7.5pt;color:var(--soft);
       font-variant-numeric:tabular-nums}
.cella .box{display:block;margin:0 auto .8mm;width:4.4mm;height:4.4mm}
.motivi{margin-top:1.5mm;font-size:10pt}.motivi span{display:block;margin-bottom:1.6mm}
.ind-nota{margin-top:4mm;font-size:8.5pt;color:var(--soft)}
.dopo-griglia{display:grid;grid-template-columns:96mm 1fr;gap:8mm}
.segno{position:absolute;top:148.5mm;width:6mm;border-top:0.6px solid #9AA3B2}
.segno.sx{left:0}.segno.dx{right:0}

/* etichette delle scatole: 2 colonne x 5 righe, 95x55 mm */
.pag-etic{display:grid;grid-template-columns:95mm 95mm;grid-auto-rows:55mm;padding:10mm;
          justify-content:center;align-content:start}
.etic{border:0.6px dashed #9AA3B2;display:flex;flex-direction:column}
.etic-banda{height:5mm;background:var(--g)}
.etic-corpo{padding:5mm 6mm}
.etic-t{display:flex;align-items:center;gap:3mm;font-size:20pt;font-weight:700;line-height:1}
.etic-d{font-size:9.5pt;color:var(--soft);margin-top:4mm;line-height:1.35}
"""


OGGETTI = [
    ("istruzioni-e-gruppi", "Istruzioni e gruppi", istruzioni),
    ("tessere-ruolo", "Tessere ruolo", fogli_tessere),
    ("scheda-gruppo", "Scheda del gruppo", scheda_completa),
    ("fogli-prima-dopo", "Foglio individuale prima e dopo", fogli_individuali),
    ("etichette-scatole", "Etichette delle scatole dei gruppi", etichette),
]


def documento(titolo, corpo):
    return (f'<!doctype html><html lang="it"><head><meta charset="utf-8">'
            f'<title>Progetto 16. {titolo}</title><style>{css()}</style></head>'
            f'<body>{corpo}</body></html>')


if __name__ == "__main__":
    from weasyprint import HTML
    out = HERE / "pdf"
    out.mkdir(exist_ok=True)
    for vecchio in out.glob("*.pdf"):
        vecchio.unlink()
    for nome, titolo, fn in OGGETTI:
        HTML(string=documento(titolo, fn()), base_url=str(HERE)).write_pdf(out / f"{nome}.pdf")
        print("ok:", out / f"{nome}.pdf")
