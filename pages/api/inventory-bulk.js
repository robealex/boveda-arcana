import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });

  const { ids, action, percent } = req.body;
  const idList = (ids || []).map(id => parseInt(id)).filter(Boolean);
  if (idList.length === 0) return res.status(400).json({ error: 'No seleccionaste cartas' });

  if (action === 'delete') {
    await prisma.inventory.deleteMany({ where: { id: { in: idList } } });
    return res.status(200).json({ ok: true, affected: idList.length });
  }

  if (action === 'price_pct') {
    const pct = parseFloat(percent);
    if (isNaN(pct)) return res.status(400).json({ error: 'Porcentaje inválido' });
    const items = await prisma.inventory.findMany({ where: { id: { in: idList } } });
    await prisma.$transaction(
      items.map(it => {
        const newPrice = Math.max(0.01, Number(it.price) * (1 + pct / 100));
        return prisma.inventory.update({ where: { id: it.id }, data: { price: newPrice.toFixed(2) } });
      })
    );
    return res.status(200).json({ ok: true, affected: items.length });
  }

  res.status(400).json({ error: 'Acción no reconocida' });
}
