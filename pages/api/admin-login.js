import { prisma } from '../../lib/prisma';
import { verifyPassword } from '../../lib/customerAuth';
import { signAdminToken } from '../../lib/auth';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });

  const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.active) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minsLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
    return res.status(429).json({ error: `Demasiados intentos fallidos. Espera ${minsLeft} minuto(s).` });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const attempts = (user.failedAttempts || 0) + 1;
    const data = { failedAttempts: attempts };
    if (attempts >= MAX_ATTEMPTS) { data.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000); data.failedAttempts = 0; }
    await prisma.adminUser.update({ where: { id: user.id }, data }).catch(() => {});
    if (data.lockedUntil) return res.status(429).json({ error: `Demasiados intentos fallidos. Cuenta bloqueada ${LOCK_MINUTES} minutos.` });
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }

  const token = signAdminToken(user.id, user.role);
  res.status(200).json({ token, name: user.name, role: user.role });
}
