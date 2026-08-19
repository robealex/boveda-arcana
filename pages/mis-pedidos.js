import { useState } from 'react';
import Head from 'next/head';
import ThemeToggle from '../components/ThemeToggle';

export default function MisPedidos() {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);

  function statusLabel(o) {
    if (o.status === 'pending' && new Date(o.expiresAt) < new Date()) return { text: 'Vencido', color: 'var(--blood)' };
    if (o.status === 'pending') return { text: 'Pendiente', color: 'var(--gold)' };
    if (o.status === 'confirmed') return { text: 'Confirmado', color: 'var(--teal)' };
    return { text: 'Cancelado', color: 'var(--muted)' };
  }

  async function search() {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const r = await fetch('/api/my-orders?phone=' + encodeURIComponent(phone.trim()));
      const d = await r.json();
      setOrders(d.orders || []);
    } catch (e) {
      setOrders([]);
    }
    setLoading(false);
  }

  return (
    <div>
      <Head>
        <title>Consulta el estatus de tu pedido | Bóveda Arcana</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="hero">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}><ThemeToggle /></div>
        <div className="eyebrow">Bóveda Arcana</div>
        <h1>Mis pedidos</h1>
        <p className="sub">Pon el teléfono que usaste al hacer tu pedido para ver su estatus.</p>
        <p style={{ marginTop: 10 }}><a href="/" style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>← Volver a la tienda</a></p>
      </div>

      <main style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <input placeholder="Tu número de teléfono" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
          <button className="primary" onClick={search} disabled={loading}>{loading ? 'Buscando...' : 'Buscar'}</button>
        </div>

        {orders !== null && orders.length === 0 && <p className="hint">No encontramos pedidos con ese teléfono.</p>}

        {orders && orders.map(o => {
          const st = statusLabel(o);
          return (
            <div key={o.id} style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div>
                <span style={{ color: st.color, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{st.text}</span>
                <span className="hint" style={{ marginLeft: 10 }}>Pedido #{o.id} · {new Date(o.createdAt).toLocaleString('es-MX')}</span>
              </div>
              <ul style={{ margin: '10px 0', paddingLeft: 18 }}>
                {o.items.map(it => (
                  <li key={it.id} className="hint" style={{ color: 'var(--parchment)' }}>{it.name} x{it.qty}</li>
                ))}
              </ul>
              <div className="mono" style={{ color: 'var(--gold)' }}>Total: ${Number(o.totalUsd).toFixed(2)} USD</div>
            </div>
          );
        })}
      </main>

      <footer>Bóveda Arcana</footer>
    </div>
  );
}
