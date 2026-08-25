import { prisma } from '../../lib/prisma';
import { getCustomerIdFromReq } from '../../lib/customerAuth';

export default async function handler(req, res) {
  const customerId = getCustomerIdFromReq(req);
  if (!customerId) return res.status(401).json({ error: 'Sesión inválida, inicia sesión de nuevo' });

  if (req.method === 'GET') {
    const rows = await prisma.wishlist.findMany({
      where: { customerId },
      include: { inventory: true },
      orderBy: { createdAt: 'desc' }
    });
    const items = rows.map(r => ({ ...r.inventory, price: Number(r.inventory.price) }));
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const { inventoryId } = req.body;
    const id = parseInt(inventoryId);
    if (!id) return res.status(400).json({ error: 'Falta inventoryId' });
    try {
      await prisma.wishlist.create({ data: { customerId, inventoryId: id } });
    } catch (e) {
      // ya existía, no pasa nada
    }
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { inventoryId } = req.query;
    const id = parseInt(inventoryId);
    if (!id) return res.status(400).json({ error: 'Falta inventoryId' });
    await prisma.wishlist.deleteMany({ where: { customerId, inventoryId: id } });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Método no permitido' });
}
