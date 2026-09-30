export default async function handler(req, res) {
  const name = String(req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Falta el nombre de la carta.' });

  try {
    const headers = { 'User-Agent': 'BovedaArcana/1.0', Accept: 'application/json' };
    const namedResponse = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`, { headers });
    if (!namedResponse.ok) return res.status(404).json({ error: `No se encontró "${name}" en Scryfall.` });
    const card = await namedResponse.json();
    const printsResponse = await fetch(`https://api.scryfall.com/cards/${card.id}/prints?order=released&dir=desc&unique=prints`, { headers });
    if (!printsResponse.ok) return res.status(502).json({ error: 'Scryfall no pudo devolver las ediciones de esta carta.' });
    const prints = await printsResponse.json();

    return res.status(200).json({
      printings: (prints.data || []).map(p => ({
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