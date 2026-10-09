const { json, safeEqual, sign, cookieHeader } = require('./_lib');
module.exports = async function handler(req, res) {
  if (req.method === 'GET') return json(res, 200, { ok: true, configured: Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET) });
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', cookieHeader('', 0));
    return json(res, 200, { ok: true });
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST, DELETE'); return json(res, 405, { error: 'Method not allowed' }); }
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) return json(res, 500, { error: 'Admin login is not configured. Add ADMIN_PASSWORD and ADMIN_SESSION_SECRET in Vercel.' });
  const password = req.body && req.body.password;
  if (!safeEqual(password, process.env.ADMIN_PASSWORD)) return json(res, 401, { error: 'Incorrect password.' });
  const token = sign({ role: 'admin', exp: Date.now() + 8 * 60 * 60 * 1000 });
  res.setHeader('Set-Cookie', cookieHeader(token, 8 * 60 * 60));
  return json(res, 200, { ok: true });
};
