import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

function csvEscape(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export default async function handler(req, res) {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });

  const items = await prisma.inventory.findMany({ orderBy: { createdAt: 'desc' } });

  const rows = [['Nombre', 'Edicion', 'Precio USD', 'Precio original USD', 'Cantidad', 'Condicion', 'Rareza', 'Tipo', 'Colores', 'Foil', 'Idioma', 'Vistas', 'Notas', 'Fecha agregada']];
  items.forEach(it => {
    rows.push([
      it.name, it.setName || '', Number(it.price).toFixed(2),
      it.originalPrice !== null ? Number(it.originalPrice).toFixed(2) : '',
      it.qty, it.condition || '', it.rarity || '', it.typeLine || '', it.colors || '',
      it.foil ? 'Si' : 'No', it.language || '', it.views, it.notes || '',
      it.createdAt.toISOString().slice(0, 10)
    ]);
  });

  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="boveda-arcana-biblioteca.csv"');
  res.status(200).send(csv);
}
