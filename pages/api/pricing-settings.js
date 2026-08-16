import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

async function getSettings() {
  let s = await prisma.pricingSettings.findUnique({ where: { id: 1 } });
  if (!s) s = await prisma.pricingSettings.create({ data: { id: 1 } });
  return s;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const s = await getSettings();
    return res.status(200).json({ settings: s });
  }

  if (req.method === 'PATCH') {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    await getSettings();
    const {
      nearMintPct, lightlyPlayedPct, moderatelyPlayedPct, heavilyPlayedPct, damagedPct,
      customRateEnabled, customRate, globalDiscountEnabled, globalDiscountPct, globalDiscountStart, globalDiscountEnd
    } = req.body;
    const data = {};
    if (nearMintPct !== undefined) data.nearMintPct = parseInt(nearMintPct);
    if (lightlyPlayedPct !== undefined) data.lightlyPlayedPct = parseInt(lightlyPlayedPct);
    if (moderatelyPlayedPct !== undefined) data.moderatelyPlayedPct = parseInt(moderatelyPlayedPct);
    if (heavilyPlayedPct !== undefined) data.heavilyPlayedPct = parseInt(heavilyPlayedPct);
    if (damagedPct !== undefined) data.damagedPct = parseInt(damagedPct);
    if (customRateEnabled !== undefined) data.customRateEnabled = Boolean(customRateEnabled);
    if (customRate !== undefined) data.customRate = customRate === '' || customRate === null ? null : parseFloat(customRate);
    if (globalDiscountEnabled !== undefined) data.globalDiscountEnabled = Boolean(globalDiscountEnabled);
    if (globalDiscountPct !== undefined) data.globalDiscountPct = parseInt(globalDiscountPct);
    if (globalDiscountStart !== undefined) data.globalDiscountStart = globalDiscountStart ? new Date(globalDiscountStart) : null;
    if (globalDiscountEnd !== undefined) data.globalDiscountEnd = globalDiscountEnd ? new Date(globalDiscountEnd) : null;
    const s = await prisma.pricingSettings.update({ where: { id: 1 }, data });
    return res.status(200).json({ settings: s });
  }

  res.status(405).json({ error: 'Método no permitido' });
}
