/**
 * "Dados com vida" do site — porte discreto do vida.js do Nexus & PJ.
 *
 *  - a borda do cartão acende onde o cursor está (só Completo; o CSS faz o resto);
 *  - cartões ABAIXO da dobra entram uma vez ao aparecer (só Completo). Os que já
 *    estão na tela no carregamento nunca são escondidos: o primeiro conteúdo
 *    aparece na hora, sem esperar script.
 *
 * O nível vem de <html data-efeitos> (carimbado no <head>, trocado pelo menu).
 */
const raiz = document.documentElement;
const nivel = () => raiz.dataset.efeitos;

// ── brilho da borda ─────────────────────────────────────────────────────────
let pendente = false;
let ultimo: PointerEvent | null = null;
document.addEventListener(
  'pointermove',
  (e) => {
    if (nivel() !== 'completo' || e.pointerType !== 'mouse') return;
    ultimo = e;
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(() => {
      pendente = false;
      const alvo = (ultimo?.target as HTMLElement | null)?.closest?.<HTMLElement>('.card');
      if (!alvo || !ultimo) return;
      const r = alvo.getBoundingClientRect();
      alvo.style.setProperty('--mx', `${ultimo.clientX - r.left}px`);
      alvo.style.setProperty('--my', `${ultimo.clientY - r.top}px`);
    });
  },
  { passive: true },
);

// ── entrada por rolagem ─────────────────────────────────────────────────────
function marcarEntradas() {
  if (nivel() !== 'completo') return;
  const abaixo = Array.from(document.querySelectorAll<HTMLElement>('main .card')).filter(
    (c) => c.getBoundingClientRect().top > window.innerHeight * 0.92,
  );
  if (CSS.supports?.('animation-timeline: view()')) {
    abaixo.forEach((c) => c.classList.add('vida-entra'));
    return;
  }
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (itens) => {
      itens.forEach((it) => {
        if (!it.isIntersecting) return;
        it.target.classList.add('vida-visto');
        io.unobserve(it.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  abaixo.forEach((c) => {
    c.classList.add('vida-pre');
    io.observe(c);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', marcarEntradas);
else marcarEntradas();
