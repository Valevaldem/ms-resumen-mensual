// procesar.js — convierte las ventas de la API de Hike en un resumen enriquecido.
// v3: invoices/piezas, insights por canal, top modelos, mejor vendedora por canal.

const IVA = 0.16;

function esCanal(li) {
  return (li.title || "").trim().toLowerCase().startsWith("canal");
}
function canalNormalizado(li) {
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
  if (t.includes("collar") || t.includes("cadena") || t.includes("dije") || t.includes("gargantilla")) return "Collares/Cadenas";
  if (t.includes("arete") || t.includes("stud") || t.includes("arracada") || t.includes("piercing") || t.includes("broquel")) return "Aretes/Studs/Arracadas";
  return "Otros productos";
}
// Nombre de modelo "limpio" para agrupar (quita [stock], (...), tallas, espacios repetidos)
function normalizarModelo(title) {
  let t = (title || "").trim();
  t = t.replace(/\[[^\]]*\]/g, "");
  t = t.replace(/\([^)]*\)/g, "");
  t = t.replace(/\s+/g, " ").trim();
  return t || "Sin nombre";
}

function nuevoCanal() {
  return { invoices: 0, cIva: 0, piezas: 0, porAsesora: {}, porTipoPieza: {} };
}

function procesar(ventas) {
  const R = {
    invoicesTotal: 0,
    totalConIva: 0,
    totalSinIva: 0,
    piezasTotal: 0,
    clientesUnicos: new Set(),
    ticketPromedio: 0,
    invoicesCompletadas: 0,
    invoicesApartadas: 0,
    porAsesora: {},
    porCanal: {},
    porTipoPieza: {},
    modelos: {},          // nombre -> {piezas, cIva}
    servicios: {},
    formasPago: {},
    descuentos: { numInvoices: 0, totalDescuento: 0 },
    cuentasPendientes: [],
    porDia: {},
  };

  for (const v of ventas) {
    const neto = v.netAmount || 0;
    const pagado = v.totalPaid || 0;
    const saldo = Math.round((neto - pagado) * 100) / 100;
    const asesora = v.servedByName || "Sin asignar";
    const fecha = (v.transactionDate || "").slice(0, 10);
    const completada = v.status === 2;

    R.invoicesTotal++;
    R.totalConIva += neto;
    if (v.customerId != null) R.clientesUnicos.add(v.customerId);
    if (completada) R.invoicesCompletadas++; else R.invoicesApartadas++;
    R.porDia[fecha] = (R.porDia[fecha] || 0) + neto;

    let canal = "Sin canal";
    for (const li of v.invoiceLineItems || []) {
      if (esCanal(li)) { canal = canalNormalizado(li); break; }
    }

    const A = (R.porAsesora[asesora] = R.porAsesora[asesora] || {
      invoices: 0, cIva: 0, piezas: 0, productosConIva: 0, serviciosConIva: 0,
      completadasConIva: 0, apartadasConIva: 0, porCanal: {}, topModelos: {}, apartados: [],
    });
    A.invoices++; A.cIva += neto;
    if (completada) A.completadasConIva += neto; else A.apartadasConIva += neto;

    const C = (R.porCanal[canal] = R.porCanal[canal] || nuevoCanal());
    C.invoices++; C.cIva += neto;
    C.porAsesora[asesora] = (C.porAsesora[asesora] || 0) + neto;
    A.porCanal[canal] = (A.porCanal[canal] || 0) + neto;

    for (const p of v.invoicePayments || []) {
      const n = p.paymentOptionName || "Otro";
      const F = (R.formasPago[n] = R.formasPago[n] || { cIva: 0, num: 0 });
      F.cIva += p.amount || 0; F.num++;
    }
    if ((v.totalDiscount || 0) > 0) {
      R.descuentos.numInvoices++;
      R.descuentos.totalDescuento += v.totalDiscount;
    }

    for (const li of v.invoiceLineItems || []) {
      if (esCanal(li)) continue;
      const precio = li.soldPrice || 0;
      const qty = li.quantity || 0;
      const serv = tipoServicio(li);
      if (serv) {
        const S = (R.servicios[serv] = R.servicios[serv] || { cIva: 0, piezas: 0 });
        S.cIva += precio; S.piezas += qty;
        A.serviciosConIva += precio;
      } else {
        const tp = tipoPieza(li);
        const T = (R.porTipoPieza[tp] = R.porTipoPieza[tp] || { cIva: 0, piezas: 0 });
        T.cIva += precio; T.piezas += qty;
        R.piezasTotal += qty;
        A.productosConIva += precio; A.piezas += qty;

        C.piezas += qty;
        C.porTipoPieza[tp] = (C.porTipoPieza[tp] || 0) + qty;

        const modelo = normalizarModelo(li.title);
        const M = (R.modelos[modelo] = R.modelos[modelo] || { piezas: 0, cIva: 0 });
        M.piezas += qty; M.cIva += precio;
        A.topModelos[modelo] = (A.topModelos[modelo] || 0) + precio;
      }
    }

    if (saldo > 0) {
      const cp = { invoice: v.number, fecha, asesora, canal, total: neto, pagado, saldo };
      R.cuentasPendientes.push(cp);
      A.apartados.push(cp);
    }
  }

  R.totalSinIva = R.totalConIva / (1 + IVA);
  R.ticketPromedio = R.invoicesTotal ? R.totalConIva / R.invoicesTotal : 0;
  R.clientesUnicos = R.clientesUnicos.size;

  // mejor día
  let md = null, mm = -1;
  for (const [d, m] of Object.entries(R.porDia)) if (m > mm) { mm = m; md = d; }
  R.mejorDia = { fecha: md, monto: mm };

  R.totalPendiente = R.cuentasPendientes.reduce((s, c) => s + c.saldo, 0);

  // --- INSIGHTS derivados ---
  // Por canal: ticket, mejor asesora, pieza top, % del total
  R.canalInsights = Object.entries(R.porCanal).map(([canal, c]) => {
    const mejorAsesora = Object.entries(c.porAsesora).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
    const piezaTop = Object.entries(c.porTipoPieza).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
    return {
      canal,
      invoices: c.invoices,
      cIva: c.cIva,
      pct: R.totalConIva ? c.cIva / R.totalConIva : 0,
      piezas: c.piezas,
      ticket: c.invoices ? c.cIva / c.invoices : 0,
      mejorAsesora: mejorAsesora[0],
      mejorAsesoraMonto: mejorAsesora[1],
      piezaTop: piezaTop[0],
      piezaTopUnidades: piezaTop[1],
    };
  }).sort((a, b) => b.cIva - a.cIva);

  R.top5Piezas = Object.entries(R.modelos)
    .sort((a, b) => b[1].piezas - a[1].piezas).slice(0, 5)
    .map(([nombre, m]) => ({ nombre, piezas: m.piezas, cIva: m.cIva }));
  R.top5Ventas = Object.entries(R.modelos)
    .sort((a, b) => b[1].cIva - a[1].cIva).slice(0, 5)
    .map(([nombre, m]) => ({ nombre, piezas: m.piezas, cIva: m.cIva }));

  R.mejorCanal = R.canalInsights[0] || null;
  R.mejorPieza = Object.entries(R.porTipoPieza).sort((a, b) => b[1].piezas - a[1].piezas)[0] || null;

  return R;
}

export { procesar, IVA, normalizarModelo, tipoPieza };
