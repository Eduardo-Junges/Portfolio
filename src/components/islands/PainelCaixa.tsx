import { useMemo, useState } from 'react';
import {
  contasDemo,
  categoriasDemo,
  movimentosDemo,
  competenciaDemo,
} from '../../data/caixaDemo';

/**
 * Reconstrução do mockup do Nexus & PJ, com dados fictícios.
 *
 * O mockup original (docs/mockup/mockup_fluxo_caixa.html) usa a empresa onde o
 * Eduardo trabalha como exemplo: nome no cabeçalho, e-mail corporativo no menu
 * do usuário, os bancos reais e valores de saldo. **Nada disso está aqui.**
 * O que foi preservado é o que interessa a quem olha o projeto: a estrutura de
 * navegação, o design system (preto neutro, cartão com highlight interno), os
 * quatro indicadores, as abas Realizado/Planejado, a linha de filtros e a
 * tabela com saldo corrente.
 *
 * Dois detalhes vieram do mockup de propósito e não são bug:
 *
 *  - o KPI "Saldo projetado (30d)" aparece **vazio**, com a origem declarada
 *    como pendente. É assim no original — o Eduardo preferiu reservar o espaço
 *    a preencher com número sem fonte;
 *  - a aba **Planejado** tem a tela pronta e o dado em aberto.
 *
 * Interatividade real: os filtros de conta e categoria recalculam KPIs, saldo
 * corrente e tabela. Escolher um banco responde a pergunta que originou o
 * projeto — como ficou a conta real daquele banco.
 */

const NAV = [
  { grupo: 'Visão geral', itens: [{ id: 'dashboard', rotulo: 'Dashboard', icone: '⬡' }] },
  {
    grupo: 'Fluxo de caixa',
    itens: [
      { id: 'realizado', rotulo: 'Realizado', icone: '◧' },
      { id: 'planejado', rotulo: 'Planejado', icone: '◨' },
    ],
  },
  {
    grupo: 'Gestão',
    itens: [
      { id: 'categorias', rotulo: 'Categorias', icone: '▤' },
      { id: 'importar', rotulo: 'Importar extrato', icone: '⇓' },
    ],
  },
  {
    grupo: 'Administração',
    itens: [
      { id: 'contas', rotulo: 'Contas bancárias', icone: '⛁' },
      { id: 'usuarios', rotulo: 'Usuários', icone: '◎' },
    ],
  },
] as const;

/** As duas telas que o mockup de fato desenha. O resto fica visível e inerte. */
const NAVEGAVEIS = new Set(['realizado', 'planejado']);

const MESES_LONGOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const fmt0 = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function formatarData(iso: string, curta = false): string {
  const [ano, mes, dia] = iso.split('-');
  return curta ? `${dia}/${mes}` : `${dia}/${mes}/${ano}`;
}

interface Props {
  className?: string;
  /** versão enxuta para o card do índice: corta a linha de filtros e a tabela encolhe */
  compacto?: boolean;
}

export default function PainelCaixa({ className = '', compacto = false }: Props) {
  const [aba, setAba] = useState<'realizado' | 'planejado'>('realizado');
  const [conta, setConta] = useState('todas');
  const [categoria, setCategoria] = useState('todas');

  const mesNum = Number(competenciaDemo.slice(5, 7));
  const periodo = `${MESES_LONGOS[mesNum - 1]}/${competenciaDemo.slice(0, 4)}`;

  const filtrados = useMemo(
    () =>
      movimentosDemo
        .filter((m) => (conta === 'todas' ? true : m.conta === conta))
        .filter((m) => (categoria === 'todas' ? true : m.categoria === categoria))
        .sort((a, b) => a.data.localeCompare(b.data)),
    [conta, categoria]
  );

  /**
   * Saldo corrente. Quando há filtro de conta, parte do saldo inicial daquela
   * conta; sem filtro, do consolidado. O filtro de categoria não muda a base —
   * ele esconde linhas, e esconder linha não apaga dinheiro que entrou.
   */
  const base = useMemo(
    () =>
      conta === 'todas'
        ? contasDemo.reduce((s, c) => s + c.saldoInicial, 0)
        : (contasDemo.find((c) => c.id === conta)?.saldoInicial ?? 0),
    [conta]
  );

  const semFiltroCategoria = useMemo(
    () =>
      movimentosDemo
        .filter((m) => (conta === 'todas' ? true : m.conta === conta))
        .sort((a, b) => a.data.localeCompare(b.data)),
    [conta]
  );

  const saldoPorData = useMemo(() => {
    const mapa = new Map<string, number>();
    let acc = base;
    for (const m of semFiltroCategoria) {
      acc += m.valor;
      mapa.set(`${m.data}|${m.descricao}|${m.valor}`, acc);
    }
    return mapa;
  }, [semFiltroCategoria, base]);

  const saldoAtual = base + semFiltroCategoria.reduce((s, m) => s + m.valor, 0);
  const receita = filtrados.filter((m) => m.valor > 0).reduce((s, m) => s + m.valor, 0);
  const despesa = filtrados.filter((m) => m.valor < 0).reduce((s, m) => s - m.valor, 0);
  const variacao = base ? ((saldoAtual - base) / base) * 100 : 0;

  const kpis = [
    {
      label: 'Saldo atual',
      valor: fmt0(saldoAtual),
      cor: '',
      rodape: (
        <span className={`kpi-delta ${variacao >= 0 ? 'pos' : 'neg'}`}>
          {variacao >= 0 ? '▲' : '▼'} {Math.abs(variacao).toFixed(1).replace('.', ',')}% no período
        </span>
      ),
    },
    { label: 'Receita do mês', valor: fmt0(receita), cor: 'green', rodape: <span className="kpi-delta">{compacto ? 'do extrato' : 'Realizado — extrato'}</span> },
    { label: 'Despesa do mês', valor: fmt0(despesa), cor: 'red', rodape: <span className="kpi-delta">{compacto ? 'do extrato' : 'Realizado — extrato'}</span> },
    {
      // vazio de propósito, como no mockup: espaço reservado e origem declarada
      // como pendente, em vez de um número sem fonte
      label: compacto ? 'Saldo projetado' : 'Saldo projetado (30d)',
      valor: '—',
      cor: 'amber',
      rodape: <span className="kpi-delta">{compacto ? 'fonte em aberto' : 'Fonte ainda não definida'}</span>,
    },
  ];

  const rotuloConta = (id: string) => contasDemo.find((c) => c.id === id)?.rotulo ?? id;

  return (
    <div className={`cx ${compacto ? 'cx-cmp' : ''} ${className}`}>
      <style>{`
        .cx {
          /* preto neutro, cartão sem cor de fundo — o design system do mockup */
          --bg:#000; --surface-1:#121212; --surface-2:#0d0d0d;
          --border-1:#232323; --line-soft:rgba(255,255,255,.10);
          --text-100:#f4f4f5; --text-200:#a1a1aa; --text-mute:#71717a;
          --green:#10b981; --red:#f13131; --amber:#f59e0b; --blue:#3b82f6;
          background:var(--bg); border:1px solid var(--border-1); border-radius:12px;
          overflow:hidden; container-type:inline-size; font-size:11px;
          font-family:'Inter Variable',system-ui,sans-serif; color:var(--text-100);
        }
        .cx-shell { display:flex; }
        .cx-side { width:132px; flex-shrink:0; border-right:1px solid var(--border-1);
          background:var(--surface-2); padding:9px 0; }
        .cx-brand { display:flex; align-items:center; gap:7px; padding:2px 10px 12px; }
        .cx-brand .mk { width:20px; height:20px; border-radius:6px; flex-shrink:0; font-size:10px;
          background:var(--text-100); color:#000; display:flex; align-items:center; justify-content:center;
          font-weight:700; }
        .cx-brand .tx { font-size:11px; font-weight:600; letter-spacing:-.2px; }
        .cx-grp { font-size:7.5px; letter-spacing:.14em; text-transform:uppercase;
          color:var(--text-mute); padding:9px 11px 4px; }
        .cx-nav { display:flex; align-items:center; gap:8px; width:100%; padding:5px 11px;
          background:none; border:0; font-family:inherit; font-size:10.5px; text-align:left;
          color:var(--text-200); position:relative; transition:background .15s,color .15s; }
        .cx-nav[data-ativavel="sim"] { cursor:pointer; }
        .cx-nav[data-ativavel="sim"]:hover { background:rgba(255,255,255,.05); color:var(--text-100); }
        .cx-nav[aria-disabled="true"] { color:var(--text-mute); opacity:.55; cursor:default; }
        .cx-nav.on { background:rgba(255,255,255,.08); color:var(--text-100); font-weight:600; }
        .cx-nav.on::before { content:''; position:absolute; left:0; top:50%; transform:translateY(-50%);
          width:2px; height:14px; background:var(--text-100); border-radius:0 2px 2px 0; }
        .cx-nav .ic { width:14px; text-align:center; font-size:11px; flex-shrink:0; }
        .cx-main { flex:1; min-width:0; }
        .cx-top { display:flex; align-items:center; gap:8px; height:38px; padding:0 12px;
          border-bottom:1px solid var(--border-1); background:var(--surface-2); }
        .cx-top .t { font-size:12px; font-weight:600; letter-spacing:-.2px; }
        .cx-top .sp { margin-left:auto; }
        .cx-btn { display:inline-flex; align-items:center; gap:5px; height:23px; padding:0 9px;
          border-radius:6px; border:1px solid var(--border-1); background:rgba(255,255,255,.04);
          color:var(--text-200); font-family:inherit; font-size:9.5px; white-space:nowrap; }
        .cx-av { width:22px; height:22px; border-radius:50%; background:var(--text-100); color:#000;
          font-size:9px; font-weight:700; display:flex; align-items:center; justify-content:center;
          flex-shrink:0; }
        .cx-user { display:flex; align-items:center; gap:6px; }
        .cx-user .nm { font-size:10px; font-weight:600; line-height:1.15; }
        .cx-user .rl { font-size:8px; color:var(--text-mute); letter-spacing:.08em; }
        .cx-body { padding:10px; }
        .cx-kpis { display:grid; grid-template-columns:repeat(2,1fr); gap:7px; }
        @container (min-width: 460px) { .cx-kpis { grid-template-columns:repeat(4,1fr); } }
        .cx-card { border:1px solid var(--border-1); border-radius:9px; background:var(--surface-1);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.05); padding:9px 10px; }
        .cx-kpi { position:relative; overflow:hidden; }
        .cx-kpi::before { content:''; position:absolute; inset:0 0 auto 0; height:2px;
          background:linear-gradient(90deg,var(--text-mute),transparent); }
        .cx-kpi.green::before { background:linear-gradient(90deg,var(--green),transparent); }
        .cx-kpi.red::before { background:linear-gradient(90deg,var(--red),transparent); }
        .cx-kpi.amber::before { background:linear-gradient(90deg,var(--amber),transparent); }
        .kpi-label { font-size:8px; font-weight:600; letter-spacing:.7px; text-transform:uppercase;
          color:var(--text-mute); line-height:1.3; }
        .kpi-value { font-size:14px; font-weight:700; letter-spacing:-.5px; margin-top:3px;
          font-variant-numeric:tabular-nums; }
        .cx-kpi.green .kpi-value { color:var(--green); }
        .cx-kpi.red .kpi-value { color:var(--red); }
        .cx-kpi.amber .kpi-value { color:var(--text-mute); }
        .kpi-delta { display:inline-block; margin-top:5px; font-size:8.5px; color:var(--text-mute); }
        .kpi-delta.pos { color:var(--green); }
        .kpi-delta.neg { color:var(--red); }
        .cx-tabs { display:flex; gap:4px; margin-top:10px; border-bottom:1px solid var(--border-1); }
        .cx-tab { padding:5px 10px; font-family:inherit; font-size:10px; background:none; border:0;
          border-bottom:2px solid transparent; color:var(--text-mute); cursor:pointer; }
        .cx-tab.on { color:var(--text-100); border-bottom-color:var(--text-100); font-weight:600; }
        .cx-filtros { display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; margin-top:10px; }
        .cx-field { display:flex; flex-direction:column; gap:3px; min-width:0; }
        .cx-field label { font-size:8px; letter-spacing:.1em; text-transform:uppercase; color:var(--text-mute); }
        .cx-input { height:24px; border-radius:6px; border:1px solid var(--border-1);
          background:var(--surface-1); color:var(--text-100); font-family:inherit; font-size:10px;
          padding:0 6px; max-width:130px; }
        .cx-sec { display:flex; align-items:baseline; gap:8px; margin-top:12px; margin-bottom:7px; }
        .cx-sec .h { font-size:10px; font-weight:600; }
        .cx-sec .n { font-size:9px; color:var(--text-mute); margin-left:auto; }
        /* overflow-x é rede de segurança: em telas muito estreitas as colunas
           nowrap (data, conta, valor, saldo) somam mais que o container, e sem
           isso a coluna Saldo — a que responde a pergunta do projeto — some */
        .cx-scr { max-height:150px; overflow:auto; }
        .cx-cmp .cx-scr { max-height:100px; }
        .cx-scr::-webkit-scrollbar { width:5px; }
        .cx-scr::-webkit-scrollbar-thumb { background:rgba(255,255,255,.16); border-radius:99px; }
        .cx-tb { width:100%; border-collapse:collapse; font-size:10px; }
        .cx-tb th { position:sticky; top:0; background:var(--surface-2); text-align:left;
          font-size:8px; letter-spacing:.5px; text-transform:uppercase; font-weight:600;
          color:var(--text-mute); padding:4px 6px 4px 0; border-bottom:1px solid var(--border-1); }
        .cx-tb td { padding:5px 6px 5px 0; border-bottom:1px solid var(--line-soft);
          color:var(--text-200); white-space:nowrap; }
        /* A descrição é a única coluna elástica: max-width 0 + width 100% faz ela
           absorver toda a folga e cortar com reticências quando falta espaço.
           Sem isso as colunas nowrap somam mais que o container e a tabela
           estoura, levando junto a coluna Saldo. */
        .cx-tb td.desc { max-width:0; width:100%; overflow:hidden; text-overflow:ellipsis; }
        .cx-tb tr:last-child td { border-bottom:0; }
        /* padding-left, não right: as duas colunas numéricas são alinhadas à
           direita e sem folga à esquerda elas encostam uma na outra */
        .cx-tb .num { text-align:right; font-variant-numeric:tabular-nums;
          padding-left:12px; padding-right:0; }
        .cx-tb .pos { color:var(--green); }
        .cx-tb .neg { color:var(--red); }
        .cx-tb .sal { color:var(--text-100); font-weight:500; }
        .cx-badge { display:inline-block; padding:1px 5px; border-radius:4px; font-size:8.5px;
          background:rgba(255,255,255,.06); color:var(--text-200); }
        .cx-vazio { border:1px dashed var(--border-1); border-radius:9px; padding:14px;
          margin-top:12px; color:var(--text-200); line-height:1.55; }
        .cx-vazio .h { display:flex; align-items:center; gap:7px; font-size:10.5px;
          font-weight:600; color:var(--text-100); margin-bottom:5px; }
        .cx-vazio .h .ic { font-size:12px; color:var(--amber); }
        @container (max-width: 400px) {
          .cx-side { width:38px; }
          .cx-brand .tx, .cx-nav .rot, .cx-grp { display:none; }
          .cx-nav { justify-content:center; padding:7px 0; }
          .cx-brand { justify-content:center; padding:2px 0 10px; }
          .cx-user .meta { display:none; }
        }
        @media (prefers-reduced-motion: reduce) { .cx * { transition:none !important; } }
      `}</style>

      <div className="cx-shell">
        <aside className="cx-side">
          <div className="cx-brand">
            <span className="mk" aria-hidden="true">N</span>
            <span className="tx">Nexus &amp; PJ</span>
          </div>
          <nav aria-label="Navegação do painel">
            {NAV.map((g) => (
              <div key={g.grupo}>
                <div className="cx-grp">{g.grupo}</div>
                {g.itens.map((i) => {
                  const ativavel = NAVEGAVEIS.has(i.id);
                  return (
                    <button
                      key={i.id}
                      type="button"
                      className={`cx-nav ${aba === i.id ? 'on' : ''}`}
                      data-ativavel={ativavel ? 'sim' : 'nao'}
                      aria-disabled={ativavel ? undefined : true}
                      aria-current={aba === i.id ? 'page' : undefined}
                      title={ativavel ? undefined : 'Fora do escopo deste mockup'}
                      onClick={() => ativavel && setAba(i.id as 'realizado' | 'planejado')}
                    >
                      <span className="ic" aria-hidden="true">{i.icone}</span>
                      <span className="rot">{i.rotulo}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <div className="cx-main">
          <header className="cx-top">
            <span className="t">Fluxo de Caixa</span>
            <span className="sp" />
            <span className="cx-btn">⇓ Importar extrato</span>
            <div className="cx-user">
              <span className="cx-av" aria-hidden="true">ED</span>
              <span className="meta">
                <span className="nm" style={{ display: 'block' }}>Eduardo</span>
                <span className="rl">ADM</span>
              </span>
            </div>
          </header>

          <div className="cx-body">
            <div className="cx-kpis">
              {kpis.map((k) => (
                <div key={k.label} className={`cx-card cx-kpi ${k.cor}`}>
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value">{k.valor}</div>
                  {k.rodape}
                </div>
              ))}
            </div>

            <div className="cx-tabs" role="tablist">
              {(['realizado', 'planejado'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={aba === t}
                  className={`cx-tab ${aba === t ? 'on' : ''}`}
                  onClick={() => setAba(t)}
                >
                  {t === 'realizado' ? 'Realizado' : 'Planejado'}
                </button>
              ))}
            </div>

            {aba === 'realizado' ? (
              <>
                <div className="cx-filtros">
                  <div className="cx-field">
                    <label htmlFor="cx-periodo">Período</label>
                    <select id="cx-periodo" className="cx-input" defaultValue={periodo}>
                      <option>{periodo}</option>
                    </select>
                  </div>
                  <div className="cx-field">
                    <label htmlFor="cx-conta">Conta</label>
                    <select
                      id="cx-conta"
                      className="cx-input"
                      value={conta}
                      onChange={(e) => setConta(e.target.value)}
                    >
                      <option value="todas">Todas as contas</option>
                      {contasDemo.map((c) => (
                        <option key={c.id} value={c.id}>{c.rotulo}</option>
                      ))}
                    </select>
                  </div>
                  {!compacto && (
                    <div className="cx-field">
                      <label htmlFor="cx-cat">Categoria</label>
                      <select
                        id="cx-cat"
                        className="cx-input"
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                      >
                        <option value="todas">Todas</option>
                        {categoriasDemo.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="cx-sec">
                  <span className="h">
                    Lançamentos — {conta === 'todas' ? 'consolidado' : rotuloConta(conta)}
                  </span>
                  <span className="n">{filtrados.length} lançamentos</span>
                </div>

                <div
                  className="cx-scr"
                  tabIndex={0}
                  role="region"
                  aria-label="Lançamentos do período, tabela rolável"
                >
                  <table className="cx-tb">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        {!compacto && <th>Categoria</th>}
                        <th>Conta</th>
                        <th className="num">Valor</th>
                        <th className="num">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.length === 0 ? (
                        <tr>
                          <td colSpan={compacto ? 5 : 6} style={{ color: 'var(--text-mute)', paddingTop: 10 }}>
                            Nenhum lançamento com esses filtros.
                          </td>
                        </tr>
                      ) : (
                        [...filtrados].reverse().map((m) => (
                          <tr key={`${m.data}-${m.descricao}-${m.valor}`}>
                            <td>{formatarData(m.data, compacto)}</td>
                            <td className="desc" title={m.descricao}>{m.descricao}</td>
                            {!compacto && (
                              <td><span className="cx-badge">{m.categoria}</span></td>
                            )}
                            <td>{rotuloConta(m.conta)}</td>
                            <td className={`num ${m.valor >= 0 ? 'pos' : 'neg'}`}>
                              {m.valor >= 0 ? '+' : '−'} {fmt(Math.abs(m.valor))}
                            </td>
                            <td className="num sal">
                              {fmt(saldoPorData.get(`${m.data}|${m.descricao}|${m.valor}`) ?? 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="cx-vazio">
                <div className="h">
                  <span className="ic" aria-hidden="true">◨</span>
                  Tela pronta, fonte de dado em aberto
                </div>
                Mesmo layout do Realizado — mesmos filtros, mesma tabela. Falta decidir de onde o
                Planejado puxa o dado: lançamento manual de contas a pagar e a receber, integração
                externa, ou os dois.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
