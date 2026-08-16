import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

export default async function handler(req, res) {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });

  const confirmedOrders = await prisma.order.findMany({
    where: { status: 'confirmed' },
    include: { items: true }
  });

  const totalSoldUsd = confirmedOrders.reduce((s, o) => s + Number(o.totalUsd), 0);
  const totalCardsSold = confirmedOrders.reduce((s, o) => s + o.items.reduce((s2, it) => s2 + it.qty, 0), 0);

  const byMonth = {};
  confirmedOrders.forEach(o => {
    const key = o.createdAt.toISOString().slice(0, 7); // YYYY-MM
    byMonth[key] = (byMonth[key] || 0) + Number(o.totalUsd);
  });
  const monthly = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).map(([month, total]) => ({ month, total }));

  const soldInventoryIds = new Set();
  confirmedOrders.forEach(o => o.items.forEach(it => { if (it.inventoryId) soldInventoryIds.add(it.inventoryId); }));

  const allItems = await prisma.inventory.findMany({ where: { views: { gt: 0 } }, orderBy: { views: 'desc' } });
  const viewedNotSold = allItems.filter(it => !soldInventoryIds.has(it.id)).slice(0, 10)
    .map(it => ({ id: it.id, name: it.name, views: it.views, price: Number(it.price) }));

  res.status(200).json({
    totalSoldUsd,
    totalCardsSold,
    confirmedOrdersCount: confirmedOrders.length,
    monthly,
    viewedNotSold
  });
}
