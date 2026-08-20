import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

export default async function handler(req, res) {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });

  const items = await prisma.inventory.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      priceHistory: { orderBy: { recordedAt: 'desc' }, take: 1 },
      orderItems: { include: { order: true } }
    }
  });

  const rows = items.map(it => {
    const soldConfirmed = it.orderItems.filter(oi => oi.order.status === 'confirmed');
    const soldQty = soldConfirmed.reduce((s, oi) => s + oi.qty, 0);
    const soldRevenue = soldConfirmed.reduce((s, oi) => s + Number(oi.priceUsd) * oi.qty, 0);
    const cost = it.costUsd !== null ? Number(it.costUsd) : null;
    const price = Number(it.price);
    const marketRef = it.priceHistory[0]?.refPrice !== null && it.priceHistory[0]?.refPrice !== undefined ? Number(it.priceHistory[0].refPrice) : null;

    return {
      id: it.id,
      name: it.name,
      condition: it.condition,
      qty: it.qty,
      cost,
      price,
      marketRef,
      marginCurrent: cost !== null ? Number((price - cost).toFixed(2)) : null,
      marginPct: cost !== null && cost > 0 ? Number((((price - cost) / cost) * 100).toFixed(1)) : null,
      vsMarket: marketRef !== null ? Number((price - marketRef).toFixed(2)) : null,
      soldQty,
      soldRevenue: Number(soldRevenue.toFixed(2)),
      realizedProfit: cost !== null ? Number((soldRevenue - cost * soldQty).toFixed(2)) : null
    };
  });

  res.status(200).json({ rows });
}
