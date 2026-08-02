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

  /** Uma linha, não um cargo. Aparece no topo da home. */
  linha: 'Automação, dados e sistemas — aplicados a problemas reais de negócio.',

  local: 'Campo Bom / RS',

  /** Endereços de contato vivem em `redes.ts`, com ícone e cor junto. */

  seo: {
    titulo: 'Eduardo Junges — Projetos',
    descricao:
      'Sistemas, automação e processos que eu construí ou ajudei a construir. ' +
      'Cases reais, com meu papel declarado em cada um.',
    idioma: 'pt-BR',
  },
} as const;
