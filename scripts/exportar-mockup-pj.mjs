/**
 * Exporta o mockup do Nexus & PJ a partir do app de verdade.
 *
 * O mockup antigo era um HTML montado à mão e envelhecia a cada versão. Este
 * script entra no ambiente de testes do Nexus & PJ (porta 8010, dados 100%
 * fictícios de `scripts/dados_ficticios_testes.py`), baixa o HTML de cada tela
 * como o servidor entrega e grava uma cópia estática navegável em
 * `public/mockups/nexus-pj/`: mesmos CSS e JS do app, links entre as telas
 * exportadas, e nada que grave (formulários e buscas viram um aviso).
 *
 * Uso (com o ambiente de testes do nexus-pj no ar):
 *   NEXUS_PJ=../nexus-pj node scripts/exportar-mockup-pj.mjs
 * Playwright vem de PLAYWRIGHT_MODULE (padrão: 'playwright').
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const PJ = resolve(process.env.NEXUS_PJ ?? '../nexus-pj');
const BASE = process.env.NEXUS_PJ_URL ?? 'http://127.0.0.1:8010';
const SAIDA = resolve('public/mockups/nexus-pj');
const BANCO = join(PJ, 'ambiente_testes/dados/nexus_caixa.db');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

// rota do app → arquivo do mockup. A ordem não importa; o que não está aqui vira aviso.
const TELAS = {
  '/': 'index',
  '/realizado': 'realizado',
  '/planejado': 'planejado',
  '/transferencias': 'transferencias',
  '/importar': 'importar',
  '/dashboard/dre': 'dre',
  '/dashboard/balancete': 'balancete',
  '/dashboard/balanco': 'balanco',
  '/orcamento': 'orcamento',
  '/relatorios': 'relatorios',
  '/fechamento': 'fechamento',
  '/dashboard/resultado': 'resultado',
  '/dashboard/fluxo-caixa': 'fluxo-caixa',
  '/dashboard/conciliacao': 'conciliacao',
  '/dashboard/lojas': 'lojas-painel',
  '/dashboard/vendas': 'vendas',
  '/dashboard/despesas': 'despesas',
  '/dashboard/projecao': 'projecao',
  '/dashboard/indicadores': 'indicadores',
  '/assistente': 'assistente',
  '/configuracoes': 'configuracoes',
  '/categorias': 'categorias',
  '/contas-bancarias': 'contas-bancarias',
  '/lojas': 'lojas',
  '/rateio': 'rateio',
  '/permissoes': 'permissoes',
  '/sobre': 'sobre',
  '/novidades': 'novidades',
  '/perfil': 'perfil',
  '/login': 'login',
};
// apelidos que o app redireciona
const APELIDOS = { '/contabil': '/dashboard/dre' };
// as páginas legais abrem as publicadas, como no app
const FORA = {
  '/privacidade': 'https://eduardo-junges.vercel.app/privacidade-nexus-pj',
  '/licenca': 'https://eduardo-junges.vercel.app/termos-nexus-pj',
};

function aprovarAparelhos() {
  execFileSync('python3', ['-c',
    `import sqlite3;d=sqlite3.connect(${JSON.stringify(BANCO)});d.execute('UPDATE dispositivos SET aprovado=1 WHERE aprovado=0');d.commit()`]);
}

function destino(href) {
  const [caminho] = href.replace(/&amp;/g, '&').split(/[?#]/);
  if (FORA[caminho]) return { url: FORA[caminho], fora: true };
  const rota = APELIDOS[caminho] ?? caminho;
  return TELAS[rota] && !APELIDOS[rota] ? { url: `${TELAS[rota]}.html` } : null;
}

const CABECA = readFileSync(new URL('./mockup-pj/cabeca.html', import.meta.url), 'utf8');
const RODAPE = readFileSync(new URL('./mockup-pj/rodape.html', import.meta.url), 'utf8');

function limpar(html, rota) {
  return html
    .replace(/<link rel="canonical"[^>]*>/, '')
    .replace(/<div id="faixaAmbiente"[\s\S]*?<\/div>/, '')
    .replace(/<script src="\/static\/js\/htmx\.min\.js[^"]*"><\/script>/, '')
    .replace(/<input type="hidden" name="_csrf"[^>]*>/g, '')
    .replace(/\s(hx-[a-z-]+)="[^"]*"/g, '')
    .replace(/\s(hx-[a-z-]+)='[^']*'/g, '')
    .replace(/(src|href)="\/static\/([^"?]+)(\?[^"]*)?"/g, '$1="static/$2"')
    .replace(/href="(\/[^"]*)"/g, (_, h) => {
      const d = destino(h);
      if (!d) return 'href="#" data-mk-fora';
      return d.fora ? `href="${d.url}" target="_blank" rel="noopener"` : `href="${d.url}"`;
    })
    .replace(/<form([^>]*?)action="[^"]*"/g, '<form$1action="#" data-mk-form')
    .replace(/<head>/, `<head>\n${CABECA}`)
    .replace(/<\/body>/, `${RODAPE}\n</body>`)
    .replace(/<title>[^<]*<\/title>/, `<title>Nexus &amp; PJ — mockup (${rota})</title>`);
}

const [email, senha] = readFileSync(join(PJ, 'ambiente_testes/dados/login_testes.txt'), 'utf8').trim().split(/\s+/);
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const ctx = await navegador.newContext();
const pagina = await ctx.newPage();

// a tela de login é capturada antes de entrar
rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });
const login = await ctx.request.get(`${BASE}/login`);
writeFileSync(join(SAIDA, 'login.html'), limpar(await login.text(), '/login'));

await pagina.goto(`${BASE}/login`);
await pagina.fill('input[name=email]', email);
await pagina.fill('input[name=senha]', senha);
await pagina.click('button[type=submit]');
await pagina.waitForURL((u) => !u.pathname.startsWith('/login'));
aprovarAparelhos();

const brutos = {};
for (const [rota, nome] of Object.entries(TELAS)) {
  if (rota === '/login') continue;
  const r = await ctx.request.get(BASE + rota, { maxRedirects: 0 });
  if (r.status() >= 300 && r.status() < 400) {
    // tela que virou parte de outra: o link passa a abrir a de destino
    const alvo = new URL(r.headers().location, BASE).pathname;
    if (!TELAS[alvo]) throw new Error(`${rota} redireciona para ${alvo}, que não está no mockup`);
    APELIDOS[rota] = alvo;
    console.log('apelido', rota, '→', alvo);
    continue;
  }
  if (r.status() !== 200) throw new Error(`${rota}: HTTP ${r.status()}`);
  brutos[rota] = await r.text();
}
for (const [rota, html] of Object.entries(brutos)) {
  writeFileSync(join(SAIDA, `${TELAS[rota]}.html`), limpar(html, rota));
  console.log('ok', rota, '→', `${TELAS[rota]}.html`);
}
await navegador.close();

cpSync(join(PJ, 'app/static'), join(SAIDA, 'static'), { recursive: true });
rmSync(join(SAIDA, 'static/js/htmx.min.js'), { force: true });
console.log('mockup exportado em', SAIDA);
