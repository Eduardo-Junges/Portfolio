/**
 * Dados do perfil.
 *
 * O site é um índice de projetos, não uma biografia — por isso este arquivo
 * é deliberadamente pequeno. Trajetória e "como penso" vivem em `/sobre`.
 *
 * Regra do projeto: nada de informação inventada. Tudo que ainda não foi
 * confirmado pelo Eduardo fica como `[INSERIR ...]` e o componente
 * <Placeholder> renderiza isso de forma visível em desenvolvimento.
 */

/**
 * Marcador de dado ainda não fornecido. Nenhum campo usa isso hoje — fica de
 * pé para o próximo que precisar, junto com o componente <Placeholder>.
 */
export type Pendente = `[INSERIR ${string}]`;

export function isPendente(valor: string): valor is Pendente {
  return valor.startsWith('[INSERIR ') && valor.endsWith(']');
}

export const profile = {
  nome: 'Eduardo Henrique Junges',
  nomeCurto: 'Eduardo Junges',

  /**
   * A abertura da home. Não é cargo — é o que a lista abaixo contém e de onde
   * ela vem.
   *
   * Cuidado deliberado com a IA: ela é ferramenta em parte dos projetos, não em
   * todos. O contas a receber não tem uma linha de código, e a frase não pode
   * sugerir o contrário.
   */
  linha:
    'Os projetos que construí e os que estou construindo — sistemas, agentes de IA e ' +
    'reformulação de processo financeiro. Atrás deles, mais de cinco anos em finanças e ' +
    'sistemas de empresas de grande porte.',

  /*
   * Não existe `local` aqui, e é decisão consciente. A cidade, combinada com o
   * porte da rede e o segmento descritos no case do contas a receber, bastava
   * para identificar o empregador — que é atual. Cada dado sozinho é inofensivo;
   * o conjunto é que entrega. Quem precisa saber onde ele mora pergunta.
   */

  /** Endereços de contato vivem em `redes.ts`, com ícone e cor junto. */

  seo: {
    titulo: 'Eduardo Junges — Projetos',
    descricao:
      'Sistemas, automação e processos que eu construí ou ajudei a construir. ' +
      'Cases reais, com meu papel declarado em cada um.',
    idioma: 'pt-BR',
  },
} as const;
