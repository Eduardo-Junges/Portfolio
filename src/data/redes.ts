/**
 * As portas de contato.
 *
 * Decisão de identidade visual: o ícone de cada rede é reconhecível, mas
 * **a cor não é a da marca** — é um token do próprio site. O verde do WhatsApp
 * aqui é o verde de `categoria: financas`; o roxo do Instagram é o de `ia`.
 * Assim as seis portas parecem parte do site, não seis logos colados nele.
 *
 * O par de grupos vem da decisão de público (contrata / lê / pode virar
 * cliente): `trabalho` é a porta formal, `direto` é conversa. Aparecem juntas,
 * nessa ordem — nunca separadas em seções, o que obrigaria o visitante a se
 * classificar antes de falar.
 */

export type IdRede = 'email' | 'linkedin' | 'github' | 'whatsapp' | 'instagram' | 'facebook';

export interface Rede {
  id: IdRede;
  /** nome da rede — vira o texto do botão e o aria-label */
  rotulo: string;
  /** o endereço dele lá dentro. Só na variante completa. */
  identificador: string;
  href: string;
  /** token RGB cru do site (camada 1). Vira `--rede-cor` no botão. */
  cor: string;
  grupo: 'trabalho' | 'direto';
  /** mailto fica na mesma aba; o resto abre fora para não perder o site */
  externo: boolean;
}

export const EMAIL = 'h.junges.14@gmail.com';

export const redes: readonly Rede[] = [
  {
    id: 'email',
    rotulo: 'E-mail',
    identificador: EMAIL,
    href: `mailto:${EMAIL}`,
    cor: 'var(--c-signal)', // âmbar: a mesma cor das métricas. É a porta principal.
    grupo: 'trabalho',
    externo: false,
  },
  {
    id: 'linkedin',
    rotulo: 'LinkedIn',
    identificador: '/in/eduardo-henrique-junges',
    href: 'https://www.linkedin.com/in/eduardo-henrique-junges-042b4522a',
    cor: 'var(--c-accent)',
    grupo: 'trabalho',
    externo: true,
  },
  {
    id: 'github',
    rotulo: 'GitHub',
    identificador: '@Eduardo-Junges',
    href: 'https://github.com/Eduardo-Junges',
    cor: 'var(--c-ink)', // neutro de propósito — é o que a marca é
    grupo: 'trabalho',
    externo: true,
  },
  {
    id: 'whatsapp',
    rotulo: 'WhatsApp',
    identificador: 'Mensagem direta',
    href: 'https://wa.me/qr/76JVCXKRUGP4J1',
    cor: 'var(--c-cat-financas)',
    grupo: 'direto',
    externo: true,
  },
  {
    id: 'instagram',
    rotulo: 'Instagram',
    identificador: '@eduardo_junges',
    href: 'https://instagram.com/eduardo_junges',
    cor: 'var(--c-cat-ia)',
    grupo: 'direto',
    externo: true,
  },
  {
    id: 'facebook',
    rotulo: 'Facebook',
    identificador: 'eduardo.junges.37',
    href: 'https://facebook.com/eduardo.junges.37',
    cor: 'var(--c-cat-sistemas)', // azul-aço: distinto do azul vivo do LinkedIn
    grupo: 'direto',
    externo: true,
  },
] as const;
