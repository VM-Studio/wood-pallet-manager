import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DetallePresupuesto {
  nombreProducto: string;
  condicion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface DatosPresupuesto {
  numeroCotizacion: number;
  fechaCotizacion: string;
  razonSocialCliente: string;
  detalles: DetallePresupuesto[];
  costoFlete?: number;
  costoSenasa?: number;
  observaciones?: string;
}

const BROWN_DARK  = '#6B3A2A';
const BROWN_MID   = '#9B5E3A';
const BROWN_LIGHT = '#C4895A';
const CREAM       = '#FDF6EE';
const GRAY_TEXT   = '#374151';
const GRAY_LIGHT  = '#F3F4F6';

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export async function generarPresupuestoPDF(datos: DatosPresupuesto): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // ── Fondo header degradé ──────────────────────────────────────────────────
  // jsPDF no tiene degradé nativo; simulamos con rectángulos graduados
  const headerH = 42;
  const steps = 30;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const r = Math.round(hexToRgb(BROWN_DARK)[0] * (1 - t) + hexToRgb(BROWN_LIGHT)[0] * t);
    const g = Math.round(hexToRgb(BROWN_DARK)[1] * (1 - t) + hexToRgb(BROWN_LIGHT)[1] * t);
    const b = Math.round(hexToRgb(BROWN_DARK)[2] * (1 - t) + hexToRgb(BROWN_LIGHT)[2] * t);
    doc.setFillColor(r, g, b);
    doc.rect((pageW / steps) * i, 0, pageW / steps + 0.5, headerH, 'F');
  }

  // ── Logo (si está disponible) ─────────────────────────────────────────────
  try {
    const response = await fetch('/palletlogo.png');
    const blob = await response.blob();
    const logoBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    // Logo centrado en el header
    const logoW = 18;
    const logoH = 18;
    const logoX = pageW / 2 - logoW / 2;
    doc.addImage(logoBase64, 'PNG', logoX, 6, logoW, logoH);
  } catch {
    // Si no carga el logo, dibujamos un placeholder
    doc.setFillColor(255, 255, 255);
    doc.circle(pageW / 2, 15, 8, 'F');
  }

  // ── Nombre empresa ────────────────────────────────────────────────────────
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(15);
  doc.text('Wood Pallet', pageW / 2, 31, { align: 'center' });

  // ── Título PRESUPUESTO y número ───────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`PRESUPUESTO N° ${String(datos.numeroCotizacion).padStart(4, '0')}`, pageW / 2, 38, { align: 'center' });

  // ── Info debajo del header ────────────────────────────────────────────────
  let y = headerH + 10;

  // Banda de datos cliente/fecha
  doc.setFillColor(...hexToRgb(CREAM));
  doc.rect(10, headerH + 4, pageW - 20, 16, 'F');
  doc.setDrawColor(...hexToRgb(BROWN_LIGHT));
  doc.setLineWidth(0.3);
  doc.rect(10, headerH + 4, pageW - 20, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...hexToRgb(GRAY_TEXT));
  doc.text(`Cliente:`, 14, y);
  doc.setFont('helvetica', 'bold');
  doc.text(datos.razonSocialCliente, 14 + doc.getTextWidth('Cliente: '), y);

  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha:`, pageW - 50, y);
  doc.setFont('helvetica', 'bold');
  doc.text(datos.fechaCotizacion, pageW - 50 + doc.getTextWidth('Fecha: '), y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(BROWN_MID));
  doc.text('Presupuesto válido por 72 hs. sujeto a disponibilidad de stock.', 14, y);

  y += 10;

  // ── Tabla de productos ────────────────────────────────────────────────────
  const formatPesos = (v: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

  const rows = datos.detalles.map(d => [
    `${d.nombreProducto}\n${d.condicion}`,
    String(d.cantidad),
    formatPesos(d.precioUnitario),
    formatPesos(d.subtotal),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: rows,
    margin: { left: 10, right: 10 },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 3,
      textColor: hexToRgb(GRAY_TEXT),
      lineColor: [229, 231, 235],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: hexToRgb(BROWN_DARK),
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: hexToRgb(GRAY_LIGHT) },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.fontStyle = 'normal';
      }
    },
  });

  // ── Totales ───────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  let subtotal = datos.detalles.reduce((acc, d) => acc + d.subtotal, 0);
  if (datos.costoFlete)   subtotal += datos.costoFlete;
  if (datos.costoSenasa)  subtotal += datos.costoSenasa;
  const iva   = subtotal * 0.21;
  const total = subtotal + iva;

  const totalesX = pageW - 10 - 75;
  let ty = finalY;

  const drawLineTotales = (label: string, valor: string, bold = false, highlight = false) => {
    if (highlight) {
      doc.setFillColor(...hexToRgb(BROWN_DARK));
      doc.rect(totalesX, ty - 4.5, 75, 8, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(...hexToRgb(GRAY_TEXT));
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9.5 : 8.5);
    doc.text(label, totalesX + 3, ty);
    doc.text(valor, pageW - 13, ty, { align: 'right' });
    ty += 7;
  };

  // Borde alrededor de totales
  const totalBoxH = datos.costoFlete || datos.costoSenasa ? 38 : 30;
  doc.setDrawColor(...hexToRgb(BROWN_LIGHT));
  doc.setLineWidth(0.4);
  doc.roundedRect(totalesX, finalY - 6, 75, totalBoxH, 1, 1);

  ty = finalY;
  if (datos.costoFlete) {
    drawLineTotales('Flete:', formatPesos(datos.costoFlete));
  }
  if (datos.costoSenasa) {
    drawLineTotales('SENASA:', formatPesos(datos.costoSenasa));
  }
  drawLineTotales('Subtotal s/IVA:', formatPesos(subtotal));
  drawLineTotales('IVA (21%):', formatPesos(iva));
  drawLineTotales('TOTAL:', formatPesos(total), true, true);

  // ── Observaciones ─────────────────────────────────────────────────────────
  if (datos.observaciones) {
    const obsY = Math.max(ty + 10, finalY + 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...hexToRgb(BROWN_DARK));
    doc.text('Observaciones:', 10, obsY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(GRAY_TEXT));
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(datos.observaciones, pageW - 20);
    doc.text(lines, 10, obsY + 5);
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...hexToRgb(BROWN_DARK));
  doc.rect(0, pageH - 12, pageW, 12, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Wood Pallet · Gracias por su consulta', pageW / 2, pageH - 5, { align: 'center' });

  return doc.output('blob');
}
