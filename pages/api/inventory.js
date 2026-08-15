import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

function serialize(item, reservedMap) {
  const reserved = reservedMap?.get(item.id) || 0;
  return {
    ...item,
    price: Number(item.price),
    rawQty: item.qty,
    reserved,
    qty: Math.max(0, item.qty - reserved)
  };
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
  const { name, set_name, img, price, qty, condition, stripe_link, colors, rarity, type_line, foil, language, scryfall_uri } = body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (set_name !== undefined) data.setName = set_name || '';
  if (img !== undefined) data.img = img || '';
  if (price !== undefined) data.price = price;
  if (qty !== undefined) data.qty = qty;
  if (condition !== undefined) data.condition = condition || 'Near Mint';
  if (stripe_link !== undefined) data.stripeLink = stripe_link || '';
  if (colors !== undefined) data.colors = colors || '';
  if (rarity !== undefined) data.rarity = rarity || '';
  if (type_line !== undefined) data.typeLine = type_line || '';
  if (foil !== undefined) data.foil = Boolean(foil);
  if (language !== undefined) data.language = language || 'en';
  if (scryfall_uri !== undefined) data.scryfallUri = scryfall_uri || '';
  return data;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const [items, reservedMap] = await Promise.all([
      prisma.inventory.findMany({ orderBy: { createdAt: 'desc' } }),
      getReservedMap()
    ]);
    return res.status(200).json({ items: items.map(it => serialize(it, reservedMap)) });
  }

  if (req.method === 'POST') {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    if (!req.body.name || !req.body.price) return res.status(400).json({ error: 'Faltan datos: nombre y precio son obligatorios' });
    const data = buildData(req.body);
    data.qty = data.qty || 1;
    data.condition = data.condition || 'Near Mint';
    const item = await prisma.inventory.create({ data });
    return res.status(201).json({ item: serialize(item) });
  }

  if (req.method === 'DELETE') {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
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
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Falta id' });
    const data = buildData(req.body);
    const item = await prisma.inventory.update({ where: { id: parseInt(id) }, data });
    return res.status(200).json({ item: serialize(item) });
  }

  res.status(405).json({ error: 'Método no permitido' });
}
