/**
 * Dados fictícios do painel do Nexus & PJ.
 *
 * Mesma regra do Nexus Analytics: **nada aqui é real.** O mockup original do
 * Eduardo usa a empresa onde ele trabalha como exemplo concreto — nome, contas
 * bancárias, usuário e valores. Nada disso pode ir para um site público, então
 * a demonstração foi reconstruída com bancos anônimos, lojas numeradas e
 * valores inventados.
 *
 * O saldo corrente **não** está escrito aqui: é acumulado pelo componente a
 * partir do saldo inicial. Assim a coluna "Saldo" da tabela nunca discorda dos
 * lançamentos, e filtrar por conta recalcula tudo sozinho.
 */

export interface ContaBancaria {
  id: string;
  rotulo: string;
  /** saldo de abertura do período, antes do primeiro lançamento */
  saldoInicial: number;
}

export interface Movimento {
  data: string; // ISO yyyy-mm-dd
  descricao: string;
  categoria: string;
  conta: string; // casa com ContaBancaria.id
  /** positivo = entrada, negativo = saída. É o extrato: o sinal vem do banco. */
  valor: number;
}

export const competenciaDemo = '2026-07';

export const contasDemo: ContaBancaria[] = [
  { id: 'banco-a', rotulo: 'Banco A', saldoInicial: 21400 },
  { id: 'banco-b', rotulo: 'Banco B', saldoInicial: 12300 },
  { id: 'banco-c', rotulo: 'Banco C', saldoInicial: 4800 },
];

export const categoriasDemo = [
  'Vendas',
  'Fornecedores',
  'Folha',
  'Impostos',
  'Ocupação',
  'Utilidades',
  'Tarifas',
];

export const movimentosDemo: Movimento[] = [
  { data: '2026-07-02', descricao: 'Recebimento de vendas — Loja 1', categoria: 'Vendas', conta: 'banco-a', valor: 7240 },
  { data: '2026-07-03', descricao: 'Pagamento fornecedor', categoria: 'Fornecedores', conta: 'banco-b', valor: -9880 },
  { data: '2026-07-05', descricao: 'Tarifa de manutenção de conta', categoria: 'Tarifas', conta: 'banco-a', valor: -79.9 },
  { data: '2026-07-06', descricao: 'Recebimento de vendas — Loja 2', categoria: 'Vendas', conta: 'banco-b', valor: 6320 },
  { data: '2026-07-08', descricao: 'Recebimento de vendas — Loja 2', categoria: 'Vendas', conta: 'banco-b', valor: 5410 },
  { data: '2026-07-10', descricao: 'Energia elétrica', categoria: 'Utilidades', conta: 'banco-a', valor: -1320 },
  { data: '2026-07-12', descricao: 'Recebimento de vendas — Loja 1', categoria: 'Vendas', conta: 'banco-a', valor: 6980 },
  { data: '2026-07-15', descricao: 'Folha de pagamento', categoria: 'Folha', conta: 'banco-a', valor: -16400 },
  { data: '2026-07-17', descricao: 'Recolhimento de impostos', categoria: 'Impostos', conta: 'banco-a', valor: -4150 },
  { data: '2026-07-19', descricao: 'Recebimento de vendas — Loja 3', categoria: 'Vendas', conta: 'banco-c', valor: 4230 },
  { data: '2026-07-22', descricao: 'Pagamento fornecedor', categoria: 'Fornecedores', conta: 'banco-b', valor: -7640 },
  { data: '2026-07-24', descricao: 'Recebimento de vendas — Loja 2', categoria: 'Vendas', conta: 'banco-b', valor: 5890 },
  { data: '2026-07-26', descricao: 'Aluguel das lojas', categoria: 'Ocupação', conta: 'banco-a', valor: -8200 },
  { data: '2026-07-27', descricao: 'Antecipação de recebíveis', categoria: 'Vendas', conta: 'banco-c', valor: 9480 },
  { data: '2026-07-29', descricao: 'Recebimento de vendas — Loja 1', categoria: 'Vendas', conta: 'banco-a', valor: 8115 },
  { data: '2026-07-30', descricao: 'Tarifa de transferências', categoria: 'Tarifas', conta: 'banco-b', valor: -46.5 },
  { data: '2026-07-31', descricao: 'Recebimento de vendas — Loja 3', categoria: 'Vendas', conta: 'banco-c', valor: 3960 },
];
