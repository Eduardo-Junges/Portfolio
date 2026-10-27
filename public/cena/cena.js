/* Fundo vivo "sistema solar" do site — o mesmo motor do Nexus Analytics (webapp/static/cena/cena.js),
 * WebGL próprio, sem bibliotecas. O que mudou para o site:
 *   • o espaço é escuro nos dois temas (decisão do Eduardo, 27/10/2026): no tema claro só o véu
 *     da coluna de texto vira papel. O modo "atlas" (canvas transparente, órbitas em traço escuro,
 *     alfa pré-multiplicado) continua no motor, desligado: `claro` não liga mais com o tema;
 *   • "sol" = visão geral do sistema (a home); cada página aponta para o seu planeta e a câmera voa
 *     de um para o outro ao navegar (planeta e câmera ficam em sessionStorage);
 *   • texturas em WebP: 1K no Completo, 512 no Reduzido/celular; carregam depois da página;
 *   • sem galáxia de login, sem painel de diagnóstico, sem logout.
 *
 * Créditos: texturas de Solar System Scope (www.solarsystemscope.com/textures), licença
 * CC BY 4.0, baseadas em dados da NASA. Estrelas: Yale Bright Star Catalogue (BSC5), Harvard/SAO.
 *
 * Princípios (os mesmos do app): o canvas é decorativo (aria-hidden); nenhuma informação vive só no
 * desenho. "Reduzir movimento" = Desligado (um quadro parado); aba oculta não desenha; se o quadro
 * médio passar de ~36 ms o motor cai sozinho para Reduzido.
 */
(function () {
  'use strict';
  var A = window.NexusAstro;
  if (!A) return;
  var D2R = A.D2R, TAU = A.TAU, sub = A.sub, add = A.add, scl = A.scl, dot = A.dot, cross = A.cross,
      norm = A.norm, lerp = A.lerp, lerp3 = A.lerp3, clamp = A.clamp, ss = A.ss, angR = A.angR, ease = A.ease;

  // ── 1. corpos ───────────────────────────────────────────────────────────────
  var SUNR = 0.55, MOOND = 0.42, MOONR = 0.045, FOV_SISTEMA = 40;
  // pr = raio visual; orb = órbita (comprimida, ângulos reais); pole = polo norte AR/Dec (IAU);
  // per = rotação sideral (h; negativo = retrógrado); atm = cor/força da atmosfera; t = tipo no shader
  var B = [
    { n: 'mercurio', t: 1, pr: 0.09, orb: 2.2, ac: '#c9c3b8', pole: [281.01, 61.41], per: 1407.6, atm: [0, 0, 0, 0] },
    { n: 'venus', t: 2, pr: 0.16, orb: 3.15, ac: '#e8c070', pole: [272.76, 67.16], per: -5832.5, atm: [1, 0.84, 0.55, 0.8] },
    { n: 'terra', t: 3, pr: 0.17, orb: 4.4, ac: '#4aa3ff', pole: [0, 90], per: 23.9345, atm: [0.33, 0.58, 1, 1.1] },
    { n: 'marte', t: 4, pr: 0.12, orb: 5.75, ac: '#ff6b45', pole: [317.68, 52.89], per: 24.6229, atm: [0.95, 0.6, 0.42, 0.35] },
    { n: 'jupiter', t: 5, pr: 0.62, orb: 8.6, ac: '#e0a868', pole: [268.06, 64.5], per: 9.925, atm: [0.95, 0.82, 0.62, 0.35] },
    { n: 'saturno', t: 6, pr: 0.52, orb: 11.4, ac: '#e6cd80', pole: [40.59, 83.54], per: 10.656, atm: [0.95, 0.86, 0.62, 0.3], ring: 1 },
    { n: 'urano', t: 7, pr: 0.3, orb: 14, ac: '#5fd3e0', pole: [257.31, -15.18], per: -17.24, atm: [0.55, 0.9, 0.95, 0.75] },
    { n: 'netuno', t: 8, pr: 0.29, orb: 16.4, ac: '#6c86ff', pole: [299.36, 43.46], per: 16.11, atm: [0.32, 0.48, 1, 0.75] }
  ];
  var IDX = {}; B.forEach(function (b, i) { IDX[b.n] = i; b.poleW = A.radec(b.pole[0], b.pole[1]); b.fase = i * 1.7; });
  // estrelas brilhantes (AR°, Dec°, mag, B−V): reserva enquanto o catálogo não chega
  var BRILHANTES = [[101.29, -16.72, -1.46, 0], [95.99, -52.7, -0.74, 0.15], [219.9, -60.83, -0.27, 0.71], [213.92, 19.18, -0.05, 1.23],
    [279.23, 38.78, 0.03, 0], [79.17, 46, 0.08, 0.8], [78.63, -8.2, 0.13, -0.03], [114.83, 5.22, 0.37, 0.42], [24.43, -57.24, 0.46, -0.16],
    [88.79, 7.41, 0.5, 1.85], [210.96, -60.37, 0.61, -0.23], [297.7, 8.87, 0.77, 0.22], [186.65, -63.1, 0.77, -0.24], [68.98, 16.51, 0.85, 1.54],
    [201.3, -11.16, 0.98, -0.23], [247.35, -26.43, 1.09, 1.83], [116.33, 28.03, 1.14, 1], [344.41, -29.62, 1.16, 0.09], [191.93, -59.69, 1.25, -0.23]];

  // ── utilidades de matriz ────────────────────────────────────────────────────
  function mmul(a, b) { var o = new Float32Array(16); for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
  function lookAt(e, t, u) { var z = norm(sub(e, t)), x = norm(cross(u, z)), y = cross(z, x); return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]); }
  function frustum(l, r, b, t, n, f) { return new Float32Array([2 * n / (r - l), 0, 0, 0, 0, 2 * n / (t - b), 0, 0, (r + l) / (r - l), (t + b) / (t - b), -(f + n) / (f - n), -1, 0, 0, -2 * f * n / (f - n), 0]); }
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16) / 255, parseInt(c.substr(2, 2), 16) / 255, parseInt(c.substr(4, 2), 16) / 255]; }
  function corBV(bv) {
    var t = [[-0.3, [0.62, 0.72, 1]], [0, [0.8, 0.87, 1]], [0.4, [1, 0.98, 0.95]], [0.8, [1, 0.9, 0.76]], [1.2, [1, 0.8, 0.6]], [1.9, [1, 0.64, 0.42]]];
    bv = clamp(bv, -0.3, 1.9);
    for (var i = 0; i < t.length - 1; i++) if (bv <= t[i + 1][0]) { var k = (bv - t[i][0]) / (t[i + 1][0] - t[i][0]); return lerp3(t[i][1], t[i + 1][1], k); }
    return t[t.length - 1][1];
  }

  // ── 2. shaders ──────────────────────────────────────────────────────────────
  var PREC = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  var NOISE = [
    'uniform float uOct;',
    'float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
    'float noise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);',
    ' return mix(mix(mix(hash(i),hash(i+vec3(1.,0.,0.)),f.x),mix(hash(i+vec3(0.,1.,0.)),hash(i+vec3(1.,1.,0.)),f.x),f.y),',
    '            mix(mix(hash(i+vec3(0.,0.,1.)),hash(i+vec3(1.,0.,1.)),f.x),mix(hash(i+vec3(0.,1.,1.)),hash(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}',
    'float fbm(vec3 p){float a=.5;float s=0.;float n=0.;for(int i=0;i<6;i++){if(float(i)>=uOct)break;s+=a*noise(p);n+=a;p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s/n;}',
    'float ringOp(float r){float o=0.0;',
    ' if(r>1.24&&r<1.53){o=(.13+.05*sin(r*157.0))*smoothstep(1.24,1.29,r);}',
    ' else if(r>=1.53&&r<1.95){o=.74+.14*sin(r*61.0)+.07*sin(r*233.0);o*=smoothstep(1.53,1.57,r);}',
    ' else if(r>=1.95&&r<2.03){o=.05;}',
    ' else if(r>=2.03&&r<2.27){o=.5+.09*sin(r*171.0);o*=smoothstep(.003,.009,abs(r-2.215));o*=1.0-smoothstep(2.245,2.27,r);}',
    ' return clamp(o,0.0,1.0);}'].join('\n');
  var VS_P = ['attribute vec3 aPos;attribute vec2 aUV;uniform mat4 uVP;uniform vec3 uC;uniform float uR;uniform mat3 uRot;',
    'varying vec3 vL;varying vec3 vW;varying vec3 vN;varying vec2 vUV;',
    'void main(){vUV=aUV;vL=aPos;vec3 n=uRot*aPos;vN=n;vec3 w=uC+n*uR;vW=w;gl_Position=uVP*vec4(w,1.0);}'].join('\n');
  // Corpos: com textura (padrão) ou procedural (enquanto a imagem não chegou).
  var FS_P = PREC + NOISE + ['',
    'varying vec3 vL;varying vec3 vW;varying vec3 vN;varying vec2 vUV;',
    'uniform float uType,uTime,uExp,uHasRing,uR,uAmb,uUseTex;uniform vec3 uCam,uC,uRingN,uTint;uniform vec4 uAtm;uniform sampler2D uTex,uTex2,uTex3;',
    'float gSpec=0.0;',
    'vec3 surf(vec3 q){gSpec=0.0;float lat=q.y;float alat=abs(lat);',
    ' if(uType<1.5){float n=fbm(q*4.0+2.0);return vec3(.46,.44,.42)*(.62+.6*n);}',
    ' if(uType<2.5){float s=fbm(q*vec3(1.6,5.5,1.6));return mix(vec3(.78,.62,.38),vec3(.97,.9,.72),s);}',
    ' if(uType<3.5){float h=fbm(q*1.9+vec3(3.1,1.7,7.3));float land=smoothstep(.505,.53,h);',
    '  vec3 c=mix(vec3(.02,.08,.22),vec3(.2,.26,.12),land);gSpec=1.0-land;return c;}',
    ' if(uType<4.5){float n=fbm(q*3.0+4.0);return mix(vec3(.55,.24,.12),vec3(.74,.42,.24),n);}',
    ' if(uType<6.5){float band=sin(lat*20.0+fbm(q*vec3(2.,8.,2.))*2.0);return mix(vec3(.93,.89,.81),vec3(.74,.58,.44),band*.5+.5);}',
    ' if(uType<7.5){return vec3(.6,.85,.88);}',
    ' return vec3(.18,.32,.78);}',
    'void main(){vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);vec3 L=normalize(-vW);vec3 q=normalize(vL);',
    ' if(uType<.5){float mu=max(dot(N,V),0.0);vec3 c;',
    '  if(uUseTex>.5){c=texture2D(uTex,vUV+vec2(uTime*.0015,0.)).rgb;c=mix(c,vec3(1.0,.86,.55),.38)*1.3;}',
    '  else{float g=fbm(q*6.0+vec3(uTime*.015,0.,uTime*.01));c=mix(vec3(1.0,.36,.06),vec3(1.0,.86,.5),clamp(g*1.4-.2,0.,1.));}',
    '  c*=.42+.75*pow(mu,.5);gl_FragColor=vec4(c*uTint*uExp*1.25,1.0);return;}',
    ' float ndl=dot(N,L);vec3 alb;vec3 emi=vec3(0.0);',
    ' if(uUseTex>.5){alb=texture2D(uTex,vUV).rgb;gSpec=0.0;',
    '  if(uType>2.5&&uType<3.5){vec3 nite=texture2D(uTex2,vUV).rgb;float cl=texture2D(uTex3,vUV+vec2(uTime*.0012,0.)).r;',
    '   float oc=smoothstep(.02,.12,alb.b-max(alb.r,alb.g)*.85);gSpec=oc*(1.0-cl);alb=mix(alb,vec3(1.0),cl*.9);',
    '   emi=nite*nite*(1.0-cl*.85)*smoothstep(.12,-.25,ndl)*1.5;}}',
    ' else{alb=surf(q);}',
    ' alb=pow(alb,vec3(2.2));float dif=max(ndl,0.0);float dist=length(vW);float I=1.9/(.55+.0068*dist*dist);',
    ' float sh=1.0;if(uHasRing>.5){float dn=dot(L,uRingN);if(abs(dn)>1e-4){float t=dot(uC-vW,uRingN)/dn;if(t>0.0){vec3 hp=vW+L*t;sh=1.0-ringOp(length(hp-uC)/uR)*.85;}}}',
    ' vec3 col=alb*(dif*I*sh*uTint+uAmb);vec3 H=normalize(L+V);col+=vec3(1.0,.93,.8)*pow(max(dot(N,H),0.0),80.0)*gSpec*.7*dif*I*sh;',
    ' float rim=pow(1.0-max(dot(N,V),0.0),2.5);col+=uAtm.rgb*rim*uAtm.a*smoothstep(-.25,.5,ndl)*.55*I;',
    ' col+=emi;col*=uExp;col=col/(1.0+col*.15);gl_FragColor=vec4(pow(col,vec3(.4545)),1.0);}'].join('\n');
  var VS_R = ['attribute vec2 aR;uniform mat4 uVP;uniform vec3 uC,uU,uV;uniform float uR,uIn,uOut;varying vec3 vW;varying float vRho;varying float vU;',
    'void main(){float rho=mix(uIn,uOut,aR.y);vRho=rho;vU=aR.y;vec3 w=uC+(uU*cos(aR.x)+uV*sin(aR.x))*rho*uR;vW=w;gl_Position=uVP*vec4(w,1.0);}'].join('\n');
  var FS_R = PREC + NOISE + ['',
    'varying vec3 vW;varying float vRho;varying float vU;uniform vec3 uC,uRingN,uTint;uniform float uR,uExp,uUseRT;uniform sampler2D uRT;',
    'void main(){vec4 rt=texture2D(uRT,vec2(vU,.5));float o=uUseRT>.5?rt.a:ringOp(vRho);if(o<.01)discard;vec3 L=normalize(-vW);float lit=.45+.55*abs(dot(uRingN,L));',
    ' vec3 pc=vW-uC;float b=dot(pc,L);float c=dot(pc,pc)-uR*uR;float disc=b*b-c;float sh=1.0;if(disc>0.0&&(-b-sqrt(disc))>0.0)sh=.06;',
    ' vec3 base=vRho<1.53?vec3(.42,.37,.32):(vRho<1.95?vec3(.84,.74,.58):vec3(.72,.64,.52));base*=.85+.15*sin(vRho*397.0);if(uUseRT>.5)base=rt.rgb;',
    ' float dist=length(vW);float I=1.9/(.55+.0068*dist*dist);vec3 col=pow(base,vec3(2.2))*lit*I*sh*uTint*uExp;col=col/(1.0+col*.15);',
    ' gl_FragColor=vec4(pow(col,vec3(.4545)),o*.92);}'].join('\n');
  var VS_G = 'attribute vec2 aQ;uniform mat4 uVP;uniform vec3 uC,uRt,uUp;uniform float uS;varying vec2 vQ;void main(){vQ=aQ;vec3 w=uC+(uRt*aQ.x+uUp*aQ.y)*uS;gl_Position=uVP*vec4(w,1.0);}';
  var FS_G = PREC + ['varying vec2 vQ;uniform float uK,uMode,uF,uPm;uniform vec3 uCol;uniform vec2 uSd;',
    'void main(){float r=length(vQ)*uK;if(r>uK)discard;vec3 c;',
    ' if(uMode<.5){float rr=max(r-1.0,0.0);float g=.9*exp(-rr*3.2)+.26*exp(-rr*.9)+.05*exp(-rr*.25);g*=1.0-smoothstep(uK*.75,uK,r);c=uCol*g;}',
    ' else{if(r<1.0)discard;float g=exp(-(r-1.0)*uF)*(1.0-smoothstep(1.0,uK,r));float lit=smoothstep(-.4,.85,dot(normalize(vQ),uSd));c=uCol*g*(.06+.94*lit);}',
    ' gl_FragColor=uPm>.5?vec4(c,max(c.r,max(c.g,c.b))):vec4(c,1.0);}'].join('\n');
  var VS_S = 'attribute vec3 aD;attribute vec4 aC;uniform mat4 uVP;uniform float uSc,uB;varying vec3 vC;void main(){gl_Position=uVP*vec4(aD*800.0,1.0);gl_PointSize=aC.a*uSc;vC=aC.rgb*uB;}';
  var FS_S = PREC + 'varying vec3 vC;void main(){vec2 p=gl_PointCoord*2.0-1.0;float d=dot(p,p);if(d>1.0)discard;gl_FragColor=vec4(vC*exp(-d*4.0),1.0);}';
  var VS_L = 'attribute vec3 aP;uniform mat4 uVP;uniform float uPs;void main(){gl_Position=uVP*vec4(aP,1.0);gl_PointSize=uPs;}';
  var FS_L = PREC + 'uniform vec4 uCol;void main(){gl_FragColor=uCol;}';
  var VS_K = 'attribute vec3 aPos;uniform mat4 uVP;varying vec3 vD;void main(){vD=aPos;gl_Position=uVP*vec4(aPos*700.0,1.0);}';
  var FS_K = PREC + 'varying vec3 vD;uniform mat3 uW2G;uniform sampler2D uSky;uniform float uB;void main(){vec3 g=uW2G*normalize(vD);float l=atan(g.y,g.x);float b=asin(clamp(g.z,-1.0,1.0));vec2 uv=vec2(.5-l/6.2831853,.5+b/3.1415927);gl_FragColor=vec4(texture2D(uSky,uv).rgb*uB,1.0);}';

  // ── estado global do motor ──────────────────────────────────────────────────
  var cv, gl, root = document.documentElement, base = '/cena/', versao = '', pasta = '1k';
  var PP, PR, PG, PS, PL, PK, esf, quad, anel, orbitas, cinturao, estrelas = null, W2G;
  var TX = {}, catalogo = null, ROTAS = {};
  var fx = 'full', sel = IDX.terra, geral = false, claro = false, desloc = [0, 0], expo = 1, faixa = 0.12, curv = 34,
      horaSim = null, dias = 0, w = 1, h = 1, dpr = 1, cam = null, tw = null, pos = [], lonP = [], telas = [],
      ultCam = null, degradou = false, fpsAcc = [], pend = true, rodando = false, ult = 0,
      metricas = { primeiroQuadro: null, comTextura: null };
  var KEY = 'nx-site-cena';

  function cria(tipo, src, erros) {
    var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { var m = gl.getShaderInfoLog(s); erros.push(m); console.error('Erro de shader:', m); }
    return s;
  }
  function prog(vs, fs, erros) {
    var p = gl.createProgram(); gl.attachShader(p, cria(gl.VERTEX_SHADER, vs, erros)); gl.attachShader(p, cria(gl.FRAGMENT_SHADER, fs, erros)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { var m = gl.getProgramInfoLog(p); erros.push(m); console.error('Erro de link:', m); }
    var u = {}, a = {}, i;
    for (i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { var nu = gl.getActiveUniform(p, i).name; u[nu] = gl.getUniformLocation(p, nu); }
    for (i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i++) { var na = gl.getActiveAttrib(p, i).name; a[na] = gl.getAttribLocation(p, na); }
    return { p: p, u: u, a: a };
  }
  function U(pr, n) { return pr.u[n] === undefined ? null : pr.u[n]; }
  function buf(dados, tipo) { var b = gl.createBuffer(); gl.bindBuffer(tipo || gl.ARRAY_BUFFER, b); gl.bufferData(tipo || gl.ARRAY_BUFFER, dados, gl.STATIC_DRAW); return b; }
  var habil = [];
  function attr(pr, nome, b, tam) { var l = pr.a[nome]; if (l === undefined || l < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, tam, gl.FLOAT, false, 0, 0); habil.push(l); }
  function solta() { habil.forEach(function (l) { gl.disableVertexAttribArray(l); }); habil = []; }

  function urlTextura(nome) { return base + 'texturas/' + pasta + '/' + nome + '.webp' + (versao ? '?v=' + versao : ''); }
  // Texturas como arquivos (cache imutável no servidor). Primeiro o que aparece; o resto depois.
  function textura(nome, mip) {
    if (TX[nome]) return TX[nome];
    var t = gl.createTexture(), o = { t: t, ok: false }, im = new Image();
    TX[nome] = o;
    im.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      var pot = (im.width & (im.width - 1)) === 0 && (im.height & (im.height - 1)) === 0;
      if (pot && mip) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
      else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, pot ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      o.ok = true; pend = true;
    };
    im.onerror = function () { console.error('Textura falhou:', nome); };
    im.src = urlTextura(nome);
    if (im.decode) { var carregar = im.onload; im.onload = null; im.decode().then(carregar, function () { carregar(); }); }
    return o;
  }
  function texturasDe(i) {
    var b = B[i], l = [b.n];
    if (b.n === 'terra') l.push('terra_noite', 'terra_nuvens', 'lua');
    if (b.ring) l.push('saturno_anel');
    return l;
  }
  function carregarTexturas(prioridade) {
    ['ceu', 'sol'].concat(prioridade).forEach(function (n) { textura(n, n !== 'ceu' && n !== 'saturno_anel'); });
    var fila = [];
    B.forEach(function (b, i) { texturasDe(i).forEach(function (n) { if (!TX[n] && fila.indexOf(n) < 0) fila.push(n); }); });
    var proxima = function () {
      if (!fila.length) return;
      if (tw) { setTimeout(proxima, 300); return; }          // espera o voo terminar
      var n = fila.shift(); textura(n, n !== 'saturno_anel');
      if (window.requestIdleCallback) requestIdleCallback(function () { setTimeout(proxima, 120); }, { timeout: 1500 });
      else setTimeout(proxima, 250);
    };
    setTimeout(proxima, 400);
  }
  /* Pré-aquece o cache do navegador (usado no login enquanto a senha é digitada). */
  function preCarregar() {
    var nomes = ['ceu', 'sol', 'terra', 'terra_noite', 'terra_nuvens', 'lua', 'marte', 'saturno', 'saturno_anel'];
    nomes.forEach(function (n) { var im = new Image(); im.src = urlTextura(n); });
  }

  function gerarEstrelas(nivel) {
    var D = [], C = [], lim = nivel === 'full' ? 6.6 : 5.5;
    if (catalogo) {
      for (var q = 0; q < catalogo.length; q += 4) {
        var mg = catalogo[q + 2]; if (mg > lim) continue;
        var wv = A.radec(catalogo[q], catalogo[q + 1]), cb = corBV(catalogo[q + 3]), br = clamp(1.25 - mg * 0.17, 0.1, 1.5);
        D.push(wv[0], wv[1], wv[2]); C.push(cb[0] * br, cb[1] * br, cb[2] * br, clamp(4.8 - mg * 0.62, 1.0, 7.0));
      }
    } else {
      BRILHANTES.forEach(function (s) { var wv = A.radec(s[0], s[1]), cb = corBV(s[3]), br = clamp(1.3 - s[2] * 0.25, 0.35, 1.7); D.push(wv[0], wv[1], wv[2]); C.push(cb[0] * br, cb[1] * br, cb[2] * br, clamp(5.6 - s[2] * 1.4, 2, 8.5)); });
    }
    return { d: buf(new Float32Array(D)), c: buf(new Float32Array(C)), n: D.length / 3 };
  }
  function carregarCatalogo() {
    if (!window.fetch) return;
    fetch(base + 'estrelas.json' + (versao ? '?v=' + versao : '')).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (arr) { if (arr && arr.length) { catalogo = arr; estrelas = gerarEstrelas(fx); pend = true; } })
      .catch(function () {});
  }

  function geometria() {
    esf = (function () {
      var LA = 48, LO = 72, p = [], uv = [], ix = [], i, j;
      for (i = 0; i <= LA; i++) { var th = Math.PI * i / LA; for (j = 0; j <= LO; j++) { var ph = TAU * j / LO; p.push(Math.sin(th) * Math.cos(ph), Math.cos(th), -Math.sin(th) * Math.sin(ph)); uv.push(0.5 + j / LO, i / LA); } }
      for (i = 0; i < LA; i++) for (j = 0; j < LO; j++) { var a = i * (LO + 1) + j, b = a + LO + 1; ix.push(a, b, a + 1, b, b + 1, a + 1); }
      return { vb: buf(new Float32Array(p)), uvb: buf(new Float32Array(uv)), ib: buf(new Uint16Array(ix), gl.ELEMENT_ARRAY_BUFFER), n: ix.length };
    })();
    quad = buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
    anel = (function () { var p = [], S = 240; for (var i = 0; i <= S; i++) { var a = TAU * i / S; p.push(a, 0, a, 1); } return { b: buf(new Float32Array(p)), n: (S + 1) * 2 }; })();
    orbitas = B.map(function (b) { var p = []; for (var i = 0; i < 200; i++) { var a = TAU * i / 200; p.push(b.orb * Math.cos(a), 0, -b.orb * Math.sin(a)); } return buf(new Float32Array(p)); });
    cinturao = (function () { var r = A.rnd(4242), p = []; for (var i = 0; i < 1600; i++) { var a = r() * TAU, rr = 6.6 + r() * 1.15 + (r() - 0.5) * 0.2, y = (r() + r() - 1) * 0.08; p.push(rr * Math.cos(a), y, -rr * Math.sin(a)); } return { b: buf(new Float32Array(p)), n: 1600 }; })();
  }

  // ── 3. níveis de efeito ─────────────────────────────────────────────────────
  function reduzirMovimento() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function layout() {
    w = innerWidth; h = innerHeight; dpr = Math.min(window.devicePixelRatio || 1, fx === 'full' ? 1.5 : 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  }
  function setFx(v) {
    fx = v; root.setAttribute('data-fx', v);
    // aviso para o resto do movimento (vida.js, Chart.js): vale também para a queda automática por FPS
    try { window.dispatchEvent(new CustomEvent('nexus:fx', { detail: { fx: v } })); } catch (e) { }
    estrelas = gerarEstrelas(v); layout();
    if (v === 'off') tw = null;
    pend = true;
  }

  // ── 4. câmera ───────────────────────────────────────────────────────────────
  function agoraSim() {
    var b = Date.now() + dias * 86400000;
    if (horaSim == null) return new Date(b);
    var d = new Date(b), hl = A.horaLocal(d);
    return new Date(b + (horaSim - hl) * 3600000);
  }
  function posicoes(d) { for (var i = 0; i < B.length; i++) { lonP[i] = A.lonHelio(B[i].n, d); var l = lonP[i] * D2R; pos[i] = [B[i].orb * Math.cos(l), 0, -B[i].orb * Math.sin(l)]; } }
  /* Enquadramento "pôr do sol": a câmera olha para o Sol (centro da tela) e fica acima do
     planeta na altura exata para que só a borda iluminada dele ocupe `faixa` da tela
     embaixo. `curv` = raio angular do planeta (maior = horizonte mais reto). Bisseção. */
  /* Visão geral (a home): o sistema inteiro visto de cima e de lado, o Sol fora do centro. */
  function alvoGeral() { return { th: 0.55, R: 21, H: 9.5, F: [0, 0, 0], sx: desloc[0], sy: desloc[1] - 0.1, fov: 46 }; }
  function alvoCam() {
    if (geral) return alvoGeral();
    var p = pos[sel], b = B[sel], u = norm([p[0], 0, p[2]]), rho = curv * D2R, Rc = b.pr / Math.sin(rho), tH = Math.tan(FOV_SISTEMA / 2 * D2R), alvo = -1 + 2 * faixa;
    function camEm(al) { return add(p, [u[0] * Rc * Math.cos(al), Rc * Math.sin(al), u[2] * Rc * Math.cos(al)]); }
    function limbo(al) { var C = camEm(al), ax = norm(scl(C, -1)), dp = norm(sub(p, C)), g = Math.acos(clamp(dot(ax, dp), -1, 1)); return -Math.tan(g - rho) / tH; }
    var lo = rho + 0.002, hi = 89 * D2R;
    for (var k = 0; k < 40; k++) { var m = (lo + hi) / 2; if (limbo(m) > alvo) lo = m; else hi = m; }
    var C = camEm((lo + hi) / 2);
    return { th: Math.atan2(C[2], C[0]), R: Math.hypot(C[0], C[2]), H: C[1], F: [0, 0, 0], sx: desloc[0], sy: desloc[1], fov: FOV_SISTEMA };
  }
  function camAgora(now) {
    var a = tw && tw.para ? tw.para : alvoCam();
    if (!tw) return a;
    var p = clamp((now - tw.t0) / tw.dur, 0, 1);
    if (p >= 1) { if (tw.para) return tw.para; tw = null; return a; }
    var e = ease(p), s = tw.de, bump = Math.sin(Math.PI * e) * (tw.arco === false ? 0 : 1), M = Math.max(s.R, a.R);
    var f = s.fov == null ? a.fov : s.fov;
    // FOV: abre mais cedo que o resto (a lente se abre antes de o voo terminar)
    var ef = tw.fovEase ? ease(clamp(p / 0.45, 0, 1)) : e;
    return { th: s.th + angR(a.th, s.th) * e, R: lerp(s.R, a.R, e) + bump * (1.2 + 0.2 * M), H: lerp(s.H, a.H, e) + bump * (0.9 + 0.24 * M),
      F: lerp3(s.F, a.F, e), sx: lerp(s.sx || 0, 0, e), sy: lerp(s.sy || 0, 0, e), fov: lerp(f, a.fov, ef), p: p };
  }
  function octPara(rpx) { var mx = fx === 'full' ? 6 : 4; return rpx > 140 ? mx : (rpx > 40 ? Math.min(mx, 4) : 2); }
  function telaDe(VP, p) {
    var x = VP[0] * p[0] + VP[4] * p[1] + VP[8] * p[2] + VP[12], y = VP[1] * p[0] + VP[5] * p[1] + VP[9] * p[2] + VP[13], ww = VP[3] * p[0] + VP[7] * p[1] + VP[11] * p[2] + VP[15];
    if (ww <= 0) return null;
    return { x: (x / ww * 0.5 + 0.5) * w, y: (1 - (y / ww * 0.5 + 0.5)) * h, w: ww };
  }
  function matrizes(c, fovGraus) {
    var eye = [c.R * Math.cos(c.th), c.H, c.R * Math.sin(c.th)], V = lookAt(eye, c.F, [0, 1, 0]), asp = w / h, n = 0.02, f = 3000,
        hH = n * Math.tan(fovGraus / 2 * D2R), hW = hH * asp,
        P = frustum(-hW + (c.sx || 0) * hW, hW + (c.sx || 0) * hW, -hH + (c.sy || 0) * hH, hH + (c.sy || 0) * hH, n, f);
    var Vr = new Float32Array(V); Vr[12] = Vr[13] = Vr[14] = 0;
    return { eye: eye, V: V, P: P, VP: mmul(P, V), VPr: mmul(P, Vr), rt: [V[0], V[4], V[8]], up: [V[1], V[5], V[9]] };
  }

  // ── 5. desenho ──────────────────────────────────────────────────────────────
  /* Mistura por alfa que também acerta o canal alfa do canvas (ele é transparente no tema claro). */
  function misturaAlfa() { gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
  function corpo(VP, eye, tint, tempo, c, r, rot, tipo, atm, oct, anelN, tx, ex) {
    var P = PP; gl.useProgram(P.p); var usa = !!(tx && tx.ok);
    gl.uniform1f(U(P, 'uUseTex'), usa ? 1 : 0); gl.uniform1i(U(P, 'uTex'), 0); gl.uniform1i(U(P, 'uTex2'), 1); gl.uniform1i(U(P, 'uTex3'), 2);
    if (usa) {
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ex && ex[0] && ex[0].ok ? ex[0].t : null);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ex && ex[1] && ex[1].ok ? ex[1].t : null);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx.t);
    }
    attr(P, 'aUV', esf.uvb, 2);
    gl.uniformMatrix4fv(U(P, 'uVP'), false, VP); gl.uniform3fv(U(P, 'uC'), c); gl.uniform1f(U(P, 'uR'), r); gl.uniformMatrix3fv(U(P, 'uRot'), false, rot);
    gl.uniform1f(U(P, 'uType'), tipo); gl.uniform1f(U(P, 'uTime'), tempo); gl.uniform1f(U(P, 'uOct'), oct);
    gl.uniform1f(U(P, 'uExp'), tipo === 0 ? Math.min(expo, 1.1) : expo); gl.uniform1f(U(P, 'uAmb'), claro ? 0.09 : 0.012);
    gl.uniform3fv(U(P, 'uCam'), eye); gl.uniform3fv(U(P, 'uTint'), tint); gl.uniform4fv(U(P, 'uAtm'), atm);
    gl.uniform1f(U(P, 'uHasRing'), anelN ? 1 : 0); gl.uniform3fv(U(P, 'uRingN'), anelN || [0, 1, 0]);
    attr(P, 'aPos', esf.vb, 3); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, esf.ib); gl.drawElements(gl.TRIANGLES, esf.n, gl.UNSIGNED_SHORT, 0); solta();
  }
  function ceuEEstrelas(m, alt, brilho) {
    if (TX.ceu && TX.ceu.ok) {
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.useProgram(PK.p);
      gl.uniformMatrix4fv(U(PK, 'uVP'), false, m.VPr); gl.uniformMatrix3fv(U(PK, 'uW2G'), false, W2G);
      gl.uniform1f(U(PK, 'uB'), brilho * 1.3 * (1 - 0.2 * ss(-6, 25, alt))); gl.uniform1i(U(PK, 'uSky'), 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, TX.ceu.t);
      attr(PK, 'aPos', esf.vb, 3); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, esf.ib); gl.drawElements(gl.TRIANGLES, esf.n, gl.UNSIGNED_SHORT, 0); solta();
    }
    if (!estrelas) estrelas = gerarEstrelas(fx);
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(PS.p);
    gl.uniformMatrix4fv(U(PS, 'uVP'), false, m.VPr); gl.uniform1f(U(PS, 'uSc'), dpr); gl.uniform1f(U(PS, 'uB'), 1 - 0.22 * ss(-6, 25, alt));
    attr(PS, 'aD', estrelas.d, 3); attr(PS, 'aC', estrelas.c, 4); gl.drawArrays(gl.POINTS, 0, estrelas.n); solta();
  }

  function desenharSistema(now, dt) {
    var d = agoraSim(), j = A.jd(d), hl = horaSim == null ? A.horaLocal(d) : horaSim, alt = A.altitude(d, hl);
    posicoes(d); cam = camAgora(now); ultCam = cam;
    // exposição automática: perto do Sol a câmera "fecha", longe ela "abre" (como o olho)
    var rS = geral ? 6 : B[sel].orb, Isel = 1.9 / (0.55 + 0.0068 * rS * rS), eAlvo = clamp(2.79 / Isel, 0.75, 1.8) * (claro ? 1.12 : 1);
    if (cam.flash) eAlvo *= cam.flash;
    expo += (eAlvo - expo) * (fx === 'off' ? 1 : 1 - Math.exp(-dt / 900));
    var m = matrizes(cam, cam.fov || FOV_SISTEMA), eye = m.eye, VP = m.VP;
    var morno = ss(-4, 30, alt), tint = [1, lerp(0.8, 0.97, morno), lerp(0.62, 0.92, morno)], tempo = now / 1000;
    gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, claro ? 0 : 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!claro) ceuEEstrelas(m, alt, 1);
    // órbitas e cinturão
    gl.enable(gl.DEPTH_TEST); gl.depthMask(false); gl.enable(gl.BLEND); misturaAlfa(); gl.useProgram(PL.p);
    gl.uniformMatrix4fv(U(PL, 'uVP'), false, VP); gl.uniform1f(U(PL, 'uPs'), 1.4 * dpr);
    for (var i = 0; i < B.length; i++) {
      var ac = hex(B[i].ac); gl.uniform4fv(U(PL, 'uCol'), i === sel && !geral ? [ac[0], ac[1], ac[2], claro ? 0.55 : 0.32] : (claro ? [0.07, 0.1, 0.14, 0.16] : [0.75, 0.8, 0.95, geral ? 0.14 : 0.075]));
      attr(PL, 'aP', orbitas[i], 3); gl.drawArrays(gl.LINE_LOOP, 0, 200); solta();
    }
    if (fx === 'full') { gl.uniform4fv(U(PL, 'uCol'), claro ? [0.32, 0.28, 0.24, 0.35] : [0.78, 0.72, 0.64, 0.32]); attr(PL, 'aP', cinturao.b, 3); gl.drawArrays(gl.POINTS, 0, cinturao.n); solta(); }
    // corpos sólidos
    gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(gl.CCW);
    var fpx = (h / 2) / Math.tan((cam.fov || FOV_SISTEMA) / 2 * D2R);
    var sunRot = A.base([0, 1, 0], null, (j * 24 / 609.1) * TAU), sd = Math.max(0.1, Math.hypot(eye[0], eye[1], eye[2])),
        angS = clamp(Math.asin(Math.min(0.99, SUNR / sd)), 2.6 * D2R, 6 * D2R), sunRv = sd * Math.sin(angS);
    corpo(VP, eye, tint, tempo, [0, 0, 0], sunRv, sunRot, 0, [0, 0, 0, 0], octPara(fpx * sunRv / sd), null, TX.sol);
    telas = [];
    for (i = 0; i < B.length; i++) {
      var b = B[i], c = pos[i], dist = Math.hypot(c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]) || 1, rpx = fpx * b.pr / dist, rot;
      // Terra gira pela HORA REAL (tempo sideral); os outros, pelo período de rotação.
      if (b.n === 'terra') { var G = A.gmst(j) * D2R, gw = A.e2w(A.eq2ecl([Math.cos(G), Math.sin(G), 0])); rot = A.base(b.poleW, gw, 0); }
      else rot = A.base(b.poleW, null, b.fase + TAU * ((j - 2451545) * 24 / b.per));
      corpo(VP, eye, tint, tempo, c, b.pr, rot, b.t, b.atm, octPara(rpx), b.ring ? b.poleW : null, TX[b.n], b.n === 'terra' ? [TX.terra_noite, TX.terra_nuvens] : null);
      var tl = telaDe(VP, c); if (tl) telas[i] = { x: tl.x, y: tl.y, r: Math.max(rpx, 9) };
    }
    // Lua: fase real, a mesma face sempre virada para a Terra
    var iT = IDX.terra, lm = (lonP[iT] + 180 + 360 * A.idadeLua(j)) * D2R, mp = add(pos[iT], [MOOND * Math.cos(lm), 0, -MOOND * Math.sin(lm)]);
    var md = Math.hypot(mp[0] - eye[0], mp[1] - eye[1], mp[2] - eye[2]) || 1;
    corpo(VP, eye, tint, tempo, mp, MOONR, A.base([0, 1, 0], norm(sub(pos[iT], mp)), 0), 1, [0, 0, 0, 0], octPara(fpx * MOONR / md), null, TX.lua);
    gl.disable(gl.CULL_FACE);
    // anéis de Saturno (com sombra do planeta)
    var S = B[IDX.saturno], nr = S.poleW, uu = norm(cross(nr, Math.abs(nr[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])), vv = cross(nr, uu);
    gl.enable(gl.BLEND); misturaAlfa(); gl.depthMask(false); gl.useProgram(PR.p);
    gl.uniformMatrix4fv(U(PR, 'uVP'), false, VP); gl.uniform3fv(U(PR, 'uC'), pos[IDX.saturno]); gl.uniform3fv(U(PR, 'uU'), uu); gl.uniform3fv(U(PR, 'uV'), vv);
    gl.uniform3fv(U(PR, 'uRingN'), nr); gl.uniform3fv(U(PR, 'uTint'), tint);
    var anOk = !!(TX.saturno_anel && TX.saturno_anel.ok);
    gl.uniform1f(U(PR, 'uR'), S.pr); gl.uniform1f(U(PR, 'uIn'), anOk ? 1.18 : 1.24); gl.uniform1f(U(PR, 'uOut'), anOk ? 2.34 : 2.27);
    gl.uniform1f(U(PR, 'uExp'), expo); gl.uniform1f(U(PR, 'uOct'), 1.0); gl.uniform1f(U(PR, 'uUseRT'), anOk ? 1 : 0); gl.uniform1i(U(PR, 'uRT'), 0);
    gl.activeTexture(gl.TEXTURE0); if (anOk) gl.bindTexture(gl.TEXTURE_2D, TX.saturno_anel.t);
    attr(PR, 'aR', anel.b, 2); gl.drawArrays(gl.TRIANGLE_STRIP, 0, anel.n); solta();
    // brilhos aditivos: halo do Sol (proporcional ao tamanho limitado) e atmosferas
    if (claro) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); else gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(PG.p); gl.uniformMatrix4fv(U(PG, 'uVP'), false, VP); gl.uniform1f(U(PG, 'uPm'), claro ? 1 : 0);
    gl.uniform3fv(U(PG, 'uRt'), m.rt); gl.uniform3fv(U(PG, 'uUp'), m.up); attr(PG, 'aQ', quad, 2);
    var Ks = clamp(Math.tan(36 * D2R) * Math.hypot(eye[0], eye[1], eye[2]) / sunRv, 2.2, 7);
    gl.uniform3fv(U(PG, 'uC'), [0, 0, 0]); gl.uniform1f(U(PG, 'uS'), sunRv * Ks); gl.uniform1f(U(PG, 'uK'), Ks); gl.uniform1f(U(PG, 'uMode'), 0);
    gl.uniform3fv(U(PG, 'uCol'), scl(tint, 0.95 * Math.min(expo, 1.1) * (0.6 + 0.4 * angS / (6 * D2R)))); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    for (i = 0; i < B.length; i++) {
      var at = B[i].atm; if (!at[3]) continue;
      var ds = norm(scl(pos[i], -1)), sd2 = [dot(ds, m.rt), dot(ds, m.up)], l2 = Math.hypot(sd2[0], sd2[1]) || 1;
      gl.uniform3fv(U(PG, 'uC'), pos[i]); gl.uniform1f(U(PG, 'uS'), B[i].pr * 1.6); gl.uniform1f(U(PG, 'uK'), 1.6); gl.uniform1f(U(PG, 'uMode'), 1); gl.uniform1f(U(PG, 'uF'), 9);
      gl.uniform3fv(U(PG, 'uCol'), scl([at[0], at[1], at[2]], at[3] * 0.55)); gl.uniform2fv(U(PG, 'uSd'), [sd2[0] / l2, sd2[1] / l2]); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    solta(); gl.depthMask(true); gl.disable(gl.BLEND);
  }

  // ── 6. laço, continuidade e API ─────────────────────────────────────────────
  function quadro(now) {
    if (!rodando) return;
    var dt = Math.min(100, now - ult);
    if (fx === 'reduced' && dt < 31) { requestAnimationFrame(quadro); return; }
    ult = now;
    if (document.visibilityState === 'visible' && (fx !== 'off' || pend || tw)) {
      desenharSistema(now, dt);
      pend = false;
      if (metricas.primeiroQuadro == null) { metricas.primeiroQuadro = Math.round(performance.now()); root.setAttribute('data-cena-viva', '1'); }
      if (metricas.comTextura == null && TX.sol && TX.sol.ok && (geral || (TX[B[sel].n] && TX[B[sel].n].ok))) {
        metricas.comTextura = Math.round(performance.now());
        root.setAttribute('data-cena-pronta', '1');
      }
    }
    // queda automática para Reduzido: média de quadro > 36 ms por ~150 quadros
    if (fx === 'full' && document.visibilityState === 'visible' && !degradou && !tw) {
      fpsAcc.push(dt); if (fpsAcc.length > 180) fpsAcc.shift();
      if (fpsAcc.length >= 150) { var m = fpsAcc.reduce(function (a, b) { return a + b; }, 0) / fpsAcc.length; if (m > 36) { degradou = true; setFx('reduced'); } }
    }
    requestAnimationFrame(quadro);
  }
  /* 'sol' = visão geral; qualquer outro nome = o planeta. A câmera voa da posição atual. */
  function selecionar(nome, opts) {
    opts = opts || {};
    var novoGeral = nome === 'sol', i = novoGeral ? sel : IDX[nome];
    if (i == null) return;
    if (i === sel && novoGeral === geral && cam && !opts.de) return;
    var de = opts.de || ultCam;
    sel = i; geral = novoGeral; root.style.setProperty('--pc', geral ? '#f5b041' : B[i].ac);
    var dur = opts.dur || (fx === 'full' ? 2400 : 1100);
    tw = (fx === 'off' || !de) ? null : { de: de, t0: performance.now(), dur: dur, fovEase: !!opts.fovEase, arco: opts.arco };
    pend = true;
  }
  function nomeAtual() { return geral ? 'sol' : B[sel].n; }
  function guardar() {
    try {
      var c = ultCam || cam; if (!c) return;
      sessionStorage.setItem(KEY, JSON.stringify({ planeta: nomeAtual(), cam: { th: c.th, R: c.R, H: c.H, F: c.F, sx: c.sx || 0, sy: c.sy || 0, fov: c.fov || FOV_SISTEMA }, t: Date.now() }));
    } catch (e) { /* sem sessionStorage: a próxima página só não continua o voo */ }
  }
  function lido() {
    try { var s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (s && Date.now() - s.t < 30 * 60000) return s; } catch (e) { }
    return null;
  }
  function alvoClique(x, y) {
    var best = null, bd = 1e9;
    for (var i = 0; i < telas.length; i++) { var t = telas[i]; if (!t || !ROTAS[B[i].n]) continue; var dd = Math.hypot(x - t.x, y - t.y); if (dd < t.r + 8 && dd < bd) { bd = dd; best = B[i].n; } }
    return best;
  }
  function lerTema() { claro = false; pend = true; }   // espaço escuro também no tema claro

  function iniciar(o) {
    o = o || {};
    cv = o.canvas; if (!cv) return null;
    base = o.base || base; versao = o.versao || ''; ROTAS = o.rotas || {}; desloc = o.desloc || desloc;
    fx = reduzirMovimento() ? 'off' : (o.fx || 'full');
    pasta = fx === 'full' ? '1k' : '512';
    gl = cv.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }) || cv.getContext('experimental-webgl', { alpha: true });
    if (!gl) { root.classList.add('nx-cena-sem-gl'); return null; }
    var erros = [];
    PP = prog(VS_P, FS_P, erros); PR = prog(VS_R, FS_R, erros); PG = prog(VS_G, FS_G, erros); PS = prog(VS_S, FS_S, erros);
    PL = prog(VS_L, FS_L, erros); PK = prog(VS_K, FS_K, erros);
    if (erros.length) { root.classList.add('nx-cena-sem-gl'); root.setAttribute('data-cena-erro', erros.join(' | ').slice(0, 300)); return null; }
    W2G = A.matW2G(); geometria(); root.setAttribute('data-fx', fx); layout(); lerTema();
    new MutationObserver(lerTema).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    var anterior = lido(), planeta = o.planeta || (anterior && anterior.planeta) || 'sol';
    geral = planeta === 'sol'; sel = geral ? IDX.terra : (IDX[planeta] == null ? IDX.terra : IDX[planeta]);
    root.style.setProperty('--pc', geral ? '#f5b041' : B[sel].ac);
    carregarTexturas(geral ? [] : texturasDe(sel)); carregarCatalogo();
    if (anterior && anterior.cam && fx !== 'off') {
      ultCam = anterior.cam;
      if (anterior.planeta !== planeta) selecionar(planeta, { de: anterior.cam });
    }
    // continuidade: ao sair da página, guarda planeta e câmera
    addEventListener('pagehide', guardar);
    addEventListener('resize', function () { layout(); pend = true; });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { pend = true; ult = performance.now(); } });
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); rodando = false; });
    rodando = true; ult = performance.now(); requestAnimationFrame(quadro);
    return API;
  }

  var API = {
    // setFx antes de a cena ligar só vale pelo localStorage (o menu já gravou): nada a fazer aqui
    iniciar: iniciar, selecionar: selecionar, setFx: function (v) { if (gl) { degradou = v !== 'full'; setFx(v); } }, guardar: guardar, alvoClique: alvoClique, preCarregar: preCarregar,
    planeta: nomeAtual, metricas: metricas, fx: function () { return fx; },
    emVoo: function () { return !!tw; }, pularVoo: function () { if (tw) { tw = null; pend = true; } }
  };
  window.NexusCena = API;

  /* Liga sozinho quando a página traz <canvas id="nx-cena" data-auto="1"> (ver quandoLivre). */
  function nivelSalvo() {
    if (reduzirMovimento()) return 'off';
    var v = ''; try { v = localStorage.getItem('nx-efeitos') || ''; } catch (e) { }
    if (v === 'desligado') return 'off';
    if (v === 'reduzido') return 'reduced';
    if (v === 'completo') return 'full';
    // sem escolha: celular/tela de toque começa em Reduzido (bateria e calor)
    return window.matchMedia && matchMedia('(max-width: 767px), (pointer: coarse)').matches ? 'reduced' : 'full';
  }
  function auto() {
    var c = document.getElementById('nx-cena');
    if (!c || !c.dataset.auto || c.dataset.ligada) return;
    c.dataset.ligada = '1';
    var rotas = {}; try { rotas = JSON.parse(c.dataset.rotas || '{}'); } catch (e) { }
    var desl = [0, 0]; try { desl = JSON.parse(c.dataset.desloc || '[0,0]'); } catch (e) { }
    var api = iniciar({ canvas: c, base: c.dataset.base, versao: c.dataset.versao, rotas: rotas, planeta: c.dataset.planeta || null,
                        fx: nivelSalvo(), desloc: desl });
    if (!api) return;
    // clicar num planeta (numa área VAZIA da página — nunca através de texto ou card) leva à página dele
    var vazio = function (el) { return !!(el && (el === document.body || el === document.documentElement || (el.hasAttribute && el.hasAttribute('data-cena-vazio')))); };
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || !vazio(e.target)) return;
      var p = alvoClique(e.clientX, e.clientY);
      if (p && ROTAS[p] && p !== nomeAtual()) { guardar(); location.href = ROTAS[p]; }
    });
    var pendC = false;
    document.addEventListener('mousemove', function (e) {
      if (pendC) return; pendC = true;
      requestAnimationFrame(function () {
        pendC = false;
        var p = vazio(e.target) ? alvoClique(e.clientX, e.clientY) : null;
        document.body.style.cursor = p && p !== nomeAtual() ? 'pointer' : '';
      });
    }, { passive: true });
  }
  /* Quando ligar: no primeiro sinal de uso (mexer o mouse, rolar, tecla) ou depois de 6 s parada.
     Montar a cena (compilar shaders, primeiro quadro) é o único trabalho pesado do site; feito no
     carregamento, ele disputava a tela com o conteúdo — e numa máquina sem placa de vídeo (como a
     do PageSpeed) virava mais de 1 s de travamento. Assim, quem só lê nunca espera pelo 3D.
     Mover o mouse e rolar não contam como interação no INP: ligar aqui não pesa nessa métrica. */
  function quandoLivre() {
    var feito = false, SINAIS = ['pointermove', 'scroll', 'wheel', 'keydown'];
    var vai = function () {
      if (feito) return; feito = true;
      SINAIS.forEach(function (ev) { removeEventListener(ev, vai, true); });
      if (window.requestIdleCallback) requestIdleCallback(auto, { timeout: 800 }); else setTimeout(auto, 50);
    };
    var armar = function () {
      SINAIS.forEach(function (ev) { addEventListener(ev, vai, { capture: true, passive: true }); });
      setTimeout(vai, 6000);
    };
    // quem veio de outra página do site com a cena já está usando o site: liga logo, e o voo
    // de um planeta para o outro continua sem esperar o mouse
    var comecar = lido() ? vai : armar;
    if (document.readyState === 'complete') comecar(); else addEventListener('load', comecar, { once: true });
  }
  quandoLivre();
})();