import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = process.env.CUSTOMER_JWT_SECRET || process.env.ADMIN_PASSWORD || 'boveda-arcana-dev-secret';

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(customerId) {
  return jwt.sign({ customerId }, SECRET, { expiresIn: '90d' });
}

export function getCustomerIdFromReq(req) {
  const header = req.headers['x-customer-token'];
  if (!header) return null;
  try {
    const payload = jwt.verify(header, SECRET);
    return payload.customerId;
  } catch (e) {
    return null;
  }
}
