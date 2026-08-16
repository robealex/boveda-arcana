import { prisma } from '../../../lib/prisma';
import { hashPassword } from '../../../lib/customerAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Faltan datos' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const customer = await prisma.customer.findFirst({ where: { resetToken: token } });
  if (!customer || !customer.resetTokenExpiry || customer.resetTokenExpiry < new Date()) {
    return res.status(400).json({ error: 'El link ya expiró o no es válido. Pide uno nuevo.' });
  }

  const passwordHash = await hashPassword(password);
  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null }
  });

  res.status(200).json({ ok: true });
}
