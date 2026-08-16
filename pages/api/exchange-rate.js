import { prisma } from '../../lib/prisma';

export default async function handler(req, res) {
  let liveRate = null;
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await r.json();
    liveRate = data?.rates?.MXN || null;
  } catch (e) {
    // seguimos, hay respaldo abajo
  }

  let settings = null;
  try {
    settings = await prisma.pricingSettings.findUnique({ where: { id: 1 } });
  } catch (e) {
    // si la tabla aun no existe o falla, seguimos con la tasa en vivo
  }

  if (settings?.customRateEnabled && settings.customRate) {
    return res.status(200).json({ rate: settings.customRate, liveRate, source: 'custom' });
  }

  if (liveRate) {
    return res.status(200).json({ rate: liveRate, liveRate, source: 'live' });
  }

  // Tipo de cambio de respaldo por si la API externa falla, para que la tienda no se quede sin precios
  res.status(200).json({ rate: 18.5, liveRate: null, source: 'fallback', fallback: true });
}
