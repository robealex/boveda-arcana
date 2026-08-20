import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';
import { sendStockAlertEmails } from '../../lib/sendEmail';

function serialize(item, reservedMap, isAdmin) {
  const reserved = reservedMap?.get(item.id) || 0;
  const out = {
    ...item,
    price: Number(item.price),
    originalPrice: item.originalPrice !== null && item.originalPrice !== undefined ? Number(item.originalPrice) : null,
    costUsd: item.costUsd !== null && item.costUsd !== undefined ? Number(item.costUsd) : null,
    rawQty: item.qty,
    reserved,
    qty: Math.max(0, item.qty - reserved)
  };
  if (!isAdmin) { delete out.notes; delete out.costUsd; }
  return out;
}

async function getReservedMap() {
  const rows = await prisma.orderItem.groupBy({
    by: ['inventoryId'],
    where: { order: { status: 'pending', expiresAt: { gt: new Date() } } },
    _sum: { qty: true }
  });
  return new Map(rows.map(r => [r.inventoryId, r._sum.qty || 0]));
}

function buildData(body) {
  const { name, set_name, img, price, original_price, qty, condition, stripe_link, colors, rarity, type_line, foil, language, scryfall_uri, notes, cost_usd } = body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (set_name !== undefined) data.setName = set_name || '';
  if (img !== undefined) data.img = img || '';
  if (price !== undefined) data.price = price;
  if (original_price !== undefined) data.originalPrice = original_price === '' || original_price === null ? null : original_price;
  if (cost_usd !== undefined) data.costUsd = cost_usd === '' || cost_usd === null ? null : cost_usd;
  if (qty !== undefined) data.qty = qty;
  if (condition !== undefined) data.condition = condition || 'Near Mint';
  if (stripe_link !== undefined) data.stripeLink = stripe_link || '';
  if (colors !== undefined) data.colors = colors || '';
  if (rarity !== undefined) data.rarity = rarity || '';
  if (type_line !== undefined) data.typeLine = type_line || '';
  if (foil !== undefined) data.foil = Boolean(foil);
  if (language !== undefined) data.language = language || 'en';
  if (scryfall_uri !== undefined) data.scryfallUri = scryfall_uri || '';
  if (notes !== undefined) data.notes = notes || '';
  return data;
}

export default async function handler(req, res) {
  const isAdmin = checkAdmin(req);

  if (req.method === 'GET') {
    const [items, reservedMap] = await Promise.all([
      prisma.inventory.findMany({ orderBy: { createdAt: 'desc' } }),
      getReservedMap()
    ]);
    return res.status(200).json({ items: items.map(it => serialize(it, reservedMap, isAdmin)) });
  }

  if (req.method === 'POST') {
    if (!isAdmin) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    if (!req.body.name || !req.body.price) return res.status(400).json({ error: 'Faltan datos: nombre y precio son obligatorios' });
    const data = buildData(req.body);
    data.qty = data.qty || 1;
    data.condition = data.condition || 'Near Mint';
    const item = await prisma.inventory.create({ data });
    await prisma.priceSnapshot.create({
      data: { inventoryId: item.id, myPrice: item.price, refPrice: req.body.ref_usd || null }
    });
    return res.status(201).json({ item: serialize(item, null, true) });
  }

  if (req.method === 'DELETE') {
    if (!isAdmin) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Falta id' });
    try {
      await prisma.inventory.delete({ where: { id: parseInt(id) } });
    } catch (e) {
      return res.status(400).json({ error: 'No se pudo eliminar la carta.' });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'PATCH') {
    if (!isAdmin) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Falta id' });
    const before = await prisma.inventory.findUnique({ where: { id: parseInt(id) } });
    const data = buildData(req.body);
    const item = await prisma.inventory.update({ where: { id: parseInt(id) }, data });
    if (data.price !== undefined) {
      await prisma.priceSnapshot.create({
        data: { inventoryId: item.id, myPrice: item.price, refPrice: req.body.ref_usd || null }
      });
    }
    if (before && before.qty <= 0 && data.qty !== undefined && data.qty > 0) {
      const alerts = await prisma.stockAlert.findMany({ where: { inventoryId: item.id, notified: false } });
      if (alerts.length > 0) {
        sendStockAlertEmails(item, alerts.map(a => a.email)).catch(() => {});
        await prisma.stockAlert.updateMany({ where: { inventoryId: item.id, notified: false }, data: { notified: true } });
      }
    }
    return res.status(200).json({ item: serialize(item, null, true) });
  }

  res.status(405).json({ error: 'Método no permitido' });
}
