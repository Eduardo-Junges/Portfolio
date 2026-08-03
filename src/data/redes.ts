/**
 * As portas de contato.
 *
 * Três, e só três. Instagram e Facebook saíram por não agregarem nada a uma
 * página técnica — diluíam a atenção sem oferecer nada que o LinkedIn não
 * oferecesse melhor. O WhatsApp saiu por segurança: número pessoal exposto em
 * URL pública e indexável é matéria-prima de scraping, e quem quer conversar
 * chega igual pelo e-mail.
 *
 * Decisão de identidade visual que permanece: o ícone de cada rede é
 * reconhecível, mas **a cor não é a da marca** — é um token do próprio site.
 * Assim as portas parecem parte do site, não logos colados nele.
 */

export type IdRede = 'email' | 'linkedin' | 'github';

export interface Rede {
  id: IdRede;
  /** nome da rede — vira o texto do botão e o aria-label */
  rotulo: string;
  /** o endereço dele lá dentro. Só na variante completa. */
  identificador: string;
  href: string;
  /** token RGB cru do site (camada 1). Vira `--rede-cor` no botão. */
  cor: string;
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
    externo: false,
  },
  {
    id: 'linkedin',
    rotulo: 'LinkedIn',
    identificador: '/in/eduardo-henrique-junges',
    href: 'https://www.linkedin.com/in/eduardo-henrique-junges-042b4522a',
    cor: 'var(--c-accent)',
    externo: true,
  },
  {
    id: 'github',
    rotulo: 'GitHub',
    identificador: '@Eduardo-Junges',
    href: 'https://github.com/Eduardo-Junges',
    cor: 'var(--c-ink)', // neutro de propósito — é o que a marca é
    externo: true,
  },
] as const;
