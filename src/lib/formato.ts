/**
 * Formatação compartilhada — texto derivado de dados, nunca escrito à mão.
 *
 * Mantém a regra "nada inventado" também no nível de exibição: se o dado
 * mudar, o texto muda junto. Não existe risco de um `periodo` ou um `%`
 * ficar desatualizado porque alguém esqueceu de editar uma string solta.
 */

/** Redução percentual — sempre calculada, nunca hardcoded. */
export function reducaoPercentual(antes: number, depois: number): number {
  if (antes <= 0) return 0;
  return Math.round(((antes - depois) / antes) * 100);
}

const MESES = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

function mesAno(data: Date): string {
  return `${MESES[data.getUTCMonth()]}/${data.getUTCFullYear()}`;
}

/**
 * Período legível a partir de datas reais.
 * Projeto ativo sem `fim` vira "— em andamento": nunca precisa lembrar de
 * atualizar um texto solto quando o status muda.
 *
 * `precisaoInicio: 'ano'` existe para quando só o ano é um fato confirmado —
 * exibir "jan/2025" nesse caso inventaria um mês que ninguém disse.
 * `'oculto'` vai além: nem o ano se sabe, então some com a data e sobra só o
 * status. Melhor um card sem período do que um card com período errado.
 */
export function formatarPeriodo(
  inicio: Date,
  fim: Date | undefined,
  status: string,
  precisaoInicio: 'mes' | 'ano' | 'oculto' = 'mes'
): string {
  if (precisaoInicio === 'oculto') {
    return status === 'concluido' ? '' : rotuloStatus[status];
  }
  const inicioTxt = precisaoInicio === 'ano' ? String(inicio.getUTCFullYear()) : mesAno(inicio);
  if (fim) return `${inicioTxt} — ${mesAno(fim)}`;
  if (status === 'planejamento') return `${inicioTxt} — em planejamento`;
  if (status === 'ativo') return `${inicioTxt} — em andamento`;
  if (status === 'aperfeicoamento') return `${inicioTxt} — em aperfeiçoamento`;
  return inicioTxt;
}

export const rotuloStatus: Record<string, string> = {
  planejamento: 'Em planejamento',
  ativo: 'Em desenvolvimento',
  aperfeicoamento: 'Em aperfeiçoamento',
  concluido: 'Concluído',
  pausado: 'Pausado',
};

export const rotuloCategoria: Record<string, string> = {
  automacao: 'Automação',
  ia: 'IA',
  dados: 'Dados',
  financas: 'Finanças',
  processos: 'Processos',
  sistemas: 'Sistemas',
  desenvolvimento: 'Desenvolvimento',
  produto: 'Produto',
};

export const rotuloAutoria: Record<string, string> = {
  liderei: 'Liderei',
  construi: 'Construí',
  arquitetei: 'Arquitetei',
  participei: 'Participei',
  especifiquei: 'Especifiquei',
  apoiei: 'Apoiei',
};

export const rotuloContexto: Record<string, string> = {
  empresa: 'Na empresa',
  proprio: 'Por conta própria',
};
