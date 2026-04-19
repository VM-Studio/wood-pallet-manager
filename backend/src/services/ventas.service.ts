import prisma from '../utils/prisma';

export const getVentasService = async (usuarioId: number, rol: string) => {
  const where = rol === 'admin' ? {} : { usuarioId };

  return prisma.venta.findMany({
    where,
    include: {
      cliente: { select: { id: true, razonSocial: true, telefonoContacto: true } },
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      detalles: {
        include: {
          producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
          retiros: true,
        },
      },
      facturas: { select: { id: true, estadoCobro: true, totalConIva: true } },
      logistica: { select: { id: true, estadoEntrega: true, fechaRetiroGalpon: true } },
    },
    orderBy: { fechaVenta: 'desc' },
  });
};

export const getVentaByIdService = async (id: number) => {
  const venta = await prisma.venta.findUnique({
    where: { id },
    include: {
      cliente: true,
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      cotizacion: { select: { id: true, fechaCotizacion: true } },
      detalles: {
        include: {
          producto: true,
          especificacion: true,
          retiros: {
            include: {
              registradoPor: { select: { nombre: true, apellido: true } },
            },
            orderBy: { fechaRetiro: 'desc' },
          },
        },
      },
      facturas: { include: { pagos: true } },
      logistica: true,
    },
  });
  if (!venta) throw new Error('Venta no encontrada');
  return venta;
};

export const actualizarEstadoVentaService = async (
  id: number,
  estado:
    | 'confirmado'
    | 'en_preparacion'
    | 'listo_para_envio'
    | 'en_transito'
    | 'entregado'
    | 'entregado_parcial'
    | 'cancelado'
) => {
  const venta = await prisma.venta.findUnique({ where: { id } });
  if (!venta) throw new Error('Venta no encontrada');

  return prisma.venta.update({
    where: { id },
    data: {
      estadoPedido: estado,
      fechaEntregaReal: estado === 'entregado' ? new Date() : undefined,
    },
  });
};

export const registrarRetiroParcialService = async (
  detalleVentaId: number,
  cantidadRetirada: number,
  usuarioId: number
) => {
  const detalle = await prisma.detalleVenta.findUnique({
    where: { id: detalleVentaId },
    include: { retiros: true, venta: true },
  });
  if (!detalle) throw new Error('Detalle de venta no encontrado');

  const totalRetirado = detalle.retiros.reduce((acc, r) => acc + r.cantidadRetirada, 0);
  const pendienteRetiro = detalle.cantidadPedida - totalRetirado;

  if (cantidadRetirada > pendienteRetiro) {
    throw new Error(`Solo quedan ${pendienteRetiro} unidades pendientes de retiro`);
  }

  const retiro = await prisma.retiroParcial.create({
    data: { detalleVentaId, cantidadRetirada, registradoPorId: usuarioId },
  });

  const nuevaCantidadEntregada = totalRetirado + cantidadRetirada;
  await prisma.detalleVenta.update({
    where: { id: detalleVentaId },
    data: { cantidadEntregada: nuevaCantidadEntregada },
  });

  // Descontar del stock
  const stockEntry = await prisma.stock.findFirst({
    where: { productoId: detalle.productoId },
  });
  if (stockEntry) {
    await prisma.stock.update({
      where: { id: stockEntry.id },
      data: { cantidadDisponible: { decrement: cantidadRetirada } },
    });
    await prisma.movimientoStock.create({
      data: {
        stockId: stockEntry.id,
        tipoMovimiento: 'salida',
        cantidad: cantidadRetirada,
        motivo: 'venta',
        idReferencia: detalle.ventaId,
        registradoPorId: usuarioId,
      },
    });
  }

  // Actualizar estado de la venta
  const todosDetalles = await prisma.detalleVenta.findMany({
    where: { ventaId: detalle.ventaId },
    include: { retiros: true },
  });

  const todosEntregados = todosDetalles.every((d) => {
    const totalD = d.retiros.reduce((acc, r) => acc + r.cantidadRetirada, 0);
    return totalD >= d.cantidadPedida;
  });

  await prisma.venta.update({
    where: { id: detalle.ventaId },
    data: {
      estadoPedido: todosEntregados ? 'entregado' : 'entregado_parcial',
      fechaEntregaReal: todosEntregados ? new Date() : undefined,
    },
  });

  const detalleActualizado = await prisma.detalleVenta.findUnique({
    where: { id: detalleVentaId },
    include: { retiros: true },
  });
  const totalRetiradoFinal = detalleActualizado!.retiros.reduce(
    (acc, r) => acc + r.cantidadRetirada,
    0
  );

  return {
    retiro,
    resumen: {
      cantidadPedida: detalle.cantidadPedida,
      cantidadRetirada: totalRetiradoFinal,
      cantidadPendiente: detalle.cantidadPedida - totalRetiradoFinal,
    },
  };
};

export const getResumenRetiroService = async (ventaId: number) => {
  const detalles = await prisma.detalleVenta.findMany({
    where: { ventaId },
    include: {
      producto: { select: { nombre: true } },
      retiros: { orderBy: { fechaRetiro: 'desc' } },
    },
  });

  return detalles.map((d) => {
    const totalRetirado = d.retiros.reduce((acc, r) => acc + r.cantidadRetirada, 0);
    return {
      detalleId: d.id,
      producto: d.producto.nombre,
      cantidadPedida: d.cantidadPedida,
      cantidadRetirada: totalRetirado,
      cantidadPendiente: d.cantidadPedida - totalRetirado,
      porcentajeEntregado: Math.round((totalRetirado / d.cantidadPedida) * 100),
      retiros: d.retiros,
    };
  });
};

export const getVentasActivasService = async () => {
  return prisma.venta.findMany({
    where: {
      estadoPedido: {
        in: [
          'confirmado',
          'en_preparacion',
          'listo_para_envio',
          'en_transito',
          'entregado_parcial',
        ],
      },
    },
    include: {
      cliente: { select: { id: true, razonSocial: true } },
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      cotizacion: { select: { costoFlete: true } },
      detalles: {
        include: {
          producto: { select: { nombre: true } },
        },
      },
      logistica: {
        select: { estadoEntrega: true, fechaRetiroGalpon: true, horaEstimadaEntrega: true },
      },
    },
    orderBy: { fechaVenta: 'asc' },
  });
};

export const getVentasPorPeriodoService = async (
  desde: Date,
  hasta: Date,
  usuarioId?: number
) => {
  const where: any = { fechaVenta: { gte: desde, lte: hasta } };
  if (usuarioId) where.usuarioId = usuarioId;

  const ventas = await prisma.venta.findMany({
    where,
    include: {
      cliente: { select: { razonSocial: true } },
      usuario: { select: { nombre: true, apellido: true, rol: true } },
      detalles: {
        include: { producto: { select: { nombre: true, tipo: true } } },
      },
      facturas: { select: { estadoCobro: true, totalConIva: true } },
    },
    orderBy: { fechaVenta: 'desc' },
  });

  const totalPallets = ventas.reduce(
    (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
    0
  );
  const totalFacturado = ventas.reduce(
    (acc, v) => acc + Number(v.totalConIva || 0),
    0
  );

  return {
    ventas,
    resumen: { totalVentas: ventas.length, totalPallets, totalFacturado },
  };
};
