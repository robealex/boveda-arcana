import { prisma } from '../../../lib/prisma';
import { hashPassword, signToken } from '../../../lib/customerAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const existing = await prisma.customer.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });

  const passwordHash = await hashPassword(password);
  const customer = await prisma.customer.create({
    data: { name: name.trim(), email: email.toLowerCase().trim(), phone: phone || null, passwordHash }
  });

  const token = signToken(customer.id);
  res.status(201).json({ token, customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, address: customer.address } });
}
