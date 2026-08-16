import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

function csvEscape(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export default async function handler(req, res) {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });

  const orders = await prisma.order.findMany({
    where: { status: 'confirmed' },
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  });

  const rows = [['Pedido', 'Fecha', 'Cliente', 'Telefono', 'Correo', 'Cartas', 'Total USD']];
  orders.forEach(o => {
    const itemsSummary = o.items.map(it => `${it.name} x${it.qty}`).join(' | ');
    rows.push([
      o.id,
      o.createdAt.toISOString().slice(0, 10),
      o.customerName || '',
      o.customerPhone || '',
      o.customerEmail || '',
      itemsSummary,
      Number(o.totalUsd).toFixed(2)
    ]);
  });

  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="boveda-arcana-pedidos.csv"');
  res.status(200).send(csv);
}
