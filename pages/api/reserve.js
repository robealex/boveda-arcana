import { prisma } from '../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Carrito vacío' });
  }

  const results = [];
  for (const cartItem of items) {
    const id = parseInt(cartItem.id);
    const wanted = parseInt(cartItem.qty);
    if (!id || !wanted || wanted <= 0) continue;

    const current = await prisma.inventory.findUnique({ where: { id } });
    if (!current) continue;

    const reserved = Math.min(wanted, current.qty);
    if (reserved <= 0) continue;

    const updated = await prisma.inventory.update({
      where: { id },
      data: { qty: current.qty - reserved }
    });
    results.push({ id, name: current.name, reserved, remaining: updated.qty });
  }

  res.status(200).json({ ok: true, results });
}
