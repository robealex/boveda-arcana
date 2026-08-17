import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function Cuenta() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({ name: '', phone: '', address: '' });
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState('orders');

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    if (!token) { setLoading(false); return; }
    fetch('/api/auth/me', { headers: { 'x-customer-token': token } })
      .then(r => r.json())
      .then(d => {
        if (d.customer) {
          setAccount(d.customer);
          setSettings({ name: d.customer.name || '', phone: d.customer.phone || '', address: d.customer.address || '' });
          loadOrders(token);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function loadOrders(token) {
    fetch('/api/my-account-orders', { headers: { 'x-customer-token': token } })
      .then(r => r.json())
      .then(d => setOrders(d.orders || []));
  }

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  async function submitForgot() {
    setForgotMsg('');
    const r = await fetch('/api/auth/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmail })
    });
    const d = await r.json();
    setForgotMsg(d.message || 'Si ese correo está registrado, te llegará un link.');
  }

  async function submitAuth() {
    setError('');
    const url = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const body = mode === 'login' ? { email: form.email, password: form.password } : form;
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { setError(d.error || 'Error'); return; }
    localStorage.setItem('customer_token', d.token);
    setAccount(d.customer);
    setSettings({ name: d.customer.name || '', phone: d.customer.phone || '', address: d.customer.address || '' });
    loadOrders(d.token);
  }

  async function saveSettings() {
    const token = localStorage.getItem('customer_token');
    const r = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-customer-token': token },
      body: JSON.stringify(settings)
    });
    const d = await r.json();
    if (!r.ok) { alert(d.error || 'Error al guardar'); return; }
    setAccount(d.customer);
    alert('Datos actualizados.');
  }

  function logout() {
    localStorage.removeItem('customer_token');
    setAccount(null);
  }

  function statusLabel(o) {
    if (o.status === 'pending' && new Date(o.expiresAt) < new Date()) return { text: 'Vencido', color: 'var(--blood)' };
    if (o.status === 'pending') return { text: 'Pendiente', color: 'var(--gold)' };
    if (o.status === 'confirmed') return { text: 'Confirmado', color: 'var(--teal)' };
    return { text: 'Cancelado', color: 'var(--muted)' };
  }

  if (loading) return <main><p className="hint">Cargando...</p></main>;

  if (!account) {
    return (
      <div>
        <Head>
          <title>Inicia sesión o crea tu cuenta | Bóveda Arcana</title>
          <meta name="description" content="Crea una cuenta gratis en Bóveda Arcana para guardar tus datos y ver tu historial de compras de cartas de Magic: The Gathering. No es obligatoria para comprar." />
        </Head>
        <div className="hero">
          <div className="eyebrow">Bóveda Arcana</div>
          <h1>Mi cuenta</h1>
          <p className="sub">Crea una cuenta para guardar tus datos y ver tu historial de compras automáticamente. No es necesario para comprar — también puedes seguir comprando como invitado.</p>
          <p style={{ marginTop: 10 }}><a href="/" style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>← Volver a la tienda</a></p>
        </div>
        <main style={{ maxWidth: 400 }}>
          <div className="tabs" style={{ justifyContent: 'flex-start', marginBottom: 20 }}>
            <button className={`tab-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Iniciar sesión</button>
            <button className={`tab-btn ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>Crear cuenta</button>
          </div>

          {mode === 'signup' && (
            <div className="field"><label>Nombre</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          )}
          <div className="field"><label>Correo</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          {mode === 'signup' && (
            <div className="field"><label>Teléfono (opcional)</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          )}
          <div className="field"><label>Contraseña</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>

          {error && <p className="hint" style={{ color: 'var(--blood)' }}>{error}</p>}
          <button className="primary" style={{ width: '100%' }} onClick={submitAuth}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>

          {mode === 'login' && !forgotMode && (
            <p className="hint" style={{ marginTop: 12 }}>
              <a href="#" onClick={e => { e.preventDefault(); setForgotMode(true); }} style={{ color: 'var(--gold)' }}>¿Olvidaste tu contraseña?</a>
            </p>
          )}

          {mode === 'login' && forgotMode && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <div className="field"><label>Tu correo</label><input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} /></div>
              <button className="ghost" onClick={submitForgot}>Enviar link de recuperación</button>
              {forgotMsg && <p className="hint" style={{ marginTop: 8 }}>{forgotMsg}</p>}
            </div>
          )}
        </main>
        <footer>Bóveda Arcana</footer>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>Mi cuenta | Bóveda Arcana</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="hero">
        <div className="eyebrow">Bóveda Arcana</div>
        <h1>Hola, {account.name}</h1>
        <p style={{ marginTop: -6 }}><a href="/" style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>← Volver a la tienda</a></p>
        <div className="tabs" style={{ marginTop: 14 }}>
          <button className={`tab-btn ${view === 'orders' ? 'active' : ''}`} onClick={() => setView('orders')}>Mis compras</button>
          <button className={`tab-btn ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>Configuración</button>
        </div>
      </div>

      <main style={{ maxWidth: 500 }}>
        {view === 'orders' && (
          <>
            {orders.length === 0 && <p className="hint">Todavía no tienes pedidos.</p>}
            {orders.map(o => {
              const st = statusLabel(o);
              return (
                <div key={o.id} style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div>
                    <span style={{ color: st.color, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>{st.text}</span>
                    <span className="hint" style={{ marginLeft: 10 }}>Pedido #{o.id} · {new Date(o.createdAt).toLocaleString('es-MX')}</span>
                  </div>
                  <ul style={{ margin: '10px 0', paddingLeft: 18 }}>
                    {o.items.map(it => <li key={it.id} className="hint" style={{ color: 'var(--parchment)' }}>{it.name} x{it.qty}</li>)}
                  </ul>
                  <div className="mono" style={{ color: 'var(--gold)' }}>Total: ${Number(o.totalUsd).toFixed(2)} USD</div>
                </div>
              );
            })}
          </>
        )}

        {view === 'settings' && (
          <>
            <div className="field"><label>Nombre</label><input value={settings.name} onChange={e => setSettings(s => ({ ...s, name: e.target.value }))} /></div>
            <div className="field"><label>Teléfono</label><input value={settings.phone} onChange={e => setSettings(s => ({ ...s, phone: e.target.value }))} /></div>
            <div className="field"><label>Dirección (opcional)</label><input value={settings.address} onChange={e => setSettings(s => ({ ...s, address: e.target.value }))} /></div>
            <p className="hint">Correo: {account.email} (no se puede cambiar aquí)</p>
            <button className="primary" onClick={saveSettings}>Guardar cambios</button>
            <button className="ghost" style={{ marginLeft: 10 }} onClick={logout}>Cerrar sesión</button>
          </>
        )}
      </main>
      <footer>Bóveda Arcana</footer>
    </div>
  );
}
