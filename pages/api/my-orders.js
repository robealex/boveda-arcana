import { prisma } from '../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  const { phone } = req.query;
  if (!phone || !phone.trim()) return res.status(400).json({ error: 'Falta el número de teléfono' });
  const orders = await prisma.order.findMany({
    where: { customerPhone: phone.trim() },
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  });
  res.status(200).json({
    orders: orders.map(o => ({ ...o, totalUsd: Number(o.totalUsd) }))
  });
}
