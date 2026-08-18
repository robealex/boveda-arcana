import { checkAdmin } from '../../lib/auth';

function extractDeckId(url) {
  const m = url.match(/archidekt\.com\/decks\/(\d+)/);
  return m ? m[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });

  const { url } = req.body;
  const deckId = extractDeckId(url || '');
  if (!deckId) return res.status(400).json({ error: 'No reconozco esa URL de Archidekt. Debe verse como archidekt.com/decks/12345' });

  try {
    const r = await fetch(`https://archidekt.com/api/decks/${deckId}/`, {
      headers: { 'User-Agent': 'BovedaArcana/1.0', Accept: 'application/json' }
    });
    if (!r.ok) throw new Error('Archidekt respondió con error');
    const data = await r.json();

    const cards = (data.cards || [])
      .map(entry => ({
        name: entry.card?.oracleCard?.name || entry.card?.name || '',
        qty: entry.quantity || 1
      }))
      .filter(c => c.name);

    if (cards.length === 0) throw new Error('No encontré cartas en ese deck');

    res.status(200).json({ name: data.name || 'Deck sin nombre', cards });
  } catch (e) {
    res.status(502).json({
      error: 'No se pudo importar desde Archidekt (puede que el deck sea privado, o haya cambiado su formato). Puedes pegar la lista de cartas a mano en su lugar.'
    });
  }
}
