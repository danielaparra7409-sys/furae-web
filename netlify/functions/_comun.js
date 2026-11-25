// Código compartido por las funciones de pago de FURÁE.
// El archivo empieza con "_" para que Netlify no lo publique como una función por sí mismo.

const SITIO = 'https://furae.co';

// Manda un evento a la hoja de pedidos (Google Apps Script). Si falla, solo se anota en el registro:
// nunca debe impedir que el cliente pague.
async function aLaHoja(datos) {
  const url = process.env.SHEETS_URL;
  if (!url) return false;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain evita problemas de permisos entre sitios
      body: JSON.stringify({ ...datos, secreto: process.env.SHEETS_SECRET || '' }),
      redirect: 'follow',
    });
    return r.ok;
  } catch (e) {
    console.error('No se pudo escribir en la hoja:', e.message);
    return false;
  }
}

module.exports = { SITIO, aLaHoja };
