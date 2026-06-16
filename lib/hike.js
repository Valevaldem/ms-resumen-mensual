import { neon } from "@neondatabase/serverless";

const TOKEN_URL = "https://api.hikeup.com/oauth/token";
const SALES_URL = "https://api.hikeup.com/api/v1/sales/get_all";

// Conexión perezosa: se crea solo al usarse (en ejecución), no al construir.
let _neon;
function sql(strings, ...values) {
  if (!_neon) {
    if (!process.env.DATABASE_URL) throw new Error("Falta la variable DATABASE_URL");
    _neon = neon(process.env.DATABASE_URL);
  }
  return _neon(strings, ...values);
}

async function leerRefreshToken() {
  const rows = await sql`SELECT refresh_token FROM hike_tokens ORDER BY id DESC LIMIT 1`;
  if (rows.length && rows[0].refresh_token) return rows[0].refresh_token;
  if (process.env.HIKE_INITIAL_REFRESH_TOKEN) {
    await sql`INSERT INTO hike_tokens (refresh_token) VALUES (${process.env.HIKE_INITIAL_REFRESH_TOKEN})`;
    return process.env.HIKE_INITIAL_REFRESH_TOKEN;
  }
  throw new Error("No hay refresh_token en la base ni en HIKE_INITIAL_REFRESH_TOKEN.");
}

async function guardarTokens({ refresh_token, access_token, expires_in }) {
  const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;
  await sql`INSERT INTO hike_tokens (refresh_token, access_token, expires_at)
            VALUES (${refresh_token}, ${access_token}, ${expiresAt})`;
}

export async function obtenerAccessToken() {
  const refresh = await leerRefreshToken();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refresh,
    client_id: process.env.HIKE_CLIENT_ID,
    client_secret: process.env.HIKE_CLIENT_SECRET,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Refresh del token falló (${res.status}): ${text}`);
  const data = JSON.parse(text);
  await guardarTokens({
    refresh_token: data.refresh_token || refresh,
    access_token: data.access_token,
    expires_in: data.expires_in,
  });
  return data.access_token;
}

export async function obtenerVentas(token, desdeISO, hastaISO) {
  const pageSize = 100;
  let skip = 0, items = [], total = Infinity;
  while (skip < total) {
    const url = `${SALES_URL}?page_size=${pageSize}&skip_count=${skip}`
      + `&invoice_range_from=${encodeURIComponent(desdeISO)}`
      + `&invoice_range_to=${encodeURIComponent(hastaISO)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Descarga de ventas falló (${res.status}): ${await res.text()}`);
    const data = await res.json();
    total = data.totalCount ?? (data.items || []).length;
    const lote = data.items || [];
    items = items.concat(lote);
    if (lote.length === 0 || items.length >= total) break;
    skip += pageSize;
  }
  return items;
}
