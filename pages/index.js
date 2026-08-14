import { useEffect, useState } from 'react';

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
const SHOP_OWNER = process.env.NEXT_PUBLIC_SHOP_OWNER || '';

export default function Home() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [rate, setRate] = useState(null);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetch('/api/inventory').then(r => r.json()).then(d => setItems(d.items || []));
    fetch('/api/exchange-rate').then(r => r.json()).then(d => setRate(d.rate));
  }, []);

  const visible = items
    .filter(it => it.qty > 0 && it.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
      if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  function mxn(usdPrice) {
    if (!rate) return null;
    return usdPrice * rate;
  }

  function addToCart(it) {
    setCart(prev => {
      const existing = prev.find(c => c.id === it.id);
      if (existing) {
        if (existing.qty < it.qty) return prev.map(c => c.id === it.id ? { ...c, qty: c.qty + 1 } : c);
        return prev;
      }
      return [...prev, { id: it.id, name: it.name, priceUsd: Number(it.price), img: it.img, qty: 1, max: it.qty, stripe_link: it.stripe_link }];
    });
    setCartOpen(true);
  }

  function changeQty(id, delta) {
    setCart(prev => prev
      .map(c => c.id === id ? { ...c, qty: Math.min(c.max, c.qty + delta) } : c)
      .filter(c => c.qty > 0));
  }

  const totalUsd = cart.reduce((s, c) => s + c.priceUsd * c.qty, 0);
  const totalMxn = mxn(totalUsd);

  function checkoutWhatsapp() {
    if (!WA_NUMBER) { alert('El vendedor todavía no configuró su número de WhatsApp (NEXT_PUBLIC_WHATSAPP_NUMBER).'); return; }
    const lines = cart.map(c => {
      const lineMxn = mxn(c.priceUsd * c.qty);
      return `• ${c.name} x${c.qty} — $${lineMxn ? lineMxn.toFixed(2) : '?'} MXN`;
    }).join('%0A');
    const msg = `Hola! Quiero comprar estas cartas de Bóveda Arcana:%0A${lines}%0A%0ATotal: $${totalMxn ? totalMxn.toFixed(2) : '?'} MXN`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
  }

  return (
    <div>
      <div className="hero">
        <div className="eyebrow">Colección personal · Ensenada, MX</div>
        <h1>Bóveda Arcana</h1>
        <p className="sub">Cartas de Magic: The Gathering en venta{SHOP_OWNER ? ` · por ${SHOP_OWNER}` : ''}. Selecciona las que quieras y te contactamos para cerrar la venta.</p>
      </div>

      <main>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          <div className="field" style={{ maxWidth: 300, marginBottom: 0 }}>
            <input placeholder="Filtrar por nombre..." value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="newest">Más nuevas primero</option>
            <option value="name">Nombre (A-Z)</option>
            <option value="price_asc">Precio: menor a mayor</option>
            <option value="price_desc">Precio: mayor a menor</option>
          </select>
        </div>

        {items.length === 0 && <p className="hint">Todavía no hay cartas publicadas.</p>}

        <div className="grid">
          {visible.map(it => (
            <div className="card" key={it.id}>
              <div className="art">{it.img && <img src={it.img} alt={it.name} />}</div>
              <div className="info">
                {it.qty <= 2 && <span className="badge">Últimas {it.qty}</span>}
                <div className="name">{it.name}</div>
                <div className="set">{it.condition}</div>
                <div className="price mono">{rate ? `$${mxn(Number(it.price)).toFixed(2)} MXN` : 'Cargando precio...'}</div>
                <div className="hint" style={{ marginTop: -4 }}>${Number(it.price).toFixed(2)} USD</div>
                <button className="primary" onClick={() => addToCart(it)}>Agregar</button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <button className="cart-fab" onClick={() => setCartOpen(true)}>
        🛒 {cart.reduce((s, c) => s + c.qty, 0)}
      </button>

      {cartOpen && (
        <>
          <div className="overlay" onClick={() => setCartOpen(false)} />
          <div className="cart-panel">
            <h2>Tu carrito</h2>
            {cart.length === 0 && <p className="hint">Vacío por ahora.</p>}
            {cart.map(c => (
              <div className="cart-item" key={c.id}>
                {c.img && <img src={c.img} alt={c.name} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.name}</div>
                  <div className="mono" style={{ color: 'var(--gold)', fontSize: '0.78rem' }}>{rate ? `$${mxn(c.priceUsd).toFixed(2)} MXN` : '...'} <span style={{ color: 'var(--muted)' }}>(${c.priceUsd.toFixed(2)} USD)</span></div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <button className="ghost" onClick={() => changeQty(c.id, -1)}>−</button>
                    <span>{c.qty}</span>
                    <button className="ghost" onClick={() => changeQty(c.id, 1)}>+</button>
                  </div>
                </div>
              </div>
            ))}
            <div className="cart-total"><span>Total</span><span className="mono">{totalMxn ? `$${totalMxn.toFixed(2)} MXN` : '...'}</span></div>
            {cart.length === 1 && cart[0].stripe_link && (
              <a href={cart[0].stripe_link} target="_blank" rel="noreferrer">
                <button className="primary" style={{ width: '100%', marginBottom: 10 }}>Pagar con Stripe</button>
              </a>
            )}
            <button className="primary" style={{ width: '100%' }} onClick={checkoutWhatsapp}>Enviar pedido por WhatsApp</button>
            <button className="ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setCartOpen(false)}>Cerrar</button>
          </div>
        </>
      )}

      <footer>Bóveda Arcana · Precios de referencia cortesía de Scryfall</footer>
    </div>
  );
}
