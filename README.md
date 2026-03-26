# Cascos Update

**Cormach · Gestione Listino Cascos**

Applicazione web PWA per la gestione del listino prezzi rivenditori.
Funziona nel browser — nessuna installazione, nessun server richiesto.

> ⚠️ **Uso interno Cormach — Documento riservato.**
> Non distribuire a terzi.

---

## File del progetto

```
cascos-update/
├── index.html          ← entry point (HTML strutturale)
├── manifest.json       ← PWA manifest
├── sw.js               ← Service Worker (cache offline)
├── README.md
├── src/
│   ├── app.js          ← logica applicativa
│   └── style.css       ← stili
└── public/
    ├── icon.svg
    ├── favicon.ico
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    ├── icon-192.png
    └── icon-512.png
```

> **Più semplice:** estrai `cascos-update.zip` — struttura già corretta.

---

## Come avviare l'app

### Opzione A — Apri direttamente nel browser
1. Estrai lo ZIP
2. Apri `index.html` con Chrome, Firefox, Safari o Edge
3. L'app funziona subito ✅
   *(Il Service Worker non si attiva con `file://`, ma tutto il resto sì)*

### Opzione B — Server locale (attiva anche il PWA offline)

```bash
# Con Python (preinstallato su Mac e Linux)
cd cascos-update
python3 -m http.server 8080
# → apri http://localhost:8080
```

```bash
# Con Node.js
cd cascos-update
npx serve .
# → apri http://localhost:3000
```

---

## Deploy su GitHub Pages

```bash
# 1. Crea un repository su github.com (es. "cascos-update")

# 2. Dal terminale nella cartella del progetto:
git init
git add .
git commit -m "Cascos Update — initial release"
git remote add origin https://github.com/TUO-USERNAME/cascos-update.git
git push -u origin main

# 3. Su GitHub.com:
#    Settings → Pages → Source: Deploy from branch
#    Branch: main → / (root) → Save

# 4. App disponibile su:
#    https://TUO-USERNAME.github.io/cascos-update
```

> Rendere il repository **privato** se il progetto non deve essere pubblico:
> Settings → General → Change repository visibility → Private

---

## Come usare l'app

### Passo 1 — Carica il listino Excel
- Trascina il file `.xlsx` nell'area upload oppure clicca per sfogliare
- Compatibile con i listini Cascos 2024 e 2026
- L'app rileva automaticamente tutte le categorie prodotto

### Passo 2 — Imposta i costi di trasporto
- Per ogni categoria appare un campo modificabile
- I valori di default sono preimpostati internamente
- Verificare con l'ufficio acquisti prima del calcolo

### Passo 3 — Imposta la marginalità
- **MC%** (slider): margine applicato per ottenere il prezzo netto rivenditore
- **Sconto Lordo** (slider): percentuale di sconto da applicare al prezzo lordo
- I valori predefiniti sono quelli in uso — modificare solo se autorizzati

### Passo 4 — Calcola i prezzi
- Clicca **CALCOLA PREZZI**
- La tabella mostra per ogni prodotto: prezzo acquisto, trasporto, prezzo netto e lordo rivenditore
- I prodotti con badge `MISTI` sono prezzi per ordini multipli (9-12+ ponti)
- Usa ricerca e filtri per navigare tra le categorie

### Passo 5 — Esporta
- Clicca **ESPORTA EXCEL**
- Genera un file `.xlsx` con 4 fogli:
  1. **Listino Completo** — tutti i prodotti con tutti i prezzi
  2. **Netti Rivenditori** — prezzi netti standard
  3. **Lordi Rivenditori** — prezzi lordi con sconto corrispondente
  4. **Ordini Misti** — prezzi per ordini da 9-12+ ponti

---

## Struttura tecnica

| File | Contenuto |
|---|---|
| `index.html` | HTML strutturale puro — zero JS/CSS inline |
| `src/app.js` | Parsing Excel, calcolo prezzi, rendering tabella |
| `src/style.css` | Design system, variabili CSS, layout responsive |
| `sw.js` | Service Worker per caching offline (PWA) |
| `manifest.json` | Web App Manifest (icone, tema, nome) |

**Dipendenze esterne** (caricate da CDN, messe in cache offline dal SW):
- SheetJS — lettura e scrittura file Excel
- Google Fonts — tipografia

**Compatibilità:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

© Cormach — Uso interno riservato
