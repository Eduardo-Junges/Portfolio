/**
 * Fundo vivo do site: qual planeta cada página mostra e para onde cada planeta leva.
 *
 * A home é a visão geral do sistema ('sol'). Cada projeto tem o seu planeta, e
 * clicar num planeta numa área vazia da tela abre a página dele. Projeto sem
 * planeta aqui (um novo, por exemplo) cai em 'netuno' e não vira destino.
 */
export const PLANETA_DO_PROJETO: Record<string, string> = {
  'nexus-analytics': 'terra',
  'nexus-pj': 'jupiter',
  'remodelamento-contas-a-receber': 'saturno',
  'painel-eficiencia-cartao': 'marte',
};

export const PLANETA_SOBRE = 'venus';
export const PLANETA_LEGAL = 'mercurio';

/** planeta → página (o inverso, para o clique na cena) */
export const ROTAS_DA_CENA: Record<string, string> = {
  ...Object.fromEntries(Object.entries(PLANETA_DO_PROJETO).map(([slug, p]) => [p, `/projetos/${slug}`])),
  [PLANETA_SOBRE]: '/sobre',
};

/** muda quando as texturas ou o motor mudarem — invalida o cache dos arquivos de /cena */
export const VERSAO_CENA = '2';
