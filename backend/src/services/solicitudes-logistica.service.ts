import prisma from '../utils/prisma';

// Buscar usuario Carlos (destinatario fijo)
async function getCarlosId(): Promise<number> {
  const carlos = await prisma.usuario.findFirst({ where: { rol: 'propietario_carlos' } });
  if (!carlos) throw new Error('No se encontró el usuario Carlos');
  return carlos.id;
}

async function getJuanId(): Promise<number> {
  const juan = await prisma.usuario.findFirst({ where: { rol: 'propietario_juancruz' } });
  if (!juan) throw new Error('No se encontró el usuario Juan Cruz');
  return juan.id;
}

export async function crearSolicitudService(
  solicitanteId: number,
  data: {
    ventaId?: number;
    fechaEntrega?: string;
    cantidadUnidades?: number;
    ubicacionEntrega?: string;
    notas?: string;
  }
) {
  const destinatarioId = await getCarlosId();
  return prisma.solicitudLogistica.create({
    data: {
      ventaId: data.ventaId ?? null,
      solicitanteId,
      destinatarioId,
      fechaEntrega: data.fechaEntrega ? new Date(data.fechaEntrega) : null,
      cantidadUnidades: data.cantidadUnidades ?? null,
      ubicacionEntrega: data.ubicacionEntrega ?? null,
      notas: data.notas ?? null,
    },
    include: {
      venta: { include: { cliente: true } },
      solicitante: { select: { id: true, nombre: true, apellido: true } },
      destinatario: { select: { id: true, nombre: true, apellido: true } },
    },
  });
}

export async function getSolicitudesService(usuarioId: number, rol: string) {
  // Carlos ve las recibidas, Juan ve las enviadas
  if (rol === 'propietario_carlos') {
    return prisma.solicitudLogistica.findMany({
      where: { destinatarioId: usuarioId },
      orderBy: { fechaSolicitud: 'desc' },
      include: {
        venta: { include: { cliente: true, detalles: { include: { producto: true } } } },
        solicitante: { select: { id: true, nombre: true, apellido: true } },
      },
    });
  } else {
    return prisma.solicitudLogistica.findMany({
      where: { solicitanteId: usuarioId },
      orderBy: { fechaSolicitud: 'desc' },
      include: {
        venta: { include: { cliente: true } },
        destinatario: { select: { id: true, nombre: true, apellido: true } },
      },
    });
  }
}

export async function responderSolicitudService(
  id: number,
  usuarioId: number,
  estado: 'aceptada' | 'rechazada',
  notasRespuesta?: string
) {
  // Solo Carlos puede responder
  const solicitud = await prisma.solicitudLogistica.findUnique({ where: { id } });
  if (!solicitud) throw new Error('Solicitud no encontrada');
  if (solicitud.destinatarioId !== usuarioId) throw new Error('No tenés permiso para responder esta solicitud');

  // Si la solicitud es aceptada, además creamos la logística correspondiente y actualizamos la venta
  if (estado === 'aceptada') {
    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.solicitudLogistica.update({
        where: { id },
        data: {
          estado,
          fechaRespuesta: new Date(),
          notasRespuesta: notasRespuesta ?? null,
        },
        include: {
          venta: { include: { cliente: true, detalles: { include: { producto: true } } } },
          solicitante: { select: { id: true, nombre: true, apellido: true } },
        },
      });

      // Crear logística si no existe
      const existente = await tx.logistica.findUnique({ where: { ventaId: s.ventaId ?? 0 } });
      if (!existente && s.ventaId) {
        await tx.logistica.create({
          data: {
            ventaId: s.ventaId,
            nombreTransportista: '',
            telefonoTransp: null,
            fechaRetiroGalpon: s.fechaEntrega ?? null,
            horaEstimadaEntrega: s.fechaEntrega ?? null,
            estadoEntrega: 'pendiente',
            confTransportista: true, // Carlos confirmó coordinación telefónica
            confCliente: false,
            registradoPorId: usuarioId,
            observaciones: s.notas ?? undefined,
          },
        });

        // Actualizar estado de la venta a en_transito
        await tx.venta.update({ where: { id: s.ventaId! }, data: { estadoPedido: 'en_transito' } });
      }

      return s;
    });

    return updated;
  }

  return prisma.solicitudLogistica.update({
    where: { id },
    data: {
      estado,
      fechaRespuesta: new Date(),
      notasRespuesta: notasRespuesta ?? null,
    },
    include: {
      venta: { include: { cliente: true } },
      solicitante: { select: { id: true, nombre: true, apellido: true } },
    },
  });
}

export async function getSolicitudesPendientesService() {
  return prisma.solicitudLogistica.findMany({
    where: { estado: 'pendiente' },
    orderBy: { fechaSolicitud: 'asc' },
    include: {
      venta: { include: { cliente: true } },
      solicitante: { select: { id: true, nombre: true, apellido: true } },
      destinatario: { select: { id: true, nombre: true, apellido: true } },
    },
  });
}
