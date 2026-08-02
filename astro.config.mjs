// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * Endereço público do site. Entra em `canonical`, no sitemap e nas URLs de OG,
 * então um valor errado aqui não quebra nada visualmente — só faz o Google
 * indexar um endereço que não existe.
 *
 * Em vez de fixar um domínio à mão, o build descobre o próprio endereço:
 * `VERCEL_PROJECT_PRODUCTION_URL` é o domínio de produção do projeto e é
 * estável entre deploys (ao contrário de `VERCEL_URL`, que muda a cada um e
 * deixaria o canonical apontando para um deploy específico).
 *
 * Quando um domínio próprio for adicionado na Vercel, essa variável passa a
 * refletir ele — e não há nada para editar aqui.
 */
const producao = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const SITE = producao ? `https://${producao}` : 'http://localhost:4321';

if (process.env.VERCEL && !producao) {
  console.warn(
    '[site] Build na Vercel sem VERCEL_PROJECT_PRODUCTION_URL: ' +
      'canonical e sitemap vão sair apontando para localhost.'
  );
}

export default defineConfig({
  site: SITE,
  integrations: [react(), mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
