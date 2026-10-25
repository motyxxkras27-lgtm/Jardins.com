/*
 * Jardins — демонстраційні ілюстрації та іконки (SVG, без зовнішніх файлів).
 * Це заміна фотографій: щоб показати реальне фото страви, вкажіть image в js/menu-data.js.
 */
(function () {
  'use strict';

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function f(n) { return Math.round(n * 10) / 10; }
  function circ(cx, cy, r, fill, op, stroke, sw) {
    return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + fill + '"' +
      (op != null && op !== 1 ? ' fill-opacity="' + op + '"' : '') +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || 1) + '"' : '') + '/>';
  }
  function ell(cx, cy, rx, ry, rot, fill, op) {
    return '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(rx) + '" ry="' + f(ry) +
      '" transform="rotate(' + f(rot) + ' ' + f(cx) + ' ' + f(cy) + ')" fill="' + fill + '"' +
      (op != null ? ' fill-opacity="' + op + '"' : '') + '/>';
  }
  function rect(cx, cy, w, h, rot, fill, rx) {
    return '<rect x="' + f(cx - w / 2) + '" y="' + f(cy - h / 2) + '" width="' + f(w) + '" height="' + f(h) +
      '" rx="' + (rx || 1.5) + '" transform="rotate(' + f(rot) + ' ' + f(cx) + ' ' + f(cy) + ')" fill="' + fill + '"/>';
  }
  function inDisc(rand, R) {
    var a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * R;
    return [100 + Math.cos(a) * d, 100 + Math.sin(a) * d];
  }
  function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }
  function between(rand, a, b) { return a + rand() * (b - a); }

  var SEEDS = {
    'four-cheese': 11, california: 23, hawaiian: 37, caesar: 41, panska: 53,
    'caesar-salad': 61, 'meat-board': 71, 'veg-board': 83
  };

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* Начинки: по одному елементу на виклик (r — генератор, p — точка). */
  var T = {
    pepperoni: function (r, p) { return circ(p[0], p[1], 9, '#B3382B') + circ(p[0] - 3, p[1] - 2, 1.3, '#7E2219') + circ(p[0] + 3, p[1] + 2, 1.3, '#7E2219'); },
    salami: function (r, p) { return circ(p[0], p[1], 9.5, '#B3382B') + circ(p[0] - 3, p[1] - 2, 1.3, '#7E2219') + circ(p[0] + 3, p[1] + 2, 1.3, '#7E2219') + circ(p[0] + 2, p[1] - 4, 1.3, '#7E2219'); },
    sausage: function (r, p) { return circ(p[0], p[1], 7.5, '#8A3B24') + circ(p[0], p[1], 5, '#A94E30'); },
    bacon: function (r, p) { var a = r() * 180; return rect(p[0], p[1], 20, 5, a, '#C9574F') + rect(p[0], p[1], 20, 2, a, '#F0C9BF'); },
    ham: function (r, p) { return ell(p[0], p[1], 9, 6, r() * 180, '#D98B7E') + ell(p[0] - 1, p[1] - 1, 4.5, 2.4, r() * 180, '#F3CFC6', 0.8); },
    balyk: function (r, p) { return ell(p[0], p[1], 10, 5, r() * 180, '#B86F5E') + ell(p[0], p[1], 5, 1.8, r() * 180, '#E8B7A6', 0.8); },
    chicken: function (r, p) { return rect(p[0], p[1], 10, 8, r() * 90, '#F1DDB5', 3) + rect(p[0] - 1, p[1] - 1, 5, 3, r() * 90, '#FFF4DC', 1.5); },
    pineapple: function (r, p) { return rect(p[0], p[1], 11, 11, r() * 90, '#F4CB4B', 2); },
    tomato: function (r, p) { return circ(p[0], p[1], 8, '#D9422E') + circ(p[0], p[1], 4.6, '#EE7A63', 0.8); },
    basil: function (r, p) { return ell(p[0], p[1], 8, 4, r() * 180, '#3F7A4F') + ell(p[0], p[1], 5, 0.8, 0, '#17382B', 0.35); },
    olive: function (r, p) { return circ(p[0], p[1], 4.5, '#3E3A2B') + circ(p[0], p[1], 1.8, '#F1D17F'); },
    feta: function (r, p) { return rect(p[0], p[1], 9, 9, r() * 90, '#FBF8EE', 1.5); },
    herbs: function (r, p) { return ell(p[0], p[1], 3.2, 1.2, r() * 180, '#4F7F3D'); },
    pickle: function (r, p) { return circ(p[0], p[1], 5.5, '#8DB35F') + circ(p[0], p[1], 3, '#C5DB98'); },
    onion: function (r, p) { return circ(p[0], p[1], 6, 'none', 1, '#E6D0EA', 2.2); },
    mushroom: function (r, p) { return ell(p[0], p[1], 8.5, 6, r() * 180, '#E9D8B6') + ell(p[0], p[1] + 2, 6, 3, 0, '#CDB68C', 0.8); },
    corn: function (r, p) { return circ(p[0], p[1], 2.4, '#F6CE3C'); },
    pepper: function (r, p) { return rect(p[0], p[1], 20, 5, r() * 180, r() < 0.5 ? '#D8452D' : '#F0A93A'); },
    arugula: function (r, p) { return ell(p[0], p[1], 9, 2.6, r() * 180, '#4E8B3F'); },
    parmesan: function (r, p) { return ell(p[0], p[1], 6, 2, r() * 180, '#FFF7E0'); },
    brie: function (r, p) { return rect(p[0], p[1], 9, 6, r() * 90, '#FBF1CE', 2); },
    blue: function (r, p) { return ell(p[0], p[1], 5, 2.4, r() * 180, '#8FA6C0', 0.85); },
    blackpepper: function (r, p) { return circ(p[0], p[1], 0.9, '#2B2B2B'); }
  };

  /* Склад ілюстрацій відповідає складу з меню. sauce: white | hot | (червоний за замовчуванням) */
  var RECIPES = {
    selyanska: { top: [['bacon', 8], ['onion', 9]] },
    egerska: { top: [['sausage', 9]] },
    margherita: { top: [['tomato', 7], ['basil', 8]] },
    pepperoni: { top: [['pepperoni', 12]] },
    greek: { top: [['tomato', 5], ['feta', 9], ['olive', 10], ['herbs', 14]] },
    kozatska: { top: [['sausage', 8], ['pickle', 8], ['onion', 8]] },
    panska: { top: [['salami', 7], ['bacon', 6], ['balyk', 5], ['sausage', 6]] },
    hawaiian: { sauce: 'white', top: [['chicken', 9], ['pineapple', 10]] },
    bbq: { top: [['pepperoni', 7], ['sausage', 7]], bbq: true },
    julien: { sauce: 'white', top: [['chicken', 8], ['mushroom', 10]] },
    mexican: { sauce: 'hot', top: [['chicken', 7], ['bacon', 6], ['tomato', 4], ['onion', 7], ['corn', 16]] },
    light: { top: [['chicken', 7], ['mushroom', 7], ['tomato', 4], ['onion', 7], ['herbs', 14]] },
    carbonara: { sauce: 'white', top: [['balyk', 6], ['bacon', 7], ['parmesan', 10], ['blackpepper', 18]] },
    california: { top: [['chicken', 7], ['tomato', 4], ['pepper', 7], ['mushroom', 6], ['olive', 8], ['onion', 6]] },
    'chicken-cheese': { sauce: 'white', top: [['chicken', 9], ['brie', 5], ['blue', 6], ['corn', 14]] },
    caesar: { sauce: 'white', top: [['chicken', 8], ['tomato', 4], ['arugula', 12], ['parmesan', 9]] }
  };

  function pizzaBody(kind) {
    var r = rng(hash(kind)), s = '', i, p, rec = RECIPES[kind];
    s += circ(103, 107, 90, '#000000', 0.16);
    s += circ(100, 100, 90, '#D9A24E', 1, '#B9772F', 2);
    for (i = 0; i < 18; i++) {
      var a = r() * Math.PI * 2, d = between(r, 80, 87);
      s += ell(100 + Math.cos(a) * d, 100 + Math.sin(a) * d, between(r, 3, 7), between(r, 1.5, 3), a * 57.3, pick(r, ['#F0C27A', '#A9631E']), 0.5);
    }
    s += circ(100, 100, 77, rec && rec.sauce === 'white' ? '#EBDDB8' : rec && rec.sauce === 'hot' ? '#A8321F' : '#BF4229');

    if (kind === 'four-cheese') {
      var cols = ['#F6E7B5', '#EFCB6B', '#E9B04A', '#F3DEA2'];
      for (i = 0; i < 4; i++) {
        var a0 = (i * 90 - 90) * Math.PI / 180, a1 = ((i + 1) * 90 - 90) * Math.PI / 180;
        s += '<path d="M100 100 L' + f(100 + 74 * Math.cos(a0)) + ' ' + f(100 + 74 * Math.sin(a0)) +
          ' A74 74 0 0 1 ' + f(100 + 74 * Math.cos(a1)) + ' ' + f(100 + 74 * Math.sin(a1)) + ' Z" fill="' + cols[i] + '"/>';
      }
      for (i = 0; i < 9; i++) {
        var ang = between(r, 8, 82) * Math.PI / 180, dd = between(r, 16, 60);
        s += ell(100 + Math.cos(ang) * dd, 100 + Math.sin(ang) * dd, between(r, 3, 6), between(r, 1.5, 3), r() * 180, '#8FA6C0', 0.75);
      }
      for (i = 0; i < 10; i++) {
        p = inDisc(r, 62);
        s += circ(p[0], p[1], between(r, 2, 5), '#D79A3B', 0.5);
      }
    } else {
      s += circ(100, 100, 73, '#F1D17F');
      for (i = 0; i < 16; i++) { p = inDisc(r, 62); s += circ(p[0], p[1], between(r, 5, 12), '#F9E7AE', 0.8); }
      for (i = 0; i < 8; i++) { p = inDisc(r, 64); s += circ(p[0], p[1], between(r, 2, 5), '#D79A3B', 0.55); }
    }

    if (rec) {
      rec.top.forEach(function (t) {
        var fn = T[t[0]], reach = (t[0] === 'corn' || t[0] === 'herbs' || t[0] === 'blackpepper') ? 63 : 57, n;
        for (n = 0; n < t[1]; n++) { s += fn(r, inDisc(r, reach)); }
      });
      if (rec.bbq) {
        s += '<path d="M48 92 Q68 70 88 92 T128 88 T156 108" fill="none" stroke="#5A2A12" stroke-opacity=".75" stroke-width="3.2" stroke-linecap="round"/>' +
          '<path d="M60 124 Q80 106 100 126 T140 122" fill="none" stroke="#5A2A12" stroke-opacity=".75" stroke-width="3.2" stroke-linecap="round"/>';
      }
    }

    for (i = 0; i < 6; i++) {
      var la = (i * 60 + 15) * Math.PI / 180;
      s += '<line x1="100" y1="100" x2="' + f(100 + 74 * Math.cos(la)) + '" y2="' + f(100 + 74 * Math.sin(la)) + '" stroke="#8A4B16" stroke-opacity=".32" stroke-width="1.2"/>';
    }
    return s;
  }

  function plateBase() {
    return circ(103, 107, 92, '#000000', 0.14) +
      circ(100, 100, 92, '#FFFFFF', 1, '#E6DCC6', 2) +
      circ(100, 100, 72, '#FBF7EC', 1, '#EEE4CF', 1.5);
  }

  function plateBody(kind) {
    var r = rng(SEEDS[kind] || 9), s = plateBase(), i, k, p;
    if (kind === 'caesar-salad') {
      for (i = 0; i < 30; i++) {
        p = inDisc(r, 56);
        s += ell(p[0], p[1], between(r, 13, 22), between(r, 6, 9), r() * 180, pick(r, ['#5E8E4A', '#79A557', '#9CC06C', '#4C7A3B']));
      }
      for (i = 0; i < 9; i++) { p = inDisc(r, 52); s += rect(p[0], p[1], 9, 9, r() * 90, '#CF9650', 2); }
      for (i = 0; i < 12; i++) { p = inDisc(r, 56); s += ell(p[0], p[1], 7, 2.2, r() * 180, '#FFF8E4', 0.95); }
    } else if (kind === 'meat-board') {
      var rings = [[54, 13], [34, 9]];
      rings.forEach(function (ring) {
        for (k = 0; k < ring[1]; k++) {
          var a = (k / ring[1]) * Math.PI * 2, cx = 100 + Math.cos(a) * ring[0], cy = 100 + Math.sin(a) * ring[0];
          s += ell(cx, cy, 15, 9.5, a * 57.3 + 90, pick(r, ['#D87068', '#C9574F', '#E08C83'])) +
            ell(cx, cy, 6, 3.5, a * 57.3 + 90, '#F6D9D3', 0.8);
        }
      });
      s += circ(100, 100, 13, '#B94A43') + circ(100, 100, 7, '#D87068') + circ(100, 100, 2.6, '#F6D9D3');
      for (i = 0; i < 5; i++) { var ga = (i / 5) * Math.PI * 2 + 0.4; s += ell(100 + Math.cos(ga) * 68, 100 + Math.sin(ga) * 68, 7, 3, ga * 57.3, '#5F8F47'); }
    } else if (kind === 'veg-board') {
      for (k = 0; k < 7; k++) {
        var ca = (-170 + k * 22) * Math.PI / 180, cx2 = 100 + Math.cos(ca) * 50, cy2 = 100 + Math.sin(ca) * 50;
        s += circ(cx2, cy2, 10, '#B7D48A', 1, '#6F9B47', 1.5) + circ(cx2, cy2, 5.5, '#DCEBC0') + circ(cx2, cy2, 1.4, '#8DB35F');
      }
      for (k = 0; k < 6; k++) {
        var ta = (10 + k * 24) * Math.PI / 180, tx = 100 + Math.cos(ta) * 48, ty = 100 + Math.sin(ta) * 48;
        s += ell(tx, ty, 13, 7, ta * 57.3 + 90, '#D9422E') + ell(tx, ty, 7, 3, ta * 57.3 + 90, '#EE7A63', 0.8);
      }
      for (k = 0; k < 5; k++) { s += rect(86 + k * 7, 100 + (k % 2) * 2, 5, 34, 8 * (k - 2), pick(r, ['#F2B63A', '#D8452D', '#F2B63A'])); }
      for (k = 0; k < 4; k++) { p = inDisc(r, 26); s += circ(p[0], p[1] + 2, 6.5, '#C23A5B') + circ(p[0], p[1] + 2, 3, '#F7E1E6'); }
    }
    return s;
  }

  var PIZZAS = { 'four-cheese': 1 };
  Object.keys(RECIPES).forEach(function (k) { PIZZAS[k] = 1; });

  function art(kind, label) {
    var body = PIZZAS[kind] ? pizzaBody(kind) : plateBody(kind);
    return '<svg class="art" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"' +
      (label ? ' role="img" aria-label="' + String(label).replace(/"/g, '&quot;') + '"' : ' aria-hidden="true"') + '>' + body + '</svg>';
  }

  function leaf(cls) {
    return '<svg class="' + (cls || 'leaf') + '" viewBox="0 0 100 60" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M4 30C22 4 66 2 96 30 66 58 22 56 4 30Z" fill="#3F7A4F"/>' +
      '<path d="M4 30C22 4 66 2 96 30" fill="#4E9060" fill-opacity=".55"/>' +
      '<path d="M8 30H90M30 30l12-13M30 30l12 13M52 30l13-11M52 30l13 11" stroke="#17382B" stroke-opacity=".45" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
  }

  function tomato(cls) {
    return '<svg class="' + (cls || 'tomato') + '" viewBox="0 0 60 60" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="30" cy="34" r="22" fill="#C4502F"/><ellipse cx="22" cy="26" rx="6" ry="3.5" transform="rotate(-30 22 26)" fill="#fff" fill-opacity=".28"/>' +
      '<path d="M30 14l4 6 7-3-3 7 6 3-7 2 1 7-8-4-8 4 1-7-7-2 6-3-3-7 7 3z" fill="#3F7A4F" transform="translate(0 -2) scale(.55) translate(24 4)"/></svg>';
  }

  function tableScene() {
    var s = '<svg class="art art-scene" viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    s += '<rect width="200" height="250" fill="#B98B5A"/>';
    for (var i = 0; i < 9; i++) {
      s += '<path d="M0 ' + (14 + i * 28) + ' C60 ' + (6 + i * 28) + ' 130 ' + (24 + i * 28) + ' 200 ' + (12 + i * 28) + '" stroke="#8F6A41" stroke-opacity=".5" stroke-width="1.4" fill="none"/>';
    }
    s += circ(66, 150, 52, '#000', .15) + circ(64, 146, 52, '#fff', 1, '#E6DCC6', 2) + circ(64, 146, 38, '#FBF7EC', 1, '#EEE4CF', 1.5);
    s += '<path d="M64 146 L34 118 A42 42 0 0 1 94 118 Z" fill="#D9A24E" stroke="#B9772F" stroke-width="1.5"/>';
    s += '<path d="M64 146 L40 123 A34 34 0 0 1 88 123 Z" fill="#F1D17F"/>';
    s += circ(56, 128, 5, '#B3382B') + circ(72, 130, 5, '#B3382B') + circ(64, 118, 4, '#5F8F47');
    s += circ(150, 70, 46, '#000', .15) + circ(148, 66, 46, '#fff', 1, '#E6DCC6', 2) + circ(148, 66, 32, '#FBF7EC', 1, '#EEE4CF', 1.5);
    s += ell(148, 66, 20, 12, 20, '#6E9B4F') + ell(144, 62, 14, 7, -30, '#8DB35F') + ell(154, 70, 10, 5, 50, '#5A8741');
    s += circ(160, 200, 20, '#000', .12) + circ(158, 198, 20, '#E9F0EA', .55, '#fff', 2) + circ(158, 198, 12, '#C4502F', .35);
    s += circ(26, 60, 15, '#000', .12) + circ(25, 58, 15, '#E9F0EA', .55, '#fff', 2) + circ(25, 58, 8, '#F1D17F', .6);
    s += '<g transform="translate(96 214) rotate(-25)"><path d="M0 0C14-14 38-14 52 0 38 14 14 14 0 0Z" fill="#3F7A4F"/><path d="M4 0H48" stroke="#17382B" stroke-opacity=".4" stroke-width="1.4"/></g>';
    return s + '</svg>';
  }

  var ICONS = {
    cart: '<path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.76L19.5 8H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    phone: '<path d="M5 4h3l1.5 4-2 1.3a11 11 0 0 0 5.2 5.2L14 12.5l4 1.5v3a2 2 0 0 1-2 2A13 13 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    pin: '<path d="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10z"/><circle cx="12" cy="11" r="2.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10 11v5M14 11v5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    back: '<path d="M14 6l-6 6 6 6M8 12h11"/>',
    bag: '<path d="M6 8h12l-1 11H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
    route: '<path d="M4 20l16-7-6-2-2-6z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    wedge: '<path d="M3 16l17-9v10H3z"/><circle cx="9" cy="14.5" r="1"/><circle cx="14" cy="12.5" r="1"/>',
    sprout: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19c3-5 6-8 10-10"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    star: '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1L3.2 9.6l6.1-.8z"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>'
  };

  function icon(name, size) {
    return '<svg class="icon" width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  }

  function star(size) {
    return '<svg class="star" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1L3.2 9.6l6.1-.8z"/></svg>';
  }

  function stars(n, size) {
    var s = '';
    for (var i = 0; i < n; i++) s += star(size);
    return '<span class="stars" aria-hidden="true">' + s + '</span>';
  }

  window.JARDINS_ART = { art: art, leaf: leaf, tomato: tomato, tableScene: tableScene, icon: icon, star: star, stars: stars };
})();
