import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

export default function DeckDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [deck, setDeck] = useState(null);
  const [rate, setRate] = useState(null);
  const [notFound, setNotFound] = useState(false);

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

  return (
    <div>
      <Head>
        <title>{deck.name} — Mazo de Magic: The Gathering en venta | Bóveda Arcana</title>
        <meta name="description" content={`Compra el mazo ${deck.name}, ${deck.cards.reduce((s, c) => s + c.qty, 0)} cartas listas para jugar. Precio $${deck.price.toFixed(2)} USD.`} />
      </Head>

      <div className="hero">
        <div className="eyebrow">Bóveda Arcana · Mazo completo</div>
        <h1>{deck.name}</h1>
        {deck.description && <p className="sub">{deck.description}</p>}
        <p style={{ marginTop: 10 }}><a href="/decks" style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>← Ver todos los decks</a></p>
        {!deck.active && <p style={{ color: 'var(--blood)', fontWeight: 700, marginTop: 10 }}>Este deck ya no está disponible (vendido)</p>}
      </div>

      <main style={{ maxWidth: 700 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 30, alignItems: 'flex-start' }}>
          {deck.coverImg && <img src={deck.coverImg} alt={`Portada del mazo ${deck.name}, carta ${deck.coverName || ''}`} style={{ width: 220, borderRadius: 10, border: '1px solid var(--line)' }} />}
          <div>
            <p className="hint">{deck.cards.reduce((s, c) => s + c.qty, 0)} cartas en total</p>
            <div className="price mono" style={{ fontSize: '1.6rem' }}>{rate ? `$${(deck.price * rate).toFixed(2)} MXN` : '...'}</div>
            <p className="hint">${deck.price.toFixed(2)} USD</p>
            <button className="primary" onClick={buyOnWhatsapp} disabled={!deck.active} style={!deck.active ? { opacity: 0.5 } : {}}>
              {deck.active ? 'Comprar por WhatsApp' : 'Vendido'}
            </button>
            <button className="ghost" style={{ marginLeft: 8 }} onClick={shareDeck}>Compartir este mazo</button>
          </div>
        </div>

        <h2>Lista de cartas</h2>
        <table className="data-table">
          <thead><tr><th></th><th>Cant.</th><th>Nombre</th></tr></thead>
          <tbody>
            {deck.cards.map(c => (
              <tr key={c.id}>
                <td>
                  {c.img && (
                    <div className="hover-thumb-wrap">
                      <img className="hover-thumb-icon" src={c.img} alt={c.name} />
                      <img className="hover-thumb-float" src={c.img} alt={c.name} />
                    </div>
                  )}
                </td>
                <td>{c.qty}</td>
                <td>{c.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
      <footer>Bóveda Arcana</footer>
    </div>
  );
}
