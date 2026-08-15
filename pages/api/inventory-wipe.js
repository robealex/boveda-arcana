import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Método no permitido' });
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
  const result = await prisma.inventory.deleteMany({});
  res.status(200).json({ ok: true, deleted: result.count });
}
