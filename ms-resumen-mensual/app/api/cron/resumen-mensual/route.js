// app/api/cron/resumen-mensual/route.js
// Orquesta: token -> ventas del mes -> procesa -> Excel -> correo.
// Lo dispara Vercel Cron el día 1, o tú a mano con ?secret=...&month=YYYY-MM&dryrun=1
import { obtenerAccessToken, obtenerVentas } from "../../../../lib/hike.js";
import { procesar } from "../../../../lib/procesar.js";
import { construirExcel } from "../../../../lib/excel.js";
import { construirCuerpo, nombreArchivoMes } from "../../../../lib/cuerpo.js";
import { enviarCorreo } from "../../../../lib/email.js";
import { rangoMesAnterior, rangoDeMes } from "../../../../lib/fechas.js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

export async function GET(request) {
  const url = new URL(request.url);
  const auth = request.headers.get("authorization");
  const secretQ = url.searchParams.get("secret");
  const autorizado =
    auth === `Bearer ${process.env.CRON_SECRET}` || secretQ === process.env.CRON_SECRET;
  if (!autorizado) return new Response("No autorizado", { status: 401 });

  try {
    // Rango: por defecto el mes que cerró; ?month=YYYY-MM para pruebas de un mes específico.
    const monthParam = url.searchParams.get("month");
    let rango;
    if (monthParam) {
      const [y, m] = monthParam.split("-").map(Number);
      rango = rangoDeMes(y, m - 1);
    } else {
      rango = rangoMesAnterior();
    }
    const dryrun = url.searchParams.get("dryrun") === "1";

    const token = await obtenerAccessToken();
    const ventas = await obtenerVentas(token, rango.desdeISO, rango.hastaISO);
    const resumen = procesar(ventas);

    // Modo prueba: NO manda correo, solo regresa los números para revisar.
    if (dryrun) {
      return Response.json({
        ok: true,
        dryrun: true,
        rango: { desde: rango.desdeISO, hasta: rango.hastaISO },
        totalConIva: resumen.totalConIva,
        ordenes: resumen.totalOrdenes,
        pendiente: resumen.totalPendiente,
        asesoras: Object.keys(resumen.porAsesora),
      });
    }

    const wb = construirExcel(resumen, { anio: rango.anio, mes: rango.mes });
    const xlsxBuffer = Buffer.from(await wb.xlsx.writeBuffer());
    const html = construirCuerpo(resumen, { anio: rango.anio, mes: rango.mes });

    await enviarCorreo({
      asunto: `📊 Resumen de ventas — ${MESES[rango.mes]} ${rango.anio}`,
      html,
      xlsxBuffer,
      nombreArchivo: nombreArchivoMes(rango.anio, rango.mes) + ".xlsx",
    });

    return Response.json({
      ok: true,
      enviado: true,
      ordenes: resumen.totalOrdenes,
      totalConIva: resumen.totalConIva,
      pendiente: resumen.totalPendiente,
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
