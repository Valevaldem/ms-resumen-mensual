// excel.js — construye el workbook mensual con el estilo de la skill v2.
import ExcelJS from "exceljs";

// Paleta (ARGB)
const C = {
  beige: "FFF5F0E8", fila: "FFEDE7DD", borde: "FFC9C0B0", texto: "FF2B2B2B",
  azul: "FF3D5A6C", burgundy: "FF7A3B3B", verde: "FF5C7A5C",
  naranja: "FFB8763D", gris: "FF6B6B6B", burgundyClaro: "FF9C5A5A",
  blanco: "FFFFFFFF",
};
const FONT = "Poppins"; // fallback Arial lo pone el visor
const MONEDA = '"$"#,##0;("$"#,##0);"-"';
const PCT = "0.0%;(0.0%);\"-\"";
const UNID = "#,##0;(#,##0);\"-\"";

const thin = { style: "thin", color: { argb: C.borde } };
const borderAll = { top: thin, left: thin, bottom: thin, right: thin };

function meses(m) {
  return ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][m];
}

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

function tableHeader(ws, row, headers) {
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.fila } };
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: C.texto } };
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

function construirExcel(resumen, { anio, mes }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MS Resumen Mensual";

  // ============ HOJA: RESUMEN GENERAL ============
  const ws = wb.addWorksheet("Resumen General", { views: [{ showGridLines: false }] });
  setWidths(ws, [34, 18, 16, 16, 14, 14, 14]);
  let r = 1;
  ws.getCell(r, 1).value = "RESUMEN DE VENTAS — MARÍA SALINAS";
  ws.getCell(r, 1).font = { name: FONT, size: 14, bold: true, color: { argb: C.azul } };
  r++;
  ws.getCell(r, 1).value = `${meses(mes)} ${anio}`;
  ws.getCell(r, 1).font = { name: FONT, size: 11, italic: true, color: { argb: C.gris } };
  r += 2;

  // Totales
  r = sectionHeader(ws, r, "TOTALES GENERALES", C.azul);
  r = kpi(ws, r, "Ventas totales (c/IVA)", resumen.totalConIva);
  r = kpi(ws, r, "Ventas totales (s/IVA)", resumen.totalSinIva);
  r = kpi(ws, r, "Órdenes", resumen.totalOrdenes, UNID);
  r = kpi(ws, r, "Clientes únicos", resumen.clientesUnicos, UNID);
  r = kpi(ws, r, "Ticket promedio (c/IVA)", resumen.ticketPromedio);
  r += 1;

  // Órdenes desglosadas
  r = sectionHeader(ws, r, "ÓRDENES", C.verde);
  r = kpi(ws, r, "Completadas", resumen.ordenesCompletadas, UNID);
  r = kpi(ws, r, "Puestas aparte (apartados)", resumen.ordenesApartadas, UNID);
  r = kpi(ws, r, "Unidades de producto vendidas", resumen.unidadesProducto, UNID);
  r += 1;

  // Cuentas pendientes (resumen)
  r = sectionHeader(ws, r, "CUENTAS PENDIENTES", C.burgundy);
  r = kpi(ws, r, "Órdenes con saldo", resumen.cuentasPendientes.length, UNID);
  r = kpi(ws, r, "Saldo total por cobrar", resumen.totalPendiente);
  r += 1;

  // Por canal
  r = sectionHeader(ws, r, "VENTAS POR CANAL", C.burgundyClaro, 4);
  r = tableHeader(ws, r, ["Canal", "c/IVA", "s/IVA", "Unidades"]);
  for (const [canal, d] of Object.entries(resumen.porCanal).sort((a, b) => b[1].cIva - a[1].cIva)) {
    r = tableRow(ws, r, [canal, d.cIva, d.cIva / 1.16, d.unidades], [null, MONEDA, MONEDA, UNID]);
  }
  r += 1;

  // Por tipo de pieza
  r = sectionHeader(ws, r, "VENTAS POR TIPO DE PIEZA", C.azul, 4);
  r = tableHeader(ws, r, ["Tipo de pieza", "c/IVA", "s/IVA", "Unidades"]);
  for (const [tp, d] of Object.entries(resumen.porTipoPieza).sort((a, b) => b[1].cIva - a[1].cIva)) {
    r = tableRow(ws, r, [tp, d.cIva, d.cIva / 1.16, d.unidades], [null, MONEDA, MONEDA, UNID]);
  }
  r += 1;

  // Servicios
  if (Object.keys(resumen.servicios).length) {
    r = sectionHeader(ws, r, "SERVICIOS", C.naranja, 3);
    r = tableHeader(ws, r, ["Servicio", "c/IVA", "Unidades"]);
    for (const [s, d] of Object.entries(resumen.servicios)) {
      r = tableRow(ws, r, [s, d.cIva, d.unidades], [null, MONEDA, UNID]);
    }
    r += 1;
  }

  // Formas de pago
  r = sectionHeader(ws, r, "FORMAS DE PAGO", C.gris, 3);
  r = tableHeader(ws, r, ["Forma de pago", "Monto", "Movimientos"]);
  for (const [fp, d] of Object.entries(resumen.formasPago).sort((a, b) => b[1].cIva - a[1].cIva)) {
    r = tableRow(ws, r, [fp, d.cIva, d.num], [null, MONEDA, UNID]);
  }
  r += 1;

  // Descuentos
  r = sectionHeader(ws, r, "DESCUENTOS", C.naranja);
  r = kpi(ws, r, "Órdenes con descuento", resumen.descuentos.numOrdenes, UNID);
  r = kpi(ws, r, "Total en descuentos", resumen.descuentos.totalDescuento);
  r += 1;

  // Mejor día
  r = sectionHeader(ws, r, "MEJOR DÍA", C.verde);
  r = kpi(ws, r, "Fecha", resumen.mejorDia.fecha || "-", "@");
  r = kpi(ws, r, "Ventas del día (c/IVA)", resumen.mejorDia.monto || 0);

  // ============ HOJA: CUENTAS PENDIENTES ============
  const wp = wb.addWorksheet("Cuentas Pendientes", { views: [{ showGridLines: false }] });
  setWidths(wp, [16, 14, 20, 16, 14, 14, 14]);
  let p = 1;
  wp.getCell(p, 1).value = "CUENTAS PENDIENTES";
  wp.getCell(p, 1).font = { name: FONT, size: 14, bold: true, color: { argb: C.burgundy } };
  p += 2;
  p = tableHeader(wp, p, ["Orden #", "Fecha", "Asesora", "Canal", "Total", "Pagado", "Saldo"]);
  for (const c of resumen.cuentasPendientes.sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    p = tableRow(wp, p, [c.orden, c.fecha, c.asesora, c.canal, c.total, c.pagado, c.saldo],
      [null, null, null, null, MONEDA, MONEDA, MONEDA]);
  }
  // total
  wp.getCell(p, 4).value = "TOTAL PENDIENTE";
  wp.getCell(p, 4).font = { name: FONT, size: 10, bold: true, color: { argb: C.burgundy } };
  wp.getCell(p, 7).value = resumen.totalPendiente;
  wp.getCell(p, 7).numFmt = MONEDA;
  wp.getCell(p, 7).font = { name: FONT, size: 10, bold: true, color: { argb: C.burgundy } };

  // ============ HOJA POR ASESORA ============
  for (const [asesora, A] of Object.entries(resumen.porAsesora).sort((a, b) => b[1].totalConIva - a[1].totalConIva)) {
    const safe = asesora.replace(/[\\/?*\[\]:]/g, "").slice(0, 28) || "Asesora";
    const wa = wb.addWorksheet(safe, { views: [{ showGridLines: false }] });
    setWidths(wa, [34, 18, 16, 14]);
    let ra = 1;
    wa.getCell(ra, 1).value = asesora;
    wa.getCell(ra, 1).font = { name: FONT, size: 14, bold: true, color: { argb: C.azul } };
    ra += 2;

    ra = sectionHeader(wa, ra, "VENTAS TOTALES", C.azul);
    ra = kpi(wa, ra, "Total (c/IVA)", A.totalConIva);
    ra = kpi(wa, ra, "Total (s/IVA)", A.totalConIva / 1.16);
    ra += 1;

    ra = sectionHeader(wa, ra, "PRODUCTOS / SERVICIOS", C.verde);
    ra = kpi(wa, ra, "Productos (c/IVA)", A.productosConIva);
    ra = kpi(wa, ra, "Servicios (c/IVA)", A.serviciosConIva);
    ra = kpi(wa, ra, "Unidades de producto", A.unidadesProducto, UNID);
    ra += 1;

    ra = sectionHeader(wa, ra, "ESTATUS", C.naranja);
    ra = kpi(wa, ra, "Completadas (c/IVA)", A.completadasConIva);
    ra = kpi(wa, ra, "Apartadas (c/IVA)", A.apartadasConIva);
    ra += 1;

    // top 3 productos
    const top = Object.entries(A.topProductos).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) {
      ra = sectionHeader(wa, ra, "TOP PRODUCTOS (valor)", C.burgundyClaro);
      ra = tableHeader(wa, ra, ["Producto", "Ventas c/IVA"]);
      for (const [name, val] of top) ra = tableRow(wa, ra, [name, val], [null, MONEDA]);
      ra += 1;
    }

    // apartados de la asesora
    if (A.apartados.length) {
      ra = sectionHeader(wa, ra, "CUENTAS PENDIENTES", C.burgundy, 4);
      ra = tableHeader(wa, ra, ["Orden #", "Total", "Pagado", "Saldo"]);
      for (const c of A.apartados) ra = tableRow(wa, ra, [c.orden, c.total, c.pagado, c.saldo], [null, MONEDA, MONEDA, MONEDA]);
    }
  }

  return wb;
}

export { construirExcel };
