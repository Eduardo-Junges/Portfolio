# Portfólio — Eduardo Junges

Site estático que funciona como **índice de projetos**. A unidade é o projeto, não a pessoa:
a home lista o que foi construído, `/sobre` é uma página curta de contexto.

## Rodar

```bash
npm install
npm run dev
```

Outros comandos: `npm run build` (gera `dist/`), `npm run preview` (serve o build),
`npm run check` (checagem de tipos — deve terminar com 0 erros).

## Stack

Astro 7 · React 19 (só em ilhas interativas) · TypeScript · Tailwind v4 · MDX

Astro entrega HTML estático por padrão e só hidrata JavaScript onde há interação real —
hoje, dois painéis de demonstração. Cada dependência do `package.json` tem justificativa.

## A regra do projeto: nada inventado

Nenhum dado sobre a trajetória do Eduardo pode ser preenchido por suposição. A regra não é
boa intenção — é restrição de compilador:

- **Schema Zod** (`src/content.config.ts`): campo obrigatório ausente derruba o `astro build`.
- **`autoria` sem valor padrão**: quem escreve um projeto é obrigado a declarar o próprio papel.
- **`precisaoInicio: 'oculto'`**: quando nem o ano é fato confirmado, o período não é exibido —
  em vez de uma data inventada, o card mostra só o status.
- **`<Placeholder>`**: dado pendente aparece marcado. Em build de produção ele **derruba o
  build**, a menos que `PUBLIC_PERMITIR_PLACEHOLDERS=true` esteja definido de propósito.
  A trava fica armada por padrão, inclusive quando a variável não existe.

## Confidencialidade

Empresas são anonimizadas por decisão do autor, que está empregado. Valores internos
(faturamento, unit economics em números absolutos) não vão para o site — o que sobrevive é a
proporção, não o número.

O material bruto (`_privado/`, `CONTEUDO.md`) **nunca é versionado**. Ver `.gitignore`.

## Como publicar uma alteração

O site se atualiza sozinho: a Vercel observa a branch `main` no GitHub e, a cada commit que
chega lá, refaz o build e publica. Leva cerca de um minuto e não precisa de nenhuma ação no
painel dela.

**Se o build falhar, nada vai ao ar** — a versão anterior continua publicada. Errar o
frontmatter de um projeto não derruba o site; só impede a atualização.

Pelo terminal, três comandos depois de salvar os arquivos:

```
git add -A
git commit -m "descrição curta do que mudou"
git push
```

Pelo navegador, sem instalar nada: abrir o arquivo no GitHub, clicar no lápis, editar,
e usar **Commit changes** no fim da página. O efeito é idêntico.

## Como adicionar um projeto

Criar um arquivo novo em `src/content/projetos/`, com extensão `.mdx`. O nome do arquivo
vira o endereço: `meu-projeto.mdx` → `/projetos/meu-projeto`.

```mdx
---
titulo: 'Nome do projeto'
subtitulo: 'Uma linha explicando o que ele faz'
resumo: >-
  Dois ou três períodos. É o que aparece no card da home.
categoria: 'sistemas'      # automacao | ia | dados | financas | processos | sistemas | desenvolvimento | produto
contexto: 'proprio'        # proprio (projeto seu) | empresa (feito no trabalho)
autoria: 'construi'        # liderei | construi | arquitetei | participei | especifiquei | apoiei
autoriaDetalhe: >-
  O que exatamente foi seu. Campo obrigatório, e de propósito.
inicio: 2026-03-01
precisaoInicio: 'mes'      # mes (exibe "mar/2026") | ano (exibe "2026") | oculto (não exibe data)
status: 'ativo'            # planejamento | ativo | aperfeicoamento | concluido | pausado
ferramentas:               # pelo menos uma
  - 'Python'
metricas:                  # opcional — só números reais; sem eles a seção não aparece
  - valor: '163'
    rotulo: 'testes automatizados'
destaque: true             # opcional — peso visual maior no índice
---

## Um título

O texto do projeto em markdown normal.
```

Campos opcionais que existem: `fim` (data de encerramento), `capa` (`src` + `alt`, os dois
juntos) e `links` (`github`, `demo`, `doc`).

Faltou campo obrigatório ou o valor não está na lista? O build para e diz qual arquivo e qual
campo. Isso é a regra "nada inventado" funcionando — não é bug.

## Onde mexer no conteúdo

| Quero mudar | Arquivo |
|---|---|
| Adicionar ou editar um projeto | `src/content/projetos/*.mdx` |
| Campos permitidos no frontmatter | `src/content.config.ts` |
| Nome, local, links do topo | `src/data/profile.ts` |
| Redes e botões de contato | `src/data/redes.ts` |
| Cores, tipografia, espaçamento | `src/styles/global.css` |
| Domínio do site (sitemap e canonical) | `astro.config.mjs` |

## Design system

Tokens em duas camadas: RGB cru em `:root` (`--c-accent: 91 155 213`) e consumo semântico via
`@theme inline`. Guardar sem `rgb()` permite gerar qualquer opacidade sem redeclarar a cor.

Paleta cianotipia — azul-tinta profundo, texto gelo, âmbar para métricas. Dark é o padrão;
light disponível no toggle e respeitando `prefers-color-scheme`.

O vocabulário visual é de **desenho técnico**: linhas de 1px sempre funcionais, labels em mono
maiúsculo e o componente `<Cota>` — a assinatura do site, usada só onde existe um número real
para medir.

Deliberadamente fora: grid decorativo de fundo, gradientes em botões, glow colorido.
