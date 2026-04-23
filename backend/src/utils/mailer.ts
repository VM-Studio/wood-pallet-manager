import nodemailer from 'nodemailer';

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
                <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#111827;text-align:right;">${new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(params.totalConIva)}</td>
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

// ─── REMITO: enviar copia firmada a ambas partes ───────────────────────────

export const enviarRemitoFirmado = async (params: {
  destinatario: string;
  razonSocial: string;
  numeroRemito: string;
  fechaEmision: string;
  firmaPropietarioBase64?: string;
  firmaClienteBase64?: string;
  esCopia: 'propietario' | 'cliente';
}) => {
  const transporter = crearTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const titulo = params.esCopia === 'propietario'
    ? `Remito #${params.numeroRemito} firmado por ${params.razonSocial}`
    : `Tu remito #${params.numeroRemito} — Copia firmada`;

  const firmas = [
    params.firmaPropietarioBase64 ? `<div style="margin-bottom:16px;"><p style="font-size:12px;color:#6B7280;margin:0 0 6px;">Firma Wood Pallet:</p><img src="${params.firmaPropietarioBase64}" style="max-height:80px;border:1px solid #E5E7EB;border-radius:4px;" /></div>` : '',
    params.firmaClienteBase64 ? `<div><p style="font-size:12px;color:#6B7280;margin:0 0 6px;">Firma cliente (${params.razonSocial}):</p><img src="${params.firmaClienteBase64}" style="max-height:80px;border:1px solid #E5E7EB;border-radius:4px;" /></div>` : '',
  ].join('');

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
            ${params.esCopia === 'cliente' ? `Estimado/a <strong>${params.razonSocial}</strong>,` : 'El remito fue firmado correctamente por ambas partes.'}
          </p>
          <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">
            ${params.esCopia === 'cliente'
              ? 'A continuación encontrás tu copia del remito firmado. Guardalo como comprobante.'
              : `El cliente <strong>${params.razonSocial}</strong> firmó el remito #${params.numeroRemito}. A continuación las firmas de ambas partes.`
            }
          </p>
          <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:16px;margin-bottom:16px;">
            ${firmas}
          </div>
          <p style="color:#9CA3AF;font-size:12px;margin:16px 0 0;">
            Saludos cordiales,<br/><strong style="color:#6B3A2A;">Wood Pallet</strong>
          </p>
        </div>
      </div>
    `,
  });
};
