import { useMemo, useState, type ReactNode } from 'react';
import {
  lancamentosDemo,
  contasDemo,
  posicoesDemo,
  metaPoupancaDemo,
  type Lancamento,
} from '../../data/nexusDemo';

/**
 * Réplica da interface real do Nexus Analytics, com dados fictícios.
 *
 * Estrutura, paleta, tipografia e componentes vêm do código do app real
 * (utils/layout.py, app.py e pages/*.py): sidebar de 6 abas, header com status,
 * KPI cards com faixa colorida e ícone, e — em cada aba — os mesmos blocos que
 * o app monta. Os títulos não são inventados; são os do `render(...)` de cada
 * página:
 *
 *   Dashboard      Receita × Despesa — Mensal · Saldo por Mês — Bancos ·
 *                  Taxa de Poupança · Assinaturas · Histórico de Lançamentos
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

// NAV do app real (utils/layout.py)
const NAV = [
  { id: 'dashboard', rotulo: 'Dashboard', icone: '⬡' },
  { id: 'receitas', rotulo: 'Receitas', icone: '▲' },
  { id: 'despesas', rotulo: 'Despesas', icone: '▼' },
  { id: 'cartoes', rotulo: 'Cartões', icone: '▤' },
  { id: 'investimentos', rotulo: 'Investimentos', icone: '◇' },
  { id: 'projecoes', rotulo: 'Projeções', icone: '◔' },
] as const;

type AbaId = (typeof NAV)[number]['id'];

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
      <path d={`M ${ponto(180)} A ${r} ${r} 0 0 1 ${ponto(0)}`} fill="none" stroke="hsla(0,0%,100%,.08)" strokeWidth="9" strokeLinecap="round" />
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

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="nx-card">
      <div className="nx-sec">{titulo}</div>
      {children}
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
    <div className="nx-kpis">
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

export default function PainelNexus({ className = '', compacto = false }: Props) {
  const [aba, setAba] = useState<AbaId>('dashboard');

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

  const rotuloAba = NAV.find((n) => n.id === aba)?.rotulo ?? '';

  // ── dados por aba ───────────────────────────────────────────────────────────
  const receitas = lancamentosDemo.filter((l) => l.tipo === 'receita');
  const despesas = lancamentosDemo.filter((l) => l.tipo === 'despesa');
  const noCartao = despesas.filter((l) => l.origem.startsWith('Cartão'));
  const aportes = lancamentosDemo.filter((l) => l.tipo === 'investimento');

  const patrimonio = posicoesDemo.reduce((s, p) => s + p.valor, 0);
  const rendimentos = posicoesDemo.reduce((s, p) => s + p.rendimento, 0);

  // Projeção: média dos meses observados repetida à frente. É o método mais
  // simples possível, e o rótulo do bloco diz isso — não é um modelo.
  const mediaReceita = media(serieReceita);
  const mediaDespesa = media(serieDespesa);
  const sobraMedia = mediaReceita - mediaDespesa;
  const MESES_PROJ = 4;
  const rotulosProj = useMemo(() => {
    const mes = Number(mesAtual.slice(5, 7));
    return Array.from({ length: MESES_PROJ }, (_, i) => MESES[(mes + i) % 12]);
  }, [mesAtual]);
  const rotulosComProj = [...rotulos, ...rotulosProj];
  const saldoProjetado = saldoAcum[saldoAcum.length - 1] + sobraMedia * MESES_PROJ;
  const comprometimento = mediaReceita ? (mediaDespesa / mediaReceita) * 100 : 0;

  const cartoes = contasDemo.filter((c) => c.tipo === 'cartao');

  return (
    <div className={`nx ${compacto ? 'nx-cmp' : ''} ${className}`}>
      <style>{`
        .nx {
          --lm-bg:10,14,26;
          --lm-text:226,232,240; --lm-text2:100,116,139; --lm-text3:148,163,184;
          --lm-blue:59,130,246; --lm-green:16,185,129; --lm-purple:139,92,246;
          --lm-red:239,68,68; --lm-cyan:6,182,212; --lm-amber:245,158,11;
          --nx-bg:rgb(var(--lm-bg));
          --nx-text:rgb(var(--lm-text)); --nx-text2:rgb(var(--lm-text2)); --nx-text3:rgb(var(--lm-text3));
          --nx-blue:rgb(var(--lm-blue)); --nx-green:rgb(var(--lm-green));
          --nx-red:rgb(var(--lm-red)); --nx-cyan:rgb(var(--lm-cyan));
          --nx-purple:rgb(var(--lm-purple)); --nx-amber:rgb(var(--lm-amber));
          --nx-surface:hsla(0,0%,100%,.045); --nx-line:hsla(0,0%,100%,.07); --nx-line2:hsla(0,0%,100%,.11);
          background:var(--nx-bg); border:1px solid var(--nx-line); border-radius:10px;
          overflow:hidden; font-family:'Inter Variable',system-ui,sans-serif;
          color:var(--nx-text); container-type:inline-size; font-size:11px;
        }
        .nx-shell { display:flex; }
        .nx-side { width:112px; flex-shrink:0; border-right:1px solid var(--nx-line);
          background:linear-gradient(180deg,rgba(15,21,32,.72),rgba(10,14,26,.55)); padding:9px 0; }
        .nx-logo { display:flex; align-items:center; gap:7px; padding:1px 9px 11px; }
        .nx-logo .ic { width:20px; height:20px; border-radius:6px; flex-shrink:0;
          background:linear-gradient(135deg,var(--nx-blue),var(--nx-purple));
          display:flex; align-items:center; justify-content:center; font-size:10px; color:#fff; }
        .nx-logo .tx { font-size:11px; font-weight:600; }
        .nx-item { display:flex; align-items:center; gap:8px; padding:6px 11px; width:100%;
          background:none; border:0; cursor:pointer; position:relative;
          font-size:10.5px; color:var(--nx-text2); text-align:left; font-family:inherit;
          transition:background .2s,color .2s; }
        .nx-item:hover { background:rgba(var(--lm-blue),.06); color:var(--nx-text3); }
        .nx-item.on { background:rgba(var(--lm-blue),.15); color:var(--nx-blue); font-weight:600; }
        .nx-item.on::before { content:''; position:absolute; left:0; top:50%; transform:translateY(-50%);
          width:2px; height:13px; background:var(--nx-blue); border-radius:0 2px 2px 0; }
        .nx-item .ic { font-size:11px; width:14px; text-align:center; }
        .nx-main { flex:1; min-width:0; }
        .nx-hd { display:flex; align-items:center; gap:8px; height:36px; padding:0 12px;
          border-bottom:1px solid var(--nx-line); background:rgba(15,21,32,.72); }
        .nx-hd .t { font-size:11.5px; font-weight:600; }
        .nx-dot { width:6px; height:6px; border-radius:50%; background:var(--nx-green);
          box-shadow:0 0 5px var(--nx-green); flex-shrink:0; }
        .nx-hd .per { margin-left:auto; font-size:9.5px; color:var(--nx-text2); white-space:nowrap; }
        .nx-demo { color:rgba(var(--lm-text2),.75); }
        .nx-av { width:21px; height:21px; border-radius:50%; font-size:9px; font-weight:600; color:#fff;
          flex-shrink:0; background:linear-gradient(135deg,var(--nx-blue),var(--nx-purple));
          display:flex; align-items:center; justify-content:center; }
        .nx-body { padding:10px; }
        .nx-kpis { display:grid; grid-template-columns:repeat(2,1fr); gap:7px; }
        .nx-grid2 { display:grid; gap:8px; margin-top:8px; }
        /* 460px: abaixo disso os 4 KPIs lado a lado ficariam com o valor cortado
           e os dois gráficos, ilegíveis. Container query, não media query — o que
           manda é a largura do painel, não a da janela. O valor foi calibrado
           para o card do índice caber em meia largura: exigir mais espremeria a
           coluna de texto e o card voltaria a crescer pelo outro lado. */
        @container (min-width: 460px) {
          .nx-kpis { grid-template-columns:repeat(4,1fr); }
          .nx-grid2 { grid-template-columns:1fr 1fr; }
        }
        .kpi { background:var(--nx-surface); border:1px solid var(--nx-line); border-radius:8px;
          padding:8px 9px; position:relative; overflow:hidden; transition:transform .2s,border-color .2s; }
        .kpi::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; }
        .kpi:hover { transform:translateY(-2px); border-color:var(--nx-line2); }
        .kpi.green::before { background:linear-gradient(90deg,var(--nx-green),transparent); }
        .kpi.red::before { background:linear-gradient(90deg,var(--nx-red),transparent); }
        .kpi.blue::before { background:linear-gradient(90deg,var(--nx-blue),transparent); }
        .kpi.cyan::before { background:linear-gradient(90deg,var(--nx-cyan),transparent); }
        .kpi.purple::before { background:linear-gradient(90deg,var(--nx-purple),transparent); }
        .kpi.amber::before { background:linear-gradient(90deg,var(--nx-amber),transparent); }
        .kpi-hd { display:flex; justify-content:space-between; align-items:flex-start; gap:5px; }
        .kpi-lb { font-size:8px; font-weight:600; letter-spacing:.7px; text-transform:uppercase;
          color:var(--nx-text2); line-height:1.3; }
        .kpi-vl { font-size:13.5px; font-weight:700; letter-spacing:-.4px; line-height:1.2;
          font-variant-numeric:tabular-nums; margin-top:2px; }
        .kpi.green .kpi-vl { color:var(--nx-green); }
        .kpi.red .kpi-vl { color:var(--nx-red); }
        .kpi.blue .kpi-vl { color:var(--nx-blue); }
        .kpi.cyan .kpi-vl { color:var(--nx-cyan); }
        .kpi.purple .kpi-vl { color:var(--nx-purple); }
        .kpi.amber .kpi-vl { color:var(--nx-amber); }
        .kpi-ic { width:19px; height:19px; border-radius:6px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center; font-size:10px; }
        .kpi.green .kpi-ic { background:rgba(var(--lm-green),.15); color:var(--nx-green); }
        .kpi.red .kpi-ic { background:rgba(var(--lm-red),.15); color:var(--nx-red); }
        .kpi.blue .kpi-ic { background:rgba(var(--lm-blue),.15); color:var(--nx-blue); }
        .kpi.cyan .kpi-ic { background:rgba(var(--lm-cyan),.15); color:var(--nx-cyan); }
        .kpi.purple .kpi-ic { background:rgba(var(--lm-purple),.15); color:var(--nx-purple); }
        .kpi.amber .kpi-ic { background:rgba(var(--lm-amber),.15); color:var(--nx-amber); }
        .kpi-ft { margin-top:5px; display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
        .kpi-dl { display:inline-flex; align-items:center; gap:2px; padding:1px 4px; border-radius:3px;
          font-size:8.5px; font-weight:600; }
        .up { background:rgba(var(--lm-green),.15); color:var(--nx-green); }
        .down { background:rgba(var(--lm-red),.15); color:var(--nx-red); }
        .kpi-nt { color:var(--nx-text2); font-size:8.5px; }
        .nx-card { background:var(--nx-surface); border:1px solid var(--nx-line); border-radius:8px;
          padding:9px 10px; margin-top:8px; }
        .nx-grid2 > .nx-card { margin-top:0; }
        .nx-sec { font-size:9.5px; font-weight:600; color:var(--nx-text); margin-bottom:8px;
          display:flex; align-items:center; gap:6px; }
        .nx-sec::before { content:''; width:2px; height:11px; border-radius:2px; background:var(--nx-blue); flex-shrink:0; }
        .nx-lg { display:flex; gap:10px; margin-bottom:5px; flex-wrap:wrap; }
        .nx-lg span { display:inline-flex; align-items:center; gap:4px; font-size:8.5px; color:var(--nx-text3); }
        .nx-lg i { width:6px; height:6px; border-radius:50%; display:inline-block; }
        .cht { width:100%; height:auto; display:block; overflow:visible; }
        .cht text { font-size:7px; fill:var(--nx-text2); font-family:'Inter Variable',system-ui,sans-serif; }
        .cht .gl { stroke:rgba(30,42,58,0.75); stroke-width:.6; }
        .bar-row + .bar-row { margin-top:7px; }
        .bar-hd { display:flex; justify-content:space-between; gap:7px; font-size:10px; }
        .bar-hd .c { color:var(--nx-text3); }
        .bar-hd .v { color:var(--nx-text2); font-variant-numeric:tabular-nums; }
        .bar-tk { margin-top:3px; height:4px; border-radius:99px; background:hsla(0,0%,100%,.05); overflow:hidden; }
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
          background:hsla(0,0%,100%,.06); color:var(--nx-text2); white-space:nowrap; }
        .nx-scr { max-height:132px; overflow-y:auto; }
        .nx-scr::-webkit-scrollbar { width:5px; }
        .nx-scr::-webkit-scrollbar-thumb { background:hsla(0,0%,100%,.14); border-radius:99px; }
        @container (max-width: 400px) {
          .nx-side { width:38px; }
          .nx-logo .tx, .nx-item .rot { display:none; }
          .nx-item { justify-content:center; padding:7px 0; }
          .nx-logo { justify-content:center; padding:1px 0 10px; }
          .nx-demo { display:none; }
        }
        @media (prefers-reduced-motion: reduce) { .nx * { transition:none !important; } }
      `}</style>

      <div className="nx-shell">
        <nav className="nx-side" aria-label="Navegação do painel">
          <div className="nx-logo">
            <span className="ic" aria-hidden="true">◈</span>
            <span className="tx">Nexus</span>
          </div>
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`nx-item ${aba === n.id ? 'on' : ''}`}
              aria-current={aba === n.id ? 'page' : undefined}
              onClick={() => setAba(n.id)}
            >
              <span className="ic" aria-hidden="true">{n.icone}</span>
              <span className="rot">{n.rotulo}</span>
            </button>
          ))}
        </nav>

        <div className="nx-main">
          <header className="nx-hd">
            <span className="nx-dot" aria-hidden="true" />
            <span className="t">{rotuloAba}</span>
            <span className="per">
              {rotuloCompetencia(mesAtual)}
              <span className="nx-demo"> · dados fictícios</span>
            </span>
            <span className="nx-av" aria-hidden="true">E</span>
          </header>

          <div className="nx-body">
            {/* ── Dashboard ─────────────────────────────────────────────── */}
            {aba === 'dashboard' && (
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
                    <div className="nx-grid2">
                      <Bloco titulo="Taxa de Poupança">
                        <Medidor
                          pct={receitaMes ? ((receitaMes - despesaMes) / receitaMes) * 100 : 0}
                          nota={`${fmt0(receitaMes - despesaMes)} sobraram de ${fmt0(receitaMes)}`}
                          cor={COR.verde} W={W} H={H}
                          descricao={`Taxa de poupança do mês: ${pct1(receitaMes ? ((receitaMes - despesaMes) / receitaMes) * 100 : 0)}`}
                        />
                      </Bloco>
                      <Bloco titulo="Assinaturas">
                        <BarrasH
                          itens={agrupar(doTipo(doMes, 'despesa').filter((l) => l.sub === 'Fixa'), (l) => l.descricao)
                            .map(([rotulo, valor]) => ({ rotulo, valor }))}
                        />
                      </Bloco>
                    </div>
                    <TabelaLancamentos titulo="Histórico de Lançamentos" lista={doMes} rotuloAba={rotuloAba} />
                  </>
                )}
              </>
            )}

            {/* ── Receitas ──────────────────────────────────────────────── */}
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
                      nota: 'pela média do período' },
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
                      descricao={`Receita e despesa reais de ${rotulos.join(', ')} e projeção pela média para os ${MESES_PROJ} meses seguintes.`}
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
          </div>
        </div>
      </div>
    </div>
  );
}
