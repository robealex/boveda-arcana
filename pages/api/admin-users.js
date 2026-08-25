import { prisma } from '../../lib/prisma';
import { checkOwner } from '../../lib/auth';
import { hashPassword } from '../../lib/customerAuth';

export default async function handler(req, res) {
  if (!checkOwner(req)) return res.status(401).json({ error: 'Solo el dueño puede administrar el staff' });

  if (req.method === 'GET') {
    const users = await prisma.adminUser.findMany({ orderBy: { createdAt: 'desc' } });
    return res.status(200).json({
      users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, createdAt: u.createdAt }))
    });
  }

  if (req.method === 'POST') {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    const existing = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return res.status(409).json({ error: 'Ya existe un usuario de staff con ese correo' });
    const passwordHash = await hashPassword(password);
    const user = await prisma.adminUser.create({
      data: { name, email: email.toLowerCase().trim(), passwordHash, role: role === 'owner' ? 'owner' : 'staff' }
    });
    return res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active } });
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { name, role, active, password } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role === 'owner' ? 'owner' : 'staff';
    if (active !== undefined) data.active = Boolean(active);
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      data.passwordHash = await hashPassword(password);
    }
    const user = await prisma.adminUser.update({ where: { id: parseInt(id) }, data });
    return res.status(200).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active } });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await prisma.adminUser.delete({ where: { id: parseInt(id) } });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Método no permitido' });
}
