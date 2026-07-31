// graficas.js — genera las gráficas como PNG usando QuickChart (sin dependencias nativas).
// En producción (Vercel) esto funciona directo. Si alguna gráfica falla, se omite
// para que el reporte igual se mande.

const money = (x) => "$" + Math.round(x || 0).toLocaleString("es-MX");

const PALETA = ["#3D5A6C", "#7A3B3B", "#5C7A5C", "#B8763D", "#9C5A5A", "#6B6B6B", "#A88B67"];

// Devuelve los config de Chart.js (compartibles). Útil para producción y para previsualizar.
function configuraciones(R) {
  const canales = R.canalInsights.map((c) => c.canal);
  const canalVentas = R.canalInsights.map((c) => Math.round(c.cIva));

  const piezas = Object.entries(R.porTipoPieza).sort((a, b) => b[1].piezas - a[1].piezas);
  const piezaLabels = piezas.map((p) => p[0]);
  const piezaData = piezas.map((p) => p[1].piezas);

  const dias = Object.keys(R.porDia).sort();
  const diaData = dias.map((d) => Math.round(R.porDia[d]));

  const topLabels = R.top5Piezas.map((m) => m.nombre.slice(0, 28));
  const topData = R.top5Piezas.map((m) => m.piezas);

  const base = { plugins: { legend: { labels: { font: { family: "Arial" } } } } };

  return {
    canal: {
      type: "bar",
      data: { labels: canales, datasets: [{ label: "Ventas c/IVA", data: canalVentas, backgroundColor: PALETA }] },
      options: { ...base, plugins: { legend: { display: false }, title: { display: true, text: "Ventas por canal" } } },
    },
    piezas: {
      type: "doughnut",
      data: { labels: piezaLabels, datasets: [{ data: piezaData, backgroundColor: PALETA }] },
      options: { ...base, plugins: { title: { display: true, text: "Piezas por tipo" }, legend: { position: "right" } } },
    },
    dia: {
      type: "line",
      data: { labels: dias, datasets: [{ label: "Ventas c/IVA", data: diaData, borderColor: "#3D5A6C", backgroundColor: "rgba(61,90,108,0.15)", fill: true, tension: 0.3 }] },
      options: { ...base, plugins: { legend: { display: false }, title: { display: true, text: "Ventas por día" } } },
    },
    topModelos: {
      type: "bar",
      data: { labels: topLabels, datasets: [{ label: "Piezas", data: topData, backgroundColor: "#B8763D" }] },
      options: { ...base, indexAxis: "y", plugins: { legend: { display: false }, title: { display: true, text: "Top 5 modelos (por piezas)" } } },
    },
  };
}

async function unaGrafica(config, width, height) {
  try {
    const res = await fetch("https://quickchart.io/chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chart: config, width, height, format: "png", backgroundColor: "white", devicePixelRatio: 2 }),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function generarGraficas(R) {
  const cfg = configuraciones(R);
  const [canal, piezas, dia, topModelos] = await Promise.all([
    unaGrafica(cfg.canal, 420, 260),
    unaGrafica(cfg.piezas, 420, 260),
    unaGrafica(cfg.dia, 860, 260),
    unaGrafica(cfg.topModelos, 420, 260),
  ]);
  return { canal, piezas, dia, topModelos };
}

export { configuraciones, generarGraficas, money };
