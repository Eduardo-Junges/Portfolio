/* Nexus & PJ — chegada depois da galáxia do login.
 *
 * Roda no <head>, antes da primeira pintura. Se o login deixou o sinal `nx-saindo-galaxia` (só um carimbo de
 * hora, sem dado nenhum), a página começa com uma camada preta e o ponto de luz do Sol no centro — o mesmo último
 * quadro do mergulho — e a estrela se abre num círculo que revela o painel já na cor do tema (CSS em vida.css).
 * Desligado/Reduzido/"reduzir movimento": a camada só esmaece em 200 ms.
 *
 * Também grava o nível de efeitos do usuário (só o NOME do nível) para a tela de entrada saber qual usar.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var nivel = root.getAttribute('data-efeitos') || '';
  // Redução AUTOMÁTICA (22/10/2026): não há botão de efeitos; o servidor manda sempre "completo" e aqui o navegador cai para
  // "reduzido" sozinho se o aparelho for fraco (pouca memória/núcleos) ou se o vida.js mediu quadros lentos nos últimos 7 dias.
  try {
    var fraco = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
    var lento = parseInt(localStorage.getItem('nx-auto-reduzido') || '0', 10) || 0;
    if (nivel === 'completo' && (fraco || (lento && Date.now() - lento < 7 * 86400000))) { nivel = 'reduzido'; root.setAttribute('data-efeitos', nivel); }
  } catch (e) { }
  try { if (nivel) localStorage.setItem('nx-efeitos', nivel); } catch (e) { }
  // chamado pelo vida.js quando mede quadros lentos: só um carimbo de hora e o NOME do nível (nunca valor de negócio)
  window.nxMarcarLento = function () { try { localStorage.setItem('nx-auto-reduzido', String(Date.now())); localStorage.setItem('nx-efeitos', 'reduzido'); } catch (e) { } };

  var carimbo = 0;
  try {
    carimbo = parseInt(sessionStorage.getItem('nx-saindo-galaxia') || '0', 10) || 0;
    sessionStorage.removeItem('nx-saindo-galaxia');            // usado uma vez só
  } catch (e) { }
  if (!carimbo || Date.now() - carimbo > 20000) return;       // sinal velho: ignora

  var calmo = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var suave = calmo || nivel === 'desligado' || nivel === 'reduzido';
  root.classList.add(suave ? 'nx-chegada-suave' : 'nx-chegando');

  function limpar() { root.classList.remove('nx-chegando', 'nx-chegada-suave'); }
  document.addEventListener('animationend', function (e) { if (e.animationName === 'nx-abre' || e.animationName === 'nx-esmaece') limpar(); });
  setTimeout(limpar, 2500);                                    // rede de segurança: a camada nunca fica
}());
