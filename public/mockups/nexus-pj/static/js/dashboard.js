// Dashboard (Etapa 5) — gráficos em cima do Chart.js vendorizado (chart.umd.min.js).
// Não é porte do Nexus Analytics: os gráficos daqui são outros (saldo por conta,
// despesa por categoria, evolução mensal), então o JS foi escrito do zero pra eles,
// só reaproveitando a ideia geral (config injetada via window.<algo>, cor lida do
// tema atual via CSS custom property — nunca cor fixa, pra funcionar em claro/escuro
// sem duplicar lógica).
(function () {
  "use strict";
  const CFG = window.NXDASH;
  if (!CFG || typeof Chart === "undefined") return;

  const cor = (varName) => getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

  Chart.defaults.color = cor("--text-200");
  Chart.defaults.borderColor = cor("--overlay-3");
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;

  const moeda = (v) => "R$ " + Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  // ── "dados com vida" nos gráficos (16/10/2026) ─────────────────────────────────────────────────────────────────
  // O movimento não mente: a animação nunca passa do valor (sem mola) e o gráfico termina exatamente nos dados do servidor.
  // Nível por usuário em <html data-efeitos>; "reduzir movimento" do sistema vale como desligado.
  const calmo = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const nivel = calmo ? "desligado" : (document.documentElement.getAttribute("data-efeitos") || "completo");
  Chart.defaults.animation = nivel === "desligado" ? false : { duration: nivel === "reduzido" ? 280 : 800, easing: "easeOutCubic" };

  // Caixinha do valor ao passar o mouse (21/10/2026): é a "dica" do Nexus Analytics — um <div> HTML atualizado direto
  // no evento do mouse, sem animação. A caixinha desenhada no canvas pelo Chart.js dependia de requestAnimationFrame
  // para fazer o fade-in e, com a cena animada por cima, podia ficar presa em opacidade ~0 (nunca aparecia).
  Chart.defaults.plugins.tooltip.enabled = false;

  // formato dos números na tabela alternativa e no anúncio do teclado
  function formatoDe(canvas) {
    const id = (canvas && canvas.id) || "";
    if (/margem/.test(id)) return (v) => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
    if (/a-revisar/.test(id)) return (v) => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " lanç.";
    // zero não leva sinal ("-0,00" é ruído do float); negativo no mesmo estilo do resto do app
    return (v) => {
      const n = Math.abs(Number(v)) < 0.005 ? 0 : Number(v);
      return (n < 0 ? "− " : "") + "R$ " + Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
  }
  const vazio = (v) => v === null || v === undefined || (typeof v === "number" && !isFinite(v));
  const textoSeguro = (t) => document.createTextNode(String(t === undefined || t === null ? "" : t));

  // A dica do valor: título (rótulo do ponto) + uma linha por série, com a bolinha na cor dela. Os textos vêm dos mesmos
  // `tooltip.callbacks` que cada gráfico já define (label, title, afterBody), então o formato dos números não muda.
  const nxDica = {
    id: "nxDica",
    afterInit(chart) {
      const canvas = chart.canvas, caixa = canvas.parentElement;
      if (!caixa) return;
      const dica = document.createElement("div");
      dica.className = "nx-dica"; dica.setAttribute("aria-hidden", "true");
      caixa.appendChild(dica);
      chart._nxAtivos = [];

      const cbs = () => (chart.options.plugins && chart.options.plugins.tooltip && chart.options.plugins.tooltip.callbacks) || {};
      const lista = (v) => (v === null || v === undefined ? [] : Array.isArray(v) ? v : [v]).filter((t) => t !== null && t !== undefined && t !== "");
      function corDe(it) {
        const ds = it.dataset;
        for (const k of ["backgroundColor", "borderColor"]) {
          let c = ds[k];
          if (typeof c === "function") { try { c = c({ chart, dataIndex: it.dataIndex, datasetIndex: it.datasetIndex, dataset: ds, raw: it.raw, parsed: it.parsed }); } catch (e) { c = null; } }
          if (Array.isArray(c)) c = c[it.dataIndex];
          if (typeof c === "string" && c) return c;
        }
        return cor("--text-200");
      }
      function itens(els) {
        return els.map((e) => {
          const ds = chart.data.datasets[e.datasetIndex], meta = chart.getDatasetMeta(e.datasetIndex);
          const raw = ds.data[e.index];
          return { chart, dataset: ds, datasetIndex: e.datasetIndex, dataIndex: e.index, element: meta.data[e.index],
            label: (chart.data.labels || [])[e.index], parsed: meta.controller.getParsed(e.index), raw,
            formattedValue: raw === null || raw === undefined ? "" : String(raw) };
        });
      }
      function encher(its) {
        const cb = cbs(), linhas = [];
        const titulo = cb.title ? lista(cb.title(its)).join(" ") : (its[0].label === undefined ? "" : String(its[0].label));
        its.forEach((it) => {
          const txt = cb.label ? lista(cb.label(it)) : [(it.dataset.label ? it.dataset.label + ": " : "") + it.formattedValue];
          txt.forEach((t) => linhas.push({ c: corDe(it), t }));
        });
        const extra = cb.afterBody ? lista(cb.afterBody(its)) : [];
        if (!linhas.length && !extra.length) return false;
        dica.replaceChildren();
        if (titulo) { const t = document.createElement("div"); t.className = "nx-dica-t"; t.appendChild(textoSeguro(titulo)); dica.appendChild(t); }
        linhas.forEach((l) => {
          const li = document.createElement("div"); li.className = "nx-dica-l";
          const b = document.createElement("span"); b.className = "nx-dica-b"; b.style.background = l.c;
          li.appendChild(b); li.appendChild(textoSeguro(l.t)); dica.appendChild(li);
        });
        extra.forEach((t) => { const x = document.createElement("div"); x.className = "nx-dica-x"; x.appendChild(textoSeguro(t)); dica.appendChild(x); });
        return true;
      }
      // x, y: posição do ponteiro (ou do ponto, no teclado) em relação à caixa do gráfico
      function mostrar(els, x, y) {
        const lido = els.map((e) => ({ datasetIndex: e.datasetIndex, index: e.index }));
        const its = itens(lido);
        if (!its.length || !encher(its)) { ocultar(); return; }
        chart._nxAtivos = lido.map((e) => ({ datasetIndex: e.datasetIndex, index: e.index, element: chart.getDatasetMeta(e.datasetIndex).data[e.index] }));
        const w = dica.offsetWidth, h = dica.offsetHeight, largura = caixa.clientWidth;
        let esq = x + 14;
        if (esq + w > largura - 2) esq = Math.max(2, x - 14 - w);
        let topo = y - h - 12;
        if (topo < 2) topo = Math.min(y + 16, Math.max(2, caixa.clientHeight - h - 2));
        dica.style.transform = "translate(" + esq.toFixed(1) + "px," + topo.toFixed(1) + "px)";
        dica.classList.add("on");
        chart.draw();                                      // a linha de mira, sem esperar animação
      }
      function ocultar() {
        dica.classList.remove("on");
        if (chart._nxAtivos.length) { chart._nxAtivos = []; chart.draw(); }
      }
      chart._nxDica = { mostrar, ocultar };

      function aoMover(e) {
        const o = chart.options.interaction || {}, modo = o.mode || "nearest";
        const els = chart.getElementsAtEventForMode(e, modo, { intersect: modo === "index" ? o.intersect === true : o.intersect !== false, axis: o.axis || "x" }, true);
        if (!els.length) { ocultar(); return; }
        const rc = caixa.getBoundingClientRect();
        mostrar(els, e.clientX - rc.left, e.clientY - rc.top);
      }
      canvas.addEventListener("pointermove", aoMover);
      canvas.addEventListener("pointerdown", aoMover);
      canvas.addEventListener("pointerleave", ocultar);
    },
    afterDestroy(chart) { if (chart.canvas && chart.canvas.parentElement) { const d = chart.canvas.parentElement.querySelector(".nx-dica"); if (d) d.remove(); } },
  };
  Chart.register(nxDica);

  // linha de mira (linha vertical no ponto ativo) em gráficos de linha e de barra na vertical
  const nxMira = {
    id: "nxMira",
    beforeInit(chart) {
      const o = chart.config.options = chart.config.options || {};
      const tipo = chart.config.type;
      if ((tipo === "line" || (tipo === "bar" && o.indexAxis !== "y"))) {
        o.interaction = Object.assign({ mode: "index", intersect: false }, o.interaction || {});
      } else if (tipo === "bar" && o.indexAxis === "y") {
        o.interaction = Object.assign({ mode: "index", intersect: false, axis: "y" }, o.interaction || {});   // barras na horizontal
      }
      // a linha se desenha da esquerda para a direita (só no Completo; linear, sem passar do valor)
      if (tipo === "line" && nivel === "completo" && !o.animations) {
        const n = Math.max(2, ((chart.config.data && chart.config.data.labels) || []).length);
        const por = Math.min(60, 900 / n);
        const yAnterior = (ctx) => {
          if (ctx.index === 0) return ctx.chart.scales.y ? ctx.chart.scales.y.getPixelForValue(0) : undefined;
          return ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1].getProps(["y"], true).y;
        };
        o.animations = {
          x: { type: "number", easing: "linear", duration: por, from: NaN, delay(ctx) { if (ctx.type !== "data" || ctx.xStarted) return 0; ctx.xStarted = true; return ctx.index * por; } },
          y: { type: "number", easing: "linear", duration: por, from: yAnterior, delay(ctx) { if (ctx.type !== "data" || ctx.yStarted) return 0; ctx.yStarted = true; return ctx.index * por; } },
        };
      }
    },
    afterDatasetsDraw(chart) {
      const tipo = chart.config.type;
      if (tipo !== "line" && !(tipo === "bar" && chart.options.indexAxis !== "y")) return;
      const ativos = chart._nxAtivos || [];
      if (!ativos.length || !ativos[0].element || !chart.chartArea) return;
      const x = ativos[0].element.x, a = chart.chartArea, ctx = chart.ctx;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x, a.top); ctx.lineTo(x, a.bottom);
      ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.strokeStyle = cor("--line-strong") || cor("--text-mute");
      ctx.stroke(); ctx.restore();
    },
  };
  Chart.register(nxMira);

  // acessibilidade e leitura do dado: foco pelo teclado (← → Home End Esc), anúncio e "Ver como tabela"
  Chart.register({
    id: "nxLer",
    afterInit(chart) {
      const canvas = chart.canvas, caixa = canvas.closest(".chart-box");
      if (!caixa || caixa.dataset.nxLer) return;
      caixa.dataset.nxLer = "1";
      const cartao = caixa.closest(".card"), h2 = cartao && cartao.querySelector("h2");
      const titulo = (h2 && h2.textContent.trim()) || "Gráfico";
      canvas.setAttribute("tabindex", "0");
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", titulo + ". Use as setas esquerda e direita para ler cada ponto, ou abra a tabela.");
      const aviso = document.createElement("div");
      aviso.className = "nx-sr"; aviso.setAttribute("aria-live", "polite");
      caixa.insertAdjacentElement("afterend", aviso);

      const rotulos = () => (chart.data.labels || []);
      let idx = -1;
      function ir(novo) {
        const n = rotulos().length;
        if (!n) return;
        idx = Math.max(0, Math.min(n - 1, novo));
        const els = [];
        chart.data.datasets.forEach((d, di) => {
          if (chart.getDatasetMeta(di).hidden || vazio(d.data[idx])) return;
          els.push({ datasetIndex: di, index: idx });
        });
        if (!els.length) return;
        const pt = chart.getDatasetMeta(els[0].datasetIndex).data[idx];
        if (chart._nxDica) chart._nxDica.mostrar(els, pt.x + canvas.offsetLeft, pt.y + canvas.offsetTop);
        const fmt = formatoDe(canvas);
        aviso.textContent = String(rotulos()[idx]) + ": " + chart.data.datasets
          .filter((d, di) => els.some((e) => e.datasetIndex === di))
          .map((d) => (d.label ? d.label + " " : "") + fmt(d.data[idx])).join("; ");
      }
      canvas.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); ir(idx < 0 ? 0 : idx + 1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); ir(idx < 0 ? 0 : idx - 1); }
        else if (e.key === "Home") { e.preventDefault(); ir(0); }
        else if (e.key === "End") { e.preventDefault(); ir(rotulos().length - 1); }
        else if (e.key === "Escape") { idx = -1; if (chart._nxDica) chart._nxDica.ocultar(); aviso.textContent = ""; }
      });

      // "Ver como tabela": usa só os dados que o gráfico já recebeu (nada além do que o perfil já vê)
      const barra = document.createElement("div");
      barra.className = "nx-tabela-barra";
      const botao = document.createElement("button");
      botao.type = "button"; botao.className = "btn btn--ghost btn--sm"; botao.textContent = "Ver como tabela";
      botao.setAttribute("aria-expanded", "false");
      const area = document.createElement("div");
      area.className = "tbl-wrap nx-tabela"; area.hidden = true;
      barra.appendChild(botao);
      aviso.insertAdjacentElement("afterend", barra);
      barra.insertAdjacentElement("afterend", area);
      function montar() {
        const fmt = formatoDe(canvas), t = document.createElement("table"); t.className = "tbl";
        const cap = document.createElement("caption"); cap.className = "nx-sr"; cap.appendChild(textoSeguro(titulo)); t.appendChild(cap);
        const cab = document.createElement("tr");
        const th0 = document.createElement("th"); th0.appendChild(textoSeguro("Período / item")); cab.appendChild(th0);
        chart.data.datasets.forEach((d) => { const th = document.createElement("th"); th.className = "num"; th.appendChild(textoSeguro(d.label || "Valor")); cab.appendChild(th); });
        const thead = document.createElement("thead"); thead.appendChild(cab); t.appendChild(thead);
        const tb = document.createElement("tbody");
        rotulos().forEach((r, i) => {
          const tr = document.createElement("tr");
          const td0 = document.createElement("td"); td0.appendChild(textoSeguro(r)); tr.appendChild(td0);
          chart.data.datasets.forEach((d) => { const td = document.createElement("td"); td.className = "num"; td.appendChild(textoSeguro(vazio(d.data[i]) ? "—" : fmt(d.data[i]))); tr.appendChild(td); });
          tb.appendChild(tr);
        });
        t.appendChild(tb);
        area.replaceChildren(t);
      }
      botao.addEventListener("click", () => {
        const abrir = area.hidden;
        if (abrir) montar();
        area.hidden = !abrir;
        botao.setAttribute("aria-expanded", String(abrir));
        botao.textContent = abrir ? "Ocultar tabela" : "Ver como tabela";
      });
    },
  });

  function montarSaldoPorConta() {
    const el = document.getElementById("chart-saldo-conta");
    const d = CFG.saldo_por_conta;
    if (!el || !d || !d.labels.length) return;
    new Chart(el, {
      type: "bar",
      data: {
        labels: d.labels,
        datasets: [{
          data: d.valores,
          backgroundColor: d.valores.map((v) => (v >= 0 ? cor("--green") : cor("--red"))),
          borderRadius: 5,
          maxBarThickness: 34,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => moeda(ctx.parsed.x) } },
        },
        scales: { x: { ticks: { callback: moeda } } },
      },
    });
  }

  function montarDespesaPorCategoria() {
    const el = document.getElementById("chart-despesa-categoria");
    const d = CFG.despesa_por_categoria;
    if (!el || !d || !d.labels.length) return;
    new Chart(el, {
      type: "bar",
      data: {
        labels: d.labels,
        datasets: [{
          data: d.valores,
          backgroundColor: d.labels.map((nome) => (nome === "A revisar" ? cor("--amber") : cor("--red"))),
          borderRadius: 5,
          maxBarThickness: 28,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => moeda(ctx.parsed.x) } },
        },
        scales: { x: { ticks: { callback: moeda } } },
      },
    });
  }

  function montarEvolucaoMensal() {
    const el = document.getElementById("chart-evolucao-mensal");
    const d = CFG.evolucao_mensal;
    if (!el || !d || !d.labels.length) return;
    new Chart(el, {
      type: "bar",
      data: {
        labels: d.labels,
        datasets: [
          { label: "Receita", data: d.receita, backgroundColor: cor("--green"), borderRadius: 4, maxBarThickness: 22 },
          { label: "Despesa", data: d.despesa, backgroundColor: cor("--red"), borderRadius: 4, maxBarThickness: 22 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10 } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${moeda(ctx.parsed.y)}` } },
        },
        scales: { y: { ticks: { callback: moeda } } },
      },
    });
  }

  // 08/10/2026 — resultado por loja (receita × despesa), painel de Lojas.
  function montarResultadoPorLoja() {
    const el = document.getElementById("chart-resultado-loja");
    const d = CFG.resultado_por_loja;
    if (!el || !d || !d.labels.length) return;
    new Chart(el, {
      type: "bar",
      data: {
        labels: d.labels,
        datasets: [
          { label: "Receita", data: d.receita, backgroundColor: cor("--green"), borderRadius: 4, maxBarThickness: 26 },
          { label: "Despesa", data: d.despesa, backgroundColor: cor("--red"), borderRadius: 4, maxBarThickness: 26 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10 } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${moeda(ctx.parsed.y)}`,
              afterBody: (itens) => {
                const i = itens[0].dataIndex;
                return "Resultado: " + moeda(d.receita[i] - d.despesa[i]);
              },
            },
          },
        },
        scales: { y: { ticks: { callback: moeda } } },
      },
    });
  }

  // ── Painéis do hub (08/10/2026) ─────────────────────────────────────────────
  // Paleta das séries: cores do tema + variações, sempre lidas das CSS vars.
  const PALETA = () => ["--serie-1", "--serie-2", "--serie-3", "--serie-4", "--serie-5", "--serie-6", "--serie-7", "--serie-8"]
    .map(cor).filter(Boolean);

  function barraH(id, d, corFn, fmt) {
    fmt = fmt || moeda;
    const el = document.getElementById(id);
    if (!el || !d || !d.labels.length) return;
    new Chart(el, {
      type: "bar",
      data: { labels: d.labels, datasets: [{ data: d.valores, backgroundColor: d.labels.map(corFn), borderRadius: 5, maxBarThickness: 26 }] },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => fmt(ctx.parsed.x) } } },
        scales: { x: { ticks: { callback: fmt } } },
      },
    });
  }

  function rosca(id, d) {
    const el = document.getElementById(id);
    if (!el || !d || !d.labels.length) return;
    const pal = PALETA();
    const total = d.valores.reduce((a, b) => a + b, 0) || 1;
    new Chart(el, {
      type: "doughnut",
      data: { labels: d.labels, datasets: [{ data: d.valores, backgroundColor: d.labels.map((n, i) => (n === "A revisar" ? cor("--amber") : pal[i % pal.length])), borderWidth: 0 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "62%",
        plugins: {
          legend: { position: "right", labels: { boxWidth: 10, boxHeight: 10 } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${moeda(ctx.parsed)} (${((ctx.parsed / total) * 100).toFixed(1).replace(".", ",")}%)` } },
        },
      },
    });
  }

  function series(id, d, tipo, empilhado) {
    const el = document.getElementById(id);
    if (!el || !d || !d.labels.length || !d.series.length) return;
    const pal = PALETA();
    new Chart(el, {
      type: tipo,
      data: {
        labels: d.labels,
        datasets: d.series.map((s, i) => ({
          label: s.nome, data: s.valores,
          backgroundColor: s.nome === "A revisar" ? cor("--amber") : pal[i % pal.length],
          borderColor: s.nome === "A revisar" ? cor("--amber") : pal[i % pal.length],
          borderRadius: tipo === "bar" ? 3 : 0, maxBarThickness: 34, tension: 0.25, spanGaps: true,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10 } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${moeda(ctx.parsed.y)}` } },
        },
        scales: { x: { stacked: empilhado }, y: { stacked: empilhado, ticks: { callback: moeda } } },
      },
    });
  }

  function montarFluxoDiario() {
    const el = document.getElementById("chart-fluxo-diario");
    const d = CFG.fluxo_diario;
    if (!el || !d || !d.labels.length) return;
    const ds = [
      { type: "bar", label: "Entradas", data: d.entradas, backgroundColor: cor("--green"), borderRadius: 3, maxBarThickness: 16, yAxisID: "y" },
      { type: "bar", label: "Saídas", data: d.saidas.map((v) => -v), backgroundColor: cor("--red"), borderRadius: 3, maxBarThickness: 16, yAxisID: "y" },
    ];
    const comSaldo = d.saldo && d.saldo.some((v) => v !== null);
    if (comSaldo) {
      ds.push({ type: "line", label: "Saldo no fim do dia", data: d.saldo, borderColor: cor("--cyan"), backgroundColor: cor("--cyan"), pointRadius: 0, tension: 0.2, yAxisID: "y2", spanGaps: true });
    }
    new Chart(el, {
      data: { labels: d.labels, datasets: ds },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10 } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${moeda(Math.abs(ctx.parsed.y))}` } },
        },
        scales: {
          x: { stacked: true },
          y: { stacked: true, ticks: { callback: (v) => moeda(Math.abs(v)) } },
          ...(comSaldo ? { y2: { position: "right", grid: { drawOnChartArea: false }, ticks: { callback: moeda } } } : {}),
        },
      },
    });
  }

  function montarEvolucaoMargem() {
    const el = document.getElementById("chart-evolucao-margem");
    const d = CFG.evolucao_margem;
    if (!el || !d || !d.labels.length) return;
    new Chart(el, {
      type: "line",
      data: { labels: d.labels, datasets: [{ label: "Margem", data: d.valores, borderColor: cor("--green"), backgroundColor: cor("--green"), tension: 0.25, spanGaps: true }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ctx.parsed.y.toFixed(1).replace(".", ",") + "%" } } },
        scales: { y: { ticks: { callback: (v) => v + "%" } } },
      },
    });
  }

  function montarDiaSemana() {
    const el = document.getElementById("chart-dia-semana");
    const d = CFG.dia_semana;
    if (!el || !d || !d.labels.length) return;
    new Chart(el, {
      type: "bar",
      data: { labels: d.labels, datasets: [{ data: d.valores, backgroundColor: cor("--green"), borderRadius: 5, maxBarThickness: 34 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => "média: " + moeda(ctx.parsed.y) } } },
        scales: { y: { ticks: { callback: moeda } } },
      },
    });
  }

  function montarProjecao() {
    const el = document.getElementById("chart-projecao");
    const d = CFG.projecao;
    if (!el || !d || !d.labels.length) return;
    const datasets = [{ label: "Saldo previsto", data: d.saldo, borderColor: cor("--blue"), backgroundColor: cor("--blue"), tension: 0.2 }];
    if (d.colchao > 0) {
      datasets.push({ label: "Colchão mínimo", data: d.labels.map(() => d.colchao), borderColor: cor("--amber"), borderDash: [6, 4], pointRadius: 0 });
    }
    new Chart(el, {
      type: "line",
      data: { labels: d.labels, datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: d.colchao > 0 }, tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ": " + moeda(ctx.parsed.y) } } },
        scales: { y: { ticks: { callback: moeda } } },
      },
    });
  }

  // ── Painel Resultado (DRE) ──────────────────────────────────────────────────
  function montarMargensDre() {
    const el = document.getElementById("chart-dre-margens");
    const d = CFG.dre_margens;
    if (!el || !d || !d.labels.length) return;
    const pal = PALETA();
    new Chart(el, {
      type: "line",
      data: { labels: d.labels, datasets: d.series.map((s, i) => ({ label: s.nome, data: s.valores, borderColor: pal[i % pal.length], backgroundColor: pal[i % pal.length], tension: 0.25, spanGaps: true })) },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10 } }, tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ": " + (ctx.parsed.y == null ? "—" : ctx.parsed.y.toFixed(1).replace(".", ",") + "%") } } },
        scales: { y: { ticks: { callback: (v) => v + "%" } } },
      },
    });
  }
  series("chart-dre-evolucao", CFG.dre_evolucao, "bar", false);
  montarMargensDre();
  (function () {                                   // composição: verde o que entra, vermelho o que sai
    const d = CFG.dre_composicao;
    barraH("chart-dre-composicao", d, (rot) => (d.valores[d.labels.indexOf(rot)] >= 0 ? cor("--green") : cor("--red")));
  })();
  rosca("chart-dre-despesas", CFG.dre_despesas);
  series("chart-saldo-mensal", CFG.saldo_mensal, "line", false);

  montarProjecao();
  montarFluxoDiario();
  montarEvolucaoMargem();
  montarDiaSemana();
  barraH("chart-a-revisar", CFG.a_revisar_por_conta && { labels: CFG.a_revisar_por_conta.labels, valores: CFG.a_revisar_por_conta.valores }, () => cor("--amber"),
    (v) => Number(v).toLocaleString("pt-BR") + " lanç.");
  barraH("chart-despesa-sub", CFG.despesa_sub, () => cor("--red"));
  rosca("chart-receita-rosca", CFG.receita_origem_rosca);
  rosca("chart-participacao-loja", CFG.participacao_loja);
  rosca("chart-fixa-variavel", CFG.fixa_variavel);
  series("chart-evolucao-origem", CFG.evolucao_origem, "bar", true);
  series("chart-evolucao-grupo", CFG.evolucao_grupo, "bar", true);
  series("chart-evolucao-loja", CFG.evolucao_loja, "line", false);
  montarSaldoPorConta();
  montarResultadoPorLoja();
  montarDespesaPorCategoria();
  montarEvolucaoMensal();
})();
