"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordRecoveryLink = exports.sendCodigoRetiro = exports.sendVerificationCode = exports.enviarRemitoFirmado = exports.enviarRemitoParaFirmar = exports.enviarPresupuestoPorEmail = exports.generarPdfRemito = exports.crearTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const crearTransporter = () => {
    return nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};
exports.crearTransporter = crearTransporter;
// ─── Genera el PDF del remito firmado ──────────────────────────────────────
const generarPdfRemito = (params) => {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        const ars = (v) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
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
        doc.text('Producto', 60, y + 7);
        doc.text('Cant.', 320, y + 7);
        doc.text('Precio u.', 370, y + 7);
        doc.text('Subtotal', 450, y + 7, { width: 90, align: 'right' });
        doc.fillColor('black');
        y += 22;
        params.productos.forEach((p, i) => {
            if (i % 2 === 0)
                doc.rect(50, y, 495, 18).fill('#FDF6EE');
            doc.fillColor('#374151').fontSize(9).font('Helvetica');
            doc.text(p.nombre, 60, y + 5, { width: 250 });
            doc.text(String(p.cantidad), 320, y + 5);
            doc.text(ars(p.precioUnitario), 365, y + 5);
            doc.text(ars(p.subtotal), 450, y + 5, { width: 90, align: 'right' });
            y += 18;
        });
        // Total
        doc.rect(50, y, 495, 22).fill('#F5EDE5');
        doc.fillColor('#6B3A2A').fontSize(10).font('Helvetica-Bold');
        doc.text('Total con IVA', 60, y + 6);
        doc.text(ars(params.totalConIva), 450, y + 6, { width: 90, align: 'right' });
        doc.fillColor('black');
        y += 34;
        // ── Firmas ───────────────────────────────────────────────────────────────
        const firmaY = Math.max(y + 20, 560);
        doc.fontSize(10).font('Helvetica-Bold').text('Firmas', 50, firmaY);
        doc.moveTo(50, firmaY + 14).lineTo(545, firmaY + 14).strokeColor('#E5E7EB').stroke();
        let firmaX = 50;
        const embedFirma = (base64, label, x) => {
            try {
                const dataUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
                const base64Data = dataUrl.split(',')[1];
                const imgBuffer = Buffer.from(base64Data, 'base64');
                doc.image(imgBuffer, x, firmaY + 20, { height: 70, fit: [200, 70] });
                doc.fontSize(8).font('Helvetica').fillColor('#6B7280')
                    .text(label, x, firmaY + 95, { width: 200 });
            }
            catch (_) { }
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
exports.generarPdfRemito = generarPdfRemito;
const enviarPresupuestoPorEmail = async (params) => {
    const transporter = (0, exports.crearTransporter)();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
        from: `"Wood Pallet" <${from}>`,
        to: params.destinatario,
        subject: `Presupuesto Wood Pallet #${String(params.numeroCotizacion).padStart(4, '0')}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%); padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Wood Pallet</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">Presupuesto #${String(params.numeroCotizacion).padStart(4, '0')}</p>
        </div>
        <div style="background: #FDF6EE; padding: 28px; border: 1px solid #C4895A; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">Estimado/a <strong>${params.razonSocial}</strong>,</p>
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
            Adjunto encontrará el presupuesto correspondiente a su consulta.
            Ante cualquier pregunta o modificación, no dude en contactarnos.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #6B3A2A;">
              <td style="padding: 10px 14px; color: white; font-size: 13px;">Número</td>
              <td style="padding: 10px 14px; color: white; font-size: 13px;">#${String(params.numeroCotizacion).padStart(4, '0')}</td>
            </tr>
            <tr style="background: #F5EDE5;">
              <td style="padding: 10px 14px; color: #6B3A2A; font-size: 13px;">Fecha</td>
              <td style="padding: 10px 14px; color: #374151; font-size: 13px;">${params.fecha}</td>
            </tr>
          </table>
          <p style="color: #9CA3AF; font-size: 12px; margin: 20px 0 0;">
            Saludos cordiales,<br/>
            <strong style="color: #6B3A2A;">Wood Pallet</strong>
          </p>
        </div>
      </div>
    `,
        attachments: [
            {
                filename: params.filename,
                content: params.pdfBase64,
                encoding: 'base64',
            },
        ],
    });
};
exports.enviarPresupuestoPorEmail = enviarPresupuestoPorEmail;
// ─── REMITO: enviar al cliente para que firme ──────────────────────────────
const enviarRemitoParaFirmar = async (params) => {
    const transporter = (0, exports.crearTransporter)();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const filaProductos = params.productos.map(p => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;color:#374151;">${p.nombre}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;color:#374151;text-align:center;">${p.cantidad}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;color:#374151;text-align:right;">${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(p.precioUnitario)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;font-weight:600;color:#111827;text-align:right;">${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(p.subtotal)}</td>
    </tr>
  `).join('');
    const firmaImg = params.firmaPropietarioBase64
        ? `<div style="margin-top:20px;"><p style="font-size:12px;color:#6B7280;margin:0 0 6px;">Firma del emisor:</p><img src="${params.firmaPropietarioBase64}" style="max-height:80px;border:1px solid #E5E7EB;border-radius:4px;" /></div>`
        : '';
    await transporter.sendMail({
        from: `"Wood Pallet" <${from}>`,
        to: params.destinatario,
        subject: `Remito Wood Pallet #${params.numeroRemito} — Firma requerida`,
        html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#6B3A2A 0%,#C4895A 100%);padding:24px 28px;border-radius:4px 4px 0 0;">
          <h1 style="color:white;margin:0;font-size:20px;">Wood Pallet</h1>
          <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px;">Remito #${params.numeroRemito}</p>
        </div>
        <div style="background:#FDF6EE;padding:28px;border:1px solid #C4895A;border-top:none;border-radius:0 0 4px 4px;">
          <p style="color:#374151;font-size:15px;margin:0 0 12px;">Estimado/a <strong>${params.razonSocial}</strong>,</p>
          <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Le enviamos el remito correspondiente a su pedido. Para confirmar la recepción y dar inicio al proceso de entrega,
            por favor <strong>firmelo digitalmente</strong> haciendo clic en el botón a continuación.
          </p>

          <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
            <thead>
              <tr style="background:#6B3A2A;">
                <th style="padding:10px 12px;color:white;font-size:12px;text-align:left;">Producto</th>
                <th style="padding:10px 12px;color:white;font-size:12px;text-align:center;">Cant.</th>
                <th style="padding:10px 12px;color:white;font-size:12px;text-align:right;">Precio u.</th>
                <th style="padding:10px 12px;color:white;font-size:12px;text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${filaProductos}</tbody>
            <tfoot>
              <tr style="background:#F5EDE5;">
                <td colspan="3" style="padding:10px 12px;font-size:13px;font-weight:600;color:#6B3A2A;">Total con IVA</td>
                <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#111827;text-align:right;">${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(params.totalConIva)}</td>
              </tr>
            </tfoot>
          </table>

          <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
            <tr style="background:#F9FAFB;">
              <td style="padding:8px 12px;font-size:12px;color:#9CA3AF;border:1px solid #E5E7EB;">Fecha de emisión</td>
              <td style="padding:8px 12px;font-size:13px;color:#374151;border:1px solid #E5E7EB;">${params.fechaEmision}</td>
            </tr>
            ${params.fechaEntrega ? `<tr><td style="padding:8px 12px;font-size:12px;color:#9CA3AF;border:1px solid #E5E7EB;">Fecha de entrega estimada</td><td style="padding:8px 12px;font-size:13px;color:#374151;border:1px solid #E5E7EB;">${params.fechaEntrega}</td></tr>` : ''}
          </table>

          ${firmaImg}

          <div style="text-align:center;margin:28px 0 8px;">
            <a href="${params.linkFirma}" style="display:inline-block;background:linear-gradient(135deg,#6B3A2A 0%,#C4895A 100%);color:white;text-decoration:none;padding:14px 32px;border-radius:4px;font-size:15px;font-weight:600;">
              ✍️ Firmar remito
            </a>
          </div>
          <p style="text-align:center;font-size:11px;color:#9CA3AF;margin:8px 0 0;">O copiá este enlace: <a href="${params.linkFirma}" style="color:#C4895A;">${params.linkFirma}</a></p>

          <p style="color:#9CA3AF;font-size:12px;margin:24px 0 0;">
            Saludos cordiales,<br/><strong style="color:#6B3A2A;">Wood Pallet</strong>
          </p>
        </div>
      </div>
    `,
    });
};
exports.enviarRemitoParaFirmar = enviarRemitoParaFirmar;
// ─── REMITO: enviar copia firmada a ambas partes ───────────────────────────
const enviarRemitoFirmado = async (params) => {
    const transporter = (0, exports.crearTransporter)();
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
    let pdfBuffer;
    try {
        pdfBuffer = await (0, exports.generarPdfRemito)({
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
    }
    catch (_) { /* si falla la generación del PDF se envía igual sin adjunto */ }
    await transporter.sendMail({
        from: `"Wood Pallet" <${from}>`,
        to: params.destinatario,
        subject: titulo,
        html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#6B3A2A 0%,#C4895A 100%);padding:24px 28px;border-radius:4px 4px 0 0;">
          <h1 style="color:white;margin:0;font-size:20px;">Wood Pallet</h1>
          <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px;">Remito #${params.numeroRemito} — Firmado ✅</p>
        </div>
        <div style="background:#FDF6EE;padding:28px;border:1px solid #C4895A;border-top:none;border-radius:0 0 4px 4px;">
          <p style="color:#374151;font-size:15px;margin:0 0 16px;">
            ${esParaPropietario ? 'Estimado equipo Wood Pallet,' : `Estimado/a <strong>${params.razonSocial}</strong>,`}
          </p>
          <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">${mensajePrincipal}</p>

          <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0 0 12px;font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.05em;">Firmas del documento</p>
            ${firmaPropImg}
            ${firmaClienteImg}
          </div>

          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:4px;padding:12px 16px;font-size:13px;color:#1E40AF;">
            📎 El documento PDF con ambas firmas se encuentra adjunto en este correo.
          </div>

          <p style="color:#9CA3AF;font-size:12px;margin:24px 0 0;">
            Saludos cordiales,<br/><strong style="color:#6B3A2A;">Wood Pallet</strong>
          </p>
        </div>
      </div>
    `,
        attachments: pdfBuffer ? [
            {
                filename: `Remito-${params.numeroRemito}-firmado.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ] : [],
    });
};
exports.enviarRemitoFirmado = enviarRemitoFirmado;
// ─── Envío de código de verificación ─────────────────────────────────────────
const tipoLabels = {
    cambio_password: 'Cambio de contraseña',
    cambio_email: 'Cambio de email',
    cambio_telefono: 'Cambio de teléfono',
    recuperacion_password: 'Recuperación de contraseña',
};
const sendVerificationCode = async (params) => {
    const transporter = (0, exports.crearTransporter)();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const accion = tipoLabels[params.tipo] || 'Verificación';
    await transporter.sendMail({
        from,
        to: params.to,
        subject: `${params.codigo} — Tu código de verificación · Wood Pallet`,
        html: `
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#F9F7F5;padding:40px 20px;min-height:100vh;">
        <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:#3c250f;padding:28px 32px;">
            <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 4px;">Wood Pallet</p>
            <h1 style="color:#FFFFFF;font-size:20px;font-weight:700;margin:0;">Código de verificación</h1>
          </div>
          <div style="padding:32px;">
            <p style="color:#374151;font-size:15px;margin:0 0 8px;">Hola <strong>${params.nombre}</strong>,</p>
            <p style="color:#6B7280;font-size:14px;margin:0 0 28px;">Recibimos una solicitud de <strong>${accion}</strong> en tu cuenta. Usá el siguiente código para continuar:</p>
            <div style="background:#FDF6EE;border:2px dashed #D97706;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <p style="color:#92400E;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Tu código</p>
              <p style="color:#3c250f;font-size:42px;font-weight:800;letter-spacing:0.18em;margin:0;font-variant-numeric:tabular-nums;">${params.codigo}</p>
            </div>
            <p style="color:#9CA3AF;font-size:12px;margin:0 0 4px;">⏱ Este código expira en <strong>15 minutos</strong>.</p>
            <p style="color:#9CA3AF;font-size:12px;margin:0 0 24px;">Si no solicitaste este código, podés ignorar este email. Tu cuenta permanece segura.</p>
            <p style="color:#9CA3AF;font-size:12px;margin:0;">Saludos,<br/><strong style="color:#6B3A2A;">Wood Pallet</strong></p>
          </div>
        </div>
      </div>
    `,
    });
};
exports.sendVerificationCode = sendVerificationCode;
// ─── Código único de retiro ──────────────────────────────────────────────────
const sendCodigoRetiro = async (params) => {
    const transporter = (0, exports.crearTransporter)();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const productosHtml = params.productos?.length
        ? `<ul style="margin:8px 0 0;padding-left:20px;color:#374151;font-size:14px;">
        ${params.productos.map(p => `<li>${p.nombre} × ${p.cantidad}</li>`).join('')}
       </ul>`
        : '';
    await transporter.sendMail({
        from,
        to: params.to,
        subject: `Código de retiro ${params.codigoRetiro} · Wood Pallet`,
        html: `
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#F9F7F5;padding:40px 20px;min-height:100vh;">
        <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:#3c250f;padding:28px 32px;">
            <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 4px;">Wood Pallet · Retiro en galpón</p>
            <h1 style="color:#FFFFFF;font-size:20px;font-weight:700;margin:0;">Tu pedido está listo para retirar</h1>
          </div>
          <div style="padding:32px;">
            <p style="color:#374151;font-size:15px;margin:0 0 8px;">Hola <strong>${params.nombre}</strong>,</p>
            <p style="color:#6B7280;font-size:14px;margin:0 0 24px;">Tu pedido fue confirmado. Este es tu código único de retiro — presentalo en el galpón al momento de retirar la mercadería.</p>

            <div style="background:#FEF3E2;border:2px solid #F9C97C;border-radius:12px;padding:24px 32px;text-align:center;margin-bottom:28px;">
              <p style="color:#92400E;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Código de retiro</p>
              <p style="color:#3c250f;font-size:36px;font-weight:800;letter-spacing:4px;margin:0;font-family:monospace;">${params.codigoRetiro}</p>
            </div>

            ${params.fechaRetiro || params.horaRetiro || params.galpon ? `
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              ${params.fechaRetiro ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;width:140px;">Fecha estimada</td><td style="padding:6px 0;color:#374151;font-size:13px;font-weight:500;">${params.fechaRetiro}</td></tr>` : ''}
              ${params.horaRetiro ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Hora estimada</td><td style="padding:6px 0;color:#374151;font-size:13px;font-weight:500;">${params.horaRetiro}</td></tr>` : ''}
              ${params.galpon ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Galpón</td><td style="padding:6px 0;color:#374151;font-size:13px;font-weight:500;">${params.galpon}</td></tr>` : ''}
            </table>` : ''}

            ${productosHtml ? `<div style="margin-bottom:24px;"><p style="color:#374151;font-size:13px;font-weight:600;margin:0 0 4px;">Productos incluidos</p>${productosHtml}</div>` : ''}

            <p style="color:#9CA3AF;font-size:12px;margin:0 0 4px;">⚠️ Guardá este email — necesitás el código para retirar tu pedido.</p>
            <p style="color:#9CA3AF;font-size:12px;margin:0 0 24px;">Si tenés alguna consulta, comunicate con nosotros al <strong>11 6623-1866</strong>.</p>
            <p style="color:#9CA3AF;font-size:12px;margin:0;">Saludos,<br/><strong style="color:#6B3A2A;">Wood Pallet</strong></p>
          </div>
        </div>
      </div>
    `,
    });
};
exports.sendCodigoRetiro = sendCodigoRetiro;
// ─── Envío de link de recuperación de contraseña ─────────────────────────────
const sendPasswordRecoveryLink = async (params) => {
    const transporter = (0, exports.crearTransporter)();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
        from,
        to: params.to,
        subject: 'Recuperación de contraseña · Wood Pallet',
        html: `
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#F9F7F5;padding:40px 20px;min-height:100vh;">
        <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:#3c250f;padding:28px 32px;">
            <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 4px;">Wood Pallet</p>
            <h1 style="color:#FFFFFF;font-size:20px;font-weight:700;margin:0;">Recuperar contraseña</h1>
          </div>
          <div style="padding:32px;">
            <p style="color:#374151;font-size:15px;margin:0 0 8px;">Hola <strong>${params.nombre}</strong>,</p>
            <p style="color:#6B7280;font-size:14px;margin:0 0 28px;">Recibimos una solicitud para recuperar el acceso a tu cuenta. Hacé clic en el botón para crear una nueva contraseña:</p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${params.resetLink}" style="display:inline-block;background:#3c250f;color:#FFFFFF;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                Crear nueva contraseña
              </a>
            </div>
            <p style="color:#9CA3AF;font-size:12px;margin:0 0 4px;">⏱ Este enlace expira en <strong>30 minutos</strong> y es de un solo uso.</p>
            <p style="color:#9CA3AF;font-size:12px;margin:0 0 24px;">Si no solicitaste esto, podés ignorar este email. Tu contraseña no va a cambiar.</p>
            <p style="color:#9CA3AF;font-size:11px;word-break:break-all;margin:0 0 24px;">Si el botón no funciona, copiá este enlace: ${params.resetLink}</p>
            <p style="color:#9CA3AF;font-size:12px;margin:0;">Saludos,<br/><strong style="color:#6B3A2A;">Wood Pallet</strong></p>
          </div>
        </div>
      </div>
    `,
    });
};
exports.sendPasswordRecoveryLink = sendPasswordRecoveryLink;
