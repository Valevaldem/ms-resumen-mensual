// lib/cuerpo.js — arma el cuerpo del correo (resumen escrito, HTML email-safe).
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const money = (x) => "$" + Math.round(x || 0).toLocaleString("es-MX");
const num = (x) => Math.round(x || 0).toLocaleString("es-MX");

export function nombreArchivoMes(anio, mes) {
  return `Resumen-MS-${MESES[mes]}-${anio}`;
}

export function construirCuerpo(resumen, { anio, mes }) {
  const asesoras = Object.entries(resumen.porAsesora).sort((a, b) => b[1].totalConIva - a[1].totalConIva);
  const canales = Object.entries(resumen.porCanal).sort((a, b) => b[1].cIva - a[1].cIva);
  const piezas = Object.entries(resumen.porTipoPieza).sort((a, b) => b[1].cIva - a[1].cIva);
  const pagos = Object.entries(resumen.formasPago).sort((a, b) => b[1].cIva - a[1].cIva);

  const fila = (label, val) =>
    `<tr><td style="padding:4px 0;color:#555;">${label}</td>
         <td style="padding:4px 0;text-align:right;font-weight:600;color:#2B2B2B;">${val}</td></tr>`;

  const seccion = (titulo) =>
    `<h3 style="margin:22px 0 8px;color:#3D5A6C;font-size:15px;border-bottom:2px solid #EDE7DD;padding-bottom:4px;">${titulo}</h3>`;

  const li = (txt) => `<div style="padding:3px 0;color:#2B2B2B;">${txt}</div>`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2B2B2B;">
  <h2 style="color:#3D5A6C;margin-bottom:2px;">📊 Resumen de ventas — ${MESES[mes]} ${anio}</h2>
  <p style="color:#888;margin-top:0;">María Salinas · cierre del mes</p>

  ${seccion("💰 Totales")}
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    ${fila("Ventas (c/IVA)", money(resumen.totalConIva))}
    ${fila("Ventas (s/IVA)", money(resumen.totalSinIva))}
    ${fila("Órdenes", num(resumen.totalOrdenes))}
    ${fila("Ticket promedio", money(resumen.ticketPromedio))}
    ${fila("Descuentos otorgados", money(resumen.descuentos.totalDescuento))}
  </table>

  ${seccion("🧾 Cuentas pendientes")}
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    ${fila("Órdenes con saldo", num(resumen.cuentasPendientes.length))}
    ${fila("Saldo total por cobrar", `<span style="color:#7A3B3B;">${money(resumen.totalPendiente)}</span>`)}
  </table>

  ${seccion("👩‍💼 Por asesora")}
  ${asesoras.map(([n, a], i) => li(`${i + 1}. <b>${n}</b> — ${num(a.ordenes)} órdenes · ${money(a.totalConIva)}`)).join("")}

  ${seccion("📲 Por canal")}
  ${li(canales.map(([c, d]) => `${c}: ${money(d.cIva)}`).join(" · "))}

  ${seccion("💍 Por tipo de pieza")}
  ${piezas.map(([t, d]) => li(`${t}: ${num(d.unidades)} pzs · ${money(d.cIva)}`)).join("")}

  ${seccion("💳 Formas de pago")}
  ${li(pagos.map(([p, d]) => `${p}: ${money(d.cIva)}`).join(" · "))}

  ${seccion("📅 Mejor día")}
  ${li(`${resumen.mejorDia.fecha || "-"} — ${money(resumen.mejorDia.monto)}`)}

  <p style="margin-top:26px;color:#888;font-size:13px;">
    El desglose completo (por asesora, canales, cuentas pendientes y más) viene en el Excel adjunto.
  </p>
</div>`;
}
