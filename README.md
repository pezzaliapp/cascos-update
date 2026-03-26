# Cascos Update

**Cormach · Gestione Listino Cascos 2026**

Applicazione web PWA per il calcolo dei prezzi di vendita ai rivenditori Cormach sui prodotti Cascos.

---

## Struttura progetto

```
cascos-update/
├── index.html          ← Markup HTML (entry point)
├── src/
│   ├── style.css       ← Tutti gli stili
│   └── app.js          ← Tutta la logica applicativa
├── sw.js               ← Service Worker (PWA / offline)
├── manifest.json       ← Web App Manifest
├── README.md
└── public/
    ├── icon.svg        ← Icona vettoriale (car lift + freccia update)
    ├── favicon.ico     ← Favicon multi-size (16/32/48 px)
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    ├── icon-192.png    ← PWA home screen icon
    └── icon-512.png    ← PWA splash screen icon
```

---

## Funzionalità

| Feature | Dettaglio |
|---|---|
| **Carica Excel** | Drag & drop o click — .xlsx / .xls |
| **Trasporto per categoria** | Costo default modificabile per ogni categoria |
| **MC% slider** | Marginalità applicata al prezzo netto rivenditore |
| **Sconto Lordo slider** | Default 60% → Lordo ÷ (1−60%) = Netto riv. |
| **Sezione Ordini Misti** | Prezzi 9-12+ ponti gestiti separatamente (badge MISTI) |
| **Con/senza pedana** | Colonne E e F elaborate indipendentemente |
| **Esporta Excel** | 4 fogli: Listino Completo, Netti, Lordi, Ordini Misti |
| **PWA offline** | Service Worker cachea tutti gli asset dopo il primo carico |

---

## Formula prezzi

```
Base       = Prezzo Acquisto + Trasporto categoria
Netto Riv. = ARROTONDA(Base / (1 − MC%), −10)
Lordo Riv. = ARROTONDA(Netto / (1 − Sconto%), −10)
```

---

## Deploy su GitHub Pages

1. Fork questo repository
2. **Settings → Pages → Branch: main → / (root)**
3. App disponibile su `https://[username].github.io/cascos-update`

### Test locale

```bash
python3 -m http.server 8080
# oppure
npx serve .
```

> ⚠️ Il Service Worker richiede un server HTTP — non funziona aprendo `index.html` direttamente come `file://`. Per uso locale senza server il resto dell'app funziona comunque.

---

## Categorie e trasporti default

| Categoria | Trasporto (€) |
|---|---|
| 2 Col. con Pedana | 100 |
| 2 Col. senza Pedana | 100 |
| Parking / Monocolonna | 100 |
| Tavolo VE | 100 |
| Tamponi | 0 |
| Accessori 2 Col. | 0 |
| 4 Colonne | 750 |
| Accessori 4 Col. | 0 |
| Forbice | 500 |
| Accessori Forbice | 0 |
| Traverse | 0 |
| Traversa Oleo | 100 |
| Tavolo Moto | 100 |
| Servizio Gomme | 100 |
| Ancoraggi | 0 |
| Colori Personalizzati | 0 |

Tutti modificabili prima del calcolo.

---

© Cormach — Uso interno
