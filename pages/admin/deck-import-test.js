import { useMemo, useState } from 'react';

function parseList(text) {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const match = line.match(/^(\d+)x?\s+(.+)$/i);
    return match
      ? { qty: Math.max(1, Number.parseInt(match[1], 10)), name: match[2].trim() }
      : { qty: 1, name: line };
  }).filter(row => row.name);
}

export default function DeckImportTest() {
  const [list, setList] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(null);

  const parsed = useMemo(() => parseList(list), [list]);

  async function runTest() {
    if (!parsed.length) {
      setError('Pega una lista de cartas antes de iniciar.');
      return;
    }
    if (parsed.length > 300) {
      setError('Para esta prueba, el límite es de 300 líneas.');
      return;
    }

    setLoading(true);
    setError('');
    setElapsed(null);
    setRows(parsed.map((row, index) => ({ ...row, id: index, status: 'pending' })));
    const started = performance.now();

    try {
      const response = await fetch('/api/cards/bulk-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: parsed.map(row => row.name) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo consultar Scryfall.');

      const byName = new Map((result.data || []).map(card => [card.name.toLowerCase(), card]));
      const missing = new Set((result.not_found || []).map(name => name.toLowerCase()));
      setRows(parsed.map((row, index) => {
        const card = byName.get(row.name.toLowerCase());
        return {
          ...row, id: index, status: card ? 'done' : 'notfound',
          card: card || null,
          note: card ? '' : (missing.has(row.name.toLowerCase()) ? 'No encontrada en Scryfall' : 'Sin resultado')
        };
      }));
    } catch (err) {
      setError(err.message || 'Error durante la prueba.');
      setRows(current => current.map(row => ({ ...row, status: 'error' })));
    } finally {
      setElapsed(((performance.now() - started) / 1000).toFixed(2));
      setLoading(false);
    }
  }

  const completed = rows.filter(row => row.status === 'done').length;
  const notFound = rows.filter(row => row.status === 'notfound').length;

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 18px', color: '#e5e7eb', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Prueba de importación de mazos</h1>
          <p style={{ color: '#9ca3af', marginTop: 8 }}>Página experimental independiente. No agrega ni modifica cartas del inventario.</p>
        </div>
        <a href="/admin" style={{ color: '#93c5fd' }}>Volver al administrador</a>
      </div>

      <section style={{ marginTop: 22, padding: 18, border: '1px solid #374151', borderRadius: 12, background: '#111827' }}>
        <label htmlFor="deck-list" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Lista de cartas</label>
        <textarea id="deck-list" value={list} onChange={event => setList(event.target.value)} placeholder={'4 Lightning Bolt\n1 Sol Ring\n2x Counterspell'} rows={10} style={{ boxSizing: 'border-box', width: '100%', padding: 12, borderRadius: 8, border: '1px solid #4b5563', background: '#030712', color: '#f9fafb', font: '14px/1.5 monospace', resize: 'vertical' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <span style={{ color: '#9ca3af', fontSize: 13 }}>{parsed.length} líneas detectadas · Máximo 300</span>
          <button type="button" onClick={runTest} disabled={loading || !parsed.length} style={{ border: 0, borderRadius: 8, padding: '10px 18px', background: loading ? '#4b5563' : '#2563eb', color: 'white', fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Consultando…' : 'Probar importación'}</button>
        </div>
        {error && <p role="alert" style={{ color: '#fca5a5', marginBottom: 0 }}>{error}</p>}
      </section>

      {rows.length > 0 && <section style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 12, color: '#d1d5db' }}>
          <span>Encontradas: <b style={{ color: '#86efac' }}>{completed}</b></span>
          <span>No encontradas: <b style={{ color: '#fca5a5' }}>{notFound}</b></span>
          <span>Total: <b>{rows.length}</b></span>
          {elapsed !== null && <span>Tiempo: <b>{elapsed} s</b></span>}
        </div>
        <div style={{ overflowX: 'auto', border: '1px solid #374151', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620, background: '#111827', fontSize: 14 }}>
            <thead><tr style={{ textAlign: 'left', color: '#9ca3af', background: '#1f2937' }}>
              {['Estado', 'Cantidad', 'Carta', 'Edición', 'Precio USD'].map(label => <th key={label} style={{ padding: 10 }}>{label}</th>)}
            </tr></thead>
            <tbody>{rows.map(row => <tr key={row.id} style={{ borderTop: '1px solid #374151' }}>
              <td style={{ padding: 10, whiteSpace: 'nowrap', color: row.status === 'done' ? '#86efac' : row.status === 'notfound' ? '#fca5a5' : '#d1d5db' }}>{row.status === 'done' ? 'Encontrada' : row.status === 'notfound' ? row.note : row.status === 'error' ? 'Error' : 'Pendiente'}</td>
              <td style={{ padding: 10 }}>{row.qty}</td>
              <td style={{ padding: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {row.card?.img ? <img src={row.card.img} alt="" loading="lazy" style={{ width: 44, borderRadius: 4 }} /> : null}
                  <span>{row.card?.name || row.name}</span>
                </div>
              </td>
              <td style={{ padding: 10 }}>{row.card?.set_name || '—'}</td>
              <td style={{ padding: 10 }}>{row.card?.usd ? '$' + row.card.usd : '—'}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>}
    </main>
  );
}
