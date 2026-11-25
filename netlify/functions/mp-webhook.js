// Recibe el aviso de Mercado Pago cuando entra un pago.
// No confía en lo que dice el aviso: consulta el pago directo a Mercado Pago con el token
// y solo entonces actualiza la hoja de pedidos.
const { aLaHoja } = require('./_comun');

const ok = (txt) => ({ statusCode: 200, body: txt || 'ok' });

exports.handler = async (event) => {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return { statusCode: 503, body: 'sin configurar' };

  // Mercado Pago avisa de dos formas: Webhooks (cuerpo JSON) o IPN (parámetros en la URL)
  const q = event.queryStringParameters || {};
  let cuerpo = {};
  try { cuerpo = JSON.parse(event.body || '{}'); } catch (e) {}
  const tipo = cuerpo.type || q.type || q.topic || '';
  const pagoId = (cuerpo.data && cuerpo.data.id) || q['data.id'] || q.id || '';
  if (tipo !== 'payment' || !pagoId) return ok('ignorado');   // otros avisos (envíos, contracargos…) no nos interesan

  let pago;
  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(pagoId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) { console.error('No se pudo leer el pago', pagoId, r.status); return { statusCode: 502, body: 'reintentar' }; } // Mercado Pago reintenta solo
    pago = await r.json();
  } catch (e) {
    console.error('Error leyendo el pago', e.message);
    return { statusCode: 502, body: 'reintentar' };
  }

  const payer = pago.payer || {};
  const nombre = [payer.first_name, payer.last_name].filter(Boolean).join(' ');
  const tel = payer.phone ? `${payer.phone.area_code || ''}${payer.phone.number || ''}`.trim() : '';

  await aLaHoja({
    accion: 'pago',
    pedido: pago.external_reference || '',       // vacío = pago hecho con un link fijo (WhatsApp / Instagram)
    pagoId: String(pago.id),
    estadoMp: pago.status,                        // approved, pending, rejected, refunded…
    monto: pago.transaction_amount,
    medio: pago.payment_method_id || '',
    correo: payer.email || '',
    nombre, telefono: tel,
    fechaMp: pago.date_approved || pago.date_created || '',
  });
  return ok();
};
