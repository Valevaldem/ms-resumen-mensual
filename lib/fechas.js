// lib/fechas.js — calcula el rango del mes (en hora de Monterrey, UTC-6, sin horario de verano).
const OFFSET = "-06:00";

export function rangoDeMes(anio, mes /* 0-11 */) {
  const pad = (n) => String(n).padStart(2, "0");
  const ultimoDiaNum = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return {
    anio,
    mes,
    desdeISO: `${anio}-${pad(mes + 1)}-01T00:00:00${OFFSET}`,
    hastaISO: `${anio}-${pad(mes + 1)}-${pad(ultimoDiaNum)}T23:59:59${OFFSET}`,
  };
}

// El mes que acaba de cerrar, relativo a "ahora" en hora de Monterrey.
export function rangoMesAnterior(ref = new Date()) {
  const local = new Date(ref.getTime() - 6 * 3600 * 1000); // a hora local Monterrey
  let y = local.getUTCFullYear();
  let m = local.getUTCMonth() - 1; // mes anterior
  if (m < 0) { m = 11; y -= 1; }
  return rangoDeMes(y, m);
}
