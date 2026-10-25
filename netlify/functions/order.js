'use strict';
// Netlify Function: /.netlify/functions/order (у netlify.toml доступна також як /api/order)
const { handleOrder } = require('../../lib/order-core');

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { ...headers, Allow: 'POST' }, body: JSON.stringify({ ok: false, error: 'method_not_allowed' }) };
  }
  let body = null;
  try { body = JSON.parse(event.body || 'null'); } catch (e) { body = null; }
  const h = event.headers || {};
  const ip = h['x-nf-client-connection-ip'] || String(h['x-forwarded-for'] || '').split(',')[0].trim();
  const out = await handleOrder(body, { ip, origin: h.origin });
  return { statusCode: out.status, headers, body: JSON.stringify(out.body) };
};
