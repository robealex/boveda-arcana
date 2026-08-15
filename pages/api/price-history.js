import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
  const { id } = req.query;
  const invId = parseInt(id);
  if (!invId) return res.status(400).json({ error: 'Falta id' });
  const snapshots = await prisma.priceSnapshot.findMany({
    where: { inventoryId: invId },
    orderBy: { recordedAt: 'asc' }
  });
  res.status(200).json({
    snapshots: snapshots.map(s => ({
      ...s,
      myPrice: Number(s.myPrice),
      refPrice: s.refPrice !== null ? Number(s.refPrice) : null
    }))
  });
}
