import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

const HOLD_HOURS = 48;

async function getAvailable(inventoryId) {
  const item = await prisma.inventory.findUnique({ where: { id: inventoryId } });
  if (!item) return { item: null, available: 0 };
  const reserved = await prisma.orderItem.aggregate({
    where: { inventoryId, order: { status: 'pending', expiresAt: { gt: new Date() } } },
    _sum: { qty: true }
  });
  return { item, available: Math.max(0, item.qty - (reserved._sum.qty || 0)) };
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Carrito vacío' });
    }

    const lines = [];
    for (const raw of items) {
      const id = parseInt(raw.id);
      const wanted = parseInt(raw.qty);
      if (!id || !wanted || wanted <= 0) continue;
      const { item, available } = await getAvailable(id);
      if (!item) return res.status(400).json({ error: `Una de las cartas ya no existe en el inventario.` });
      if (available < wanted) {
        return res.status(409).json({ error: `Ya no hay suficiente stock de "${item.name}" (quedan ${available} disponibles). Ajusta tu carrito.` });
      }
      lines.push({ id, name: item.name, qty: wanted, priceUsd: item.price });
    }

    if (lines.length === 0) return res.status(400).json({ error: 'Carrito vacío' });

    const totalUsd = lines.reduce((s, l) => s + Number(l.priceUsd) * l.qty, 0);
    const expiresAt = new Date(Date.now() + HOLD_HOURS * 60 * 60 * 1000);

    const order = await prisma.order.create({
      data: {
        status: 'pending',
        expiresAt,
        totalUsd,
        items: { create: lines.map(l => ({ inventoryId: l.id, name: l.name, qty: l.qty, priceUsd: l.priceUsd })) }
      },
      include: { items: true }
    });

    return res.status(201).json({ order, expiresAt });
  }

  if (req.method === 'GET') {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });
    return res.status(200).json({ orders });
  }

  if (req.method === 'PATCH') {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    const { id } = req.query;
    const { status } = req.body;
    if (!id || !['confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    const order = await prisma.order.findUnique({ where: { id: parseInt(id) }, include: { items: true } });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    if (order.status !== 'pending') return res.status(400).json({ error: 'Este pedido ya fue procesado' });

    if (status === 'confirmed') {
      const stillExisting = order.items.filter(it => it.inventoryId !== null);
      await prisma.$transaction([
        ...stillExisting.map(it =>
          prisma.inventory.update({
            where: { id: it.inventoryId },
            data: { qty: { decrement: it.qty } }
          })
        ),
        prisma.order.update({ where: { id: order.id }, data: { status: 'confirmed' } })
      ]);
    } else {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'cancelled' } });
    }

    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Método no permitido' });
}
