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
