import jwt from 'jsonwebtoken';

const SECRET = process.env.ADMIN_JWT_SECRET || process.env.CUSTOMER_JWT_SECRET || process.env.ADMIN_PASSWORD || 'boveda-arcana-dev-secret';

export function signAdminToken(adminId, role, permissions = []) {
  return jwt.sign({ adminId, role, permissions }, SECRET, { expiresIn: '30d' });
}

function decodeAdminToken(token) {
  try {
    const payload = jwt.verify(token, SECRET);
    return payload.role ? payload : null;
  } catch (e) {
    return null;
  }
}

// Devuelve 'owner', 'staff', o null si no hay credencial valida
export function getAdminRole(req) {
  const cred = req.headers['x-admin-password'];
  if (!cred) return null;
  if (process.env.ADMIN_PASSWORD && cred === process.env.ADMIN_PASSWORD) return 'owner';
  const payload = decodeAdminToken(cred);
  return payload ? payload.role : null;
}

export function getAdminId(req) {
  const cred = req.headers['x-admin-password'];
  if (!cred) return null;
  const payload = decodeAdminToken(cred);
  return payload ? payload.adminId : null;
}

// Cualquier admin (owner o staff) valido - para lectura general
export function checkAdmin(req) {
  return Boolean(getAdminRole(req));
}

// Solo el dueño (gestion de staff, siempre fijo por seguridad)
export function checkOwner(req) {
  return getAdminRole(req) === 'owner';
}

// El dueño (password legacy) siempre tiene todos los permisos.
// El staff solo tiene los permisos que se le hayan activado explicitamente.
export function hasPermission(req, perm) {
  const cred = req.headers['x-admin-password'];
  if (!cred) return false;
  if (process.env.ADMIN_PASSWORD && cred === process.env.ADMIN_PASSWORD) return true;
  const payload = decodeAdminToken(cred);
  if (!payload) return false;
  if (payload.role === 'owner') return true;
  return Array.isArray(payload.permissions) && payload.permissions.includes(perm);
}
