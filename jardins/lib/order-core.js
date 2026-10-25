'use strict';
/*
 * Спільна логіка приймання замовлень (Vercel / Netlify).
 * Ціни рахуються тут за js/menu-data.js — дані з браузера, крім id та кількості, не довіряються.
 *
 * Змінні середовища (не зберігаються в клієнтському коді):
 *   TELEGRAM_BOT_TOKEN   токен бота від @BotFather
 *   TELEGRAM_CHAT_ID     id чату/групи, куди надходять замовлення
 *   ORDER_WEBHOOK_URL    (необов'язково) URL CRM або іншого сервісу — отримує POST з JSON замовлення
 *   ORDER_WEBHOOK_TOKEN  (необов'язково) додається як заголовок Authorization: Bearer ...
 *   ALLOWED_ORIGIN       (необов'язково) наприклад https://jardins.example — інші джерела отримають 403
 */
const MENU = require('../js/menu-data.js');

const BY_ID = new Map(MENU.items.map((i) => [i.id, i]));
const hits = new Map(); // ip -> [timestamps]; обмеження працює в межах одного інстансу
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;

function normPhone(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length === 10 && d[0] === '0') d = '38' + d;
  else if (d.length === 9) d = '380' + d;
  else if (!(d.length === 12 && d.startsWith('380'))) return null;
  return '+' + d;
}

function clean(s, max) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F]+/g, ' ').trim().slice(0, max);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function validate(body) {
  const errors = {};
  if (!body || typeof body !== 'object') return { errors: { form: 'Некоректний запит.' } };

  const name = clean(body.name, 60);
  if (name.length < 2) errors.name = 'Вкажіть ім’я (від 2 символів).';

  const phone = normPhone(body.phone);
  if (!phone) errors.phone = 'Вкажіть номер у форматі +380 XX XXX XX XX.';

  const method = body.method === 'pickup' ? 'pickup' : body.method === 'delivery' ? 'delivery' : null;
  if (!method) errors.method = 'Оберіть спосіб отримання.';

  const address = clean(body.address, 200);
  if (method === 'delivery' && address.length < 5) errors.address = 'Вкажіть адресу доставки: вулицю та номер будинку.';

  const comment = clean(body.comment, 500);

  const items = [];
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 40) {
    errors.items = 'Замовлення порожнє.';
  } else {
    const seen = new Set();
    for (const raw of body.items) {
      const item = raw && BY_ID.get(String(raw.id));
      const qty = Number.parseInt(raw && raw.qty, 10);
      let variant = null, price = null;
      if (item && item.variants) {
        variant = item.variants.find((v) => v.id === String(raw.variant));
        price = variant ? variant.price : null;
      } else if (item) {
        price = item.price;
      }
      const key = item ? item.id + '|' + (variant ? variant.id : '') : '';
      if (!item || (item.variants && !variant) || !(qty >= 1 && qty <= 50) || seen.has(key)) {
        errors.items = 'Склад замовлення містить помилку.';
        break;
      }
      seen.add(key);
      items.push({ id: item.id, name: item.name, size: variant ? variant.label : '', qty, price: price == null ? null : price });
    }
  }

  if (Object.keys(errors).length) return { errors };
  return { order: { name, phone, method, address: method === 'delivery' ? address : '', comment, items } };
}

function totals(items) {
  let total = 0, unpriced = 0;
  for (const i of items) {
    if (i.price == null) unpriced += i.qty; else total += i.price * i.qty;
  }
  return { total, unpriced };
}

function newOrderId() {
  return 'J' + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).toUpperCase().slice(2, 4);
}

function buildMessage(order) {
  const t = totals(order.items);
  const lines = order.items.map((i) =>
    '• ' + escapeHtml(i.name) + (i.size ? ', ' + escapeHtml(i.size) : '') + ' × ' + i.qty + ' — ' + (i.price == null ? 'ціна уточнюється' : i.price * i.qty + ' ₴'));
  const sum = t.total + ' ₴' + (t.unpriced ? ' (+ ' + t.unpriced + ' шт. без ціни)' : '');
  const head = [
    '<b>Нове замовлення ' + order.id + '</b>',
    '',
    'Ім’я: ' + escapeHtml(order.name),
    'Телефон: ' + escapeHtml(order.phone),
    order.method === 'delivery' ? 'Доставка: ' + escapeHtml(order.address) : 'Самовивіз'
  ];
  if (order.comment) head.push('Коментар: ' + escapeHtml(order.comment));
  return head.concat(['', lines.join('\n'), '', '<b>Разом: ' + sum + '</b>']).join('\n');
}

async function withTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...options, signal: ctrl.signal }); } finally { clearTimeout(timer); }
}

async function sendTelegram(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return null;
  const res = await withTimeout('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: buildMessage(order), parse_mode: 'HTML', disable_web_page_preview: true })
  }, 8000);
  return res.ok;
}

async function sendWebhook(order) {
  const url = process.env.ORDER_WEBHOOK_URL;
  if (!url) return null;
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.ORDER_WEBHOOK_TOKEN) headers.Authorization = 'Bearer ' + process.env.ORDER_WEBHOOK_TOKEN;
  const t = totals(order.items);
  const res = await withTimeout(url, {
    method: 'POST', headers,
    body: JSON.stringify({ ...order, total: t.total, unpricedItems: t.unpriced, createdAt: new Date().toISOString() })
  }, 8000);
  return res.ok;
}

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((ts) => now - ts < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 2000) for (const [k, v] of hits) if (!v.some((ts) => now - ts < WINDOW_MS)) hits.delete(k);
  return list.length > MAX_HITS;
}

/** @returns {Promise<{status:number, body:object}>} */
async function handleOrder(body, ctx) {
  ctx = ctx || {};
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed && ctx.origin && ctx.origin !== allowed) return { status: 403, body: { ok: false, error: 'forbidden' } };

  if (!process.env.TELEGRAM_BOT_TOKEN && !process.env.ORDER_WEBHOOK_URL) {
    return { status: 503, body: { ok: false, error: 'not_configured' } };
  }

  if (!body || typeof body !== 'object') return { status: 400, body: { ok: false, error: 'bad_request' } };
  if (body.website) return { status: 400, body: { ok: false, error: 'rejected' } };            // honeypot
  if (!(Number(body.elapsed) >= 2500)) return { status: 400, body: { ok: false, error: 'rejected' } }; // надто швидко для людини
  if (rateLimited(ctx.ip || 'unknown')) return { status: 429, body: { ok: false, error: 'rate_limited' } };

  const { errors, order } = validate(body);
  if (errors) return { status: 400, body: { ok: false, error: 'validation', errors } };

  order.id = newOrderId();

  const results = await Promise.allSettled([sendTelegram(order), sendWebhook(order)]);
  const delivered = results.some((r) => r.status === 'fulfilled' && r.value === true);
  if (!delivered) {
    results.forEach((r) => { if (r.status === 'rejected') console.error('order delivery failed:', r.reason && r.reason.message); });
    return { status: 502, body: { ok: false, error: 'delivery_failed' } };
  }
  return { status: 200, body: { ok: true, orderId: order.id } };
}

module.exports = { handleOrder, validate, normPhone, buildMessage, totals };
