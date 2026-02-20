const THEME_PATH = 'themes/jahreszeiten.json';
const FOUNDATION_SLOTS = 5;
const TABLEAU_COLUMNS = 7;
const TABLEAU_BASE = 2;
const CARD_OFFSET = 28;

const state = {
  theme: null,
  groupsById: new Map(),
  tableau: [],
  stock: [],
  waste: [],
  foundations: [],
  selection: null,
  won: false,
};

const stockEl = document.getElementById('stock');
const wasteEl = document.getElementById('waste');
const foundationsEl = document.getElementById('foundations');
const tableauEl = document.getElementById('tableau');
const statusEl = document.getElementById('statusText');
const newGameBtn = document.getElementById('newGameBtn');

newGameBtn.addEventListener('click', () => startGame());
stockEl.addEventListener('click', onStockClick);
wasteEl.addEventListener('click', onWasteClick);

startGame();

async function startGame() {
  const themeData = await loadTheme(THEME_PATH);
  if (!themeData) {
    statusEl.textContent = 'Theme konnte nicht geladen werden.';
    return;
  }
  setupTheme(themeData);
  const deck = buildDeck(themeData);
  shuffle(deck);

  state.tableau = Array.from({ length: TABLEAU_COLUMNS }, () => []);
  state.stock = [];
  state.waste = [];
  state.foundations = Array.from({ length: FOUNDATION_SLOTS }, () => ({ cards: [] }));
  state.selection = null;
  state.won = false;

  let cursor = 0;
  for (let c = 0; c < TABLEAU_COLUMNS; c += 1) {
    const count = TABLEAU_BASE + c;
    for (let i = 0; i < count; i += 1) {
      const card = deck[cursor++];
      card.faceUp = i === count - 1;
      state.tableau[c].push(card);
    }
  }

  while (cursor < deck.length) {
    const card = deck[cursor++];
    card.faceUp = false;
    state.stock.push(card);
  }

  setStatus('Neues Spiel gestartet.');
  render();
}

async function loadTheme(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function setupTheme(theme) {
  state.theme = theme;
  state.groupsById.clear();
  theme.groups.forEach((g) => state.groupsById.set(g.id, g));
}

function buildDeck(theme) {
  let uidCounter = 1;
  const deck = [];
  theme.groups.forEach((group) => {
    deck.push({ uid: `c${uidCounter++}`, label: group.name, groupId: group.id, type: 'root', faceUp: false });
    group.items.forEach((item) => {
      deck.push({ uid: `c${uidCounter++}`, label: item, groupId: group.id, type: 'item', faceUp: false });
    });
  });
  return deck;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function onStockClick() {
  if (state.won) return;
  clearSelection();
  if (state.stock.length > 0) {
    const card = state.stock.pop();
    card.faceUp = true;
    state.waste.push(card);
    setStatus(`Karte auf Waste aufgedeckt: ${card.label}`);
  } else if (state.waste.length > 0) {
    state.stock = state.waste.slice().reverse().map((c) => ({ ...c, faceUp: false }));
    state.waste = [];
    setStatus('Waste wurde in den Stock zurückgedreht.');
  } else {
    setStatus('Stock ist leer.');
  }
  render();
}

function onWasteClick() {
  if (state.won || state.waste.length === 0) return;
  const top = state.waste[state.waste.length - 1];
  const next = { from: 'waste', cards: [top] };
  toggleOrSetSelection(next);
}

function onTableauColumnClick(colIndex) {
  if (state.won) return;
  if (state.selection) {
    if (state.selection.from === 'tableau' && state.selection.colIndex === colIndex) {
      clearSelection();
      render();
      return;
    }
    if (attemptMoveToTableau(colIndex)) {
      render();
      return;
    }
    const replacement = buildTableauSelection(colIndex);
    state.selection = replacement;
    render();
    return;
  }
  state.selection = buildTableauSelection(colIndex);
  render();
}

function onFoundationClick(slotIndex) {
  if (!state.selection || state.won) return;
  if (attemptMoveToFoundation(slotIndex)) {
    render();
  }
}

function buildTableauSelection(colIndex) {
  const col = state.tableau[colIndex];
  if (!col.length) return null;
  let i = col.length - 1;
  if (!col[i].faceUp) return null;

  const groupId = col[i].groupId;
  while (i - 1 >= 0 && col[i - 1].faceUp && col[i - 1].groupId === groupId) {
    i -= 1;
  }
  const cards = col.slice(i);
  return { from: 'tableau', colIndex, startIndex: i, cards };
}

function toggleOrSetSelection(nextSel) {
  if (!nextSel) {
    clearSelection();
    render();
    return;
  }
  if (state.selection && isSameSelection(state.selection, nextSel)) {
    clearSelection();
  } else {
    state.selection = nextSel;
  }
  render();
}

function isSameSelection(a, b) {
  if (!a || !b) return false;
  if (a.from !== b.from) return false;
  if (a.from === 'tableau') return a.colIndex === b.colIndex && a.startIndex === b.startIndex;
  return true;
}

function clearSelection() {
  state.selection = null;
}

function attemptMoveToTableau(targetColIndex) {
  const sel = state.selection;
  if (!sel) return false;
  const cards = sel.cards;
  const first = cards[0];
  const target = state.tableau[targetColIndex];

  if (sel.from === 'tableau' && sel.colIndex === targetColIndex) return false;

  if (target.length === 0) {
    // erlaubt
  } else {
    const top = target[target.length - 1];
    if (top.groupId !== first.groupId) return false;
    if (first.type === 'root') return false;
  }

  removeSelectedFromSource();
  cards.forEach((c) => {
    c.faceUp = true;
    target.push(c);
  });
  revealSourceTopIfNeeded(sel);
  clearSelection();
  setStatus('Zug auf Tableau durchgeführt.');
  checkWin();
  return true;
}

function attemptMoveToFoundation(slotIndex) {
  const sel = state.selection;
  if (!sel) return false;
  const cards = sel.cards;
  const first = cards[0];
  const slot = state.foundations[slotIndex];

  if (slot.cards.length === 0) {
    if (first.type !== 'root') return false;
  } else {
    const top = slot.cards[slot.cards.length - 1];
    if (top.groupId !== first.groupId) return false;
    if (first.type === 'root') return false;
  }

  removeSelectedFromSource();
  cards.forEach((c) => {
    c.faceUp = true;
    slot.cards.push(c);
  });

  revealSourceTopIfNeeded(sel);
  clearSelection();
  handleFoundationCompletion(slotIndex);
  setStatus('Auf Foundation gelegt.');
  checkWin();
  return true;
}

function removeSelectedFromSource() {
  const sel = state.selection;
  if (!sel) return;
  if (sel.from === 'waste') {
    state.waste.pop();
    return;
  }
  state.tableau[sel.colIndex].splice(sel.startIndex);
}

function revealSourceTopIfNeeded(sel) {
  if (!sel || sel.from !== 'tableau') return;
  const col = state.tableau[sel.colIndex];
  if (col.length > 0) col[col.length - 1].faceUp = true;
}

function handleFoundationCompletion(slotIndex) {
  const slot = state.foundations[slotIndex];
  if (!slot.cards.length) return;
  const groupId = slot.cards[0].groupId;
  const group = state.groupsById.get(groupId);
  if (!group) return;
  const itemCount = slot.cards.filter((c) => c.type === 'item').length;
  const hasRoot = slot.cards.some((c) => c.type === 'root');
  if (hasRoot && itemCount === group.items.length) {
    state.foundations[slotIndex] = { cards: [] };
    setStatus(`Kategorie vollständig gesammelt: ${group.name}`);
  }
}

function checkWin() {
  const tableauEmpty = state.tableau.every((col) => col.length === 0);
  if (tableauEmpty && state.stock.length === 0 && state.waste.length === 0) {
    state.won = true;
    setStatus('Gewonnen. Alle Karten sind weggeräumt.');
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

function getValidTargets() {
  const result = { tableau: new Set(), foundations: new Set() };
  if (!state.selection) return result;
  const first = state.selection.cards[0];

  state.tableau.forEach((col, idx) => {
    if (state.selection.from === 'tableau' && state.selection.colIndex === idx) return;
    if (col.length === 0) {
      result.tableau.add(idx);
      return;
    }
    const top = col[col.length - 1];
    if (top.groupId === first.groupId && first.type !== 'root') {
      result.tableau.add(idx);
    }
  });

  state.foundations.forEach((slot, idx) => {
    if (slot.cards.length === 0) {
      if (first.type === 'root') result.foundations.add(idx);
      return;
    }
    const top = slot.cards[slot.cards.length - 1];
    if (top.groupId === first.groupId && first.type !== 'root') {
      result.foundations.add(idx);
    }
  });

  return result;
}

function render() {
  renderStockWaste();
  renderFoundations();
  renderTableau();
}

function renderStockWaste() {
  if (state.stock.length > 0) {
    stockEl.textContent = `Stock (${state.stock.length})`;
  } else if (state.waste.length > 0) {
    stockEl.textContent = 'Neu';
  } else {
    stockEl.textContent = 'Leer';
  }

  const w = state.waste[state.waste.length - 1];
  wasteEl.textContent = w ? w.label : 'Waste';
  wasteEl.classList.toggle('selected', !!state.selection && state.selection.from === 'waste');
}

function renderFoundations() {
  foundationsEl.innerHTML = '';
  const valid = getValidTargets();

  state.foundations.forEach((slot, idx) => {
    const slotEl = document.createElement('button');
    slotEl.type = 'button';
    slotEl.className = 'foundation-slot';
    if (valid.foundations.has(idx)) slotEl.classList.add('valid-target');
    slotEl.addEventListener('click', () => onFoundationClick(idx));

    const head = document.createElement('div');
    head.className = 'foundation-header';

    const body = document.createElement('div');
    body.className = 'foundation-body';

    if (!slot.cards.length) {
      head.textContent = 'Frei';
    } else {
      const top = slot.cards[slot.cards.length - 1];
      const group = state.groupsById.get(top.groupId);
      const totalItems = group.items.length;
      const itemsPlaced = slot.cards.filter((c) => c.type === 'item').length;
      head.textContent = `${group.name} (${totalItems})`;

      const cardEl = createCardElement(top, true);
      cardEl.style.position = 'relative';
      cardEl.style.height = '74px';
      body.appendChild(cardEl);

      const progress = document.createElement('div');
      progress.className = 'foundation-progress';
      progress.textContent = `${itemsPlaced}/${totalItems}`;
      body.appendChild(progress);
    }

    slotEl.appendChild(head);
    slotEl.appendChild(body);
    foundationsEl.appendChild(slotEl);
  });
}

function renderTableau() {
  tableauEl.innerHTML = '';
  const valid = getValidTargets();

  state.tableau.forEach((col, colIndex) => {
    const colEl = document.createElement('button');
    colEl.type = 'button';
    colEl.className = 'tableau-column';
    if (valid.tableau.has(colIndex)) colEl.classList.add('valid-target');
    if (state.selection && state.selection.from === 'tableau' && state.selection.colIndex === colIndex) {
      colEl.classList.add('selected');
    }

    colEl.addEventListener('click', () => onTableauColumnClick(colIndex));

    col.forEach((card, idx) => {
      const isTop = idx === col.length - 1;
      const cardEl = createCardElement(card, isTop);
      cardEl.style.top = `${idx * CARD_OFFSET}px`;
      colEl.appendChild(cardEl);
    });

    const h = Math.max(250, 12 + col.length * CARD_OFFSET + 108);
    colEl.style.height = `${h}px`;
    tableauEl.appendChild(colEl);
  });
}

function createCardElement(card, isTop) {
  const el = document.createElement('div');
  el.className = `card ${card.type === 'root' ? 'root' : ''} ${isTop ? 'topcard' : ''}`.trim();
  if (!card.faceUp) el.classList.add('facedown');

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = card.faceUp ? card.label : 'Verdeckt';

  const label = document.createElement('div');
  label.className = 'card-label';
  label.textContent = card.faceUp ? card.label : 'Verdeckt';

  el.appendChild(title);
  el.appendChild(label);
  return el;
}
