// excel.js — workbook mensual enriquecido (v3): gráficas, insights de marketing,
// pestaña de transacciones crudas, etiquetas Invoices/Piezas.
import ExcelJS from "exceljs";

const C = {
  beige: "FFF5F0E8", fila: "FFEDE7DD", borde: "FFC9C0B0", texto: "FF2B2B2B",
  azul: "FF3D5A6C", burgundy: "FF7A3B3B", verde: "FF5C7A5C",
  naranja: "FFB8763D", gris: "FF6B6B6B", burgundyClaro: "FF9C5A5A", blanco: "FFFFFFFF",
};
const FONT = "Poppins";
const MONEDA = '"$"#,##0;("$"#,##0);"-"';
const PCT = '0.0%;(0.0%);"-"';
const PZS = '#,##0;(#,##0);"-"';

const thin = { style: "thin", color: { argb: C.borde } };
const borderAll = { top: thin, left: thin, bottom: thin, right: thin };
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function sectionHeader(ws, row, text, color, span = 3) {
  ws.mergeCells(row, 1, row, span);
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  cell.font = { name: FONT, size: 11, bold: true, color: { argb: C.blanco } };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(row).height = 22;
  for (let c = 1; c <= span; c++) ws.getCell(row, c).border = borderAll;
  return row + 1;
}
function kpi(ws, row, label, value, fmt = MONEDA) {
  const a = ws.getCell(row, 1), b = ws.getCell(row, 2);
  a.value = label; b.value = value;
  a.font = { name: FONT, size: 10, color: { argb: C.texto } };
  b.font = { name: FONT, size: 10, bold: true, color: { argb: C.texto } };
  b.numFmt = fmt;
  a.fill = b.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.beige } };
  a.border = b.border = borderAll;
  a.alignment = { vertical: "middle", indent: 1 };
  b.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
  return row + 1;
}
function callout(ws, row, label, value, color) {
  ws.mergeCells(row, 1, row, 2);
  const a = ws.getCell(row, 1), b = ws.getCell(row, 3);
  a.value = label; b.value = value;
  a.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  a.font = { name: FONT, size: 10, bold: true, color: { argb: C.blanco } };
  a.alignment = { vertical: "middle", indent: 1 };
  b.font = { name: FONT, size: 11, bold: true, color: { argb: color } };
  b.alignment = { vertical: "middle", indent: 1 };
  a.border = b.border = borderAll;
  ws.getCell(row, 2).border = borderAll;
  return row + 1;
}
function tableHeader(ws, row, headers) {
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.azul } };
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: C.blanco } };
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  return row + 1;
}
function tableRow(ws, row, values, formats = []) {
  values.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = v;
    cell.font = { name: FONT, size: 10, color: { argb: C.texto } };
    cell.border = borderAll;
    if (formats[i]) cell.numFmt = formats[i];
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right", indent: 1 };
  });
  return row + 1;
}
function setWidths(ws, widths) { widths.forEach((w, i) => (ws.getColumn(i + 1).width = w)); }
const money = (x) => Math.round(x || 0);

function estatusTexto(s) {
  if (s === 2) return "Completado";
  if (s === 5) return "Poner aparte";
  return String(s);
}

function construirExcel(resumen, { anio, mes, graficas = {}, ventas = [] }) {
  const R = resumen;
  const wb = new ExcelJS.Workbook();
  wb.creator = "MS Resumen Mensual";

  // registrar imágenes de gráficas (si vinieron)
  const imgIds = {};
  for (const [k, buf] of Object.entries(graficas || {})) {
    if (buf) imgIds[k] = wb.addImage({ buffer: buf, extension: "png" });
  }

  // ============ RESUMEN ============
  const ws = wb.addWorksheet("Resumen", { views: [{ showGridLines: false }] });
  setWidths(ws, [34, 18, 16, 16, 14, 14]);
  let r = 1;
  ws.getCell(r, 1).value = "RESUMEN DE VENTAS — MARÍA SALINAS";
  ws.getCell(r, 1).font = { name: FONT, size: 14, bold: true, color: { argb: C.azul } };
  r++;
  ws.getCell(r, 1).value = `${MESES[mes]} ${anio}`;
  ws.getCell(r, 1).font = { name: FONT, size: 11, italic: true, color: { argb: C.gris } };
  r += 2;

  r = sectionHeader(ws, r, "TOTALES", C.azul);
  r = kpi(ws, r, "Ventas totales (c/IVA)", R.totalConIva);
  r = kpi(ws, r, "Ventas totales (s/IVA)", R.totalSinIva);
  r = kpi(ws, r, "Invoices", R.invoicesTotal, PZS);
  r = kpi(ws, r, "Piezas vendidas", R.piezasTotal, PZS);
  r = kpi(ws, r, "Clientes únicos", R.clientesUnicos, PZS);
  r = kpi(ws, r, "Ticket promedio (c/IVA)", R.ticketPromedio);
  r = kpi(ws, r, "Invoices completados", R.invoicesCompletadas, PZS);
  r = kpi(ws, r, "Invoices en apartado", R.invoicesApartadas, PZS);
  r += 1;

  r = sectionHeader(ws, r, "LO MÁS DESTACADO", C.verde);
  if (R.mejorCanal) r = callout(ws, r, "Canal que más vendió", `${R.mejorCanal.canal} · ${"$" + money(R.mejorCanal.cIva).toLocaleString("es-MX")}`, C.azul);
  if (R.mejorPieza) r = callout(ws, r, "Tipo de pieza top", `${R.mejorPieza[0]} · ${R.mejorPieza[1].piezas} pzs`, C.naranja);
  r = callout(ws, r, "Mejor día", `${R.mejorDia.fecha || "-"} · ${"$" + money(R.mejorDia.monto).toLocaleString("es-MX")}`, C.verde);
  if (R.top5Ventas[0]) r = callout(ws, r, "Modelo con más ventas", `${R.top5Ventas[0].nombre} · ${"$" + money(R.top5Ventas[0].cIva).toLocaleString("es-MX")}`, C.burgundy);
  r += 1;

  r = sectionHeader(ws, r, "CUENTAS PENDIENTES", C.burgundy);
  r = kpi(ws, r, "Invoices con saldo", R.cuentasPendientes.length, PZS);
  r = kpi(ws, r, "Saldo total por cobrar", R.totalPendiente);
  r += 1;

  // Gráficas (apiladas para evitar traslapes)
  r = sectionHeader(ws, r, "GRÁFICAS", C.gris);
  let gr = r + 0;
  const colocar = (id, w, h) => {
    if (!id && id !== 0) return;
    ws.addImage(id, { tl: { col: 0.1, row: gr }, ext: { width: w, height: h } });
    gr += Math.ceil(h / 20) + 1;
  };
  if (imgIds.canal != null) colocar(imgIds.canal, 420, 260);
  if (imgIds.piezas != null) colocar(imgIds.piezas, 420, 260);
  if (imgIds.topModelos != null) colocar(imgIds.topModelos, 420, 260);
  if (imgIds.dia != null) colocar(imgIds.dia, 860, 260);

  // ============ INSIGHTS MARKETING ============
  const wm = wb.addWorksheet("Insights Marketing", { views: [{ showGridLines: false }] });
  setWidths(wm, [18, 12, 16, 10, 12, 14, 20, 20]);
  let m = 1;
  wm.getCell(m, 1).value = "INSIGHTS DE MARKETING — POR CANAL";
  wm.getCell(m, 1).font = { name: FONT, size: 14, bold: true, color: { argb: C.azul } };
  m += 2;
  m = tableHeader(wm, m, ["Canal", "Invoices", "Ventas c/IVA", "% total", "Piezas", "Ticket prom.", "Mejor vendedora", "Pieza top"]);
  for (const c of R.canalInsights) {
    m = tableRow(wm, m,
      [c.canal, c.invoices, c.cIva, c.pct, c.piezas, c.ticket, `${c.mejorAsesora}`, `${c.piezaTop} (${c.piezaTopUnidades})`],
      [null, PZS, MONEDA, PCT, PZS, MONEDA, null, null]);
  }
  m += 2;

  wm.getCell(m, 1).value = "TOP 5 MODELOS — POR PIEZAS";
  wm.getCell(m, 1).font = { name: FONT, size: 12, bold: true, color: { argb: C.naranja } };
  m += 1;
  m = tableHeader(wm, m, ["Modelo", "Piezas", "Ventas c/IVA"]);
  for (const t of R.top5Piezas) m = tableRow(wm, m, [t.nombre, t.piezas, t.cIva], [null, PZS, MONEDA]);
  m += 2;

  wm.getCell(m, 1).value = "TOP 5 MODELOS — POR VENTAS ($)";
  wm.getCell(m, 1).font = { name: FONT, size: 12, bold: true, color: { argb: C.burgundy } };
  m += 1;
  m = tableHeader(wm, m, ["Modelo", "Ventas c/IVA", "Piezas"]);
  for (const t of R.top5Ventas) m = tableRow(wm, m, [t.nombre, t.cIva, t.piezas], [null, MONEDA, PZS]);

  // ============ CUENTAS PENDIENTES ============
  const wp = wb.addWorksheet("Cuentas Pendientes", { views: [{ showGridLines: false }] });
  setWidths(wp, [16, 14, 20, 16, 14, 14, 14]);
  let p = 1;
  wp.getCell(p, 1).value = "CUENTAS PENDIENTES";
  wp.getCell(p, 1).font = { name: FONT, size: 14, bold: true, color: { argb: C.burgundy } };
  p += 2;
  p = tableHeader(wp, p, ["Invoice", "Fecha", "Asesora", "Canal", "Total", "Pagado", "Saldo"]);
  for (const c of R.cuentasPendientes.sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    p = tableRow(wp, p, [c.invoice, c.fecha, c.asesora, c.canal, c.total, c.pagado, c.saldo],
      [null, null, null, null, MONEDA, MONEDA, MONEDA]);
  }
  wp.getCell(p, 4).value = "TOTAL PENDIENTE";
  wp.getCell(p, 4).font = { name: FONT, size: 10, bold: true, color: { argb: C.burgundy } };
  wp.getCell(p, 7).value = R.totalPendiente;
  wp.getCell(p, 7).numFmt = MONEDA;
  wp.getCell(p, 7).font = { name: FONT, size: 10, bold: true, color: { argb: C.burgundy } };

  // ============ POR ASESORA ============
  for (const [asesora, A] of Object.entries(R.porAsesora).sort((a, b) => b[1].cIva - a[1].cIva)) {
    const safe = asesora.replace(/[\\/?*\[\]:]/g, "").slice(0, 28) || "Asesora";
    const wa = wb.addWorksheet(safe, { views: [{ showGridLines: false }] });
    setWidths(wa, [34, 18, 16, 14]);
    let ra = 1;
    wa.getCell(ra, 1).value = asesora;
    wa.getCell(ra, 1).font = { name: FONT, size: 14, bold: true, color: { argb: C.azul } };
    ra += 2;
    ra = sectionHeader(wa, ra, "VENTAS", C.azul);
    ra = kpi(wa, ra, "Total (c/IVA)", A.cIva);
    ra = kpi(wa, ra, "Total (s/IVA)", A.cIva / 1.16);
    ra = kpi(wa, ra, "Invoices", A.invoices, PZS);
    ra = kpi(wa, ra, "Piezas", A.piezas, PZS);
    ra += 1;
    ra = sectionHeader(wa, ra, "PRODUCTOS / SERVICIOS", C.verde);
    ra = kpi(wa, ra, "Productos (c/IVA)", A.productosConIva);
    ra = kpi(wa, ra, "Servicios (c/IVA)", A.serviciosConIva);
    ra += 1;
    ra = sectionHeader(wa, ra, "ESTATUS", C.naranja);
    ra = kpi(wa, ra, "Completadas (c/IVA)", A.completadasConIva);
    ra = kpi(wa, ra, "Apartadas (c/IVA)", A.apartadasConIva);
    ra += 1;
    const top = Object.entries(A.topModelos).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) {
      ra = sectionHeader(wa, ra, "TOP MODELOS (valor)", C.burgundyClaro);
      ra = tableHeader(wa, ra, ["Modelo", "Ventas c/IVA"]);
      for (const [n, val] of top) ra = tableRow(wa, ra, [n, val], [null, MONEDA]);
      ra += 1;
    }
    if (A.apartados.length) {
      ra = sectionHeader(wa, ra, "CUENTAS PENDIENTES", C.burgundy, 4);
      ra = tableHeader(wa, ra, ["Invoice", "Total", "Pagado", "Saldo"]);
      for (const c of A.apartados) ra = tableRow(wa, ra, [c.invoice, c.total, c.pagado, c.saldo], [null, MONEDA, MONEDA, MONEDA]);
    }
  }

  // ============ TRANSACCIONES (réplica del export original de Hike, 20 columnas) ============
  const wt = wb.addWorksheet("Transacciones", { views: [{ showGridLines: false }] });
  const HEADERS = [
    "Orden #", "Fecha", "Tiempo", "Nombre del cliente", "Estatus", "Tipos de pago",
    "Total de orden", "Usuario", "Objeto", "SKU", "Quantity sold", "Ventas (impuesto inc)",
    "Ventas (Ej. impuesto)", "Descuentos de orden", "Ofertas de descuento", "Valor total de marcado",
    "Costo de compra", "Utilidad neta", "Margen %", "Precio al por menor",
  ];
  const anchosT = [12, 14, 8, 20, 14, 22, 14, 22, 34, 14, 12, 16, 16, 14, 14, 14, 14, 14, 10, 16];
  anchosT.forEach((w, i) => (wt.getColumn(i + 1).width = w));

  wt.getCell(1, 1).value = "Transacciones de venta";
  wt.getCell(1, 1).font = { name: FONT, size: 12, bold: true, color: { argb: C.azul } };
  wt.getCell(2, 1).value = `${MESES[mes]} ${anio} — María Salinas`;
  wt.getCell(2, 1).font = { name: FONT, size: 10, italic: true, color: { argb: C.gris } };

  HEADERS.forEach((h, i) => {
    const cell = wt.getCell(4, i + 1);
    cell.value = h;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.azul } };
    cell.font = { name: FONT, size: 9, bold: true, color: { argb: C.blanco } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = borderAll;
  });
  wt.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];

  const MESABBR = ["ene.","feb.","mar.","abr.","may.","jun.","jul.","ago.","sep.","oct.","nov.","dic."];
  let tr = 5;
  for (const v of ventas) {
    const dt = v.transactionDate || "";
    const dpart = dt.slice(0, 10);
    let fechaTxt = dpart;
    if (dpart) { const [Y, M, D] = dpart.split("-"); fechaTxt = `${D} ${MESABBR[(+M) - 1]}, ${Y}`; }
    const tpart = dt.slice(11, 16);
    const pagos = (v.invoicePayments || []).map((p) => p.paymentOptionName).filter(Boolean).join(", ");

    // Fila de ORDEN (columnas 1–8, como en el export de Hike)
    const ordenRow = [v.number, fechaTxt, tpart, v.customerName || "", estatusTexto(v.status), pagos, v.netAmount || 0, v.servedByName || ""];
    ordenRow.forEach((val, i) => {
      const cell = wt.getCell(tr, i + 1);
      cell.value = val;
      cell.font = { name: FONT, size: 9, bold: i === 0, color: { argb: C.texto } };
      if (i === 6) cell.numFmt = MONEDA;
    });
    if ((v.totalDiscount || 0) > 0) { wt.getCell(tr, 14).value = v.totalDiscount; wt.getCell(tr, 14).numFmt = MONEDA; }
    tr++;

    // Filas de OBJETOS / line items (columnas 9–20)
    for (const li of v.invoiceLineItems || []) {
      const inc = li.totalAmount != null ? li.totalAmount : (li.soldPrice || 0) * (li.quantity || 0);
      wt.getCell(tr, 9).value = li.title || "";
      wt.getCell(tr, 10).value = li.sku || "";
      wt.getCell(tr, 11).value = li.quantity || 0; wt.getCell(tr, 11).numFmt = PZS;
      wt.getCell(tr, 12).value = inc; wt.getCell(tr, 12).numFmt = MONEDA;
      wt.getCell(tr, 13).value = inc / 1.16; wt.getCell(tr, 13).numFmt = MONEDA;
      if (li.retailPrice) { wt.getCell(tr, 20).value = li.retailPrice; wt.getCell(tr, 20).numFmt = MONEDA; }
      for (let c = 9; c <= 20; c++) wt.getCell(tr, c).font = { name: FONT, size: 9, color: { argb: C.texto } };
      tr++;
    }
  }

  return wb;
}

export { construirExcel };
