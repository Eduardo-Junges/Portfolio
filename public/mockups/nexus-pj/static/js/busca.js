/* Busca universal do campo do topo (20/10/2026): pesquisa em qualquer parte do painel (valor, nome, data) ou pergunta para a IA.
 *
 * - enquanto digita, abre uma lista com o que achou (GET /busca/previa, só leitura, sem guardar nada no navegador);
 * - Enter: abre os resultados completos (/busca) — ou, se o texto parece uma pergunta, vai para a IA;
 * - Ctrl+Enter: sempre pergunta para a IA; ↑ ↓ escolhem um item; Esc fecha; "/" ou Ctrl+K focam o campo.
 * A pergunta para a IA segue o caminho de sempre: guarda em sessionStorage só até a tela do Assistente abrir. */
(function () {
  "use strict";
  var inp = document.getElementById("buscaInput");
  var painel = document.getElementById("buscaPainel");
  if (!inp || !painel) return;
  var podeIa = inp.getAttribute("data-ia") === "1";
  var timer = null, ctrl = null, ativo = -1;

  function itens() { return painel.querySelectorAll(".busca-item"); }
  function marca() {
    var todos = itens();
    for (var i = 0; i < todos.length; i++) todos[i].classList.toggle("ativo", i === ativo);
    if (ativo >= 0 && todos[ativo].scrollIntoView) todos[ativo].scrollIntoView({ block: "nearest" });
  }
  function abrir() { painel.hidden = false; inp.setAttribute("aria-expanded", "true"); }
  function fechar() {
    clearTimeout(timer);
    if (ctrl && ctrl.abort) ctrl.abort();                  // resposta em voo não reabre o painel depois de fechado
    painel.hidden = true; inp.setAttribute("aria-expanded", "false"); ativo = -1; marca();
  }
  function normaliza(t) { return (t || "").replace(/\s+/g, " ").trim().slice(0, 120); }
  function perguntarIa(q) {
    q = (q || "").trim();
    if (!q || !podeIa) return;
    try { sessionStorage.setItem("nx-pergunta-pendente", q); } catch (e) { }
    window.location.href = "/assistente";
  }
  function carregar(q) {
    if (ctrl && ctrl.abort) ctrl.abort();
    ctrl = window.AbortController ? new AbortController() : null;
    fetch("/busca/previa?q=" + encodeURIComponent(q), { credentials: "same-origin", signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        if (r.redirected || !r.ok) {                       // sessão expirada: o servidor manda para o login, que não é um resultado
          if (r.redirected) window.location.href = "/login";
          throw new Error(r.status);
        }
        return r.text();
      })
      .then(function (html) {
        if (normaliza(inp.value) !== normaliza(q)) return;  // o texto mudou enquanto a resposta vinha
        painel.innerHTML = html; ativo = -1; abrir();
      })
      .catch(function () { /* sem lista: o Enter ainda abre a página de resultados */ });
  }

  inp.addEventListener("input", function () {
    clearTimeout(timer);
    var q = inp.value.trim();
    if (!q) { fechar(); return; }
    timer = setTimeout(function () { carregar(q); }, 220);
  });
  inp.addEventListener("focus", function () { if (inp.value.trim() && painel.innerHTML) abrir(); });

  inp.addEventListener("keydown", function (e) {
    var todos = itens();
    if (e.key === "ArrowDown") { e.preventDefault(); if (painel.hidden && inp.value.trim()) carregar(inp.value.trim()); ativo = Math.min(todos.length - 1, ativo + 1); marca(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); ativo = Math.max(-1, ativo - 1); marca(); }
    else if (e.key === "Escape") { if (!painel.hidden) { e.preventDefault(); fechar(); } else { inp.blur(); } }
    else if (e.key === "Enter") {
      var q = inp.value.trim();
      if (!q) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) { perguntarIa(q); return; }
      if (ativo >= 0 && todos[ativo]) {
        if (todos[ativo].classList.contains("busca-item-ia")) perguntarIa(q); else window.location.href = todos[ativo].getAttribute("href");
        return;
      }
      var lista = painel.querySelector(".busca-lista");
      // só confia em "é pergunta" se a lista foi montada para ESTE texto (senão, vale a busca)
      if (podeIa && lista && lista.getAttribute("data-pergunta") === "1" && lista.getAttribute("data-q") === normaliza(q)) perguntarIa(q);
      else window.location.href = "/busca?q=" + encodeURIComponent(q);
    }
  });

  painel.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest(".busca-item-ia") : null;
    if (a) { e.preventDefault(); perguntarIa(inp.value); }
  });
  document.addEventListener("click", function (e) { if (!painel.hidden && !e.target.closest(".busca-wrap")) fechar(); });

  // atalhos: "/" e Ctrl+K focam o campo (menos quando já se está digitando em outro campo)
  document.addEventListener("keydown", function (e) {
    var el = document.activeElement, digitando = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
    if ((e.key === "/" && !digitando && !e.ctrlKey && !e.metaKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault(); inp.focus(); inp.select();
    }
  });

  // na página de resultados o campo já vem com o que foi procurado; o botão "Perguntar à IA" leva o mesmo texto
  if (window.location.pathname === "/busca") {
    var q0 = new URLSearchParams(window.location.search).get("q");
    if (q0) inp.value = q0;
  }
  var btn = document.getElementById("buscaPerguntarIa");
  if (btn) btn.addEventListener("click", function (e) { e.preventDefault(); perguntarIa(btn.getAttribute("data-q")); });
})();
