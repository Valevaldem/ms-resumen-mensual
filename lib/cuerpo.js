// lib/cuerpo.js — cuerpo del correo (resumen escrito) v3, con gráficas de QuickChart.
import { configuraciones } from "./graficas.js";

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const money = (x) => "$" + Math.round(x || 0).toLocaleString("es-MX");
const num = (x) => Math.round(x || 0).toLocaleString("es-MX");

export function nombreArchivoMes(anio, mes) {
  return `Resumen-MS-${MESES[mes]}-${anio}`;
}

function chartImg(config, w, h) {
  const url = "https://quickchart.io/chart?w=" + w + "&h=" + h +
    "&bkg=white&c=" + encodeURIComponent(JSON.stringify(config));
  return `<img src="${url}" width="${w}" height="${h}" style="max-width:100%;margin:8px 0;border:1px solid #EDE7DD;border-radius:6px;" alt="gráfica"/>`;
}

export function construirCuerpo(R, { anio, mes }) {
  const asesoras = Object.entries(R.porAsesora).sort((a, b) => b[1].cIva - a[1].cIva);
  const cfg = configuraciones(R);

  const seccion = (t) => `<h3 style="margin:22px 0 8px;color:#3D5A6C;font-size:15px;border-bottom:2px solid #EDE7DD;padding-bottom:4px;">${t}</h3>`;
  const li = (txt) => `<div style="padding:3px 0;color:#2B2B2B;">${txt}</div>`;
  const fila = (l, v) => `<tr><td style="padding:4px 0;color:#555;">${l}</td><td style="padding:4px 0;text-align:right;font-weight:600;">${v}</td></tr>`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#2B2B2B;">
  <h2 style="color:#3D5A6C;margin-bottom:2px;">📊 Resumen de ventas — ${MESES[mes]} ${anio}</h2>
  <p style="color:#888;margin-top:0;">María Salinas · cierre del mes</p>

  ${seccion("💰 Totales")}
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    ${fila("Ventas (c/IVA)", money(R.totalConIva))}
    ${fila("Ventas (s/IVA)", money(R.totalSinIva))}
    ${fila("Invoices", num(R.invoicesTotal))}
    ${fila("Piezas vendidas", num(R.piezasTotal))}
    ${fila("Ticket promedio", money(R.ticketPromedio))}
    ${fila("Cuentas pendientes", `<span style="color:#7A3B3B;">${money(R.totalPendiente)}</span> (${num(R.cuentasPendientes.length)} invoices)`)}
  </table>

  ${seccion("🏆 Lo más destacado")}
  ${R.mejorCanal ? li(`<b>Canal top:</b> ${R.mejorCanal.canal} — ${money(R.mejorCanal.cIva)} · mejor vendedora: ${R.mejorCanal.mejorAsesora}`) : ""}
  ${R.mejorPieza ? li(`<b>Pieza top:</b> ${R.mejorPieza[0]} — ${num(R.mejorPieza[1].piezas)} pzs`) : ""}
  ${R.top5Ventas[0] ? li(`<b>Modelo con más ventas:</b> ${R.top5Ventas[0].nombre} — ${money(R.top5Ventas[0].cIva)}`) : ""}
  ${li(`<b>Mejor día:</b> ${R.mejorDia.fecha || "-"} — ${money(R.mejorDia.monto)}`)}

  ${seccion("📲 Ventas por canal")}
  ${chartImg(cfg.canal, 500, 280)}

  ${seccion("💍 Piezas por tipo")}
  ${chartImg(cfg.piezas, 500, 280)}

  ${seccion("👩‍💼 Por asesora")}
  ${asesoras.map(([n, a], i) => li(`${i + 1}. <b>${n}</b> — ${num(a.invoices)} invoices · ${money(a.cIva)}`)).join("")}

  <p style="margin-top:26px;color:#888;font-size:13px;">
    El desglose completo (insights por canal, top modelos, cuentas pendientes, transacciones y pestaña por asesora) viene en el Excel adjunto.
  </p>
</div>`;
}
