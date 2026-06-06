import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MedidaComponentePDF {
  label: string;
  tablas?: number;
  largo?: number;   // mm
  ancho?: number;   // mm
  espesor?: number; // mm
  pies: number;
}

interface DetallePresupuesto {
  nombreProducto: string;
  condicion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  medidasPallet?: MedidaComponentePDF[];
}

interface DatosPresupuesto {
  numeroCotizacion: number;
  fechaCotizacion: string;
  razonSocialCliente: string;
  cuitCliente?: string;
  cuitEmpresa?: string;
  detalles: DetallePresupuesto[];
  costoFlete?: number;
  costoSenasa?: number;
  observaciones?: string;
  incluyeIva?: boolean;
}

const BROWN_DARK  = '#6B3A2A';
const BROWN_LIGHT = '#C4895A';
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
  const pageH = doc.internal.pageSize.getHeight();

  // ── Fondo beige claro ─────────────────────────────────────────────────────
  doc.setFillColor(252, 247, 240);
  doc.rect(0, 0, pageW, pageH, 'F');

  // ── Logo centrado ─────────────────────────────────────────────────────────
  let logoLoaded = false;
  try {
    const response = await fetch('/cotizacioneslogo.png');
    const blob = await response.blob();
    const logoBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    const logoW = 24;
    const logoH = 24;
    doc.addImage(logoBase64, 'PNG', pageW / 2 - logoW / 2, 7, logoW, logoH);
    logoLoaded = true;
  } catch {
    // Si no carga el logo, no dibujamos nada
  }

  // ── Nombre empresa (debajo del logo, cursiva) ─────────────────────────────
  const nameY = logoLoaded ? 38 : 14;
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(17);
  doc.setTextColor(...hexToRgb('#3D1F0F'));
  doc.text('Wood Pallet', pageW / 2, nameY, { align: 'center' });

  // ── CUIT empresa (siempre visible si está disponible) ─────────────────────
  let afterBrand = nameY + 5;
  if (datos.cuitEmpresa) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb('#9CA3AF'));
    doc.text(`CUIT ${datos.cuitEmpresa}`, pageW / 2, afterBrand, { align: 'center' });
    afterBrand += 5;
  }

  // ── Línea divisora principal ──────────────────────────────────────────────
  const dividerY = afterBrand + 3;
  doc.setDrawColor(...hexToRgb(BROWN_DARK));
  doc.setLineWidth(0.5);
  doc.line(10, dividerY, pageW - 10, dividerY);

  // ── Fila Presupuesto / Fecha ──────────────────────────────────────────────
  const infoY = dividerY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(BROWN_DARK));
  doc.text(`PRESUPUESTO N° ${String(datos.numeroCotizacion).padStart(4, '0')}`, 10, infoY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb('#6B7280'));
  doc.text(datos.fechaCotizacion, pageW - 10, infoY, { align: 'right' });

  // ── Línea sutil ───────────────────────────────────────────────────────────
  const divider2Y = infoY + 4;
  doc.setDrawColor(...hexToRgb('#E5E7EB'));
  doc.setLineWidth(0.2);
  doc.line(10, divider2Y, pageW - 10, divider2Y);

  // ── Info cliente ──────────────────────────────────────────────────────────
  const clientY = divider2Y + 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...hexToRgb('#9CA3AF'));
  doc.text('CLIENTE', 10, clientY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...hexToRgb('#1A1A1A'));
  doc.text(datos.razonSocialCliente, 10, clientY + 5);

  if (datos.cuitCliente) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...hexToRgb('#6B7280'));
    doc.text(`CUIT ${datos.cuitCliente}`, 10, clientY + 10);
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(...hexToRgb('#9CA3AF'));
  doc.text('Válido 72hs · sujeto a disponibilidad de stock', pageW - 10, clientY + 5, { align: 'right' });

  // ── Separador antes de tabla ──────────────────────────────────────────────
  const tableStartY = (datos.cuitCliente ? clientY + 16 : clientY + 11);
  doc.setDrawColor(...hexToRgb('#E5E7EB'));
  doc.setLineWidth(0.2);
  doc.line(10, tableStartY - 2, pageW - 10, tableStartY - 2);

  const y = tableStartY;

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
      cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
      textColor: hexToRgb(GRAY_TEXT),
      lineColor: [235, 235, 235],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: hexToRgb(BROWN_DARK),
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [248, 241, 232] as [number, number, number] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.fontStyle = 'normal';
      }
    },
  });

  // ── Totales ───────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable.finalY + 6;

  // ── Sección medidas para pallets a medida ─────────────────────────────────
  const detallesConMedidas = datos.detalles.filter(d => d.medidasPallet && d.medidasPallet.length > 0);
  if (detallesConMedidas.length > 0) {
    const medY = finalY - 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...hexToRgb(BROWN_DARK));
    doc.text('Especificación de medidas (pallets a medida):', 10, medY);

    for (const det of detallesConMedidas) {
      const rowsMedidas = (det.medidasPallet ?? [])
        .filter(m => m.pies > 0)
        .map(m => [
          m.label,
          m.tablas !== undefined ? String(m.tablas) : '—',
          m.largo  !== undefined ? `${m.largo} mm`  : '—',
          m.ancho  !== undefined ? `${m.ancho} mm`  : '—',
          m.espesor !== undefined ? `${m.espesor} mm` : '—',
        ]);

      autoTable(doc, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        startY: (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 5 : medY + 4,
        head: [['Componente', 'Tablas', 'Largo', 'Ancho', 'Espesor']],
        body: rowsMedidas,
        margin: { left: 10, right: 10 },
        styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2, textColor: hexToRgb(GRAY_TEXT) },
        headStyles: { fillColor: hexToRgb(BROWN_DARK), textColor: [255, 255, 255] as [number,number,number], fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { halign: 'center', cellWidth: 18 },
          2: { halign: 'center', cellWidth: 26 },
          3: { halign: 'center', cellWidth: 26 },
          4: { halign: 'center', cellWidth: 26 },
        },
        alternateRowStyles: { fillColor: hexToRgb(GRAY_LIGHT) },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finalY = (doc as any).lastAutoTable.finalY + 8;
  }

  const incluyeIva = datos.incluyeIva !== false; // default true si no se pasa
  let subtotal = datos.detalles.reduce((acc, d) => acc + Number(d.subtotal), 0);
  if (datos.costoFlete)   subtotal += Number(datos.costoFlete);
  if (datos.costoSenasa)  subtotal += Number(datos.costoSenasa);
  const iva   = subtotal * 0.21;
  const total = incluyeIva ? subtotal + iva : subtotal;

  const totalesX = pageW - 10 - 72;
  let ty = finalY;

  // Fondo sutil y borde del bloque de totales
  const numLineas = (datos.costoFlete ? 1 : 0) + (datos.costoSenasa ? 1 : 0) + (incluyeIva ? 3 : 2);
  const totalBoxH = numLineas * 7 + 10;
  doc.setFillColor(246, 238, 227);
  doc.roundedRect(totalesX, finalY - 5, 72, totalBoxH, 2, 2, 'F');
  doc.setDrawColor(...hexToRgb(BROWN_LIGHT));
  doc.setLineWidth(0.3);
  doc.roundedRect(totalesX, finalY - 5, 72, totalBoxH, 2, 2, 'S');

  const drawLineTotales = (label: string, valor: string, bold = false, highlight = false) => {
    if (highlight) {
      doc.setFillColor(...hexToRgb(BROWN_DARK));
      doc.roundedRect(totalesX, ty - 5, 72, 8, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(...hexToRgb(GRAY_TEXT));
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9.5 : 8.5);
    doc.text(label, totalesX + 4, ty);
    doc.text(valor, totalesX + 72 - 4, ty, { align: 'right' });
    ty += 7;
  };

  if (datos.costoFlete) {
    drawLineTotales('Flete:', formatPesos(datos.costoFlete));
  }
  if (datos.costoSenasa) {
    drawLineTotales('SENASA:', formatPesos(datos.costoSenasa));
  }
  drawLineTotales('Subtotal s/IVA:', formatPesos(subtotal));
  if (incluyeIva) {
    drawLineTotales('IVA (21%):', formatPesos(iva));
    drawLineTotales('TOTAL:', formatPesos(total), true, true);
  } else {
    drawLineTotales('TOTAL (sin IVA):', formatPesos(total), true, true);
  }

  // ── Observaciones ─────────────────────────────────────────────────────────
  if (datos.observaciones) {
    const obsY = Math.max(ty + 8, finalY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(BROWN_DARK));
    doc.text('Observaciones', 10, obsY);
    doc.setDrawColor(...hexToRgb(BROWN_LIGHT));
    doc.setLineWidth(0.2);
    doc.line(10, obsY + 1.5, 10 + doc.getTextWidth('Observaciones') + 2, obsY + 1.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(GRAY_TEXT));
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(datos.observaciones, pageW - 20);
    doc.text(lines, 10, obsY + 6);
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setDrawColor(...hexToRgb('#E5E7EB'));
  doc.setLineWidth(0.3);
  doc.line(10, pageH - 14, pageW - 10, pageH - 14);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...hexToRgb('#9CA3AF'));
  doc.text('Wood Pallet · Gracias por su consulta', pageW / 2, pageH - 8, { align: 'center' });

  return doc.output('blob');
}
