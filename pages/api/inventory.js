import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

function serialize(item) {
  return { ...item, price: Number(item.price) };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const items = await prisma.inventory.findMany({ orderBy: { createdAt: 'desc' } });
    return res.status(200).json({ items: items.map(serialize) });
  }

  if (req.method === 'POST') {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    const { name, set_name, img, price, qty, condition, stripe_link, colors, rarity, type_line } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Faltan datos: nombre y precio son obligatorios' });
    const item = await prisma.inventory.create({
      data: {
        name,
        setName: set_name || '',
        img: img || '',
        price,
        qty: qty || 1,
        condition: condition || 'Near Mint',
        stripeLink: stripe_link || '',
        colors: colors || '',
        rarity: rarity || '',
        typeLine: type_line || ''
      }
    });
    return res.status(201).json({ item: serialize(item) });
  }

  if (req.method === 'DELETE') {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Falta id' });
    await prisma.inventory.delete({ where: { id: parseInt(id) } });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'PATCH') {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    const { id } = req.query;
    const { qty, price, condition } = req.body;
    if (!id) return res.status(400).json({ error: 'Falta id' });
    const data = {};
    if (qty !== undefined) data.qty = qty;
    if (price !== undefined) data.price = price;
    if (condition !== undefined) data.condition = condition;
    const item = await prisma.inventory.update({ where: { id: parseInt(id) }, data });
    return res.status(200).json({ item: serialize(item) });
  }

  res.status(405).json({ error: 'Método no permitido' });
}
