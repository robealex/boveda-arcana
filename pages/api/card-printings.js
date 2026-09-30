const requestTimes = [];
const MAX_REQUESTS = 9;
const WINDOW_MS = 10000;

async function waitForScryfallSlot() {
  while (true) {
    const now = Date.now();
    while (requestTimes.length && now - requestTimes[0] >= WINDOW_MS) requestTimes.shift();
    if (requestTimes.length < MAX_REQUESTS) {
      requestTimes.push(now);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, Math.max(250, WINDOW_MS - (now - requestTimes[0]) + 50)));
  }
}

export default async function handler(req, res) {
  const name = String(req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Falta el nombre de la carta.' });

  try {
    const headers = { 'User-Agent': 'BovedaArcana/1.0', Accept: 'application/json' };
    await waitForScryfallSlot();
    const response = await fetch(
      `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(name)}"&unique=prints&order=released&dir=desc`,
      { headers }
    );
    if (!response.ok) return res.status(404).json({ error: `No se encontraron ediciones de "${name}" en Scryfall.` });
    const result = await response.json();

    return res.status(200).json({
      printings: (result.data || []).map(p => ({
        set: p.set || '',
        set_name: p.set_name || '',
        collector_number: p.collector_number || '',
        img: p.image_uris?.normal || p.card_faces?.[0]?.image_uris?.normal || '',
        prices: p.prices || {},
        rarity: p.rarity || '',
        type_line: p.type_line || p.card_faces?.[0]?.type_line || '',
        lang: p.lang || 'en',
        colors: (p.colors || p.card_faces?.[0]?.colors || []).join(','),
        foil: Boolean(p.foil),
        scryfall_uri: p.scryfall_uri || ''
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar las ediciones en Scryfall.' });
  }
}