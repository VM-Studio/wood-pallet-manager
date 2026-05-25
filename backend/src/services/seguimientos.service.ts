import prisma from '../utils/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'WoodPallet <noreply@woodpallet.com.ar>';

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export type SegmentoTipo =
  | 'activos'
  | 'cotizacion_sin_respuesta'
  | 'cotizacion_rechazada'
  | 'sin_actividad'
  | 'todos'
  | 'manual';

export interface BloqueEmail {
  tipo: 'header' | 'text' | 'image' | 'button' | 'footer';
  activo: boolean;
  // header
  logoUrl?: string;
  empresaNombre?: string;
  headerBg?: string;
  // text
  contenido?: string;
  // image
  imageUrl?: string;
  imageAlt?: string;
  // button
  botonTexto?: string;
  botonUrl?: string;
  botonColor?: string;
  // footer
  telefono?: string;
  emailEmpresa?: string;
  sitioWeb?: string;
}

// ─── SEGMENTACIÓN ────────────────────────────────────────────────────────────

export const getClientesPorSegmento = async (
  segmento: SegmentoTipo,
  diasCondicion?: number,
  clienteIdsManual?: number[]
) => {
  const hoy = new Date();

  if (segmento === 'todos') {
    return prisma.cliente.findMany({
      where: { activo: true, emailContacto: { not: null } },
      select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true },
    });
  }

  if (segmento === 'manual' && clienteIdsManual?.length) {
    return prisma.cliente.findMany({
      where: { id: { in: clienteIdsManual }, activo: true, emailContacto: { not: null } },
      select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true },
    });
  }

  if (segmento === 'activos') {
    const meses = diasCondicion ?? 3;
    const desde = new Date(hoy);
    desde.setMonth(desde.getMonth() - meses);
    const clientes = await prisma.cliente.findMany({
      where: {
        activo: true,
        emailContacto: { not: null },
        ventas: { some: { fechaVenta: { gte: desde } } },
      },
      select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true },
    });
    return clientes;
  }

  if (segmento === 'cotizacion_sin_respuesta') {
    const dias = diasCondicion ?? 5;
    const umbral = new Date(hoy);
    umbral.setDate(umbral.getDate() - dias);
    return prisma.cliente.findMany({
      where: {
        activo: true,
        emailContacto: { not: null },
        cotizaciones: {
          some: {
            estado: { in: ['enviada', 'en_seguimiento'] },
            fechaCotizacion: { lte: umbral },
          },
        },
      },
      select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true },
    });
  }

  if (segmento === 'cotizacion_rechazada') {
    return prisma.cliente.findMany({
      where: {
        activo: true,
        emailContacto: { not: null },
        cotizaciones: { some: { estado: 'rechazada' } },
      },
      select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true },
    });
  }

  if (segmento === 'sin_actividad') {
    const meses = diasCondicion ?? 3;
    const umbral = new Date(hoy);
    umbral.setMonth(umbral.getMonth() - meses);
    return prisma.cliente.findMany({
      where: {
        activo: true,
        emailContacto: { not: null },
        ventas: { some: {} }, // alguna vez compró
        NOT: { ventas: { some: { fechaVenta: { gte: umbral } } } },
      },
      select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true },
    });
  }

  return [];
};

// ─── PREVISUALIZAR SEGMENTO (sólo conteo + lista preview) ────────────────────

export const previsualizarSegmentoService = async (
  segmento: SegmentoTipo,
  diasCondicion?: number,
  clienteIdsManual?: number[]
) => {
  const clientes = await getClientesPorSegmento(segmento, diasCondicion, clienteIdsManual);
  return {
    total: clientes.length,
    preview: clientes.slice(0, 5).map(c => ({
      id: c.id,
      razonSocial: c.razonSocial,
      email: c.emailContacto,
    })),
  };
};

// ─── RENDER HTML DEL EMAIL ────────────────────────────────────────────────────

function renderBloquesHtml(bloques: BloqueEmail[], vars: Record<string, string>): string {
  const reemplazar = (txt: string) =>
    txt.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);

  const partes: string[] = [];

  for (const bloque of bloques) {
    if (!bloque.activo) continue;

    if (bloque.tipo === 'header') {
      const bg = bloque.headerBg || '#3c250f';
      partes.push(`
        <div style="background:${bg};padding:24px 32px;text-align:center;">
          ${bloque.logoUrl ? `<img src="${bloque.logoUrl}" alt="logo" style="height:60px;object-fit:contain;margin-bottom:8px;display:block;margin:0 auto 8px;" />` : ''}
          <p style="margin:0;color:#fff;font-size:22px;font-family:Georgia,serif;font-style:italic;font-weight:600;">
            ${reemplazar(bloque.empresaNombre || 'WoodPallet')}
          </p>
        </div>`);
    }

    if (bloque.tipo === 'text') {
      partes.push(`
        <div style="padding:24px 32px;font-family:Inter,Arial,sans-serif;font-size:15px;color:#374151;line-height:1.7;">
          ${reemplazar(bloque.contenido || '').replace(/\n/g, '<br/>')}
        </div>`);
    }

    if (bloque.tipo === 'image' && bloque.imageUrl) {
      partes.push(`
        <div style="padding:0 32px 16px;">
          <img src="${bloque.imageUrl}" alt="${bloque.imageAlt || ''}" style="width:100%;border-radius:4px;" />
        </div>`);
    }

    if (bloque.tipo === 'button' && bloque.botonTexto) {
      const bg = bloque.botonColor || '#3c250f';
      partes.push(`
        <div style="padding:8px 32px 24px;text-align:center;">
          <a href="${bloque.botonUrl || '#'}"
            style="display:inline-block;background:${bg};color:#fff;padding:12px 28px;text-decoration:none;font-family:Inter,Arial,sans-serif;font-weight:600;font-size:14px;letter-spacing:0.02em;">
            ${reemplazar(bloque.botonTexto)}
          </a>
        </div>`);
    }

    if (bloque.tipo === 'footer') {
      partes.push(`
        <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;text-align:center;font-family:Inter,Arial,sans-serif;font-size:12px;color:#9CA3AF;">
          <p style="margin:0 0 4px;font-weight:600;color:#6B7280;">WoodPallet</p>
          ${bloque.telefono ? `<p style="margin:0 0 2px;">${bloque.telefono}</p>` : ''}
          ${bloque.emailEmpresa ? `<p style="margin:0 0 2px;">${bloque.emailEmpresa}</p>` : ''}
          ${bloque.sitioWeb ? `<p style="margin:0;"><a href="${bloque.sitioWeb}" style="color:#9CA3AF;">${bloque.sitioWeb}</a></p>` : ''}
        </div>`);
    }
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
    <body style="margin:0;padding:0;background:#F3F4F6;">
      <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        ${partes.join('\n')}
      </div>
    </body></html>`;
}

// ─── OBTENER VARIABLES DE UN CLIENTE ─────────────────────────────────────────

async function getVariablesCliente(clienteId: number, vendedorNombre?: string): Promise<Record<string, string>> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      cotizaciones: {
        orderBy: { fechaCotizacion: 'desc' },
        take: 1,
        include: { usuario: { select: { nombre: true, apellido: true } } },
      },
    },
  });

  const ultimaCot = cliente?.cotizaciones[0];
  return {
    nombre_cliente: cliente?.razonSocial ?? '',
    monto_cotizacion: ultimaCot ? `$${Number(ultimaCot.totalConIva).toLocaleString('es-AR')}` : '',
    fecha_cotizacion: ultimaCot ? ultimaCot.fechaCotizacion.toLocaleDateString('es-AR') : '',
    vendedor: ultimaCot
      ? `${ultimaCot.usuario.nombre} ${ultimaCot.usuario.apellido}`
      : (vendedorNombre ?? 'WoodPallet'),
  };
}

// ─── ENVIAR CAMPAÑA ───────────────────────────────────────────────────────────

export const enviarCampanaService = async (
  datos: {
    nombre: string;
    asunto: string;
    segmento: SegmentoTipo;
    diasCondicion?: number;
    clienteIdsManual?: number[];
    bloques: BloqueEmail[];
    plantillaId?: number;
  },
  usuarioId: number
) => {
  const destinatarios = await getClientesPorSegmento(
    datos.segmento,
    datos.diasCondicion,
    datos.clienteIdsManual
  );

  if (destinatarios.length === 0) {
    throw new Error('No hay destinatarios para el segmento seleccionado');
  }

  // Crear registro de campaña
  const campana = await prisma.campanaSeguimiento.create({
    data: {
      nombre: datos.nombre,
      asunto: datos.asunto,
      segmento: datos.segmento,
      diasCondicion: datos.diasCondicion,
      bloques: datos.bloques as any,
      plantillaId: datos.plantillaId,
      enviadaPorId: usuarioId,
      totalDestinatarios: destinatarios.length,
      estado: 'enviado',
    },
  });

  // Crear registros de destinatarios
  await prisma.destinatarioCampana.createMany({
    data: destinatarios
      .filter(c => c.emailContacto)
      .map(c => ({
        campanaId: campana.id,
        clienteId: c.id,
        email: c.emailContacto!,
        enviado: false,
      })),
  });

  // Enviar emails en background (no bloqueante para el response)
  setImmediate(async () => {
    for (const dest of destinatarios.filter(c => c.emailContacto)) {
      try {
        const vars = await getVariablesCliente(dest.id);
        const html = renderBloquesHtml(datos.bloques, vars);
        const asuntoPersonalizado = datos.asunto.replace(/\{\{nombre_cliente\}\}/g, dest.razonSocial);

        await resend.emails.send({
          from: FROM_EMAIL,
          to: dest.emailContacto!,
          subject: asuntoPersonalizado,
          html,
        });

        await prisma.destinatarioCampana.updateMany({
          where: { campanaId: campana.id, clienteId: dest.id },
          data: { enviado: true, enviadoEn: new Date() },
        });
      } catch (err: any) {
        await prisma.destinatarioCampana.updateMany({
          where: { campanaId: campana.id, clienteId: dest.id },
          data: { error: String(err.message ?? err) },
        });
      }
    }
    // Actualizar total real enviado
    const enviados = await prisma.destinatarioCampana.count({
      where: { campanaId: campana.id, enviado: true },
    });
    await prisma.campanaSeguimiento.update({
      where: { id: campana.id },
      data: { totalDestinatarios: enviados },
    });
  });

  return { campanaId: campana.id, totalDestinatarios: destinatarios.length };
};

// ─── HISTORIAL DE CAMPAÑAS ────────────────────────────────────────────────────

export const getHistorialCampanasService = async () => {
  return prisma.campanaSeguimiento.findMany({
    orderBy: { enviadaEn: 'desc' },
    include: {
      enviadaPor: { select: { nombre: true, apellido: true, rol: true } },
      plantilla: { select: { nombre: true } },
      _count: { select: { destinatarios: true } },
    },
  });
};

export const getDetalleCampanaService = async (id: number) => {
  return prisma.campanaSeguimiento.findUnique({
    where: { id },
    include: {
      enviadaPor: { select: { nombre: true, apellido: true } },
      plantilla: { select: { nombre: true } },
      destinatarios: {
        include: { cliente: { select: { razonSocial: true } } },
        orderBy: { id: 'asc' },
      },
    },
  });
};

// ─── PLANTILLAS ───────────────────────────────────────────────────────────────

export const getPlantillasService = async () => {
  return prisma.plantillaEmail.findMany({
    where: { activa: true },
    orderBy: { creadaEn: 'desc' },
    include: { creadaPor: { select: { nombre: true, apellido: true } } },
  });
};

export const crearPlantillaService = async (
  datos: { nombre: string; asunto: string; bloques: BloqueEmail[] },
  usuarioId: number
) => {
  return prisma.plantillaEmail.create({
    data: {
      nombre: datos.nombre,
      asunto: datos.asunto,
      bloques: datos.bloques as any,
      creadaPorId: usuarioId,
    },
  });
};

export const actualizarPlantillaService = async (
  id: number,
  datos: { nombre?: string; asunto?: string; bloques?: BloqueEmail[] }
) => {
  return prisma.plantillaEmail.update({
    where: { id },
    data: {
      nombre: datos.nombre,
      asunto: datos.asunto,
      bloques: datos.bloques as any,
    },
  });
};

export const eliminarPlantillaService = async (id: number) => {
  return prisma.plantillaEmail.update({ where: { id }, data: { activa: false } });
};

// ─── AUTOMATIZACIONES ────────────────────────────────────────────────────────

export const getReglasService = async () => {
  return prisma.reglaAutomatizacion.findMany({
    orderBy: { creadaEn: 'desc' },
    include: {
      plantilla: { select: { nombre: true } },
      creadaPor: { select: { nombre: true, apellido: true } },
    },
  });
};

export const crearReglaService = async (
  datos: {
    nombre: string;
    evento: string;
    diasCondicion: number;
    plantillaId: number;
    asunto: string;
  },
  usuarioId: number
) => {
  return prisma.reglaAutomatizacion.create({
    data: { ...datos, creadaPorId: usuarioId },
  });
};

export const toggleReglaService = async (id: number) => {
  const regla = await prisma.reglaAutomatizacion.findUnique({ where: { id } });
  if (!regla) throw new Error('Regla no encontrada');
  return prisma.reglaAutomatizacion.update({
    where: { id },
    data: { activa: !regla.activa },
  });
};

export const eliminarReglaService = async (id: number) => {
  return prisma.reglaAutomatizacion.delete({ where: { id } });
};

// ─── SEGUIMIENTOS RECIBIDOS POR CLIENTE ──────────────────────────────────────

export const getSeguimientosDeClienteService = async (clienteId: number) => {
  return prisma.destinatarioCampana.findMany({
    where: { clienteId },
    orderBy: { enviadoEn: 'desc' },
    include: {
      campana: {
        select: { nombre: true, asunto: true, enviadaEn: true, segmento: true },
      },
    },
  });
};

// ─── EJECUTAR REGLAS AUTOMÁTICAS (llamado desde cron) ────────────────────────

export const ejecutarReglasAutomaticasService = async () => {
  const reglas = await prisma.reglaAutomatizacion.findMany({
    where: { activa: true },
    include: { plantilla: true, creadaPor: { select: { id: true, nombre: true, apellido: true } } },
  });

  let totalEnviados = 0;

  for (const regla of reglas) {
    const segmento: SegmentoTipo =
      regla.evento === 'cotizacion_sin_respuesta'
        ? 'cotizacion_sin_respuesta'
        : 'sin_actividad';

    const clientes = await getClientesPorSegmento(segmento, regla.diasCondicion);
    if (clientes.length === 0) continue;

    const bloques = regla.plantilla.bloques as unknown as BloqueEmail[];

    const campana = await prisma.campanaSeguimiento.create({
      data: {
        nombre: `[AUTO] ${regla.nombre}`,
        asunto: regla.asunto,
        segmento,
        diasCondicion: regla.diasCondicion,
        bloques: bloques as any,
        plantillaId: regla.plantillaId,
        enviadaPorId: regla.creadaPorId,
        totalDestinatarios: clientes.length,
        estado: 'enviado',
      },
    });

    await prisma.destinatarioCampana.createMany({
      data: clientes
        .filter(c => c.emailContacto)
        .map(c => ({
          campanaId: campana.id,
          clienteId: c.id,
          email: c.emailContacto!,
          enviado: false,
        })),
    });

    for (const dest of clientes.filter(c => c.emailContacto)) {
      try {
        const vars = await getVariablesCliente(dest.id);
        const html = renderBloquesHtml(bloques, vars);
        await resend.emails.send({
          from: FROM_EMAIL,
          to: dest.emailContacto!,
          subject: regla.asunto.replace(/\{\{nombre_cliente\}\}/g, dest.razonSocial),
          html,
        });
        await prisma.destinatarioCampana.updateMany({
          where: { campanaId: campana.id, clienteId: dest.id },
          data: { enviado: true, enviadoEn: new Date() },
        });
        totalEnviados++;
      } catch (err: any) {
        await prisma.destinatarioCampana.updateMany({
          where: { campanaId: campana.id, clienteId: dest.id },
          data: { error: String(err.message ?? err) },
        });
      }
    }
  }

  return totalEnviados;
};
