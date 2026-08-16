import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

export default async function handler(req, res) {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
  const { id } = req.query;
  const order = await prisma.order.findUnique({ where: { id: parseInt(id) }, include: { items: true } });
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.status(200).json({ order: { ...order, totalUsd: Number(order.totalUsd) } });
}
