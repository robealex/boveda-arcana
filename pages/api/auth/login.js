import { prisma } from '../../../lib/prisma';
import { verifyPassword, signToken } from '../../../lib/customerAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });

  const customer = await prisma.customer.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!customer) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

  const ok = await verifyPassword(password, customer.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

  const token = signToken(customer.id);
  res.status(200).json({ token, customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, address: customer.address } });
}
