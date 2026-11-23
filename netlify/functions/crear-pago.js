// FURÁE · crea el link de pago de Wompi para el APARTADO de un anillo FLOAT.
// Corre en el servidor de Netlify (no en el navegador): por eso aquí viven las llaves y se decide el precio.
// Variables de entorno (Netlify → Site configuration → Environment variables):
//   WOMPI_PUBLIC_KEY        llave pública      (pub_test_...  en pruebas, pub_prod_... en real)
//   WOMPI_INTEGRITY_SECRET  secreto de integridad (test_integrity_... / prod_integrity_...)
//   SITE_URL                (opcional) dirección del sitio; si no está, se usa la que Netlify da en URL.
// Si faltan las llaves responde 503 y el sitio sigue funcionando por WhatsApp.
const crypto = require('crypto');

// ★ Precios y reglas: deben coincidir con script.js (la verdad del precio vive aquí) ★
const PRECIO = 1240000;
const PRECIO_CUPON = 1083000;
const PORCENTAJE_APARTADO = 0.5;
const CUPON = 'FURAVIDAD';
const CUPON_HASTA = '2026-12-01T23:59:59-05:00';   // sobre medida con cupón: hasta esta fecha (ya hechos: siempre)
const ESMERALDAS = ['01', '02', '03', '04'];
const TALLAS = ['US 5', 'US 6', 'US 7', 'US 8'];
const LISTOS = [{ gem: '01', talla: 'US 7' }];     // anillos ya hechos

const resp = (code, obj) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj)
});

// Firma de integridad de Wompi: SHA256( referencia + monto en centavos + moneda + secreto )
const firmar = (referencia, centavos, secreto) =>
  crypto.createHash('sha256').update(String(referencia) + String(centavos) + 'COP' + secreto).digest('hex');

exports.firmar = firmar;
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'metodo' });
  const pub = process.env.WOMPI_PUBLIC_KEY;
  const secreto = process.env.WOMPI_INTEGRITY_SECRET;
  if (!pub || !secreto) return resp(503, { error: 'sin_configurar' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { return resp(400, { error: 'json' }); }
  const gem = String(b.gem || '');
  const talla = String(b.talla || '');
  const modo = b.modo === 'listo' ? 'listo' : 'pedido';
  const cupon = String(b.cupon || '').trim().toUpperCase();
  if (!ESMERALDAS.includes(gem) || !TALLAS.includes(talla)) return resp(400, { error: 'datos' });
  if (modo === 'listo' && !LISTOS.some((l) => l.gem === gem && l.talla === talla)) return resp(400, { error: 'no_hay_listo' });

  // El cupón se valida aquí: ya hechos siempre; sobre medida hasta la fecha
  const cuponOk = cupon === CUPON && (modo === 'listo' || Date.now() <= Date.parse(CUPON_HASTA));
  const total = cuponOk ? PRECIO_CUPON : PRECIO;
  const apartado = Math.round(total * PORCENTAJE_APARTADO);
  const centavos = apartado * 100;

  // Referencia única y legible: aparece en tu panel de Wompi (esmeralda, talla, modo, cupón)
  const ref = 'FURAE-' + gem + '-' + talla.replace(/\W/g, '') + '-' + (modo === 'listo' ? 'L' : 'P') + (cuponOk ? 'C' : '') + '-' + Date.now().toString(36);
  const sitio = (process.env.SITE_URL || process.env.URL || 'https://furae-co.netlify.app').replace(/\/$/, '');

  const q = new URLSearchParams({
    'public-key': pub,
    currency: 'COP',
    'amount-in-cents': String(centavos),
    reference: ref,
    'signature:integrity': firmar(ref, centavos, secreto),
    'redirect-url': sitio + '/gracias.html',
    'collect-shipping': 'true'
  });
  return resp(200, {
    url: 'https://checkout.wompi.co/p/?' + q.toString(),
    referencia: ref,
    apartado,
    total,
    env: pub.indexOf('pub_test_') === 0 ? 'test' : 'prod'
  });
};
