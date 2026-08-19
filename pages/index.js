import { useEffect, useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import { getToken, clearToken } from '../lib/clientAuth';

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
const SHOP_OWNER = process.env.NEXT_PUBLIC_SHOP_OWNER || '';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || '';
const FACEBOOK = process.env.NEXT_PUBLIC_FACEBOOK_URL || '';
const INSTAGRAM = process.env.NEXT_PUBLIC_INSTAGRAM_URL || '';
const YOUTUBE = process.env.NEXT_PUBLIC_YOUTUBE_URL || '';
const LINKEDIN = process.env.NEXT_PUBLIC_LINKEDIN_URL || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
const LANGUAGES = { en: 'Inglés', es: 'Español', ja: 'Japonés', de: 'Alemán', fr: 'Francés', it: 'Italiano', pt: 'Portugués', ru: 'Ruso', ko: 'Coreano', zhs: 'Chino simpl.', zht: 'Chino trad.' };

export default function Home() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [rate, setRate] = useState(null);
  const [pricingSettings, setPricingSettings] = useState(null);
  const CONDITION_FIELD = {
    'Near Mint': 'nearMintPct', 'Lightly Played': 'lightlyPlayedPct', 'Moderately Played': 'moderatelyPlayedPct',
    'Heavily Played': 'heavilyPlayedPct', 'Damaged': 'damagedPct'
  };
  function pctFor(condition) {
    if (!pricingSettings) return 100;
    return pricingSettings[CONDITION_FIELD[condition]] ?? 100;
  }

  const globalDiscountActive = Boolean(
    pricingSettings?.globalDiscountEnabled &&
    pricingSettings.globalDiscountPct > 0 &&
    (!pricingSettings.globalDiscountStart || new Date(pricingSettings.globalDiscountStart) <= new Date()) &&
    (!pricingSettings.globalDiscountEnd || new Date(pricingSettings.globalDiscountEnd) >= new Date())
  );
  const globalPct = pricingSettings?.globalDiscountPct || 0;

  function discountInfo(it) {
    const basePrice = Number(it.price);
    let refPrice = null;
    if (it.originalPrice && it.originalPrice > basePrice) {
      refPrice = Number(it.originalPrice);
    } else {
      const pct = pctFor(it.condition);
      if (pct < 100) refPrice = basePrice / (pct / 100);
    }
    const finalPrice = globalDiscountActive ? basePrice * (1 - globalPct / 100) : basePrice;
    if (!refPrice && globalDiscountActive) refPrice = basePrice;
    if (!refPrice) return null;
    const pctOff = Math.round((1 - finalPrice / refPrice) * 100);
    if (pctOff <= 0) return null;
    return { refPrice, pctOff, finalPrice };
  }

  function payPrice(it) {
    const disc = discountInfo(it);
    return disc ? disc.finalPrice : Number(it.price);
  }
  const [sortBy, setSortBy] = useState('newest');
  const [colorFilter, setColorFilter] = useState([]);
  const [rarityFilter, setRarityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [alertEmail, setAlertEmail] = useState('');
  const [alertSent, setAlertSent] = useState(false);
  const [account, setAccount] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', email: '' });
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [viewMode, setViewMode] = useState('grid');

  const MAIN_TYPES = ['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Land', 'Planeswalker', 'Battle'];
  const COLOR_INFO = {
    W: { label: 'Blanco', hex: '#e8dfc8' }, U: { label: 'Azul', hex: '#5ecbff' },
    B: { label: 'Negro', hex: '#6b6b6b' }, R: { label: 'Rojo', hex: '#ff5e5e' },
    G: { label: 'Verde', hex: '#6dff8a' }, C: { label: 'Incoloro', hex: '#c9c4b8' }
  };

  function toggleColor(c) {
    setColorFilter(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  function loadInventory() {
    fetch('/api/inventory').then(r => r.json()).then(d => setItems(d.items || []));
  }

  useEffect(() => {
    loadInventory();
    fetch('/api/exchange-rate').then(r => r.json()).then(d => setRate(d.rate));
    fetch('/api/pricing-settings').then(r => r.json()).then(d => setPricingSettings(d.settings));
    const token = typeof window !== 'undefined' ? getToken() : null;
    if (token) {
      fetch('/api/auth/me', { headers: { 'x-customer-token': token } })
        .then(r => r.json())
        .then(d => {
          if (d.customer) {
            setAccount(d.customer);
            setCheckoutForm({ name: d.customer.name || '', phone: d.customer.phone || '', email: d.customer.email || '' });
          }
        });
    }
  }, []);

  useEffect(() => {
    if (!detailItem) return;
    setAlertEmail('');
    setAlertSent(false);
    fetch('/api/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: detailItem.id })
    }).catch(() => {});
  }, [detailItem?.id]);

  async function submitStockAlert() {
    if (!alertEmail.trim()) return;
    const r = await fetch('/api/stock-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventoryId: detailItem.id, email: alertEmail.trim() })
    });
    if (r.ok) setAlertSent(true);
  }

  const visible = items
    .filter(it => it.name.toLowerCase().includes(filter.toLowerCase()))
    .filter(it => {
      if (colorFilter.length === 0) return true;
      const cardColors = (it.colors || '').split(',').filter(Boolean);
      const effective = cardColors.length ? [...cardColors].sort() : ['C'];
      const wanted = [...colorFilter].sort();
      return effective.length === wanted.length && effective.every((c, i) => c === wanted[i]);
    })
    .filter(it => !rarityFilter || it.rarity === rarityFilter)
    .filter(it => !typeFilter || (it.typeLine || '').includes(typeFilter))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
      if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  useEffect(() => { setPage(0); }, [filter, colorFilter, rarityFilter, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pagedVisible = visible.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function mxn(usdPrice) {
    if (!rate) return null;
    return usdPrice * rate;
  }

  function addToCart(it) {
    if (it.qty <= 0) return;
    setCart(prev => {
      const existing = prev.find(c => c.id === it.id);
      if (existing) {
        if (existing.qty < it.qty) return prev.map(c => c.id === it.id ? { ...c, qty: c.qty + 1 } : c);
        return prev;
      }
      return [...prev, { id: it.id, name: it.name, priceUsd: payPrice(it), img: it.img, qty: 1, max: it.qty, stripe_link: it.stripeLink }];
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

  function startCheckout() {
    if (!WA_NUMBER) { alert('El vendedor todavía no configuró su número de WhatsApp (NEXT_PUBLIC_WHATSAPP_NUMBER).'); return; }
    setShowCheckoutForm(true);
  }

  async function confirmCheckout() {
    if (!checkoutForm.phone.trim() && !checkoutForm.email.trim()) {
      alert('Por favor deja al menos tu teléfono o tu correo, para poder contactarte sobre tu pedido.');
      return;
    }
    const token = typeof window !== 'undefined' ? getToken() : null;
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-customer-token': token } : {}) },
        body: JSON.stringify({
          items: cart.map(c => ({ id: c.id, qty: c.qty })),
          customerName: checkoutForm.name.trim() || null,
          customerPhone: checkoutForm.phone.trim() || null,
          customerEmail: checkoutForm.email.trim() || null
        })
      });
      const d = await r.json();
      if (!r.ok) { alert(d.error || 'No se pudo apartar el pedido, intenta de nuevo.'); return; }
    } catch (e) {
      alert('No se pudo apartar el pedido, intenta de nuevo.');
      return;
    }

    const lines = cart.map(c => {
      const lineMxn = mxn(c.priceUsd * c.qty);
      return `• ${c.name} x${c.qty} — $${lineMxn ? lineMxn.toFixed(2) : '?'} MXN`;
    }).join('%0A');
    const nameLine = checkoutForm.name.trim() ? `Mi nombre: ${checkoutForm.name.trim()}%0A` : '';
    const msg = `Hola! Quiero comprar estas cartas de Bóveda Arcana:%0A${nameLine}${lines}%0A%0ATotal: $${totalMxn ? totalMxn.toFixed(2) : '?'} MXN`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');

    setCart([]);
    setCartOpen(false);
    setShowCheckoutForm(false);
    loadInventory();
  }

  function logout() {
    clearToken();
    setAccount(null);
    setCheckoutForm({ name: '', phone: '', email: '' });
  }

  function shareItem(it) {
    const url = `${SITE_URL || window.location.origin}/?carta=${it.id}`;
    const text = `${it.name} — Bóveda Arcana`;
    if (navigator.share) {
      navigator.share({ title: text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado al portapapeles.');
    }
  }

  function CardBadges({ it }) {
    return (
      <>
        {it.foil && <span className="foil-badge" title="Foil" style={{ marginRight: 4 }} />}
        {it.language && it.language !== 'en' && <span className="hint">{LANGUAGES[it.language] || it.language}</span>}
      </>
    );
  }

  const faqs = [
    { q: '¿Cómo compro una carta en Bóveda Arcana?', a: 'Selecciona las cartas que quieras y agrégalas al carrito. Al final, llena tus datos de contacto y te llega un mensaje de WhatsApp con el resumen para coordinar el pago y la entrega.' },
    { q: '¿Por cuánto tiempo se aparta mi pedido?', a: 'En cuanto envías tu pedido por WhatsApp, esas cartas quedan apartadas 48 horas mientras confirmamos la venta contigo.' },
    { q: '¿Qué significa la condición de cada carta (Near Mint, Lightly Played, etc.)?', a: 'Es el estado físico de la carta. Near Mint es la mejor condición (casi sin uso) y el precio baja según se desgasta: Lightly Played, Moderately Played, Heavily Played y Damaged.' },
    { q: '¿Los precios están en pesos o dólares?', a: 'Guardamos el precio base en dólares y la tienda lo convierte a pesos mexicanos con el tipo de cambio del día, así que siempre ves el precio actualizado en MXN.' },
    { q: '¿Venden mazos completos, no solo cartas sueltas?', a: 'Sí, en la sección de Decks vendemos mazos ya armados y listos para jugar, con la lista completa de cartas visible antes de comprar.' }
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: 'Bóveda Arcana',
    description: 'Tienda de cartas de Magic: The Gathering en venta en Ensenada, Baja California.',
    address: { '@type': 'PostalAddress', addressLocality: 'Ensenada', addressRegion: 'Baja California', addressCountry: 'MX' },
    ...(WA_NUMBER ? { telephone: `+${WA_NUMBER}` } : {}),
    ...(SITE_URL ? { url: SITE_URL } : {})
  };

  return (
    <div>
      <Head>
        <title>Bóveda Arcana | Cartas de Magic: The Gathering en venta en Ensenada</title>
        <meta name="description" content="Compra cartas sueltas y mazos completos de Magic: The Gathering en Ensenada, Baja California. Precios actualizados al tipo de cambio del día, filtra por color, rareza, tipo y condición." />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      </Head>

      <Header active="CARTAS" cartCount={cart.reduce((s, c) => s + c.qty, 0)} onCartClick={() => setCartOpen(true)} />

      <div className="hero" style={{ padding: '32px 24px 24px' }}>
        <div className="eyebrow">Cartas de Magic: The Gathering · Ensenada, MX</div>
        <h1>Bóveda Arcana</h1>
        <p className="sub">Colección personal de cartas sueltas y mazos completos en venta. Elige lo que te interese y te contactamos por WhatsApp para cerrar la compra.</p>

        <div style={{ marginTop: 14, display: 'flex', gap: 16, justifyContent: 'center', fontSize: '0.85rem', flexWrap: 'wrap' }}>
          <a href="/mis-pedidos" style={{ color: 'var(--gold)' }}>Ver el estatus de mis pedidos →</a>
          {account ? (
            <>
              <span style={{ color: 'var(--muted)' }}>Hola, {account.name}</span>
              <button className="ghost" style={{ padding: '2px 10px', fontSize: '0.8rem' }} onClick={logout}>Cerrar sesión</button>
            </>
          ) : null}
        </div>
      </div>

      {globalDiscountActive && (
        <div style={{
          background: 'linear-gradient(90deg, var(--blood), #a33d3d)', color: 'var(--parchment)',
          textAlign: 'center', padding: '10px 16px', fontWeight: 700, fontSize: '0.9rem'
        }}>
          🔥 Hoy la Bóveda está a -{globalPct}% de descuento en todo
        </div>
      )}

      <main id="catalogo">
        <h2 style={{ marginTop: 0 }}>Catálogo de cartas disponibles</h2>

        <div style={{
          background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 12,
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 20
        }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: '1.05rem', whiteSpace: 'nowrap' }}>Filtros Rápidos</span>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {Object.entries(COLOR_INFO).map(([code, info]) => (
              <button
                key={code}
                onClick={() => toggleColor(code)}
                title={info.label}
                style={{
                  width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
                  background: 'transparent',
                  opacity: colorFilter.includes(code) ? 1 : 0.4,
                  transform: colorFilter.includes(code) ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.15s'
                }}
              >
                <img src={`https://svgs.scryfall.io/card-symbols/${code}.svg`} alt={info.label} style={{ width: '100%', height: '100%' }} />
              </button>
            ))}
            <button
              onClick={() => setColorFilter(colorFilter.length === 5 ? [] : ['W', 'U', 'B', 'R', 'G'])}
              title="Penta (5 colores)"
              style={{
                width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--line)', cursor: 'pointer',
                background: 'conic-gradient(#e8dfc8,#5ecbff,#6b6b6b,#ff5e5e,#6dff8a)',
                opacity: colorFilter.length === 5 ? 1 : 0.4,
                transform: colorFilter.length === 5 ? 'scale(1.12)' : 'scale(1)',
                transition: 'all 0.15s'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value)} style={{ width: 150 }}>
              <option value="">Rareza</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="mythic">Mythic</option>
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 150 }}>
              <option value="">Tipo</option>
              {MAIN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 170 }}>
              <option value="newest">Ordenar: más nuevas</option>
              <option value="name">Ordenar: nombre (A-Z)</option>
              <option value="price_asc">Ordenar: precio ↑</option>
              <option value="price_desc">Ordenar: precio ↓</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <div className="field" style={{ maxWidth: 300, marginBottom: 0 }}>
            <input placeholder="Filtrar por nombre..." value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
          {colorFilter.length > 0 && <button className="ghost" onClick={() => setColorFilter([])}>Limpiar colores</button>}
        </div>
        <p className="hint" style={{ marginTop: -2, marginBottom: 24 }}>
          {colorFilter.length > 0 ? 'Mostrando solo cartas con exactamente estos colores (no combinaciones que solo los incluyan).' : ''}
        </p>

        {items.length === 0 && <p className="hint">Todavía no hay cartas publicadas.</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <div className="view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>🎴 Cuadrícula</button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>📋 Lista</button>
          </div>
        </div>

        {viewMode === 'grid' && (
        <div className="catalog-grid">
          {pagedVisible.map(it => {
            const soldOut = it.qty <= 0;
            const disc = discountInfo(it);
            return (
              <div className="card" key={it.id} style={{ opacity: soldOut ? 0.55 : 1, cursor: 'pointer', position: 'relative' }} onClick={() => setDetailItem(it)}>
                <div className="art">{it.img && <img src={it.img} alt={`Carta ${it.name} de Magic: The Gathering en venta`} />}</div>
                {disc && !soldOut && (
                  <span style={{ position: 'absolute', top: 8, right: 8, background: 'var(--blood)', color: 'var(--parchment)', fontWeight: 800, fontSize: '0.8rem', padding: '4px 9px', borderRadius: 999, zIndex: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    -{disc.pctOff}%
                  </span>
                )}
                <div className="info">
                  {soldOut ? <span className="badge" style={{ background: 'var(--muted)' }}>Agotado</span> : it.qty <= 2 && <span className="badge">Últimas {it.qty}</span>}
                  <div className="name"><CardBadges it={it} /> {it.name}</div>
                  <div className="set">{it.condition}</div>
                  {disc && rate && (
                    <div className="hint" style={{ textDecoration: 'line-through', marginBottom: -4 }}>${mxn(disc.refPrice).toFixed(2)} MXN</div>
                  )}
                  <div className="price mono" style={disc ? { color: 'var(--blood)' } : {}}>{rate ? `$${mxn(payPrice(it)).toFixed(2)} MXN` : 'Cargando precio...'}</div>
                  <div className="hint" style={{ marginTop: -4 }}>${payPrice(it).toFixed(2)} USD</div>
                  <button className="primary" disabled={soldOut} style={soldOut ? { opacity: 0.5, cursor: 'not-allowed' } : {}} onClick={e => { e.stopPropagation(); addToCart(it); }}>
                    {soldOut ? 'Agotado' : '+ Agregar al carrito'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}

        {viewMode === 'list' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th></th><th>Nombre</th><th>Edición</th><th>Condición</th><th>Precio</th><th>Disp.</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pagedVisible.map(it => {
                const soldOut = it.qty <= 0;
                const disc = discountInfo(it);
                return (
                  <tr key={it.id} style={{ opacity: soldOut ? 0.5 : 1 }}>
                    <td>
                      {it.img && (
                        <div className="hover-thumb-wrap">
                          <img className="hover-thumb-icon" src={it.img} alt={`Miniatura de ${it.name}`} />
                          <img className="hover-thumb-float" src={it.img} alt={`Vista ampliada de ${it.name}`} />
                        </div>
                      )}
                    </td>
                    <td style={{ cursor: 'pointer' }} onClick={() => setDetailItem(it)}>
                      <CardBadges it={it} /> {it.name} {disc && !soldOut && <span style={{ background: 'var(--blood)', color: 'var(--parchment)', fontWeight: 700, fontSize: '0.7rem', padding: '2px 6px', borderRadius: 999, marginLeft: 6 }}>-{disc.pctOff}%</span>}
                    </td>
                    <td className="hint">{it.setName}</td>
                    <td className="hint">{it.condition}</td>
                    <td className="mono" style={disc ? { color: 'var(--blood)' } : {}}>{rate ? `$${mxn(payPrice(it)).toFixed(2)} MXN` : '...'}</td>
                    <td>{soldOut ? <span style={{ color: 'var(--blood)' }}>Agotado</span> : it.qty}</td>
                    <td>
                      <button className="ghost" disabled={soldOut} style={soldOut ? { opacity: 0.5 } : {}} onClick={() => addToCart(it)}>
                        {soldOut ? 'Agotado' : 'Agregar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        {visible.length > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 28 }}>
            <button className="ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>←</button>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 400, justifyContent: 'center' }}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  style={{
                    width: 9, height: 9, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
                    background: i === page ? 'var(--gold)' : 'var(--line)'
                  }}
                />
              ))}
            </div>
            <button className="ghost" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>→</button>
          </div>
        )}
      </main>

      {cartOpen && (
        <>
          <div className="overlay" onClick={() => setCartOpen(false)} />
          <div className="cart-panel">
            <h2>Tu carrito</h2>
            {cart.length === 0 && <p className="hint">Vacío por ahora.</p>}
            {cart.map(c => (
              <div className="cart-item" key={c.id}>
                {c.img && <img src={c.img} alt={`Carta ${c.name} en el carrito`} />}
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

            {!showCheckoutForm && (
              <>
                {cart.length === 1 && cart[0].stripe_link && (
                  <a href={cart[0].stripe_link} target="_blank" rel="noreferrer">
                    <button className="primary" style={{ width: '100%', marginBottom: 10 }}>Pagar con Stripe</button>
                  </a>
                )}
                <button className="primary" style={{ width: '100%' }} onClick={startCheckout}>Enviar pedido por WhatsApp</button>
                <p className="hint" style={{ marginTop: 8 }}>Al enviar, apartamos estas cartas por 48 horas mientras confirmamos tu pedido.</p>
              </>
            )}

            {showCheckoutForm && (
              <div style={{ marginTop: 12 }}>
                <div className="field"><label>Tu nombre</label><input value={checkoutForm.name} onChange={e => setCheckoutForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="field"><label>Tu teléfono {!checkoutForm.email.trim() && '(obligatorio si no dejas correo)'}</label><input value={checkoutForm.phone} onChange={e => setCheckoutForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="field"><label>Tu correo {!checkoutForm.phone.trim() && '(obligatorio si no dejas teléfono)'}</label><input value={checkoutForm.email} onChange={e => setCheckoutForm(f => ({ ...f, email: e.target.value }))} /></div>
                <button className="primary" style={{ width: '100%' }} onClick={confirmCheckout}>Confirmar y enviar por WhatsApp</button>
                <button className="ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowCheckoutForm(false)}>Atrás</button>
              </div>
            )}

            <button className="ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setCartOpen(false)}>Cerrar</button>
          </div>
        </>
      )}

      {detailItem && (
        <div className="modal-bg show" onClick={() => setDetailItem(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            {detailItem.img && <img src={detailItem.img} alt={`Imagen de la carta ${detailItem.name}, edición ${detailItem.setName}`} style={{ width: '100%', borderRadius: 8, marginBottom: 14 }} />}
            <h3 style={{ marginTop: 0, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              {detailItem.foil && <span className="foil-badge" title="Foil" />}{detailItem.name}
              {discountInfo(detailItem) && detailItem.qty > 0 && (
                <span style={{ background: 'var(--blood)', color: 'var(--parchment)', fontWeight: 800, fontSize: '0.75rem', padding: '3px 9px', borderRadius: 999 }}>
                  -{discountInfo(detailItem).pctOff}%
                </span>
              )}
            </h3>
            <p className="hint" style={{ marginTop: 0 }}>{detailItem.setName} · {detailItem.condition} · {LANGUAGES[detailItem.language] || detailItem.language}</p>
            {detailItem.typeLine && <p style={{ fontSize: '0.85rem', margin: '6px 0' }}>{detailItem.typeLine}</p>}
            <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 14 }}>
              {detailItem.colors && <span>Colores: {detailItem.colors.split(',').filter(Boolean).join(', ') || 'Incoloro'}</span>}
              {detailItem.rarity && <span>Rareza: {detailItem.rarity}</span>}
            </div>
            <div className="price mono" style={{ fontSize: '1.3rem', color: discountInfo(detailItem) ? 'var(--blood)' : 'var(--gold)' }}>
              {discountInfo(detailItem) && rate && (
                <span style={{ textDecoration: 'line-through', color: 'var(--muted)', fontSize: '1rem', marginRight: 8 }}>${mxn(discountInfo(detailItem).refPrice).toFixed(2)}</span>
              )}
              {rate ? `$${mxn(payPrice(detailItem)).toFixed(2)} MXN` : '...'}
            </div>
            <p className="hint" style={{ marginTop: 0 }}>${payPrice(detailItem).toFixed(2)} USD · {detailItem.qty > 0 ? `${detailItem.qty} disponibles` : 'Agotado'}</p>
            <button
              className="primary"
              style={{ width: '100%', marginTop: 10, ...(detailItem.qty <= 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
              disabled={detailItem.qty <= 0}
              onClick={() => { addToCart(detailItem); setDetailItem(null); }}
            >
              {detailItem.qty <= 0 ? 'Agotado' : 'Agregar al carrito'}
            </button>
            {detailItem.qty <= 0 && (
              <div style={{ marginTop: 10 }}>
                {alertSent ? (
                  <p className="hint" style={{ color: 'var(--teal)' }}>Listo, te avisamos por correo cuando vuelva a haber.</p>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input placeholder="Tu correo" value={alertEmail} onChange={e => setAlertEmail(e.target.value)} style={{ flex: 1 }} />
                    <button className="ghost" onClick={submitStockAlert}>Avísame</button>
                  </div>
                )}
              </div>
            )}
            {detailItem.scryfallUri && (
              <p className="hint" style={{ marginTop: 10 }}>
                <a href={detailItem.scryfallUri} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>Ver ficha completa y gráfica de precio en Scryfall ↗</a>
              </p>
            )}
            <button className="ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => shareItem(detailItem)}>Compartir esta carta</button>
            <button className="ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setDetailItem(null)}>Cerrar</button>
          </div>
        </div>
      )}

      <section style={{ maxWidth: 900, margin: '0 auto 40px', padding: '0 24px' }}>
        <h2>Preguntas frecuentes</h2>
        <div className="faq-grid">
          {faqs.map((f, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{f.q}</h3>
              <p className="hint" style={{ margin: 0 }}>{f.a}</p>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 32 }}>Explora también</h2>
        <ul style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.8 }}>
          <li><a href="/decks" style={{ color: 'var(--gold)' }}>Mazos completos listos para jugar</a></li>
          <li><a href="/cuenta" style={{ color: 'var(--gold)' }}>Crea una cuenta para guardar tu historial de compras</a></li>
          <li><a href="/mis-pedidos" style={{ color: 'var(--gold)' }}>Consulta el estatus de un pedido ya hecho</a></li>
        </ul>
      </section>

      <footer style={{ paddingTop: 32 }}>
        {(FACEBOOK || INSTAGRAM || YOUTUBE || LINKEDIN) && (
          <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginBottom: 16, fontSize: '1.3rem' }}>
            {FACEBOOK && <a href={FACEBOOK} target="_blank" rel="noreferrer" style={{ color: 'var(--muted)' }} onMouseOver={e => e.target.style.color = 'var(--gold)'} onMouseOut={e => e.target.style.color = 'var(--muted)'}>Facebook</a>}
            {INSTAGRAM && <a href={INSTAGRAM} target="_blank" rel="noreferrer" style={{ color: 'var(--muted)' }} onMouseOver={e => e.target.style.color = 'var(--gold)'} onMouseOut={e => e.target.style.color = 'var(--muted)'}>Instagram</a>}
            {YOUTUBE && <a href={YOUTUBE} target="_blank" rel="noreferrer" style={{ color: 'var(--muted)' }} onMouseOver={e => e.target.style.color = 'var(--gold)'} onMouseOut={e => e.target.style.color = 'var(--muted)'}>YouTube</a>}
            {LINKEDIN && <a href={LINKEDIN} target="_blank" rel="noreferrer" style={{ color: 'var(--muted)' }} onMouseOver={e => e.target.style.color = 'var(--gold)'} onMouseOut={e => e.target.style.color = 'var(--muted)'}>LinkedIn</a>}
          </div>
        )}
        <div style={{ marginBottom: 10 }}>
          <strong style={{ color: 'var(--parchment)' }}>Contacto</strong><br />
          {SHOP_OWNER && <span>{SHOP_OWNER}</span>}
          {WA_NUMBER && <span> · WhatsApp: {WA_NUMBER}</span>}
          {CONTACT_EMAIL && <span> · {CONTACT_EMAIL}</span>}
        </div>
        Bóveda Arcana · Precios de referencia cortesía de Scryfall
      </footer>
    </div>
  );
}
