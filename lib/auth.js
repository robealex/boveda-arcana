import jwt from 'jsonwebtoken';

const SECRET = process.env.ADMIN_JWT_SECRET || process.env.CUSTOMER_JWT_SECRET || process.env.ADMIN_PASSWORD || 'boveda-arcana-dev-secret';

export function signAdminToken(adminId, role) {
  return jwt.sign({ adminId, role }, SECRET, { expiresIn: '30d' });
}

function verifyAdminToken(token) {
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
  const payload = verifyAdminToken(cred);
  return payload ? payload.role : null;
}

export function getAdminId(req) {
  const cred = req.headers['x-admin-password'];
  if (!cred) return null;
  const payload = verifyAdminToken(cred);
  return payload ? payload.adminId : null;
}

// Cualquier admin (owner o staff) valido
export function checkAdmin(req) {
  return Boolean(getAdminRole(req));
}

// Solo el dueño (acceso a datos sensibles: precios, usuarios, rentabilidad, staff)
export function checkOwner(req) {
  return getAdminRole(req) === 'owner';
}
