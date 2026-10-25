(function () {
  'use strict';

  var C = window.JARDINS_CONFIG;
  var M = window.JARDINS_MENU;
  var ART = window.JARDINS_ART;

  var CART_KEY = 'jardins.cart.v2';
  var state = {
    category: 'all',
    cart: {},
    sel: {},
    view: 'cart',
    submitting: false,
    formOpenedAt: 0,
    form: { name: '', phone: '', method: 'delivery', address: '', comment: '' },
    lastFocus: null
  };

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var nf = new Intl.NumberFormat('uk-UA');
  function money(n) { return nf.format(n) + ' ' + C.currency; }
  function icon(n, s) { return ART.icon(n, s); }

  var itemsById = {};
  M.items.forEach(function (i) { itemsById[i.id] = i; });

  /* Позиція кошика = id страви + '|' + id розміру (порожній, якщо розмірів немає). */
  function parseKey(k) { var a = String(k).split('|'); return { id: a[0], vid: a[1] || '' }; }
  function variantOf(item, vid) {
    if (!item.variants) return null;
    for (var i = 0; i < item.variants.length; i++) if (item.variants[i].id === vid) return item.variants[i];
    return null;
  }
  function selVid(item) { return item.variants ? (state.sel[item.id] || item.variants[0].id) : ''; }
  function unitPrice(item, vid) { var v = variantOf(item, vid); return v ? v.price : item.price; }
  function lineName(item, vid) { var v = variantOf(item, vid); return item.name + (v ? ', ' + v.label : ''); }

  /* ---------- map / contact links ---------- */
  function mapQuery() {
    var m = C.maps;
    return (m.lat != null && m.lng != null) ? (m.lat + ',' + m.lng) : m.query;
  }
  var LINKS = (function () {
    var q = encodeURIComponent(mapQuery());
    var place = C.maps.placeUrl || ('https://www.google.com/maps/search/?api=1&query=' + q);
    return {
      tel: 'tel:' + C.phone.tel,
      place: place,
      route: 'https://www.google.com/maps/dir/?api=1&destination=' + q,
      reviews: C.maps.reviewsUrl || place,
      embed: 'https://www.google.com/maps?q=' + q + '&hl=uk&z=16&output=embed'
    };
  })();

  function bindConfig() {
    $$('[data-phone-text]').forEach(function (el) { el.textContent = C.phone.display; });
    $$('[data-tel-link]').forEach(function (el) { el.setAttribute('href', LINKS.tel); });
    $$('[data-map-place]').forEach(function (el) { el.setAttribute('href', LINKS.place); });
    $$('[data-map-route]').forEach(function (el) { el.setAttribute('href', LINKS.route); });
    $$('[data-map-reviews]').forEach(function (el) { el.setAttribute('href', LINKS.reviews); });
    $$('[data-address-short]').forEach(function (el) { el.textContent = C.address.short; });
    $$('[data-address-full]').forEach(function (el) {
      el.textContent = C.address.street + ', ' + C.address.city + ', ' + C.address.region + ', ' + C.address.postal;
    });
    $$('[data-icon]').forEach(function (el) { el.innerHTML = icon(el.getAttribute('data-icon'), +el.getAttribute('data-size') || 20); });
    $$('[data-stars]').forEach(function (el) { el.innerHTML = ART.stars(+el.getAttribute('data-stars'), +el.getAttribute('data-size') || 18); });
    $$('[data-leaf]').forEach(function (el) { el.innerHTML = ART.leaf(); });
    $$('[data-tomato]').forEach(function (el) { el.innerHTML = ART.tomato(); });
    var year = $('#year'); if (year) year.textContent = new Date().getFullYear();

    if (C.deliveryNote) {
      var dn = $('#delivery-note'); dn.textContent = C.deliveryNote; dn.hidden = false;
    }

    var hours = $('#hours');
    if (Array.isArray(C.hours) && C.hours.length) {
      hours.innerHTML = '<dl class="hours">' + C.hours.map(function (h) {
        return '<div><dt>' + esc(h.days) + '</dt><dd>' + esc(h.time) + '</dd></div>';
      }).join('') + '</dl>';
    } else {
      hours.innerHTML = '<p class="muted-light">Графік роботи уточнюйте за телефоном.</p>';
    }

    var labels = { instagram: 'Instagram', facebook: 'Facebook', telegram: 'Telegram', tiktok: 'TikTok' };
    var social = Object.keys(C.social || {}).filter(function (k) { return C.social[k]; });
    if (social.length) {
      var ul = $('#social');
      ul.innerHTML = social.map(function (k) {
        return '<li><a href="' + esc(C.social[k]) + '" target="_blank" rel="noopener">' + (labels[k] || esc(k)) + '</a></li>';
      }).join('');
      ul.hidden = false;
    }

    // hero image / about images (real photos, optional)
    var hero = $('#hero-pizza');
    if (C.images && C.images.hero) {
      hero.innerHTML = '<img src="' + esc(C.images.hero) + '" alt="Піца Jardins" decoding="async">';
      hero.classList.add('is-photo');
    } else {
      hero.innerHTML = ART.art('panska', null);
    }
    var aboutArt = [
      function () { return ART.art('california', null); },
      function () { return ART.tableScene(); },
      function () { return ART.art('hawaiian', null); }
    ];
    $$('[data-about]').forEach(function (el) {
      var i = +el.getAttribute('data-about');
      var src = C.images && C.images.about && C.images.about[i];
      el.innerHTML = src ? '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async">' : aboutArt[i]();
      if (src) el.classList.add('is-photo');
    });

    var anyUnpriced = M.items.some(function (i) {
      return i.variants ? i.variants.some(function (v) { return v.price == null; }) : i.price == null;
    });
    $('#menu-note').hidden = !anyUnpriced;

    if (C.maps.embed) {
      var card = $('#map-card');
      var fr = document.createElement('iframe');
      fr.className = 'map-frame';
      fr.title = 'Jardins на карті Google Maps';
      fr.loading = 'lazy';
      fr.referrerPolicy = 'no-referrer-when-downgrade';
      fr.src = LINKS.embed;
      card.appendChild(fr);
    }
  }

  /* ---------- cart state ---------- */
  function loadCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      var data = raw ? JSON.parse(raw) : {};
      Object.keys(data).forEach(function (key) {
        var k = parseKey(key), it = itemsById[k.id], q = parseInt(data[key], 10);
        var okVariant = it && (it.variants ? !!variantOf(it, k.vid) : k.vid === '');
        if (okVariant && q > 0 && q <= 50) state.cart[key] = q;
      });
    } catch (e) { /* storage unavailable */ }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch (e) { /* ignore */ }
  }
  function cartCount() {
    return Object.keys(state.cart).reduce(function (n, id) { return n + state.cart[id]; }, 0);
  }
  function cartTotals() {
    var total = 0, unpriced = 0;
    Object.keys(state.cart).forEach(function (key) {
      var k = parseKey(key), it = itemsById[k.id], q = state.cart[key], price = unitPrice(it, k.vid);
      if (price == null) unpriced += q; else total += price * q;
    });
    return { total: total, unpriced: unpriced };
  }
  function addToCart(id) {
    state.cart[id] = Math.min(50, (state.cart[id] || 0) + 1);
    afterCartChange();
  }
  function setQty(id, q) {
    if (q <= 0) delete state.cart[id]; else state.cart[id] = Math.min(50, q);
    afterCartChange();
  }
  function afterCartChange() {
    saveCart();
    syncBadges();
    if (isDrawerOpen() && state.view === 'cart') renderCartView();
    if (isDrawerOpen() && state.view === 'form' && !cartCount()) renderCartView();
  }

  function syncBadges() {
    var n = cartCount(), t = cartTotals();
    var cc = $('#cart-count');
    cc.textContent = n; cc.hidden = n === 0;
    var fab = $('#cart-fab');
    fab.hidden = n === 0;
    $('#fab-count').textContent = n;
    $('#fab-total').textContent = totalLabel(t, true);
    $$('[data-qty-for]').forEach(function (el) {
      var id = el.getAttribute('data-qty-for'), q = 0;
      Object.keys(state.cart).forEach(function (key) { if (parseKey(key).id === id) q += state.cart[key]; });
      el.hidden = q === 0;
      el.textContent = q ? 'У замовленні: ' + q : '';
    });
    document.body.classList.toggle('has-fab', n > 0);
  }
  function totalLabel(t, short) {
    if (t.total === 0 && t.unpriced > 0) return short ? 'Ціну уточнюйте' : 'Ціну уточнимо';
    return money(t.total) + (t.unpriced ? ' +' : '');
  }

  /* ---------- rendering: menu ---------- */
  function artHtml(item, labelled) {
    if (item.image) {
      return '<img src="' + esc(item.image) + '" alt="' + esc(item.name) + '" loading="lazy" decoding="async">';
    }
    return ART.art(item.art, labelled ? 'Демонстраційна ілюстрація: ' + item.name : null);
  }
  function priceInner(item) {
    var p = unitPrice(item, selVid(item));
    return p == null ? 'Ціну уточнюйте' : money(p);
  }
  function priceHtml(item) {
    var tbd = unitPrice(item, selVid(item)) == null;
    return '<span class="price' + (tbd ? ' is-tbd' : '') + '" data-price-for="' + esc(item.id) + '">' + priceInner(item) + '</span>';
  }
  function sizesHtml(item) {
    if (!item.variants) return '';
    var cur = selVid(item);
    return '<div class="sizes" role="group" aria-label="Розмір: ' + esc(item.name) + '">' + item.variants.map(function (v) {
      return '<button class="size-btn" type="button" data-size-item="' + esc(item.id) + '" data-size="' + esc(v.id) + '" aria-pressed="' + (v.id === cur) + '">' + esc(v.label) + '</button>';
    }).join('') + '</div>';
  }
  function selectSize(id, vid) {
    state.sel[id] = vid;
    var item = itemsById[id];
    $$('[data-size-item="' + id + '"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-size') === vid)); });
    $$('[data-price-for="' + id + '"]').forEach(function (el) {
      el.textContent = priceInner(item);
      el.classList.toggle('is-tbd', unitPrice(item, vid) == null);
    });
  }
  function cardHtml(item) {
    var meta = [item.weight, item.size].filter(Boolean).join(' · ');
    var desc = item.description
      ? '<p class="card-desc">' + esc(item.description) + '</p>'
      : '<p class="card-desc is-empty">Склад уточнюйте у закладі</p>';
    return '<article class="card reveal">' +
      '<div class="card-art' + (item.image ? ' has-photo' : '') + '">' + artHtml(item, true) +
      '<span class="qty-chip" data-qty-for="' + esc(item.id) + '" hidden></span></div>' +
      '<div class="card-body"><h3>' + esc(item.name) + '</h3>' + desc +
      (meta ? '<p class="card-meta">' + esc(meta) + '</p>' : '') +
      sizesHtml(item) +
      '<div class="card-foot">' + priceHtml(item) +
      '<button class="btn btn-primary btn-sm btn-add" type="button" data-add="' + esc(item.id) + '"><span class="label">Додати до замовлення</span></button>' +
      '</div></div></article>';
  }
  function renderFilters() {
    if (M.categories.length < 2) { $('#menu-filters').hidden = true; return; }
    var cats = [{ id: 'all', name: 'Усе' }].concat(M.categories);
    $('#menu-filters').innerHTML = cats.map(function (c) {
      return '<button class="chip" type="button" data-cat="' + esc(c.id) + '" aria-pressed="' + (c.id === state.category) + '">' + esc(c.name) + '</button>';
    }).join('');
  }
  function renderMenu() {
    var list = M.items.filter(function (i) { return state.category === 'all' || i.category === state.category; });
    $('#menu-grid').innerHTML = list.map(cardHtml).join('');
    syncBadges();
    observeReveals();
  }
  function renderFavorites() {
    var favs = M.items.filter(function (i) { return i.featured; });
    $('#fav-grid').innerHTML = favs.map(function (item) {
      return '<article class="fav reveal">' +
        '<div class="fav-art' + (item.image ? ' has-photo' : '') + '">' + artHtml(item, true) + '</div>' +
        '<h3>' + esc(item.name) + '</h3>' +
        (item.tagline ? '<p class="fav-tag">' + esc(item.tagline) + '</p>' : '') +
        sizesHtml(item) +
        '<div class="fav-foot">' + priceHtml(item) +
        '<button class="btn btn-primary btn-add" type="button" data-add="' + esc(item.id) + '"><span class="label">Додати до замовлення</span></button></div>' +
        '</article>';
    }).join('');
    observeReveals();
  }

  /* ---------- reveal on scroll ---------- */
  var io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 })
    : null;
  function observeReveals() {
    $$('.reveal:not(.in)').forEach(function (el) {
      if (io) io.observe(el); else el.classList.add('in');
    });
  }

  /* ---------- drawer ---------- */
  function isDrawerOpen() { return $('#cart-drawer').getAttribute('aria-hidden') === 'false'; }
  function openDrawer(view) {
    state.lastFocus = document.activeElement;
    var d = $('#cart-drawer');
    d.setAttribute('aria-hidden', 'false');
    $('#overlay').hidden = false;
    document.documentElement.classList.add('lock');
    requestAnimationFrame(function () { d.classList.add('open'); $('#overlay').classList.add('open'); });
    if (view === 'form' && cartCount()) renderFormView(); else renderCartView();
    setTimeout(function () { $('#close-cart').focus(); }, 30);
  }
  function closeDrawer() {
    var d = $('#cart-drawer');
    d.classList.remove('open'); $('#overlay').classList.remove('open');
    d.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('lock');
    setTimeout(function () { if (!isDrawerOpen()) $('#overlay').hidden = true; }, 260);
    if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
  }

  function cartLineHtml(key) {
    var k = parseKey(key), it = itemsById[k.id], q = state.cart[key], price = unitPrice(it, k.vid);
    var unit = price == null ? 'Ціну уточнюйте' : money(price);
    var sum = price == null ? '' : money(price * q);
    var title = lineName(it, k.vid);
    return '<li class="cart-line" data-key="' + esc(key) + '">' +
      '<div class="cart-thumb' + (it.image ? ' has-photo' : '') + '">' + artHtml(it, false) + '</div>' +
      '<div class="cart-info"><p class="cart-name">' + esc(title) + '</p><p class="cart-unit">' + unit + '</p>' +
      '<div class="stepper" role="group" aria-label="Кількість: ' + esc(title) + '">' +
      '<button type="button" data-dec="' + esc(key) + '" aria-label="Зменшити кількість">' + icon('minus', 18) + '</button>' +
      '<output aria-live="polite">' + q + '</output>' +
      '<button type="button" data-inc="' + esc(key) + '" aria-label="Збільшити кількість">' + icon('plus', 18) + '</button></div></div>' +
      '<div class="cart-side"><span class="cart-sum">' + sum + '</span>' +
      '<button class="icon-btn" type="button" data-remove="' + esc(key) + '" aria-label="Видалити: ' + esc(title) + '">' + icon('trash', 20) + '</button></div></li>';
  }
  function totalBlock() {
    var t = cartTotals();
    var note = t.unpriced
      ? '<p class="total-note">' + (t.total === 0
          ? 'Ціни позицій уточнюються — підсумок підтвердимо під час замовлення.'
          : 'До суми не входять позиції з уточненою ціною (' + t.unpriced + ' шт.).') + '</p>'
      : '';
    return '<div class="total"><span>Разом</span><strong>' + (t.total === 0 && t.unpriced ? '—' : money(t.total)) + '</strong></div>' + note;
  }
  function renderCartView() {
    state.view = 'cart';
    $('#drawer-title').textContent = 'Ваше замовлення';
    var body = $('#drawer-body');
    var ids = Object.keys(state.cart);
    if (!ids.length) {
      body.innerHTML = '<div class="empty"><div class="empty-art">' + ART.art('panska', null) + '</div>' +
        '<h3>Замовлення поки порожнє</h3>' +
        '<p>Додайте страви з меню або зателефонуйте нам — ми допоможемо обрати.</p>' +
        '<div class="empty-actions"><button class="btn btn-primary" type="button" data-action="open-menu">Перейти до меню</button>' +
        '<a class="btn btn-ghost" href="' + LINKS.tel + '">' + icon('phone', 20) + 'Зателефонувати</a></div></div>';
      return;
    }
    body.innerHTML = '<ul class="cart-list">' + ids.map(cartLineHtml).join('') + '</ul>' +
      '<div class="cart-foot">' + totalBlock() +
      '<button class="btn btn-primary btn-block" type="button" data-action="checkout">Оформити замовлення</button>' +
      '<a class="call-link" href="' + LINKS.tel + '">' + icon('phone', 18) + 'Або замовте телефоном: ' + esc(C.phone.display) + '</a></div>';
  }

  /* ---------- order form ---------- */
  function renderFormView() {
    state.view = 'form';
    state.formOpenedAt = Date.now();
    $('#drawer-title').textContent = 'Оформлення';
    var f = state.form, demo = !C.orderEndpoint;
    var summary = Object.keys(state.cart).map(function (key) {
      var k = parseKey(key), it = itemsById[k.id], q = state.cart[key], price = unitPrice(it, k.vid);
      return '<li><span>' + esc(lineName(it, k.vid)) + ' × ' + q + '</span><span>' + (price == null ? 'ціна уточнюється' : money(price * q)) + '</span></li>';
    }).join('');
    $('#drawer-body').innerHTML =
      '<form class="order-form" id="order-form" novalidate>' +
      '<button class="back" type="button" data-action="back-cart">' + icon('back', 18) + 'Назад до замовлення</button>' +
      (demo ? '<div class="banner banner-demo" role="status">' + icon('info', 20) + '<p><strong>Демо-режим.</strong> Відправку замовлень ще не підключено: форма перевіряє дані, але замовлення не надсилається.</p></div>' : '') +
      field('name', 'Ім’я', '<input id="f-name" name="name" type="text" autocomplete="name" maxlength="60" required value="' + esc(f.name) + '" aria-describedby="e-name">') +
      field('phone', 'Телефон', '<input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="+380 __ ___ __ __" required value="' + esc(f.phone) + '" aria-describedby="e-phone">') +
      '<fieldset class="field methods"><legend>Як отримати замовлення</legend>' +
      '<label class="radio"><input type="radio" name="method" value="delivery"' + (f.method === 'delivery' ? ' checked' : '') + '><span>Доставка</span></label>' +
      '<label class="radio"><input type="radio" name="method" value="pickup"' + (f.method === 'pickup' ? ' checked' : '') + '><span>Самовивіз</span></label></fieldset>' +
      '<div id="address-wrap">' + field('address', 'Адреса доставки', '<input id="f-address" name="address" type="text" autocomplete="street-address" maxlength="200" placeholder="Вулиця, будинок, під’їзд, поверх, квартира" value="' + esc(f.address) + '" aria-describedby="e-address">') + '</div>' +
      '<p class="pickup-info" id="pickup-info" hidden>' + icon('pin', 18) + '<span>Самовивіз: ' + esc(C.address.short) + '</span></p>' +
      '<div class="field"><label for="f-comment">Коментар <span class="opt">(необов’язково)</span></label>' +
      '<textarea id="f-comment" name="comment" rows="3" maxlength="500">' + esc(f.comment) + '</textarea></div>' +
      '<div class="hp" aria-hidden="true"><label>Не заповнюйте це поле<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="summary"><h3>Ваше замовлення</h3><ul>' + summary + '</ul>' + totalBlock() + '</div>' +
      '<p class="form-error" id="form-error" role="alert" hidden></p>' +
      '<button class="btn btn-primary btn-block" type="submit" id="submit-btn"><span class="spinner" hidden></span><span class="label">Надіслати замовлення</span></button>' +
      '</form>';
    applyMethod();
  }
  function field(key, label, control) {
    return '<div class="field"><label for="f-' + key + '">' + label + '</label>' + control + '<p class="field-error" id="e-' + key + '" hidden></p></div>';
  }
  function applyMethod() {
    var delivery = state.form.method === 'delivery';
    $('#address-wrap').hidden = !delivery;
    $('#pickup-info').hidden = delivery;
  }
  function setFieldError(key, msg) {
    var err = $('#e-' + key), input = $('#f-' + key);
    if (!err || !input) return;
    err.textContent = msg || ''; err.hidden = !msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function normPhone(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length === 10 && d.charAt(0) === '0') d = '38' + d;
    else if (d.length === 9) d = '380' + d;
    else if (!(d.length === 12 && d.indexOf('380') === 0)) return null;
    return '+' + d;
  }
  function prettyPhone(p) {
    return p.replace(/^\+380(\d{2})(\d{3})(\d{2})(\d{2})$/, '+380 $1 $2 $3 $4');
  }
  function validateForm() {
    var f = state.form, ok = true, firstBad = null;
    function bad(key, msg) { setFieldError(key, msg); ok = false; if (!firstBad) firstBad = key; }
    var name = f.name.trim();
    if (name.length < 2 || name.length > 60) bad('name', 'Вкажіть ім’я (від 2 символів).'); else setFieldError('name', '');
    if (!normPhone(f.phone)) bad('phone', 'Вкажіть номер у форматі +380 XX XXX XX XX.'); else setFieldError('phone', '');
    if (f.method === 'delivery') {
      var a = f.address.trim();
      if (a.length < 5) bad('address', 'Вкажіть адресу доставки: вулицю та номер будинку.'); else setFieldError('address', '');
    }
    if (firstBad) { var el = $('#f-' + firstBad); if (el) el.focus(); }
    return ok;
  }

  function showFormError(msg) {
    var el = $('#form-error');
    if (!el) return;
    el.innerHTML = esc(msg) + ' <a href="' + LINKS.tel + '">Зателефонувати: ' + esc(C.phone.display) + '</a>';
    el.hidden = false;
  }
  function setSubmitting(on) {
    state.submitting = on;
    var b = $('#submit-btn');
    if (!b) return;
    b.disabled = on;
    b.setAttribute('aria-busy', on ? 'true' : 'false');
    $('.spinner', b).hidden = !on;
    $('.label', b).textContent = on ? 'Надсилаємо…' : 'Надіслати замовлення';
  }

  function submitOrder(e) {
    e.preventDefault();
    if (state.submitting) return;
    var fe = $('#form-error'); if (fe) fe.hidden = true;
    if (!validateForm()) return;
    var f = state.form;
    var hp = ($('#order-form input[name="website"]') || {}).value || '';
    var payload = {
      name: f.name.trim(),
      phone: normPhone(f.phone),
      method: f.method,
      address: f.method === 'delivery' ? f.address.trim() : '',
      comment: f.comment.trim(),
      items: Object.keys(state.cart).map(function (key) {
        var k = parseKey(key);
        return { id: k.id, variant: k.vid, qty: state.cart[key] };
      }),
      website: hp,
      elapsed: Date.now() - state.formOpenedAt
    };

    if (!C.orderEndpoint) { renderResult('demo'); return; }

    setSubmitting(true);
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    fetch(C.orderEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) { return { res: res, data: data }; });
    }).then(function (r) {
      clearTimeout(timer);
      var data = r.data || {};
      if (r.res.ok && data.ok === true) {
        state.cart = {}; saveCart(); syncBadges();
        state.form.comment = '';
        renderResult('success', { orderId: data.orderId, phone: payload.phone });
      } else if (r.res.status === 503 && data.error === 'not_configured') {
        setSubmitting(false);
        renderResult('demo');
      } else if (r.res.status === 400 && data.errors) {
        setSubmitting(false);
        Object.keys(data.errors).forEach(function (k) { setFieldError(k, data.errors[k]); });
        showFormError('Перевірте дані форми.');
      } else if (r.res.status === 429) {
        setSubmitting(false);
        showFormError('Забагато спроб. Зачекайте кілька хвилин або зателефонуйте нам.');
      } else {
        setSubmitting(false);
        showFormError('Не вдалося надіслати замовлення. Спробуйте ще раз.');
      }
    }).catch(function () {
      clearTimeout(timer);
      setSubmitting(false);
      showFormError('Немає зв’язку з сервером. Перевірте інтернет і спробуйте ще раз.');
    });
  }

  function renderResult(kind, data) {
    state.view = 'result';
    $('#drawer-title').textContent = kind === 'success' ? 'Замовлення надіслано' : 'Замовлення не надіслано';
    var html;
    if (kind === 'success') {
      html = '<div class="result result-ok"><div class="result-icon">' + icon('check', 34) + '</div>' +
        '<h3>Дякуємо за замовлення!</h3>' +
        '<p>' + (data && data.orderId ? 'Номер замовлення: <strong>' + esc(data.orderId) + '</strong>. ' : '') +
        'Ми отримали його й зв’яжемося з вами за номером <strong>' + esc(prettyPhone(data.phone)) + '</strong>.</p>' +
        '<button class="btn btn-primary" type="button" data-action="close">Закрити</button></div>';
    } else {
      html = '<div class="result result-demo"><div class="result-icon">' + icon('info', 34) + '</div>' +
        '<h3>Демо-режим: замовлення не надіслано</h3>' +
        '<p>Онлайн-приймання замовлень ще не підключено, тому дані нікуди не передані. Ваш вибір збережено в замовленні. Щоб оформити його, зателефонуйте нам.</p>' +
        '<a class="btn btn-primary" href="' + LINKS.tel + '">' + icon('phone', 20) + esc(C.phone.display) + '</a>' +
        '<button class="btn btn-ghost" type="button" data-action="back-form">Повернутися до форми</button></div>';
    }
    $('#drawer-body').innerHTML = html;
    $('#drawer-body').scrollTop = 0;
  }

  /* ---------- navigation helpers ---------- */
  function scrollToId(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function setCategory(cat) {
    state.category = cat;
    $$('#menu-filters .chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cat') === cat)); });
    renderMenu();
  }
  function closeNav() {
    $('.site-header').classList.remove('nav-open');
    $('#nav-toggle').setAttribute('aria-expanded', 'false');
  }

  /* ---------- events ---------- */
  var addTimers = {};
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, a, [data-cat]');
    if (!t) return;

    var addId = t.getAttribute('data-add');
    if (t.hasAttribute('data-size-item')) { selectSize(t.getAttribute('data-size-item'), t.getAttribute('data-size')); return; }
    if (addId) {
      addToCart(addId + '|' + selVid(itemsById[addId]));
      var lab = $('.label', t);
      t.classList.add('is-added'); if (lab) lab.textContent = 'Додано';
      clearTimeout(addTimers[t.dataset.add + (t.closest('.fav') ? 'f' : 'c')]);
      addTimers[t.dataset.add + (t.closest('.fav') ? 'f' : 'c')] = setTimeout(function () {
        t.classList.remove('is-added'); if (lab) lab.textContent = 'Додати до замовлення';
      }, 1200);
      return;
    }
    if (t.hasAttribute('data-cat')) { setCategory(t.getAttribute('data-cat')); return; }

    var inc = t.getAttribute('data-inc'), dec = t.getAttribute('data-dec'), rm = t.getAttribute('data-remove');
    if (inc) { setQty(inc, (state.cart[inc] || 0) + 1); return; }
    if (dec) { setQty(dec, (state.cart[dec] || 0) - 1); return; }
    if (rm) { setQty(rm, 0); return; }

    var action = t.getAttribute('data-action');
    if (action === 'open-cart') { closeNav(); openDrawer(); }
    else if (action === 'order-pizza') { setCategory('pizza'); scrollToId('menu'); }
    else if (action === 'open-menu') { if (isDrawerOpen()) closeDrawer(); setCategory('all'); scrollToId('menu'); }
    else if (action === 'checkout') { renderFormView(); $('#drawer-body').scrollTop = 0; }
    else if (action === 'back-cart') { renderCartView(); }
    else if (action === 'back-form') { renderFormView(); }
    else if (action === 'close') { closeDrawer(); }
    else if (t.id === 'open-cart' || t.id === 'cart-fab') { openDrawer(); }
    else if (t.id === 'close-cart') { closeDrawer(); }
    else if (t.id === 'nav-toggle') {
      var open = !$('.site-header').classList.contains('nav-open');
      $('.site-header').classList.toggle('nav-open', open);
      t.setAttribute('aria-expanded', String(open));
    } else if (t.closest('#site-nav')) { closeNav(); }
  });

  $('#overlay').addEventListener('click', closeDrawer);

  document.addEventListener('input', function (e) {
    var el = e.target;
    if (!el.form || el.form.id !== 'order-form') return;
    if (el.name in state.form) state.form[el.name] = el.value;
    if (el.name === 'method') { state.form.method = el.value; applyMethod(); }
    if (el.getAttribute('aria-invalid') === 'true') setFieldError(el.name, '');
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.name === 'method' && el.form && el.form.id === 'order-form') { state.form.method = el.value; applyMethod(); }
    if (el.id === 'f-phone') {
      var p = normPhone(el.value);
      if (p) { el.value = prettyPhone(p); state.form.phone = el.value; }
    }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.id === 'order-form') submitOrder(e);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (isDrawerOpen()) closeDrawer(); else closeNav();
      return;
    }
    if (e.key === 'Tab' && isDrawerOpen()) {
      var nodes = $$('#cart-drawer button:not([disabled]), #cart-drawer a[href], #cart-drawer input:not([tabindex="-1"]):not([type="hidden"]), #cart-drawer textarea')
        .filter(function (n) { return n.offsetParent !== null; });
      if (!nodes.length) return;
      var first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!$('#cart-drawer').contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });

  var header = $('.site-header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- init ---------- */
  document.documentElement.classList.add('js');
  loadCart();
  bindConfig();
  renderFilters();
  renderMenu();
  renderFavorites();
  syncBadges();
  observeReveals();
  onScroll();
})();
