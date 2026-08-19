import PDFDocument from 'pdfkit';

const BRAND = '#6B3A2A';
const BRAND_SOFT = '#F5EDE5';
const TEXT_MUTED = '#6B7280';
const BORDER = '#E5E7EB';

const ars = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const fmtFecha = (d: Date) =>
  d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });

const fmtFechaHora = (d: Date) =>
  d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

const fmtMesCorto = (d: Date) =>
  d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });

interface ReportePdfParams {
  desde: Date;
  hasta: Date;
  resumen: { totalFacturado: number; cantidadOperaciones: number; ticketPromedio: number };
  detallePorCliente: { clienteId: number; razonSocial: string; cantidadCompras: number; montoTotal: number }[];
  filaOtros: { cantidadCompras: number; montoTotal: number } | null;
  totalClientesDistintos: number;
  serieMensual: { mes: Date; facturacion: number; operaciones: number }[];
}

/**
 * Genera el PDF del reporte de ventas 100% on-demand en memoria (no se
 * persiste en disco ni en base de datos). Se devuelve el PDFDocument ya
 * iniciado para que el controller lo streamee directo a la respuesta HTTP
 * (doc.pipe(res)) sin bufferear el archivo completo.
 */
export function generarReportePdfStream(params: ReportePdfParams): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 45, bufferPages: true });
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;

  // ── Encabezado ────────────────────────────────────────────────────────
  doc.rect(left, 40, pageWidth, 70).fill(BRAND);
  doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold')
     .text('Wood Pallet', left + 18, 55);
  doc.fontSize(12).font('Helvetica')
     .text('Reporte de ventas', left + 18, 79);
  doc.fontSize(9).font('Helvetica')
     .text(`Período: ${fmtFecha(params.desde)} — ${fmtFecha(params.hasta)}`, left + 18, 96);
  doc.fontSize(8).fillColor('#EADFD3')
     .text(`Generado el ${fmtFechaHora(new Date())}`, left, 122, { width: pageWidth, align: 'right' });
  doc.fillColor('#000000');

  // ── Tarjetas resumen ──────────────────────────────────────────────────
  let y = 135;
  const cardW = (pageWidth - 24) / 3;
  const cards = [
    { label: 'FACTURACIÓN TOTAL', val: ars(params.resumen.totalFacturado) },
    { label: 'OPERACIONES',       val: String(params.resumen.cantidadOperaciones) },
    { label: 'TICKET PROMEDIO',   val: ars(params.resumen.ticketPromedio) },
  ];
  cards.forEach((c, i) => {
    const x = left + i * (cardW + 12);
    doc.rect(x, y, cardW, 56).fillAndStroke(BRAND_SOFT, BORDER);
    doc.fillColor(TEXT_MUTED).fontSize(7.5).font('Helvetica-Bold')
       .text(c.label, x + 12, y + 10, { width: cardW - 24 });
    doc.fillColor(BRAND).fontSize(15).font('Helvetica-Bold')
       .text(c.val, x + 12, y + 26, { width: cardW - 24 });
  });
  doc.fillColor('#000000');
  y += 76;

  // ── Gráfico de evolución mensual (barras) ────────────────────────────
  if (params.serieMensual.length > 0) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827')
       .text('Evolución mensual de facturación', left, y);
    y += 18;

    const chartH = 110;
    const chartW = pageWidth;
    const maxVal = Math.max(...params.serieMensual.map(m => m.facturacion), 1);
    const n = params.serieMensual.length;
    const gap = 8;
    const barW = Math.min(46, (chartW - gap * (n - 1)) / n);
    const usedW = barW * n + gap * (n - 1);
    const chartX = left + (chartW - usedW) / 2;

    // Línea base
    doc.moveTo(left, y + chartH).lineTo(left + chartW, y + chartH).strokeColor(BORDER).stroke();

    params.serieMensual.forEach((m, i) => {
      const h = maxVal > 0 ? Math.max((m.facturacion / maxVal) * (chartH - 20), 2) : 2;
      const x = chartX + i * (barW + gap);
      doc.rect(x, y + chartH - h, barW, h).fill(BRAND);
      doc.fillColor(TEXT_MUTED).fontSize(6.5).font('Helvetica')
         .text(fmtMesCorto(m.mes), x - 4, y + chartH + 5, { width: barW + 8, align: 'center' });
      doc.fillColor('#111827').fontSize(6.5).font('Helvetica-Bold')
         .text(ars(m.facturacion), x - 12, y + chartH - h - 11, { width: barW + 24, align: 'center' });
    });
    doc.fillColor('#000000');
    y += chartH + 26;
  }

  // ── Gráfico horizontal: top clientes por facturación ─────────────────
  const topParaGrafico = params.detallePorCliente.slice(0, 8);
  if (topParaGrafico.length > 0) {
    if (y > doc.page.height - 220) { doc.addPage(); y = doc.page.margins.top; }
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827')
       .text('Top clientes por facturación', left, y);
    y += 18;

    const maxCliente = Math.max(...topParaGrafico.map(c => c.montoTotal), 1);
    const rowH = 20;
    const labelW = 150;
    const barMaxW = pageWidth - labelW - 90;

    topParaGrafico.forEach((c, i) => {
      const rowY = y + i * rowH;
      doc.fontSize(8).font('Helvetica').fillColor('#374151')
         .text(c.razonSocial, left, rowY + 4, { width: labelW - 8, ellipsis: true });
      const barW = Math.max((c.montoTotal / maxCliente) * barMaxW, 3);
      doc.rect(left + labelW, rowY + 2, barW, rowH - 8).fill(i === 0 ? BRAND : '#C4895A');
      doc.fillColor('#111827').fontSize(7.5).font('Helvetica-Bold')
         .text(ars(c.montoTotal), left + labelW + barW + 6, rowY + 4);
    });
    doc.fillColor('#000000');
    y += topParaGrafico.length * rowH + 20;
  }

  // ── Tabla detalle por cliente ─────────────────────────────────────────
  if (y > doc.page.height - 150) { doc.addPage(); y = doc.page.margins.top; }
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827')
     .text('Detalle por cliente', left, y);
  y += 16;

  const colCliente = left;
  const colCompras = left + pageWidth - 190;
  const colMonto   = left + pageWidth - 100;

  const drawHeaderFila = (yy: number) => {
    doc.rect(left, yy, pageWidth, 20).fill(BRAND);
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
    doc.text('Cliente',  colCliente + 8, yy + 6);
    doc.text('Compras',  colCompras,     yy + 6, { width: 80, align: 'right' });
    doc.text('Monto total', colMonto,    yy + 6, { width: pageWidth - (colMonto - left) - 6, align: 'right' });
    doc.fillColor('#000000');
  };

  drawHeaderFila(y);
  y += 20;

  const filas = params.filaOtros
    ? [...params.detallePorCliente, { clienteId: -1, razonSocial: 'Otros', cantidadCompras: params.filaOtros.cantidadCompras, montoTotal: params.filaOtros.montoTotal }]
    : params.detallePorCliente;

  filas.forEach((f, i) => {
    if (y > doc.page.height - doc.page.margins.bottom - 30) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeaderFila(y);
      y += 20;
    }
    const rowH = 18;
    if (i % 2 === 0) doc.rect(left, y, pageWidth, rowH).fill('#FAF6F1');
    doc.fillColor('#374151').fontSize(8).font(f.clienteId === -1 ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(f.razonSocial, colCliente + 8, y + 5, { width: colCompras - colCliente - 16 });
    doc.text(String(f.cantidadCompras), colCompras, y + 5, { width: 80, align: 'right' });
    doc.font('Helvetica-Bold').text(ars(f.montoTotal), colMonto, y + 5, { width: pageWidth - (colMonto - left) - 6, align: 'right' });
    y += rowH;
  });

  // Total al pie
  doc.rect(left, y, pageWidth, 22).fill(BRAND_SOFT);
  doc.fillColor(BRAND).fontSize(9).font('Helvetica-Bold');
  doc.text('TOTAL DEL PERÍODO', colCliente + 8, y + 6);
  doc.text(ars(params.resumen.totalFacturado), colMonto, y + 6, { width: pageWidth - (colMonto - left) - 6, align: 'right' });
  doc.fillColor('#000000');
  y += 22;

  if (params.totalClientesDistintos > filas.length) {
    doc.fontSize(7).fillColor(TEXT_MUTED)
       .text(`Mostrando top ${filas.length} de ${params.totalClientesDistintos} clientes. El resto se agrupa en "Otros".`, left, y + 6);
  }

  // ── Pie de página en todas las hojas ──────────────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(7.5).fillColor('#9CA3AF')
       .text(
         `Wood Pallet Manager · Reporte generado dinámicamente · Página ${i + 1} de ${range.count}`,
         left, doc.page.height - 30,
         { width: pageWidth, align: 'center' }
       );
  }

  return doc;
}
