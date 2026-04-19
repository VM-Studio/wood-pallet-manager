import prisma from '../utils/prisma';

export const getLogisticasService = async () => {
  return prisma.logistica.findMany({
    include: {
      venta: {
        include: {
          cliente: { select: { razonSocial: true, nombreContacto: true, telefonoContacto: true } },
          detalles: { include: { producto: { select: { nombre: true } } } },
        },
      },
    },
    orderBy: { fechaRetiroGalpon: 'desc' },
  });
};

export const getLogisticaByVentaService = async (ventaId: number) => {
  const logistica = await prisma.logistica.findUnique({
    where: { ventaId },
    include: {
      venta: {
        include: {
          cliente: true,
          detalles: { include: { producto: true } },
        },
      },
    },
  });
  if (!logistica) throw new Error('Logística no encontrada');
  return logistica;
};

export const crearLogisticaService = async (
  data: {
    ventaId: number;
    nombreTransportista?: string;
    telefonoTransp?: string;
    fechaRetiroGalpon?: Date;
    horaRetiro?: Date;
    horaEstimadaEntrega?: Date;
    observaciones?: string;
    costoFlete?: number;
  },
  usuarioId: number,
  rol: string
) => {
  if (rol !== 'admin' && rol !== 'propietario_carlos') {
    throw new Error('Solo Carlos o un administrador puede crear logística');
  }

  const venta = await prisma.venta.findUnique({ where: { id: data.ventaId } });
  if (!venta) throw new Error('Venta no encontrada');

  const existente = await prisma.logistica.findUnique({ where: { ventaId: data.ventaId } });
  if (existente) throw new Error('Ya existe una logística para esta venta');

  const [logistica] = await prisma.$transaction([
    prisma.logistica.create({
      data: {
        ventaId: data.ventaId,
        nombreTransportista: data.nombreTransportista ?? '',
        telefonoTransp: data.telefonoTransp,
        fechaRetiroGalpon: data.fechaRetiroGalpon,
        horaRetiro: data.horaRetiro,
        horaEstimadaEntrega: data.horaEstimadaEntrega,
        costoFlete: data.costoFlete,
        observaciones: data.observaciones,
        registradoPorId: usuarioId,
        confTransportista: false,
        confCliente: false,
      },
    }),
    prisma.venta.update({
      where: { id: data.ventaId },
      data: { estadoPedido: 'en_transito' },
    }),
  ]);

  return logistica;
};

export const actualizarEstadoEntregaService = async (
  ventaId: number,
  estado: string,
  rol: string
) => {
  if (rol !== 'admin' && rol !== 'propietario_carlos') {
    throw new Error('Solo Carlos o un administrador puede actualizar el estado');
  }

  const logistica = await prisma.logistica.findUnique({ where: { ventaId } });
  if (!logistica) throw new Error('Logística no encontrada');

  const updateData: any = {};
  if (estado === 'entregado') {
    updateData.horaEntregaReal = new Date();
    updateData.confTransportista = true;
    updateData.estadoEntrega = 'entregado';
  } else {
    updateData.estadoEntrega = estado;
  }

  const [updated] = await prisma.$transaction([
    prisma.logistica.update({
      where: { ventaId },
      data: updateData,
    }),
    prisma.venta.update({
      where: { id: ventaId },
      data: { estadoPedido: estado as any },
    }),
  ]);

  return updated;
};

export const confirmarEntregaClienteService = async (ventaId: number) => {
  const logistica = await prisma.logistica.findUnique({ where: { ventaId } });
  if (!logistica) throw new Error('Logística no encontrada');

  return prisma.logistica.update({
    where: { ventaId },
    data: { confCliente: true },
  });
};

export const getEntregasDelDiaService = async () => {
  const hoy = new Date();
  // Usar UTC para evitar problemas de timezone
  const inicio = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate(), 0, 0, 0));
  const fin = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + 1, 0, 0, 0));

  return prisma.logistica.findMany({
    where: {
      fechaRetiroGalpon: {
        not: null,
        gte: inicio,
        lt: fin,
      },
    },
    include: {
      venta: {
        include: {
          cliente: { select: { razonSocial: true, nombreContacto: true, telefonoContacto: true } },
          detalles: { include: { producto: { select: { nombre: true } } } },
        },
      },
    },
    orderBy: { horaEstimadaEntrega: 'asc' },
  });
};
