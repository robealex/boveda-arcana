import { prisma } from '../../lib/prisma';
import { checkOwner } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Método no permitido' });
  if (!checkOwner(req)) return res.status(401).json({ error: 'Solo el dueño puede ver esta sección' });
  const result = await prisma.inventory.deleteMany({});
  res.status(200).json({ ok: true, deleted: result.count });
}
