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
// 6. Experimento de precio de FLOAT
// Cada visitante ve UNO de estos tres precios (COP, IVA y envío incluidos), elegido al azar.
// Con las respuestas de los tres grupos se arma la curva: % que diría "sí" a cada precio.
// Para cambiar los precios, se cambia SOLO esta lista (y se avisa en el análisis desde qué fecha).
// ─────────────────────────────────────────────
const PRECIOS_PRUEBA = [1360000, 1684000, 2040000];
const CLAVE_PRECIO = 'floatPrecioPrueba'; // nombre con el que se guarda en el navegador

// Si la persona recarga o vuelve otro día, ve el MISMO precio. Si le tocara otro,
// podría comparar y la respuesta ya no sería solo sobre el precio que vio.
let precioAsignado = null;
try { precioAsignado = Number(localStorage.getItem(CLAVE_PRECIO)); } catch (e) { /* navegador sin almacenamiento: seguimos */ }

// .includes() descarta valores viejos (p. ej. de la lista anterior de 4 precios) o vacíos:
// en ese caso se sortea de nuevo entre los tres precios vigentes, con la misma probabilidad (1/3).
if (!PRECIOS_PRUEBA.includes(precioAsignado)) {
  precioAsignado = PRECIOS_PRUEBA[Math.floor(Math.random() * PRECIOS_PRUEBA.length)];
  try { localStorage.setItem(CLAVE_PRECIO, String(precioAsignado)); } catch (e) {}
}

// Formato colombiano: 1684000 → "$1.684.000"
const formatoCOP = (n) => '$' + n.toLocaleString('es-CO');

// Mostramos el precio en la tarjeta y en la pregunta, y lo guardamos en el campo oculto
// (sin precio_mostrado, la respuesta no se puede analizar).
const priceCard = document.getElementById('priceCard');
const precioTexto = document.getElementById('precioTexto');
const precioPregunta = document.getElementById('precioPregunta');
const precioMostrado = document.getElementById('precioMostrado');
if (precioTexto) precioTexto.textContent = formatoCOP(precioAsignado);
if (precioPregunta) precioPregunta.textContent = '¿Comprarías FLOAT a ' + formatoCOP(precioAsignado) + ' en la preventa?';
if (precioMostrado) precioMostrado.value = String(precioAsignado);
if (priceCard) priceCard.hidden = false; // la tarjeta empieza oculta para que nadie vea un precio vacío

// Origen de la visita: ?o=pauta, ?o=historia, ?utm_source=instagram... en el enlace.
// Si no viene en el enlace, usamos el sitio desde el que llegó; si no hay nada, "directo".
// Sirve para separar en el análisis a la gente de la pauta de los conocidos (que suelen decir más "sí").
const origenEl = document.getElementById('origen');
if (origenEl) {
  const params = new URLSearchParams(window.location.search);
  let origen = params.get('o') || params.get('utm_source') || '';
  if (!origen && document.referrer) {
    try {
      const host = new URL(document.referrer).hostname;
      if (host !== window.location.hostname) origen = host; // ignoramos clics dentro de la misma página
    } catch (e) {}
  }
  origenEl.value = (origen || 'directo').toLowerCase().slice(0, 40);
}

// Precio "demasiado caro": mientras escriben, dejamos solo números y los mostramos con puntos de mil.
// Al guardar, Apps Script recibe el texto "1.800.000"; en el análisis se le quitan los puntos.
const precioCaro = document.getElementById('precioCaro');
if (precioCaro) {
  precioCaro.addEventListener('input', () => {
    const digitos = precioCaro.value.replace(/\D/g, '').slice(0, 9); // \D = todo lo que no sea número
    precioCaro.value = digitos ? formatoCOP(Number(digitos)) : '';
  });
}

// ─────────────────────────────────────────────
// 7. Formulario de la lista de espera
// Envía a Netlify Forms (respaldo nativo) y en paralelo a Google Sheets
// vía Apps Script, para que ambos queden con el registro.
// ─────────────────────────────────────────────
const waitlistForm = document.getElementById('waitlistForm');
const submitBtn = document.getElementById('waitlistSubmit');
const formStatus = document.getElementById('formStatus');
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxhz74l9n1PCKNku_VWTPmDdMZbLjQUOPZoNnzFfbPkk7B27O4swPro7n8cPujAFI2J/exec';

if (waitlistForm) {
  waitlistForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // evitamos que la página se recargue

    // Si el campo trampa viene lleno, es un bot: fingimos éxito y no guardamos nada
    if (waitlistForm.querySelector('[name="bot-field"]').value) {
      showThanks();
      return;
    }

    // Bloqueamos el botón para que no se envíe dos veces con doble clic
    submitBtn.disabled = true;
    submitBtn.firstChild.textContent = 'Enviando… ';
    formStatus.textContent = '';

    const formData = new FormData(waitlistForm);

    // Las dos peticiones salen al mismo tiempo. allSettled espera a que ambas
    // terminen, aunque una falle, y nos dice cómo le fue a cada una.
    const [netlifyResult, sheetsResult] = await Promise.allSettled([
      // 1) Netlify Forms: aquí sí podemos leer la respuesta (res.ok)
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
      }).then(res => { if (!res.ok) throw new Error('Netlify ' + res.status); }),

      // 2) Google Sheets vía Apps Script. mode 'no-cors': Google no deja leer la
      //    respuesta, así que solo sabemos si falló la conexión, no si guardó.
      fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(formData) })
      // URLSearchParams = formato "campo=valor&...", el formato más simple para que Apps Script
      // reciba cada campo en e.parameter (es el que pide el doPost actualizado).
    ]);

    // Si al menos uno de los dos llegó bien, damos las gracias.
    // Si los dos fallaron (p. ej. sin internet), mostramos un error y dejamos reintentar.
    if (netlifyResult.status === 'fulfilled' || sheetsResult.status === 'fulfilled') {
      showThanks();
    } else {
      submitBtn.disabled = false;
      submitBtn.firstChild.textContent = 'Unirme a la lista ';
      formStatus.textContent = 'No pudimos enviar tus datos. Revisa tu conexión e inténtalo de nuevo, o escríbenos a furae.co@gmail.com.';
    }
  });
}

// Reemplaza el formulario por el mensaje de gracias
function showThanks(){
  waitlistForm.innerHTML = '<p style="font-size:14px;line-height:1.8;color:var(--cream)">Gracias, quedaste en la lista de acceso prioritario de FLOAT. Te avisamos apenas haya novedades.</p>';
}
