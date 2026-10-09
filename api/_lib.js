const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.json(body);
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET || '').update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifyToken(token) {
  if (!token || !process.env.ADMIN_SESSION_SECRET) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const expected = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(parts[0]).digest('base64url');
  if (!safeEqual(parts[1], expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return data.role === 'admin' && Number(data.exp) > Date.now();
  } catch { return false; }
}
function isAdmin(req) {
  const cookies = (req.headers.cookie || '').split(';').reduce((acc, part) => {
    const i = part.indexOf('=');
    if (i > -1) acc[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    return acc;
  }, {});
  return verifyToken(cookies.bakelick_admin);
}
function cookieHeader(value, maxAge) {
  return `bakelick_admin=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}
function clean(value, max = 300) {
  return String(value ?? '').trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, max);
}
function money(n) { return Math.round(Number(n) || 0); }
module.exports = { supabase, json, safeEqual, sign, isAdmin, cookieHeader, clean, money };
