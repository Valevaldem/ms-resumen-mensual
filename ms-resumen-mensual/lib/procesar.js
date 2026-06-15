// procesar.js — convierte las ventas crudas de la API de Hike en un resumen estructurado.
// Refleja las reglas de la skill "resumen-de-ventas-mensual-v2".

const IVA = 0.16;

// --- helpers de clasificación ---
function esCanal(li) {
  return (li.title || "").trim().toLowerCase().startsWith("canal");
}
function canalNormalizado(li) {
  // "Canal / Whatsapp" -> "Whatsapp" ; "CANAL- Tienda" -> "Tienda"
  return (li.title || "").replace(/^canal\s*[\/\-]?\s*/i, "").trim() || "Sin canal";
}
function tipoServicio(li) {
  const t = (li.title || "").toLowerCase();
  if (t.includes("envío") || t.includes("envio")) return "Envíos";
  if (t.includes("mantenimiento")) return "Mantenimientos";
  if (t.includes("reparación") || t.includes("reparacion")) return "Reparaciones";
  if (t.includes("garantía") || t.includes("garantia")) return "Garantías";
  return null;
}
function tipoPieza(li) {
  const t = (li.title || "").toLowerCase();
  if (t.includes("anillo")) return "Anillos";
  if (t.includes("pulsera") || t.includes("brazalete")) return "Pulseras/Brazaletes";
  if (t.includes("collar") || t.includes("cadena")) return "Collares/Cadenas";
  if (t.includes("arete") || t.includes("stud") || t.includes("arracada") || t.includes("piercing"))
    return "Aretes/Studs/Arracadas";
  return "Otros productos";
}
// Producto = no es servicio ni marker de canal
function esProducto(li) {
  return !esCanal(li) && tipoServicio(li) === null;
}

function procesar(ventas) {
  const completadas = []; // status 2
  const apartados = [];   // status 5

  const resumen = {
    totalOrdenes: 0,
    totalConIva: 0,
    totalSinIva: 0,
    clientesUnicos: new Set(),
    ticketPromedio: 0,
    porAsesora: {},
    porCanal: {},
    porTipoPieza: {},
    servicios: {},        // tipo -> {cIva, unidades}
    formasPago: {},       // nombre -> {cIva, num}
    descuentos: { numOrdenes: 0, totalDescuento: 0, detalle: [] },
    cuentasPendientes: [],// {orden, fecha, asesora, canal, total, pagado, saldo}
    porDia: {},
    unidadesProducto: 0,
    ordenesCompletadas: 0,
    ordenesApartadas: 0,
  };

  for (const v of ventas) {
    const neto = v.netAmount || 0;
    const pagado = v.totalPaid || 0;
    const saldo = Math.round((neto - pagado) * 100) / 100;
    const asesora = v.servedByName || "Sin asignar";
    const fecha = (v.transactionDate || "").slice(0, 10);
    const completada = v.status === 2;

    resumen.totalOrdenes++;
    resumen.totalConIva += neto;
    if (v.customerId != null) resumen.clientesUnicos.add(v.customerId);
    if (completada) resumen.ordenesCompletadas++; else resumen.ordenesApartadas++;
    resumen.porDia[fecha] = (resumen.porDia[fecha] || 0) + neto;

    // canal de la orden (del marker dentro de los line items)
    let canal = "Sin canal";
    for (const li of v.invoiceLineItems || []) {
      if (esCanal(li)) { canal = canalNormalizado(li); break; }
    }

    // por asesora
    const A = (resumen.porAsesora[asesora] = resumen.porAsesora[asesora] || {
      ordenes: 0, totalConIva: 0, productosConIva: 0, serviciosConIva: 0,
      unidadesProducto: 0, completadasConIva: 0, apartadasConIva: 0,
      porCanal: {}, topProductos: {}, apartados: [],
    });
    A.ordenes++; A.totalConIva += neto;
    if (completada) A.completadasConIva += neto; else A.apartadasConIva += neto;

    // ventas por canal (total de la orden, solo lo que NO es servicio)
    const C = (resumen.porCanal[canal] = resumen.porCanal[canal] || { cIva: 0, unidades: 0 });
    A.porCanal[canal] = A.porCanal[canal] || { cIva: 0, unidades: 0 };

    // formas de pago
    for (const p of v.invoicePayments || []) {
      const nombre = p.paymentOptionName || "Otro";
      const F = (resumen.formasPago[nombre] = resumen.formasPago[nombre] || { cIva: 0, num: 0 });
      F.cIva += p.amount || 0; F.num++;
    }

    // descuentos a nivel orden
    if ((v.totalDiscount || 0) > 0) {
      resumen.descuentos.numOrdenes++;
      resumen.descuentos.totalDescuento += v.totalDiscount;
    }

    // line items: piezas / servicios
    let ordenTieneProducto = false;
    for (const li of v.invoiceLineItems || []) {
      if (esCanal(li)) continue;
      const precio = li.soldPrice || 0;
      const qty = li.quantity || 0;
      const serv = tipoServicio(li);
      if (serv) {
        const S = (resumen.servicios[serv] = resumen.servicios[serv] || { cIva: 0, unidades: 0 });
        S.cIva += precio; S.unidades += qty;
        A.serviciosConIva += precio;
      } else {
        // producto
        ordenTieneProducto = true;
        const tp = tipoPieza(li);
        const T = (resumen.porTipoPieza[tp] = resumen.porTipoPieza[tp] || { cIva: 0, unidades: 0 });
        T.cIva += precio; T.unidades += qty;
        resumen.unidadesProducto += qty;
        A.productosConIva += precio; A.unidadesProducto += qty;
        A.topProductos[li.title] = (A.topProductos[li.title] || 0) + precio;
        C.unidades += qty; A.porCanal[canal].unidades += qty;
      }
    }
    // ventas por canal usan el total de la orden si tiene producto
    if (ordenTieneProducto) { C.cIva += neto; A.porCanal[canal].cIva += neto; }

    // cuentas pendientes
    if (saldo > 0) {
      const cp = { orden: v.number, fecha, asesora, canal, total: neto, pagado, saldo };
      resumen.cuentasPendientes.push(cp);
      A.apartados.push(cp);
    }
  }

  resumen.totalSinIva = resumen.totalConIva / (1 + IVA);
  resumen.ticketPromedio = resumen.totalOrdenes ? resumen.totalConIva / resumen.totalOrdenes : 0;
  resumen.clientesUnicos = resumen.clientesUnicos.size;

  // mejor día
  let mejorDia = null, mejorMonto = -1;
  for (const [d, m] of Object.entries(resumen.porDia)) {
    if (m > mejorMonto) { mejorMonto = m; mejorDia = d; }
  }
  resumen.mejorDia = { fecha: mejorDia, monto: mejorMonto };

  resumen.totalPendiente = resumen.cuentasPendientes.reduce((s, c) => s + c.saldo, 0);
  return resumen;
}

export { procesar, IVA };
