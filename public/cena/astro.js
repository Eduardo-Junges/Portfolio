/* Nexus — astronomia da cena (fundo vivo "sistema solar").
 *
 * PURO: sem DOM, sem WebGL. Roda no navegador (window.NexusAstro) e no node
 * (module.exports), para os testes em tests/cena_astro.js.
 *
 * Fontes (só ideias e números publicados, nada de código de terceiros):
 *  - Elementos keplerianos aproximados da NASA/JPL (Standish), válidos de 1800 a 2050,
 *    erro declarado <= 0,17° — depois de 2050 a tabela precisa ser trocada.
 *  - Declinação e equação do tempo pelas séries de Spencer (1971).
 *  - Matriz equatorial -> galáctica (IAU 1958, J2000).
 * Vem do Nexus Analytics (webapp/static/cena/astro.js), sem mudança na astronomia.
 */
(function (raiz) {
  'use strict';
  var D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  var EPS = 23.4392911 * D2R;                    // obliquidade da eclíptica (J2000)
  // Um ponto genérico do Sul do Brasil: só decide o tom do Sol (dia, poente, noite).
  var LOCAL = { lat: -30, lon: -51, tz: -3 };

  // [a, da, e, de, I, dI, L, dL, ϖ, dϖ, Ω, dΩ]  (por século juliano desde J2000)
  var EL = {
    mercurio: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.25032350, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
    venus:    [0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890, 181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
    terra:    [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0, 0],
    marte:    [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
    jupiter:  [5.20288700, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
    saturno:  [9.53667594, -0.00125060, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
    urano:    [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.95427630, 0.40805281, 74.01692503, 0.04240589],
    netuno:   [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664]
  };
  var GAL = [[-0.0548755604, -0.8734370902, -0.4838350155],
             [0.4941094279, -0.4448296300, 0.7469822445],
             [-0.8676661490, -0.1980763734, 0.4559837762]];

  // ── vetores ──────────────────────────────────────────────────────────────────
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function scl(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ss(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function angR(a, b) { var d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function rnd(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  // ── referenciais ─────────────────────────────────────────────────────────────
  // eclíptica (x,y no plano, z ao norte) -> mundo da cena (x, y para cima, z), mão direita
  function e2w(v) { return [v[0], v[2], -v[1]]; }
  function eq2ecl(v) { return [v[0], v[1] * Math.cos(EPS) + v[2] * Math.sin(EPS), -v[1] * Math.sin(EPS) + v[2] * Math.cos(EPS)]; }
  function radec(ra, dec) {
    ra *= D2R; dec *= D2R;
    return e2w(eq2ecl([Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]));
  }
  function gal2w(l, b) {
    var g = [Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)];
    var e = [GAL[0][0] * g[0] + GAL[1][0] * g[1] + GAL[2][0] * g[2],
             GAL[0][1] * g[0] + GAL[1][1] * g[1] + GAL[2][1] * g[2],
             GAL[0][2] * g[0] + GAL[1][2] * g[1] + GAL[2][2] * g[2]];
    return e2w(eq2ecl(e));
  }
  // mundo -> galáctico (inverso de gal2w), para o mapa da Via Láctea
  function w2g(v) {
    var xe = v[0], ye = -v[2], ze = v[1], x = xe,
        y = ye * Math.cos(EPS) - ze * Math.sin(EPS), z = ye * Math.sin(EPS) + ze * Math.cos(EPS);
    return [GAL[0][0] * x + GAL[0][1] * y + GAL[0][2] * z,
            GAL[1][0] * x + GAL[1][1] * y + GAL[1][2] * z,
            GAL[2][0] * x + GAL[2][1] * y + GAL[2][2] * z];
  }
  function matW2G() {
    var a = w2g([1, 0, 0]), b = w2g([0, 1, 0]), c = w2g([0, 0, 1]);
    return new Float32Array([a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]]);
  }

  // ── tempo e efemérides ───────────────────────────────────────────────────────
  function jd(d) { return d.getTime() / 86400000 + 2440587.5; }

  /* Posição heliocêntrica eclíptica (J2000) em UA: [x, y, z]. Kepler por Newton. */
  function posHelio(nome, d) {
    var q = EL[nome], T = (jd(d) - 2451545) / 36525;
    var a = q[0] + q[1] * T, ec = q[2] + q[3] * T, I = q[4] + q[5] * T, L = q[6] + q[7] * T,
        wb = q[8] + q[9] * T, om = q[10] + q[11] * T;
    var M = ((L - wb) % 360 + 540) % 360 - 180, Mr = M * D2R, E = Mr + ec * Math.sin(Mr);
    for (var k = 0; k < 10; k++) E += (Mr - (E - ec * Math.sin(E))) / (1 - ec * Math.cos(E));
    var xp = a * (Math.cos(E) - ec), yp = a * Math.sqrt(1 - ec * ec) * Math.sin(E),
        wr = (wb - om) * D2R, or = om * D2R, ir = I * D2R;
    var cw = Math.cos(wr), sw = Math.sin(wr), co = Math.cos(or), so = Math.sin(or), ci = Math.cos(ir), si = Math.sin(ir);
    return [(cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp,
            (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp,
            (sw * si) * xp + (cw * si) * yp];
  }
  function lonHelio(nome, d) { var p = posHelio(nome, d); return ((Math.atan2(p[1], p[0]) * R2D) % 360 + 360) % 360; }
  /* Longitude eclíptica geocêntrica do Sol = longitude heliocêntrica da Terra + 180°. */
  function lonSolGeo(d) { return (lonHelio('terra', d) + 180) % 360; }
  /* Direção (mundo da cena) de um planeta visto da Terra. */
  function direcaoGeo(nome, d) { return norm(e2w(sub(posHelio(nome, d), posHelio('terra', d)))); }
  /* Elongação (graus) do planeta em relação ao Sol, vista da Terra. */
  function elongacao(nome, d) {
    var t = posHelio('terra', d), s = norm(scl(t, -1)), p = norm(sub(posHelio(nome, d), t));
    return Math.acos(clamp(dot(s, p), -1, 1)) * R2D;
  }
  function gmst(j) { return ((280.46061837 + 360.98564736629 * (j - 2451545)) % 360 + 360) % 360; }
  function idadeLua(j) { return (((j - 2451550.26) / 29.530588853) % 1 + 1) % 1; }
  function iluminacaoLua(j) { return (1 - Math.cos(TAU * idadeLua(j))) / 2; }

  // ── o Sol no céu do local ─────────────────────────────────────────────────────
  function doy(d) {
    return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
  }
  function solar(d) {
    var n = doy(d), g = TAU * (n - 1) / 365;
    return {
      dec: 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g),
      eot: 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
    };
  }
  /* Altura do Sol (graus) na hora local `hl` (horas decimais no fuso `lc.tz`). */
  function altitude(d, hl, lc) {
    lc = lc || LOCAL;
    var s = solar(d), so = (hl - lc.tz) + lc.lon / 15 + s.eot / 60, H = 15 * (so - 12) * D2R, la = lc.lat * D2R;
    return Math.asin(Math.sin(la) * Math.sin(s.dec) + Math.cos(la) * Math.cos(s.dec) * Math.cos(H)) * R2D;
  }
  /* [nascer, pôr] em horas locais (refração padrão de -0,833°). */
  function nascerPoer(d, lc) {
    lc = lc || LOCAL;
    var s = solar(d), la = lc.lat * D2R,
        c = (Math.sin(-0.833 * D2R) - Math.sin(la) * Math.sin(s.dec)) / (Math.cos(la) * Math.cos(s.dec)),
        H0 = Math.acos(clamp(c, -1, 1)) * R2D / 15,
        loc = function (x) { return x - lc.lon / 15 - s.eot / 60 + lc.tz; };
    return [loc(12 - H0), loc(12 + H0)];
  }
  function hh(x) {
    x = ((x % 24) + 24) % 24;
    var m = Math.round(x * 60);
    return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }
  /* Hora local (decimal) no fuso do local, independente do fuso do computador. */
  function horaLocal(d, lc) {
    lc = lc || LOCAL;
    var u = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
    return ((u + lc.tz) % 24 + 24) % 24;
  }
  /* Base ortonormal (mat3) de um corpo: eixo Y = polo; `hint` fixa o meridiano zero. */
  function base(pole, hint, phi) {
    var Y = norm(pole), a = hint || (Math.abs(Y[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]),
        X0 = norm(sub(a, scl(Y, dot(a, Y)))), Z0 = cross(X0, Y), c = Math.cos(phi), s = Math.sin(phi),
        X = sub(scl(X0, c), scl(Z0, s)), Z = add(scl(Z0, c), scl(X0, s));
    return new Float32Array([X[0], X[1], X[2], Y[0], Y[1], Y[2], Z[0], Z[1], Z[2]]);
  }

  var API = {
    D2R: D2R, R2D: R2D, TAU: TAU, EPS: EPS, LOCAL: LOCAL, EL: EL,
    sub: sub, add: add, scl: scl, dot: dot, cross: cross, norm: norm, lerp: lerp, lerp3: lerp3,
    clamp: clamp, ss: ss, angR: angR, ease: ease, rnd: rnd,
    e2w: e2w, eq2ecl: eq2ecl, radec: radec, gal2w: gal2w, w2g: w2g, matW2G: matW2G,
    jd: jd, posHelio: posHelio, lonHelio: lonHelio, lonSolGeo: lonSolGeo, direcaoGeo: direcaoGeo,
    elongacao: elongacao, gmst: gmst, idadeLua: idadeLua, iluminacaoLua: iluminacaoLua,
    solar: solar, altitude: altitude, nascerPoer: nascerPoer, hh: hh, horaLocal: horaLocal, base: base
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.NexusAstro = API;
})(typeof window !== 'undefined' ? window : this);
