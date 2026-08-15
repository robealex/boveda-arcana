import { prisma } from '../../lib/prisma';
import { getCustomerIdFromReq } from '../../lib/customerAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  const customerId = getCustomerIdFromReq(req);
  if (!customerId) return res.status(401).json({ error: 'Sesión inválida, inicia sesión de nuevo' });

  const orders = await prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  });
  res.status(200).json({ orders: orders.map(o => ({ ...o, totalUsd: Number(o.totalUsd) })) });
}
