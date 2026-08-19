import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const crearTransporter = () => {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// ─── Genera el PDF del remito firmado ──────────────────────────────────────

export const generarPdfRemito = (params: {
  numeroRemito: string;
  razonSocial: string;
  fechaEmision: string;
  fechaEntrega?: string;
  productos: { nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
  totalConIva: number;
  firmaPropietarioBase64?: string;
  firmaClienteBase64?: string;
  nombreFirmante?: string;
}): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const ars = (v: number) =>
      new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

    // ── Encabezado ──────────────────────────────────────────────────────────
    doc.rect(50, 40, 495, 60).fill('#6B3A2A');
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text('Wood Pallet', 65, 55);
    doc.fontSize(11).font('Helvetica').text(`Remito #${params.numeroRemito}`, 65, 78);
    doc.fillColor('black');

    // ── Datos ────────────────────────────────────────────────────────────────
    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica-Bold').text('Cliente:', 50, 120);
    doc.font('Helvetica').text(params.razonSocial, 110, 120);
    doc.font('Helvetica-Bold').text('Fecha emisión:', 320, 120);
    doc.font('Helvetica').text(params.fechaEmision, 410, 120);
    if (params.fechaEntrega) {
      doc.font('Helvetica-Bold').text('Fecha entrega:', 320, 135);
      doc.font('Helvetica').text(params.fechaEntrega, 410, 135);
    }

    // ── Tabla de productos ───────────────────────────────────────────────────
    let y = 160;
    doc.rect(50, y, 495, 22).fill('#6B3A2A');
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    doc.text('Producto',     60,  y + 7);
    doc.text('Cant.',       320,  y + 7);
    doc.text('Precio u.',   370,  y + 7);
    doc.text('Subtotal',    450,  y + 7, { width: 90, align: 'right' });
    doc.fillColor('black');
    y += 22;

    params.productos.forEach((p, i) => {
      if (i % 2 === 0) doc.rect(50, y, 495, 18).fill('#FDF6EE');
      doc.fillColor('#374151').fontSize(9).font('Helvetica');
      doc.text(p.nombre,           60,  y + 5, { width: 250 });
      doc.text(String(p.cantidad), 320,  y + 5);
      doc.text(ars(p.precioUnitario), 365, y + 5);
      doc.text(ars(p.subtotal),    450,  y + 5, { width: 90, align: 'right' });
      y += 18;
    });

    // Total
    doc.rect(50, y, 495, 22).fill('#F5EDE5');
    doc.fillColor('#6B3A2A').fontSize(10).font('Helvetica-Bold');
    doc.text('Total con IVA', 60,  y + 6);
    doc.text(ars(params.totalConIva), 450, y + 6, { width: 90, align: 'right' });
    doc.fillColor('black');
    y += 34;

    // ── Firmas ───────────────────────────────────────────────────────────────
    const firmaY = Math.max(y + 20, 560);
    doc.fontSize(10).font('Helvetica-Bold').text('Firmas', 50, firmaY);
    doc.moveTo(50, firmaY + 14).lineTo(545, firmaY + 14).strokeColor('#E5E7EB').stroke();

    let firmaX = 50;
    const embedFirma = (base64: string, label: string, x: number) => {
      try {
        const dataUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
        const base64Data = dataUrl.split(',')[1];
        const imgBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imgBuffer, x, firmaY + 20, { height: 70, fit: [200, 70] });
        doc.fontSize(8).font('Helvetica').fillColor('#6B7280')
           .text(label, x, firmaY + 95, { width: 200 });
      } catch (_) {}
    };

    if (params.firmaPropietarioBase64) {
      embedFirma(params.firmaPropietarioBase64, 'Wood Pallet — Firma del emisor', firmaX);
      firmaX = 320;
    }
    if (params.firmaClienteBase64) {
      const labelCliente = params.nombreFirmante
        ? `${params.razonSocial} — Firma de ${params.nombreFirmante}`
        : `${params.razonSocial} — Firma del cliente`;
      embedFirma(params.firmaClienteBase64, labelCliente, firmaX);
    }

    // ── Pie ──────────────────────────────────────────────────────────────────
    doc.fontSize(8).fillColor('#9CA3AF')
       .text('Wood Pallet Manager · Documento generado digitalmente', 50, 780, { align: 'center', width: 495 });

    doc.end();
  });
};

// ─── Logo embebido (cid) para emails ───────────────────────────────────────
// Se adjunta el logo como inline attachment (Content-ID) en lugar de una URL
// remota: así se ve siempre en Gmail/Outlook/Apple Mail, sin depender de que
// el dominio del frontend esté online ni de que el cliente "cargue imágenes
// externas". El archivo vive en backend/src/assets/email-logo.png y se copia
// a dist/assets en el build (ver script "build" en package.json).
const LOGO_CID = 'woodpallet-logo';
let logoBuffer: Buffer | null = null;
try {
  logoBuffer = fs.readFileSync(path.join(__dirname, '../assets/email-logo.png'));
} catch (_) {
  logoBuffer = null;
}
const logoAttachments = logoBuffer
  ? [{
      filename: 'wood-pallet-logo.png',
      content: logoBuffer,
      cid: LOGO_CID,
      contentDisposition: 'inline' as const,
    }]
  : [];

// Envuelve transporter.sendMail agregando siempre el logo inline, sin pisar
// otros adjuntos (PDFs, remitos, etc.) que ya venga con el mail.
async function sendMailConLogo(
  transporter: ReturnType<typeof nodemailer.createTransport>,
  mailOptions: Parameters<ReturnType<typeof nodemailer.createTransport>['sendMail']>[0]
) {
  return transporter.sendMail({
    ...mailOptions,
    attachments: [...logoAttachments, ...(mailOptions.attachments || [])],
  });
}

function wrapEmail(titulo: string, subtitulo: string | undefined, body: string): string {
  const logoImg = logoBuffer
    ? `<img src="cid:${LOGO_CID}" alt="Wood Pallet" width="72" height="72" style="display:block;margin:0 auto;object-fit:contain;border-radius:50%;background:#FFFFFF;padding:6px;border:1px solid #EDE4D8;" />`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>${titulo}</title>
<style>
  @media only screen and (max-width: 480px) {
    .wp-container { width: 100% !important; border-radius: 0 !important; }
    .wp-padded { padding-left: 22px !important; padding-right: 22px !important; }
    .wp-header { padding: 28px 22px 22px !important; }
    .wp-title { font-size: 18px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#EFE7DA;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFE7DA;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" class="wp-container" style="max-width:560px;width:100%;">

          <!-- Franja superior -->
          <tr>
            <td style="height:5px;line-height:5px;font-size:0;background:linear-gradient(90deg,#7c4b2c,#C4895A);border-radius:14px 14px 0 0;">&nbsp;</td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:0 0 14px 14px;box-shadow:0 4px 28px rgba(45,26,14,0.10);overflow:hidden;">

              <!-- Header con logo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="wp-header" style="padding:38px 40px 26px;text-align:center;background:#FCFAF7;border-bottom:1px solid #EDE4D8;">
                    ${logoImg}
                    <p style="margin:14px 0 2px;font-size:11px;font-weight:700;color:#B9A896;letter-spacing:0.18em;text-transform:uppercase;">Wood Pallet</p>
                    <h1 class="wp-title" style="margin:2px 0 0;font-size:21px;font-weight:600;color:#2D1A0E;letter-spacing:-0.2px;font-family:Georgia,'Times New Roman',serif;font-style:italic;">${titulo}</h1>
                    ${subtitulo ? `<p style="margin:6px 0 0;font-size:13px;color:#A89A8A;">${subtitulo}</p>` : ''}
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="wp-padded" style="padding:32px 40px;">${body}</td>
                </tr>
              </table>

              <!-- Footer -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#FAF6F1;border-top:1px solid #EDE4D8;padding:18px 40px;text-align:center;">
                    <p style="margin:0;font-size:10.5px;color:#C0AFA4;letter-spacing:0.06em;text-transform:uppercase;">Wood Pallet · Sistema de gestión</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Espaciador inferior -->
          <tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const enviarPresupuestoPorEmail = async (params: {
  destinatario: string;
  razonSocial: string;
  numeroCotizacion: number;
  fecha: string;
  pdfBase64: string;
  filename: string;
}) => {
  const transporter = crearTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await sendMailConLogo(transporter, {
    from: `"Wood Pallet" <${from}>`,
    to: params.destinatario,
    subject: `Presupuesto Wood Pallet #${String(params.numeroCotizacion).padStart(4, '0')}`,
    html: wrapEmail(
      `Presupuesto #${String(params.numeroCotizacion).padStart(4, '0')}`,
      'Wood Pallet',
      `<p style="color:#374151;font-size:15px;margin:0 0 12px;">Estimado/a <strong style="color:#2D1A0E;">${params.razonSocial}</strong>,</p>
      <p style="color:#6B7280;font-size:14px;line-height:1.7;margin:0 0 24px;">Adjunto encontrará el presupuesto correspondiente a su consulta. Ante cualquier pregunta, no dude en contactarnos.</p>
      <div style="background:#FAF6F1;border-radius:8px;border:1px solid #EDE4D8;padding:16px 20px;margin-bottom:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:11px;color:#A89A8A;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:3px;">Presupuesto</td>
            <td style="font-size:11px;color:#A89A8A;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:3px;text-align:right;">Fecha</td>
          </tr>
          <tr>
            <td style="font-size:17px;font-weight:700;color:#2D1A0E;">#${String(params.numeroCotizacion).padStart(4, '0')}</td>
            <td style="font-size:14px;font-weight:600;color:#374151;text-align:right;">${params.fecha}</td>
          </tr>
        </table>
      </div>
      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;padding:12px 16px;font-size:13px;color:#92400E;margin-bottom:24px;">📎 El presupuesto se encuentra adjunto como PDF en este correo.</div>
      <p style="color:#A89A8A;font-size:13px;margin:0;line-height:1.6;">Saludos cordiales,<br/><strong style="color:#6B3A2A;">Wood Pallet</strong></p>`
    ),
    attachments: [
      {
        filename: params.filename,
        content:  params.pdfBase64,
        encoding: 'base64',
      },
    ],
  });
};

// ─── REMITO: enviar al cliente para que firme ──────────────────────────────

export const enviarRemitoParaFirmar = async (params: {
  destinatario: string;
  razonSocial: string;
  numeroRemito: string;
  fechaEmision: string;
  fechaEntrega?: string;
  linkFirma: string;
  productos: { nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
  totalConIva: number;
  firmaPropietarioBase64?: string;
}) => {
  const transporter = crearTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const filaProductos = params.productos.map(p => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;color:#374151;">${p.nombre}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;color:#374151;text-align:center;">${p.cantidad}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;color:#374151;text-align:right;">${new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(p.precioUnitario)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;font-weight:600;color:#111827;text-align:right;">${new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(p.subtotal)}</td>
    </tr>
  `).join('');

  const firmaImg = params.firmaPropietarioBase64
    ? `<div style="margin-top:20px;"><p style="font-size:12px;color:#6B7280;margin:0 0 6px;">Firma del emisor:</p><img src="${params.firmaPropietarioBase64}" style="max-height:80px;border:1px solid #E5E7EB;border-radius:4px;" /></div>`
    : '';

  await sendMailConLogo(transporter, {
    from: `"Wood Pallet" <${from}>`,
    to: params.destinatario,
    subject: `Remito Wood Pallet #${params.numeroRemito} — Firma requerida`,
    html: wrapEmail(
      `Remito #${params.numeroRemito}`,
      'Firma requerida',
      `<p style="color:#374151;font-size:15px;margin:0 0 12px;">Estimado/a <strong style="color:#2D1A0E;">${params.razonSocial}</strong>,</p>
      <p style="color:#6B7280;font-size:14px;line-height:1.7;margin:0 0 20px;">Le enviamos el remito de su pedido. Por favor <strong style="color:#2D1A0E;">fírmelo digitalmente</strong> para confirmar la recepción.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;font-size:13px;">
        <tr style="background:#6B3A2A;">
          <th style="padding:9px 12px;color:#FFFFFF;text-align:left;font-weight:600;">Producto</th>
          <th style="padding:9px 12px;color:#FFFFFF;text-align:center;font-weight:600;width:48px;">Cant.</th>
          <th style="padding:9px 12px;color:#FFFFFF;text-align:right;font-weight:600;">Precio u.</th>
          <th style="padding:9px 12px;color:#FFFFFF;text-align:right;font-weight:600;">Subtotal</th>
        </tr>
        ${filaProductos}
        <tr style="background:#FAF6F1;">
          <td colspan="3" style="padding:10px 12px;font-size:13px;font-weight:600;color:#6B3A2A;">Total con IVA</td>
          <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#2D1A0E;text-align:right;">${new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(params.totalConIva)}</td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;margin-bottom:24px;">
        <tr style="border-bottom:1px solid #EDE4D8;">
          <td style="padding:7px 0;color:#A89A8A;width:160px;">Fecha de emisión</td>
          <td style="padding:7px 0;color:#374151;font-weight:500;">${params.fechaEmision}</td>
        </tr>
        ${params.fechaEntrega ? `<tr><td style="padding:7px 0;color:#A89A8A;width:160px;">Fecha estimada de entrega</td><td style="padding:7px 0;color:#374151;font-weight:500;">${params.fechaEntrega}</td></tr>` : ''}
      </table>
      ${firmaImg}
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${params.linkFirma}" style="display:inline-block;background:#6B3A2A;color:#FFFFFF;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:0.01em;">✍️ Firmar remito</a>
      </div>
      <p style="text-align:center;font-size:11px;color:#A89A8A;margin:8px 0 0;">O accedé al enlace: <a href="${params.linkFirma}" style="color:#6B3A2A;word-break:break-all;">${params.linkFirma}</a></p>
      <p style="color:#A89A8A;font-size:13px;margin:28px 0 0;line-height:1.6;">Saludos cordiales,<br/><strong style="color:#6B3A2A;">Wood Pallet</strong></p>`
    ),
  });
};

// ─── REMITO: enviar copia firmada a ambas partes ───────────────────────────

export const enviarRemitoFirmado = async (params: {
  destinatario: string;
  razonSocial: string;
  numeroRemito: string;
  fechaEmision: string;
  fechaEntrega?: string;
  productos?: { nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
  totalConIva?: number;
  firmaPropietarioBase64?: string;
  firmaClienteBase64?: string;
  nombreFirmante?: string;
  esCopia: 'propietario' | 'cliente';
}) => {
  const transporter = crearTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const esParaPropietario = params.esCopia === 'propietario';
  const titulo = esParaPropietario
    ? `✅ Remito #${params.numeroRemito} firmado por ${params.nombreFirmante || params.razonSocial}`
    : `✅ Tu remito #${params.numeroRemito} — Copia firmada por ambas partes`;

  const firmaPropImg = params.firmaPropietarioBase64
    ? `<div style="margin-bottom:16px;"><p style="font-size:12px;color:#6B7280;margin:0 0 6px;font-weight:600;">Firma Wood Pallet (emisor):</p><img src="${params.firmaPropietarioBase64}" style="max-height:80px;border:1px solid #E5E7EB;border-radius:4px;display:block;" /></div>`
    : '';
  const firmaClienteImg = params.firmaClienteBase64
    ? `<div><p style="font-size:12px;color:#6B7280;margin:0 0 6px;font-weight:600;">Firma del cliente (${params.nombreFirmante || params.razonSocial}):</p><img src="${params.firmaClienteBase64}" style="max-height:80px;border:1px solid #E5E7EB;border-radius:4px;display:block;" /></div>`
    : '';

  const mensajePrincipal = esParaPropietario
    ? `El cliente <strong>${params.nombreFirmante || params.razonSocial}</strong> firmó el remito <strong>#${params.numeroRemito}</strong>. Se adjunta el documento PDF con ambas firmas.`
    : `Gracias por firmar el remito <strong>#${params.numeroRemito}</strong>. Se adjunta tu copia del documento firmado por ambas partes como comprobante.`;

  // Generar PDF con ambas firmas
  let pdfBuffer: Buffer | undefined;
  try {
    pdfBuffer = await generarPdfRemito({
      numeroRemito: params.numeroRemito,
      razonSocial: params.razonSocial,
      fechaEmision: params.fechaEmision,
      fechaEntrega: params.fechaEntrega,
      productos: params.productos ?? [],
      totalConIva: params.totalConIva ?? 0,
      firmaPropietarioBase64: params.firmaPropietarioBase64,
      firmaClienteBase64: params.firmaClienteBase64,
      nombreFirmante: params.nombreFirmante,
    });
  } catch (_) { /* si falla la generación del PDF se envía igual sin adjunto */ }

  await sendMailConLogo(transporter, {
    from: `"Wood Pallet" <${from}>`,
    to: params.destinatario,
    subject: titulo,
    html: wrapEmail(
      `Remito #${params.numeroRemito} — Firmado ✅`,
      esParaPropietario ? 'Copia interna' : 'Tu copia del documento',
      `<p style="color:#374151;font-size:15px;margin:0 0 12px;">${esParaPropietario ? 'Equipo Wood Pallet,' : `Estimado/a <strong style="color:#2D1A0E;">${params.razonSocial}</strong>,`}</p>
      <p style="color:#6B7280;font-size:14px;line-height:1.7;margin:0 0 24px;">${mensajePrincipal}</p>
      <div style="background:#FAF6F1;border:1px solid #EDE4D8;border-radius:8px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 14px;font-size:11px;font-weight:600;color:#A89A8A;text-transform:uppercase;letter-spacing:0.06em;">Firmas del documento</p>
        ${firmaPropImg}${firmaClienteImg}
      </div>
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:12px 16px;font-size:13px;color:#1E40AF;margin-bottom:24px;">📎 El documento PDF con ambas firmas se adjunta en este correo.</div>
      <p style="color:#A89A8A;font-size:13px;margin:0;line-height:1.6;">Saludos cordiales,<br/><strong style="color:#6B3A2A;">Wood Pallet</strong></p>`
    ),
    attachments: pdfBuffer ? [
      {
        filename: `Remito-${params.numeroRemito}-firmado.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ] : [],
  });
};

// ─── Envío de código de verificación ─────────────────────────────────────────
const tipoLabels: Record<string, string> = {
  cambio_password:       'Cambio de contraseña',
  cambio_email:          'Cambio de email',
  cambio_telefono:       'Cambio de teléfono',
  recuperacion_password: 'Recuperación de contraseña',
};

export const sendVerificationCode = async (params: {
  to: string;
  codigo: string;
  tipo: string;
  nombre: string;
}) => {
  const transporter = crearTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const accion = tipoLabels[params.tipo] || 'Verificación';

  await sendMailConLogo(transporter, {
    from,
    to: params.to,
    subject: `${params.codigo} — Tu código de verificación · Wood Pallet`,
    html: wrapEmail(
      'Código de verificación',
      accion,
      `<p style="color:#374151;font-size:15px;margin:0 0 12px;">Hola <strong style="color:#2D1A0E;">${params.nombre}</strong>,</p>
      <p style="color:#6B7280;font-size:14px;line-height:1.7;margin:0 0 24px;">Recibimos una solicitud de <strong>${accion}</strong>. Usá el siguiente código para continuar:</p>
      <div style="background:#FAF6F1;border:2px dashed #C4895A;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="color:#A89A8A;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Tu código</p>
        <p style="color:#2D1A0E;font-size:40px;font-weight:800;letter-spacing:0.18em;margin:0;font-variant-numeric:tabular-nums;">${params.codigo}</p>
      </div>
      <p style="color:#A89A8A;font-size:12px;margin:0 0 4px;">⏱ Expira en <strong>15 minutos</strong>.</p>
      <p style="color:#A89A8A;font-size:12px;margin:0 0 24px;">Si no solicitaste este código, podés ignorar este email.</p>
      <p style="color:#A89A8A;font-size:13px;margin:0;line-height:1.6;">Saludos,<br/><strong style="color:#6B3A2A;">Wood Pallet</strong></p>`
    ),
  });
};

// ─── Código único de retiro ──────────────────────────────────────────────────
export const sendCodigoRetiro = async (params: {
  to: string;
  nombre: string;
  codigoRetiro: string;
  fechaRetiro?: string;
  horaRetiro?: string;
  galpon?: string;
  productos?: { nombre: string; cantidad: number }[];
}) => {
  const transporter = crearTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const productosHtml = params.productos?.length
    ? `<ul style="margin:8px 0 0;padding-left:20px;color:#374151;font-size:14px;">
        ${params.productos.map(p => `<li>${p.nombre} × ${p.cantidad}</li>`).join('')}
       </ul>`
    : '';

  await sendMailConLogo(transporter, {
    from,
    to: params.to,
    subject: `Código de retiro ${params.codigoRetiro} · Wood Pallet`,
    html: wrapEmail(
      'Tu pedido está listo',
      'Código de retiro en galpón',
      `<p style="color:#374151;font-size:15px;margin:0 0 12px;">Hola <strong style="color:#2D1A0E;">${params.nombre}</strong>,</p>
      <p style="color:#6B7280;font-size:14px;line-height:1.7;margin:0 0 20px;">Tu pedido fue confirmado. Presentá este código en el galpón al momento de retirar la mercadería.</p>
      <div style="background:#FFFBEB;border:2px solid #FDE68A;border-radius:10px;padding:24px 32px;text-align:center;margin-bottom:24px;">
        <p style="color:#92400E;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">Código de retiro</p>
        <p style="color:#2D1A0E;font-size:34px;font-weight:800;letter-spacing:0.12em;margin:0;font-family:monospace;">${params.codigoRetiro}</p>
      </div>
      ${params.fechaRetiro || params.horaRetiro || params.galpon ? `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;margin-bottom:20px;">
        ${params.fechaRetiro ? `<tr><td style="padding:6px 0;color:#A89A8A;width:140px;">Fecha estimada</td><td style="padding:6px 0;color:#374151;font-weight:500;">${params.fechaRetiro}</td></tr>` : ''}
        ${params.horaRetiro ? `<tr><td style="padding:6px 0;color:#A89A8A;">Hora estimada</td><td style="padding:6px 0;color:#374151;font-weight:500;">${params.horaRetiro}</td></tr>` : ''}
        ${params.galpon ? `<tr><td style="padding:6px 0;color:#A89A8A;">Galpón</td><td style="padding:6px 0;color:#374151;font-weight:500;">${params.galpon}</td></tr>` : ''}
      </table>` : ''}
      ${productosHtml ? `<div style="margin-bottom:20px;"><p style="color:#374151;font-size:13px;font-weight:600;margin:0 0 6px;">Productos incluidos</p>${productosHtml}</div>` : ''}
      <p style="color:#A89A8A;font-size:12px;margin:0 0 4px;">⚠️ Guardá este email — necesitás el código para retirar.</p>
      <p style="color:#A89A8A;font-size:12px;margin:0 0 24px;">Consultas: <strong>11 6623-1866</strong></p>
      <p style="color:#A89A8A;font-size:13px;margin:0;line-height:1.6;">Saludos,<br/><strong style="color:#6B3A2A;">Wood Pallet</strong></p>`
    ),
  });
};
// ─── Envío de link de recuperación de contraseña ─────────────────────────────
export const sendPasswordRecoveryLink = async (params: {
  to: string;
  nombre: string;
  resetLink: string;
}) => {
  const transporter = crearTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await sendMailConLogo(transporter, {
    from,
    to: params.to,
    subject: 'Recuperación de contraseña · Wood Pallet',
    html: wrapEmail(
      'Recuperar contraseña',
      'Wood Pallet',
      `<p style="color:#374151;font-size:15px;margin:0 0 12px;">Hola <strong style="color:#2D1A0E;">${params.nombre}</strong>,</p>
      <p style="color:#6B7280;font-size:14px;line-height:1.7;margin:0 0 28px;">Recibimos una solicitud para recuperar el acceso a tu cuenta. Hacé clic en el botón para crear una nueva contraseña:</p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${params.resetLink}" style="display:inline-block;background:#6B3A2A;color:#FFFFFF;font-size:14px;font-weight:600;padding:13px 28px;border-radius:6px;text-decoration:none;">Crear nueva contraseña</a>
      </div>
      <p style="color:#A89A8A;font-size:12px;margin:0 0 4px;">⏱ Enlace válido por <strong>30 minutos</strong> (un solo uso).</p>
      <p style="color:#A89A8A;font-size:12px;margin:0 0 4px;">Si no solicitaste esto, podés ignorar este email.</p>
      <p style="color:#A89A8A;font-size:11px;word-break:break-all;margin:0 0 24px;">Enlace: ${params.resetLink}</p>
      <p style="color:#A89A8A;font-size:13px;margin:0;line-height:1.6;">Saludos,<br/><strong style="color:#6B3A2A;">Wood Pallet</strong></p>`
    ),
  });
};

// ─── Nueva cotización web: notificación interna a propietarios ────────────────

export const enviarNotificacionCotizacionWeb = async (params: {
  destinatarios: string[];
  nombre: string;
  empresa?: string;
  email: string;
  telefono?: string;
  tipoPallet?: string;
  cantidad?: number;
  fechaNecesidad?: string;
  tipoEntrega?: string;
  localidadEntrega?: string;
  requiereSenasa: boolean;
  observaciones?: string;
}) => {
  const transporter = crearTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const entregaLabel = params.tipoEntrega === 'envio' ? 'Envío a domicilio' : params.tipoEntrega === 'retira' ? 'Retira en galpón' : 'No especificado';
  const fechaStr = params.fechaNecesidad
    ? new Date(params.fechaNecesidad).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  await sendMailConLogo(transporter, {
    from: `"Wood Pallet" <${from}>`,
    to: params.destinatarios.join(', '),
    subject: `🌐 Nueva consulta desde woodpallets.com.ar — ${params.nombre}`,
    html: wrapEmail(
      'Nueva solicitud web',
      'woodpallets.com.ar',
      `<p style="color:#374151;font-size:14px;margin:0 0 20px;">Un cliente completó el formulario de cotización. <strong style="color:#2D1A0E;">Entrá al sistema para atenderlo.</strong></p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;font-size:13px;">
        <tr style="background:#FAF6F1;"><td style="padding:9px 12px;color:#A89A8A;border:1px solid #EDE4D8;width:130px;">Nombre</td><td style="padding:9px 12px;color:#2D1A0E;font-weight:600;border:1px solid #EDE4D8;">${params.nombre}</td></tr>
        ${params.empresa ? `<tr><td style="padding:9px 12px;color:#A89A8A;border:1px solid #EDE4D8;">Empresa</td><td style="padding:9px 12px;color:#374151;border:1px solid #EDE4D8;">${params.empresa}</td></tr>` : ''}
        <tr style="background:#FAF6F1;"><td style="padding:9px 12px;color:#A89A8A;border:1px solid #EDE4D8;">Email</td><td style="padding:9px 12px;border:1px solid #EDE4D8;"><a href="mailto:${params.email}" style="color:#6B3A2A;font-weight:500;">${params.email}</a></td></tr>
        ${params.telefono ? `<tr><td style="padding:9px 12px;color:#A89A8A;border:1px solid #EDE4D8;">Teléfono</td><td style="padding:9px 12px;border:1px solid #EDE4D8;"><a href="https://wa.me/549${params.telefono.replace(/\D/g, '')}" style="color:#25D366;">${params.telefono} 💬</a></td></tr>` : ''}
        ${params.tipoPallet ? `<tr style="background:#FAF6F1;"><td style="padding:9px 12px;color:#A89A8A;border:1px solid #EDE4D8;">Tipo de pallet</td><td style="padding:9px 12px;color:#2D1A0E;font-weight:600;border:1px solid #EDE4D8;">${params.tipoPallet}</td></tr>` : ''}
        ${params.cantidad != null ? `<tr><td style="padding:9px 12px;color:#A89A8A;border:1px solid #EDE4D8;">Cantidad</td><td style="padding:9px 12px;color:#2D1A0E;font-weight:600;border:1px solid #EDE4D8;">${params.cantidad} unidades</td></tr>` : ''}
        <tr style="background:#FAF6F1;"><td style="padding:9px 12px;color:#A89A8A;border:1px solid #EDE4D8;">Lo necesita para</td><td style="padding:9px 12px;color:#374151;border:1px solid #EDE4D8;">${fechaStr}</td></tr>
        <tr><td style="padding:9px 12px;color:#A89A8A;border:1px solid #EDE4D8;">Entrega</td><td style="padding:9px 12px;color:#374151;border:1px solid #EDE4D8;">${entregaLabel}${params.localidadEntrega ? ` · ${params.localidadEntrega}` : ''}</td></tr>
        ${params.requiereSenasa ? `<tr style="background:#FFFBEB;"><td style="padding:9px 12px;color:#92400E;font-weight:600;border:1px solid #FDE68A;">SENASA</td><td style="padding:9px 12px;color:#92400E;font-weight:600;border:1px solid #FDE68A;">⚠️ Requiere certificación</td></tr>` : ''}
        ${params.observaciones ? `<tr style="background:#FAF6F1;"><td style="padding:9px 12px;color:#A89A8A;border:1px solid #EDE4D8;vertical-align:top;">Observaciones</td><td style="padding:9px 12px;color:#374151;border:1px solid #EDE4D8;">${params.observaciones}</td></tr>` : ''}
      </table>
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;padding:12px 16px;font-size:13px;color:#166534;margin-bottom:16px;">📌 Ingresá a <strong>Cotizaciones → Solicitudes web</strong> para procesarla.</div>
      <p style="color:#A89A8A;font-size:11px;margin:0;">Wood Pallet Manager · Notificación automática</p>`
    ),
  });
};
