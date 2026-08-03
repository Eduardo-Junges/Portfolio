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
 * Período legível a partir de datas reais. **Só a data** — o que o projeto faz
 * hoje é dito por `estadoAtual`, não por um rótulo de fase.
 *
 * Antes esta função anexava "— em andamento" e afins. O efeito colateral era
 * uma lista em que todo projeto anunciava estar inacabado, o que descreve
 * progresso em vez de capacidade e envelhece mal: um projeto que roda há um ano
 * continuava se apresentando como obra.
 *
 * `precisaoInicio: 'ano'` existe para quando só o ano é um fato confirmado —
 * exibir "jan/2025" nesse caso inventaria um mês que ninguém disse.
 * `'oculto'` vai além: nem o ano se sabe, então não sobra período nenhum.
 * Melhor um card sem data do que um card com data errada.
 */
export function formatarPeriodo(
  inicio: Date,
  fim: Date | undefined,
  precisaoInicio: 'mes' | 'ano' | 'oculto' = 'mes'
): string {
  if (precisaoInicio === 'oculto') return '';
  const inicioTxt = precisaoInicio === 'ano' ? String(inicio.getUTCFullYear()) : mesAno(inicio);
  return fim ? `${inicioTxt} — ${mesAno(fim)}` : `desde ${inicioTxt}`;
}

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
