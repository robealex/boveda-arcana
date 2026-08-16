import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const SHOP_OWNER = process.env.NEXT_PUBLIC_SHOP_OWNER || 'Bóveda Arcana';
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

export default function Recibo() {
  const router = useRouter();
  const { id } = router.query;
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('admin_pw') : null;
    if (saved) { setPw(saved); setAuthed(true); }
  }, []);

  useEffect(() => {
    if (authed && id) {
      fetch(`/api/order-receipt?id=${id}`, { headers: { 'x-admin-password': pw } })
        .then(r => r.json())
        .then(d => { if (d.order) setOrder(d.order); else setError(d.error || 'Error'); });
    }
  }, [authed, id]);

  function tryLogin() {
    sessionStorage.setItem('admin_pw', pw);
    setAuthed(true);
  }

  if (!authed) {
    return (
      <main style={{ maxWidth: 340, marginTop: 100 }}>
        <div className="field"><label>Contraseña de administrador</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && tryLogin()} /></div>
        <button className="primary" onClick={tryLogin}>Entrar</button>
      </main>
    );
  }

  if (error) return <main><p className="hint">{error}</p></main>;
  if (!order) return <main><p className="hint">Cargando...</p></main>;

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .receipt-box { border: none !important; color: black !important; background: white !important; }
        }
      `}</style>
      <main style={{ maxWidth: 480 }}>
        <div className="no-print" style={{ marginBottom: 16 }}>
          <button className="primary" onClick={() => window.print()}>Imprimir / Guardar como PDF</button>
        </div>
        <div className="receipt-box" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>{SHOP_OWNER}</h2>
          <p className="hint">Recibo de pedido #{order.id}</p>
          <p className="hint">Fecha: {new Date(order.createdAt).toLocaleString('es-MX')}</p>
          <p className="hint">Estatus: {order.status === 'confirmed' ? 'Confirmado' : order.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}</p>
          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '16px 0' }} />
          <p><b>Cliente:</b> {order.customerName || '—'}<br />
             <b>Teléfono:</b> {order.customerPhone || '—'}<br />
             <b>Correo:</b> {order.customerEmail || '—'}</p>
          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '16px 0' }} />
          <table style={{ width: '100%', fontSize: '0.9rem' }}>
            <thead><tr><th style={{ textAlign: 'left' }}>Carta</th><th style={{ textAlign: 'right' }}>Cant.</th><th style={{ textAlign: 'right' }}>Precio</th></tr></thead>
            <tbody>
              {order.items.map(it => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td style={{ textAlign: 'right' }}>{it.qty}</td>
                  <td style={{ textAlign: 'right' }}>${Number(it.priceUsd).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '16px 0' }} />
          <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>Total: ${order.totalUsd.toFixed(2)} USD</p>
          {WA_NUMBER && <p className="hint">Contacto: WhatsApp {WA_NUMBER}</p>}
        </div>
      </main>
    </div>
  );
}
