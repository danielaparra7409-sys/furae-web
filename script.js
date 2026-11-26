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

// Video del inicio: en celular el HTML ya pide la versión de 720p con <source media>.
// (Antes se forzaba el cambio de archivo por código, pero eso reiniciaba la descarga en algunos celulares
// y podía dejar el video congelado, por eso se quitó.)
const heroVideo = document.querySelector('.hero-video');
if (heroVideo) heroVideo.preload = 'auto'; // que baje el video completo de una vez; con 'metadata' algunos Android se quedan en la foto
// Para que el video arranque solo en TODOS los celulares (iPhone y Android piden que esté silenciado y "en línea"):
// se marca por código además del HTML, porque algunos navegadores solo leen la propiedad.
// Los videos de la web son decorativos, sin sonido ni destellos: se reproducen aunque el equipo tenga "reducir movimiento" activado
// (antes, con esa opción, el video se quedaba en pausa en el primer cuadro).
const reproducir = (v) => { if (!v) return; const p = v.play(); if (p && p.catch) p.catch(() => {}); };
document.querySelectorAll('video').forEach((v) => {
  v.muted = true; v.defaultMuted = true; v.playsInline = true;
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
});
reproducir(heroVideo);
// Reintentos: si el video aún no estaba listo cuando se pidió reproducir, se vuelve a pedir al cargar.
if (heroVideo) ['loadeddata', 'canplay'].forEach((ev) => heroVideo.addEventListener(ev, () => { if (heroVideo.paused && !document.hidden) reproducir(heroVideo); }));
// Si el celular bloquea la reproducción automática (modo de ahorro de batería en iPhone, ahorro de datos en Android),
// se ve la foto fija y el video arranca con el primer toque en la pantalla.
const enPantalla = new Set();
if ('IntersectionObserver' in window) {
  const ioVid = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { enPantalla.add(e.target); reproducir(e.target); } else { enPantalla.delete(e.target); e.target.pause(); }
  }), { threshold: 0.05 });
  document.querySelectorAll('.hero-video, .lazy-video').forEach((v) => ioVid.observe(v));
}
const desbloquearVideos = () => enPantalla.forEach((v) => { if (v.paused) reproducir(v); });
['touchend', 'pointerup', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, desbloquearVideos, { passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden) desbloquearVideos(); });

// Plan B del video del inicio, SIN botón de play: si el celular bloquea la reproducción automática
// (iPhone con "Modo de bajo consumo", ahorro de datos, navegador interno de Instagram o WhatsApp):
//  1) se esconde el elemento <video>, así el sistema nunca puede dibujar su flechita de play encima;
//  2) en su lugar se ve la foto del primer cuadro con un zoom lento (no se ve congelada);
//  3) en Safari se intenta además mostrar el mismo video como IMAGEN animada (<img src="...mp4">), que Safari
//     reproduce sola como si fuera un GIF; si el navegador no lo soporta, se queda la foto en movimiento;
//  4) con el primer toque en cualquier parte de la página, el video real arranca y todo vuelve a la normalidad.
const heroSec = document.getElementById('hero');
if (heroVideo && heroSec) {
  let imgAnim = null;
  const esSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(navigator.userAgent) || /iP(hone|ad|od)/.test(navigator.userAgent);
  const ponerImagenAnimada = () => {
    if (imgAnim || !esSafari) return;
    imgAnim = new Image();
    imgAnim.className = 'hero-anim';
    imgAnim.alt = ''; imgAnim.setAttribute('aria-hidden', 'true');
    imgAnim.onload = () => { if (heroSec.classList.contains('hero-sin-video')) heroSec.classList.add('hero-con-anim'); };
    imgAnim.onerror = () => { imgAnim.remove(); };   // no soportado: se queda la foto con zoom
    imgAnim.src = 'assets/hero-loop-720.mp4';
    heroVideo.after(imgAnim);
  };
  const revisarHero = () => {
    const parado = heroVideo.paused && !document.hidden && enPantalla.has(heroVideo);
    if (!parado) return;
    heroSec.classList.add('hero-sin-video');
    ponerImagenAnimada();
  };
  // Cuando el video real por fin corre, se quita todo el plan B
  heroVideo.addEventListener('playing', () => { heroSec.classList.remove('hero-sin-video', 'hero-con-anim'); });
  // Se revisa justo al abrir el telón y unos segundos después (por si el sistema lo pausó al revelar la página)
  const revisarTrasAbrir = () => { setTimeout(revisarHero, 900); setTimeout(revisarHero, 3000); };
  if (document.documentElement.classList.contains('intro-out') || !document.documentElement.classList.contains('intro-wait')) revisarTrasAbrir();
  else new MutationObserver((m, o) => { if (document.documentElement.classList.contains('intro-out')) { o.disconnect(); revisarTrasAbrir(); } })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

// Los videos con .lazy-video (ORIGEN) solo se descargan y reproducen cuando
// están en pantalla, y se pausan al salir. Así el celular no baja el video
// dos veces al abrir la página.
const lazyVideos = document.querySelectorAll('.lazy-video');
if (lazyVideos.length) {
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) reproducir(video); // si el navegador lo bloquea, arranca con el primer toque
      else video.pause();
    });
  }, { threshold: 0.1 });
  lazyVideos.forEach(v => videoObserver.observe(v));
}

// ─────────────────────────────────────────────
// 6. Sección de compra
// ─────────────────────────────────────────────
// ★ CONFIGURACIÓN (lo único que se toca para ajustar la compra) ★
const PRECIO_FLOAT = 1240000;          // precio de preventa (pendiente de aprobación del CEO)
const PORCENTAJE_APARTADO = 0.5;       // se aparta con el 50 %
const INSTAGRAM_DM = 'https://ig.me/m/furae.co';
const ENVIO_VALOR = 35000;             // valor REAL aproximado del envío asegurado (flete + seguro). Confirmar con la cotización de Coordinadora.
const FECHA_LIMITE_NAVIDAD = '15 de diciembre'; // fecha límite de pedidos sobre medida para Navidad. '' = no mostrar el aviso.
const FECHA_LIMITE_NAVIDAD_ISO = '2026-12-15';  // la misma fecha en formato año-mes-día (para saber si ya pasó)
const META_PIXEL_ID = '';              // ID del Pixel de Meta (vacío = no se carga nada)
const WHATSAPP_NUMERO = '573118509507';            // ej. '573001234567' (57 + celular, sin + ni espacios). Vacío = se usa Instagram.
const PASARELA_LINK = '';              // link de pago del apartado (Wompi / Bold / Mercado Pago). Vacío = se confirma por chat.
// Links de pago de Mercado Pago. Cada uno cobra un monto FIJO: si cambias el precio o el cupón,
// crea links nuevos en Mercado Pago y pégalos aquí. Vacío = el botón de tarjeta/PSE se oculta.
const MP_LINKS = {
  620000: 'https://mpago.li/1NEHZUB',  // apartado normal (50 % de $1.240.000)
  541500: 'https://mpago.li/1CrR8yy',  // apartado con cupón FURAVIDAD (50 % de $1.083.000)
  1240000: 'https://mpago.li/11VeJtZ', // pago completo, precio normal
  1083000: 'https://mpago.li/2FJnSwd'  // pago completo con cupón FURAVIDAD (también anillos ya hechos)
};
const PEDIDOS_URL = '';                // (opcional) URL de Google Apps Script para guardar cada pedido en la hoja

// ★ CUPÓN ★ precio fijo con el cupón. Vale para anillos YA HECHOS siempre y para pedidos sobre medida confirmados hasta "hasta".
const CUPON = { codigo: 'FURAVIDAD', precio: 1083000, hasta: '2026-12-01', hastaTexto: '1 de diciembre' };
// ★ ANILLOS YA HECHOS ★ (entrega desde 5 días hábiles). Uno por esmeralda y talla fija, por ejemplo: [{ gem: '01', talla: '6' }].
// Vacío = no se muestra la opción "Ya hecho".
const LISTOS = [{ gem: 'anillo', talla: '7' }]; // 'anillo' = el anillo ya hecho (ítem aparte de las esmeraldas, ver GEMS)

// ★ ESMERALDAS ★ Para agregar una: copia un bloque, cambia foto y textos.
// ct / alto / ancho / profundidad en null = se usan los datos base de abajo. OJO: los textos y nombres son un BORRADOR,
// deben ajustarse a cada piedra real (color, inclusiones, quilates y medidas reales).
const ESPECIFICACIONES_BASE = {
  ct: '0,35 ct',
  alto: '4 mm',
  ancho: '4 mm',
  profundidad: '4 mm',
  talla: 'Esmeralda',
  origen: 'Colombia',
  tipo: 'Natural · certificado de laboratorio'
};
// Las 4 esmeraldas reales (datos del certificado del Instituto Colombiano de Gemología, ICG).
// En el certificado las medidas vienen como "largo x ancho x profundidad": aquí largo = "ancho" y ancho = "alto"
// (así se mostraba en la ficha desde antes). corte = forma de la piedra. reporte = número del certificado.
// Los textos (desc) son descripciones de la forma y el color que se ven en la foto: ajústalos si quieres.
const GEMS = [
  // El ANILLO YA HECHO (talla US 7): es un producto aparte de las esmeraldas. Conserva las especificaciones que tenía antes.
  // Sus fotos están en FOTOS_ANILLO (más abajo); img es la que se usa de miniatura y en el resumen de compra.
  { id: 'anillo', tipo: 'anillo', nombre: 'Veta', img: 'assets/fotos/gema-claro.jpg',
    desc: 'Un verde profundo, como el interior de la montaña. Su jardín de inclusiones dibuja un paisaje propio que cambia con cada ángulo de luz.', ct: '0,38 ct', alto: '3,88 mm', ancho: '5,07 mm', profundidad: '2,59 mm' },
  // Las 4 ESMERALDAS (sobre pedido), cada una con los datos de su certificado
  { id: '01', nombre: 'Selva', img: 'assets/fotos/piedra-1.jpg', corte: 'Rectangular escalonado', reporte: '0167011',
    desc: 'Un verde intenso en talla rectangular escalonada, la talla clásica de la esmeralda. Sus facetas largas dejan correr la luz como un espejo.',
    ct: '0,29 ct', ancho: '4,77 mm', alto: '3,60 mm', profundidad: '2,32 mm' },
  { id: '02', nombre: 'Rocío', img: 'assets/fotos/piedra-2.jpg', corte: 'Cuadrada', reporte: '0167012',
    desc: 'Un verde luminoso y fresco en talla cuadrada, de líneas limpias. Deja ver su color sin adornos, como una gota de la mañana.',
    ct: '0,32 ct', ancho: '4,14 mm', alto: '4,14 mm', profundidad: '2,63 mm' },
  { id: '03', nombre: 'Bruma', img: 'assets/fotos/piedra-3.jpg', corte: 'Octagonal', reporte: '0167013',
    desc: 'Un verde sereno con reflejos azulados, de esquinas cortadas. Cambia de matiz según cómo le llegue la luz.',
    ct: '0,39 ct', ancho: '4,47 mm', alto: '4,14 mm', profundidad: '2,91 mm' },
  { id: '04', nombre: 'Alba', img: 'assets/fotos/piedra-4.jpg', corte: 'Cojín', reporte: '0167014',
    desc: 'Un verde vivo en talla cojín, de contornos suaves. La luz entra por sus facetas y la hace brillar desde adentro.',
    ct: '0,40 ct', ancho: '4,81 mm', alto: '4,36 mm', profundidad: '3,02 mm' }
];

// Formato colombiano: 1240000 → "$1.240.000"
const formatoCOP = (n) => '$' + n.toLocaleString('es-CO');
// ── Estado de la compra: modo (sobre pedido / ya hecho) y cupón ──
const estado = { modo: 'pedido', cupon: '', pagoTotal: false }; // pagoTotal: true = paga todo de una vez
const listoDe = (id) => LISTOS.find((l) => l.gem === id);
const cuponVale = () => estado.cupon === CUPON.codigo && (estado.modo === 'listo' || new Date() <= new Date(CUPON.hasta + 'T23:59:59'));
const precioFinal = () => (cuponVale() ? CUPON.precio : PRECIO_FLOAT);
const apartadoDe = () => Math.round(precioFinal() * PORCENTAJE_APARTADO);
const montoHoy = () => (estado.pagoTotal ? precioFinal() : apartadoDe()); // lo que se cobra hoy
const precioTexto = document.getElementById('precioTexto');
const precioViejo = document.getElementById('precioViejo');
const apartadoTexto = document.getElementById('apartadoTexto');
const modeBox = document.getElementById('mode');
const modeBtns = modeBox ? [...modeBox.querySelectorAll('.mode__btn')] : [];
const modeListoBtn = document.getElementById('modeListo');
const dlvTitle = document.getElementById('dlvTitle');
const dlvText = document.getElementById('dlvText');
const dlvSteps = document.getElementById('dlvSteps');
const stageReady = document.getElementById('stageReady');
const couponInput = document.getElementById('coupon');
const couponBtn = document.getElementById('couponBtn');
const couponMsg = document.getElementById('couponMsg');

// El precio aparece de una vez (sin cuenta regresiva) y se actualiza con el cupón
function pintarPrecio() {
  if (precioTexto) precioTexto.textContent = formatoCOP(precioFinal());
  if (precioViejo) { precioViejo.hidden = !cuponVale(); precioViejo.textContent = formatoCOP(PRECIO_FLOAT); }
  if (apartadoTexto) apartadoTexto.textContent = formatoCOP(apartadoDe());
  pintarResumen();
  if (ultimoPrecio !== precioFinal()) { ultimoPrecio = precioFinal(); revelarPrecio(); }
  const bt = document.getElementById('buyBtnText');
  if (bt && PASARELA_LINK) bt.textContent = 'Apartar con ' + formatoCOP(apartadoDe());
}
function mensajeCupon() {
  if (!couponMsg) return;
  if (!estado.cupon) { couponMsg.textContent = ''; return; }
  if (estado.cupon !== CUPON.codigo) { couponMsg.textContent = 'Ese cupón no es válido. Revisa que esté bien escrito.'; return; }
  couponMsg.textContent = cuponVale()
    ? '✦ ' + CUPON.codigo + ' aplicado: tu precio es ' + formatoCOP(CUPON.precio) + '.'
    : 'El cupón ' + CUPON.codigo + ' aplica a pedidos confirmados hasta el ' + CUPON.hastaTexto + ' o a anillos ya hechos.';
}
// Pinta el modo elegido: textos de entrega, talla fija si es "ya hecho", insignia y precio
function modoPintar() {
  const listo = estado.modo === 'listo';
  const l = listoDe(gemElegida.id);
  modeBtns.forEach((b) => { const on = b.dataset.mode === estado.modo; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
  if (dlvTitle) dlvTitle.innerHTML = listo
    ? 'Ya está hecho · sale en <strong>5 días hábiles</strong>'
    : 'Hecho sobre pedido · llega en aprox. <strong>10 días hábiles</strong>';
  if (dlvText) dlvText.textContent = listo
    ? 'Este anillo ya está terminado y pulido. Lo revisamos, lo empacamos y lo enviamos asegurado: sale en 5 días hábiles, más lo que tarde la transportadora a tu ciudad.'
    : 'Cada FLOAT se fabrica después de tu pedido. Es un proceso real y por eso toma tiempo; vale la pena saberlo antes de comprar, sobre todo si es un regalo para Navidad.';
  if (dlvSteps) dlvSteps.hidden = listo;
  const xm = document.getElementById('xmasMsg'); if (xm) xm.style.display = listo ? 'none' : '';
  if (stageReady) stageReady.hidden = !(listo && l);
  const ts = document.getElementById('talla');
  if (ts) { if (listo && l) { ts.value = 'US ' + l.talla; ts.disabled = true; } else { if (ts.disabled) ts.value = ''; ts.disabled = false; } } // al salir del anillo ya hecho se libera la talla
  pintarPrecio(); mensajeCupon();
}
// Se llama cada vez que cambia la esmeralda
function refrescarModo() {
  const l = listoDe(gemElegida.id);
  if (modeBox) {
    modeBox.hidden = !LISTOS.length;
    if (modeListoBtn) {
      modeListoBtn.disabled = !l;
      modeListoBtn.querySelector('span').textContent = l ? 'desde 5 días hábiles · talla US ' + l.talla : 'solo el anillo Veta está ya hecho';
    }
    // el anillo ya hecho no se fabrica sobre pedido
    const pedidoBtn = modeBox.querySelector('.mode__btn[data-mode="pedido"]');
    if (pedidoBtn) pedidoBtn.disabled = !!l;
  }
  estado.modo = l && LISTOS.length ? 'listo' : 'pedido'; // el anillo = ya hecho; las esmeraldas = sobre pedido
  modoPintar();
}
// ── v4: resumen, aviso de Navidad, desenfoque del precio y pago en línea ──
let ultimoPrecio = PRECIO_FLOAT;
const buyPrice = document.querySelector('.buy-price');
// El precio aparece con un desenfoque que se aclara (igual que en la pauta)
function revelarPrecio() {
  if (!buyPrice || prefersReducedMotion) return;
  buyPrice.classList.add('is-pending');
  requestAnimationFrame(() => requestAnimationFrame(() => buyPrice.classList.remove('is-pending')));
}
if (buyPrice && !prefersReducedMotion && 'IntersectionObserver' in window) {
  buyPrice.classList.add('is-pending');
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { buyPrice.classList.remove('is-pending'); o.disconnect(); } }, { threshold: 0.45 }).observe(buyPrice);
}
// Resumen del pedido: aquí se muestra el envío ($35.000) como "Incluido"
function pintarResumen() {
  let g; try { g = gemElegida; } catch (e) { return; } // aún no se declara al cargar la página
  const set = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
  const ts = document.getElementById('talla');
  set('sumAnillo', g.nombre + ' · talla ' + (ts && ts.value && ts.value.indexOf('US') === 0 ? ts.value : 'por elegir'));
  set('sumPrecio', formatoCOP(precioFinal()));
  set('sumApartado', formatoCOP(apartadoDe()));
  set('sumSaldo', formatoCOP(precioFinal() - apartadoDe()));
}
const tallaEl = document.getElementById('talla');
if (tallaEl) tallaEl.addEventListener('change', pintarResumen);
// Aviso de Navidad: fecha límite y atajo a los anillos ya hechos
function pintarNavidad() {
  const xm = document.getElementById('xmasMsg');
  if (!xm || !FECHA_LIMITE_NAVIDAD) return;
  const paso = new Date() > new Date(FECHA_LIMITE_NAVIDAD_ISO + 'T23:59:59-05:00');
  xm.innerHTML = '✦ ' + (paso
    ? 'El plazo para pedidos sobre medida antes de Navidad ya cerró. '
    : 'Para recibirlo antes de Navidad, confirma tu pedido hasta el ' + FECHA_LIMITE_NAVIDAD + '. Después de esa fecha solo llega a tiempo un anillo ya hecho. ')
    + (LISTOS.length
      ? '<button type="button" class="linkbtn" id="xmasListos">Ver anillos ya hechos</button>'
      : '<a class="linkbtn" target="_blank" rel="noopener" href="' + urlChat('Hola FURÁE, ¿tienen anillos FLOAT ya hechos para Navidad?') + '">Pregúntanos si hay modelos ya armados</a>');
  const b = document.getElementById('xmasListos');
  if (b) b.addEventListener('click', () => {
    const g = GEMS.find((x) => x.id === LISTOS[0].gem);
    if (g) { elegirGema(g); estado.modo = 'listo'; modoPintar(); }
    modeBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
// Pago en línea: pide a la función de Netlify el link de pago de Wompi (el precio y el cupón se validan allá).
// Si no está configurada (o la talla requiere confirmación), devuelve null y se sigue por WhatsApp.
async function pedirPago(pedido) {
  const ts = document.getElementById('talla');
  if (!ts || !/^US [5-8]$/.test(ts.value)) return null;
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 7000);
    const r = await fetch('/.netlify/functions/crear-pago', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({ gem: gemElegida.id, talla: ts.value, modo: estado.modo, cupon: cuponVale() ? estado.cupon : '' })
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.url) return null;
    try { sessionStorage.setItem('furae_pedido', JSON.stringify({ pedido, ref: j.referencia, env: j.env, apartado: j.apartado })); } catch (e) {}
    return j.url;
  } catch (e) { return null; }
}
modeBtns.forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; estado.modo = b.dataset.mode; modoPintar(); }));
pintarPrecio();

// Canal de chat: WhatsApp si hay número; si no, Instagram
const urlChat = (texto) => WHATSAPP_NUMERO
  ? 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' + encodeURIComponent(texto)
  : INSTAGRAM_DM;
const waLink = document.getElementById('waLink');
const waCanal = document.getElementById('waCanal');
const faqChat = document.getElementById('faqChat');
if (faqChat) { faqChat.href = urlChat('Hola FURÁE, tengo una pregunta sobre FLOAT.'); faqChat.textContent = WHATSAPP_NUMERO ? 'por WhatsApp' : 'por Instagram'; }
const chatFab = document.getElementById('chatFab');
if (chatFab) chatFab.href = urlChat('Hola FURÁE, quiero más información sobre FLOAT.');
const envioValor = document.getElementById('envioValor');
if (envioValor) envioValor.textContent = formatoCOP(ENVIO_VALOR);
const xmasMsg = document.getElementById('xmasMsg');
pintarNavidad();
// Tallas: las 4 que ya tienen molde (US 5, 6, 7 y 8, decisión del 20 nov) y, aparte, las demás bajo consulta.
// Como el anillo es rígido, una talla "bajo consulta" se confirma con el CEO antes de fabricar (puede tardar más).
const TALLAS_DISPONIBLES = ['5', '6', '7', '8'];
const TALLAS_CONSULTA = ['4', '4,5', '5,5', '6,5', '7,5', '8,5', '9', '9,5', '10', '10,5', '11'];
const tallaSelect = document.getElementById('talla');
if (tallaSelect) {
  const grupo = (titulo, lista) => {
    const g = document.createElement('optgroup'); g.label = titulo;
    lista.forEach((n) => { const o = document.createElement('option'); o.value = 'US ' + n; o.textContent = 'US ' + n.replace(',5', '½'); g.appendChild(o); });
    tallaSelect.appendChild(g);
  };
  grupo('Tallas disponibles', TALLAS_DISPONIBLES);
  grupo('Otra talla (la confirmamos contigo antes de fabricar)', TALLAS_CONSULTA);
  const g = document.createElement('optgroup'); g.label = '¿No la sabes?';
  const o = document.createElement('option'); o.value = 'No sé mi talla'; o.textContent = 'No sé mi talla (ver la guía)'; g.appendChild(o);
  tallaSelect.appendChild(g);
}
if (waLink) {
  waLink.href = urlChat('Hola FURÁE, tengo una pregunta sobre FLOAT.');
  if (waCanal) waCanal.textContent = WHATSAPP_NUMERO ? 'por WhatsApp' : 'por Instagram';
}

// ── Esmeraldas: miniaturas, ficha y foto grande ──
const stage = document.getElementById('zoomStage');
const stageImg = document.getElementById('stageImg');
const stageMark = document.getElementById('stageMark');
const gemsBox = document.getElementById('gems');
const gemInfo = document.getElementById('gemInfo');
const gemName = document.getElementById('gemName');
let gemElegida = GEMS[0];

// ★ FOTOS DEL ANILLO ★ Todas van en UNA sola miniatura (la del anillo ya hecho). En la foto grande se cambian con las flechas,
// los puntos, deslizando el dedo (celular) o con las flechas del teclado. Para agregar otra foto, suma una línea aquí.
const FOTOS_ANILLO = [
  { img: 'assets/fotos/gema-claro.jpg',  alt: 'Anillo FLOAT de frente, con la esmeralda dentro del volumen transparente' },
  { img: 'assets/fotos/gema-blanco.jpg', alt: 'Anillo FLOAT sobre fondo claro' },
  { img: 'assets/fotos/gema-perfil.jpg', alt: 'Anillo FLOAT de perfil' }
];
let verAnillo = false;   // true = lo elegido es el anillo y la foto grande es una galería; false = es una esmeralda
let fotoAnillo = 0;      // cuál foto del anillo se ve

function pintarFicha(g) {
  const s = { ...ESPECIFICACIONES_BASE, ct: g.ct || ESPECIFICACIONES_BASE.ct, alto: g.alto || ESPECIFICACIONES_BASE.alto, ancho: g.ancho || ESPECIFICACIONES_BASE.ancho, profundidad: g.profundidad || ESPECIFICACIONES_BASE.profundidad, talla: g.corte || ESPECIFICACIONES_BASE.talla };
  document.getElementById('gemTag').textContent = g.tipo === 'anillo' ? 'Anillo ya hecho · talla US ' + (listoDe(g.id) || {}).talla : 'Esmeralda ' + g.id;
  document.getElementById('gemTitle').textContent = g.nombre;
  document.getElementById('gemDesc').textContent = g.desc;
  const filas = [['Quilates', s.ct], ['Alto', s.alto], ['Ancho', s.ancho], ['Profundidad', s.profundidad], ['Corte', s.talla], ['Origen', s.origen], ['Piedra', s.tipo]];
  if (g.reporte) filas.push(['Certificado', 'ICG N.º ' + g.reporte]);
  document.getElementById('gemSpecs').innerHTML = filas.map(([k, v]) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>').join('');
  gemInfo.classList.remove('is-in'); void gemInfo.offsetWidth; gemInfo.classList.add('is-in'); // reinicia la animación
}

// Cambia la foto grande con un breve desvanecido (o directo si "directo" es true)
function ponerFoto(src, alt, directo) {
  stageImg.alt = alt || '';
  if (directo) { stageImg.src = src; return; }
  stageImg.classList.add('is-swapping');               // se desvanece...
  setTimeout(() => { stageImg.src = src; stageImg.classList.remove('is-swapping'); }, 250); // ...cambia y vuelve
}

// Elige lo que se compra: el anillo ya hecho (con su galería de fotos) o una esmeralda (foto de la piedra + ficha).
function elegirGema(g, primera) {
  gemElegida = g;
  verAnillo = g.tipo === 'anillo';
  stage.classList.toggle('is-gallery', verAnillo);
  stage.classList.remove('is-zoomed');
  gemsBox.querySelectorAll('.gem').forEach((b) => {
    const on = b.dataset.gem === g.id;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  if (gemName) gemName.textContent = g.nombre;
  if (stageMark) stageMark.textContent = 'FLOAT 01 · ' + (verAnillo ? 'Anillo ' : '') + g.nombre;
  pintarFicha(g);
  refrescarModo();
  if (verAnillo) mostrarFotoAnillo(fotoAnillo, primera);
  else if (!primera) ponerFoto(g.img, 'Esmeralda ' + g.nombre + ', ' + g.ct + ', con su certificado ICG');
}

// Cambia la foto del anillo en la galería (solo cuando el anillo está elegido)
function mostrarFotoAnillo(i, directo) {
  const n = FOTOS_ANILLO.length;
  fotoAnillo = ((i % n) + n) % n;
  stage.querySelectorAll('.stage-dots button').forEach((d, k) => d.classList.toggle('is-on', k === fotoAnillo));
  ponerFoto(FOTOS_ANILLO[fotoAnillo].img, FOTOS_ANILLO[fotoAnillo].alt, directo);
}

if (gemsBox && stage && stageImg) {
  // Una miniatura por cada ítem: primero el anillo ya hecho, luego las 4 esmeraldas
  GEMS.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'gem' + (g.tipo === 'anillo' ? ' gem--anillo' : ''); b.dataset.gem = g.id;
    b.setAttribute('aria-label', (g.tipo === 'anillo' ? 'Anillo ya hecho ' : 'Esmeralda ' + g.id + ' ') + g.nombre);
    b.innerHTML = '<img src="' + g.img + '" alt="" loading="lazy" /><span>' + g.nombre + '</span>' + (listoDe(g.id) ? '<em>Listo</em>' : '');
    b.addEventListener('click', () => elegirGema(g));
    gemsBox.appendChild(b);
  });

  // Flechas y puntos de la galería (solo se ven cuando la foto grande muestra el anillo)
  const nav = document.createElement('div');
  nav.className = 'stage-nav';
  nav.innerHTML = '<button type="button" class="stage-nav__btn stage-nav__btn--prev" aria-label="Foto anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
    '<button type="button" class="stage-nav__btn stage-nav__btn--next" aria-label="Foto siguiente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
    '<div class="stage-dots" role="group" aria-label="Fotos del anillo">' + FOTOS_ANILLO.map((_, k) => '<button type="button" aria-label="Foto ' + (k + 1) + '"></button>').join('') + '</div>';
  stage.appendChild(nav);
  // pointerdown se detiene aquí para que tocar una flecha no active el zoom de la foto
  nav.addEventListener('pointerdown', (e) => e.stopPropagation());
  nav.querySelector('.stage-nav__btn--prev').addEventListener('click', () => mostrarFotoAnillo(fotoAnillo - 1));
  nav.querySelector('.stage-nav__btn--next').addEventListener('click', () => mostrarFotoAnillo(fotoAnillo + 1));
  nav.querySelectorAll('.stage-dots button').forEach((d, k) => d.addEventListener('click', () => mostrarFotoAnillo(k)));

  // Al cargar: queda elegido el anillo ya hecho (primera foto de la galería, con su ficha)
  elegirGema(GEMS[0], true);

  // ── Deslizar con el dedo (celular) para pasar de foto del anillo ──
  let toque = null;
  stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') toque = { x: e.clientX, y: e.clientY }; });
  stage.addEventListener('pointerup', (e) => {
    if (!toque || !verAnillo) { toque = null; return; }
    const dx = e.clientX - toque.x, dy = e.clientY - toque.y; toque = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { stage.classList.remove('is-zoomed'); mostrarFotoAnillo(fotoAnillo + (dx < 0 ? 1 : -1)); }
  });
  stage.addEventListener('pointercancel', () => { toque = null; });

  // ── Zoom: con mouse, al pasar el cursor; en celular, al tocar (y arrastrar para mover) ──
  const hint = document.getElementById('zoomHint');
  const tactil = window.matchMedia('(hover: none)').matches;
  if (hint) hint.textContent = tactil ? 'Toca para acercar' : 'Pasa el cursor para acercar';
  const origen = (e) => {
    const r = stage.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100));
    const y = Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100));
    stageImg.style.transformOrigin = x + '% ' + y + '%';
  };
  stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { origen(e); stage.classList.add('is-zoomed'); } });
  stage.addEventListener('pointermove', (e) => { if (stage.classList.contains('is-zoomed')) origen(e); });
  stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') stage.classList.remove('is-zoomed'); });
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    origen(e); stage.classList.toggle('is-zoomed');
  });
  stage.addEventListener('keydown', (e) => { // teclado: Enter o espacio acerca; flechas cambian la foto del anillo
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stageImg.style.transformOrigin = '50% 50%'; stage.classList.toggle('is-zoomed'); }
    else if (verAnillo && e.key === 'ArrowRight') { e.preventDefault(); mostrarFotoAnillo(fotoAnillo + 1); }
    else if (verAnillo && e.key === 'ArrowLeft') { e.preventDefault(); mostrarFotoAnillo(fotoAnillo - 1); }
  });
}

// ── Cupón: se valida aquí mismo (el código y el precio están en CUPON, arriba) ──
function aplicarCupon() {
  estado.cupon = couponInput.value.trim().toUpperCase();
  couponInput.value = estado.cupon;
  if (!estado.cupon) { couponMsg.textContent = 'Escribe tu cupón.'; pintarPrecio(); return; }
  pintarPrecio(); mensajeCupon();
}
if (couponBtn && couponInput) {
  couponBtn.addEventListener('click', aplicarCupon);
  couponInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarCupon(); } });
}

// ── Botón "Comprar ahora" ──
// 1) exige talla  2) arma el pedido  3) lo guarda (si hay PEDIDOS_URL)
// 4) con PASARELA_LINK lleva al pago del apartado; si no, abre el chat (WhatsApp/Instagram) con el pedido escrito.
const buyBtn = document.getElementById('buyBtn');
const buyStatus = document.getElementById('buyStatus');
const tallaSel = document.getElementById('talla');
const buyBtnText = document.getElementById('buyBtnText');
// Arma el texto del pedido (esmeralda, talla, modo, precio y cupón) para WhatsApp y para la página de gracias
function armarPedido() {
  let p = 'Hola FURÁE, quiero comprar FLOAT 01 · ' + (gemElegida.tipo === 'anillo' ? 'Anillo ' + gemElegida.nombre : 'Esmeralda ' + gemElegida.id + ' ' + gemElegida.nombre) + ' · Talla ' + tallaSel.value + ' · ' + (estado.modo === 'listo' ? 'Anillo ya hecho (entrega desde 5 días hábiles)' : 'Sobre pedido (~10 días hábiles)') + ' · Envío incluido · ' + formatoCOP(precioFinal());
  if (cuponVale()) p += ' · Cupón ' + estado.cupon;
  p += estado.pagoTotal ? ' · Pago total' : ' · Apartado 50 % (' + formatoCOP(apartadoDe()) + ')';
  return p;
}
if (buyBtn && tallaSel) {
  buyBtn.addEventListener('click', async () => {
    if (!tallaSel.value) {
      buyStatus.textContent = 'Elige tu talla para continuar.';
      tallaSel.focus();
      return;
    }
    const pedido = armarPedido();
    if (PEDIDOS_URL) { // guarda el pedido sin bloquear al usuario
      try { navigator.sendBeacon(PEDIDOS_URL, new URLSearchParams({ pedido, esmeralda: gemElegida.nombre, talla: tallaSel.value, cupon: cuponVale() ? estado.cupon : '', precio: precioFinal(), modo: estado.modo })); } catch (e) {}
    }
    if (PASARELA_LINK) {
      buyStatus.textContent = 'Te llevamos al pago seguro del apartado (' + formatoCOP(apartadoDe()) + ').';
      setTimeout(() => { window.location.href = PASARELA_LINK; }, 1200);
      return;
    }
    const pago = await pedirPago(pedido);
    if (pago) {
      buyStatus.textContent = 'Te llevamos al pago seguro del apartado (' + formatoCOP(apartadoDe()) + ').';
      setTimeout(() => { window.location.href = pago; }, 900);
      return;
    }
    try { await navigator.clipboard.writeText(pedido); } catch (e) { /* sin permiso: igual va en el link de WhatsApp */ }
    buyStatus.textContent = WHATSAPP_NUMERO
      ? 'Te llevamos a WhatsApp con tu pedido ya escrito. Solo envíalo.'
      : 'Copiamos tu pedido: ' + pedido + '. Te llevamos a Instagram, pégalo y lo confirmamos.';
    setTimeout(() => { window.location.href = urlChat(pedido); }, 1400);
  });
}

// ─────────────────────────────────────────────
// 7. Animaciones: barra de progreso, letras, contadores, parallax y línea de ORIGEN
// ─────────────────────────────────────────────
// Barra de progreso de lectura (arriba)
const barra = document.createElement('div');
barra.className = 'scroll-progress';
document.body.appendChild(barra);

// Título FLOAT: cada letra entra escalonada (el texto original queda en aria-label para lectores de pantalla)
document.querySelectorAll('#float .float-title').forEach((t) => {
  const txt = t.textContent.trim();
  t.setAttribute('aria-label', txt);
  t.innerHTML = [...txt].map((ch, i) => '<span class="ch" aria-hidden="true" style="--i:' + i + '">' + ch + '</span>').join('');
  t.classList.add('split');
});

// Contadores de ORIGEN: 65M y ~55 % suben desde cero al aparecer
document.querySelectorAll('.fact-number').forEach((el) => {
  const m = el.textContent.match(/^(~?)(\d+)(.*)$/);
  if (!m || prefersReducedMotion) return;
  const [, pre, num, suf] = m;
  const meta = parseInt(num, 10);
  const io = new IntersectionObserver((es) => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    const t0 = performance.now();
    const paso = (t) => {
      const p = Math.min(1, (t - t0) / 1600);
      el.textContent = pre + Math.round(meta * (1 - Math.pow(1 - p, 3))) + suf; // frena al final (ease-out)
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }, { threshold: 0.6 });
  io.observe(el);
});

// Línea dorada de ORIGEN que se dibuja
const factGrid = document.querySelector('.fact-grid');
if (factGrid) {
  const io2 = new IntersectionObserver((es) => { if (es[0].isIntersecting) { factGrid.classList.add('is-drawn'); io2.disconnect(); } }, { threshold: 0.3 });
  io2.observe(factGrid);
}

// Reveal: la foto de la hoja aparece con un fundido de opacidad al bajar desde el video del inicio
const revealRing = document.querySelector('.reveal-ring');
if (revealRing) {
  const fundirHoja = () => {
    if (prefersReducedMotion) { revealRing.style.opacity = 1; return; }
    const r = revealRing.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight * 0.7)));
    revealRing.style.opacity = p.toFixed(3);
    revealRing.style.transform = 'scale(' + (0.95 + 0.05 * p).toFixed(4) + ')';
  };
  let fh = false;
  window.addEventListener('scroll', () => { if (!fh) { fh = true; requestAnimationFrame(() => { fundirHoja(); fh = false; }); } }, { passive: true });
  window.addEventListener('resize', fundirHoja);
  fundirHoja();
}

// Parallax: las fotos grandes se mueven más lento que el scroll
const parallaxEls = [...document.querySelectorAll('.stone-image, .body-image, .origin-video')];
parallaxEls.forEach((el) => el.setAttribute('data-parallax', ''));
let ticking = false;
function alScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  barra.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
  if (!prefersReducedMotion) {
    parallaxEls.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return; // fuera de pantalla: no calcular
      const y = (r.top + r.height / 2 - innerHeight / 2) * -0.1;
      el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) scale(1.14)';
    });
  }
  ticking = false;
}
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(alScroll); } }, { passive: true });
window.addEventListener('resize', alScroll);
alScroll();

// ─────────────────────────────────────────────
// 8. Intro, polvo de luz, precio animado, Pixel y efecto del inicio
// ─────────────────────────────────────────────
// Intro: se marca como vista para no repetirla en la misma visita; un toque la salta
const intro = document.getElementById('intro');
if (intro) {
  try { sessionStorage.setItem('furae_intro', '1'); } catch (e) {}
  // Un toque sobre el telón lo abre ya (y de paso cuenta como toque del usuario para que iPhone deje arrancar el video)
  intro.addEventListener('click', () => { if (window.furaeAbrir) window.furaeAbrir(); else document.documentElement.classList.add('intro-out'); });
}

// Video del inicio: ya no se esconde ni se desvanece (el loop viene sin costura desde el archivo y el telón de carga lo controla index.html).

// ── Botón "Pagar el apartado con tarjeta o PSE" (Mercado Pago) ──
// 1) exige talla de las que se fabrican sin confirmar (US 5 a 8)
// 2) busca el link cuyo monto coincide con el apartado (normal o con cupón)
// 3) guarda el pedido en esta pestaña para que la página de gracias lo mande por WhatsApp
// 4) lleva al pago. Si algo no cuadra, manda a WhatsApp para no cobrar un monto equivocado.
const payCardBtn = document.getElementById('payCardBtn');
if (payCardBtn) {
  const linkMp = () => MP_LINKS[montoHoy()] || '';
  if (!Object.keys(MP_LINKS).length) payCardBtn.hidden = true;
  payCardBtn.addEventListener('click', () => {
    if (!tallaSel || !tallaSel.value) {
      buyStatus.textContent = 'Elige tu talla para continuar.';
      if (tallaSel) tallaSel.focus();
      return;
    }
    const pedido = armarPedido();
    const link = linkMp();
    if (!/^US [5-8]$/.test(tallaSel.value) || !link) {
      // talla especial o monto sin link: lo confirmamos por chat antes de cobrar
      buyStatus.textContent = 'Esta opción la confirmamos por WhatsApp antes de cobrar. Te llevamos al chat.';
      setTimeout(() => { window.location.href = urlChat(pedido); }, 1400);
      return;
    }
    try { sessionStorage.setItem('furae_pedido', JSON.stringify({ pedido, ref: 'Mercado Pago', env: 'mp', apartado: apartadoDe(), total: estado.pagoTotal, monto: montoHoy() })); } catch (e) {}
    if (PEDIDOS_URL) {
      try { navigator.sendBeacon(PEDIDOS_URL, new URLSearchParams({ pedido, esmeralda: gemElegida.nombre, talla: tallaSel.value, cupon: cuponVale() ? estado.cupon : '', precio: precioFinal(), modo: estado.modo, pago: 'mercadopago' })); } catch (e) {}
    }
    pixel('InitiateCheckout');
    buyStatus.textContent = 'Te llevamos al pago seguro ' + (estado.pagoTotal ? 'de tu FLOAT' : 'del apartado') + ' (' + formatoCOP(montoHoy()) + '). Al terminar, envíanos el comprobante por WhatsApp.';
    // Se le pide al servidor un pago NUEVO con número de pedido propio (así el webhook sabe qué pedido se pagó).
    // Si el servidor no responde, se usa el link fijo de siempre: nunca se pierde una venta.
    const irAPagar = async () => {
      let destino = link;
      try {
        const r = await fetch('/.netlify/functions/crear-pedido', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ esmeralda: gemElegida.nombre, talla: tallaSel.value, cupon: cuponVale() ? estado.cupon : '', pagoTotal: estado.pagoTotal, modo: estado.modo }),
        });
        const j = await r.json();
        if (r.ok && j.url && Number(j.monto) === montoHoy()) destino = j.url; // solo si el monto coincide con lo que se mostró
      } catch (e) {}
      window.location.href = destino;
    };
    setTimeout(irAPagar, 800);
  });
}

// ── Resumen del pedido ("carrito") ──
// Se abre con "Comprar". Muestra todo lo que se va a pagar, con el envío ($35.000) incluido.
const checkout = document.getElementById('checkout');
const checkoutBtn = document.getElementById('checkoutBtn');
const ckStatus = document.getElementById('ckStatus');
function abrirResumen() {
  if (!tallaSel || !tallaSel.value) {          // sin talla no se puede armar el pedido
    if (ckStatus) ckStatus.textContent = 'Elige tu talla para continuar.';
    if (tallaSel) tallaSel.focus();
    return;
  }
  if (ckStatus) ckStatus.textContent = '';
  const set = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
  const cupon = cuponVale();
  document.getElementById('ckImg').src = gemElegida.img;
  set('ckNombre', 'FLOAT 01 · ' + (gemElegida.tipo === 'anillo' ? 'Anillo ' : 'Esmeralda ') + gemElegida.nombre);
  set('ckDetalle', 'Talla ' + tallaSel.value + ' · ' + (estado.modo === 'listo' ? 'Ya hecho, entrega desde 5 días hábiles' : 'Sobre pedido, ~10 días hábiles'));
  // precio: si hay cupón, se ve el precio normal tachado y el nuevo al lado
  document.getElementById('ckPrecio').innerHTML = cupon ? '<s>' + formatoCOP(PRECIO_FLOAT) + '</s> ' + formatoCOP(precioFinal()) : formatoCOP(precioFinal());
  document.getElementById('ckCuponFila').hidden = !cupon;
  if (cupon) set('ckCupon', estado.cupon + ' · −' + formatoCOP(PRECIO_FLOAT - precioFinal()));
  set('ckEnvio', formatoCOP(ENVIO_VALOR));
  set('ckTotal', formatoCOP(precioFinal()));
  set('ckPlanA', formatoCOP(apartadoDe()) + ' hoy, el saldo al ver tu anillo terminado');
  set('ckPlanT', formatoCOP(precioFinal()) + ' hoy, sin saldo pendiente');
  pintarPlan();
  if (buyStatus) buyStatus.textContent = '';
  checkout.hidden = false;
  document.documentElement.classList.add('has-modal');   // evita que la página de atrás se mueva
  requestAnimationFrame(() => checkout.classList.add('is-open'));
  document.getElementById('ckClose').focus();
}
// Apartar 50 % o pagar todo: cambia "Pagas hoy", el saldo y el texto de los botones
function pintarPlan() {
  const set = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
  document.querySelectorAll('input[name="ckPlan"]').forEach((r) => { r.checked = (r.value === 'total') === estado.pagoTotal; });
  set('ckHoyLabel', estado.pagoTotal ? 'Pagas hoy (todo)' : 'Pagas hoy (apartado 50 %)');
  set('ckApartado', formatoCOP(montoHoy()));
  set('ckSaldo', formatoCOP(precioFinal() - montoHoy()));
  const fila = document.getElementById('ckSaldoFila'); if (fila) fila.hidden = estado.pagoTotal;
  set('buyBtnText', estado.pagoTotal ? 'Pagar por WhatsApp' : 'Apartar por WhatsApp');
}
document.querySelectorAll('input[name="ckPlan"]').forEach((r) => r.addEventListener('change', () => {
  estado.pagoTotal = r.value === 'total' && r.checked; pintarPlan();
}));
function cerrarResumen() {
  checkout.classList.remove('is-open');
  document.documentElement.classList.remove('has-modal');
  setTimeout(() => { checkout.hidden = true; }, 250);
  if (checkoutBtn) checkoutBtn.focus();
}
if (checkout && checkoutBtn) {
  checkoutBtn.addEventListener('click', abrirResumen);
  document.getElementById('ckClose').addEventListener('click', cerrarResumen);
  checkout.addEventListener('click', (e) => { if (e.target === checkout) cerrarResumen(); }); // clic fuera del cuadro
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !checkout.hidden) cerrarResumen(); });
}

// Pixel de Meta (solo si hay ID). Eventos: ver contenido y empezar compra.
function pixel(evento) { try { if (window.fbq) window.fbq('track', evento); } catch (e) {} }
if (META_PIXEL_ID) {
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', META_PIXEL_ID); window.fbq('track', 'PageView'); pixel('ViewContent');
}
if (buyBtn) buyBtn.addEventListener('click', () => { if (tallaSel && tallaSel.value) pixel('InitiateCheckout'); });

// Polvo de luz: partículas verdes y doradas que suben despacio detrás del anillo (solo si está en pantalla)
const dust = document.getElementById('dust');
if (dust && !prefersReducedMotion) {
  const ctx = dust.getContext('2d');
  let W = 0, H = 0, visible = false, partes = [];
  const medir = () => {
    const r = dust.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1);
    W = dust.width = r.width * dpr; H = dust.height = r.height * dpr;
    partes = Array.from({ length: innerWidth < 900 ? 28 : 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: (0.6 + Math.random() * 1.8) * dpr,
      v: (0.12 + Math.random() * 0.35) * dpr, d: Math.random() * 6.28,
      c: Math.random() < 0.6 ? '111,224,174' : '200,169,122'
    }));
  };
  const dibujar = () => {
    if (!visible) return;
    ctx.clearRect(0, 0, W, H);
    partes.forEach((p) => {
      p.y -= p.v; p.d += 0.01; p.x += Math.sin(p.d) * 0.3;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      const a = 0.25 + 0.35 * Math.sin(p.d * 2);
      ctx.beginPath(); ctx.fillStyle = 'rgba(' + p.c + ',' + Math.max(0.05, a) + ')';
      ctx.shadowColor = 'rgba(' + p.c + ',.8)'; ctx.shadowBlur = 8; ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
    });
    requestAnimationFrame(dibujar);
  };
  medir(); window.addEventListener('resize', medir);
  new IntersectionObserver((es) => { const v = es[0].isIntersecting; if (v && !visible) { visible = true; dibujar(); } visible = v; }).observe(dust);
}

// El texto del inicio se aleja y se desvanece al hacer scroll
const heroInner = document.querySelector('.hero-inner');
if (heroInner && !prefersReducedMotion) {
  window.addEventListener('scroll', () => {
    const y = Math.min(scrollY, innerHeight);
    heroInner.style.transform = 'translateY(' + (y * 0.3).toFixed(1) + 'px)';
    heroInner.style.opacity = String(Math.max(0, 1 - y / (innerHeight * 0.7)));
  }, { passive: true });
}
