# Cascos Update

**Cormach · Gestione Listino Cascos 2026**

Applicazione web PWA per il calcolo dei prezzi di vendita ai rivenditori Cormach.
Funziona nel browser — nessuna installazione, nessun server richiesto.

---

## File da scaricare

Scarica tutti questi file e mettili nella stessa cartella:

```
cascos-update/          ← crea questa cartella
├── index.html          ← questo file
├── manifest.json       ← questo file  
├── sw.js               ← questo file
├── README.md           ← questo file
├── src/                ← crea questa sottocartella
│   ├── app.js          ← questo file dentro src/
│   └── style.css       ← questo file dentro src/
└── public/             ← cartella con le icone (dallo ZIP)
```

> **Più semplice:** scarica direttamente `cascos-update.zip`,
> estrailo e hai già tutto nella struttura corretta.

---

## Come avviare l'app

### Opzione A — Apri direttamente nel browser (più semplice)
1. Estrai lo ZIP
2. Apri `index.html` con Chrome, Firefox, Safari o Edge
3. L'app funziona subito ✅
   *(Il Service Worker offline non si attiva con `file://`, ma tutto il resto sì)*

### Opzione B — Server locale (consigliato, attiva anche il PWA offline)
```bash
# Con Python (installato di default su Mac e Linux)
cd cascos-update
python3 -m http.server 8080

# Apri nel browser: http://localhost:8080
```

```bash
# Con Node.js
cd cascos-update
npx serve .

# Apri nel browser: http://localhost:3000
```

---

## Deploy su GitHub Pages (accesso da qualsiasi browser)

```bash
# 1. Crea un repository su github.com col nome "cascos-update"

# 2. Dal terminale nella cartella del progetto:
git init
git add .
git commit -m "Cascos Update 2026 — initial release"
git remote add origin https://github.com/TUO-USERNAME/cascos-update.git
git push -u origin main

# 3. Su GitHub.com:
#    Settings → Pages → Source: Deploy from branch
#    Branch: main → / (root) → Save

# 4. L'app sarà disponibile su:
#    https://TUO-USERNAME.github.io/cascos-update
```

---

## Come usare l'app

### Passo 1 — Carica il listino Excel
- Trascina il file `.xlsx` nell'area upload oppure clicca per sfogliare
- Compatibile con i listini Cascos formato 2024 e 2026
- L'app rileva automaticamente tutte le categorie prodotto

### Passo 2 — Imposta i costi di trasporto
- Per ogni categoria apparirà un campo modificabile (€)
- I valori di default sono preimpostati per categoria (es. 4 Colonne = €750)

### Passo 3 — Imposta la marginalità
- **MC%** (slider 5–60%): margine applicato al prezzo di acquisto
  → `Netto Rivenditore = ARROTONDA(Base / (1 − MC%), −10)`
- **Sconto Lordo** (slider 20–80%, default 60%): sconto applicato al lordo
  → `Lordo Rivenditore = ARROTONDA(Netto / (1 − 60%), −10)`
  → Applicando 60% di sconto al lordo si ottiene il netto rivenditore Cormach

### Passo 4 — Calcola i prezzi
- Clicca **CALCOLA PREZZI**
- La tabella mostra per ogni prodotto:
  - Prezzo acquisto (con pedana / senza pedana)
  - Costo trasporto applicato
  - **Prezzo netto rivenditore** (verde)
  - **Prezzo lordo rivenditore** (blu)
- I prodotti con badge `MISTI` sono prezzi ordini da 9-12+ ponti
- Usa la ricerca e i filtri per categoria per navigare

### Passo 5 — Esporta
- Clicca **ESPORTA EXCEL**
- Genera un file `.xlsx` con 4 fogli:
  1. **Listino Completo** — tutti i prodotti con tutti i prezzi
  2. **Netti Rivenditori** — solo prezzi netti (standard)
  3. **Lordi Rivenditori** — prezzi lordi con sconto corrispondente
  4. **Ordini Misti** — prezzi speciali per ordini 9-12+ ponti

---

## Formula prezzi

```
Prezzo Base    = Prezzo Acquisto Cascos + Costo Trasporto categoria
Netto Riv.     = ARROTONDA(Base   / (1 − MC%),    −10)  ← arrotonda a €10
Lordo Riv.     = ARROTONDA(Netto  / (1 − Sconto%), −10)
```

**Verifica:** Lordo Riv. × (1 − 60%) = Netto Riv. = Prezzo acquisto Cormach

---

## Struttura tecnica del progetto

```
cascos-update/
├── index.html       HTML puro (entry point, zero JS/CSS inline)
├── src/
│   ├── app.js       Logica completa: parsing Excel, calcolo prezzi, rendering tabella
│   └── style.css    Design system: variabili CSS, componenti, responsive
├── sw.js            Service Worker: cache offline di tutti gli asset
├── manifest.json    PWA Web App Manifest (icone, tema, nome)
└── public/
    ├── icon.svg     Icona vettoriale (sollevatore 2 colonne + freccia update)
    ├── favicon.ico  Multi-size 16/32/48px
    ├── icon-192.png Icona PWA
    └── icon-512.png Icona PWA grande
```

---

## Trasporti default per categoria

| Categoria              | Trasporto default |
|------------------------|:-----------------:|
| 2 Col. con Pedana      | € 100             |
| 2 Col. senza Pedana    | € 100             |
| Parking / Monocolonna  | € 100             |
| Tavolo VE              | € 100             |
| Tamponi                | € 0               |
| Accessori 2 Col.       | € 0               |
| 4 Colonne              | € 750             |
| Accessori 4 Col.       | € 0               |
| Forbice                | € 500             |
| Accessori Forbice      | € 0               |
| Traverse               | € 0               |
| Traversa Oleo          | € 100             |
| Tavolo Moto            | € 100             |
| Servizio Gomme         | € 100             |
| Ancoraggi              | € 0               |
| Colori Personalizzati  | € 0               |

Tutti i valori sono modificabili prima del calcolo.

---

## Note tecniche

- **Nessuna dipendenza server** — tutto il codice gira nel browser
- **Libreria XLSX** caricata da CDN (cdnjs.cloudflare.com), messa in cache dal Service Worker
- **Caratteri** Google Fonts (Syne, JetBrains Mono, Outfit), messi in cache offline
- **Compatibilità** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

© Cormach — Uso interno
