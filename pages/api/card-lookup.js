export default async function handler(req, res) {
  const { name } = req.query;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Falta el nombre de la carta' });
  }
  try {
    const r = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
      { headers: { 'User-Agent': 'BovedaArcana/1.0', Accept: 'application/json' } }
    );
    if (!r.ok) {
      return res.status(404).json({ error: `No se encontró "${name}" en Scryfall` });
    }
    const c = await r.json();
    res.status(200).json({
      name: c.name,
      set_name: c.set_name,
      img: c.image_uris?.normal || c.card_faces?.[0]?.image_uris?.normal || '',
      usd: c.prices?.usd || c.prices?.usd_foil || null,
      colors: (c.colors || c.card_faces?.[0]?.colors || []).join(','),
      rarity: c.rarity || '',
      type_line: c.type_line || c.card_faces?.[0]?.type_line || '',
      foil: Boolean(c.foil),
      lang: c.lang || 'en',
      scryfall_uri: c.scryfall_uri || ''
    });
  } catch (e) {
    res.status(500).json({ error: 'Error al conectar con Scryfall' });
  }
}
