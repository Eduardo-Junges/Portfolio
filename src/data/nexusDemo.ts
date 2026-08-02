/**
 * Dados fictícios de demonstração do painel do Nexus Analytics.
 *
 * NÃO são as finanças reais do Eduardo — o app real roda com dados bancários
 * pessoais dele, que nunca saem da máquina dele (essa é a regra nº 1 do
 * projeto). Este conjunto existe só para a "telinha interativa" do case
 * mostrar a interface funcionando. Todo cálculo do componente que a consome
 * deriva destes valores — nenhum total ou percentual é escrito à mão.
 *
 * A modelagem acompanha a do app real (utils/data_loader.py): o lançamento
 * carrega tipo, categoria, subcategoria e a conta de origem, e é dessas quatro
 * dimensões que saem todos os recortes das telas — receita por tipo, despesa
 * fixa × variável, gasto por cartão, alocação por ativo.
 *
 * Bancos e cartões são anônimos de propósito.
 */

export type TipoLancamento = 'receita' | 'despesa' | 'investimento';

export interface Lancamento {
  data: string; // ISO yyyy-mm-dd
  descricao: string;
  categoria: string;
  tipo: TipoLancamento;
  valor: number; // sempre positivo — o tipo indica o sinal
  /** conta ou cartão de onde saiu/entrou — casa com `Conta.id` */
  origem: string;
  /**
   * Subcategoria. Em receita é a fonte (Salário / Freelance / Rendimento);
   * em despesa é a natureza (Fixa / Variável). É o que alimenta as roscas.
   */
  sub: string;
}

export interface Conta {
  id: string;
  rotulo: string;
  tipo: 'conta' | 'cartao';
  /** só cartão: limite total e dia do vencimento da fatura */
  limite?: number;
  vencimento?: number;
}

export interface Posicao {
  ativo: string;
  classe: 'CDB' | 'Tesouro' | 'FII' | 'Ações';
  valor: number;
  /** rendimento do mês — pode ser negativo */
  rendimento: number;
}

export const contasDemo: Conta[] = [
  { id: 'Banco A', rotulo: 'Banco A', tipo: 'conta' },
  { id: 'Banco B', rotulo: 'Banco B', tipo: 'conta' },
  { id: 'Cartão A', rotulo: 'Cartão A', tipo: 'cartao', limite: 8000, vencimento: 12 },
  { id: 'Cartão B', rotulo: 'Cartão B', tipo: 'cartao', limite: 4000, vencimento: 20 },
];

export const posicoesDemo: Posicao[] = [
  { ativo: 'CDB 108% CDI', classe: 'CDB', valor: 18400, rendimento: 61 },
  { ativo: 'Tesouro Selic 2029', classe: 'Tesouro', valor: 6200, rendimento: 38 },
  { ativo: 'FII de papel', classe: 'FII', valor: 4100, rendimento: 29 },
  { ativo: 'Carteira de ações', classe: 'Ações', valor: 3300, rendimento: -47 },
];

/** Meta mensal de poupança usada no medidor de Projeções. */
export const metaPoupancaDemo = 1500;

export const lancamentosDemo: Lancamento[] = [
  // ── mai/2026 ──────────────────────────────────────────────────────────────
  { data: '2026-05-05', descricao: 'Salário', categoria: 'Renda', sub: 'Salário', tipo: 'receita', valor: 6200, origem: 'Banco A' },
  { data: '2026-05-31', descricao: 'Rendimento CDB', categoria: 'Renda', sub: 'Rendimento', tipo: 'receita', valor: 42, origem: 'Banco A' },
  { data: '2026-05-06', descricao: 'Aluguel', categoria: 'Moradia', sub: 'Fixa', tipo: 'despesa', valor: 1450, origem: 'Banco A' },
  { data: '2026-05-28', descricao: 'Internet', categoria: 'Moradia', sub: 'Fixa', tipo: 'despesa', valor: 120, origem: 'Banco A' },
  { data: '2026-05-09', descricao: 'Supermercado', categoria: 'Alimentação', sub: 'Variável', tipo: 'despesa', valor: 640, origem: 'Cartão A' },
  { data: '2026-05-13', descricao: 'Combustível', categoria: 'Transporte', sub: 'Variável', tipo: 'despesa', valor: 295, origem: 'Cartão A' },
  { data: '2026-05-21', descricao: 'Restaurante', categoria: 'Lazer', sub: 'Variável', tipo: 'despesa', valor: 210, origem: 'Cartão B' },
  { data: '2026-05-02', descricao: 'Streaming', categoria: 'Lazer', sub: 'Fixa', tipo: 'despesa', valor: 60, origem: 'Cartão B' },
  { data: '2026-05-04', descricao: 'Academia', categoria: 'Saúde', sub: 'Fixa', tipo: 'despesa', valor: 140, origem: 'Cartão B' },
  { data: '2026-05-16', descricao: 'Aplicação CDB', categoria: 'Investimentos', sub: 'Aporte', tipo: 'investimento', valor: 700, origem: 'Banco A' },

  // ── jun/2026 ──────────────────────────────────────────────────────────────
  { data: '2026-06-05', descricao: 'Salário', categoria: 'Renda', sub: 'Salário', tipo: 'receita', valor: 6200, origem: 'Banco A' },
  { data: '2026-06-17', descricao: 'Projeto freelance', categoria: 'Renda', sub: 'Freelance', tipo: 'receita', valor: 900, origem: 'Banco B' },
  { data: '2026-06-30', descricao: 'Rendimento CDB', categoria: 'Renda', sub: 'Rendimento', tipo: 'receita', valor: 48, origem: 'Banco A' },
  { data: '2026-06-06', descricao: 'Aluguel', categoria: 'Moradia', sub: 'Fixa', tipo: 'despesa', valor: 1450, origem: 'Banco A' },
  { data: '2026-06-27', descricao: 'Internet', categoria: 'Moradia', sub: 'Fixa', tipo: 'despesa', valor: 120, origem: 'Banco A' },
  { data: '2026-06-08', descricao: 'Supermercado', categoria: 'Alimentação', sub: 'Variável', tipo: 'despesa', valor: 612, origem: 'Cartão A' },
  { data: '2026-06-10', descricao: 'Combustível', categoria: 'Transporte', sub: 'Variável', tipo: 'despesa', valor: 340, origem: 'Cartão A' },
  { data: '2026-06-18', descricao: 'Cinema', categoria: 'Lazer', sub: 'Variável', tipo: 'despesa', valor: 95, origem: 'Cartão B' },
  { data: '2026-06-02', descricao: 'Streaming', categoria: 'Lazer', sub: 'Fixa', tipo: 'despesa', valor: 60, origem: 'Cartão B' },
  { data: '2026-06-04', descricao: 'Academia', categoria: 'Saúde', sub: 'Fixa', tipo: 'despesa', valor: 140, origem: 'Cartão B' },
  { data: '2026-06-22', descricao: 'Farmácia', categoria: 'Saúde', sub: 'Variável', tipo: 'despesa', valor: 128, origem: 'Cartão B' },
  { data: '2026-06-14', descricao: 'Aplicação CDB', categoria: 'Investimentos', sub: 'Aporte', tipo: 'investimento', valor: 800, origem: 'Banco A' },

  // ── jul/2026 ──────────────────────────────────────────────────────────────
  { data: '2026-07-05', descricao: 'Salário', categoria: 'Renda', sub: 'Salário', tipo: 'receita', valor: 6200, origem: 'Banco A' },
  { data: '2026-07-31', descricao: 'Rendimento CDB', categoria: 'Renda', sub: 'Rendimento', tipo: 'receita', valor: 55, origem: 'Banco A' },
  { data: '2026-07-07', descricao: 'Aluguel', categoria: 'Moradia', sub: 'Fixa', tipo: 'despesa', valor: 1450, origem: 'Banco A' },
  { data: '2026-07-28', descricao: 'Internet', categoria: 'Moradia', sub: 'Fixa', tipo: 'despesa', valor: 120, origem: 'Banco A' },
  { data: '2026-07-09', descricao: 'Supermercado', categoria: 'Alimentação', sub: 'Variável', tipo: 'despesa', valor: 705, origem: 'Cartão A' },
  { data: '2026-07-12', descricao: 'Manutenção do carro', categoria: 'Transporte', sub: 'Variável', tipo: 'despesa', valor: 480, origem: 'Cartão A' },
  { data: '2026-07-02', descricao: 'Streaming', categoria: 'Lazer', sub: 'Fixa', tipo: 'despesa', valor: 60, origem: 'Cartão B' },
  { data: '2026-07-04', descricao: 'Academia', categoria: 'Saúde', sub: 'Fixa', tipo: 'despesa', valor: 140, origem: 'Cartão B' },
  { data: '2026-07-25', descricao: 'Consulta médica', categoria: 'Saúde', sub: 'Variável', tipo: 'despesa', valor: 250, origem: 'Cartão B' },
  { data: '2026-07-15', descricao: 'Aplicação CDB', categoria: 'Investimentos', sub: 'Aporte', tipo: 'investimento', valor: 900, origem: 'Banco A' },

  // ── ago/2026 ──────────────────────────────────────────────────────────────
  { data: '2026-08-01', descricao: 'Salário', categoria: 'Renda', sub: 'Salário', tipo: 'receita', valor: 6350, origem: 'Banco A' },
  { data: '2026-08-21', descricao: 'Projeto freelance', categoria: 'Renda', sub: 'Freelance', tipo: 'receita', valor: 1200, origem: 'Banco B' },
  { data: '2026-08-31', descricao: 'Rendimento CDB', categoria: 'Renda', sub: 'Rendimento', tipo: 'receita', valor: 61, origem: 'Banco A' },
  { data: '2026-08-03', descricao: 'Aluguel', categoria: 'Moradia', sub: 'Fixa', tipo: 'despesa', valor: 1450, origem: 'Banco A' },
  { data: '2026-08-27', descricao: 'Internet', categoria: 'Moradia', sub: 'Fixa', tipo: 'despesa', valor: 120, origem: 'Banco A' },
  { data: '2026-08-05', descricao: 'Supermercado', categoria: 'Alimentação', sub: 'Variável', tipo: 'despesa', valor: 588, origem: 'Cartão A' },
  { data: '2026-08-08', descricao: 'Corrida de app', categoria: 'Transporte', sub: 'Variável', tipo: 'despesa', valor: 210, origem: 'Cartão A' },
  { data: '2026-08-14', descricao: 'Show', categoria: 'Lazer', sub: 'Variável', tipo: 'despesa', valor: 180, origem: 'Cartão B' },
  { data: '2026-08-02', descricao: 'Streaming', categoria: 'Lazer', sub: 'Fixa', tipo: 'despesa', valor: 60, origem: 'Cartão B' },
  { data: '2026-08-16', descricao: 'Academia', categoria: 'Saúde', sub: 'Fixa', tipo: 'despesa', valor: 140, origem: 'Cartão B' },
  { data: '2026-08-10', descricao: 'Aplicação CDB', categoria: 'Investimentos', sub: 'Aporte', tipo: 'investimento', valor: 1000, origem: 'Banco A' },
];
