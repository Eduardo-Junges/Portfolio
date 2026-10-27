/* Nexus & PJ — galáxia da tela de entrada (motor WebGL próprio, sem bibliotecas, 100% offline).
 *
 * Adaptado do modo "galáxia" do Nexus Analytics (webapp/static/cena/cena.js), sem planetas nem
 * texturas: a galáxia é GERADA aqui (nada a baixar). Versão discreta para o sistema da empresa.
 *
 * Níveis (um só vocabulário para tudo, ver `nivelDeEfeitos`):
 *   completo → ~40 mil pontos, rotação lenta, inclinação sutil com o cursor;
 *   reduzido → ~16 mil pontos, 30 quadros/s, sem inclinação;
 *   desligado ("reduzir movimento" do sistema também) → um quadro parado.
 * Se o quadro médio passar de ~36 ms o motor cai sozinho para Reduzido.
 *
 * O canvas é decorativo (aria-hidden): nenhuma informação vive só no desenho. Sem WebGL ou sem JS a
 * tela continua com o fundo de CSS de sempre (`.login-bg`). Antes de entrar, nada do dono aparece.
 * A rotação continua de uma tela de autenticação para a outra (só o ângulo, em sessionStorage).
 */
(function () {
  'use strict';
  var cv = document.getElementById('galaxia-cv');
  if (!cv) return;
  var root = document.documentElement;
  var TAU = Math.PI * 2, D2R = Math.PI / 180;

  // ── nível de efeitos ────────────────────────────────────────────────────────
  function nivelDeEfeitos() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off';
    var v = '';
    try { v = localStorage.getItem('nx-efeitos') || ''; } catch (e) { }
    return v === 'desligado' ? 'off' : (v === 'reduzido' ? 'reduced' : 'full');
  }

  // ── matemática mínima ───────────────────────────────────────────────────────
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function scl(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.sqrt(dot(a, a)) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function ease(t) { return t * t * (3 - 2 * t); }
  function rnd(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function mmul(a, b) { var o = new Float32Array(16); for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
  function lookAt(e, t, u) { var z = norm(sub(e, t)), x = norm(cross(u, z)), y = cross(z, x); return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]); }
  function frustum(l, r, b, t, n, f) { return new Float32Array([2 * n / (r - l), 0, 0, 0, 0, 2 * n / (t - b), 0, 0, (r + l) / (r - l), (t + b) / (t - b), -(f + n) / (f - n), -1, 0, 0, -2 * f * n / (f - n), 0]); }

  // ── shaders ─────────────────────────────────────────────────────────────────
  var PREC = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  // brilho do Sol (um quad virado para a câmera)
  var VS_G = 'attribute vec2 aQ;uniform mat4 uVP;uniform vec3 uC,uRt,uUp;uniform float uS;varying vec2 vQ;void main(){vQ=aQ;vec3 w=uC+(uRt*aQ.x+uUp*aQ.y)*uS;gl_Position=uVP*vec4(w,1.0);}';
  var FS_G = PREC + ['varying vec2 vQ;uniform float uK;uniform vec3 uCol;',
    'void main(){float r=length(vQ)*uK;if(r>uK)discard;float rr=max(r-1.0,0.0);',
    ' float g=.9*exp(-rr*3.2)+.26*exp(-rr*.9)+.05*exp(-rr*.25);g*=1.0-smoothstep(uK*.75,uK,r);gl_FragColor=vec4(uCol*g,1.0);}'].join('\n');
  // estrelas da galáxia: o tamanho do ponto cresce com a proximidade (a sensação de mergulho)
  var VS_GX = ['attribute vec3 aP;attribute vec4 aC;uniform mat4 uVP;uniform float uRot,uSc,uB;varying vec3 vC;varying float vA;',
    'void main(){float c=cos(uRot);float s=sin(uRot);vec3 p=vec3(aP.x*c-aP.z*s,aP.y,aP.x*s+aP.z*c);',
    ' vec4 q=uVP*vec4(p,1.0);gl_Position=q;float d=max(q.w,.03);',
    ' gl_PointSize=clamp(aC.a*uSc*6.0/d,1.0,7.0);vC=aC.rgb*uB;vA=smoothstep(.25,1.4,d);}'].join('\n');
  var FS_GX = PREC + 'varying vec3 vC;varying float vA;void main(){vec2 p=gl_PointCoord*2.0-1.0;float d=dot(p,p);if(d>1.0)discard;gl_FragColor=vec4(vC*exp(-d*3.5)*vA,1.0);}';
  // névoa do disco: um quad no plano da galáxia, brilho radial modulado pelos braços e pontilhado (sem faixas)
  var VS_H = 'attribute vec2 aQ;uniform mat4 uVP;uniform float uRot,uR;varying vec2 vP;void main(){vP=aQ*uR;float c=cos(uRot);float s=sin(uRot);vec3 p=vec3(vP.x*c-vP.y*s,0.0,vP.x*s+vP.y*c);gl_Position=uVP*vec4(p,1.0);}';
  var FS_H = PREC + ['varying vec2 vP;uniform float uK,uB;',
    'float dith(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))))-.5;}',
    'void main(){float r=length(vP);float th=atan(vP.y,vP.x);',
    ' float bracos=.55+.45*cos(2.0*(th-uK*log(max(r,.3)/1.6)));bracos=bracos*bracos*bracos;',
    ' float disco=exp(-r/3.4)*(.35+.65*bracos)*(1.0-smoothstep(11.0,16.0,r));float bojo=exp(-r*r/1.4);',
    ' vec3 c=vec3(.55,.62,.95)*disco*.95+vec3(1.0,.82,.58)*bojo*.8;c*=uB;c+=dith(gl_FragCoord.xy)/255.0;gl_FragColor=vec4(c,1.0);}'].join('\n');

  // ── estado ──────────────────────────────────────────────────────────────────
  var gl, PH, PGX, PG, quad, dados = null;
  var fx = nivelDeEfeitos(), w = 1, h = 1, dpr = 1, rodando = false, ult = 0, degradou = false, fpsAcc = [], pend = true;
  var g = { rot: 0.3, px: 0, py: 0, mxN: 0, myN: 0, mergulho: 0, dur: 1300, aoChegar: null, rotFix: 0 };
  var PASSO_BRACO = 1 / Math.tan(16 * D2R);   // a real é ~12°; 16° deixa os braços legíveis de longe
  var KEY = 'nx-galaxia';

  function lerRot() { try { var s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (s && Date.now() - s.t < 10 * 60000 && isFinite(s.rot)) return s.rot; } catch (e) { } return 0.3; }
  function guardarRot() { try { sessionStorage.setItem(KEY, JSON.stringify({ rot: g.rot, t: Date.now() })); } catch (e) { } }

  function sombra(tipo, src, erros) {
    var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) erros.push(gl.getShaderInfoLog(s));
    return s;
  }
  function prog(vs, fs, erros) {
    var p = gl.createProgram(); gl.attachShader(p, sombra(gl.VERTEX_SHADER, vs, erros)); gl.attachShader(p, sombra(gl.FRAGMENT_SHADER, fs, erros)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) erros.push(gl.getProgramInfoLog(p));
    var u = {}, a = {}, i;
    for (i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { var nu = gl.getActiveUniform(p, i).name; u[nu] = gl.getUniformLocation(p, nu); }
    for (i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i++) { var na = gl.getActiveAttrib(p, i).name; a[na] = gl.getAttribLocation(p, na); }
    return { p: p, u: u, a: a };
  }
  function U(pr, n) { return pr.u[n] === undefined ? null : pr.u[n]; }
  function buf(d) { var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW); return b; }
  var habil = [];
  function attr(pr, nome, b, tam) { var l = pr.a[nome]; if (l === undefined || l < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, tam, gl.FLOAT, false, 0, 0); habil.push(l); }
  function solta() { habil.forEach(function (l) { gl.disableVertexAttribArray(l); }); habil = []; }

  /* A Via Láctea vista de fora: ~15 kpc de raio (1 unidade = 1 kpc), dois braços principais e dois menores em espiral
     logarítmica, bojo amarelado e regiões de formação de estrelas rosadas. O Sol fica a 8,2 kpc do centro, entre os
     braços — é para lá que a câmera mergulha depois do login. */
  function gerar(nivel) {
    var r = rnd(7777), N = nivel === 'full' ? 40000 : 16000, P = [], C = [], i;
    var gauss = function () { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
    for (i = 0; i < N; i++) {
      var t = r(), x, y, z, cor, tam, bri;
      if (t < 0.15) {                                   // bojo
        var rb = Math.abs(gauss()) * 1.1, tb = r() * TAU, pb = Math.acos(2 * r() - 1);
        x = rb * Math.sin(pb) * Math.cos(tb); y = rb * Math.cos(pb) * 0.55; z = rb * Math.sin(pb) * Math.sin(tb);
        bri = 0.35 + r() * 0.5; cor = [1, 0.82, 0.58]; tam = 1.0 + r() * 1.2;
      } else if (t < 0.85) {                            // braços
        var braco = (r() * 4) | 0;
        if (braco % 2 === 1 && r() < 0.45) braco -= 1;  // os dois braços menores têm menos estrelas
        var rr = 1.6 - Math.log(1 - r() * 0.985) * 3.4;
        if (rr > 15.5) rr = 15.5 - r();
        var th = braco * TAU / 4 + PASSO_BRACO * Math.log(rr / 1.6) + gauss() * (0.11 + 0.22 / rr);
        x = rr * Math.cos(th) + gauss() * 0.22; z = rr * Math.sin(th) + gauss() * 0.22; y = gauss() * 0.1 * (1 + rr * 0.03);
        if (r() < 0.035) { cor = [1, 0.45, 0.62]; bri = 0.9; tam = 2.2; }
        else { var k = clamp(rr / 15 * 0.5 + r() * 0.35, 0, 1); cor = lerp3([0.62, 0.75, 1], [1, 0.95, 0.85], k); bri = 0.25 + Math.pow(r(), 2) * 0.75; tam = 0.8 + r() * 1.4; }
      } else {                                          // disco difuso entre os braços
        var rd = -Math.log(1 - r() * 0.98) * 4.2, td = r() * TAU;
        x = rd * Math.cos(td); z = rd * Math.sin(td); y = gauss() * 0.16;
        cor = [1, 0.88, 0.72]; bri = 0.12 + r() * 0.25; tam = 0.8 + r();
      }
      P.push(x, y, z); C.push(cor[0] * bri, cor[1] * bri, cor[2] * bri, tam);
    }
    var sol = [8.2 * Math.cos(4.1), 0.02, 8.2 * Math.sin(4.1)];
    P.push(sol[0], sol[1], sol[2]); C.push(1, 0.9, 0.7, 3.2);        // o Sol: um ponto morno
    return { p: buf(new Float32Array(P)), c: buf(new Float32Array(C)), n: P.length / 3, sol: sol };
  }
  function rodar(v, a) { var c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[2] * s, v[1], v[0] * s + v[2] * c]; }

  function camera(now) {
    var el = 50 * D2R + g.py * 0.03, az = 0.6 + g.px * 0.05, D = 12;
    var eye = [D * Math.cos(el) * Math.cos(az), D * Math.sin(el), D * Math.cos(el) * Math.sin(az)];
    // tela em pé (celular): a lente abre para a galáxia não ficar cortada nas laterais
    var fov0 = w / h < 1 ? Math.min(62, 50 / Math.max(w / h, 0.75)) : 50;
    var c = { eye: eye, alvo: [0, 0, 0], fov: fov0, sx: 0, sy: 0, p: 0, e: 0, rot: g.rot };
    if (g.mergulho) {
      // A câmera para a 0,6 do Sol, não dentro dele: o último quadro fica na tela enquanto o servidor monta a página
      // seguinte e precisa ser o que ela continua — o Sol como uma estrela no meio do escuro.
      var p = clamp((now - g.mergulho) / g.dur, 0, 1), e = p * p * (3 - 2 * p) * p;   // mais rápido no fim
      var sol = rodar(dados.sol, g.rotFix), fimEye = add(sol, scl(norm(sub(eye, sol)), 0.6));
      c.eye = lerp3(eye, fimEye, e); c.alvo = lerp3([0, 0, 0], sol, ease(clamp(p * 1.7, 0, 1)));
      c.fov = lerp(fov0, 82, e); c.p = p; c.e = e; c.rot = g.rotFix;
    }
    return c;
  }

  function desenhar(now, dt) {
    if (!dados) dados = gerar(fx === 'off' ? 'reduced' : fx);
    if (fx === 'full' && !g.mergulho) g.rot += dt * 0.000015;                     // ~1 volta a cada 7 min
    g.px += (g.mxN - g.px) * Math.min(1, dt / 400); g.py += (g.myN - g.py) * Math.min(1, dt / 400);
    var c = camera(now), V = lookAt(c.eye, c.alvo, [0, 1, 0]), asp = w / h, n = 0.01, f = 400,
        hH = n * Math.tan(c.fov / 2 * D2R), hW = hH * asp, P = frustum(-hW, hW, -hH, hH, n, f), VP = mmul(P, V);
    gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(PH.p); gl.uniformMatrix4fv(U(PH, 'uVP'), false, VP); gl.uniform1f(U(PH, 'uRot'), c.rot);
    gl.uniform1f(U(PH, 'uR'), 16); gl.uniform1f(U(PH, 'uK'), PASSO_BRACO); gl.uniform1f(U(PH, 'uB'), 1 - 0.92 * c.e);
    attr(PH, 'aQ', quad, 2); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); solta();
    gl.useProgram(PGX.p); gl.uniformMatrix4fv(U(PGX, 'uVP'), false, VP); gl.uniform1f(U(PGX, 'uRot'), c.rot);
    gl.uniform1f(U(PGX, 'uSc'), dpr); gl.uniform1f(U(PGX, 'uB'), 1.7 * (1 - 0.6 * c.e));      // a galáxia apaga em volta
    attr(PGX, 'aP', dados.p, 3); attr(PGX, 'aC', dados.c, 4); gl.drawArrays(gl.POINTS, 0, dados.n); solta();
    // brilho do Sol: discreto parado; no mergulho cresce até uma estrela de tamanho FIXO na tela, sem estourar em branco
    var sol = rodar(dados.sol, c.rot), ds = Math.max(0.05, Math.hypot(sol[0] - c.eye[0], sol[1] - c.eye[1], sol[2] - c.eye[2]));
    var pulso = fx === 'full' ? Math.sin(now / 700) : 0;
    var raio = g.mergulho ? lerp(0.12, 0.17 * ds, c.e) * (1 + 0.035 * pulso * c.p) : 0.12 + 0.04 * pulso;
    gl.useProgram(PG.p); gl.uniformMatrix4fv(U(PG, 'uVP'), false, VP);
    gl.uniform3fv(U(PG, 'uRt'), [V[0], V[4], V[8]]); gl.uniform3fv(U(PG, 'uUp'), [V[1], V[5], V[9]]);
    gl.uniform3fv(U(PG, 'uC'), sol); gl.uniform1f(U(PG, 'uS'), raio); gl.uniform1f(U(PG, 'uK'), 3);
    gl.uniform3fv(U(PG, 'uCol'), scl([1, 0.86, 0.62], 0.22 + 0.95 * c.e)); attr(PG, 'aQ', quad, 2); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); solta();
    gl.disable(gl.BLEND);
    if (g.mergulho && c.p >= 1 && g.aoChegar) { var cb = g.aoChegar; g.aoChegar = null; cb(); }
  }

  function layout() {
    dpr = fx === 'full' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;   // PCs fracos da loja: nunca além de 1,5
    w = Math.max(1, window.innerWidth); h = Math.max(1, window.innerHeight);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); pend = true;
  }
  function trocarNivel(novo) {
    if (novo === fx) return;
    fx = novo; root.setAttribute('data-galaxia-fx', fx);
    if (dados) { try { gl.deleteBuffer(dados.p); gl.deleteBuffer(dados.c); } catch (e) { } dados = null; }
    layout();
  }
  function quadro(now) {
    if (!rodando) return;
    var dt = Math.min(100, now - ult);
    if (fx === 'reduced' && dt < 31) { requestAnimationFrame(quadro); return; }
    ult = now;
    if (document.visibilityState === 'visible' && (fx !== 'off' || pend || g.mergulho)) {
      desenhar(now, dt); pend = false;
      if (!root.hasAttribute('data-galaxia-pronta')) root.setAttribute('data-galaxia-pronta', '1');
    }
    // queda automática para Reduzido: média de quadro > 36 ms por ~150 quadros
    if (fx === 'full' && document.visibilityState === 'visible' && !degradou && !g.mergulho) {
      fpsAcc.push(dt); if (fpsAcc.length > 180) fpsAcc.shift();
      if (fpsAcc.length >= 150) { var m = fpsAcc.reduce(function (a, b) { return a + b; }, 0) / fpsAcc.length; if (m > 36) { degradou = true; trocarNivel('reduced'); } }
    }
    requestAnimationFrame(quadro);
  }

  function iniciar() {
    gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) || cv.getContext('experimental-webgl');
    if (!gl) return false;
    var erros = [];
    PH = prog(VS_H, FS_H, erros); PGX = prog(VS_GX, FS_GX, erros); PG = prog(VS_G, FS_G, erros);
    if (erros.length) return false;
    quad = buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
    g.rot = lerRot();
    root.setAttribute('data-galaxia-fx', fx); layout();
    if (fx === 'full') {            // inclinação sutil da galáxia com o cursor (só no Completo)
      var pendM = false;
      document.addEventListener('pointermove', function (e) {
        if (pendM) return; pendM = true;
        requestAnimationFrame(function () { g.mxN = (e.clientX / w - 0.5) * 2; g.myN = (e.clientY / h - 0.5) * 2; pendM = false; });
      }, { passive: true });
    }
    addEventListener('resize', layout);
    addEventListener('pagehide', guardarRot);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { pend = true; ult = performance.now(); } });
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); rodando = false; root.classList.remove('galaxia-on'); });
    rodando = true; ult = performance.now(); requestAnimationFrame(quadro);
    return true;
  }

  if (!iniciar()) return;
  root.classList.add('galaxia-on');

  /* API para o login: mergulho até o Sol (~1,3 s no Completo) e então `cb`. Desligado/sem GL: `cb` na hora. */
  window.NexusGalaxia = {
    fx: function () { return fx; },
    mergulhar: function (cb) {
      if (fx === 'off' || !rodando) { if (cb) cb(); return; }
      g.dur = fx === 'full' ? 1300 : 500; g.rotFix = g.rot; g.mergulho = performance.now(); g.aoChegar = cb || null; pend = true;
      guardarRot();
    }
  };
}());
