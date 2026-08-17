import { useEffect, useState } from 'react';
import Head from 'next/head';

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

      <div className="hero">
        <div className="eyebrow">Bóveda Arcana</div>
        <h1>Mazos completos listos para jugar</h1>
        <p className="sub">Decks armados{SHOP_OWNER ? `, de ${SHOP_OWNER}` : ''}. Revisa la lista completa de cada uno antes de comprar.</p>
        <p style={{ marginTop: 10 }}><a href="/" style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>← Volver a cartas sueltas</a></p>
      </div>

      <main>
        <h2 style={{ marginTop: 0 }}>Decks disponibles</h2>
        {decks.length === 0 && <p className="hint">Todavía no hay decks publicados.</p>}
        <div className="grid">
          {decks.map(d => (
            <a href={`/decks/${d.id}`} key={d.id} style={{ textDecoration: 'none' }}>
              <div className="card">
                <div className="art">{d.coverImg && <img src={d.coverImg} alt={`Portada del mazo ${d.name}, carta destacada ${d.coverName || ''}`} />}</div>
                <div className="info">
                  <div className="name">{d.name}</div>
                  <div className="set">{d.cardCount} cartas</div>
                  <div className="price mono">{rate ? `$${(d.price * rate).toFixed(2)} MXN` : '...'}</div>
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
