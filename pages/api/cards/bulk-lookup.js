export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const input = req.body?.cards;
  if (!Array.isArray(input) || input.length === 0) {
    return res.status(400).json({ error: 'Envía un arreglo cards con nombres de cartas.' });
  }
  if (input.length > 300 || input.some(name => typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'Se permiten hasta 300 nombres de cartas no vacíos.' });
  }

  const names = [...new Set(input.map(name => name.trim()))];
  const data = [];
  const not_found = [];

  try {
    // Scryfall Collection acepta hasta 75 identificadores por solicitud.
    for (let i = 0; i < names.length; i += 75) {
      const batch = names.slice(i, i + 75);
      const response = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BovedaArcana/1.0',
          Accept: 'application/json'
        },
        body: JSON.stringify({ identifiers: batch.map(name => ({ name })) })
      });

      const payload = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({
          error: payload.details || payload.error || 'Scryfall no pudo procesar la consulta.'
        });
      }

      for (const card of payload.data || []) {
        data.push({
          name: card.name,
          set_name: card.set_name,
          img: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '',
          usd: card.prices?.usd || card.prices?.usd_foil || null,
          colors: (card.colors || card.card_faces?.[0]?.colors || []).join(','),
          rarity: card.rarity || '',
          type_line: card.type_line || card.card_faces?.[0]?.type_line || '',
          foil: Boolean(card.foil),
          lang: card.lang || 'en',
          scryfall_uri: card.scryfall_uri || '',
          cmc: typeof card.cmc === 'number' ? card.cmc : null
        });
      }
      for (const missing of payload.not_found || []) {
        if (missing.name) not_found.push(missing.name);
      }
    }

    return res.status(200).json({ data, not_found });
  } catch (error) {
    return res.status(502).json({ error: 'Error al conectar con Scryfall.' });
  }
}
