export default async function handler(req, res) {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await r.json();
    const rate = data?.rates?.MXN;
    if (!rate) throw new Error('Sin tasa disponible');
    res.status(200).json({ rate, updated: data.time_last_update_utc || null });
  } catch (e) {
    // Tipo de cambio de respaldo por si la API externa falla, para que el admin no se trabe
    res.status(200).json({ rate: 18.5, updated: null, fallback: true });
  }
}
