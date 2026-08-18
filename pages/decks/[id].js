import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
const COLOR_INFO = {
  W: { label: 'Blanco', hex: '#e8dfc8' }, U: { label: 'Azul', hex: '#5ecbff' },
  B: { label: 'Negro', hex: '#6b6b6b' }, R: { label: 'Rojo', hex: '#ff5e5e' },
  G: { label: 'Verde', hex: '#6dff8a' }, C: { label: 'Incoloro', hex: '#a0967d' }
};

export default function DeckDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [deck, setDeck] = useState(null);
  const [rate, setRate] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [cardView, setCardView] = useState('list');
  const [sortBy, setSortBy] = useState('name');

  function mainType(typeLine) {
    if (!typeLine) return 'Otro';
    const front = typeLine.split('—')[0].trim();
    const known = ['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Land', 'Planeswalker', 'Battle'];
    return known.find(t => front.includes(t)) || front.split(' ')[0] || 'Otro';
  }

  useEffect(() => {
    if (!id) return;
    fetch(`/api/decks/${id}`).then(r => r.json()).then(d => { if (d.deck) setDeck(d.deck); else setNotFound(true); });
    fetch('/api/exchange-rate').then(r => r.json()).then(d => setRate(d.rate));
  }, [id]);

  function buyOnWhatsapp() {
    if (!WA_NUMBER) { alert('El vendedor todavía no configuró su WhatsApp.'); return; }
    const msg = `Hola! Me interesa el deck "${deck.name}" que vi en Bóveda Arcana, por $${deck.price.toFixed(2)} USD.`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function shareDeck() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${deck.name} — Bóveda Arcana`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado al portapapeles.');
    }
  }

  if (notFound) return <main><p className="hint">No encontramos ese deck.</p></main>;
  if (!deck) return <main><p className="hint">Cargando...</p></main>;

  const totalCards = deck.cards.reduce((s, c) => s + c.qty, 0);
  const hasDiscount = deck.originalPrice && deck.originalPrice > deck.price;
  const discountPct = hasDiscount ? Math.round((1 - deck.price / deck.originalPrice) * 100) : 0;

  // ---- Distribución de colores (para el pastel) ----
  const colorCounts = {};
  deck.cards.forEach(c => {
    const colors = (c.colors || '').split(',').filter(Boolean);
    const effective = colors.length ? colors : ['C'];
    effective.forEach(col => { colorCounts[col] = (colorCounts[col] || 0) + c.qty; });
  });
  const colorTotal = Object.values(colorCounts).reduce((s, v) => s + v, 0) || 1;
  let cumulative = 0;
  const pieSlices = Object.entries(colorCounts).map(([col, count]) => {
    const startAngle = (cumulative / colorTotal) * 360;
    cumulative += count;
    const endAngle = (cumulative / colorTotal) * 360;
    return { col, count, startAngle, endAngle, pct: Math.round((count / colorTotal) * 100) };
  });

  function polarPoint(cx, cy, r, angleDeg) {
    const a = (angleDeg - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  function arcPath(cx, cy, r, start, end) {
    const [x1, y1] = polarPoint(cx, cy, r, start);
    const [x2, y2] = polarPoint(cx, cy, r, end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  // ---- Curva de maná (para las barras) ----
  const cmcBuckets = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6+': 0 };
  deck.cards.forEach(c => {
    if (c.cmc === null || c.cmc === undefined) return;
    const key = c.cmc >= 6 ? '6+' : String(Math.floor(c.cmc));
    if (cmcBuckets[key] !== undefined) cmcBuckets[key] += c.qty;
  });
  const maxBucket = Math.max(1, ...Object.values(cmcBuckets));

  // ---- Distribución por tipo ----
  const typeCounts = {};
  deck.cards.forEach(c => {
    const t = mainType(c.typeLine);
    typeCounts[t] = (typeCounts[t] || 0) + c.qty;
  });
  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const maxType = Math.max(1, ...typeEntries.map(([, v]) => v));

  // ---- Orden de la lista de cartas ----
  const sortedCards = [...deck.cards].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'color') {
      const ca = (a.colors || 'zzz').split(',')[0] || 'zzz';
      const cb = (b.colors || 'zzz').split(',')[0] || 'zzz';
      return ca.localeCompare(cb);
    }
    if (sortBy === 'type') return mainType(a.typeLine).localeCompare(mainType(b.typeLine));
    if (sortBy === 'price_asc') return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (sortBy === 'price_desc') return (Number(b.price) || 0) - (Number(a.price) || 0);
    return 0;
  });

  return (
    <div>
      <Head>
        <title>{deck.name} — Mazo de Magic: The Gathering en venta | Bóveda Arcana</title>
        <meta name="description" content={`Compra el mazo ${deck.name}, ${totalCards} cartas listas para jugar. Precio $${deck.price.toFixed(2)} USD.`} />
      </Head>

      <div className="hero">
        <div className="eyebrow">Bóveda Arcana · Mazo completo</div>
        <h1>{deck.name}</h1>
        {deck.description && <p className="sub">{deck.description}</p>}
        <p style={{ marginTop: 10 }}><a href="/decks" style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>← Ver todos los decks</a></p>
        {!deck.active && <p style={{ color: 'var(--blood)', fontWeight: 700, marginTop: 10 }}>Este deck ya no está disponible (vendido)</p>}
      </div>

      <main style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 30, alignItems: 'flex-start' }}>
          {deck.coverImg && <img src={deck.coverImg} alt={`Portada del mazo ${deck.name}, carta ${deck.coverName || ''}`} style={{ width: 220, borderRadius: 10, border: '1px solid var(--line)' }} />}
          <div>
            {hasDiscount && (
              <span style={{ background: 'var(--blood)', color: 'var(--parchment)', fontWeight: 800, fontSize: '0.8rem', padding: '4px 10px', borderRadius: 999, display: 'inline-block', marginBottom: 8 }}>
                -{discountPct}% vs. comprar las cartas por separado
              </span>
            )}
            <p className="hint" style={{ margin: 0 }}>{totalCards} cartas en total</p>
            {hasDiscount && rate && (
              <div className="hint" style={{ textDecoration: 'line-through' }}>${(deck.originalPrice * rate).toFixed(2)} MXN</div>
            )}
            <div className="price mono" style={{ fontSize: '1.6rem', color: hasDiscount ? 'var(--blood)' : 'var(--gold)' }}>{rate ? `$${(deck.price * rate).toFixed(2)} MXN` : '...'}</div>
            <p className="hint">${deck.price.toFixed(2)} USD</p>
            <button className="primary" onClick={buyOnWhatsapp} disabled={!deck.active} style={!deck.active ? { opacity: 0.5 } : {}}>
              {deck.active ? 'Comprar por WhatsApp' : 'Vendido'}
            </button>
            <button className="ghost" style={{ marginLeft: 8 }} onClick={shareDeck}>Compartir este mazo</button>
          </div>
        </div>

        <h2>Estadísticas del mazo</h2>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 30 }}>
          <div>
            <h3 style={{ fontSize: '0.95rem' }}>Distribución de colores</h3>
            <svg width="160" height="160" viewBox="0 0 160 160">
              {pieSlices.map(s => (
                <path key={s.col} d={arcPath(80, 80, 76, s.startAngle, s.endAngle)} fill={COLOR_INFO[s.col]?.hex || '#888'} stroke="var(--ink)" strokeWidth="1.5" />
              ))}
            </svg>
            <div style={{ marginTop: 8 }}>
              {pieSlices.map(s => (
                <div key={s.col} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--muted)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR_INFO[s.col]?.hex || '#888', display: 'inline-block' }} />
                  {COLOR_INFO[s.col]?.label || s.col}: {s.pct}%
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '0.95rem' }}>Curva de maná</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {Object.entries(cmcBuckets).map(([key, count]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 24, height: `${Math.max(4, (count / maxBucket) * 100)}px`, background: 'var(--gold)', borderRadius: '3px 3px 0 0' }} />
                  <span className="hint" style={{ fontSize: '0.7rem' }}>{key}</span>
                </div>
              ))}
            </div>
            <p className="hint" style={{ marginTop: 6 }}>Costo de maná convertido (CMC) de cada carta</p>
          </div>

          <div>
            <h3 style={{ fontSize: '0.95rem' }}>Por tipo de carta</h3>
            <div>
              {typeEntries.map(([t, count]) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="hint" style={{ width: 90, fontSize: '0.75rem' }}>{t}</span>
                  <div style={{ background: 'var(--gold)', height: 12, borderRadius: 3, width: `${Math.max(6, (count / maxType) * 100)}px` }} />
                  <span className="hint" style={{ fontSize: '0.72rem' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ margin: 0 }}>Lista de cartas</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 170 }}>
              <option value="name">Nombre (A-Z)</option>
              <option value="color">Color</option>
              <option value="type">Tipo</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
            </select>
            <div className="view-toggle">
              <button className={cardView === 'list' ? 'active' : ''} onClick={() => setCardView('list')}>📋 Lista</button>
              <button className={cardView === 'grid' ? 'active' : ''} onClick={() => setCardView('grid')}>🖼️ Imágenes grandes</button>
            </div>
          </div>
        </div>

        {cardView === 'list' && (
          <table className="data-table">
            <thead><tr><th></th><th>Cant.</th><th>Nombre</th><th>Tipo</th><th>Colores</th><th>Precio ref.</th></tr></thead>
            <tbody>
              {sortedCards.map(c => (
                <tr key={c.id}>
                  <td>
                    {c.img && (
                      <div className="hover-thumb-wrap">
                        <img className="hover-thumb-icon" src={c.img} alt={`Miniatura de ${c.name}`} />
                        <img className="hover-thumb-float" src={c.img} alt={`Vista ampliada de ${c.name}`} />
                      </div>
                    )}
                  </td>
                  <td>{c.qty}</td>
                  <td>{c.name}</td>
                  <td className="hint">{c.typeLine || mainType(c.typeLine)}</td>
                  <td className="hint">{(c.colors || '').split(',').filter(Boolean).join(', ') || 'Incoloro'}</td>
                  <td className="hint">{c.price ? `$${Number(c.price).toFixed(2)} USD` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {cardView === 'grid' && (
          <div className="grid">
            {sortedCards.map(c => (
              <div className="card" key={c.id}>
                <div className="art">{c.img && <img src={c.img} alt={`Carta ${c.name} del mazo ${deck.name}`} />}</div>
                <div className="info">
                  <div className="name">{c.name}</div>
                  <div className="set">Cantidad: {c.qty}{c.typeLine ? ` · ${mainType(c.typeLine)}` : ''}</div>
                  {c.price && <div className="price mono">${Number(c.price).toFixed(2)} USD</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <footer>Bóveda Arcana</footer>
    </div>
  );
}
