import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Schema dos projetos.
 *
 * A regra "nada inventado" vira restrição de compilador aqui: campo obrigatório
 * ausente derruba o `astro build`. Em especial `autoria`, que é enum fechado —
 * omitir o próprio papel é o erro nº 1 em portfólio de transição de carreira.
 */
const projetos = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projetos' }),
  schema: z.object({
    titulo: z.string(),
    subtitulo: z.string(),
    categoria: z.enum([
      'automacao',
      'ia',
      'dados',
      'financas',
      'processos',
      'sistemas',
      'desenvolvimento',
      'produto',
    ]),
    resumo: z.string(),

    /** Onde o projeto nasceu. É essa etiqueta que sustenta a lista única. */
    contexto: z.enum(['empresa', 'proprio']),

    /** Papel real. Sem valor padrão de propósito: quem escreve tem que decidir. */
    autoria: z.enum(['liderei', 'construi', 'arquitetei', 'participei', 'especifiquei', 'apoiei']),
    autoriaDetalhe: z.string(),

    /**
     * Datas reais em vez de texto livre — o período exibido é derivado
     * (ver src/lib/formato.ts) e a ordenação cronológica não depende de
     * lembrar de renumerar tudo a cada projeto novo.
     */
    inicio: z.coerce.date(),
    /**
     * Quando só o ano é um fato real — mês exato viraria data inventada.
     * `oculto` é o caso extremo: nem o ano está confirmado. A data em `inicio`
     * então serve só para ordenar a lista, e o período **não é exibido** — em
     * vez de uma data inventada, o card mostra apenas o status.
     */
    precisaoInicio: z.enum(['mes', 'ano', 'oculto']).default('mes'),
    fim: z.coerce.date().optional(),
    /**
     * Ciclo de vida real, nas duas pontas que faltavam:
     *
     * `planejamento` — existe desenho, não existe código. Chamar isso de
     * `ativo` sugeriria um sistema em construção que ainda não começou.
     * `aperfeicoamento` — entregou e continua mexendo: rodando em produção,
     * sem `fim`, mas já não em construção. Sem esse valor, o contas a receber
     * teria que escolher entre parecer inacabado e parecer encerrado, e
     * nenhum dos dois é verdade.
     */
    status: z.enum(['planejamento', 'ativo', 'aperfeicoamento', 'concluido', 'pausado']),

    /**
     * O que o projeto **já faz hoje**, em uma linha.
     *
     * Substitui o rótulo de fase na exibição. Quatro projetos anunciando
     * "em andamento" e "em planejamento" descrevem progresso, e progresso sem
     * fim à vista lê como rascunho eterno — mesmo quando o que existe já
     * funciona. Capacidade é mais honesta que fase: diz o que a pessoa
     * encontraria se abrisse hoje.
     *
     * Obrigatório de propósito. Se fosse opcional, o rótulo de fase voltaria
     * por omissão no primeiro projeto novo.
     *
     * `status` continua no schema como metadado — só não é mais exibido.
     */
    estadoAtual: z.string(),

    /** Métricas verificáveis. Só entram números que existem de verdade. */
    metricas: z
      .array(
        z.object({
          valor: z.string(),
          rotulo: z.string(),
        })
      )
      .default([]),

    ferramentas: z.array(z.string()).min(1),

    /** Peso visual maior no índice — não controla mais o que aparece. */
    destaque: z.boolean().default(false),

    /**
     * Imagem de capa — opcional. Aparece no card do índice e no topo da
     * página do projeto. `alt` é obrigatório junto: sem descrição, a imagem
     * não entra. Imagens/vídeos adicionais vão direto no corpo do MDX
     * (markdown de imagem ou <video> — sem campo de schema extra para isso).
     */
    capa: z
      .object({
        src: z.string(),
        alt: z.string(),
      })
      .optional(),

    links: z
      .object({
        github: z.string().url().optional(),
        demo: z.string().url().optional(),
        doc: z.string().optional(),
      })
      .default({}),
  }),
});

export const collections = { projetos };
