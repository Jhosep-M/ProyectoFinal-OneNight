// Presentación con GSAP: timeline de hero + reveals por scroll.
// Sin GSAP (CDN caído) o con reduced-motion: todo visible, sin animar.
(function () {
  'use strict';
  var pie = document.querySelector('.pie');
  if (pie) pie.textContent = pie.textContent.replace('2026', String(new Date().getFullYear()));

  var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelector('.galeria')?.classList.add('visible');
  if (!window.gsap || sinMovimiento) return;

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ duration: 0.8, ease: 'power3.out' });

  // Hero: secuencia de entrada (lenta para que se aprecie).
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.portada-texto h1', { y: 70, autoAlpha: 0, duration: 1.6 })
    .from('.portada-texto p', { y: 40, autoAlpha: 0, duration: 1.4 }, '-=1.0')
    .from('.portada-datos span', { y: 24, autoAlpha: 0, duration: 1.0, stagger: 0.25 }, '-=0.9')
    .from('.foto-hero.visible', { scale: 0.9, autoAlpha: 0, duration: 2 }, 0.3);

  // Hero: transición cruzada entre fotos cada 5 s.
  var fotos = gsap.utils.toArray('.foto-hero');
  if (fotos.length > 1) {
    var i = 0;
    gsap.timeline({ repeat: -1, repeatDelay: 4 })
      .to(fotos[i], { autoAlpha: 0, duration: 2 })
      .add(function () {
        i = (i + 1) % fotos.length;
        gsap.to(fotos[i], { autoAlpha: 1, duration: 2 });
      });
  }

  // Secciones: título + contenido al entrar en pantalla, una sola vez.
  gsap.utils.toArray('.bloque').forEach(function (bloque) {
    gsap.from(bloque.querySelector('h2'), {
      y: 50, autoAlpha: 0, duration: 1.2,
      scrollTrigger: { trigger: bloque, start: 'top 82%', once: true },
    });
  });

  // Ítems escalonados (sabores, precios, sucursales, galería).
  ScrollTrigger.batch('.lista-sabores li, .lista-precios div, .lista-sucursales li, .galeria figure', {
    start: 'top 88%',
    once: true,
    onEnter: function (els) {
      gsap.fromTo(els, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.22, overwrite: true });
    },
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
