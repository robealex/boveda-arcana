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

  useEffect(() => {
    fetch('/api/exchange-rate').then(r => r.json()).then(d => setRate(d.rate));
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

  async function addFromSearch(card) {
    const refText = card.usd ? `(ref. Scryfall: $${card.usd} USD)` : '(sin precio de referencia)';
    const price = prompt(`Precio de venta en USD para "${card.name}" ${refText}:`, card.usd || '');
    if (!price || isNaN(parseFloat(price))) return;
    const qty = prompt('Cantidad disponible:', '1') || '1';
    const condition = prompt('Condición (Near Mint / Lightly Played / etc.):', 'Near Mint') || 'Near Mint';
    await saveItem({ name: card.name, set_name: card.set_name, img: card.img, price: parseFloat(price), qty: parseInt(qty), condition, colors: card.colors, rarity: card.rarity, type_line: card.type_line });
  }

  async function saveItem(payload) {
    const r = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify(payload)
    });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error al guardar'); return; }
    loadInventory();
  }

  async function deleteItem(id) {
    if (!confirm('¿Eliminar esta carta del inventario?')) return;
    const r = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE', headers: { 'x-admin-password': pw } });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error al eliminar'); return; }
    loadInventory();
  }

  async function editItem(it) {
    const price = prompt(`Nuevo precio en USD para "${it.name}":`, Number(it.price).toFixed(2));
    if (price === null) return;
    const qty = prompt('Nueva cantidad TOTAL en tu posesión (sin restar apartados):', it.rawQty);
    if (qty === null) return;
    const condition = prompt('Nueva condición:', it.condition || 'Near Mint');
    if (condition === null) return;
    if (isNaN(parseFloat(price)) || isNaN(parseInt(qty))) { alert('Precio o cantidad inválidos.'); return; }
    const r = await fetch(`/api/inventory?id=${it.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify({ price: parseFloat(price), qty: parseInt(qty), condition })
    });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error al actualizar'); return; }
    loadInventory();
  }

  // ---------- Pedidos ----------
  const [view, setView] = useState('inventory');
  const [orders, setOrders] = useState([]);

  function loadOrders() {
    fetch('/api/orders', { headers: { 'x-admin-password': pw } }).then(r => r.json()).then(d => setOrders(d.orders || []));
  }

  useEffect(() => { if (authed && view === 'orders') loadOrders(); }, [authed, view]);

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
      </div>

      {view === 'inventory' && (
      <>
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
              <button className="ghost" onClick={() => addFromSearch(c)}>Agregar a inventario</button>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <h3 style={{ margin: 0 }}>Inventario actual ({items.length})</h3>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 220 }}>
          <option value="newest">Más nuevas primero</option>
          <option value="name">Nombre (A-Z)</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
        </select>
      </div>
      <div className="grid" style={{ marginTop: 16 }}>
        {sortedItems.map(it => (
          <div className="card" key={it.id}>
            <div className="art">{it.img && <img src={it.img} alt={it.name} />}</div>
            <div className="info">
              <div className="name">{it.name}</div>
              <div className="set">
                {it.condition} · x{it.rawQty}{it.reserved > 0 ? ` (${it.reserved} apartadas, ${it.qty} libres)` : ''}
              </div>
              <div className="price mono">${Number(it.price).toFixed(2)} USD{rate ? ` · ≈$${(Number(it.price) * rate).toFixed(2)} MXN` : ''}</div>
              <div className="row" style={{ display: 'flex', gap: 8 }}>
                <button className="ghost" style={{ flex: 1 }} onClick={() => editItem(it)}>Editar</button>
                <button className="ghost" style={{ flex: 1 }} onClick={() => deleteItem(it.id)}>Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      </>
      )}

      {view === 'orders' && (
        <div>
          <h3 style={{ marginTop: 8 }}>Pedidos ({orders.length})</h3>
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
                  </div>
                  {o.status === 'pending' && st !== 'Vencido' && (
                    <span className="hint">{timeLeft(o.expiresAt)}</span>
                  )}
                </div>
                <ul style={{ margin: '10px 0', paddingLeft: 18 }}>
                  {o.items.map(it => (
                    <li key={it.id} className="hint" style={{ color: 'var(--parchment)' }}>
                      {it.name} x{it.qty} — ${Number(it.priceUsd).toFixed(2)} USD c/u
                    </li>
                  ))}
                </ul>
                <div className="mono" style={{ color: 'var(--gold)', marginBottom: 10 }}>Total: ${Number(o.totalUsd).toFixed(2)} USD</div>
                {(o.status === 'pending') && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="primary" onClick={() => setOrderStatus(o.id, 'confirmed')}>Confirmar venta</button>
                    <button className="ghost" onClick={() => setOrderStatus(o.id, 'cancelled')}>Cancelar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
