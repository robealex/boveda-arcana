import crypto from 'crypto';
import { prisma } from '../../../lib/prisma';
import { sendPasswordResetEmail } from '../../../lib/sendEmail';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Falta el correo' });

  const customer = await prisma.customer.findUnique({ where: { email: email.toLowerCase().trim() } });
  // Por seguridad, respondemos igual exista o no la cuenta (no revelamos si el correo está registrado)
  if (customer) {
    const token = crypto.randomBytes(24).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.customer.update({ where: { id: customer.id }, data: { resetToken: token, resetTokenExpiry: expiry } });
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    sendPasswordResetEmail(customer.email, resetUrl).catch(() => {});
  }

  res.status(200).json({ ok: true, message: 'Si ese correo está registrado, te llegará un link para restablecer tu contraseña.' });
}
