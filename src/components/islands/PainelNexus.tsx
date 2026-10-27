import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  lancamentosDemo,
  contasDemo,
  posicoesDemo,
  metaPoupancaDemo,
  objetivosDemo,
  taxaRendimentoDemoAA,
  type Lancamento,
} from '../../data/nexusDemo';

/**
 * Réplica da interface real do Nexus Analytics, com dados fictícios.
 *
 * Estrutura, paleta, tipografia e componentes vêm do código do app real
 * (versão 1.4.0, utils/layout.py, utils/tons.py e webapp/main.py): barra lateral
 * flutuante, cabeçalho de módulo com o ícone na cor de identidade do assunto,
 * cartões de indicador, blocos com faixa colorida, alertas inteligentes e — em
 * cada painel — os mesmos blocos que o app monta. Os títulos não são inventados; são os do `render(...)` de cada
 * página:
 *
 *   Dashboard      Receita × Despesa — Mensal · Saldo por Mês — Bancos ·
 *                  Assinaturas · Fluxo do dinheiro · Cascata · Calendário · Histórico de Lançamentos
 *   Receitas       Receita — Mensal · Fontes de Receita · Receita por Banco ·
 *                  Top 5 Maiores Receitas · Transações de Receita
 *   Despesas       Despesa — Mensal · Despesas por Categoria · Fixas × Variáveis ·
 *                  Top 5 Maiores Despesas · Transações de Despesa
 *   Cartões        Gasto no Cartão — Mensal · Utilização do Limite ·
 *                  Gasto por Categoria · Top Estabelecimentos · Lançamentos do Cartão
 *   Investimentos  Evolução do Patrimônio Investido · Alocação por Tipo ·
 *                  Investimentos Ativos · Patrimônio vs Meta · Movimentações
 *   Projeções      Real + Projeção · Saldo Projetado · Sobra vs Meta de Poupança ·
 *                  Detalhe da Projeção por Mês
 *
 * Os gráficos são SVG desenhado à mão em vez de Chart.js: o original usa a
 * biblioteca, mas aqui seriam ~200 KB para gráficos estáticos de demonstração.
 *
 * Nenhum número é escrito à mão — tudo deriva de `nexusDemo.ts`.
 */

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * Paleta de IDENTIDADE do app (utils/tons.py): um tom por assunto, que nunca é o
 * verde nem o vermelho de significado. `tx` e `txClaro` são a cor do texto sobre a
 * faixa nos temas escuro e claro, calculadas no app para passar AA.
 */
const TONS = {
  azul: { base: '59,130,246', tx: '133,178,249', txClaro: '42,94,177', glifo: '⬡' },
  rosa: { base: '236,72,153', tx: '243,142,192', txClaro: '165,50,107', glifo: '▼' },
  indigo: { base: '99,102,241', tx: '165,166,247', txClaro: '77,80,188', glifo: '▲' },
  roxo: { base: '139,92,246', tx: '188,160,250', txClaro: '106,70,187', glifo: '▤' },
  ambar: { base: '245,158,11', tx: '247,175,55', txClaro: '137,88,6', glifo: '◐' },
  ciano: { base: '6,182,212', tx: '76,202,224', txClaro: '3,106,123', glifo: '◈' },
  laranja: { base: '249,115,22', tx: '251,160,97', txClaro: '154,71,14', glifo: '✦' },
  ardosia: { base: '100,116,139', tx: '165,174,188', txClaro: '82,95,114', glifo: '▦' },
} as const;
type Tom = keyof typeof TONS;

const varsDoTom = (t: Tom) =>
  ({ '--tom': TONS[t].base, '--tom-txe': `rgb(${TONS[t].tx})`, '--tom-txc': `rgb(${TONS[t].txClaro})`,
    '--tom-glifo': `'${TONS[t].glifo}'` }) as CSSProperties;

// NAV do app real: a barra lateral recolhida mostra só os ícones
const NAV = [
  { id: 'dashboard', rotulo: 'Dashboard', icone: '⬡', tom: 'azul' },
  { id: 'lancamentos', rotulo: 'Lançamentos', icone: '▦', tom: 'ardosia' },
  { id: 'objetivos', rotulo: 'Objetivos', icone: '✦', tom: 'laranja' },
] as const;

/** Painéis que o Hub abre: no app real perderam a aba própria e vivem atrás dos cards. */
const PAINEIS = [
  { id: 'visaogeral', icone: '⬡', titulo: 'Visão geral', legenda: 'KPIs, tendência e orçamentos', tom: 'azul' },
  { id: 'despesas', icone: '▼', titulo: 'Despesas', legenda: 'para onde o dinheiro foi', tom: 'rosa' },
  { id: 'receitas', icone: '▲', titulo: 'Receitas', legenda: 'de onde ele veio', tom: 'indigo' },
  { id: 'cartoes', icone: '▤', titulo: 'Cartões', legenda: 'faturas e parcelas', tom: 'roxo' },
  { id: 'projecoes', icone: '◐', titulo: 'Projeções', legenda: 'o que vem pela frente', tom: 'ambar' },
  { id: 'investimentos', icone: '◈', titulo: 'Investimentos', legenda: 'patrimônio e rendimento', tom: 'ciano' },
] as const;

type PainelId = (typeof PAINEIS)[number]['id'];
type AbaId = (typeof NAV)[number]['id'] | PainelId;

const COR = {
  verde: 'var(--nx-green)',
  vermelho: 'var(--nx-red)',
  azul: 'var(--nx-blue)',
  ciano: 'var(--nx-cyan)',
  roxo: 'var(--nx-purple)',
  ambar: 'var(--nx-amber)',
};
const PALETA = [COR.azul, COR.verde, COR.roxo, COR.ciano, COR.ambar, COR.vermelho];

const fmt0 = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct1 = (v: number) => `${v.toFixed(1).replace('.', ',')}%`;

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
}

const rotuloMes = (iso: string) => MESES[Number(iso.slice(5, 7)) - 1];
const rotuloCompetencia = (iso: string) => `${rotuloMes(iso)}/${iso.slice(0, 4)}`;

const soma = (lista: Lancamento[]) => lista.reduce((s, l) => s + l.valor, 0);
const doTipo = (lista: Lancamento[], tipo: Lancamento['tipo']) => lista.filter((l) => l.tipo === tipo);

/** Agrupa somando, preservando ordem decrescente de valor. */
function agrupar(lista: Lancamento[], chave: (l: Lancamento) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const l of lista) m.set(chave(l), (m.get(chave(l)) ?? 0) + l.valor);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** Tick de eixo em escala curta, como o moneyTick do app. */
function tickCurto(v: number): string {
  if (Math.abs(v) >= 1000)
    return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  return String(Math.round(v));
}

/** Topo de escala "redondo" — evita eixo com número quebrado. */
function escalaTeto(max: number): number {
  if (max <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / (mag / 2)) * (mag / 2);
}

// ── primitivas de gráfico ─────────────────────────────────────────────────────
// Todas recebem W/H em unidades de viewBox e escalam com o container. W menor no
// modo compacto: o SVG é reduzido para caber no card, e um viewBox estreito faz
// o texto do eixo chegar maior depois da escala.

const PAD = { l: 30, r: 4, t: 6, b: 16 };

interface Serie {
  nome: string;
  cor: string;
  dados: number[];
}

function Grade({ W, H, ticks }: { W: number; H: number; ticks: { y: number; texto: string }[] }) {
  return (
    <>
      {ticks.map((t) => (
        <g key={t.texto + t.y}>
          <line className="gl" x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} />
          <text x={PAD.l - 4} y={t.y + 2.5} textAnchor="end">
            {t.texto}
          </text>
        </g>
      ))}
    </>
  );
}

function Barras({
  rotulos,
  series,
  W,
  H,
  projetadoDe,
  descricao,
}: {
  rotulos: string[];
  series: Serie[];
  W: number;
  H: number;
  /** índice a partir do qual as barras são projeção — desenhadas translúcidas */
  projetadoDe?: number;
  descricao: string;
}) {
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const teto = escalaTeto(Math.max(...series.flatMap((s) => s.dados), 1));
  const grupoW = plotW / Math.max(rotulos.length, 1);
  const barW = Math.min(15, grupoW / (series.length + 1.4));

  return (
    <svg className="cht" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descricao}>
      <Grade
        W={W}
        H={H}
        ticks={[0, 0.5, 1].map((f) => ({ y: PAD.t + plotH * (1 - f), texto: tickCurto(teto * f) }))}
      />
      {rotulos.map((r, i) => {
        const centro = PAD.l + grupoW * (i + 0.5);
        const projetada = projetadoDe != null && i >= projetadoDe;
        const larguraTotal = barW * series.length + 3 * (series.length - 1);
        return (
          <g key={r} opacity={projetada ? 0.45 : 1}>
            {series.map((s, j) => {
              const h = plotH * (s.dados[i] / teto);
              const x = centro - larguraTotal / 2 + j * (barW + 3);
              return (
                <rect
                  key={s.nome}
                  x={x}
                  y={PAD.t + plotH - h}
                  width={barW}
                  height={Math.max(h, 0)}
                  rx="2.5"
                  fill={s.cor}
                  strokeDasharray={projetada ? '2 2' : undefined}
                  stroke={projetada ? s.cor : undefined}
                />
              );
            })}
            <text x={centro} y={H - 5} textAnchor="middle">
              {r}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Linha({
  rotulos,
  valores,
  cor,
  W,
  H,
  projetadoDe,
  descricao,
}: {
  rotulos: string[];
  valores: number[];
  cor: string;
  W: number;
  H: number;
  projetadoDe?: number;
  descricao: string;
}) {
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  // Escala só fica simétrica se houver valor negativo — do contrário metade do
  // gráfico ficaria vazia e a linha espremida no topo.
  const temNegativo = valores.some((v) => v < 0);
  const topo = escalaTeto(Math.max(...valores.map(Math.abs), 1));
  const base = temNegativo ? -topo : 0;
  const faixa = topo - base;
  const y = (v: number) => PAD.t + plotH * ((topo - v) / faixa);
  const yZero = y(0);
  const passo = plotW / Math.max(valores.length, 1);

  const pts = valores.map((v, i) => ({ x: PAD.l + passo * (i + 0.5), y: y(v), v, r: rotulos[i] }));
  const corte = projetadoDe ?? pts.length;
  const traco = (lista: typeof pts) => lista.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const reais = pts.slice(0, corte);
  const futuros = pts.slice(Math.max(corte - 1, 0));

  const area =
    reais.length > 0
      ? `M ${reais[0].x.toFixed(1)},${yZero.toFixed(1)} L ${traco(reais).replace(/ /g, ' L ')} L ${reais[reais.length - 1].x.toFixed(1)},${yZero.toFixed(1)} Z`
      : '';

  return (
    <svg className="cht" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descricao}>
      <Grade
        W={W}
        H={H}
        ticks={[1, 0.5, 0].map((f) => {
          const valor = base + faixa * f;
          return { y: y(valor), texto: tickCurto(valor) };
        })}
      />
      <path d={area} fill={cor} opacity="0.16" />
      <polyline points={traco(reais)} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {futuros.length > 1 && (
        <polyline
          points={traco(futuros)}
          fill="none"
          stroke={cor}
          strokeWidth="2"
          strokeDasharray="4 3"
          opacity="0.6"
          strokeLinejoin="round"
        />
      )}
      {pts.map((p, i) => (
        <g key={p.r} opacity={i >= corte ? 0.55 : 1}>
          <circle
            cx={p.x}
            cy={p.y}
            r="3"
            fill={p.v < 0 ? COR.vermelho : cor}
            stroke="var(--nx-bg)"
            strokeWidth="1.2"
          />
          <text x={p.x} y={H - 5} textAnchor="middle">
            {p.r}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * Rosca com a legenda desenhada dentro do próprio SVG. Assim ela escala junto e
 * a altura do bloco casa com a dos gráficos vizinhos na grade de dois.
 */
function Rosca({
  fatias,
  centro,
  W,
  H,
  descricao,
}: {
  fatias: { rotulo: string; valor: number }[];
  centro: { valor: string; rotulo: string };
  W: number;
  H: number;
  descricao: string;
}) {
  const total = fatias.reduce((s, f) => s + f.valor, 0) || 1;
  const top = fatias.slice(0, 5);
  const r = H / 2 - 10;
  const cx = r + 10;
  const cy = H / 2;
  const C = 2 * Math.PI * r;

  let acumulado = 0;
  return (
    <svg className="cht" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descricao}>
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {top.map((f, i) => {
          const frac = f.valor / total;
          const arco = (
            <circle
              key={f.rotulo}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={PALETA[i % PALETA.length]}
              strokeWidth="9"
              strokeDasharray={`${(C * frac).toFixed(2)} ${(C * (1 - frac)).toFixed(2)}`}
              strokeDashoffset={(-C * acumulado).toFixed(2)}
            />
          );
          acumulado += frac;
          return arco;
        })}
      </g>
      <text x={cx} y={cy - 1} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: 'var(--nx-text)' }}>
        {centro.valor}
      </text>
      <text x={cx} y={cy + 9} textAnchor="middle">
        {centro.rotulo}
      </text>

      {top.map((f, i) => {
        const ly = 14 + i * ((H - 22) / Math.max(top.length, 1));
        return (
          <g key={f.rotulo}>
            <rect x={cx + r + 12} y={ly - 4} width="5" height="5" rx="1.5" fill={PALETA[i % PALETA.length]} />
            <text x={cx + r + 22} y={ly}>
              {f.rotulo}
            </text>
            <text x={W - PAD.r} y={ly} textAnchor="end" style={{ fill: 'var(--nx-text3)' }}>
              {Math.round((f.valor / total) * 100)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Medidor semicircular — o "gauge" que o app usa nos blocos "X vs Meta". */
function Medidor({
  pct,
  nota,
  cor,
  W,
  H,
  descricao,
}: {
  pct: number;
  nota: string;
  cor: string;
  W: number;
  H: number;
  descricao: string;
}) {
  const limitado = Math.max(0, Math.min(100, pct));
  const r = Math.min(H - 26, W / 2 - 20);
  const cx = W / 2;
  const cy = H - 14;
  const ponto = (grau: number) => {
    const rad = (grau * Math.PI) / 180;
    return `${(cx + r * Math.cos(rad)).toFixed(1)},${(cy - r * Math.sin(rad)).toFixed(1)}`;
  };
  const fim = 180 - 1.8 * limitado;

  return (
    <svg className="cht" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descricao}>
      <path d={`M ${ponto(180)} A ${r} ${r} 0 0 1 ${ponto(0)}`} fill="none" style={{ stroke: 'var(--nx-trilho)' }} strokeWidth="9" strokeLinecap="round" />
      <path d={`M ${ponto(180)} A ${r} ${r} 0 0 1 ${ponto(fim)}`} fill="none" stroke={cor} strokeWidth="9" strokeLinecap="round" />
      <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 15, fontWeight: 700, fill: cor }}>
        {Math.round(pct)}%
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle">
        {nota}
      </text>
    </svg>
  );
}

/** Lista de barras horizontais — o bloco "por categoria" do app. */
function BarrasH({ itens }: { itens: { rotulo: string; valor: number; texto?: string }[] }) {
  const max = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <div>
      {itens.map((i) => (
        <div className="bar-row" key={i.rotulo}>
          <div className="bar-hd">
            <span className="c">{i.rotulo}</span>
            <span className="v">{i.texto ?? fmt(i.valor)}</span>
          </div>
          <div className="bar-tk">
            <div className="bar-fl" style={{ width: `${(i.valor / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Bloco do layout novo: faixa fina no tom do assunto, com ícone e título em caixa alta. */
function Bloco({ titulo, children, tom }: { titulo: string; children: ReactNode; tom?: Tom }) {
  return (
    <div className="nx-card" style={tom ? varsDoTom(tom) : undefined}>
      <div className="nx-sec">{titulo}</div>
      <div className="nx-bc">{children}</div>
    </div>
  );
}

function Legenda({ itens }: { itens: { nome: string; cor: string }[] }) {
  return (
    <div className="nx-lg">
      {itens.map((i) => (
        <span key={i.nome}>
          <i style={{ background: i.cor }} />
          {i.nome}
        </span>
      ))}
    </div>
  );
}

interface Kpi {
  label: string;
  valor: string;
  cor: string;
  icone: string;
  delta?: number | null;
  bomSeSobe?: boolean;
  nota?: string;
}

function Kpis({ lista }: { lista: Kpi[] }) {
  return (
    <div className="nx-kpis" style={{ '--n': lista.length } as CSSProperties}>
      {lista.map((k) => (
        <div key={k.label} className={`kpi ${k.cor}`}>
          <div className="kpi-hd">
            <div>
              <div className="kpi-lb">{k.label}</div>
              <div className="kpi-vl">{k.valor}</div>
            </div>
            <div className="kpi-ic" aria-hidden="true">
              {k.icone}
            </div>
          </div>
          <div className="kpi-ft">
            {k.delta != null ? (
              <>
                <span className={`kpi-dl ${(k.delta >= 0) === (k.bomSeSobe ?? true) ? 'up' : 'down'}`}>
                  {k.delta >= 0 ? '▲' : '▼'} {pct1(Math.abs(k.delta))}
                </span>
                <span className="kpi-nt">vs. mês anterior</span>
              </>
            ) : (
              <span className="kpi-nt">{k.nota}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TabelaLancamentos({
  titulo,
  lista,
  terceiraColuna = 'categoria',
  rotuloAba,
}: {
  titulo: string;
  lista: Lancamento[];
  terceiraColuna?: 'categoria' | 'origem';
  rotuloAba: string;
}) {
  return (
    <Bloco titulo={titulo}>
      {/* rolável → o navegador já a torna focável; nomear evita que
          quem usa leitor de tela caia num container anônimo */}
      <div className="nx-scr" tabIndex={0} role="region" aria-label={`${titulo}, lista rolável`}>
        <table className="nx-tb">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>{terceiraColuna === 'origem' ? 'Cartão' : 'Categoria'}</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: 'var(--nx-text2)', paddingTop: 10 }}>
                  Nenhum lançamento em {rotuloAba.toLowerCase()}.
                </td>
              </tr>
            ) : (
              [...lista]
                .sort((a, b) => b.data.localeCompare(a.data))
                .map((l) => (
                  <tr key={`${l.data}-${l.descricao}-${l.valor}`}>
                    <td className="dt">{formatarData(l.data)}</td>
                    <td>{l.descricao}</td>
                    <td>
                      <span className="nx-tag">{l[terceiraColuna]}</span>
                    </td>
                    <td className={`vl ${l.tipo === 'receita' ? 'pos' : l.tipo === 'investimento' ? 'inv' : 'neg'}`}>
                      {l.tipo === 'receita' ? '+' : l.tipo === 'investimento' ? '' : '−'} {fmt(l.valor)}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </Bloco>
  );
}

interface Props {
  className?: string;
  /**
   * Versão enxuta para o índice, onde o painel divide o card com o texto do
   * projeto. Mantém os 4 KPIs e os 2 gráficos principais de cada aba — o que dá
   * a leitura da tela em um golpe de vista — e corta os blocos secundários e a
   * tabela, que são o que fazia o card crescer. A versão completa fica na
   * página do projeto.
   */
  compacto?: boolean;
}

/* ── Gráficos novos (portados de utils/graficos_svg.py + paineis_v2.py do app real) ── */

/** Sankey: cada receita até a categoria onde terminou. A conta fecha: o que sobra vira "sobrou". */
function Sankey({ fontes, destinos, descricao }: { fontes: { nome: string; v: number; cor: string }[]; destinos: { nome: string; v: number; cor: string }[]; descricao: string }) {
  const W = 330, H = 150, nw = 7, topo = 6, gap = 3;
  const tot = Math.max(fontes.reduce((s, f) => s + f.v, 0), destinos.reduce((s, f) => s + f.v, 0), 1);
  const util = H - 2 * topo;
  const lay = (itens: typeof fontes) => {
    const total = itens.reduce((s, f) => s + f.v, 0);
    const livre = util - gap * (itens.length - 1);
    let y = topo + (util - (livre * total) / tot - gap * (itens.length - 1)) / 2;
    return itens.map((it) => {
      const h = Math.max(2, (livre * it.v) / tot);
      const r = { ...it, y, h };
      y += h + gap;
      return r;
    });
  };
  const L = lay(fontes), R = lay(destinos);
  const xl = 70, xr = W - 70;
  // distribui as fitas: cada fonte reparte a altura proporcionalmente entre os destinos
  const usadoL = L.map(() => 0), usadoR = R.map(() => 0);
  const fitas: { d: string; cor: string }[] = [];
  const totD = destinos.reduce((s, f) => s + f.v, 0) || 1;
  L.forEach((a, i) => {
    R.forEach((b, j) => {
      const ha = a.h * (b.v / totD), hb = b.h * (a.v / (fontes.reduce((s, f) => s + f.v, 0) || 1));
      const h = Math.min(ha, hb);
      const ya = a.y + usadoL[i], yb = b.y + usadoR[j];
      usadoL[i] += ha; usadoR[j] += hb;
      const mx = (xl + nw + xr) / 2;
      fitas.push({ cor: a.cor, d: `M${xl + nw} ${ya} C${mx} ${ya},${mx} ${yb},${xr} ${yb} L${xr} ${yb + h} C${mx} ${yb + h},${mx} ${ya + h},${xl + nw} ${ya + h} Z` });
    });
  });
  return (
    <svg className="cht" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descricao}>
      {fitas.map((f, i) => <path key={i} d={f.d} fill={f.cor} opacity=".28" />)}
      {L.map((n) => (
        <g key={n.nome}>
          <rect x={xl} y={n.y} width={nw} height={n.h} rx="1.5" fill={n.cor} />
          <text x={xl - 4} y={n.y + n.h / 2 + 2.5} textAnchor="end">{n.nome}</text>
        </g>
      ))}
      {R.map((n) => (
        <g key={n.nome}>
          <rect x={xr} y={n.y} width={nw} height={n.h} rx="1.5" fill={n.cor} />
          <text x={xr + nw + 4} y={n.y + n.h / 2 + 2.5}>{n.nome}</text>
        </g>
      ))}
    </svg>
  );
}

/** Cascata: do saldo inicial ao final, passo a passo. */
function Cascata({ passos, W, H, descricao }: { passos: { nome: string; v: number; total?: boolean }[]; W: number; H: number; descricao: string }) {
  let acc = 0;
  const barras = passos.map((p) => {
    const ini = p.total ? 0 : acc;
    const fim = p.total ? p.v : acc + p.v;
    if (!p.total) acc = fim; else acc = p.v;
    return { ...p, lo: Math.min(ini, fim), hi: Math.max(ini, fim) };
  });
  const max = Math.max(...barras.map((b) => b.hi), 1);
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;
  const gw = plotW / barras.length, bw = Math.min(22, gw * 0.62);
  const y = (v: number) => PAD.t + plotH * (1 - v / max);
  return (
    <svg className="cht" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descricao}>
      <Grade W={W} H={H} ticks={[0, 0.5, 1].map((f) => ({ y: PAD.t + plotH * (1 - f), texto: tickCurto(max * f) }))} />
      {barras.map((b, i) => {
        const cx = PAD.l + gw * (i + 0.5);
        const cor = b.total ? COR.azul : b.v >= 0 ? COR.verde : COR.vermelho;
        return (
          <g key={b.nome}>
            <rect x={cx - bw / 2} y={y(b.hi)} width={bw} height={Math.max(1.5, y(b.lo) - y(b.hi))} rx="2" fill={cor} />
            <text x={cx} y={H - 5} textAnchor="middle">{b.nome}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Calendário de gasto: cada quadrado é um dia; quanto mais forte, mais gasto. */
function Calendario({ dias, inicio, fim, descricao }: { dias: Record<string, number>; inicio: Date; fim: Date; descricao: string }) {
  const cel = 9, gap = 2;
  const ini = new Date(inicio); ini.setDate(ini.getDate() - ((ini.getDay() + 6) % 7)); // segunda
  const semanas = Math.ceil((fim.getTime() - ini.getTime()) / (7 * 86400000)) + 1;
  const max = Math.max(...Object.values(dias), 1);
  const W = semanas * (cel + gap), H = 7 * (cel + gap);
  const quad: ReactNode[] = [];
  for (let sIdx = 0; sIdx < semanas; sIdx++) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(ini); dt.setDate(ini.getDate() + sIdx * 7 + d);
      if (dt < inicio || dt > fim) continue;
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const v = dias[iso] ?? 0;
      quad.push(
        <rect key={iso} x={sIdx * (cel + gap)} y={d * (cel + gap)} width={cel} height={cel} rx="2"
          fill={v ? COR.vermelho : 'var(--nx-trilho)'} opacity={v ? 0.25 + 0.75 * (v / max) : 1}>
          <title>{`${formatarData(iso)}: ${v ? fmt0(v) : 'sem gasto'}`}</title>
        </rect>
      );
    }
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg className="cht" style={{ minWidth: W, maxWidth: '100%' }} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descricao}>{quad}</svg>
    </div>
  );
}

/** Mês × mediana: barra = o mês, traço = mediana dos meses anteriores; vermelho quando passou. */
function BarrasMediana({ itens }: { itens: { rotulo: string; valor: number; mediana: number }[] }) {
  const max = Math.max(...itens.flatMap((i) => [i.valor, i.mediana]), 1);
  return (
    <div>
      {itens.map((i) => (
        <div className="bar-row" key={i.rotulo}>
          <div className="bar-hd"><span className="c">{i.rotulo}</span><span className="v">{fmt0(i.valor)} · mediana {fmt0(i.mediana)}</span></div>
          <div className="bar-tk" style={{ position: 'relative' }}>
            <div className="bar-fl" style={{ width: `${(i.valor / max) * 100}%`, background: i.valor > i.mediana ? COR.vermelho : undefined }} />
            <i style={{ position: 'absolute', top: -2, bottom: -2, left: `${(i.mediana / max) * 100}%`, width: 2, background: 'var(--nx-text)', opacity: 0.8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Linha central com faixa provável (1º e 3º quartil das sobras passadas). */
function LinhaFaixa({ rotulos, centro, baixo, alto, W, H, descricao }: { rotulos: string[]; centro: number[]; baixo: number[]; alto: number[]; W: number; H: number; descricao: string }) {
  const lo = Math.min(...baixo, ...centro, 0), hi = Math.max(...alto, ...centro, 1);
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (plotW * i) / Math.max(1, centro.length - 1);
  const y = (v: number) => PAD.t + plotH * (1 - (v - lo) / (hi - lo));
  const pts = (v: number[]) => v.map((a, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(a).toFixed(1)}`).join(' ');
  const faixa = `${pts(alto)} ${[...baixo].reverse().map((a, i) => `L${x(baixo.length - 1 - i).toFixed(1)} ${y(a).toFixed(1)}`).join(' ')} Z`;
  return (
    <svg className="cht" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descricao}>
      <Grade W={W} H={H} ticks={[0, 0.5, 1].map((f) => ({ y: PAD.t + plotH * (1 - f), texto: tickCurto(lo + (hi - lo) * f) }))} />
      <path d={faixa} fill={COR.ambar} opacity=".16" />
      {lo < 0 && <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="currentColor" strokeDasharray="3 3" opacity=".4" />}
      <path d={pts(centro)} fill="none" stroke={COR.ambar} strokeWidth="1.6" />
      {rotulos.map((r, i) => <text key={r + i} x={x(i)} y={H - 5} textAnchor="middle">{r}</text>)}
    </svg>
  );
}


/* ── Hub ────────────────────────────────────────────────────────────────────
   Portado de webapp/hub_view.py + hub_svg.py do app real: um card por painel, cada um
   com a FORMA que responde a pergunta dele (áreas sobrepostas, rosca, colunas, barras,
   linha com o zero, área subindo). A prévia é dado, não captura de tela. */

const pontosSvg = (vals: number[], w: number, h: number, pad = 2) => {
  const lo0 = Math.min(...vals), hi0 = Math.max(...vals);
  const [lo, hi] = hi0 - lo0 < 1e-9 ? [lo0 - 1, hi0 + 1] : [lo0, hi0];
  const dx = w / Math.max(1, vals.length - 1);
  return vals.map((v, i) => [i * dx, pad + (h - 2 * pad) * (1 - (v - lo) / (hi - lo))] as const);
};
const caminho = (pts: readonly (readonly [number, number])[]) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

function SvgAreaDupla({ a, b }: { a: number[]; b: number[] }) {
  const w = 250, h = 62;
  const todos = [...a, ...b, 0];
  const lo = Math.min(...todos), hi = Math.max(...todos) || 1;
  const pts = (v: number[]) =>
    v.map((x, i) => [i * (w / Math.max(1, v.length - 1)), 4 + (h - 8) * (1 - (x - lo) / (hi - lo))] as const);
  const pa = pts(a), pb = pts(b);
  return (
    <svg className="hub-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${caminho(pb)} L${w} ${h} L0 ${h} Z`} fill={COR.vermelho} opacity=".2" />
      <path d={`${caminho(pa)} L${w} ${h} L0 ${h} Z`} fill={COR.verde} opacity=".26" />
      <path d={caminho(pa)} fill="none" stroke={COR.verde} strokeWidth="1.8" />
      <path d={caminho(pb)} fill="none" stroke={COR.vermelho} strokeWidth="1.8" strokeDasharray="3 2" />
    </svg>
  );
}

function SvgRosca({ fatias }: { fatias: { v: number; cor: string }[] }) {
  const tot = fatias.reduce((s, f) => s + f.v, 0) || 1;
  const r = 44, sw = 15, circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg viewBox="0 0 104 104" width="64" height="64" aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx="52" cy="52" r={r} fill="none" style={{ stroke: 'var(--nx-trilho)' }} strokeWidth={sw} />
      {fatias.map((f, i) => {
        const frac = Math.max(0, f.v / tot);
        const el = (
          <circle key={i} cx="52" cy="52" r={r} fill="none" stroke={f.cor} strokeWidth={sw}
            strokeDasharray={`${(frac * circ).toFixed(2)} ${circ.toFixed(2)}`}
            strokeDashoffset={(-off * circ).toFixed(2)} transform="rotate(-90 52 52)" />
        );
        off += frac;
        return el;
      })}
    </svg>
  );
}

function SvgColunas({ vals, cor }: { vals: number[]; cor: string }) {
  const w = 250, h = 56, gap = 3, n = vals.length;
  const mx = Math.max(...vals, 0) || 1;
  const bw = Math.max(2, (w - gap * (n - 1)) / n);
  return (
    <svg className="hub-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      {vals.map((v, i) => {
        const alt = Math.max(2, (h - 3) * (Math.max(0, v) / mx));
        return <rect key={i} x={i * (bw + gap)} y={h - alt} width={bw} height={alt} rx="1.5" fill={cor} opacity={i === n - 1 ? 1 : 0.45} />;
      })}
    </svg>
  );
}

function SvgLinhaZero({ vals }: { vals: number[] }) {
  const w = 250, h = 62;
  const lo = Math.min(...vals, 0), hi = Math.max(...vals, 0) || 1;
  const y0 = 4 + (h - 8) * (1 - (0 - lo) / (hi - lo));
  const pts = pontosSvg(vals, w, h, 4);
  const ult = pts[pts.length - 1];
  return (
    <svg className="hub-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      {Math.min(...vals) < 0 && <path d={`${caminho(pts)} L${w} ${y0.toFixed(1)} L0 ${y0.toFixed(1)} Z`} fill={COR.vermelho} opacity=".16" />}
      <line x1="0" y1={y0} x2={w} y2={y0} stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" opacity=".4" />
      <path d={caminho(pts)} fill="none" stroke={COR.ambar} strokeWidth="2" />
      <circle cx={ult[0]} cy={ult[1]} r="3" fill={COR.ambar} />
    </svg>
  );
}

function SvgAreaSubindo({ vals, cor }: { vals: number[]; cor: string }) {
  const w = 250, h = 58;
  const pts = pontosSvg(vals, w, h, 4);
  const ult = pts[pts.length - 1];
  return (
    <svg className="hub-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${caminho(pts)} L${w} ${h} L0 ${h} Z`} fill={cor} opacity=".22" />
      <path d={caminho(pts)} fill="none" stroke={cor} strokeWidth="2" />
      <circle cx={ult[0]} cy={ult[1]} r="3" fill={cor} />
    </svg>
  );
}

function Hub({
  paineis, abrir, rotulos, receita, despesa, invest, porCategoria, faturas,
  sobraMediana, sobras, patrimonio, mesAtual,
}: {
  paineis: typeof PAINEIS;
  abrir: (id: PainelId) => void;
  rotulos: string[];
  receita: number[];
  despesa: number[];
  invest: number[];
  porCategoria: [string, number][];
  faturas: [string, number][];
  sobraMediana: number;
  sobras: number[];
  patrimonio: number;
  mesAtual: string;
}) {
  const n = receita.length - 1;
  const sobrou = receita[n] - despesa[n];
  const TONS = [COR.vermelho, '#f0764e', '#e8a33d', '#b8646e', 'rgba(148,163,184,.6)'];
  const topo = porCategoria.slice(0, 4);
  const resto = porCategoria.slice(4).reduce((s, [, v]) => s + v, 0);
  const fat = [...topo.map(([nm, v], i) => ({ nm, v, cor: TONS[i] })), ...(resto > 0 ? [{ nm: 'demais', v: resto, cor: TONS[4] }] : [])];
  const totDesp = fat.reduce((s, f) => s + f.v, 0) || 1;
  const medRec = [...receita].sort((a, b) => a - b)[Math.floor(receita.length / 2)];
  const totFat = faturas.reduce((s, [, v]) => s + v, 0);
  const maxFat = Math.max(...faturas.map(([, v]) => v), 1);
  const noVermelho = sobras.filter((v) => v < 0).length;
  const acumInvest = invest.map((_, i) => invest.slice(0, i + 1).reduce((a, b) => a + b, 0));

  const previas: Record<PainelId, ReactNode> = {
    visaogeral: (
      <>
        <div className="hub-top">
          <div>
            <div className={`hub-big ${sobrou < 0 ? 'hub-neg' : 'hub-pos'}`}>{fmt0(sobrou)}</div>
            <div className="hub-cap">sobrou em {rotulos[n]}</div>
          </div>
          <div className="hub-leg">
            <span><i style={{ background: COR.verde }} />entrou</span>
            <span><i style={{ background: COR.vermelho, opacity: 0.75 }} />saiu</span>
          </div>
        </div>
        <SvgAreaDupla a={receita} b={despesa} />
      </>
    ),
    despesas: (
      <>
        <div className="hub-big hub-neg">{fmt0(totDesp)}</div>
        <div className="hub-cap">saiu no período</div>
        <div className="hub-ro">
          <SvgRosca fatias={fat.map((f) => ({ v: f.v, cor: f.cor }))} />
          <div className="hub-fats">
            {fat.slice(0, 4).map((f) => (
              <div className="hub-fat" key={f.nm}>
                <i style={{ background: f.cor }} />
                <span className="nm">{f.nm}</span>
                <span className="vl">{Math.round((100 * f.v) / totDesp)}%</span>
              </div>
            ))}
          </div>
        </div>
      </>
    ),
    receitas: (
      <>
        <div className="hub-top">
          <div>
            <div className="hub-big hub-pos">{fmt0(receita[n])}</div>
            <div className="hub-cap">em {rotulos[n]}</div>
          </div>
          <div className="hub-lado"><b>{fmt0(medRec)}</b><span>mediana</span></div>
        </div>
        <SvgColunas vals={receita} cor={COR.verde} />
        <div className="hub-cap">últimos {receita.length} meses</div>
      </>
    ),
    cartoes: (
      <>
        <div className="hub-big" style={{ color: COR.roxo }}>{fmt0(totFat)}</div>
        <div className="hub-cap">fatura de {mesAtual} · {faturas.length} cartões</div>
        <div className="hub-carts">
          {faturas.map(([nm, v]) => (
            <div className="hub-row" key={nm}>
              <span className="nm">{nm}</span>
              <span className="hub-bar"><i style={{ width: `${Math.max(4, Math.round((100 * v) / maxFat))}%`, background: COR.roxo }} /></span>
              <span className="vl">{fmt0(v)}</span>
            </div>
          ))}
        </div>
      </>
    ),
    projecoes: (
      <>
        <div className="hub-top">
          <div>
            <div className={`hub-big ${sobraMediana < 0 ? 'hub-neg' : 'hub-pos'}`}>{fmt0(sobraMediana)}</div>
            <div className="hub-cap">sobra mediana por mês</div>
          </div>
          <div className="hub-lado"><b>{noVermelho}/{sobras.length}</b><span>no vermelho</span></div>
        </div>
        <SvgLinhaZero vals={sobras} />
      </>
    ),
    investimentos: (
      <>
        <div className="hub-top">
          <div>
            <div className="hub-big" style={{ color: COR.ciano }}>{fmt0(patrimonio)}</div>
            <div className="hub-cap">aplicado hoje</div>
          </div>
        </div>
        <SvgAreaSubindo vals={acumInvest} cor={COR.ciano} />
      </>
    ),
  };

  return (
    <>
      <div className="hub-h">
        <b>Painéis</b>
        <span>cada card abre um painel completo</span>
      </div>
      <div className="hub-g">
        {paineis.map((p) => (
          <button key={p.id} type="button" className="hub-c" onClick={() => abrir(p.id)} aria-labelledby={`hub-t-${p.id}`}>
            <div className="hub-pv">{previas[p.id]}</div>
            <div className="hub-ft">
              <div className="hub-ic" aria-hidden="true" style={varsDoTom(p.tom)}>{p.icone}</div>
              <div><b id={`hub-t-${p.id}`}>{p.titulo}</b><span>{p.legenda}</span></div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}


export default function PainelNexus({ className = '', compacto = false }: Props) {
  const [aba, setAba] = useState<AbaId>('dashboard');
  // calculadora de Objetivos: a data que a pessoa escolheu, por objetivo ('AAAA-MM')
  const [datas, setDatas] = useState<Record<string, string>>({});

  // largura do viewBox: estreita no compacto para o texto do eixo sobreviver à redução
  const W = compacto ? 210 : 330;
  const H = 92;

  const meses = useMemo(() => [...new Set(lancamentosDemo.map((l) => l.data.slice(0, 7)))].sort(), []);
  const rotulos = meses.map(rotuloMes);
  const mesAtual = meses[meses.length - 1] ?? '';
  const mesAnterior = meses[meses.length - 2] ?? '';

  const doMes = useMemo(() => lancamentosDemo.filter((l) => l.data.startsWith(mesAtual)), [mesAtual]);
  const doMesAnterior = useMemo(
    () => lancamentosDemo.filter((l) => l.data.startsWith(mesAnterior)),
    [mesAnterior]
  );

  /** série mensal de um tipo, na ordem de `meses` */
  const serieDe = useMemo(
    () => (tipo: Lancamento['tipo'], filtro?: (l: Lancamento) => boolean) =>
      meses.map((m) =>
        soma(
          lancamentosDemo.filter(
            (l) => l.data.startsWith(m) && l.tipo === tipo && (filtro ? filtro(l) : true)
          )
        )
      ),
    [meses]
  );

  const serieReceita = useMemo(() => serieDe('receita'), [serieDe]);
  const serieDespesa = useMemo(() => serieDe('despesa'), [serieDe]);
  const serieInvest = useMemo(() => serieDe('investimento'), [serieDe]);
  const serieCartao = useMemo(
    () => serieDe('despesa', (l) => l.origem.startsWith('Cartão')),
    [serieDe]
  );

  const variacao = (atual: number, ant: number): number | null => (ant ? ((atual - ant) / ant) * 100 : null);
  const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  const receitaMes = soma(doTipo(doMes, 'receita'));
  const despesaMes = soma(doTipo(doMes, 'despesa'));
  const investMes = soma(doTipo(doMes, 'investimento'));

  /** saldo em conta acumulado ao fim de cada mês */
  const saldoAcum = useMemo(() => {
    let acc = 0;
    return meses.map((_, i) => (acc += serieReceita[i] - serieDespesa[i] - serieInvest[i]));
  }, [meses, serieReceita, serieDespesa, serieInvest]);

  const painelAberto = PAINEIS.find((p) => p.id === aba);
  const navAba = NAV.find((n) => n.id === aba);
  const rotuloAba = painelAberto?.titulo ?? navAba?.rotulo ?? '';
  const tomAba: Tom = painelAberto?.tom ?? navAba?.tom ?? 'azul';
  const menuAtivo = painelAberto ? 'dashboard' : aba;

  // ── dados por aba ───────────────────────────────────────────────────────────
  const receitas = lancamentosDemo.filter((l) => l.tipo === 'receita');
  const despesas = lancamentosDemo.filter((l) => l.tipo === 'despesa');
  const noCartao = despesas.filter((l) => l.origem.startsWith('Cartão'));
  const aportes = lancamentosDemo.filter((l) => l.tipo === 'investimento');

  const patrimonio = posicoesDemo.reduce((s, p) => s + p.valor, 0);
  const rendimentos = posicoesDemo.reduce((s, p) => s + p.rendimento, 0);

  // Projeção: média dos meses observados repetida à frente. É o método mais
  // simples possível, e o rótulo do bloco diz isso — não é um modelo.
  // Projeção pela mediana, como o app real (kpis.mediana): um mês atípico não puxa o futuro.
  const mediana = (xs: number[]) => {
    if (!xs.length) return 0;
    const o = [...xs].sort((a, b) => a - b);
    const m = Math.floor(o.length / 2);
    return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
  };
  const mediaReceita = mediana(serieReceita);
  const mediaDespesa = mediana(serieDespesa);
  const sobraMedia = mediaReceita - mediaDespesa;
  const MESES_PROJ = 4;
  const planos = useMemo(() => {
    const nomeMes = (n: number) => {
      const d = new Date(2026, 8 + n, 1); // parte de set/2026, mês seguinte ao último lançamento
      return `${MESES[d.getMonth()]}/${d.getFullYear()}`;
    };
    const i = Math.pow(1 + taxaRendimentoDemoAA, 1 / 12) - 1;
    return objetivosDemo.map((o) => {
      const n = Math.ceil(Math.max(0, o.alvo - o.atual) / o.aporte);
      let saldo = o.atual;
      let nj = 0;
      while (saldo < o.alvo && nj < 600) { saldo = saldo * (1 + i) + o.aporte; nj++; }
      return { ...o, chega: nomeMes(n), chegaJuros: nomeMes(nj), mesesAntes: n - nj, noPrazo: n <= o.prazoMeses, prazo: nomeMes(o.prazoMeses) };
    });
  }, []);
  const rotulosProj = useMemo(() => {
    const mes = Number(mesAtual.slice(5, 7));
    return Array.from({ length: MESES_PROJ }, (_, i) => MESES[(mes + i) % 12]);
  }, [mesAtual]);
  const rotulosComProj = [...rotulos, ...rotulosProj];
  const saldoProjetado = saldoAcum[saldoAcum.length - 1] + sobraMedia * MESES_PROJ;
  const comprometimento = mediaReceita ? (mediaDespesa / mediaReceita) * 100 : 0;

  // ── dados dos gráficos novos ───────────────────────────────────────────────
  const iN = meses.length - 1;
  const fontesSankey = agrupar(doTipo(doMes, 'receita'), (l) => l.sub).map(([nome, v], i) => ({ nome, v, cor: [COR.verde, '#7fd3b1', COR.ciano][i % 3] }));
  const sankeyDest = (() => {
    const cats = agrupar(doTipo(doMes, 'despesa'), (l) => l.categoria);
    const topo = cats.slice(0, 3);
    const resto = cats.slice(3).reduce((a, [, v]) => a + v, 0);
    const tons = [COR.vermelho, '#f0764e', '#e8a33d', '#b8646e'];
    const itens = topo.map(([nome, v], i) => ({ nome, v, cor: tons[i] }));
    if (resto > 0) itens.push({ nome: 'demais', v: resto, cor: tons[3] });
    if (investMes > 0) itens.push({ nome: 'investido', v: investMes, cor: COR.ciano });
    const sobrou = receitaMes - despesaMes - investMes;
    if (sobrou > 0) itens.push({ nome: 'sobrou', v: sobrou, cor: COR.verde });
    return itens;
  })();
  const passosCascata = [
    { nome: 'início', v: iN > 0 ? saldoAcum[iN - 1] : 0, total: true },
    { nome: 'receitas', v: receitaMes },
    { nome: 'despesas', v: -despesaMes },
    { nome: 'invest.', v: -investMes },
    { nome: 'final', v: saldoAcum[iN], total: true },
  ];
  const gastoPorDia = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of lancamentosDemo) if (l.tipo === 'despesa') m[l.data] = (m[l.data] ?? 0) + l.valor;
    return m;
  }, []);
  const calIni = new Date(`${meses[Math.max(0, iN - 2)]}-01T12:00:00`);
  const calFim = new Date(Number(mesAtual.slice(0, 4)), Number(mesAtual.slice(5, 7)), 0, 12);
  const medianaDe = (xs: number[]) => {
    if (!xs.length) return 0;
    const o = [...xs].sort((a, b) => a - b), m = Math.floor(o.length / 2);
    return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
  };
  const mesVsMediana = agrupar(doTipo(doMes, 'despesa'), (l) => l.categoria).map(([rotulo, valor]) => ({
    rotulo, valor,
    mediana: medianaDe(meses.slice(0, iN).map((m) => soma(lancamentosDemo.filter((l) => l.data.startsWith(m) && l.tipo === 'despesa' && l.categoria === rotulo)))),
  }));
  const recExtra = meses.map((m) => {
    const rs = lancamentosDemo.filter((l) => l.data.startsWith(m) && l.tipo === 'receita');
    return { rec: soma(rs.filter((l) => l.sub === 'Salário')), extra: soma(rs.filter((l) => l.sub !== 'Salário')) };
  });
  const cartoesIds = contasDemo.filter((c) => c.tipo === 'cartao');
  const faturasPorCartao = cartoesIds.map((c, i) => ({
    nome: c.rotulo, cor: [COR.roxo, '#6f7fe0'][i % 2],
    dados: meses.map((m) => soma(lancamentosDemo.filter((l) => l.data.startsWith(m) && l.tipo === 'despesa' && l.origem === c.id))),
  }));
  const faixaProj = (() => {
    const o = [...serieReceita.map((r, i) => r - serieDespesa[i])].sort((a, b) => a - b);
    const q = (f: number) => o[Math.min(o.length - 1, Math.floor(f * (o.length - 1)))];
    const base = saldoAcum[iN];
    const passo = (v: number) => Array.from({ length: 7 }, (_, i) => base + v * i);
    return { centro: passo(sobraMedia), baixo: passo(q(0.25)), alto: passo(q(0.75)) };
  })();
  const rotProj6 = ['hoje', ...Array.from({ length: 6 }, (_, i) => MESES[(Number(mesAtual.slice(5, 7)) + i) % 12])];
  const mediaAporte = media(serieInvest);

  const cartoes = contasDemo.filter((c) => c.tipo === 'cartao');

  // Alertas inteligentes do Dashboard (até 3 linhas: lembrete, ritmo do mês e
  // conquista). Tudo sai dos lançamentos fictícios; o ritmo descreve, não prevê.
  const despesaMediana = mediana(serieDespesa.slice(0, -1));
  const alertas: { tom: Tom; icone: string; titulo: string; texto: string }[] = [];
  const proxFatura = [...cartoes].sort((a, b) => (a.vencimento ?? 0) - (b.vencimento ?? 0))[0];
  if (proxFatura) {
    const v = soma(doMes.filter((l) => l.origem === proxFatura.id));
    alertas.push({ tom: 'roxo', icone: '▤', titulo: `Fatura do ${proxFatura.rotulo} vence dia ${proxFatura.vencimento}`,
      texto: `${fmt0(v)} em compras de ${rotuloMes(mesAtual)}.` });
  }
  if (despesaMediana > 0) {
    const d = ((despesaMes - despesaMediana) / despesaMediana) * 100;
    alertas.push({ tom: 'ambar', icone: '◐', titulo: `Ritmo do mês: ${pct1(Math.abs(d))} ${d >= 0 ? 'acima' : 'abaixo'} do normal`,
      texto: `Saiu ${fmt0(despesaMes)} em ${rotuloMes(mesAtual)}; a mediana dos meses anteriores é ${fmt0(despesaMediana)}.` });
  }
  if (receitaMes - despesaMes > 0)
    alertas.push({ tom: 'indigo', icone: '✓', titulo: `${rotuloCompetencia(mesAtual)} fechou no azul`,
      texto: `Sobrou ${fmt0(receitaMes - despesaMes)} (receita ${fmt0(receitaMes)} − despesa ${fmt0(despesaMes)}).` });

  // Objetivos: quanto guardar por mês para chegar na data escolhida
  const mesesAte = (aaaamm: string) => {
    const [a, m] = aaaamm.split('-').map(Number);
    return (a - 2026) * 12 + (m - 9); // conta a partir de set/2026, o mês seguinte ao último lançamento
  };
  const aaaammDe = (n: number) => {
    const d = new Date(2026, 8 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div className={`nx ${compacto ? 'nx-cmp' : ''} ${className}`}>
      <style>{`
        .nx {
          --lm-bg:10,14,26;
          --lm-text:226,232,240; --lm-text2:127,142,163; --lm-text3:148,163,184;
          --lm-blue:59,130,246; --lm-green:16,185,129; --lm-purple:139,92,246;
          --lm-red:239,68,68; --lm-cyan:6,182,212; --lm-amber:245,158,11;
          --nx-bg:rgb(var(--lm-bg));
          --nx-text:rgb(var(--lm-text)); --nx-text2:rgb(var(--lm-text2)); --nx-text3:rgb(var(--lm-text3));
          --nx-blue:rgb(var(--lm-blue)); --nx-green:rgb(var(--lm-green));
          --nx-red:rgb(var(--lm-red)); --nx-cyan:rgb(var(--lm-cyan));
          --nx-purple:rgb(var(--lm-purple)); --nx-amber:rgb(var(--lm-amber));
          --nx-surface:hsla(0,0%,100%,.045); --nx-line:hsla(0,0%,100%,.07); --nx-line2:hsla(0,0%,100%,.11);
          --nx-trilho:hsla(0,0%,100%,.07); --nx-flut:rgb(15,21,34); --nx-grade:rgba(30,42,58,.75);
          --nx-pilula:#f1f5f9; --nx-pilula-tx:#0f172a; --nx-faixa-a:.22;
          background:var(--nx-bg); border:1px solid var(--nx-line); border-radius:10px;
          overflow:hidden; font-family:'Inter Variable',system-ui,sans-serif;
          color:var(--nx-text); container-type:inline-size; font-size:11px;
        }
        /* layout 1.4.0: barra lateral e cabeçalho flutuantes, soltos da borda */
        .nx-shell { display:flex; gap:7px; padding:7px; }
        .nx-side { width:36px; flex-shrink:0; align-self:flex-start; display:flex; flex-direction:column; align-items:center;
          gap:4px; padding:7px 0; border:1px solid var(--nx-line2); border-radius:12px; background:var(--nx-flut); }
        .nx-logo { width:22px; height:22px; border-radius:50%; display:grid; place-items:center; margin-bottom:6px;
          font-size:10px; font-weight:800; color:#fff; background:radial-gradient(circle at 30% 30%,#2a3a5c,#0b1222);
          border:1px solid var(--nx-line2); }
        .nx-item { width:26px; height:26px; border-radius:8px; display:grid; place-items:center; background:none; border:0;
          cursor:pointer; font-family:inherit; font-size:11px; color:var(--nx-text3); transition:background .2s,color .2s; }
        .nx-item:hover { background:var(--nx-trilho); color:var(--nx-text); }
        .nx-item.on { background:var(--nx-pilula); color:var(--nx-pilula-tx); }
        .nx-main { flex:1; min-width:0; }
        .nx-hd { display:flex; align-items:center; gap:7px; min-height:36px; padding:5px 9px;
          border:1px solid var(--nx-line2); border-radius:12px; background:var(--nx-flut); }
        .nx-mod { width:21px; height:21px; border-radius:7px; flex-shrink:0; display:grid; place-items:center; font-size:10px;
          color:#fff; background:linear-gradient(135deg,rgba(var(--tom),1),rgba(var(--tom),.7)); }
        .nx-hd .t { font-size:10.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; white-space:nowrap; }
        .nx-dot { width:6px; height:6px; border-radius:50%; background:var(--nx-green);
          box-shadow:0 0 5px var(--nx-green); flex-shrink:0; }
        .nx-busca { margin-left:auto; font-size:9px; color:var(--nx-text2); border:1px solid var(--nx-line2);
          border-radius:999px; padding:3px 9px; white-space:nowrap; }
        @container (max-width: 560px) { .nx-busca { display:none; } .nx-hd .per { margin-left:auto; } }
        .nx-hd .per { font-size:9px; color:var(--nx-text3); white-space:nowrap; border:1px solid var(--nx-line2);
          border-radius:999px; padding:3px 8px; }
        .nx-demo { color:var(--nx-text2); }
        .nx-av { width:21px; height:21px; border-radius:50%; font-size:9px; font-weight:600; color:#fff;
          flex-shrink:0; background:linear-gradient(135deg,var(--nx-blue),var(--nx-purple));
          display:flex; align-items:center; justify-content:center; }
        .nx-body { padding:8px 0 0; }
        .nx-kpis { display:grid; grid-template-columns:repeat(2,1fr); gap:7px; }
        .nx-grid2 { display:grid; gap:8px; margin-top:8px; }
        /* 460px: abaixo disso os 4 KPIs lado a lado ficariam com o valor cortado
           e os dois gráficos, ilegíveis. Container query, não media query — o que
           manda é a largura do painel, não a da janela. O valor foi calibrado
           para o card do índice caber em meia largura: exigir mais espremeria a
           coluna de texto e o card voltaria a crescer pelo outro lado. */
        @container (min-width: 460px) {
          .nx-kpis { grid-template-columns:repeat(var(--n,4),1fr); }
          .nx-grid2 { grid-template-columns:1fr 1fr; }
        }
        .kpi { background:var(--nx-surface); border:1px solid var(--nx-line); border-radius:8px;
          padding:8px 9px; position:relative; overflow:hidden; transition:transform .2s,border-color .2s; }
        .kpi::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; }
        .kpi:hover { transform:translateY(-2px); border-color:var(--nx-line2); }
        .kpi-hd { display:flex; justify-content:space-between; align-items:flex-start; gap:5px; }
        .kpi-lb { font-size:8.5px; font-weight:500; color:var(--nx-text3); line-height:1.3; }
        .kpi-vl { font-size:13.5px; font-weight:700; letter-spacing:-.4px; line-height:1.2;
          font-variant-numeric:tabular-nums; margin-top:2px; }
        /* o valor fica no texto; a cor do cartão é a de identidade do assunto (utils/tons.py) */
        .kpi { --tom:59,130,246; }
        .kpi.green { --tom:99,102,241; } .kpi.red { --tom:236,72,153; } .kpi.blue { --tom:59,130,246; }
        .kpi.cyan { --tom:6,182,212; } .kpi.purple { --tom:139,92,246; } .kpi.amber { --tom:245,158,11; }
        .kpi::before { background:linear-gradient(90deg,rgba(var(--tom),1),transparent); }
        .kpi-ic { width:21px; height:21px; border-radius:7px; flex-shrink:0; display:flex; align-items:center;
          justify-content:center; font-size:10px; color:#fff; background:linear-gradient(135deg,rgba(var(--tom),1),rgba(var(--tom),.7)); }
        .kpi-ft { margin-top:5px; display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
        .kpi-dl { display:inline-flex; align-items:center; gap:2px; padding:1px 4px; border-radius:3px;
          font-size:8.5px; font-weight:600; }
        .up { background:rgba(var(--lm-green),.15); color:var(--nx-green); }
        .down { background:rgba(var(--lm-red),.15); color:var(--nx-red); }
        .kpi-nt { color:var(--nx-text2); font-size:8.5px; }
        .nx-card { background:var(--nx-surface); border:1px solid var(--nx-line); border-radius:8px; margin-top:8px; overflow:hidden; }
        .nx-bc { padding:9px 10px; }
        .nx-grid2 > .nx-card { margin-top:0; }
        .nx-veredito { margin:8px 0 0; font-size:12px; line-height:1.5; color:var(--nx-text, inherit); }
        .nx-veredito.sec { opacity:.75; }
        /* faixa do bloco: tom do assunto, ícone e título em caixa alta */
        .nx-sec { font-size:8.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--tom-tx);
          background:rgba(var(--tom),var(--nx-faixa-a)); border-bottom:1px solid rgba(var(--tom),.3); padding:5px 10px;
          display:flex; align-items:center; gap:6px; }
        .nx-sec::before { content:var(--tom-glifo); font-size:9px; }
        .nx-abas { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
        .nx-aba { font-family:inherit; font-size:9.5px; font-weight:600; color:var(--nx-text3); background:transparent;
          border:1px solid var(--nx-line2); border-radius:999px; padding:3px 9px; cursor:pointer; }
        .nx-aba:hover { color:var(--nx-text); }
        .nx-aba.on { background:var(--nx-pilula); color:var(--nx-pilula-tx); border-color:var(--nx-pilula); }
        .nx-alertas { display:flex; flex-direction:column; gap:6px; }
        .nx-alerta { display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:8px;
          background:rgba(var(--tom),.1); border:1px solid rgba(var(--tom),.35); }
        .nx-alerta .ic { width:20px; height:20px; border-radius:6px; display:grid; place-items:center; flex:none;
          font-size:10px; background:rgba(var(--tom),.22); color:var(--tom-tx); }
        .nx-alerta b { display:block; font-size:10px; color:var(--tom-tx); }
        .nx-alerta span { display:block; font-size:9px; color:var(--nx-text3); }
        .nx-alerta .sx { margin-left:auto; color:var(--tom-tx); font-size:12px; }
        .nx-obj { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
        .nx-obj > div { border:1px solid var(--nx-line); border-radius:7px; padding:5px 7px; }
        .nx-obj span { display:block; font-size:8.5px; color:var(--nx-text2); }
        .nx-obj b { font-size:11px; font-variant-numeric:tabular-nums; }
        .nx-prog { height:6px; border-radius:99px; background:var(--nx-trilho); margin-top:8px; overflow:hidden; }
        .nx-prog i { display:block; height:100%; border-radius:99px; background:linear-gradient(90deg,rgb(249,115,22),rgb(251,160,97)); }
        .nx-calc { display:flex; align-items:center; gap:7px; margin-top:8px; font-size:9.5px; color:var(--nx-text3); }
        .nx-calc input { font-family:inherit; font-size:9.5px; color:var(--nx-text); background:var(--nx-trilho);
          border:1px solid var(--nx-line2); border-radius:6px; padding:2px 5px; color-scheme:var(--nx-esquema,dark); }
        .nx-lg { display:flex; gap:10px; margin-bottom:5px; flex-wrap:wrap; }
        .nx-lg span { display:inline-flex; align-items:center; gap:4px; font-size:8.5px; color:var(--nx-text3); }
        .nx-lg i { width:6px; height:6px; border-radius:50%; display:inline-block; }
        .cht { width:100%; height:auto; display:block; overflow:visible; }
        .cht text { font-size:7px; fill:var(--nx-text2); font-family:'Inter Variable',system-ui,sans-serif; }
        .cht .gl { stroke:var(--nx-grade); stroke-width:.6; }
        .bar-row + .bar-row { margin-top:7px; }
        .bar-hd { display:flex; justify-content:space-between; gap:7px; font-size:10px; }
        .bar-hd .c { color:var(--nx-text3); }
        .bar-hd .v { color:var(--nx-text2); font-variant-numeric:tabular-nums; }
        .bar-tk { margin-top:3px; height:4px; border-radius:99px; background:var(--nx-trilho); overflow:hidden; }
        .bar-fl { height:100%; border-radius:99px; background:linear-gradient(90deg,var(--nx-blue),var(--nx-purple)); }
        .nx-tb { width:100%; border-collapse:collapse; font-size:10px; }
        .nx-tb th { text-align:left; font-weight:600; font-size:8px; letter-spacing:.5px;
          text-transform:uppercase; color:var(--nx-text2); padding-bottom:5px;
          border-bottom:1px solid var(--nx-line); }
        .nx-tb td { padding:5px 0; border-bottom:1px solid var(--nx-line); color:var(--nx-text3); }
        .nx-tb tr:last-child td { border-bottom:0; }
        .nx-tb .dt { color:var(--nx-text2); font-variant-numeric:tabular-nums; white-space:nowrap; }
        .nx-tb .vl { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; font-weight:500; }
        .nx-tb .vl.pos { color:var(--nx-green); }
        .nx-tb .vl.neg { color:var(--nx-red); }
        .nx-tb .vl.inv { color:var(--nx-blue); }
        .nx-tag { display:inline-block; padding:1px 5px; border-radius:3px; font-size:8.5px;
          background:var(--nx-trilho); color:var(--nx-text2); white-space:nowrap; }
        .nx-scr { max-height:132px; overflow-y:auto; }
        .nx-scr::-webkit-scrollbar { width:5px; }
        .nx-scr::-webkit-scrollbar-thumb { background:var(--nx-trilho); border-radius:99px; }
        @container (max-width: 400px) { .nx-demo { display:none; } }
        .nx-voltar { background:none; border:1px solid var(--nx-line2); border-radius:999px; padding:2px 8px; cursor:pointer;
          font-family:inherit; font-size:9px; color:var(--nx-text3); white-space:nowrap; }
        .nx-voltar:hover { color:var(--nx-text); }
        .hub-g { display:grid; gap:8px; grid-template-columns:1fr; }
        @container (min-width: 420px) { .hub-g { grid-template-columns:1fr 1fr; } }
        @container (min-width: 640px) { .hub-g { grid-template-columns:repeat(3,1fr); } }
        .hub-h { display:flex; align-items:baseline; gap:8px; margin:0 0 8px; }
        .hub-h b { font-size:12px; }
        .hub-h span { margin-left:auto; font-size:9.5px; color:var(--nx-text2); }
        .hub-c { display:flex; flex-direction:column; text-align:left; font-family:inherit; cursor:pointer;
          background:var(--nx-surface); border:1px solid var(--nx-line); border-radius:10px;
          overflow:hidden; color:inherit; padding:0; min-width:0; transition:border-color .13s, transform .13s; }
        .hub-c:hover { border-color:var(--nx-blue); transform:translateY(-2px); }
        .hub-pv { flex:1; padding:10px 11px; display:flex; flex-direction:column; gap:6px; min-width:0; min-height:98px; }
        .hub-ft { display:flex; align-items:center; gap:7px; padding:7px 10px;
          border-top:1px solid var(--nx-line); background:var(--nx-trilho); }
        .hub-ic { width:22px; height:22px; border-radius:7px; display:grid; place-items:center; color:#fff;
          background:linear-gradient(135deg,rgba(var(--tom),1),rgba(var(--tom),.7)); font-size:10px; flex:none; }
        .hub-ft b { display:block; font-size:10.5px; }
        .hub-ft span { display:block; font-size:9px; color:var(--nx-text2); }
        .hub-big { font-size:17px; font-weight:700; font-variant-numeric:tabular-nums; line-height:1.1; }
        .hub-cap { font-size:9px; color:var(--nx-text2); }
        .hub-top { display:flex; align-items:flex-start; gap:6px; }
        .hub-lado { margin-left:auto; text-align:right; white-space:nowrap; }
        .hub-lado b { display:block; font-size:10.5px; font-variant-numeric:tabular-nums; }
        .hub-lado span { display:block; font-size:8.5px; color:var(--nx-text2); }
        .hub-leg { margin-left:auto; display:flex; flex-direction:column; gap:2px; font-size:8.5px; color:var(--nx-text2); white-space:nowrap; }
        .hub-leg i { display:inline-block; width:10px; height:3px; border-radius:2px; margin-right:4px; vertical-align:middle; }
        .hub-svg { width:100%; height:42px; display:block; margin-top:auto; flex:none; }
        .hub-ro { display:flex; align-items:center; gap:10px; margin-top:auto; margin-bottom:auto; }
        .hub-fats { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
        .hub-fat { display:flex; align-items:center; gap:5px; font-size:9px; }
        .hub-fat i { width:7px; height:7px; border-radius:2px; flex:none; }
        .hub-fat .nm { color:var(--nx-text2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .hub-fat .vl { margin-left:auto; font-variant-numeric:tabular-nums; }
        .hub-row { display:flex; align-items:center; gap:6px; font-size:9px; }
        .hub-row .nm { color:var(--nx-text2); min-width:44px; white-space:nowrap; }
        .hub-row .vl { margin-left:auto; font-variant-numeric:tabular-nums; }
        .hub-bar { flex:1; height:5px; border-radius:3px; background:var(--nx-trilho); overflow:hidden; min-width:20px; }
        .hub-bar i { display:block; height:100%; border-radius:3px; }
        .hub-carts { display:flex; flex-direction:column; gap:6px; margin-top:auto; margin-bottom:auto; }
        .hub-pos { color:var(--nx-green); } .hub-neg { color:var(--nx-red); }
        .nx [style] { --tom-tx:var(--tom-txe); }
        /* tema claro do site: o tema "claro" do app (utils/layout.py) */
        :root[data-theme='light'] .nx {
          --lm-bg:232,236,243; --lm-text:23,32,46; --lm-text2:95,106,121; --lm-text3:60,72,90;
          --lm-blue:29,99,214; --lm-green:5,140,98; --lm-purple:110,64,214;
          --lm-red:206,42,42; --lm-cyan:8,140,166; --lm-amber:176,106,6;
          --nx-surface:#fff; --nx-line:rgba(19,28,44,.12); --nx-line2:rgba(19,28,44,.18);
          --nx-trilho:rgba(19,28,44,.08); --nx-flut:#f3f6fa; --nx-grade:rgba(19,28,44,.12);
          --nx-pilula:#1e293b; --nx-pilula-tx:#fff; --nx-faixa-a:.16; --nx-esquema:light;
        }
        :root[data-theme='light'] .nx [style] { --tom-tx:var(--tom-txc); }
        @media (prefers-reduced-motion: reduce) { .nx * { transition:none !important; } }
      `}</style>

      <div className="nx-shell">
        {/* barra lateral flutuante, recolhida: só os ícones, como o app abre */}
        <nav className="nx-side" aria-label="Navegação do painel">
          <div className="nx-logo" aria-hidden="true">N</div>
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`nx-item ${menuAtivo === n.id ? 'on' : ''}`}
              aria-current={menuAtivo === n.id ? 'page' : undefined}
              aria-label={n.rotulo}
              title={n.rotulo}
              onClick={() => setAba(n.id)}
            >
              <span aria-hidden="true">{n.icone}</span>
            </button>
          ))}
        </nav>

        <div className="nx-main" style={varsDoTom(tomAba)}>
          {/* cabeçalho de módulo: ícone no quadrado da cor de identidade + TÍTULO */}
          <header className="nx-hd">
            <span className="nx-mod" aria-hidden="true">{painelAberto?.icone ?? navAba?.icone}</span>
            <span className="t">{rotuloAba}</span>
            {painelAberto && (
              <button type="button" className="nx-voltar" onClick={() => setAba('dashboard')}>
                ← Dashboard
              </button>
            )}
            <span className="nx-dot" aria-hidden="true" />
            <span className="nx-busca" aria-hidden="true">Pergunte ao assistente…</span>
            <span className="per">
              ◷ {rotuloCompetencia(mesAtual)}
              <span className="nx-demo"> · dados fictícios</span>
            </span>
            <span className="nx-av" aria-hidden="true">E</span>
          </header>

          <div className="nx-body">
            {painelAberto && (
              <div className="nx-abas" role="group" aria-label="Painéis">
                {PAINEIS.map((p) => (
                  <button key={p.id} type="button" className={`nx-aba ${p.id === aba ? 'on' : ''}`}
                    aria-pressed={p.id === aba} onClick={() => setAba(p.id)}>
                    <span aria-hidden="true">{p.icone}</span> {p.titulo}
                  </button>
                ))}
              </div>
            )}

            {/* ── Hub: a entrada do Dashboard ───────────────────────────── */}
            {aba === 'dashboard' && (
              <>
              {/* no card do índice o Dashboard abre direto nos painéis: KPIs e alertas só na página do projeto */}
              {!compacto && <Kpis
                lista={[
                  { label: `Receitas · ${rotuloMes(mesAtual)}`, valor: fmt0(receitaMes), cor: 'green', icone: '▲',
                    delta: variacao(receitaMes, soma(doTipo(doMesAnterior, 'receita'))), bomSeSobe: true },
                  { label: `Despesas · ${rotuloMes(mesAtual)}`, valor: fmt0(despesaMes), cor: 'red', icone: '▼',
                    delta: variacao(despesaMes, soma(doTipo(doMesAnterior, 'despesa'))), bomSeSobe: false },
                  { label: `Saldo do mês · ${rotuloMes(mesAtual)}`, valor: fmt0(receitaMes - despesaMes), cor: 'blue', icone: '⬡',
                    nota: 'receita menos despesa' },
                ]}
              />}
              {!compacto && (
                <Bloco titulo="Alertas inteligentes" tom="azul">
                  <div className="nx-alertas">
                    {alertas.slice(0, 3).map((a) => (
                      <div key={a.titulo} className="nx-alerta" style={varsDoTom(a.tom)}>
                        <span className="ic" aria-hidden="true">{a.icone}</span>
                        <div><b>{a.titulo}</b><span>{a.texto}</span></div>
                        <span className="sx" aria-hidden="true">›</span>
                      </div>
                    ))}
                  </div>
                </Bloco>
              )}
              <Hub
                paineis={PAINEIS}
                abrir={(id) => setAba(id)}
                rotulos={rotulos}
                receita={serieReceita}
                despesa={serieDespesa}
                invest={serieInvest}
                porCategoria={agrupar(despesas, (l) => l.categoria)}
                faturas={agrupar(noCartao.filter((l) => l.data.startsWith(mesAtual)), (l) => l.origem)}
                sobraMediana={sobraMedia}
                sobras={serieReceita.map((r, i) => r - serieDespesa[i])}
                patrimonio={patrimonio}
                mesAtual={rotuloMes(mesAtual)}
              />
              </>
            )}

            {/* ── Visão geral ───────────────────────────────────────────── */}
            {aba === 'visaogeral' && (
              <>
                <Kpis
                  lista={[
                    { label: 'Receita Total', valor: fmt0(receitaMes), cor: 'green', icone: '▲',
                      delta: variacao(receitaMes, soma(doTipo(doMesAnterior, 'receita'))), bomSeSobe: true },
                    { label: 'Despesa Total', valor: fmt0(despesaMes), cor: 'red', icone: '▼',
                      delta: variacao(despesaMes, soma(doTipo(doMesAnterior, 'despesa'))), bomSeSobe: false },
                    { label: 'Saldo Real', valor: fmt0(saldoAcum[saldoAcum.length - 1]), cor: 'blue', icone: '◈',
                      nota: 'saldo em conta' },
                    { label: 'Saldo Investido', valor: fmt0(patrimonio), cor: 'purple', icone: '◷',
                      nota: `${fmt0(investMes)} aplicados no mês` },
                  ]}
                />
                <div className="nx-grid2">
                  <Bloco titulo="Receita × Despesa — Mensal">
                    <Legenda itens={[{ nome: 'Receita', cor: COR.verde }, { nome: 'Despesa', cor: COR.vermelho }]} />
                    <Barras
                      rotulos={rotulos} W={W} H={H}
                      series={[
                        { nome: 'Receita', cor: COR.verde, dados: serieReceita },
                        { nome: 'Despesa', cor: COR.vermelho, dados: serieDespesa },
                      ]}
                      descricao={`Receita e despesa por mês. ${rotulos.map((r, i) => `${r}: receita ${fmt0(serieReceita[i])}, despesa ${fmt0(serieDespesa[i])}`).join('. ')}`}
                    />
                  </Bloco>
                  <Bloco titulo="Saldo por Mês — Bancos">
                    <Legenda itens={[{ nome: 'Saldo acumulado em conta', cor: COR.ciano }]} />
                    <Linha
                      rotulos={rotulos} valores={saldoAcum} cor={COR.ciano} W={W} H={H}
                      descricao={`Saldo acumulado por mês. ${rotulos.map((r, i) => `${r}: ${fmt0(saldoAcum[i])}`).join('. ')}`}
                    />
                  </Bloco>
                </div>

                {!compacto && (
                  <>
                      <Bloco titulo="Assinaturas">
                        <BarrasH
                          itens={agrupar(doTipo(doMes, 'despesa').filter((l) => l.sub === 'Fixa'), (l) => l.descricao)
                            .map(([rotulo, valor]) => ({ rotulo, valor }))}
                        />
                      </Bloco>
                    <Bloco titulo={`Para onde foi o dinheiro — ${rotuloMes(mesAtual)}`}>
                      <Sankey fontes={fontesSankey} destinos={sankeyDest}
                        descricao={`Fluxo do mês: ${fmt0(receitaMes)} de receita até as categorias de despesa, investimento e sobra.`} />
                    </Bloco>
                    <div className="nx-grid2">
                      <Bloco titulo={`Do saldo inicial ao final — ${rotuloMes(mesAtual)}`}>
                        <Cascata passos={passosCascata} W={W} H={H}
                          descricao={`Saldo de ${fmt0(passosCascata[0].v)} até ${fmt0(passosCascata[4].v)} no mês.`} />
                      </Bloco>
                      <Bloco titulo="Calendário de gasto diário">
                        <Calendario dias={gastoPorDia} inicio={calIni} fim={calFim}
                          descricao="Cada quadrado é um dia; quanto mais forte, mais se gastou." />
                      </Bloco>
                    </div>
                    <TabelaLancamentos titulo="Histórico de Lançamentos" lista={doMes} rotuloAba={rotuloAba} />
                  </>
                )}
              </>
            )}

            {/* ── Receitas ──────────────────────────────────────────────── */}
            {/* ── Lançamentos ───────────────────────────────────────────── */}
            {aba === 'lancamentos' && (
              <>
                <Kpis
                  lista={[
                    { label: 'Entrou', valor: fmt0(receitas.reduce((a, l) => a + l.valor, 0)), cor: 'green', icone: '▲' },
                    { label: 'Saiu', valor: fmt0(despesas.reduce((a, l) => a + l.valor, 0)), cor: 'red', icone: '▼' },
                    { label: 'Lançamentos', valor: String(lancamentosDemo.length), cor: 'blue', icone: '☰',
                      nota: 'todos os meses da base' },
                  ]}
                />
                <TabelaLancamentos
                  titulo="Todos os lançamentos"
                  lista={[...lancamentosDemo].sort((a, b) => b.data.localeCompare(a.data))}
                  rotuloAba={rotuloAba}
                />
              </>
            )}

            {aba === 'receitas' && (
              <>
                <Kpis
                  lista={[
                    { label: 'Receita Total', valor: fmt0(soma(receitas)), cor: 'green', icone: '▲',
                      nota: `entradas de ${rotulos[0]} a ${rotulos[rotulos.length - 1]}` },
                    { label: 'Maior Entrada', valor: fmt0(Math.max(...receitas.map((l) => l.valor))), cor: 'amber', icone: '◈',
                      nota: 'maior receita registrada' },
                    { label: 'Média Mensal', valor: fmt0(mediaReceita), cor: 'purple', icone: '◷',
                      nota: 'entrada média por mês' },
                    { label: `Receita ${rotuloCompetencia(mesAtual)}`, valor: fmt0(receitaMes), cor: 'cyan', icone: '▦',
                      delta: variacao(receitaMes, soma(doTipo(doMesAnterior, 'receita'))), bomSeSobe: true },
                  ]}
                />
                <div className="nx-grid2">
                  <Bloco titulo="Receita — Mensal">
                    <Legenda itens={[{ nome: 'Receita', cor: COR.verde }]} />
                    <Barras
                      rotulos={rotulos} W={W} H={H}
                      series={[{ nome: 'Receita', cor: COR.verde, dados: serieReceita }]}
                      descricao={`Receita por mês. ${rotulos.map((r, i) => `${r}: ${fmt0(serieReceita[i])}`).join('. ')}`}
                    />
                  </Bloco>
                  <Bloco titulo="Fontes de Receita">
                    <Rosca
                      W={W} H={H}
                      fatias={agrupar(receitas, (l) => l.sub).map(([rotulo, valor]) => ({ rotulo, valor }))}
                      centro={{ valor: tickCurto(soma(receitas)), rotulo: 'total' }}
                      descricao={`Fontes de receita. ${agrupar(receitas, (l) => l.sub).map(([k, v]) => `${k}: ${fmt0(v)}`).join('. ')}`}
                    />
                  </Bloco>
                </div>

                {!compacto && (
                  <>
                    <div className="nx-grid2">
                      <Bloco titulo="Receita por Banco">
                        <Rosca
                          W={W} H={H}
                          fatias={agrupar(receitas, (l) => l.origem).map(([rotulo, valor]) => ({ rotulo, valor }))}
                          centro={{ valor: tickCurto(soma(receitas)), rotulo: 'total' }}
                          descricao={`Receita por banco. ${agrupar(receitas, (l) => l.origem).map(([k, v]) => `${k}: ${fmt0(v)}`).join('. ')}`}
                        />
                      </Bloco>
                      <Bloco titulo="Top 5 Maiores Receitas">
                        <BarrasH
                          itens={[...receitas].sort((a, b) => b.valor - a.valor).slice(0, 5)
                            .map((l) => ({ rotulo: `${l.descricao} · ${rotuloMes(l.data)}`, valor: l.valor }))}
                        />
                      </Bloco>
                    </div>
                    <Bloco titulo="Recorrente × extra">
                      <Legenda itens={[{ nome: 'recorrente', cor: COR.verde }, { nome: 'extra', cor: '#7fd3b1' }]} />
                      <Barras rotulos={rotulos} W={W} H={H}
                        series={[{ nome: 'recorrente', cor: COR.verde, dados: recExtra.map((r) => r.rec) }, { nome: 'extra', cor: '#7fd3b1', dados: recExtra.map((r) => r.extra) }]}
                        descricao="Receita recorrente (salário) e extra, por mês." />
                    </Bloco>
                    <TabelaLancamentos titulo="Transações de Receita" lista={receitas} rotuloAba={rotuloAba} />
                  </>
                )}
              </>
            )}

            {/* ── Despesas ──────────────────────────────────────────────── */}
            {aba === 'despesas' && (
              <>
                <Kpis
                  lista={[
                    { label: 'Despesa Total', valor: fmt0(soma(despesas)), cor: 'red', icone: '▼',
                      nota: `saídas de ${rotulos[0]} a ${rotulos[rotulos.length - 1]}` },
                    { label: 'Maior Despesa', valor: fmt0(Math.max(...despesas.map((l) => l.valor))), cor: 'amber', icone: '◈',
                      nota: 'maior saída registrada' },
                    { label: 'Média Mensal', valor: fmt0(mediaDespesa), cor: 'purple', icone: '◷',
                      nota: 'saída média por mês' },
                    { label: `Despesa ${rotuloCompetencia(mesAtual)}`, valor: fmt0(despesaMes), cor: 'cyan', icone: '▦',
                      delta: variacao(despesaMes, soma(doTipo(doMesAnterior, 'despesa'))), bomSeSobe: false },
                  ]}
                />
                <div className="nx-grid2">
                  <Bloco titulo="Despesa — Mensal">
                    <Legenda itens={[{ nome: 'Despesa', cor: COR.vermelho }]} />
                    <Barras
                      rotulos={rotulos} W={W} H={H}
                      series={[{ nome: 'Despesa', cor: COR.vermelho, dados: serieDespesa }]}
                      descricao={`Despesa por mês. ${rotulos.map((r, i) => `${r}: ${fmt0(serieDespesa[i])}`).join('. ')}`}
                    />
                  </Bloco>
                  <Bloco titulo="Despesas por Categoria">
                    {/* 3 linhas no compacto: com 5, esta coluna fica mais alta que
                        o gráfico ao lado e o card muda de altura ao trocar de aba */}
                    <BarrasH
                      itens={agrupar(doTipo(doMes, 'despesa'), (l) => l.categoria)
                        .slice(0, compacto ? 3 : 5).map(([rotulo, valor]) => ({ rotulo, valor }))}
                    />
                  </Bloco>
                </div>

                {!compacto && (
                  <>
                    <div className="nx-grid2">
                      <Bloco titulo="Fixas × Variáveis">
                        <Rosca
                          W={W} H={H}
                          fatias={agrupar(despesas, (l) => l.sub).map(([rotulo, valor]) => ({ rotulo, valor }))}
                          centro={{ valor: tickCurto(soma(despesas)), rotulo: 'total' }}
                          descricao={`Despesas fixas versus variáveis. ${agrupar(despesas, (l) => l.sub).map(([k, v]) => `${k}: ${fmt0(v)}`).join('. ')}`}
                        />
                      </Bloco>
                      <Bloco titulo="Top 5 Maiores Despesas">
                        <BarrasH
                          itens={[...despesas].sort((a, b) => b.valor - a.valor).slice(0, 5)
                            .map((l) => ({ rotulo: `${l.descricao} · ${rotuloMes(l.data)}`, valor: l.valor }))}
                        />
                      </Bloco>
                    </div>
                    <Bloco titulo={`${rotuloMes(mesAtual)} × mediana`}>
                      <BarrasMediana itens={mesVsMediana.slice(0, 6)} />
                    </Bloco>
                    <TabelaLancamentos titulo="Transações de Despesa" lista={despesas} rotuloAba={rotuloAba} />
                  </>
                )}
              </>
            )}

            {/* ── Cartões ───────────────────────────────────────────────── */}
            {aba === 'cartoes' && (
              <>
                <Kpis
                  lista={[
                    { label: 'Total no Cartão', valor: fmt0(soma(noCartao)), cor: 'red', icone: '▤',
                      nota: `${noCartao.length} lançamentos no período` },
                    { label: 'Média mês', valor: fmt0(media(serieCartao)), cor: 'purple', icone: '◷',
                      nota: 'gasto médio por mês' },
                    { label: 'Ticket Médio', valor: fmt0(soma(noCartao) / Math.max(noCartao.length, 1)), cor: 'amber', icone: '◈',
                      nota: 'valor médio por compra' },
                    { label: `Fatura ${rotuloCompetencia(mesAtual)}`, valor: fmt0(soma(doTipo(doMes, 'despesa').filter((l) => l.origem.startsWith('Cartão')))), cor: 'cyan', icone: '▦',
                      delta: variacao(
                        soma(doTipo(doMes, 'despesa').filter((l) => l.origem.startsWith('Cartão'))),
                        soma(doTipo(doMesAnterior, 'despesa').filter((l) => l.origem.startsWith('Cartão')))
                      ), bomSeSobe: false },
                  ]}
                />
                <div className="nx-grid2">
                  <Bloco titulo="Gasto no Cartão — Mensal">
                    <Legenda itens={[{ nome: 'Fatura', cor: COR.roxo }]} />
                    <Barras
                      rotulos={rotulos} W={W} H={H}
                      series={[{ nome: 'Fatura', cor: COR.roxo, dados: serieCartao }]}
                      descricao={`Gasto no cartão por mês. ${rotulos.map((r, i) => `${r}: ${fmt0(serieCartao[i])}`).join('. ')}`}
                    />
                  </Bloco>
                  <Bloco titulo="Utilização do Limite">
                    <BarrasH
                      itens={cartoes.map((c) => {
                        const fatura = soma(doMes.filter((l) => l.origem === c.id));
                        const uso = (fatura / (c.limite ?? 1)) * 100;
                        return {
                          rotulo: `${c.rotulo} · vence dia ${c.vencimento}`,
                          valor: uso,
                          texto: compacto
                            ? `${Math.round(uso)}% de ${fmt0(c.limite ?? 0)}`
                            : `${fmt0(fatura)} de ${fmt0(c.limite ?? 0)} · ${Math.round(uso)}%`,
                        };
                      })}
                    />
                  </Bloco>
                </div>

                {!compacto && (
                  <>
                    <div className="nx-grid2">
                      <Bloco titulo="Gasto por Categoria">
                        <Rosca
                          W={W} H={H}
                          fatias={agrupar(noCartao, (l) => l.categoria).map(([rotulo, valor]) => ({ rotulo, valor }))}
                          centro={{ valor: tickCurto(soma(noCartao)), rotulo: 'no cartão' }}
                          descricao={`Gasto no cartão por categoria. ${agrupar(noCartao, (l) => l.categoria).map(([k, v]) => `${k}: ${fmt0(v)}`).join('. ')}`}
                        />
                      </Bloco>
                      <Bloco titulo="Top Estabelecimentos">
                        <BarrasH
                          itens={agrupar(noCartao, (l) => l.descricao).slice(0, 5)
                            .map(([rotulo, valor]) => ({ rotulo, valor }))}
                        />
                      </Bloco>
                    </div>
                    <Bloco titulo="Faturas por cartão">
                      <Legenda itens={faturasPorCartao.map((c) => ({ nome: c.nome, cor: c.cor }))} />
                      <Barras rotulos={rotulos} W={W} H={H} series={faturasPorCartao}
                        descricao="Compras de cada fatura, uma cor por cartão." />
                    </Bloco>
                    <TabelaLancamentos
                      titulo="Lançamentos do Cartão" lista={noCartao}
                      terceiraColuna="origem" rotuloAba={rotuloAba}
                    />
                  </>
                )}
              </>
            )}

            {/* ── Investimentos ─────────────────────────────────────────── */}
            {aba === 'investimentos' && (
              <>
                <Kpis
                  lista={[
                    { label: 'Patrimônio Total', valor: fmt0(patrimonio), cor: 'purple', icone: '◇',
                      nota: `${posicoesDemo.length} ativos na carteira` },
                    { label: 'Saldo CDB', valor: fmt0(posicoesDemo.filter((p) => p.classe === 'CDB').reduce((s, p) => s + p.valor, 0)), cor: 'blue', icone: '◈',
                      nota: 'renda fixa' },
                    { label: 'Aportes no Mês', valor: fmt0(investMes), cor: 'green', icone: '▲',
                      delta: variacao(investMes, soma(doTipo(doMesAnterior, 'investimento'))), bomSeSobe: true },
                    { label: 'Rendimentos', valor: fmt0(rendimentos), cor: rendimentos >= 0 ? 'cyan' : 'red', icone: '◔',
                      nota: 'resultado do mês' },
                  ]}
                />
                <div className="nx-grid2">
                  <Bloco titulo="Evolução do Patrimônio Investido">
                    <Legenda itens={[{ nome: 'Aportado acumulado', cor: COR.roxo }]} />
                    <Linha
                      rotulos={rotulos}
                      valores={serieInvest.map((_, i) => serieInvest.slice(0, i + 1).reduce((a, b) => a + b, 0))}
                      cor={COR.roxo} W={W} H={H}
                      descricao={`Patrimônio aportado acumulado por mês. ${rotulos.map((r, i) => `${r}: ${fmt0(serieInvest.slice(0, i + 1).reduce((a, b) => a + b, 0))}`).join('. ')}`}
                    />
                  </Bloco>
                  <Bloco titulo="Alocação por Tipo">
                    <Rosca
                      W={W} H={H}
                      fatias={[...new Set(posicoesDemo.map((p) => p.classe))].map((classe) => ({
                        rotulo: classe,
                        valor: posicoesDemo.filter((p) => p.classe === classe).reduce((s, p) => s + p.valor, 0),
                      })).sort((a, b) => b.valor - a.valor)}
                      centro={{ valor: tickCurto(patrimonio), rotulo: 'carteira' }}
                      descricao={`Alocação da carteira por tipo de ativo, total ${fmt0(patrimonio)}.`}
                    />
                  </Bloco>
                </div>

                {!compacto && (
                  <>
                    <div className="nx-grid2">
                      <Bloco titulo="Investimentos Ativos">
                        <BarrasH
                          itens={[...posicoesDemo].sort((a, b) => b.valor - a.valor).map((p) => ({
                            rotulo: p.ativo,
                            valor: p.valor,
                            texto: `${fmt0(p.valor)} · ${p.rendimento >= 0 ? '+' : '−'}${fmt0(Math.abs(p.rendimento))}`,
                          }))}
                        />
                      </Bloco>
                      <Bloco titulo="Patrimônio vs Meta">
                        <Medidor
                          pct={(patrimonio / 40000) * 100}
                          nota={`${fmt0(patrimonio)} de ${fmt0(40000)}`}
                          cor={COR.roxo} W={W} H={H}
                          descricao={`Patrimônio em relação à meta: ${pct1((patrimonio / 40000) * 100)}`}
                        />
                      </Bloco>
                    </div>
                    <Bloco titulo="Aportes por mês">
                      <Barras rotulos={rotulos} W={W} H={H}
                        series={[{ nome: 'aportes', cor: COR.ciano, dados: serieInvest }]}
                        descricao={`Aplicações de cada mês; média de ${fmt0(mediaAporte)}.`} />
                      <p className="nx-veredito">Média de <b>{fmt0(mediaAporte)}</b> por mês.</p>
                    </Bloco>
                    <TabelaLancamentos titulo="Histórico de Movimentações" lista={aportes} rotuloAba={rotuloAba} />
                  </>
                )}
              </>
            )}

            {/* ── Projeções ─────────────────────────────────────────────── */}
            {aba === 'projecoes' && (
              <>
                <Kpis
                  lista={[
                    { label: 'Saldo Projetado', valor: fmt0(saldoProjetado), cor: 'cyan', icone: '◔',
                      nota: `daqui a ${MESES_PROJ} meses` },
                    { label: `Despesas Futuras (${MESES_PROJ}m)`, valor: fmt0(mediaDespesa * MESES_PROJ), cor: 'red', icone: '▼',
                      nota: 'pela mediana do período' },
                    { label: 'Comprometimento da Renda', valor: pct1(comprometimento), cor: comprometimento > 80 ? 'red' : 'amber', icone: '◈',
                      nota: 'despesa sobre receita' },
                    { label: 'Sobra Mensal Média', valor: fmt0(sobraMedia), cor: 'green', icone: '▲',
                      nota: 'receita menos despesa' },
                  ]}
                />
                <div className="nx-grid2">
                  <Bloco titulo={`Receita × Despesa — Real + Projeção (${MESES_PROJ}m)`}>
                    <Legenda itens={[{ nome: 'Receita', cor: COR.verde }, { nome: 'Despesa', cor: COR.vermelho }]} />
                    <Barras
                      rotulos={rotulosComProj} W={W} H={H} projetadoDe={rotulos.length}
                      series={[
                        { nome: 'Receita', cor: COR.verde, dados: [...serieReceita, ...Array(MESES_PROJ).fill(mediaReceita)] },
                        { nome: 'Despesa', cor: COR.vermelho, dados: [...serieDespesa, ...Array(MESES_PROJ).fill(mediaDespesa)] },
                      ]}
                      descricao={`Receita e despesa reais de ${rotulos.join(', ')} e projeção pela mediana para os ${MESES_PROJ} meses seguintes.`}
                    />
                  </Bloco>
                  <Bloco titulo="Saldo Projetado">
                    <Legenda itens={[{ nome: 'Saldo em conta · tracejado = projeção', cor: COR.ciano }]} />
                    <Linha
                      rotulos={rotulosComProj}
                      valores={[...saldoAcum, ...Array.from({ length: MESES_PROJ }, (_, i) => saldoAcum[saldoAcum.length - 1] + sobraMedia * (i + 1))]}
                      cor={COR.ciano} W={W} H={H} projetadoDe={rotulos.length}
                      descricao={`Saldo em conta real e projetado, chegando a ${fmt0(saldoProjetado)} em ${MESES_PROJ} meses.`}
                    />
                  </Bloco>
                </div>

                {!compacto && (
                  <>
                    <Bloco titulo="Caixa das próximas 13 semanas">
                      <Linha
                        rotulos={Array.from({ length: 13 }, (_, i) => `s${i + 1}`)}
                        valores={Array.from({ length: 13 }, (_, i) => saldoAcum[saldoAcum.length - 1] + (sobraMedia * (i + 1)) / 4.33)}
                        cor={COR.ciano} W={W} H={H}
                        descricao="Saldo semanal projetado, repartindo a sobra mensal pela mediana em semanas."
                      />
                    </Bloco>
                    <div className="nx-grid2">
                      <Bloco titulo="Sobra vs Meta de Poupança">
                        <Medidor
                          pct={(sobraMedia / metaPoupancaDemo) * 100}
                          nota={`meta: ${fmt0(metaPoupancaDemo)}/mês`}
                          cor={sobraMedia >= metaPoupancaDemo ? COR.verde : COR.ambar} W={W} H={H}
                          descricao={`Sobra mensal média em relação à meta de poupança: ${pct1((sobraMedia / metaPoupancaDemo) * 100)}`}
                        />
                      </Bloco>
                      <Bloco titulo="Projeção por Categoria (média mensal)">
                        <BarrasH
                          itens={agrupar(despesas, (l) => l.categoria).slice(0, 5)
                            .map(([rotulo, valor]) => ({ rotulo, valor: valor / meses.length }))}
                        />
                      </Bloco>
                    </div>

                    <Bloco titulo="Saldo projetado com faixa">
                      <LinhaFaixa rotulos={rotProj6} {...faixaProj} W={W} H={H}
                        descricao="Projeção central do saldo e faixa provável pelos quartis das sobras passadas." />
                      <p className="nx-veredito sec">Faixa = se os próximos meses sobrarem como o 1º e o 3º quartil dos meses passados. Estimativa estatística, não aconselhamento.</p>
                    </Bloco>
                    <Bloco titulo="Detalhe da Projeção por Mês">
                      <div className="nx-scr" tabIndex={0} role="region" aria-label="Detalhe da projeção por mês, tabela rolável">
                        <table className="nx-tb">
                          <thead>
                            <tr>
                              <th>Mês</th>
                              <th style={{ textAlign: 'right' }}>Receita</th>
                              <th style={{ textAlign: 'right' }}>Despesa</th>
                              <th style={{ textAlign: 'right' }}>Sobra</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rotulosProj.map((r, i) => (
                              <tr key={`${r}-${i}`}>
                                <td className="dt">{r}</td>
                                <td className="vl pos">{fmt0(mediaReceita)}</td>
                                <td className="vl neg">{fmt0(mediaDespesa)}</td>
                                <td className="vl inv">{fmt0(sobraMedia)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Bloco>
                  </>
                )}
              </>
            )}
            {/* ── Objetivos ─────────────────────────────────────────────── */}
            {aba === 'objetivos' && (
              <>
                <Kpis
                  lista={[
                    { label: 'Somando tudo', valor: fmt0(planos.reduce((s, o) => s + Math.max(0, o.alvo - o.atual), 0)), cor: 'amber', icone: '✦',
                      nota: `falta, em ${planos.length} objetivos` },
                    { label: 'Já separado', valor: fmt0(planos.reduce((s, o) => s + o.atual, 0)), cor: 'cyan', icone: '◈',
                      nota: `de ${fmt0(planos.reduce((s, o) => s + o.alvo, 0))}` },
                    { label: 'Seu ritmo hoje', valor: fmt0(sobraMedia), cor: 'blue', icone: '⬡',
                      nota: `por mês · sobra mediana de ${meses.length} meses` },
                  ]}
                />
                <div className="nx-grid2">
                  {planos.map((o) => {
                    const falta = Math.max(0, o.alvo - o.atual);
                    const pct = Math.min(100, (o.atual / o.alvo) * 100);
                    const data = datas[o.nome] ?? aaaammDe(o.prazoMeses);
                    const n = Math.max(1, mesesAte(data));
                    const [ano, mes] = data.split('-').map(Number);
                    return (
                      <Bloco key={o.nome} titulo={o.nome} tom="laranja">
                        <div className="nx-obj">
                          <div><span>guardado</span><b>{fmt0(o.atual)}</b></div>
                          <div><span>meta</span><b>{fmt0(o.alvo)}</b></div>
                          <div><span>falta</span><b>{fmt0(falta)}</b></div>
                        </div>
                        <div className="nx-prog" role="img" aria-label={`${pct1(pct)} da meta`}>
                          <i style={{ width: `${pct}%` }} />
                        </div>
                        <p className="nx-veredito">
                          Nesse ritmo ({fmt0(o.aporte)}/mês), você chega em <b>{o.chega}</b>
                          {o.noPrazo ? ' — dentro do prazo.' : ` — depois do prazo (${o.prazo}).`}
                        </p>
                        <label className="nx-calc">
                          <span>Quero chegar em</span>
                          <input type="month" value={data} min={aaaammDe(1)}
                            onChange={(e) => e.target.value && setDatas((d) => ({ ...d, [o.nome]: e.target.value }))} />
                        </label>
                        <p className="nx-veredito sec" aria-live="polite">
                          Guardando <b>{fmt0(falta / n)}</b> por mês, você chega em {MESES[mes - 1]}/{ano}.
                          {' '}Rendendo {pct1(taxaRendimentoDemoAA * 100)} a.a., o ritmo de hoje chega em {o.chegaJuros}.
                        </p>
                      </Bloco>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
