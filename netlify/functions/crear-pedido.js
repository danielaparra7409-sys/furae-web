// Crea un pedido y su pago en Mercado Pago (Checkout Pro).
// El navegador solo manda qué eligió el cliente; los PRECIOS se calculan aquí, en el servidor,
// para que nadie pueda cambiarlos desde la página.
const { SITIO, aLaHoja } = require('./_comun');

const PRECIO = 1240000;        // precio normal de FLOAT
const PRECIO_CUPON = 1083000;  // precio con el cupón FURAVIDAD
const CUPON = 'FURAVIDAD';
const PORCENTAJE_APARTADO = 0.5;

const resp = (codigo, cuerpo) => ({
  statusCode: codigo,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(cuerpo),
});

// Número de pedido legible y casi imposible de repetir, por ejemplo FUR-251125-K3QZ
function nuevoId() {
  const d = new Date(Date.now() - 5 * 3600 * 1000); // hora de Colombia (UTC-5)
  const f = d.toISOString().slice(2, 10).replace(/-/g, '');
  const azar = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FUR-${f}-${azar}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Método no permitido' });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return resp(503, { error: 'Pagos no configurados' });

  let p;
  try { p = JSON.parse(event.body || '{}'); } catch (e) { return resp(400, { error: 'Datos inválidos' }); }

  // Validación de lo que llega del navegador
  const talla = String(p.talla || '');
  if (!/^US [5-8]$/.test(talla)) return resp(400, { error: 'Talla no válida para pago en línea' });
  const esmeralda = String(p.esmeralda || '').replace(/[^\p{L}\p{N} ·-]/gu, '').slice(0, 30);
  const modo = p.modo === 'listo' ? 'Ya hecho' : 'Sobre pedido';
  // El cupón vale hasta el 1 de diciembre (hora Colombia) en pedidos sobre pedido; en anillos ya hechos no vence.
  // Se revisa aquí en el servidor porque la revisión de la página se puede saltar.
  const cuponVigente = modo === 'Ya hecho' || Date.now() <= Date.parse('2026-12-01T23:59:59-05:00');
  const conCupon = String(p.cupon || '').toUpperCase() === CUPON && cuponVigente;
  const pagoTotal = p.pagoTotal === true;

  // Precios calculados en el servidor
  const total = conCupon ? PRECIO_CUPON : PRECIO;
  const hoy = pagoTotal ? total : Math.round(total * PORCENTAJE_APARTADO);
  const id = nuevoId();
  const plan = pagoTotal ? 'Pago completo' : 'Apartado 50 %';

  // Pago en Mercado Pago
  const preferencia = {
    items: [{
      id: 'FLOAT-01',
      title: `Anillo FLOAT de FURÁE · ${plan}`,
      description: `Esmeralda ${esmeralda} · ${talla} · ${modo}`,
      quantity: 1,
      currency_id: 'COP',
      unit_price: hoy,
    }],
    external_reference: id,                                    // con esto el aviso de pago sabe a qué pedido pertenece
    notification_url: `${SITIO}/.netlify/functions/mp-webhook`, // Mercado Pago avisa aquí cuando hay un pago
    back_urls: {
      success: `${SITIO}/gracias.html?pedido=${id}`,
      pending: `${SITIO}/gracias.html?pedido=${id}`,
      failure: `${SITIO}/?pago=fallido#access`,
    },
    auto_return: 'approved',
    statement_descriptor: 'FURAE',
    payment_methods: { installments: 12 },
    metadata: { pedido: id, esmeralda, talla, modo, plan, cupon: conCupon ? CUPON : '', total },
  };

  let mp;
  try {
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(preferencia),
    });
    mp = await r.json();
    if (!r.ok || !mp.init_point) {
      console.error('Mercado Pago rechazó la preferencia:', r.status, JSON.stringify(mp).slice(0, 500));
      return resp(502, { error: 'No se pudo crear el pago' });
    }
  } catch (e) {
    console.error('Error llamando a Mercado Pago:', e.message);
    return resp(502, { error: 'No se pudo crear el pago' });
  }

  // Guarda el pedido en la hoja con estado "Pendiente de pago" (se actualiza solo cuando llega el pago)
  await aLaHoja({
    accion: 'crear', pedido: id, origen: 'Sitio web', esmeralda, talla, modo,
    cupon: conCupon ? CUPON : '', plan, total, hoy, preferencia: mp.id,
  });

  return resp(200, { id, url: mp.init_point, monto: hoy });
};
