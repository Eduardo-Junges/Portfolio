/* Nexus & PJ — entrada animada (login e 2º fator).
 *
 * Melhoria progressiva: sem este script (ou sem JS) o formulário faz o POST normal e tudo funciona igual.
 * Com ele, o envio vai por fetch e:
 *   • erro de senha/código → a mensagem aparece no cartão, sem recarregar a página;
 *   • o login pede outra etapa (2º fator, troca de senha, aparelho) → navega normal e a galáxia continua girando;
 *   • login CONCLUÍDO → o cartão some, a câmera mergulha até o Sol (~1,3 s) e a navegação sai JUNTO com o mergulho
 *     (a espera é o maior dos dois tempos, não a soma). Se a página nova ainda não chegou quando o mergulho acaba,
 *     aparece "Abrindo o painel…".
 * "Reduzir movimento"/Desligado/sem WebGL: o cartão esmaece em 200 ms e a página abre.
 *
 * O servidor decide tudo: a resposta JSON carrega o MESMO destino que a redireção teria. Isto aqui só segue o destino
 * (e só se for um caminho interno). Nada do dono aparece antes de entrar.
 */
(function () {
  'use strict';
  var form = document.querySelector('form[data-galaxia-login]');
  if (!form) return;
  var root = document.documentElement, card = document.querySelector('.auth-glass') || form;
  var calmo = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var abrindo = document.getElementById('au-abrindo');
  var enviando = false, indo = false;
  // etapas do login que NÃO são a entrada no painel
  var ETAPAS = ['/login', '/login/2fa', '/trocar-senha', '/aparelho-pendente'];

  function fxAtual() {
    if (calmo) return 'off';
    return (window.NexusGalaxia && window.NexusGalaxia.fx) ? window.NexusGalaxia.fx() : 'off';
  }
  function caminhoSeguro(d) { return typeof d === 'string' && d.charAt(0) === '/' && d.charAt(1) !== '/' && d.charAt(1) !== '\\'; }
  function semQuery(d) { return d.replace(/[?#].*$/, ''); }

  function areaDeErro() {
    var el = card.querySelector('.flash--erro');
    if (!el) {
      el = document.createElement('div');
      el.className = 'flash flash--erro'; el.setAttribute('role', 'alert');
      var titulo = card.querySelector('.sub') || card.querySelector('h1');
      if (titulo && titulo.parentNode) titulo.parentNode.insertBefore(el, titulo.nextSibling); else card.insertBefore(el, form);
    }
    return el;
  }
  function mostrarErro(msg) {
    var el = areaDeErro();
    el.textContent = '⚠ ' + msg; el.hidden = false;
    if (!calmo) { card.classList.remove('au-treme'); void card.offsetWidth; card.classList.add('au-treme'); }
  }
  card.addEventListener('animationend', function (e) { if (e.animationName === 'au-treme') card.classList.remove('au-treme'); });
  var erroInicial = card.querySelector('.flash--erro');
  if (erroInicial && erroInicial.textContent.trim() && !calmo) card.classList.add('au-treme');

  function mostrarAbrindo() {
    if (!abrindo || !abrindo.hidden) return;
    abrindo.hidden = false;
    requestAnimationFrame(function () { abrindo.classList.add('on'); });
  }
  function navegar(destino, deixaSinal) {
    if (indo) return; indo = true;
    if (deixaSinal) { try { sessionStorage.setItem('nx-saindo-galaxia', String(Date.now())); } catch (e) { } }
    location.href = destino;
  }
  function entrar(destino) {
    var fx = fxAtual();
    root.classList.add('au-entrando');
    card.classList.add('au-some');
    if (fx === 'off' || !window.NexusGalaxia) {                 // corte direto, com esmaecimento
      setTimeout(function () { navegar(destino, true); }, 200);
      setTimeout(mostrarAbrindo, 900);
      return;
    }
    var chegou = false;                                          // 2. a navegação sai JUNTO com o mergulho
    window.NexusGalaxia.mergulhar(function () { chegou = true; setTimeout(function () { if (!document.hidden) mostrarAbrindo(); }, 150); });
    navegar(destino, true);
    setTimeout(function () { if (!chegou) mostrarAbrindo(); }, 1700);
  }

  form.addEventListener('submit', function (e) {
    if (!window.fetch || !window.FormData || enviando) return;   // sem fetch: POST normal
    e.preventDefault(); enviando = true;
    var botao = form.querySelector('button[type=submit]');
    if (botao) botao.disabled = true;
    fetch(form.getAttribute('action') || location.pathname, {
      method: 'POST', body: new FormData(form), credentials: 'same-origin',
      headers: { 'X-Nexus-Fetch': '1', 'Accept': 'application/json' },
    }).then(function (r) { return r.json(); }).then(function (j) {
      var destino = j && j.destino;
      if (!caminhoSeguro(destino)) throw new Error('resposta inesperada');
      var base = semQuery(destino);
      var qs = destino.indexOf('?') >= 0 ? new URLSearchParams(destino.split('?')[1].split('#')[0]) : null;
      if (qs && qs.get('erro') && ETAPAS.indexOf(base) >= 0 && base === semQuery(form.getAttribute('action') || location.pathname)) {
        mostrarErro(qs.get('erro'));                              // mesma tela com erro: fica aqui
        enviando = false; if (botao) botao.disabled = false;
        var campo = form.querySelector('input[type=password], input[name=codigo]'); if (campo) { campo.value = ''; campo.focus(); }
        return;
      }
      if (ETAPAS.indexOf(base) >= 0) { navegar(destino, false); return; }   // outra etapa: a galáxia continua
      entrar(destino);                                                      // painel: mergulho
    }).catch(function () {
      form.submit();                                              // qualquer imprevisto: o POST normal resolve
    });
  });
}());
