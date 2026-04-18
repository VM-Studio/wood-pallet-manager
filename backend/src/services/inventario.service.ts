import prisma from '../utils/prisma';

export const getStockService = async () => {
  const stock = await prisma.stock.findMany({
    include: {
      producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
      proveedor: { select: { id: true, nombreEmpresa: true } },
    },
    orderBy: { producto: { nombre: 'asc' } },
  });

  return stock.map((s) => ({
    ...s,
    bajoMinimo: s.cantidadMinima !== null && s.cantidadDisponible <= s.cantidadMinima,
  }));
};

export const getAlertasStockService = async () => {
  const stock = await prisma.stock.findMany({
    where: { cantidadMinima: { not: null } },
    include: {
      producto: { select: { id: true, nombre: true, tipo: true } },
      proveedor: { select: { id: true, nombreEmpresa: true } },
    },
  });

  return stock
    .filter((s) => s.cantidadDisponible <= (s.cantidadMinima || 0))
    .map((s) => ({
      stockId: s.id,
      producto: s.producto,
      proveedor: s.proveedor,
      cantidadDisponible: s.cantidadDisponible,
      cantidadMinima: s.cantidadMinima,
      deficit: (s.cantidadMinima || 0) - s.cantidadDisponible,
    }));
};

export const getMovimientosStockService = async (
  productoId?: number,
  proveedorId?: number
) => {
  const where: any = {};
  if (productoId || proveedorId) {
    const stockConditions: any = {};
    if (productoId) stockConditions.productoId = productoId;
    if (proveedorId) stockConditions.proveedorId = proveedorId;
    where.stock = stockConditions;
  }

  return prisma.movimientoStock.findMany({
    where,
    include: {
      stock: {
        include: {
          producto: { select: { nombre: true, tipo: true } },
          proveedor: { select: { nombreEmpresa: true } },
        },
      },
      registradoPor: { select: { nombre: true, apellido: true } },
    },
    orderBy: { fecha: 'desc' },
    take: 100,
  });
};

export const ajustarStockService = async (
  stockId: number,
  nuevaCantidad: number,
  motivo: string,
  usuarioId: number
) => {
  const stock = await prisma.stock.findUnique({ where: { id: stockId } });
  if (!stock) throw new Error('Registro de stock no encontrado');

  const diferencia = nuevaCantidad - stock.cantidadDisponible;

  await prisma.stock.update({
    where: { id: stockId },
    data: { cantidadDisponible: nuevaCantidad },
  });

  await prisma.movimientoStock.create({
    data: {
      stockId,
      tipoMovimiento: 'ajuste',
      cantidad: Math.abs(diferencia),
      motivo: 'ajuste_manual',
      registradoPorId: usuarioId,
    },
  });

  return {
    mensaje: 'Stock ajustado correctamente',
    cantidadAnterior: stock.cantidadDisponible,
    cantidadNueva: nuevaCantidad,
    diferencia,
  };
};

export const getStockConsolidadoService = async () => {
  const stock = await prisma.stock.findMany({
    include: {
      producto: { select: { id: true, nombre: true } },
      proveedor: { select: { id: true, nombreEmpresa: true } },
    },
    orderBy: [
      { producto: { nombre: 'asc' } },
      { proveedor: { nombreEmpresa: 'asc' } },
    ],
  });

  return stock.map(s => ({
    stockId: s.id,
    productoId: s.productoId,
    proveedorId: s.proveedorId,
    productoNombre: s.producto.nombre,
    proveedorNombre: s.proveedor.nombreEmpresa,
    cantidadDisponible: s.cantidadDisponible,
    cantidadMinima: s.cantidadMinima ?? undefined,
    bajoMinimo:
      s.cantidadMinima !== null && s.cantidadDisponible <= s.cantidadMinima,
  }));
};
