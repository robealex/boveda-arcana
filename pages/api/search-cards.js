export default async function handler(req, res) {
  const { q } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Falta el parámetro q' });
  }
  try {
    const r = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=prints`,
      { headers: { 'User-Agent': 'BovedaArcana/1.0', Accept: 'application/json' } }
    );
    if (!r.ok) {
      return res.status(r.status).json({ error: 'Scryfall no encontró resultados', data: [] });
    }
    const data = await r.json();
    const simplified = (data.data || []).slice(0, 12).map((c) => ({
      name: c.name,
      set_name: c.set_name,
      img: c.image_uris?.normal || c.card_faces?.[0]?.image_uris?.normal || '',
      usd: c.prices?.usd || null
    }));
    res.status(200).json({ data: simplified });
  } catch (e) {
    res.status(500).json({ error: 'Error al conectar con Scryfall' });
  }
}
