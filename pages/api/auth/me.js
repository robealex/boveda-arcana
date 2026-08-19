import { prisma } from '../../../lib/prisma';
import { getCustomerIdFromReq, verifyPassword, hashPassword } from '../../../lib/customerAuth';

export default async function handler(req, res) {
  const customerId = getCustomerIdFromReq(req);
  if (!customerId) return res.status(401).json({ error: 'Sesión inválida, inicia sesión de nuevo' });

  if (req.method === 'GET') {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return res.status(404).json({ error: 'Cuenta no encontrada' });
    return res.status(200).json({ customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, address: customer.address } });
  }

  if (req.method === 'PATCH') {
    const { name, phone, address, currentPassword, newPassword } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (address !== undefined) data.address = address;

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Ingresa tu contraseña actual para poder cambiarla' });
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      const ok = await verifyPassword(currentPassword, customer.passwordHash);
      if (!ok) return res.status(401).json({ error: 'Tu contraseña actual no es correcta' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
      data.passwordHash = await hashPassword(newPassword);
    }

    const customer = await prisma.customer.update({ where: { id: customerId }, data });
    return res.status(200).json({ customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, address: customer.address } });
  }

  res.status(405).json({ error: 'Método no permitido' });
}
