import { useEffect, useState } from 'react';

export default function Admin() {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [rate, setRate] = useState(null);
  const [liveRate, setLiveRate] = useState(null);
  const [sortBy, setSortBy] = useState('newest');

  // ---------- Búsqueda avanzada ----------
  const [showExact, setShowExact] = useState(false);
  const [exName, setExName] = useState('');
  const [exCmc, setExCmc] = useState('');
  const [exSet, setExSet] = useState('');
  const [exYear, setExYear] = useState('');
  const [exRarity, setExRarity] = useState('');
  const [exType, setExType] = useState('');
  const [exColors, setExColors] = useState([]);
  const COLOR_CODES = { W: 'Blanco', U: 'Azul', B: 'Negro', R: 'Rojo', G: 'Verde' };

  function toggleExColor(c) {
    setExColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  function buildExactQuery() {
    const parts = [];
    if (exName.trim()) parts.push(exName.trim());
    if (exCmc !== '') parts.push(`cmc=${exCmc}`);
    if (exSet.trim()) parts.push(`set:${exSet.trim()}`);
    if (exYear.trim()) parts.push(`year:${exYear.trim()}`);
    if (exRarity) parts.push(`rarity:${exRarity}`);
    if (exType.trim()) parts.push(`type:${exType.trim()}`);
    if (exColors.length > 0) parts.push(`color=${exColors.join('').toLowerCase()}`);
    return parts.join(' ');
  }

  async function searchExact() {
    const built = buildExactQuery();
    if (!built.trim()) { setError('Llena al menos un campo para buscar.'); return; }
    await runSearch(built);
  }

  // ---------- Paginación de resultados ----------
  const RESULTS_PER_PAGE = 8;
  const [resultsPage, setResultsPage] = useState(0);
  const totalResultPages = Math.max(1, Math.ceil(results.length / RESULTS_PER_PAGE));
  const pagedResults = results.slice(resultsPage * RESULTS_PER_PAGE, resultsPage * RESULTS_PER_PAGE + RESULTS_PER_PAGE);

  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
    if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const INV_PAGE_SIZE = 20;
  const [invPage, setInvPage] = useState(0);
  const totalInvPages = Math.max(1, Math.ceil(sortedItems.length / INV_PAGE_SIZE));
  const pagedItems = sortedItems.slice(invPage * INV_PAGE_SIZE, invPage * INV_PAGE_SIZE + INV_PAGE_SIZE);
  useEffect(() => { setInvPage(0); }, [sortBy, items.length]);

  // ---------- Vista de tabla editable ----------
  const [invView, setInvView] = useState('cards');
  const [rowEdits, setRowEdits] = useState({});

  useEffect(() => {
    if (invView !== 'table') return;
    const initial = {};
    pagedItems.forEach(it => {
      initial[it.id] = { name: it.name, set_name: it.setName || '', price: Number(it.price), qty: it.rawQty, condition: it.condition || 'Near Mint', foil: Boolean(it.foil) };
    });
    setRowEdits(initial);
  }, [invView, invPage, items]);

  function updateRowEdit(id, field, value) {
    setRowEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function isRowDirty(it) {
    const e = rowEdits[it.id];
    if (!e) return false;
    return e.name !== it.name || e.set_name !== (it.setName || '') || Number(e.price) !== Number(it.price) ||
      parseInt(e.qty) !== it.rawQty || e.condition !== (it.condition || 'Near Mint') || Boolean(e.foil) !== Boolean(it.foil);
  }

  const dirtyCount = pagedItems.filter(isRowDirty).length;

  // ---------- Selección múltiple y acciones en bloque ----------
  const [selectedIds, setSelectedIds] = useState([]);
  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleSelectAll() {
    setSelectedIds(prev => prev.length === pagedItems.length ? [] : pagedItems.map(it => it.id));
  }

  async function bulkPricePct() {
    const pct = prompt('¿Cambiar el precio qué porcentaje? (ej. 10 para subir 10%, -15 para bajar 15%)');
    if (pct === null || pct.trim() === '' || isNaN(parseFloat(pct))) return;
    const r = await fetch('/api/inventory-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify({ ids: selectedIds, action: 'price_pct', percent: pct })
    });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error'); return; }
    setSelectedIds([]);
    loadInventory();
  }

  async function bulkDelete() {
    if (!confirm(`¿Eliminar ${selectedIds.length} carta(s) seleccionadas? No se puede deshacer.`)) return;
    const r = await fetch('/api/inventory-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify({ ids: selectedIds, action: 'delete' })
    });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error'); return; }
    setSelectedIds([]);
    loadInventory();
  }

  async function saveAllRowEdits() {
    const dirty = pagedItems.filter(isRowDirty);
    if (dirty.length === 0) return;
    setImporting(true);
    for (const it of dirty) {
      const e = rowEdits[it.id];
      await fetch(`/api/inventory?id=${it.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
        body: JSON.stringify({ name: e.name, set_name: e.set_name, price: parseFloat(e.price), qty: parseInt(e.qty), condition: e.condition, foil: e.foil })
      });
    }
    setImporting(false);
    loadInventory();
    alert(`Se guardaron ${dirty.length} carta(s).`);
  }

  const [wipeModal, setWipeModal] = useState(false);
  const [wipeCountdown, setWipeCountdown] = useState(5);

  useEffect(() => {
    if (!wipeModal) return;
    setWipeCountdown(5);
    const interval = setInterval(() => {
      setWipeCountdown(c => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [wipeModal]);

  async function wipeInventory() {
    const r = await fetch('/api/inventory-wipe', { method: 'DELETE', headers: { 'x-admin-password': pw } });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error al borrar'); return; }
    setWipeModal(false);
    loadInventory();
  }

  async function downloadFile(url, filename) {
    const r = await fetch(url, { headers: { 'x-admin-password': pw } });
    if (!r.ok) { alert('Error al generar el archivo'); return; }
    const blob = await r.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  const [stats, setStats] = useState(null);

  const CONDITION_FIELD = {
    'Near Mint': 'nearMintPct', 'Lightly Played': 'lightlyPlayedPct', 'Moderately Played': 'moderatelyPlayedPct',
    'Heavily Played': 'heavilyPlayedPct', 'Damaged': 'damagedPct'
  };
  const [pricingSettings, setPricingSettings] = useState(null);
  useEffect(() => {
    fetch('/api/pricing-settings').then(r => r.json()).then(d => setPricingSettings(d.settings));
  }, []);

  function pctFor(condition) {
    if (!pricingSettings) return 100;
    return pricingSettings[CONDITION_FIELD[condition]] ?? 100;
  }

  async function savePricingSettings() {
    const r = await fetch('/api/pricing-settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify(pricingSettings)
    });
    if (!r.ok) { alert('Error al guardar'); return; }
    alert('Porcentajes guardados.');
  }



  useEffect(() => {
    fetch('/api/exchange-rate').then(r => r.json()).then(d => { setRate(d.rate); setLiveRate(d.liveRate); });
  }, []);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('admin_pw') : null;
    if (saved) { setPw(saved); setAuthed(true); }
  }, []);

  useEffect(() => { if (authed) loadInventory(); }, [authed]);

  function loadInventory() {
    fetch('/api/inventory').then(r => r.json()).then(d => setItems(d.items || []));
  }

  function tryLogin() {
    sessionStorage.setItem('admin_pw', pw);
    setAuthed(true);
  }

  async function runSearch(query) {
    setSearching(true); setError(''); setResultsPage(0);
    try {
      const r = await fetch('/api/search-cards?q=' + encodeURIComponent(query));
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Sin resultados'); setResults([]); }
      else setResults(d.data || []);
    } catch (e) { setError('Error al buscar'); }
    setSearching(false);
  }

  async function search() {
    if (!q.trim()) return;
    await runSearch(q);
  }

  // ---------- Modal de agregar/editar carta ----------
  const LANGUAGES = { en: 'Inglés', es: 'Español', ja: 'Japonés', de: 'Alemán', fr: 'Francés', it: 'Italiano', pt: 'Portugués', ru: 'Ruso', ko: 'Coreano', zhs: 'Chino simpl.', zht: 'Chino trad.' };
  const [modalItem, setModalItem] = useState(null);

  function openAddModal(card) {
    setModalItem({
      mode: 'add',
      name: card.name, set_name: card.set_name || '', img: card.img || '',
      price: card.usd || '', original_price: '', qty: 1, condition: 'Near Mint',
      colors: (card.colors || '').split(',').filter(Boolean),
      rarity: card.rarity || '', type_line: card.type_line || '',
      foil: Boolean(card.foil), language: card.lang || 'en',
      stripe_link: '', scryfall_uri: card.scryfall_uri || '', notes: '',
      ref_usd: card.usd || null
    });
  }

  function impliedRefUsd(it) {
    const pct = pctFor(it.condition || 'Near Mint');
    if (!pct || pct <= 0) return Number(it.price);
    return (Number(it.price) / (pct / 100)).toFixed(2);
  }

  function openEditModal(it) {
    setModalItem({
      mode: 'edit', id: it.id,
      name: it.name, set_name: it.setName || '', img: it.img || '',
      price: Number(it.price), original_price: it.originalPrice !== null && it.originalPrice !== undefined ? Number(it.originalPrice) : '',
      qty: it.rawQty, condition: it.condition || 'Near Mint',
      colors: (it.colors || '').split(',').filter(Boolean),
      rarity: it.rarity || '', type_line: it.typeLine || '',
      foil: Boolean(it.foil), language: it.language || 'en',
      stripe_link: it.stripeLink || '', scryfall_uri: it.scryfallUri || '',
      notes: it.notes || '', ref_usd: impliedRefUsd(it)
    });
  }

  function duplicateItem(it) {
    setModalItem({
      mode: 'add',
      name: it.name, set_name: it.setName || '', img: it.img || '',
      price: Number(it.price), original_price: it.originalPrice !== null && it.originalPrice !== undefined ? Number(it.originalPrice) : '',
      qty: 1, condition: it.condition || 'Near Mint',
      colors: (it.colors || '').split(',').filter(Boolean),
      rarity: it.rarity || '', type_line: it.typeLine || '',
      foil: Boolean(it.foil), language: it.language || 'en',
      stripe_link: it.stripeLink || '', scryfall_uri: it.scryfallUri || '',
      notes: '', ref_usd: impliedRefUsd(it)
    });
  }

  function toggleModalColor(c) {
    setModalItem(m => ({ ...m, colors: m.colors.includes(c) ? m.colors.filter(x => x !== c) : [...m.colors, c] }));
  }

  async function refreshRefPrice() {
    if (!modalItem?.name) return;
    setModalItem(m => ({ ...m, refreshing: true }));
    try {
      const r = await fetch('/api/card-lookup?name=' + encodeURIComponent(modalItem.name));
      const d = await r.json();
      if (r.ok) setModalItem(m => ({ ...m, ref_usd: d.usd || null, refreshing: false }));
      else setModalItem(m => ({ ...m, refreshing: false }));
    } catch (e) {
      setModalItem(m => ({ ...m, refreshing: false }));
    }
  }

  const [priceHistory, setPriceHistory] = useState(null);
  async function loadPriceHistory(id) {
    setPriceHistory('loading');
    const r = await fetch(`/api/price-history?id=${id}`, { headers: { 'x-admin-password': pw } });
    const d = await r.json();
    setPriceHistory(d.snapshots || []);
  }

  async function saveModalItem() {
    const m = modalItem;
    if (!m.name.trim()) { alert('Ponle nombre a la carta.'); return; }
    if (m.price === '' || isNaN(parseFloat(m.price))) { alert('Precio inválido.'); return; }
    if (isNaN(parseInt(m.qty))) { alert('Cantidad inválida.'); return; }
    const payload = {
      name: m.name.trim(), set_name: m.set_name, img: m.img,
      price: parseFloat(m.price),
      original_price: m.original_price === '' ? null : parseFloat(m.original_price),
      qty: parseInt(m.qty), condition: m.condition,
      colors: m.colors.join(','), rarity: m.rarity, type_line: m.type_line,
      foil: m.foil, language: m.language, stripe_link: m.stripe_link, scryfall_uri: m.scryfall_uri,
      notes: m.notes, ref_usd: m.ref_usd
    };
    const url = m.mode === 'edit' ? `/api/inventory?id=${m.id}` : '/api/inventory';
    const method = m.mode === 'edit' ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify(payload)
    });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error al guardar'); return; }
    setModalItem(null);
    setPriceHistory(null);
    loadInventory();
  }

  async function deleteItem(id) {
    if (!confirm('¿Eliminar esta carta del inventario?')) return;
    const r = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE', headers: { 'x-admin-password': pw } });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error al eliminar'); return; }
    loadInventory();
  }

  // ---------- Pedidos ----------
  const [view, setView] = useState('inventory');
  const [orders, setOrders] = useState([]);

  function loadOrders() {
    fetch('/api/orders', { headers: { 'x-admin-password': pw } }).then(r => r.json()).then(d => setOrders(d.orders || []));
  }

  useEffect(() => { if (authed && view === 'orders') loadOrders(); }, [authed, view]);
  useEffect(() => { if (authed && view === 'users') loadCustomers(); }, [authed, view]);
  useEffect(() => {
    if (authed && view === 'stats') {
      fetch('/api/stats', { headers: { 'x-admin-password': pw } }).then(r => r.json()).then(setStats);
    }
  }, [authed, view]);

  // ---------- Decks ----------
  const [decks, setDecks] = useState([]);
  const [deckForm, setDeckForm] = useState(null); // null = oculto, {} = formulario abierto
  const [deckCards, setDeckCards] = useState([]); // [{name, qty, img, inventoryId, status}]
  const [deckImporting, setDeckImporting] = useState(false);
  const [deckPasteText, setDeckPasteText] = useState('');
  const [moxfieldUrl, setMoxfieldUrl] = useState('');
  const [coverQuery, setCoverQuery] = useState('');

  function loadDecks() {
    fetch('/api/decks?all=1', { headers: { 'x-admin-password': pw } }).then(r => r.json()).then(d => setDecks(d.decks || []));
  }
  useEffect(() => { if (authed && view === 'decks') loadDecks(); }, [authed, view]);

  function openNewDeckForm() {
    setDeckForm({ id: null, name: '', price: '', originalPrice: '', description: '', coverImg: '', coverName: '' });
    setDeckCards([]);
    setDeckPasteText('');
    setMoxfieldUrl('');
    setCoverQuery('');
  }

  function editDeck(d) {
    setDeckForm({
      id: d.id, name: d.name, price: String(d.price),
      originalPrice: d.originalPrice !== null ? String(d.originalPrice) : '',
      description: d.description || '', coverImg: d.coverImg || '', coverName: d.coverName || ''
    });
    setDeckCards(d.cards.map(c => ({
      name: c.name, qty: c.qty, img: c.img || '', colors: c.colors || '', cmc: c.cmc,
      price: c.price !== null && c.price !== undefined ? Number(c.price) : null,
      refUsd: c.price !== null && c.price !== undefined ? Number(c.price) : null,
      condition: 'Near Mint',
      inventoryId: c.inventoryId, status: c.img ? 'done' : 'notfound'
    })));
    setDeckPasteText('');
    setMoxfieldUrl(d.moxfieldUrl || '');
    setCoverQuery('');
  }

  async function searchCoverCard() {
    if (!coverQuery.trim()) return;
    const r = await fetch('/api/card-lookup?name=' + encodeURIComponent(coverQuery));
    const d = await r.json();
    if (!r.ok) { alert(d.error || 'No se encontró esa carta'); return; }
    setDeckForm(f => ({ ...f, coverImg: d.img, coverName: d.name }));
  }

  function parseDeckList(text) {
    return text.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const m = line.match(/^(\d+)x?\s+(.+)$/i);
      if (m) return { name: m[2].trim(), qty: parseInt(m[1]) };
      return { name: line, qty: 1 };
    });
  }

  async function lookupCard(name, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetch('/api/card-lookup?name=' + encodeURIComponent(name), { signal: controller.signal });
      const d = await r.json();
      clearTimeout(timer);
      return r.ok ? d : null;
    } catch (e) {
      clearTimeout(timer);
      return null;
    }
  }

  function recalcSuggestedPrice(rows) {
    const sum = rows.reduce((s, c) => s + (c.price ? Number(c.price) * c.qty : 0), 0);
    if (sum > 0) {
      setDeckForm(f => (f ? { ...f, originalPrice: sum.toFixed(2), price: f.price || sum.toFixed(2) } : f));
    }
  }

  function updateDeckCardRow(idx, patch) {
    setDeckCards(prev => {
      const next = prev.map((r, i) => i === idx ? { ...r, ...patch } : r);
      recalcSuggestedPrice(next);
      return next;
    });
  }

  function changeRowCondition(idx, newCond) {
    setDeckCards(prev => {
      const next = prev.map((r, i) => {
        if (i !== idx) return r;
        const newPrice = r.refUsd ? (parseFloat(r.refUsd) * pctFor(newCond) / 100).toFixed(2) : r.price;
        return { ...r, condition: newCond, price: newPrice };
      });
      recalcSuggestedPrice(next);
      return next;
    });
  }

  async function resolveRow(row) {
    const found = await lookupCard(row.name);
    const matchInv = items.find(it => it.name.toLowerCase() === row.name.toLowerCase());
    if (!found) return { ...row, status: 'notfound' };
    const refUsd = found.usd ? parseFloat(found.usd) : null;
    return {
      ...row, name: found.name, img: found.img || '', colors: found.colors || '',
      cmc: found.cmc ?? null, refUsd, price: refUsd,
      condition: row.condition || 'Near Mint',
      inventoryId: matchInv?.id || null, status: 'done'
    };
  }

  async function processDeckPaste() {
    const parsed = parseDeckList(deckPasteText);
    if (parsed.length === 0) { alert('Pega al menos una carta.'); return; }
    setDeckImporting(true);
    let rows = parsed.map(p => ({ ...p, img: '', condition: 'Near Mint', status: 'pending' }));
    setDeckCards(rows);
    for (let i = 0; i < rows.length; i++) {
      setDeckCards(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'loading' } : r));
      const resolved = await resolveRow(rows[i]);
      rows[i] = resolved;
      setDeckCards(prev => prev.map((r, idx) => idx === i ? resolved : r));
      await new Promise(res => setTimeout(res, 100));
    }
    setDeckImporting(false);
    recalcSuggestedPrice(rows);
  }

  async function retryFailedDeckCards() {
    const failedIdx = deckCards.map((r, i) => ({ r, i })).filter(x => x.r.status === 'notfound').map(x => x.i);
    if (failedIdx.length === 0) return;
    setDeckImporting(true);
    let updated = [...deckCards];
    for (const i of failedIdx) {
      setDeckCards(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'loading' } : r));
      const resolved = await resolveRow(deckCards[i]);
      updated[i] = resolved;
      setDeckCards(prev => prev.map((r, idx) => idx === i ? resolved : r));
      await new Promise(res => setTimeout(res, 100));
    }
    setDeckImporting(false);
    recalcSuggestedPrice(updated);
  }

  async function importFromMoxfield() {
    if (!moxfieldUrl.trim()) return;
    setDeckImporting(true);
    let d;
    try {
      const r = await fetch('/api/moxfield-import', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
        body: JSON.stringify({ url: moxfieldUrl })
      });
      d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error al importar');
    } catch (e) {
      setDeckImporting(false);
      alert(e.message || 'No se pudo conectar con Moxfield, intenta de nuevo o pega la lista a mano.');
      return;
    }
    setDeckForm(f => ({ ...f, name: f.name || d.name, coverImg: d.coverImg, coverName: d.coverName }));
    // Cada carta ya trae imagen de Moxfield, pero le pedimos precio/colores/cmc a Scryfall
    let rows = d.cards.map(c => ({ name: c.name, qty: c.qty, img: c.img, condition: 'Near Mint', status: 'pending' }));
    setDeckCards(rows);
    for (let i = 0; i < rows.length; i++) {
      setDeckCards(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'loading' } : r));
      const found = await lookupCard(rows[i].name);
      const matchInv = items.find(it => it.name.toLowerCase() === rows[i].name.toLowerCase());
      const refUsd = found?.usd ? parseFloat(found.usd) : null;
      const resolved = found
        ? { ...rows[i], img: rows[i].img || found.img || '', colors: found.colors || '', cmc: found.cmc ?? null, refUsd, price: refUsd, inventoryId: matchInv?.id || null, status: 'done' }
        : { ...rows[i], inventoryId: matchInv?.id || null, status: 'notfound' };
      rows[i] = resolved;
      setDeckCards(prev => prev.map((r, idx) => idx === i ? resolved : r));
      await new Promise(res => setTimeout(res, 100));
    }
    setDeckImporting(false);
    recalcSuggestedPrice(rows);
  }

  async function quickAddToInventory(row, idx) {
    if (!row.price || isNaN(parseFloat(row.price))) { alert('Ponle un precio a esta carta en el campo de precio antes de agregarla.'); return; }
    const r = await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify({
        name: row.name, img: row.img, price: parseFloat(row.price), qty: row.qty || 1, condition: row.condition || 'Near Mint',
        colors: row.colors, rarity: '', type_line: ''
      })
    });
    const d = await r.json();
    if (!r.ok) { alert(d.error || 'Error al agregar'); return; }
    setDeckCards(prev => prev.map((c, i) => i === idx ? { ...c, inventoryId: d.item.id } : c));
    loadInventory();
  }

  async function saveDeck() {
    if (!deckForm.name.trim()) { alert('Ponle nombre al deck.'); return; }
    if (!deckForm.price || isNaN(parseFloat(deckForm.price))) { alert('Precio inválido.'); return; }
    if (deckCards.length === 0) { alert('Agrega al menos una carta al deck (pega la lista o importa de Moxfield).'); return; }
    const payload = {
      name: deckForm.name, description: deckForm.description, price: parseFloat(deckForm.price),
      originalPrice: deckForm.originalPrice ? parseFloat(deckForm.originalPrice) : null,
      coverImg: deckForm.coverImg, coverName: deckForm.coverName, moxfieldUrl: moxfieldUrl || null,
      cards: deckCards.map(c => ({ name: c.name, qty: c.qty, img: c.img, colors: c.colors, cmc: c.cmc, price: c.price, inventoryId: c.inventoryId }))
    };
    const url = deckForm.id ? `/api/decks/${deckForm.id}` : '/api/decks';
    const method = deckForm.id ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify(payload)
    });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error al guardar'); return; }
    setDeckForm(null);
    loadDecks();
  }

  async function toggleDeckStatus(deck) {
    const action = deck.active ? 'mark_sold' : 'reactivate';
    const msg = deck.active
      ? '¿Marcar este deck como vendido? Se van a descontar del inventario las cartas que coincidan con tu catálogo.'
      : '¿Reactivar este deck? Se van a regresar al inventario las cartas que se habían descontado.';
    if (!confirm(msg)) return;
    const r = await fetch(`/api/decks/${deck.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify({ action })
    });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error'); return; }
    loadDecks();
    loadInventory();
  }

  async function deleteDeck(id) {
    if (!confirm('¿Eliminar este deck? No afecta tu inventario de cartas sueltas.')) return;
    const r = await fetch(`/api/decks/${id}`, { method: 'DELETE', headers: { 'x-admin-password': pw } });
    if (!r.ok) { alert('Error al eliminar'); return; }
    loadDecks();
  }

  const [customers, setCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);

  function loadCustomers() {
    fetch('/api/customers', { headers: { 'x-admin-password': pw } }).then(r => r.json()).then(d => setCustomers(d.customers || []));
  }

  async function saveCustomer() {
    const c = editingCustomer;
    const r = await fetch(`/api/customers?id=${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify({ name: c.name, phone: c.phone, address: c.address, email: c.email })
    });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error al guardar'); return; }
    setEditingCustomer(null);
    loadCustomers();
  }

  async function deleteCustomer(id) {
    if (!confirm('¿Eliminar esta cuenta de cliente? Sus pedidos pasados se conservan.')) return;
    const r = await fetch(`/api/customers?id=${id}`, { method: 'DELETE', headers: { 'x-admin-password': pw } });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error al eliminar'); return; }
    loadCustomers();
  }

  function orderDisplayStatus(o) {
    if (o.status === 'pending' && new Date(o.expiresAt) < new Date()) return 'Vencido';
    if (o.status === 'pending') return 'Pendiente';
    if (o.status === 'confirmed') return 'Confirmado';
    return 'Cancelado';
  }

  async function setOrderStatus(id, status) {
    const r = await fetch(`/api/orders?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify({ status })
    });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error al actualizar el pedido'); return; }
    loadOrders();
    if (status === 'confirmed') loadInventory();
  }

  function timeLeft(expiresAt) {
    const ms = new Date(expiresAt) - new Date();
    if (ms <= 0) return 'vencido';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m restantes`;
  }

  const [editingOrder, setEditingOrder] = useState(null);
  const [addToOrderId, setAddToOrderId] = useState('');
  const [addToOrderQty, setAddToOrderQty] = useState(1);

  async function removeOrderItem(orderId, orderItemId) {
    const r = await fetch(`/api/orders?id=${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify({ action: 'remove_item', orderItemId })
    });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error al quitar la carta'); return; }
    loadOrders();
  }

  async function addOrderItem(orderId) {
    if (!addToOrderId) { alert('Selecciona una carta.'); return; }
    const r = await fetch(`/api/orders?id=${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify({ action: 'add_item', inventoryId: addToOrderId, qty: addToOrderQty })
    });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error al agregar la carta'); return; }
    setAddToOrderId(''); setAddToOrderQty(1);
    loadOrders();
  }

  // ---------- Importar CSV ----------
  const [showImport, setShowImport] = useState(false);
  const [csvRows, setCsvRows] = useState([]);
  const [importing, setImporting] = useState(false);

  function parseCSV(text) {
    const rows = [];
    let i = 0, field = '', row = [], inQuotes = false;
    while (i < text.length) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
        } else field += char;
      } else {
        if (char === '"') inQuotes = true;
        else if (char === ',') { row.push(field); field = ''; }
        else if (char === '\n' || char === '\r') {
          if (char === '\r' && text[i + 1] === '\n') i++;
          row.push(field); field = ''; rows.push(row); row = [];
        } else field += char;
      }
      i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.length && r.some(c => c.trim() !== ''));
  }

  function handleCsvFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result));
      if (rows.length === 0) { alert('El CSV está vacío.'); return; }
      const header = rows[0].map(c => c.trim().toLowerCase());
      const nameIdx = header.findIndex(h => ['name', 'nombre', 'carta', 'card'].includes(h));
      const qtyIdx = header.findIndex(h => ['qty', 'cantidad', 'cant'].includes(h));
      const condIdx = header.findIndex(h => ['condition', 'condicion', 'condición', 'estado'].includes(h));
      const dataRows = nameIdx !== -1 ? rows.slice(1) : rows;
      const parsed = dataRows
        .map(r => ({
          name: (nameIdx !== -1 ? r[nameIdx] : r[0]) || '',
          qty: (qtyIdx !== -1 && r[qtyIdx] && parseInt(r[qtyIdx])) || 1,
          condition: (condIdx !== -1 && r[condIdx] && r[condIdx].trim()) || 'Near Mint',
          status: 'pending', data: null, price: '', include: true
        }))
        .map(r => ({ ...r, name: r.name.trim() }))
        .filter(r => r.name);
      if (parsed.length === 0) { alert('No se encontraron nombres de cartas en el archivo.'); return; }
      setCsvRows(parsed);
      runImportLookups(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function lookupWithTimeout(name, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('/api/card-lookup?name=' + encodeURIComponent(name), { signal: controller.signal });
      const d = await res.json();
      clearTimeout(timer);
      if (!res.ok) return { ok: false };
      return { ok: true, data: d };
    } catch (e) {
      clearTimeout(timer);
      return { ok: false };
    }
  }

  async function runImportLookups(rowsToProcess) {
    setImporting(true);
    for (let i = 0; i < rowsToProcess.length; i++) {
      setCsvRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'loading' } : r));
      const result = await lookupWithTimeout(rowsToProcess[i].name);
      if (!result.ok) setCsvRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'notfound' } : r));
      else setCsvRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'found', data: result.data, price: result.data.usd ? (parseFloat(result.data.usd) * pctFor(r.condition) / 100).toFixed(2) : '' } : r));
      await new Promise(res => setTimeout(res, 120));
    }
    setImporting(false);
  }

  async function retryAllFailed() {
    const failedIdx = csvRows.map((r, i) => ({ r, i })).filter(x => x.r.status === 'notfound').map(x => x.i);
    if (failedIdx.length === 0) return;
    setImporting(true);
    for (const i of failedIdx) {
      setCsvRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'loading' } : r));
      const result = await lookupWithTimeout(csvRows[i].name);
      if (!result.ok) setCsvRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'notfound' } : r));
      else setCsvRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'found', data: result.data, price: result.data.usd ? (parseFloat(result.data.usd) * pctFor(r.condition) / 100).toFixed(2) : '' } : r));
      await new Promise(res => setTimeout(res, 120));
    }
    setImporting(false);
  }

  function updateCsvRow(i, patch) {
    setCsvRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  async function retryCsvRow(i) {
    updateCsvRow(i, { status: 'loading' });
    const result = await lookupWithTimeout(csvRows[i].name);
    if (!result.ok) updateCsvRow(i, { status: 'notfound' });
    else updateCsvRow(i, { status: 'found', data: result.data, price: result.data.usd ? (parseFloat(result.data.usd) * pctFor(csvRows[i].condition) / 100).toFixed(2) : '' });
  }

  async function importSelected() {
    const toAdd = csvRows
      .map((r, i) => ({ ...r, i }))
      .filter(r => r.include && r.status === 'found' && r.price !== '' && !isNaN(parseFloat(r.price)));
    if (toAdd.length === 0) { alert('No hay cartas listas para agregar (revisa que tengan precio y estén marcadas).'); return; }
    setImporting(true);
    for (const r of toAdd) {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
        body: JSON.stringify({
          name: r.data.name, set_name: r.data.set_name, img: r.data.img,
          price: parseFloat(r.price), qty: r.qty, condition: r.condition,
          colors: r.data.colors, rarity: r.data.rarity, type_line: r.data.type_line,
          foil: r.data.foil, language: r.data.lang, scryfall_uri: r.data.scryfall_uri
        })
      });
    }
    setImporting(false);
    setCsvRows([]);
    loadInventory();
    alert(`Se agregaron ${toAdd.length} cartas al inventario.`);
  }

  if (!authed) {
    return (
      <main style={{ maxWidth: 360, marginTop: 100 }}>
        <h2>Acceso de administrador</h2>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && tryLogin()} />
        </div>
        <button className="primary" onClick={tryLogin}>Entrar</button>
      </main>
    );
  }

  return (
    <main>
      <h2>Panel de administrador</h2>

      <div className="tabs" style={{ justifyContent: 'flex-start', marginBottom: 28 }}>
        <button className={`tab-btn ${view === 'inventory' ? 'active' : ''}`} onClick={() => setView('inventory')}>Inventario</button>
        <button className={`tab-btn ${view === 'orders' ? 'active' : ''}`} onClick={() => setView('orders')}>Pedidos</button>
        <button className={`tab-btn ${view === 'users' ? 'active' : ''}`} onClick={() => setView('users')}>Usuarios</button>
        <button className={`tab-btn ${view === 'stats' ? 'active' : ''}`} onClick={() => setView('stats')}>Estadísticas</button>
        <button className={`tab-btn ${view === 'pricing' ? 'active' : ''}`} onClick={() => setView('pricing')}>Precios</button>
        <button className={`tab-btn ${view === 'decks' ? 'active' : ''}`} onClick={() => setView('decks')}>Decks</button>
      </div>

      {view === 'inventory' && (
      <>
      <button className="ghost" style={{ marginBottom: 16, marginRight: 8 }} onClick={() => setShowImport(v => !v)}>
        {showImport ? 'Ocultar importar CSV ▲' : 'Importar CSV ▼'}
      </button>

      {showImport && (
        <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 10, padding: 18, marginBottom: 24 }}>
          <p className="hint" style={{ marginTop: 0 }}>
            Sube un CSV con una columna <code>name</code> (o solo los nombres en la primera columna, uno por fila).
            Columnas opcionales: <code>qty</code> y <code>condition</code>. Por cada nombre buscamos el precio y los
            datos en Scryfall automáticamente — tú solo revisas y confirmas.
          </p>
          <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} disabled={importing} />

          {csvRows.length > 0 && (
            <div style={{ marginTop: 18 }}>
              {csvRows.map((r, i) => (
                <div key={i} className="cart-item" style={{ alignItems: 'flex-start' }}>
                  {r.data?.img && <img src={r.data.img} alt={r.name} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {r.status === 'found' && (
                        <input type="checkbox" checked={r.include} onChange={e => updateCsvRow(i, { include: e.target.checked })} />
                      )}
                      <strong style={{ fontSize: '0.9rem' }}>{r.data?.name || r.name}</strong>
                      {r.status === 'loading' && <span className="hint">buscando...</span>}
                      {r.status === 'notfound' && <span style={{ color: 'var(--blood)', fontSize: '0.8rem' }}>no encontrada</span>}
                      {r.status === 'found' && <span className="hint">{r.data.set_name}</span>}
                    </div>

                    {r.status === 'notfound' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <input value={r.name} onChange={e => updateCsvRow(i, { name: e.target.value })} style={{ maxWidth: 220 }} />
                        <button className="ghost" onClick={() => retryCsvRow(i)}>Reintentar</button>
                      </div>
                    )}

                    {r.status === 'found' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="hint">Precio USD:</span>
                        <input type="number" value={r.price} onChange={e => updateCsvRow(i, { price: e.target.value })} style={{ width: 90 }} />
                        <span className="hint">Cant.:</span>
                        <input type="number" value={r.qty} onChange={e => updateCsvRow(i, { qty: parseInt(e.target.value) || 1 })} style={{ width: 60 }} />
                        <select value={r.condition} onChange={e => {
                          const newCond = e.target.value;
                          const patch = { condition: newCond };
                          if (r.data?.usd) patch.price = (parseFloat(r.data.usd) * pctFor(newCond) / 100).toFixed(2);
                          updateCsvRow(i, patch);
                        }} style={{ width: 160 }}>
                          <option>Near Mint</option><option>Lightly Played</option><option>Moderately Played</option><option>Heavily Played</option><option>Damaged</option>
                        </select>
                        {r.data.usd && <span className="hint">(ref. Scryfall: ${r.data.usd} USD)</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="primary" onClick={importSelected} disabled={importing}>
                  {importing ? 'Procesando...' : `Agregar seleccionadas (${csvRows.filter(r => r.include && r.status === 'found').length})`}
                </button>
                {csvRows.some(r => r.status === 'notfound') && (
                  <button className="ghost" onClick={retryAllFailed} disabled={importing}>
                    Reintentar fallidas ({csvRows.filter(r => r.status === 'notfound').length})
                  </button>
                )}
                <button className="ghost" onClick={() => setCsvRows([])} disabled={importing}>Cancelar importación</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        <input placeholder="Buscar carta en Scryfall (ej. Sol Ring)" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
        <button className="primary" onClick={search} disabled={searching}>{searching ? 'Buscando...' : 'Buscar'}</button>
      </div>

      <button className="ghost" style={{ marginBottom: 16 }} onClick={() => setShowExact(v => !v)}>
        {showExact ? 'Ocultar búsqueda exacta ▲' : 'Búsqueda exacta ▼'}
      </button>

      {showExact && (
        <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 10, padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 12, marginBottom: 12 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Nombre (opcional)</label>
              <input value={exName} onChange={e => setExName(e.target.value)} placeholder="ej. Rin and Seri" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Costo de maná (CMC)</label>
              <input type="number" value={exCmc} onChange={e => setExCmc(e.target.value)} placeholder="ej. 3" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Edición (código, ej. znr)</label>
              <input value={exSet} onChange={e => setExSet(e.target.value)} placeholder="ej. znr" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Año</label>
              <input type="number" value={exYear} onChange={e => setExYear(e.target.value)} placeholder="ej. 2020" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Rareza</label>
              <select value={exRarity} onChange={e => setExRarity(e.target.value)}>
                <option value="">Cualquiera</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="mythic">Mythic</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Tipo</label>
              <input value={exType} onChange={e => setExType(e.target.value)} placeholder="ej. Creature" />
            </div>
          </div>

          <label>Colores exactos</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, marginBottom: 14 }}>
            {Object.entries(COLOR_CODES).map(([code, label]) => (
              <button
                key={code}
                className="ghost"
                onClick={() => toggleExColor(code)}
                style={{
                  borderColor: exColors.includes(code) ? 'var(--gold)' : 'var(--line)',
                  background: exColors.includes(code) ? 'rgba(201,162,39,0.12)' : 'transparent',
                  color: exColors.includes(code) ? 'var(--gold)' : 'var(--parchment)'
                }}
              >{label}</button>
            ))}
            <button className="ghost" onClick={() => setExColors(['W', 'U', 'B', 'R', 'G'])}>Penta (5 colores)</button>
            {exColors.length > 0 && <button className="ghost" onClick={() => setExColors([])}>Limpiar</button>}
          </div>

          <button className="primary" onClick={searchExact} disabled={searching}>{searching ? 'Buscando...' : 'Buscar exacto'}</button>
        </div>
      )}

      {error && <p className="hint">{error}</p>}

      <div className="grid" style={{ marginBottom: 8 }}>
        {pagedResults.map((c, i) => (
          <div className="card" key={i}>
            <div className="art">{c.img && <img src={c.img} alt={c.name} />}</div>
            <div className="info">
              <div className="name">{c.name}</div>
              <div className="set">{c.set_name}</div>
              <div className="price mono">{c.usd ? `$${c.usd} USD ref.` : 'Sin precio ref.'}</div>
              <button className="ghost" onClick={() => openAddModal(c)}>Agregar a inventario</button>
            </div>
          </div>
        ))}
      </div>

      {results.length > RESULTS_PER_PAGE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 40 }}>
          <button className="ghost" onClick={() => setResultsPage(p => Math.max(0, p - 1))} disabled={resultsPage === 0}>←</button>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: totalResultPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setResultsPage(i)}
                style={{
                  width: 9, height: 9, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
                  background: i === resultsPage ? 'var(--gold)' : 'var(--line)'
                }}
              />
            ))}
          </div>
          <button className="ghost" onClick={() => setResultsPage(p => Math.min(totalResultPages - 1, p + 1))} disabled={resultsPage === totalResultPages - 1}>→</button>
        </div>
      )}
      {results.length <= RESULTS_PER_PAGE && <div style={{ marginBottom: 40 }} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ margin: 0 }}>Inventario actual ({items.length})</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 200 }}>
            <option value="newest">Más nuevas primero</option>
            <option value="name">Nombre (A-Z)</option>
            <option value="price_asc">Precio: menor a mayor</option>
            <option value="price_desc">Precio: mayor a menor</option>
          </select>
          <div className="view-toggle">
            <button className={invView === 'cards' ? 'active' : ''} onClick={() => setInvView('cards')}>🎴 Tarjetas</button>
            <button className={invView === 'table' ? 'active' : ''} onClick={() => setInvView('table')}>📋 Tabla</button>
          </div>
          <button className="ghost" onClick={() => downloadFile('/api/export-inventory', 'boveda-arcana-biblioteca.csv')}>Descargar biblioteca (CSV)</button>
          <button className="ghost" style={{ borderColor: 'var(--blood)', color: 'var(--blood)' }} onClick={() => setWipeModal(true)}>Borrar toda la biblioteca</button>
        </div>
      </div>

      {invView === 'cards' && (
      <div className="grid" style={{ marginTop: 16 }}>
        {pagedItems.map(it => (
          <div className="card" key={it.id}>
            <div className="art">{it.img && <img src={it.img} alt={it.name} />}</div>
            <div className="info">
              <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{it.name} {it.foil && <span className="foil-badge" title="Foil" />}</div>
              <div className="set">
                {it.condition} · x{it.rawQty}{it.reserved > 0 ? ` (${it.reserved} apartadas, ${it.qty} libres)` : ''} · {LANGUAGES[it.language] || it.language}
                {it.views > 0 && <span> · 👁 {it.views}</span>}
              </div>
              <div className="price mono">${Number(it.price).toFixed(2)} USD{rate ? ` · ≈$${(Number(it.price) * rate).toFixed(2)} MXN` : ''}</div>
              {it.originalPrice && <div className="hint" style={{ marginTop: -4, textDecoration: 'line-through' }}>antes ${Number(it.originalPrice).toFixed(2)} USD</div>}
              <div className="row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="ghost" style={{ flex: 1 }} onClick={() => openEditModal(it)}>Editar</button>
                <button className="ghost" style={{ flex: 1 }} onClick={() => duplicateItem(it)}>Duplicar</button>
                <button className="ghost" style={{ flex: 1 }} onClick={() => deleteItem(it.id)}>Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {invView === 'table' && (
        <div>
          <p className="hint" style={{ marginTop: 12 }}>Edita directo en la tabla y dale "Guardar cambios" al final. Si cambias de página sin guardar, se pierden los cambios de esta página.</p>

          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--ink2)', border: '1px solid var(--gold)', borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <span style={{ fontSize: '0.85rem' }}>{selectedIds.length} seleccionada(s)</span>
              <button className="ghost" onClick={bulkPricePct}>Cambiar precio %</button>
              <button className="ghost" style={{ borderColor: 'var(--blood)', color: 'var(--blood)' }} onClick={bulkDelete}>Eliminar seleccionadas</button>
              <button className="ghost" onClick={() => setSelectedIds([])}>Deseleccionar</button>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th><input type="checkbox" checked={selectedIds.length === pagedItems.length && pagedItems.length > 0} onChange={toggleSelectAll} style={{ width: 'auto' }} /></th>
                  <th></th><th>Nombre</th><th>Edición</th><th>Precio USD</th><th>Cant.</th><th>Condición</th><th>Foil</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map(it => {
                  const e = rowEdits[it.id] || {};
                  const dirty = isRowDirty(it);
                  return (
                    <tr key={it.id} style={dirty ? { background: 'rgba(201,162,39,0.06)' } : {}}>
                      <td><input type="checkbox" checked={selectedIds.includes(it.id)} onChange={() => toggleSelect(it.id)} style={{ width: 'auto' }} /></td>
                      <td>
                        {it.img && (
                          <div className="hover-thumb-wrap">
                            <img className="hover-thumb-icon" src={it.img} alt={it.name} />
                            <img className="hover-thumb-float" src={it.img} alt={it.name} />
                          </div>
                        )}
                      </td>
                      <td><input value={e.name ?? ''} onChange={ev => updateRowEdit(it.id, 'name', ev.target.value)} style={{ minWidth: 160 }} /></td>
                      <td><input value={e.set_name ?? ''} onChange={ev => updateRowEdit(it.id, 'set_name', ev.target.value)} style={{ minWidth: 130 }} /></td>
                      <td>
                        <input type="number" value={e.price ?? ''} onChange={ev => updateRowEdit(it.id, 'price', ev.target.value)} style={{ width: 80 }} />
                        {rate && e.price !== '' && !isNaN(parseFloat(e.price)) && (
                          <div className="hint" style={{ fontSize: '0.7rem', marginTop: 2 }}>≈${(parseFloat(e.price) * rate).toFixed(2)} MXN</div>
                        )}
                      </td>
                      <td><input type="number" value={e.qty ?? ''} onChange={ev => updateRowEdit(it.id, 'qty', ev.target.value)} style={{ width: 60 }} /></td>
                      <td>
                        <select value={e.condition ?? 'Near Mint'} onChange={ev => updateRowEdit(it.id, 'condition', ev.target.value)}>
                          <option>Near Mint</option><option>Lightly Played</option><option>Moderately Played</option><option>Heavily Played</option><option>Damaged</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={Boolean(e.foil)} onChange={ev => updateRowEdit(it.id, 'foil', ev.target.checked)} style={{ width: 'auto' }} />
                      </td>
                      <td>{dirty && <span className="hint" style={{ color: 'var(--gold)' }}>sin guardar</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, position: 'sticky', bottom: 12 }}>
            <button className="primary" onClick={saveAllRowEdits} disabled={dirtyCount === 0 || importing}>
              {importing ? 'Guardando...' : `Guardar cambios (${dirtyCount})`}
            </button>
          </div>
        </div>
      )}

      {sortedItems.length > INV_PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 20 }}>
          <button className="ghost" onClick={() => setInvPage(p => Math.max(0, p - 1))} disabled={invPage === 0}>←</button>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 400, justifyContent: 'center' }}>
            {Array.from({ length: totalInvPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setInvPage(i)}
                style={{
                  width: 9, height: 9, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
                  background: i === invPage ? 'var(--gold)' : 'var(--line)'
                }}
              />
            ))}
          </div>
          <button className="ghost" onClick={() => setInvPage(p => Math.min(totalInvPages - 1, p + 1))} disabled={invPage === totalInvPages - 1}>→</button>
        </div>
      )}
      </>
      )}


      {view === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h3 style={{ marginTop: 8, marginBottom: 0 }}>Pedidos ({orders.length})</h3>
            <button className="ghost" onClick={() => downloadFile('/api/export-orders', 'boveda-arcana-pedidos.csv')}>Exportar pedidos confirmados (CSV)</button>
          </div>
          {orders.length === 0 && <p className="hint">Todavía no hay pedidos.</p>}
          {orders.map(o => {
            const st = orderDisplayStatus(o);
            const badgeColor = st === 'Pendiente' ? 'var(--gold)' : st === 'Confirmado' ? 'var(--teal)' : st === 'Vencido' ? 'var(--blood)' : 'var(--muted)';
            return (
              <div key={o.id} style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ color: badgeColor, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{st}</span>
                    <span className="hint" style={{ marginLeft: 10 }}>Pedido #{o.id} · {new Date(o.createdAt).toLocaleString('es-MX')}</span>
                    {o.customerName && <div style={{ fontSize: '0.85rem', marginTop: 2 }}>Cliente: <strong>{o.customerName}</strong>{o.customerPhone ? ` · ${o.customerPhone}` : ''}</div>}
                  </div>
                  {o.status === 'pending' && st !== 'Vencido' && (
                    <span className="hint">{timeLeft(o.expiresAt)}</span>
                  )}
                </div>
                <ul style={{ margin: '10px 0', paddingLeft: 18 }}>
                  {o.items.map(it => (
                    <li key={it.id} className="hint" style={{ color: 'var(--parchment)' }}>
                      {it.name} x{it.qty} — ${Number(it.priceUsd).toFixed(2)} USD c/u
                      {o.status === 'pending' && editingOrder === o.id && (
                        <button className="ghost" style={{ marginLeft: 8, padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => removeOrderItem(o.id, it.id)}>Quitar</button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mono" style={{ color: 'var(--gold)', marginBottom: 10 }}>Total: ${Number(o.totalUsd).toFixed(2)} USD</div>

                {o.status === 'pending' && editingOrder === o.id && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                    <select value={addToOrderId} onChange={e => setAddToOrderId(e.target.value)} style={{ maxWidth: 220 }}>
                      <option value="">Agregar carta del inventario...</option>
                      {items.filter(it => it.qty > 0).map(it => <option key={it.id} value={it.id}>{it.name} (x{it.qty} libres)</option>)}
                    </select>
                    <input type="number" value={addToOrderQty} onChange={e => setAddToOrderQty(parseInt(e.target.value) || 1)} style={{ width: 60 }} min="1" />
                    <button className="ghost" onClick={() => addOrderItem(o.id)}>Agregar</button>
                  </div>
                )}

                {(o.status === 'pending') && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="primary" onClick={() => setOrderStatus(o.id, 'confirmed')}>Confirmar venta</button>
                    <button className="ghost" onClick={() => setOrderStatus(o.id, 'cancelled')}>Cancelar</button>
                    <button className="ghost" onClick={() => setEditingOrder(editingOrder === o.id ? null : o.id)}>
                      {editingOrder === o.id ? 'Listo' : 'Editar pedido'}
                    </button>
                  </div>
                )}
                <a href={`/recibo/${o.id}`} target="_blank" rel="noreferrer">
                  <button className="ghost" style={{ marginTop: 8 }}>Ver / imprimir recibo</button>
                </a>
              </div>
            );
          })}
        </div>
      )}

      {view === 'users' && (
        <div>
          <h3 style={{ marginTop: 8 }}>Usuarios registrados ({customers.length})</h3>
          <p className="hint">Solo aparecen aquí quienes crearon una cuenta. Los pedidos de invitados no generan usuario.</p>
          {customers.length === 0 && <p className="hint">Todavía no hay usuarios registrados.</p>}
          {customers.map(c => (
            <div key={c.id} style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 10, padding: 16, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong>{c.name}</strong>
                  <span className="hint" style={{ marginLeft: 10 }}>{c.email}</span>
                  {c.phone && <span className="hint" style={{ marginLeft: 10 }}>{c.phone}</span>}
                  <div className="hint">Registrado {new Date(c.createdAt).toLocaleDateString('es-MX')} · {c.orderCount} pedido(s)</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="ghost" onClick={() => setEditingCustomer({ ...c })}>Editar</button>
                  <button className="ghost" onClick={() => deleteCustomer(c.id)}>Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'pricing' && pricingSettings && (
        <div style={{ maxWidth: 420 }}>
          <h3 style={{ marginTop: 8 }}>Precio automático según condición</h3>
          <p className="hint">
            Al agregar una carta, el precio se sugiere como este % del precio de referencia de Scryfall (que es el
            precio de una carta en Near Mint). Se aplica solo, pero siempre puedes ajustarlo a mano después.
          </p>
          {[
            ['Near Mint', 'nearMintPct'],
            ['Lightly Played', 'lightlyPlayedPct'],
            ['Moderately Played', 'moderatelyPlayedPct'],
            ['Heavily Played', 'heavilyPlayedPct'],
            ['Damaged', 'damagedPct']
          ].map(([label, field]) => (
            <div key={field} className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ width: 160, marginBottom: 0 }}>{label}</label>
              <input type="number" value={pricingSettings[field]} onChange={e => setPricingSettings(s => ({ ...s, [field]: e.target.value }))} style={{ width: 80 }} />
              <span className="hint">%</span>
            </div>
          ))}
          <button className="primary" onClick={savePricingSettings}>Guardar porcentajes</button>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '32px 0 20px' }} />

          <h3>Tipo de cambio</h3>
          <p className="hint">
            Por default se usa el tipo de cambio del día (USD → MXN, actualizado una vez al día).
            Si quieres fijar tú el número —por ejemplo redondearlo hacia abajo, o darte un margen— actívalo aquí.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <input type="checkbox" checked={pricingSettings.customRateEnabled} onChange={e => setPricingSettings(s => ({ ...s, customRateEnabled: e.target.checked }))} style={{ width: 'auto' }} />
            <label style={{ marginBottom: 0 }}>Usar tipo de cambio manual</label>
          </div>
          {pricingSettings.customRateEnabled && (
            <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 220 }}>
              <input type="number" step="0.01" value={pricingSettings.customRate ?? ''} onChange={e => setPricingSettings(s => ({ ...s, customRate: e.target.value }))} placeholder="ej. 17.00" />
              <span className="hint">MXN por USD</span>
            </div>
          )}
          {liveRate && <p className="hint">Hoy la API marca: ${liveRate.toFixed(2)} MXN por USD</p>}
          <button className="primary" onClick={savePricingSettings}>Guardar tipo de cambio</button>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '32px 0 20px' }} />

          <h3>Descuento general de la tienda</h3>
          <p className="hint">
            Baja el precio de TODA la tienda un porcentaje extra, encima de cualquier descuento por condición u oferta
            individual. Se muestra un banner en la tienda avisando a los clientes.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <input type="checkbox" checked={pricingSettings.globalDiscountEnabled} onChange={e => setPricingSettings(s => ({ ...s, globalDiscountEnabled: e.target.checked }))} style={{ width: 'auto' }} />
            <label style={{ marginBottom: 0 }}>Activar descuento general</label>
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 200 }}>
            <input type="number" value={pricingSettings.globalDiscountPct} onChange={e => setPricingSettings(s => ({ ...s, globalDiscountPct: e.target.value }))} style={{ width: 80 }} />
            <span className="hint">% de descuento</span>
          </div>
          <div className="field">
            <label>Empieza (opcional — si lo dejas vacío, empieza ya)</label>
            <input type="datetime-local" value={pricingSettings.globalDiscountStart ? pricingSettings.globalDiscountStart.slice(0, 16) : ''} onChange={e => setPricingSettings(s => ({ ...s, globalDiscountStart: e.target.value }))} />
          </div>
          <div className="field">
            <label>Termina (opcional — si lo dejas vacío, dura hasta que lo apagues)</label>
            <input type="datetime-local" value={pricingSettings.globalDiscountEnd ? pricingSettings.globalDiscountEnd.slice(0, 16) : ''} onChange={e => setPricingSettings(s => ({ ...s, globalDiscountEnd: e.target.value }))} />
          </div>
          <button className="primary" onClick={savePricingSettings}>Guardar descuento general</button>
        </div>
      )}

      {view === 'stats' && (
        <div>
          <h3 style={{ marginTop: 8 }}>Estadísticas</h3>
          {!stats && <p className="hint">Cargando...</p>}
          {stats && (
            <>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 10, padding: 18, minWidth: 180, flex: 1 }}>
                  <div className="hint">Total vendido</div>
                  <div className="price mono" style={{ fontSize: '1.4rem' }}>${stats.totalSoldUsd.toFixed(2)} USD</div>
                  {rate && <div className="hint">≈${(stats.totalSoldUsd * rate).toFixed(2)} MXN</div>}
                </div>
                <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 10, padding: 18, minWidth: 180, flex: 1 }}>
                  <div className="hint">Cartas vendidas</div>
                  <div className="price mono" style={{ fontSize: '1.4rem' }}>{stats.totalCardsSold}</div>
                </div>
                <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 10, padding: 18, minWidth: 180, flex: 1 }}>
                  <div className="hint">Pedidos confirmados</div>
                  <div className="price mono" style={{ fontSize: '1.4rem' }}>{stats.confirmedOrdersCount}</div>
                </div>
              </div>

              <h4>Ingresos por mes (USD)</h4>
              {stats.monthly.length === 0 && <p className="hint">Todavía no hay ventas confirmadas.</p>}
              {stats.monthly.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  {stats.monthly.map(m => {
                    const max = Math.max(...stats.monthly.map(x => x.total));
                    return (
                      <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span className="hint" style={{ width: 70 }}>{m.month}</span>
                        <div style={{ background: 'var(--gold)', height: 16, borderRadius: 4, width: `${Math.max(4, (m.total / max) * 100)}%` }} />
                        <span className="mono" style={{ fontSize: '0.8rem' }}>${m.total.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <h4>Cartas más vistas sin vender</h4>
              <p className="hint" style={{ marginTop: -6 }}>Buenas candidatas para bajarle el precio o revisar por qué no se mueven.</p>
              {stats.viewedNotSold.length === 0 && <p className="hint">No hay datos suficientes todavía.</p>}
              {stats.viewedNotSold.map(it => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <span>{it.name}</span>
                  <span className="hint">👁 {it.views} vistas · ${it.price.toFixed(2)} USD</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {view === 'decks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Decks ({decks.length})</h3>
            {!deckForm && <button className="primary" onClick={openNewDeckForm}>+ Nuevo deck</button>}
          </div>

          {!deckForm && (
            <div className="grid">
              {decks.map(d => (
                <div className="card" key={d.id} style={{ opacity: d.active ? 1 : 0.5 }}>
                  <div className="art">{d.coverImg && <img src={d.coverImg} alt={d.name} />}</div>
                  <div className="info">
                    <div className="name">{d.name}</div>
                    <div className="set">{d.cardCount} cartas · {d.active ? 'Disponible' : 'Vendido / apagado'}</div>
                    {d.originalPrice && Number(d.originalPrice) > Number(d.price) && (
                      <div className="hint" style={{ textDecoration: 'line-through', marginTop: -4 }}>${Number(d.originalPrice).toFixed(2)} USD</div>
                    )}
                    <div className="price mono">${Number(d.price).toFixed(2)} USD{rate ? ` · ≈$${(Number(d.price) * rate).toFixed(2)} MXN` : ''}</div>
                    <div className="row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="ghost" style={{ flex: 1 }} onClick={() => editDeck(d)}>Editar</button>
                      <button className="ghost" style={{ flex: 1 }} onClick={() => toggleDeckStatus(d)}>{d.active ? 'Marcar vendido' : 'Reactivar'}</button>
                      <button className="ghost" style={{ flex: 1 }} onClick={() => deleteDeck(d.id)}>Eliminar</button>
                    </div>
                    <a href={`/decks/${d.id}`} target="_blank" rel="noreferrer"><button className="ghost" style={{ width: '100%', marginTop: 6 }}>Ver página pública</button></a>
                  </div>
                </div>
              ))}
              {decks.length === 0 && <p className="hint">Todavía no tienes decks. Dale a "+ Nuevo deck" para armar el primero.</p>}
            </div>
          )}

          {deckForm && (
            <div style={{ maxWidth: 520 }}>
              <h4>Datos del deck</h4>
              <div className="field"><label>Nombre del deck</label><input value={deckForm.name} onChange={e => setDeckForm(f => ({ ...f, name: e.target.value }))} /></div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Precio de referencia (suma de cartas)</label>
                  <input type="number" value={deckForm.originalPrice} onChange={e => setDeckForm(f => ({ ...f, originalPrice: e.target.value }))} placeholder="se calcula solo al procesar la lista" />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Precio de venta (USD, todo el deck)</label>
                  <input type="number" value={deckForm.price} onChange={e => setDeckForm(f => ({ ...f, price: e.target.value }))} />
                </div>
              </div>
              {deckForm.originalPrice && deckForm.price && parseFloat(deckForm.originalPrice) > parseFloat(deckForm.price) && (
                <p className="hint" style={{ marginTop: -10, color: 'var(--teal)' }}>
                  Descuento de {Math.round((1 - deckForm.price / deckForm.originalPrice) * 100)}% vs. comprar las cartas por separado — así se verá en la página del deck.
                </p>
              )}

              <div className="field"><label>Descripción (opcional)</label><input value={deckForm.description} onChange={e => setDeckForm(f => ({ ...f, description: e.target.value }))} /></div>

              <div className="field">
                <label>Carta de portada (ej. el comandante)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={coverQuery} onChange={e => setCoverQuery(e.target.value)} placeholder="Nombre de la carta de portada" />
                  <button className="ghost" onClick={searchCoverCard}>Buscar</button>
                </div>
                {deckForm.coverImg && (
                  <div style={{ marginTop: 8 }}>
                    <img src={deckForm.coverImg} alt={deckForm.coverName} style={{ width: 100, borderRadius: 6 }} />
                    <p className="hint">{deckForm.coverName}</p>
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '20px 0' }} />

              <h4>Lista de cartas</h4>
              <div className="field">
                <label>Importar desde Moxfield (opcional)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={moxfieldUrl} onChange={e => setMoxfieldUrl(e.target.value)} placeholder="https://moxfield.com/decks/..." />
                  <button className="ghost" onClick={importFromMoxfield} disabled={deckImporting}>{deckImporting ? 'Importando...' : 'Importar'}</button>
                </div>
                <p className="hint" style={{ marginTop: 4, color: 'var(--gold)' }}>
                  ⚠️ Moxfield bloquea este tipo de conexión automática seguido (protección anti-bots de su parte, no es un error de esta tienda).
                  Si falla, no reintentes muchas veces — mejor usa "pegar lista a mano" abajo, que es 100% confiable.
                </p>
              </div>

              <div className="field">
                <label>O pega la lista a mano (una carta por línea, ej. "1 Sol Ring")</label>
                <textarea value={deckPasteText} onChange={e => setDeckPasteText(e.target.value)} rows={6}
                  style={{ width: '100%', background: 'var(--ink2)', border: '1px solid var(--line)', color: 'var(--parchment)', borderRadius: 'var(--radius)', padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.85rem' }} />
                <button className="ghost" style={{ marginTop: 8 }} onClick={processDeckPaste} disabled={deckImporting}>{deckImporting ? 'Buscando cartas...' : 'Procesar lista'}</button>
              </div>

              {deckCards.length > 0 && (
                <>
                  <div style={{ marginTop: 16, maxHeight: 380, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
                    {deckCards.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: '0.85rem', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
                        {c.img && <img src={c.img} style={{ width: 24, height: 33, objectFit: 'cover', borderRadius: 3 }} />}
                        <span style={{ flex: '1 1 140px', minWidth: 120 }}>
                          {c.name}
                          {c.status === 'loading' && <span className="hint"> · buscando...</span>}
                          {c.status === 'notfound' && <span style={{ color: 'var(--blood)' }}> · no encontrada</span>}
                        </span>

                        {c.status !== 'loading' && c.status !== 'notfound' && (
                          <>
                            <input type="number" value={c.qty} min="1" onChange={e => updateDeckCardRow(i, { qty: parseInt(e.target.value) || 1 })} style={{ width: 50 }} title="Cantidad" />
                            <select value={c.condition || 'Near Mint'} onChange={e => changeRowCondition(i, e.target.value)} style={{ width: 130 }}>
                              <option>Near Mint</option><option>Lightly Played</option><option>Moderately Played</option><option>Heavily Played</option><option>Damaged</option>
                            </select>
                            <input type="number" value={c.price ?? ''} onChange={e => updateDeckCardRow(i, { price: e.target.value })} placeholder="USD" style={{ width: 70 }} title="Precio unitario (USD)" />
                          </>
                        )}

                        {c.status === 'done' && (c.inventoryId
                          ? <span className="hint" style={{ color: 'var(--teal)' }}>en inventario</span>
                          : <button className="ghost" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => quickAddToInventory(c, i)}>+ Agregar a inventario</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="hint" style={{ marginTop: 6 }}>
                    El precio de referencia del deck (arriba) se suma solo con estos valores unitarios × cantidad. Si le cambias el precio o la condición a una carta, la suma se actualiza.
                  </p>
                  {deckCards.some(c => c.status === 'notfound') && (
                    <button className="ghost" style={{ marginTop: 8 }} onClick={retryFailedDeckCards} disabled={deckImporting}>
                      Reintentar fallidas ({deckCards.filter(c => c.status === 'notfound').length})
                    </button>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="primary" onClick={saveDeck}>Guardar deck</button>
                <button className="ghost" onClick={() => setDeckForm(null)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {editingCustomer && (
        <div className="modal-bg show">
          <div className="modal" style={{ maxWidth: 380 }}>
            <h3 style={{ marginTop: 0 }}>Editar usuario</h3>
            <div className="field"><label>Nombre</label><input value={editingCustomer.name} onChange={e => setEditingCustomer(c => ({ ...c, name: e.target.value }))} /></div>
            <div className="field"><label>Correo</label><input value={editingCustomer.email} onChange={e => setEditingCustomer(c => ({ ...c, email: e.target.value }))} /></div>
            <div className="field"><label>Teléfono</label><input value={editingCustomer.phone || ''} onChange={e => setEditingCustomer(c => ({ ...c, phone: e.target.value }))} /></div>
            <div className="field"><label>Dirección</label><input value={editingCustomer.address || ''} onChange={e => setEditingCustomer(c => ({ ...c, address: e.target.value }))} /></div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setEditingCustomer(null)}>Cancelar</button>
              <button className="primary" onClick={saveCustomer}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {wipeModal && (
        <div className="modal-bg show">
          <div className="modal" style={{ maxWidth: 380, borderColor: 'var(--blood)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--blood)' }}>¿Borrar TODA la biblioteca?</h3>
            <p style={{ fontSize: '0.9rem' }}>
              Esto va a eliminar las <strong>{items.length} cartas</strong> de tu inventario de forma permanente.
              No se puede deshacer. El historial de pedidos se conserva, pero perderá el vínculo con las cartas.
            </p>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setWipeModal(false)}>Cancelar</button>
              <button
                onClick={wipeInventory}
                disabled={wipeCountdown > 0}
                style={{
                  flex: 1, padding: '12px 22px', borderRadius: 'var(--radius)', fontWeight: 700, border: 'none',
                  cursor: wipeCountdown > 0 ? 'not-allowed' : 'pointer',
                  background: wipeCountdown > 0 ? 'var(--line)' : 'var(--blood)',
                  color: wipeCountdown > 0 ? 'var(--muted)' : 'var(--parchment)'
                }}
              >
                {wipeCountdown > 0 ? `Espera ${wipeCountdown}s...` : 'Sí, borrar todo definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalItem && (
        <div className="modal-bg show">
          <div className="modal" style={{ maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{modalItem.mode === 'edit' ? 'Editar carta' : 'Agregar carta'}</h3>

            {modalItem.img && <img src={modalItem.img} alt={modalItem.name} style={{ width: 100, borderRadius: 6, marginBottom: 12 }} />}

            <div className="field"><label>Nombre</label><input value={modalItem.name} onChange={e => setModalItem(m => ({ ...m, name: e.target.value }))} /></div>
            <div className="field"><label>Edición / set</label><input value={modalItem.set_name} onChange={e => setModalItem(m => ({ ...m, set_name: e.target.value }))} /></div>
            <div className="field"><label>URL de imagen</label><input value={modalItem.img} onChange={e => setModalItem(m => ({ ...m, img: e.target.value }))} /></div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Precio (USD)</label>
                <input type="number" value={modalItem.price} onChange={e => setModalItem(m => ({ ...m, price: e.target.value }))} />
                {rate && modalItem.price !== '' && !isNaN(parseFloat(modalItem.price)) && (
                  <p className="hint" style={{ marginTop: 4, marginBottom: 0 }}>≈ ${(parseFloat(modalItem.price) * rate).toFixed(2)} MXN</p>
                )}
              </div>
              <div className="field" style={{ flex: 1 }}><label>Cantidad</label><input type="number" value={modalItem.qty} onChange={e => setModalItem(m => ({ ...m, qty: e.target.value }))} /></div>
            </div>

            <div className="field">
              <label>Precio original (opcional, para mostrar oferta tachada)</label>
              <input type="number" value={modalItem.original_price} onChange={e => setModalItem(m => ({ ...m, original_price: e.target.value }))} placeholder="ej. 15.00" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.8rem' }}>
              <span className="hint">Ref. mercado: {modalItem.ref_usd ? `$${modalItem.ref_usd} USD` : 'sin dato'}</span>
              <button className="ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={refreshRefPrice} disabled={modalItem.refreshing}>
                {modalItem.refreshing ? 'Buscando...' : 'Actualizar'}
              </button>
              {modalItem.mode === 'edit' && (
                <button className="ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => loadPriceHistory(modalItem.id)}>Ver historial</button>
              )}
            </div>

            {priceHistory === 'loading' && <p className="hint">Cargando historial...</p>}
            {Array.isArray(priceHistory) && (
              <div style={{ marginBottom: 14, maxHeight: 140, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
                {priceHistory.length === 0 && <p className="hint" style={{ margin: 0 }}>Sin historial todavía.</p>}
                {priceHistory.map(s => (
                  <div key={s.id} className="hint" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{new Date(s.recordedAt).toLocaleDateString('es-MX')}</span>
                    <span>Tú: ${s.myPrice.toFixed(2)} {s.refPrice ? `· Mercado: $${s.refPrice.toFixed(2)}` : ''}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="field"><label>Condición</label>
              <select value={modalItem.condition} onChange={e => {
                const newCond = e.target.value;
                setModalItem(m => {
                  const next = { ...m, condition: newCond };
                  if (m.ref_usd) next.price = (parseFloat(m.ref_usd) * pctFor(newCond) / 100).toFixed(2);
                  return next;
                });
              }}>
                <option>Near Mint</option><option>Lightly Played</option><option>Moderately Played</option><option>Heavily Played</option><option>Damaged</option>
              </select>
              <p className="hint" style={{ marginTop: 4, marginBottom: 0 }}>
                {pctFor(modalItem.condition)}% del precio de referencia{modalItem.ref_usd ? ` ($${modalItem.ref_usd} USD NM)` : ''}
              </p>
            </div>

            <div className="field"><label>Rareza</label>
              <select value={modalItem.rarity} onChange={e => setModalItem(m => ({ ...m, rarity: e.target.value }))}>
                <option value="">Sin especificar</option>
                <option value="common">Common</option><option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option><option value="mythic">Mythic</option>
              </select>
            </div>

            <div className="field"><label>Tipo</label><input value={modalItem.type_line} onChange={e => setModalItem(m => ({ ...m, type_line: e.target.value }))} placeholder="ej. Creature — Human Wizard" /></div>

            <div className="field"><label>Idioma</label>
              <select value={modalItem.language} onChange={e => setModalItem(m => ({ ...m, language: e.target.value }))}>
                {Object.entries(LANGUAGES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </div>

            <label>Colores</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0 14px' }}>
              {Object.entries({ W: 'W', U: 'U', B: 'B', R: 'R', G: 'G' }).map(([code]) => (
                <button key={code} className="ghost" onClick={() => toggleModalColor(code)}
                  style={{
                    width: 34, padding: '6px 0',
                    borderColor: modalItem.colors.includes(code) ? 'var(--gold)' : 'var(--line)',
                    background: modalItem.colors.includes(code) ? 'rgba(201,162,39,0.12)' : 'transparent',
                    color: modalItem.colors.includes(code) ? 'var(--gold)' : 'var(--parchment)'
                  }}>{code}</button>
              ))}
            </div>

            <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="foilCheck" checked={modalItem.foil} onChange={e => setModalItem(m => ({ ...m, foil: e.target.checked }))} style={{ width: 'auto' }} />
              <label htmlFor="foilCheck" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><span className="foil-badge" /> Es versión Foil</label>
            </div>

            <div className="field"><label>Notas internas (solo tú las ves)</label>
              <textarea value={modalItem.notes} onChange={e => setModalItem(m => ({ ...m, notes: e.target.value }))} rows={2}
                style={{ width: '100%', background: 'var(--ink2)', border: '1px solid var(--line)', color: 'var(--parchment)', borderRadius: 'var(--radius)', padding: '10px 12px', fontFamily: 'Inter', fontSize: '0.85rem' }}
                placeholder="ej. Reservada para Juan en persona" />
            </div>

            <div className="field"><label>Link de pago Stripe (opcional)</label><input value={modalItem.stripe_link} onChange={e => setModalItem(m => ({ ...m, stripe_link: e.target.value }))} placeholder="https://buy.stripe.com/..." /></div>

            <div className="modal-actions">
              <button className="ghost" onClick={() => { setModalItem(null); setPriceHistory(null); }}>Cancelar</button>
              <button className="primary" onClick={saveModalItem}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
