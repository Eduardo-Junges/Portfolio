import type { APIRoute } from 'astro';

/**
 * robots.txt gerado, não estático.
 *
 * A linha `Sitemap:` precisa de URL absoluta, e o endereço do site agora é
 * descoberto no build (ver astro.config.mjs). Um arquivo em `public/` ficaria
 * com o domínio congelado — e apontando para o lugar errado no dia em que o
 * domínio mudar, sem nada quebrar para avisar.
 */
export const GET: APIRoute = ({ site }) => {
  const linhas = ['User-agent: *', 'Allow: /'];

  if (site) linhas.push('', `Sitemap: ${new URL('sitemap-index.xml', site).href}`);

  return new Response(linhas.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
