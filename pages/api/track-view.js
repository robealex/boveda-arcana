import { prisma } from '../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { id } = req.body;
  const invId = parseInt(id);
  if (!invId) return res.status(400).json({ error: 'Falta id' });
  try {
    await prisma.inventory.update({ where: { id: invId }, data: { views: { increment: 1 } } });
  } catch (e) {
    // si la carta ya no existe, simplemente ignoramos
  }
  res.status(200).json({ ok: true });
}
