/* Nexus & PJ — "dados com vida" (versão discreta): brilho de borda dos cartões, contagem dos KPIs e entrada por rolagem.
 *
 * Regras (docs/pedidos/PEDIDO_GALAXIA_E_DADOS_COM_VIDA.md):
 *  1. O MOVIMENTO NÃO MENTE: o número final vem do servidor; aqui só se anima o texto que já está na tela e ele
 *     termina EXATAMENTE nele. Sem JS, o valor certo já aparece. Sem mola em valor/barra.
 *  2. NADA DE NÚMERO GUARDADO NO NAVEGADOR (PCs compartilhados): os KPIs contam a partir de zero só na primeira tela
 *     depois do login; guardamos apenas o SINAL "já contou" (sem valor), que o login e o "Sair" apagam.
 *  3. Níveis por usuário (<html data-efeitos>): completo = tudo; reduzido = sem contagem nem brilho; desligado =
 *     nada se mexe. "Reduzir movimento" do sistema vale como desligado.
 *  4. Só transform/opacity/máscara; tabela nunca se mexe; leitor de tela lê só o valor final.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var calmo = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var nivel = calmo ? 'desligado' : (root.getAttribute('data-efeitos') || 'completo');
  window.NexusVida = { nivel: function () { return nivel; } };
  if (nivel === 'desligado') return;

  // ── redução automática (22/10/2026): mede o tempo médio dos quadros logo depois de carregar; se passar de 36 ms
  //    (mesmo critério da galáxia do login), grava o carimbo por 7 dias e já cai para "reduzido" (CSS e gráficos seguem o atributo).
  if (nivel === 'completo') {
    window.addEventListener('load', function () {
      setTimeout(function () {
        var n = 0, t0 = 0;
        function quadro(t) {
          if (document.visibilityState !== 'visible') return;
          if (!t0) t0 = t;
          n++;
          if (n < 60) { requestAnimationFrame(quadro); return; }
          if ((t - t0) / (n - 1) > 36) {
            if (window.nxMarcarLento) window.nxMarcarLento();       // o carimbo (só a hora) é guardado pelo chegada.js
            root.setAttribute('data-efeitos', 'reduzido');
          }
        }
        requestAnimationFrame(quadro);
      }, 1500);
    });
  }

  // ── brilho da borda do cartão sob o cursor (só no Completo) ─────────────────────────────────
  if (nivel === 'completo') {
    var pendente = false, ultimo = null;
    document.addEventListener('pointermove', function (e) {
      ultimo = e;
      if (pendente) return; pendente = true;
      requestAnimationFrame(function () {
        pendente = false;
        var alvo = ultimo.target && ultimo.target.closest ? ultimo.target.closest('.card') : null;
        if (!alvo) return;
        var r = alvo.getBoundingClientRect();
        alvo.style.setProperty('--mx', (ultimo.clientX - r.left) + 'px');
        alvo.style.setProperty('--my', (ultimo.clientY - r.top) + 'px');
      });
    }, { passive: true });
  }

  // ── contagem dos KPIs: a partir de zero, só na primeira tela depois do login ────────────────
  var CHAVE = 'nx-contou';
  function jaContou() { try { return sessionStorage.getItem(CHAVE) === '1'; } catch (e) { return true; } }
  function marcarContou() { try { sessionStorage.setItem(CHAVE, '1'); } catch (e) { } }
  var RE_NUM = /(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)/;

  function fmt(v, casas, milhar) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas, useGrouping: milhar });
  }
  function contar(el) {
    var original = el.textContent, m = RE_NUM.exec(original);
    if (!m || document.visibilityState !== 'visible') return;     // aba oculta: o valor final já está na tela
    var textoNum = m[1], casas = textoNum.indexOf(',') >= 0 ? textoNum.length - textoNum.indexOf(',') - 1 : 0;
    var alvo = parseFloat(textoNum.replace(/\./g, '').replace(',', '.'));
    if (!isFinite(alvo) || alvo === 0) return;
    var milhar = textoNum.indexOf('.') >= 0, antes = original.slice(0, m.index), depois = original.slice(m.index + textoNum.length);
    // leitor de tela: lê só o valor final (o texto que anima fica escondido dele)
    el.textContent = '';
    var vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    var sr = document.createElement('span'); sr.className = 'nx-sr'; sr.textContent = original;
    el.appendChild(vis); el.appendChild(sr);
    var dur = 750, t0 = null, acabou = false;
    function fim() { if (acabou) return; acabou = true; el.textContent = original; }   // EXATAMENTE o texto do servidor
    function passo(agora) {
      if (acabou) return;
      if (t0 === null) t0 = agora;
      var p = Math.min(1, (agora - t0) / dur), e = 1 - Math.pow(1 - p, 3);   // desacelera, sem passar do valor
      vis.textContent = antes + fmt(alvo * e, casas, milhar) + depois;
      if (p < 1) requestAnimationFrame(passo); else fim();
    }
    // rede de segurança: se o navegador não desenhar quadros (aba em segundo plano), o valor certo aparece mesmo assim
    setTimeout(fim, dur + 600);
    document.addEventListener('visibilitychange', fim, { once: true });
    vis.textContent = antes + fmt(0, casas, milhar) + depois;
    requestAnimationFrame(passo);
  }

  // ── entrada por rolagem: cartões abaixo da dobra entram uma vez, ao aparecer ────────────────
  var temTimeline = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  function marcarEntradas() {
    var abaixo = [].slice.call(document.querySelectorAll('.body .card')).filter(function (c) {
      var r = c.getBoundingClientRect(); return r.top > window.innerHeight * 0.92 && !c.closest('.tbl-wrap');
    });
    if (temTimeline) { abaixo.forEach(function (c) { c.classList.add('vida-entra'); }); return; }
    if (!('IntersectionObserver' in window)) return;               // sem suporte: tudo já visível
    var io = new IntersectionObserver(function (itens) {
      itens.forEach(function (i) { if (i.isIntersecting) { i.target.classList.add('vida-visto'); io.unobserve(i.target); } });
    }, { threshold: 0.08 });
    abaixo.forEach(function (c) { c.classList.add('vida-pre'); io.observe(c); });
    setTimeout(function () { abaixo.forEach(function (c) { c.classList.add('vida-visto'); }); }, 6000);   // rede de segurança
  }

  function iniciar() {
    if (nivel === 'completo' && !jaContou()) {
      var kpis = document.querySelectorAll('.kpi-card .kpi-value');
      if (kpis.length) { kpis.forEach(contar); }
      marcarContou();                                                // só o sinal; nunca o valor
    }
    marcarEntradas();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

  // "Sair" apaga o sinal: o próximo login conta de novo
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.getAttribute && (f.getAttribute('action') || '') === '/logout') { try { sessionStorage.removeItem(CHAVE); } catch (x) { } }
  }, true);
}());
