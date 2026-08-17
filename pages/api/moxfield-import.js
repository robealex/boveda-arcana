import { checkAdmin } from '../../lib/auth';

function extractDeckId(url) {
  const m = url.match(/moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function extractCards(boardObj) {
  if (!boardObj) return [];
  return Object.values(boardObj).map(entry => ({
    name: entry.card?.name || '',
    qty: entry.quantity || 1,
    img: entry.card?.image_uris?.normal || entry.card?.image_uris?.small || ''
  })).filter(c => c.name);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });

  const { url } = req.body;
  const deckId = extractDeckId(url || '');
  if (!deckId) return res.status(400).json({ error: 'No reconozco esa URL de Moxfield. Debe verse como moxfield.com/decks/XXXXX' });

  try {
    const r = await fetch(`https://api2.moxfield.com/v3/decks/all/${deckId}`, {
      headers: { 'User-Agent': 'BovedaArcana/1.0', Accept: 'application/json' }
    });
    if (!r.ok) throw new Error('Moxfield respondió con error');
    const data = await r.json();

    const cards = [
      ...extractCards(data.commanders),
      ...extractCards(data.mainboard)
    ];
    if (cards.length === 0) throw new Error('No encontré cartas en ese deck');

    const cover = cards[0];
    res.status(200).json({
      name: data.name || 'Deck sin nombre',
      cards,
      coverImg: cover.img,
      coverName: cover.name
    });
  } catch (e) {
    res.status(502).json({
      error: 'No se pudo importar desde Moxfield (puede que su API haya cambiado, o el deck sea privado). Puedes pegar la lista de cartas a mano en su lugar.'
    });
  }
}
