import { prisma } from '../../../lib/prisma';
import { verifyPassword, signToken } from '../../../lib/customerAuth';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });

  const customer = await prisma.customer.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!customer) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

  if (customer.lockedUntil && customer.lockedUntil > new Date()) {
    const minsLeft = Math.ceil((customer.lockedUntil - new Date()) / 60000);
    return res.status(429).json({ error: `Demasiados intentos fallidos. Espera ${minsLeft} minuto(s) o recupera tu contraseña.` });
  }

  const ok = await verifyPassword(password, customer.passwordHash);
  if (!ok) {
    const attempts = customer.failedAttempts + 1;
    const data = { failedAttempts: attempts };
    if (attempts >= MAX_ATTEMPTS) {
      data.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      data.failedAttempts = 0;
    }
    await prisma.customer.update({ where: { id: customer.id }, data });
    if (data.lockedUntil) {
      return res.status(429).json({ error: `Demasiados intentos fallidos. Tu cuenta se bloqueó ${LOCK_MINUTES} minutos por seguridad.` });
    }
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }

  if (customer.failedAttempts > 0 || customer.lockedUntil) {
    await prisma.customer.update({ where: { id: customer.id }, data: { failedAttempts: 0, lockedUntil: null } });
  }

  const token = signToken(customer.id);
  res.status(200).json({ token, customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, address: customer.address } });
}
