export function checkAdmin(req) {
  const provided = req.headers['x-admin-password'];
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && provided === expected;
}
