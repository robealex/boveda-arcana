import { useEffect, useState } from 'react';
import Head from 'next/head';
import Header from '../../components/Header';

const SHOP_OWNER = process.env.NEXT_PUBLIC_SHOP_OWNER || '';

export default function Decks() {
  const [decks, setDecks] = useState([]);
  const [rate, setRate] = useState(null);

  useEffect(() => {
    fetch('/api/decks').then(r => r.json()).then(d => setDecks(d.decks || []));
    fetch('/api/exchange-rate').then(r => r.json()).then(d => setRate(d.rate));
  }, []);

  return (
    <div>
      <Head>
        <title>Mazos de Magic: The Gathering en venta | Bóveda Arcana</title>
        <meta name="description" content="Decks completos y listos para jugar de Magic: The Gathering en venta en Ensenada. Cada mazo trae la lista completa de cartas y su carta de portada." />
      </Head>

      <Header active="MAZOS" cartCount={0} onCartClick={() => window.location.href = '/'} />

      <div className="hero">
        <div className="eyebrow">Bóveda Arcana</div>
        <h1>Mazos completos listos para jugar</h1>
        <p className="sub">Decks armados{SHOP_OWNER ? `, de ${SHOP_OWNER}` : ''}. Revisa la lista completa de cada uno antes de comprar.</p>
      </div>

      <main>
        <h2 style={{ marginTop: 0 }}>Decks disponibles</h2>
        {decks.length === 0 && <p className="hint">Todavía no hay decks publicados.</p>}
        <div className="catalog-grid">
          {decks.map(d => (
            <a href={`/decks/${d.id}`} key={d.id} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ position: 'relative' }}>
                <div className="art">{d.coverImg && <img src={d.coverImg} alt={`Portada del mazo ${d.name}, carta destacada ${d.coverName || ''}`} />}</div>
                {d.originalPrice && d.originalPrice > d.price && (
                  <span style={{ position: 'absolute', top: 8, right: 8, background: 'var(--blood)', color: 'var(--parchment)', fontWeight: 800, fontSize: '0.8rem', padding: '4px 9px', borderRadius: 999, zIndex: 2 }}>
                    -{Math.round((1 - d.price / d.originalPrice) * 100)}%
                  </span>
                )}
                <div className="info">
                  <div className="name">{d.name}</div>
                  <div className="set">{d.cardCount} cartas</div>
                  {d.originalPrice && d.originalPrice > d.price && rate && (
                    <div className="hint" style={{ textDecoration: 'line-through', marginBottom: -4 }}>${(d.originalPrice * rate).toFixed(2)} MXN</div>
                  )}
                  <div className="price mono" style={d.originalPrice && d.originalPrice > d.price ? { color: 'var(--blood)' } : {}}>{rate ? `$${(d.price * rate).toFixed(2)} MXN` : '...'}</div>
                  <div className="hint" style={{ marginTop: -4 }}>${d.price.toFixed(2)} USD</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </main>
      <footer>Bóveda Arcana</footer>
    </div>
  );
}
