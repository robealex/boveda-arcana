import { checkAdmin } from '../../lib/auth';

function extractDeckSlug(url) {
  const m = url.match(/tappedout\.net\/mtg-decks\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });

  const { url } = req.body;
  const slug = extractDeckSlug(url || '');
  if (!slug) return res.status(400).json({ error: 'No reconozco esa URL de TappedOut. Debe verse como tappedout.net/mtg-decks/xxxx' });

  try {
    const r = await fetch(`https://tappedout.net/mtg-decks/${slug}/?fmt=txt`, {
      headers: { 'User-Agent': 'BovedaArcana/1.0' }
    });
    if (!r.ok) throw new Error('TappedOut respondió con error');
    const text = await r.text();

    const cards = text.split('\n').map(l => l.trim()).filter(Boolean)
      .map(line => {
        const m = line.match(/^(\d+)x?\s+(.+)$/i);
        return m ? { name: m[2].trim(), qty: parseInt(m[1]) } : { name: line, qty: 1 };
      })
      .filter(c => c.name && !c.name.toLowerCase().startsWith('sideboard'));

    if (cards.length === 0) throw new Error('No encontré cartas en ese deck');

    res.status(200).json({ name: slug.replace(/-/g, ' '), cards });
  } catch (e) {
    res.status(502).json({
      error: 'No se pudo importar desde TappedOut (puede que el deck sea privado, o haya cambiado su formato). Puedes pegar la lista de cartas a mano en su lugar.'
    });
  }
}
