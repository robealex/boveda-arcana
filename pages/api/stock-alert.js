import { prisma } from '../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { inventoryId, email } = req.body;
  const id = parseInt(inventoryId);
  if (!id || !email || !email.trim()) return res.status(400).json({ error: 'Faltan datos' });

  const item = await prisma.inventory.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Esa carta ya no existe' });

  const existing = await prisma.stockAlert.findFirst({ where: { inventoryId: id, email: email.trim().toLowerCase(), notified: false } });
  if (existing) return res.status(200).json({ ok: true, already: true });

  await prisma.stockAlert.create({ data: { inventoryId: id, email: email.trim().toLowerCase() } });
  res.status(201).json({ ok: true });
}
