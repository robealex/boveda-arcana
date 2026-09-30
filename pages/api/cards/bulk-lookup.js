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
    // La colección exacta es eficiente; después se intenta fuzzy para los nombres no encontrados.
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
      let payload;
      try { payload = await response.json(); } catch { throw new Error('Respuesta inválida de Scryfall.'); }
      if (!response.ok) {
        return res.status(502).json({
          error: payload.details || payload.error || `Scryfall respondió con HTTP ${response.status}.`
        });
      }

      const exact = new Map((payload.data || []).map(card => [card.name.toLowerCase(), card]));
      for (const requested of batch) {
        const card = exact.get(requested.toLowerCase());
        if (card) data.push({ ...formatCard(card), requested_name: requested });
        else not_found.push(requested);
      }
    }

    // Resuelve nombres aproximados con concurrencia limitada para no saturar Scryfall.
    const unresolved = [...not_found];
    not_found.length = 0;
    for (let i = 0; i < unresolved.length; i += 5) {
      const group = unresolved.slice(i, i + 5);
      const results = await Promise.all(group.map(async requested => {
        try {
          const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(requested)}`, {
            headers: { 'User-Agent': 'BovedaArcana/1.0', Accept: 'application/json' }
          });
          if (!response.ok) return { requested, card: null };
          return { requested, card: await response.json() };
        } catch { return { requested, card: null }; }
      }));
      for (const result of results) {
        if (result.card && result.card.object !== 'error') {
          data.push({ ...formatCard(result.card), requested_name: result.requested });
        } else not_found.push(result.requested);
      }
    }
    return res.status(200).json({ data, not_found });
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Error al conectar con Scryfall.' });
  }
}

function formatCard(card) {
  return {
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
  };
}
