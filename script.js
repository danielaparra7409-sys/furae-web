// ─────────────────────────────────────────────
// 1. Header: fondo oscuro cuando el usuario baja más de 40px
// ─────────────────────────────────────────────
const header = document.getElementById('siteHeader');
function onScrollHeader(){
  if (window.scrollY > 40) header.classList.add('is-scrolled');
  else header.classList.remove('is-scrolled');
}
window.addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();

// ─────────────────────────────────────────────
// 2. Menú móvil: abrir/cerrar y cerrarlo al tocar un link
// ─────────────────────────────────────────────
const menuToggle = document.getElementById('menuToggle');
const mobileNav = document.getElementById('mobileNav');
if (menuToggle && mobileNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ─────────────────────────────────────────────
// 3. Animación de aparición al hacer scroll (.reveal → .in)
// threshold 0.2: se activa cuando se ve el 20% del elemento
// (antes 0.35; en celular algunos bloques altos tardaban en aparecer)
// ─────────────────────────────────────────────
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target); // solo se anima una vez
    }
  });
}, { threshold: 0.2 });
revealEls.forEach(el => revealObserver.observe(el));

// ─────────────────────────────────────────────
// 4. Sección OBJETO: cambia la foto según el paso que está en pantalla
// ─────────────────────────────────────────────
const storySteps = document.querySelectorAll('.story-step');
const visualFrames = document.querySelectorAll('.visual-frame');
if (storySteps.length && visualFrames.length) {
  const storyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const key = entry.target.getAttribute('data-visual');
        storySteps.forEach(s => s.classList.toggle('is-active', s === entry.target));
        visualFrames.forEach(f => f.classList.toggle('is-visible', f.classList.contains('visual-frame--' + key)));
      }
    });
  }, { threshold: 0.6 });
  storySteps.forEach(step => storyObserver.observe(step));
}

// ─────────────────────────────────────────────
// 5. Videos: ahorrar datos y respetar "reducir movimiento"
// ─────────────────────────────────────────────
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Si la persona pidió menos movimiento en su sistema, pausamos todos los videos
// y se queda la imagen fija (poster).
if (prefersReducedMotion) {
  document.querySelectorAll('video').forEach(v => { v.removeAttribute('autoplay'); v.pause(); });
}

// Video del inicio: en celular usamos la versión de 720p (~3 MB) en vez de la de 1080p (~6,5 MB).
// El HTML ya lo pide con <source media>, pero algunos navegadores ignoran ese atributo;
// esto lo asegura: si estamos en pantalla pequeña y cargó la de 1080p, la cambiamos.
const heroVideo = document.querySelector('.hero-video');
if (heroVideo && window.matchMedia('(max-width: 900px)').matches && !heroVideo.currentSrc.includes('720')) {
  heroVideo.src = 'assets/hero-furae-720.mp4';
  if (!prefersReducedMotion) heroVideo.play().catch(() => {});
}

// Los videos con .lazy-video (ORIGEN) solo se descargan y reproducen cuando
// están en pantalla, y se pausan al salir. Así el celular no baja el video
// dos veces al abrir la página.
const lazyVideos = document.querySelectorAll('.lazy-video');
if (lazyVideos.length && !prefersReducedMotion) {
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) video.play().catch(() => {}); // .catch: algunos navegadores bloquean autoplay; no pasa nada
      else video.pause();
    });
  }, { threshold: 0.1 });
  lazyVideos.forEach(v => videoObserver.observe(v));
}

// ─────────────────────────────────────────────
// 6. Sección de compra: precio, esmeralda, talla, cupón y botón de compra
// ─────────────────────────────────────────────
// PRECIO: se cambia SOLO aquí. $1.240.000 es el precio propuesto de la preventa
// (pendiente de aprobación del CEO). El apartado es el 50 %.
const PRECIO_FLOAT = 1240000;
const PORCENTAJE_APARTADO = 0.5;
const INSTAGRAM_DM = 'https://ig.me/m/furae.co'; // abre el chat de Instagram de FURÁE

// Formato colombiano: 1240000 → "$1.240.000"
const formatoCOP = (n) => '$' + n.toLocaleString('es-CO');

const precioTexto = document.getElementById('precioTexto');
const apartadoTexto = document.getElementById('apartadoTexto');
if (precioTexto) precioTexto.textContent = formatoCOP(PRECIO_FLOAT);
if (apartadoTexto) apartadoTexto.textContent = formatoCOP(Math.round(PRECIO_FLOAT * PORCENTAJE_APARTADO));

// Elegir esmeralda: al tocar una miniatura, cambia la foto grande con un fundido suave
const stageImg = document.getElementById('stageImg');
const gemBtns = document.querySelectorAll('.gem');
const gemName = document.getElementById('gemName');
const stageMark = document.querySelector('.stage-mark');
let gemElegida = '01';
gemBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    gemElegida = btn.dataset.gem;
    gemBtns.forEach((b) => b.classList.toggle('is-on', b === btn)); // solo una queda marcada
    if (gemName) gemName.textContent = gemElegida;
    if (stageMark) stageMark.textContent = 'FLOAT 01 · Esmeralda ' + gemElegida;
    if (stageImg) {
      stageImg.classList.add('is-swapping'); // se desvanece...
      setTimeout(() => {
        stageImg.src = btn.dataset.img;       // ...cambia la foto...
        stageImg.classList.remove('is-swapping'); // ...y vuelve a aparecer
      }, 250);
    }
  });
});

// Cupón "Especial para ti": por ahora solo se guarda (en mayúsculas); todavía NO se valida.
// Cuando haya validación real, se consultará aquí a un servidor (nunca se calcula el descuento en el navegador).
const couponInput = document.getElementById('coupon');
const couponBtn = document.getElementById('couponBtn');
const couponMsg = document.getElementById('couponMsg');
let cuponGuardado = '';
if (couponBtn && couponInput) {
  couponBtn.addEventListener('click', () => {
    const codigo = couponInput.value.trim().toUpperCase();
    couponInput.value = codigo;
    if (!codigo) { cuponGuardado = ''; couponMsg.textContent = 'Escribe tu cupón.'; return; }
    cuponGuardado = codigo;
    couponMsg.textContent = 'Cupón ' + codigo + ' guardado. Lo aplicamos al confirmar tu compra.';
  });
}

// Botón "Comprar ahora": pide la talla, copia el pedido y abre el chat de Instagram.
// (Todavía no cobra: el pago se conecta después con la pasarela.)
const buyBtn = document.getElementById('buyBtn');
const buyStatus = document.getElementById('buyStatus');
const tallaSel = document.getElementById('talla');
if (buyBtn && tallaSel) {
  buyBtn.addEventListener('click', async () => {
    if (!tallaSel.value) {
      buyStatus.textContent = 'Elige tu talla para continuar.';
      tallaSel.focus();
      return;
    }
    let pedido = 'Hola FURÁE, quiero comprar FLOAT 01 · Esmeralda ' + gemElegida + ' · Talla ' + tallaSel.value;
    if (cuponGuardado) pedido += ' · Cupón ' + cuponGuardado;
    try { await navigator.clipboard.writeText(pedido); } catch (e) { /* sin permiso para copiar: el mensaje se muestra abajo */ }
    buyStatus.textContent = 'Copiamos tu pedido: ' + pedido + '. Te llevamos a Instagram, pégalo y lo confirmamos.';
    setTimeout(() => { window.location.href = INSTAGRAM_DM; }, 1400);
  });
}
