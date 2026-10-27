/* Aba DRE: abre e fecha as camadas (linha → grupo → subcategoria → lançamentos). Os lançamentos vêm do servidor
 * só quando se abre a subcategoria. Cada ▸ é um botão: Tab chega nele e Enter abre. */
(function () {
  var t = document.getElementById("dre-tabela");
  if (!t) return;

  function filhos(id) { return t.querySelectorAll('tr[data-pai="' + id + '"]'); }
  function botao(tr) { return tr.querySelector(".dre-tg[aria-expanded]"); }
  function marca(tr, aberto) { var b = botao(tr); if (b) b.setAttribute("aria-expanded", aberto ? "true" : "false"); }

  function fecha(tr) {
    marca(tr, false);
    filhos(tr.dataset.id).forEach(function (f) { f.hidden = true; fecha(f); });
  }

  function aviso(tr, texto) {
    var td = document.createElement("td");
    td.colSpan = 99; td.className = "dre-nome dre-mais"; td.textContent = texto;
    var nova = document.createElement("tr"); nova.className = "dre-lanc"; nova.dataset.pai = tr.dataset.id;
    nova.appendChild(td); tr.insertAdjacentElement("afterend", nova);
    setTimeout(function () { nova.remove(); }, 4000);
  }

  function abre(tr) {
    var id = tr.dataset.id;
    if (tr.dataset.cat !== undefined && !tr.dataset.carregado) {       // folha: busca os lançamentos
      tr.dataset.carregado = "1";
      marca(tr, true);
      var url = "/dashboard/dre/lancamentos?categoria=" + tr.dataset.cat + "&nivel=" + tr.dataset.nivel +
                "&pai=" + encodeURIComponent(id) + "&" + t.dataset.qs;
      fetch(url, { credentials: "same-origin" }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      }).then(function (html) {
        tr.insertAdjacentHTML("afterend", html);
      }).catch(function () {
        delete tr.dataset.carregado;
        marca(tr, false);
        aviso(tr, "Não foi possível carregar os lançamentos. Tente de novo.");
      });
      return;
    }
    marca(tr, true);
    filhos(id).forEach(function (f) { f.hidden = false; });
  }

  t.addEventListener("click", function (e) {
    var b = e.target.closest(".dre-tg[aria-expanded]");
    if (!b) return;
    var tr = b.closest("tr");
    if (b.getAttribute("aria-expanded") === "true") fecha(tr); else abre(tr);
  });

  document.getElementById("dre-expandir").addEventListener("click", function () {
    var mudou = true, guarda = 0;                                      // desce nível a nível, até a subcategoria
    while (mudou && guarda++ < 8) {
      mudou = false;
      t.querySelectorAll("tr[data-id]").forEach(function (tr) {
        var b = botao(tr);
        if (!tr.hidden && b && tr.dataset.cat === undefined && b.getAttribute("aria-expanded") === "false") {
          marca(tr, true);
          filhos(tr.dataset.id).forEach(function (f) { f.hidden = false; });
          mudou = true;
        }
      });
    }
  });

  document.getElementById("dre-recolher").addEventListener("click", function () {
    t.querySelectorAll("tr[data-id]:not([data-pai])").forEach(fecha);
  });
})();
