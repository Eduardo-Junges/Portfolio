/**
 * Teste de contraste dos tokens de texto (WCAG AA, 4,5:1), nos dois temas.
 *
 * Mesma ideia do tests/test_contraste.py do Nexus Analytics: lê os tokens de
 * src/styles/global.css (nada de número copiado aqui) e mede cada texto sobre
 * as superfícies onde ele aparece. Sai com código 1 se algum par reprovar.
 *
 *   node scripts/contraste.mjs
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

function bloco(seletor) {
  const i = css.indexOf(seletor + ' {');
  if (i < 0) throw new Error(`bloco ${seletor} não achado`);
  const corpo = css.slice(i, css.indexOf('\n}', i));
  const t = {};
  for (const m of corpo.matchAll(/--c-([\w-]+):\s*([\d.\s/]+);/g)) {
    const [rgb, a] = m[2].split('/').map((x) => x.trim());
    t[m[1]] = { rgb: rgb.split(/\s+/).map(Number), a: a ? Number(a) : 1 };
  }
  return t;
}

const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const razao = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** cor `c` com alfa `a` pintada sobre `fundo` (o que o navegador mostra) */
const sobre = (c, a, fundo) => c.map((v, i) => v * a + fundo[i] * (1 - a));
/** color-mix(in srgb, a p%, b) */
const mistura = (a, p, b) => a.map((v, i) => v * p + b[i] * (1 - p));

const TEXTOS = ['ink', 'ink-dim', 'ink-mute', 'ink-faint', 'accent', 'signal'];
const CATS = ['automacao', 'ia', 'dados', 'financas', 'processos', 'sistemas', 'desenvolvimento', 'produto'];

let falhas = 0;
for (const [nome, sel] of [['escuro', ':root'], ['claro', "[data-theme='light']"]]) {
  const base = bloco(':root');
  const t = { ...base, ...(sel === ':root' ? {} : bloco(sel)) };
  const bg = t.bg.rgb;
  const fundos = {
    página: bg,
    elevado: t['bg-raised'].rgb,
    'card (surface-2)': sobre(t['surface-2'].rgb, t['surface-2'].a, bg),
  };
  const linhas = [];
  for (const k of TEXTOS) {
    for (const [fn, f] of Object.entries(fundos)) {
      const r = razao(t[k].rgb, f);
      if (r < 4.5) falhas++;
      linhas.push(`${r < 4.5 ? 'FALHA' : 'ok   '} ${k.padEnd(10)} sobre ${fn.padEnd(17)} ${r.toFixed(2)}:1`);
    }
  }
  // chip de categoria: texto = 78% da cor + tinta; fundo = 11% da cor sobre a página
  for (const c of CATS) {
    const cor = t[`cat-${c}`].rgb;
    const texto = mistura(cor, 0.78, t.ink.rgb);
    const fundo = sobre(cor, 0.11, bg);
    const r = razao(texto, fundo);
    if (r < 4.5) falhas++;
    linhas.push(`${r < 4.5 ? 'FALHA' : 'ok   '} chip ${c.padEnd(16)} ${r.toFixed(2)}:1`);
  }
  console.log(`\n── tema ${nome}`);
  console.log(linhas.join('\n'));
}
console.log(falhas ? `\n${falhas} par(es) abaixo de 4,5:1` : '\nTodos os pares passam 4,5:1.');
process.exit(falhas ? 1 : 0);
