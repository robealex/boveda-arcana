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

  async function search() {
    if (!q.trim()) return;
    setSearching(true); setError('');
    try {
      const r = await fetch('/api/search-cards?q=' + encodeURIComponent(q));
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Sin resultados'); setResults([]); }
      else setResults(d.data || []);
    } catch (e) { setError('Error al buscar'); }
    setSearching(false);
  }

  async function addFromSearch(card) {
    const refText = card.usd ? `(ref. Scryfall: $${card.usd} USD)` : '(sin precio de referencia)';
    const price = prompt(`Precio de venta en USD para "${card.name}" ${refText}:`, card.usd || '');
    if (!price || isNaN(parseFloat(price))) return;
    const qty = prompt('Cantidad disponible:', '1') || '1';
    const condition = prompt('Condición (Near Mint / Lightly Played / etc.):', 'Near Mint') || 'Near Mint';
    await saveItem({ name: card.name, set_name: card.set_name, img: card.img, price: parseFloat(price), qty: parseInt(qty), condition });
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
      <h2>Administrar inventario</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        <input placeholder="Buscar carta en Scryfall (ej. Sol Ring)" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
        <button className="primary" onClick={search} disabled={searching}>{searching ? 'Buscando...' : 'Buscar'}</button>
      </div>
      {error && <p className="hint">{error}</p>}

      <div className="grid" style={{ marginBottom: 40 }}>
        {results.map((c, i) => (
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

      <h3>Inventario actual ({items.length})</h3>
      <div className="grid">
        {items.map(it => (
          <div className="card" key={it.id}>
            <div className="art">{it.img && <img src={it.img} alt={it.name} />}</div>
            <div className="info">
              <div className="name">{it.name}</div>
              <div className="set">{it.condition} · x{it.qty}</div>
              <div className="price mono">${Number(it.price).toFixed(2)} USD{rate ? ` · ≈$${(Number(it.price) * rate).toFixed(2)} MXN` : ''}</div>
              <button className="ghost" onClick={() => deleteItem(it.id)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
