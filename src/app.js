// ═══════════════════════════════════════════════════════════════════
//  Cascos Update — Application Logic
//  Cormach · Listino Manager 2026
// ═══════════════════════════════════════════════════════════════════

'use strict';

// ── STATE ────────────────────────────────────────────────────────
let rawData      = [];   // parsed rows from Excel
let calcData     = [];   // rows enriched with computed prices
let categories   = {};   // { catName: { t: transport } }
let activeFilter = 'Tutti';
let sortCol      = null;
let sortDir      = 1;

// ── CATEGORY CONFIG ───────────────────────────────────────────────
// Default transport (€) and colour per category
const CAT_CFG = {
  '2 Col. con Pedana':      { t: 100,  col: '#3b82f6' },
  '2 Col. senza Pedana':    { t: 100,  col: '#60a5fa' },
  'Parking / Monocolonna':  { t: 100,  col: '#818cf8' },
  'Tavolo VE':              { t: 100,  col: '#a78bfa' },
  'Tamponi':                { t: 0,    col: '#34d399' },
  'Accessori 2 Col.':       { t: 0,    col: '#6ee7b7' },
  '4 Colonne':              { t: 750,  col: '#f59e0b' },
  'Accessori 4 Col.':       { t: 0,    col: '#fbbf24' },
  'Forbice':                { t: 500,  col: '#f472b6' },
  'Accessori Forbice':      { t: 0,    col: '#f9a8d4' },
  'Traverse':               { t: 0,    col: '#fb923c' },
  'Traversa Oleo':          { t: 100,  col: '#fdba74' },
  'Tavolo Moto':            { t: 100,  col: '#4ade80' },
  'Servizio Gomme':         { t: 100,  col: '#86efac' },
  'Ancoraggi':              { t: 0,    col: '#94a3b8' },
  'Colori Personalizzati':  { t: 0,    col: '#64748b' },
};

function cfgOf(cat) { return CAT_CFG[cat] || { t: 0, col: '#4a5568' }; }

// ── CATEGORY DETECTION PATTERNS ───────────────────────────────────
const CAT_PATTERNS = [
  { p: /DUE COLONNE CON PEDANA/i,                    c: '2 Col. con Pedana'     },
  { p: /DUE COLONNE SENZA PEDANA/i,                  c: '2 Col. senza Pedana'   },
  { p: /PARKING|MONOCOLONNA/i,                       c: 'Parking / Monocolonna' },
  { p: /TAVOLO.*(?:BATTER|VE|ELEV)/i,               c: 'Tavolo VE'             },
  { p: /TAMPONI INTERCAMBIABILI/i,                   c: 'Tamponi'               },
  { p: /ACCESORI DUE COLON/i,                        c: 'Accessori 2 Col.'      },
  { p: /(?:QUATTRO|4) COLONNE/i,                     c: '4 Colonne'             },
  { p: /ACCESSORI (?:QUATTRO|4)/i,                   c: 'Accessori 4 Col.'      },
  { p: /(?:DOPPIA )?FORBICE(?! A PEDANA)|TIJERAS/i,  c: 'Forbice'              },
  { p: /FORBICE A PEDANA/i,                          c: 'Forbice'               },
  { p: /ACCESSORI (?:DOPPIA )?FORBICE/i,             c: 'Accessori Forbice'     },
  { p: /^TRAVERSE$/i,                                c: 'Traverse'              },
  { p: /OLEOPNEUMATICHE/i,                           c: 'Traversa Oleo'         },
  { p: /TAVOLO MOTO/i,                               c: 'Tavolo Moto'           },
  { p: /SERVIZIO GOMME|FORBICE A BASSA/i,            c: 'Servizio Gomme'        },
  { p: /ANCORAGGI/i,                                 c: 'Ancoraggi'             },
  { p: /COLORI PERSONALIZZATI|SUPPLEMENTO COLORI/i,  c: 'Colori Personalizzati' },
];

const SKIP_REFS = new Set([
  'Ref.','Fabbrica','Fábrica','ref+VAR','-','Accesorios','Gatos',
  'C1690501001','C1690321018','C1690401028','C1690401013',
]);

// ═══════════════════════════════════════════════════════════════════
//  DOM REFS
// ═══════════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);

// ═══════════════════════════════════════════════════════════════════
//  FILE HANDLING
// ═══════════════════════════════════════════════════════════════════
function initDropZone() {
  const dz = $('dropZone');
  const fi = $('fileInput');
  if (!dz || !fi) return;

  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('over');
    handleFile(e.dataTransfer.files[0]);
  });
  fi.addEventListener('change', e => handleFile(e.target.files[0]));
}

function handleFile(file) {
  if (!file) return;
  if (!file.name.match(/\.xlsx?$/i)) {
    showStatus('Formato non supportato. Usa .xlsx o .xls', 'warn');
    return;
  }
  showStatus('<span class="spin"></span>&nbsp;Lettura file in corso…', 'info');

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const sheetName =
        wb.SheetNames.find(n => /hoja1/i.test(n) || /listino/i.test(n))
        || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      parseRows(XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }), file.name);
    } catch (err) {
      showStatus('Errore lettura file: ' + err.message, 'warn');
    }
  };
  reader.readAsArrayBuffer(file);
}

// ═══════════════════════════════════════════════════════════════════
//  PARSING
// ═══════════════════════════════════════════════════════════════════
function parseRows(rows, filename) {
  rawData = [];
  let currentCat = 'Altro';
  let inMisti    = false;

  for (const row of rows) {
    // Detect ORDINI MISTI section
    if (row.some(c => c && /PREZZI ORDINI MISTI/i.test(String(c)))) {
      inMisti = true;
    }

    // Detect category from first non-null cell
    const firstTxt = String(row.find(c => c != null && String(c).trim() !== '') || '');
    for (const { p, c } of CAT_PATTERNS) {
      if (p.test(firstTxt)) { currentCat = c; break; }
    }

    const ref    = row[1];
    const model  = row[2];
    const cap    = row[3];
    const priceE = row[4];
    const priceF = row[5];

    if (!ref) continue;
    const refStr = String(ref).trim();
    if (!refStr || SKIP_REFS.has(refStr)) continue;
    // Skip long non-numeric strings (section headers slipping through)
    if (refStr.length > 20 && !/^\d/.test(refStr)) continue;

    const numE = typeof priceE === 'number' ? priceE : null;
    const numF = typeof priceF === 'number' ? priceF : null;
    if (numE === null && numF === null) continue;

    rawData.push({
      ref:     refStr,
      model:   model ? String(model) : '',
      cap:     cap   ? String(cap)   : '',
      cat:     currentCat,
      priceE:  numE,
      priceF:  numF,
      isMisti: inMisti,
    });
  }

  if (!rawData.length) {
    showStatus('Nessun prodotto trovato. Verifica il formato del file.', 'warn');
    return;
  }

  // ── Set up file-loaded UI
  $('uploadArea').innerHTML = `
    <div class="file-loaded">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <span class="fn" title="${filename}">${filename}</span>
      <button class="btn-remove" onclick="resetAll()" title="Rimuovi file">✕</button>
    </div>`;

  // ── Init categories
  const cats = [...new Set(rawData.map(r => r.cat))];
  categories = {};
  cats.forEach(c => { categories[c] = { t: cfgOf(c).t }; });

  buildTransportFields(cats);
  updateFormula();

  $('transportCard').style.display  = '';
  $('marginCard').style.display     = '';
  $('actionDivider').style.display  = '';
  $('actionCard').style.display     = '';
  $('topbar').style.display         = '';

  setPill(1, 'done');
  setPill(2, 'active');

  const misti  = rawData.filter(r => r.isMisti).length;
  const std    = rawData.length - misti;
  showStatus(
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#86efac" stroke-width="2.5">
       <polyline points="20 6 9 17 4 12"/></svg>
     &nbsp;${rawData.length} prodotti · ${cats.length} categorie
     · <span style="color:var(--muted2)">${std} standard</span>
     + <span style="color:var(--muted2)">${misti} ordini misti</span>`,
    'success'
  );

  renderTable();
}

// ═══════════════════════════════════════════════════════════════════
//  TRANSPORT FIELDS
// ═══════════════════════════════════════════════════════════════════
function buildTransportFields(cats) {
  const el = $('transportFields');
  el.innerHTML = cats.map((cat, i) => {
    const col = cfgOf(cat).col;
    const val = categories[cat].t;
    const safe = cat.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    return `
      <div class="transport-row">
        <span class="cat-dot" style="background:${col}"></span>
        <span class="cat-label" title="${safe}">${cat}</span>
        <input type="number" class="num-input" data-cat="${safe}"
          value="${val}" min="0" step="10">
        <span class="unit-tag">€</span>
      </div>`;
  }).join('');

  // Delegated listener — avoids broken onchange with quotes in cat names
  el.oninput = e => {
    const input = e.target.closest('input[data-cat]');
    if (!input) return;
    const cat = input.dataset.cat;
    if (categories[cat] !== undefined) categories[cat].t = +input.value;
  };
}

// ═══════════════════════════════════════════════════════════════════
//  MARGIN / FORMULA
// ═══════════════════════════════════════════════════════════════════
function syncMargin(which, source) {
  // source: 'range' or 'number'
  if (which === 'mc') {
    const range = $('mcRange'), num = $('mcNum');
    if (!range || !num) return;
    if (source === 'range') { num.value   = parseFloat(range.value).toFixed(1); }
    else                    { range.value = num.value; }
  } else {
    const range = $('discRange'), num = $('discNum');
    if (!range || !num) return;
    if (source === 'range') { num.value   = parseFloat(range.value).toFixed(1); }
    else                    { range.value = num.value; }
  }
  updateFormula();
}

function updateFormula() {
  const mc   = $('mcNum')   ? parseFloat($('mcNum').value)   : 20;
  const disc = $('discNum') ? parseFloat($('discNum').value) : 60;
  const el = $('formulaPreview');
  if (!el) return;
  el.innerHTML = `
    <span class="f-head">Formule Calcolo</span>
    <span class="f-var">Base</span> = Acq. <span class="f-op">+</span> Trasp.<br>
    <span class="f-var">Netto Riv.</span> = <span class="f-fn">ARROTONDA</span>(Base <span class="f-op">/</span> (1<span class="f-op">−</span><span class="f-var">${mc}%</span>), −10)<br>
    <span class="f-var">Lordo Riv.</span> = <span class="f-fn">ARROTONDA</span>(Netto <span class="f-op">/</span> (1<span class="f-op">−</span><span class="f-var">${disc}%</span>), −10)`;
}

// ═══════════════════════════════════════════════════════════════════
//  CALCULATION
// ═══════════════════════════════════════════════════════════════════
function runCalc() {
  if (!rawData.length) return;

  const mc   = parseFloat($('mcNum').value)   / 100;
  const disc = parseFloat($('discNum').value) / 100;

  function calc(base, transport) {
    if (base === null) return null;
    const withT  = base + transport;
    const netto  = Math.ceil(withT  / (1 - mc)   / 10) * 10;
    const lordo  = Math.ceil(netto  / (1 - disc)  / 10) * 10;
    return { withT, netto, lordo };
  }

  calcData = rawData.map(r => {
    const t = (categories[r.cat] || { t: 0 }).t;
    return {
      ...r,
      transport: t,
      cE: calc(r.priceE, t),
      cF: calc(r.priceF, t),
    };
  });

  buildFilterChips();
  renderTable();

  $('exportBtn').disabled = false;
  $('statRows').textContent = calcData.length;
  $('statNew').textContent  = calcData.filter(r => !r.isMisti).length;

  setPill(2, 'done');
  setPill(3, 'done');
  setPill(4, 'done');
  setPill(5, 'active');
}

// ═══════════════════════════════════════════════════════════════════
//  TABLE RENDERING
// ═══════════════════════════════════════════════════════════════════
function buildFilterChips() {
  const cats = ['Tutti', ...new Set(calcData.map(r => r.cat))];
  const el = $('filterChips');
  el.innerHTML = cats
    .map(c => {
      const active = c === activeFilter ? 'active' : '';
      // Use data-cat attribute — avoids broken onclick with quotes inside HTML attr
      const safe = c.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
      return `<div class="chip ${active}" data-cat="${safe}">${c}</div>`;
    })
    .join('');

  // Single delegated listener — replaces old per-chip onclick
  el.onclick = e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    setFilter(chip.dataset.cat);
  };
}

function setFilter(cat) {
  activeFilter = cat;
  buildFilterChips();
  renderTable();
}

function getFiltered() {
  const q   = ($('searchInput')?.value || '').toLowerCase().trim();
  let   src = calcData.length ? calcData
            : rawData.map(r => ({ ...r, transport: 0, cE: null, cF: null }));

  if (activeFilter !== 'Tutti') src = src.filter(r => r.cat === activeFilter);
  if (q) src = src.filter(r =>
    r.ref.toLowerCase().includes(q) || r.model.toLowerCase().includes(q)
  );
  return src;
}

function fmt(n) {
  if (n == null) return '<span class="td-num na">—</span>';
  return n.toLocaleString('it-IT');
}

function renderTable() {
  const data    = getFiltered();
  const wrap    = $('tableWrap');
  const hasF    = data.some(r => r.priceF != null);
  const hasCalc = data.some(r => r.cE   != null);

  $('statRows').textContent = data.length;

  if (!data.length) {
    wrap.innerHTML = `
      <div class="empty">
        <div class="empty-title">Nessun risultato</div>
        <div class="empty-sub">Modifica la ricerca o il filtro categoria.</div>
      </div>`;
    return;
  }

  // ── Build header ───────────────────────────────────────────────
  let h = '<table>';

  // Column group header row (only when calc is done)
  if (hasCalc) {
    const nCols = 4 + (hasF ? 2 : 1) + 1 + (hasF ? 2 : 1) + (hasF ? 2 : 1);
    h += `<thead>
      <tr class="col-group">
        <th colspan="4"></th>
        <th colspan="${hasF ? 2 : 1}">Acquisto</th>
        <th>Trasp.</th>
        <th colspan="${hasF ? 2 : 1}" class="g-netto">Netto Riv.</th>
        <th colspan="${hasF ? 2 : 1}" class="g-lordo">Lordo Riv.</th>
      </tr>`;
  } else {
    h += '<thead>';
  }

  h += `<tr>
    <th onclick="doSort('ref')">Riferimento</th>
    <th onclick="doSort('model')">Modello</th>
    <th onclick="doSort('cat')">Categoria</th>
    <th onclick="doSort('cap')">Portata</th>
    <th class="td-num" onclick="doSort('priceE')">${hasF ? 'Acq. C/P' : 'Acquisto'}</th>`;
  if (hasF) h += `<th class="td-num" onclick="doSort('priceF')">Acq. S/P</th>`;
  if (hasCalc) {
    h += `<th class="td-num" onclick="doSort('transport')">Trasp.</th>
      <th class="td-num">${hasF ? 'Netto C/P' : 'Netto Riv.'}</th>`;
    if (hasF) h += `<th class="td-num">Netto S/P</th>`;
    h += `<th class="td-num">${hasF ? 'Lordo C/P' : 'Lordo Riv.'}</th>`;
    if (hasF) h += `<th class="td-num">Lordo S/P</th>`;
  }
  h += '</tr></thead><tbody>';

  // ── Build rows ──────────────────────────────────────────────────
  for (const r of data) {
    const col     = cfgOf(r.cat).col;
    const mistiTag = r.isMisti
      ? `<span class="sec-badge misti" title="Ordini Misti 9-12+ ponti">MISTI</span>`
      : '';

    h += `<tr>
      <td class="td-ref">${r.ref}${mistiTag}</td>
      <td class="td-model" title="${r.model.replace(/"/g,'&quot;')}">${r.model}</td>
      <td>
        <span class="cat-badge"
              style="background:${col}1a;color:${col};border:1px solid ${col}44">
          <span class="dot" style="background:${col}"></span>${r.cat}
        </span>
      </td>
      <td class="td-cap">${r.cap}</td>
      <td class="td-num acq">${r.priceE != null ? fmt(r.priceE) : '<span class="td-num na">—</span>'}</td>`;

    if (hasF)
      h += `<td class="td-num acq">${r.priceF != null ? fmt(r.priceF) : '<span class="td-num na">—</span>'}</td>`;

    if (hasCalc) {
      h += `<td class="td-num transp">${fmt(r.transport)}</td>
        <td class="td-num netto">${r.cE ? fmt(r.cE.netto) : '<span class="td-num na">—</span>'}</td>`;
      if (hasF)
        h += `<td class="td-num netto">${r.cF ? fmt(r.cF.netto) : '<span class="td-num na">—</span>'}</td>`;
      h += `<td class="td-num lordo">${r.cE ? fmt(r.cE.lordo) : '<span class="td-num na">—</span>'}</td>`;
      if (hasF)
        h += `<td class="td-num lordo">${r.cF ? fmt(r.cF.lordo) : '<span class="td-num na">—</span>'}</td>`;
    }
    h += '</tr>';
  }

  h += '</tbody></table>';
  wrap.innerHTML = h;
}

function doSort(col) {
  if (sortCol === col) sortDir *= -1;
  else { sortCol = col; sortDir = 1; }

  const src = calcData.length ? calcData : rawData;
  src.sort((a, b) => {
    let va = a[col], vb = b[col];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va == null) return 1;
    if (vb == null) return -1;
    return (va < vb ? -1 : va > vb ? 1 : 0) * sortDir;
  });
  renderTable();
}

// ═══════════════════════════════════════════════════════════════════
//  EXPORT
// ═══════════════════════════════════════════════════════════════════
function exportXLSX() {
  if (!calcData.length) return;

  const mc   = $('mcNum').value;
  const disc = $('discNum').value;
  const date = new Date().toLocaleDateString('it-IT');
  const hasF = calcData.some(r => r.priceF != null);

  // ── Sheet 1: Listino Completo
  const hdr1 = [
    'Sezione','Riferimento','Modello','Portata','Categoria',
    'Trasporto (€)','P.Acq. C/Pedana (€)',
  ];
  if (hasF) hdr1.push('P.Acq. S/Pedana (€)');
  hdr1.push('Netto Riv. C/P (€)');
  if (hasF) hdr1.push('Netto Riv. S/P (€)');
  hdr1.push('Lordo Riv. C/P (€)');
  if (hasF) hdr1.push('Lordo Riv. S/P (€)');

  const aoa1 = [
    [`LISTINO CASCOS 2026 — Prezzi Rivenditori Cormach`],
    [`MC%: ${mc}% · Sconto Lordo: ${disc}% · Generato: ${date}`],
    [],
    hdr1,
  ];

  for (const r of calcData) {
    const row = [
      r.isMisti ? 'ORDINI MISTI' : 'STANDARD',
      r.ref, r.model, r.cap, r.cat, r.transport, r.priceE,
    ];
    if (hasF) row.push(r.priceF);
    row.push(r.cE?.netto ?? null);
    if (hasF) row.push(r.cF?.netto ?? null);
    row.push(r.cE?.lordo ?? null);
    if (hasF) row.push(r.cF?.lordo ?? null);
    aoa1.push(row);
  }

  // ── Sheet 2: Netti Rivenditori (standard only)
  const aoa2 = [
    ['LISTINO NETTI RIVENDITORI CASCOS 2026'],
    [`MC%: ${mc}% · ${date}`], [],
    ['Riferimento','Modello','Portata','Categoria','Netto Riv. (€)'],
  ];
  calcData.filter(r => !r.isMisti && r.cE).forEach(r =>
    aoa2.push([r.ref, r.model, r.cap, r.cat, r.cE.netto])
  );

  // ── Sheet 3: Lordi Rivenditori
  const aoa3 = [
    ['LISTINO LORDO RIVENDITORI CASCOS 2026'],
    [`Applicando sconto ${disc}% al lordo → P. netto riv. · ${date}`], [],
    ['Riferimento','Modello','Portata','Categoria',`Lordo Riv. (€)`,`Netto Riv. (€)`],
  ];
  calcData.filter(r => !r.isMisti && r.cE).forEach(r =>
    aoa3.push([r.ref, r.model, r.cap, r.cat, r.cE.lordo, r.cE.netto])
  );

  // ── Sheet 4: Ordini Misti
  const aoa4 = [
    ['PREZZI ORDINI MISTI CASCOS 2026 (9-12+ ponti)'],
    [`MC%: ${mc}% · ${date}`], [],
    ['Riferimento','Modello','Portata','Categoria','P.Acq. (€)','Netto Riv. (€)','Lordo Riv. (€)'],
  ];
  calcData.filter(r => r.isMisti && r.cE).forEach(r =>
    aoa4.push([r.ref, r.model, r.cap, r.cat, r.priceE, r.cE.netto, r.cE.lordo])
  );

  // ── Build workbook
  const wb = XLSX.utils.book_new();
  [
    [aoa1, 'Listino Completo',  [12,14,44,8,24,10,16,22,22]],
    [aoa2, 'Netti Rivenditori', [14,44,8,24,22]],
    [aoa3, 'Lordi Rivenditori', [14,44,8,24,16,22]],
    [aoa4, 'Ordini Misti',      [14,44,8,24,14,22,22]],
  ].forEach(([aoa, name, widths]) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = widths.map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  const fname = `Cascos_Rivenditori_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fname);
  setPill(5, 'done');
}

// ═══════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════
function showStatus(msg, type) {
  $('statusMsg').innerHTML = `<div class="banner banner-${type}">${msg}</div>`;
}

function setPill(n, state) {
  const el = $('pill' + n);
  if (!el) return;
  el.className = 'step-pill ' + state;
  const num = el.querySelector('.step-num');
  if (!num) return;
  if (state === 'done') num.textContent = '✓';
  else num.textContent = String(n);
}

function resetAll() {
  rawData = []; calcData = []; categories = {};
  window.location.reload();
}

// ═══════════════════════════════════════════════════════════════════
//  THEME (dark / light)
// ═══════════════════════════════════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem('cascos-theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cascos-theme', theme);
  const btn = $('themeToggle');
  if (!btn) return;
  btn.title = theme === 'dark' ? 'Passa a modalità giorno' : 'Passa a modalità notte';
  btn.innerHTML = theme === 'dark'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <circle cx="12" cy="12" r="5"/>
         <line x1="12" y1="1"  x2="12" y2="3"/>
         <line x1="12" y1="21" x2="12" y2="23"/>
         <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
         <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
         <line x1="1" y1="12" x2="3" y2="12"/>
         <line x1="21" y1="12" x2="23" y2="12"/>
         <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
         <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
       </svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
       </svg>`;
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ═══════════════════════════════════════════════════════════════════
//  ONLINE / OFFLINE INDICATOR
// ═══════════════════════════════════════════════════════════════════
function updateOnlineStatus() {
  const badge = $('offlineBadge');
  if (!badge) return;
  if (navigator.onLine) {
    badge.classList.remove('visible');
  } else {
    badge.classList.add('visible');
  }
}

// ═══════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDropZone();
  updateFormula();
  updateOnlineStatus();
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[SW] Registered, scope:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  }
});

// ── Expose to HTML onclick handlers ──────────────────────────────
window.handleFile       = handleFile;
window.syncMargin       = syncMargin;
window.runCalc          = runCalc;
window.exportXLSX       = exportXLSX;
window.setFilter        = setFilter;
window.doSort           = doSort;
window.resetAll         = resetAll;
window.toggleTheme      = toggleTheme;
