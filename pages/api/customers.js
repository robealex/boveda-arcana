import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

export default async function handler(req, res) {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });

  if (req.method === 'GET') {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } }
    });
    return res.status(200).json({
      customers: customers.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, address: c.address, createdAt: c.createdAt, orderCount: c._count.orders }))
    });
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { name, phone, address, email } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (address !== undefined) data.address = address;
    if (email !== undefined) data.email = email.toLowerCase().trim();
    const customer = await prisma.customer.update({ where: { id: parseInt(id) }, data });
    return res.status(200).json({ customer });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await prisma.customer.delete({ where: { id: parseInt(id) } });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Método no permitido' });
}
