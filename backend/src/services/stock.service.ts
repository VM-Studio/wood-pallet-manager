import prisma from '../utils/prisma';
import { TipoMovimiento, MotivoMovimiento } from '@prisma/client';

export const getStockService = async (filtros?: {
  productoId?: number;
  proveedorId?: number;
  propietarioId?: number;
}) => {
  return prisma.stock.findMany({
    where: {
      ...(filtros?.productoId && { productoId: filtros.productoId }),
      ...(filtros?.proveedorId && { proveedorId: filtros.proveedorId }),
      ...(filtros?.propietarioId && { producto: { propietarioId: filtros.propietarioId } }),
    },
    include: {
      producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
      proveedor: { select: { id: true, nombreEmpresa: true } },
    },
    orderBy: { ultimaActualizacion: 'desc' },
  });
};

export const getStockBajoMinimoService = async () => {
  // Traer todos los stocks con mínimo definido y filtrar en memoria
  const stocks = await prisma.stock.findMany({
    where: { cantidadMinima: { not: null } },
    include: {
      producto: { select: { id: true, nombre: true } },
      proveedor: { select: { id: true, nombreEmpresa: true } },
    },
  });
  return stocks.filter((s) => s.cantidadDisponible < s.cantidadMinima!);
};

export const ajustarStockService = async (datos: {
  productoId: number;
  proveedorId: number;
  tipoMovimiento: TipoMovimiento;
  cantidad: number;
  motivo: MotivoMovimiento;
  idReferencia?: number;
  registradoPorId: number;
}) => {
  // Buscar o crear registro de stock
  let stock = await prisma.stock.findUnique({
    where: { productoId_proveedorId: { productoId: datos.productoId, proveedorId: datos.proveedorId } },
  });

  if (!stock) {
    stock = await prisma.stock.create({
      data: {
        productoId: datos.productoId,
        proveedorId: datos.proveedorId,
        cantidadDisponible: 0,
      },
    });
  }

  // Calcular nueva cantidad
  let nuevaCantidad = stock.cantidadDisponible;
  if (datos.tipoMovimiento === 'entrada') {
    nuevaCantidad += datos.cantidad;
  } else if (datos.tipoMovimiento === 'salida') {
    if (stock.cantidadDisponible < datos.cantidad) {
      throw new Error('Stock insuficiente para registrar la salida');
    }
    nuevaCantidad -= datos.cantidad;
  } else {
    // ajuste: la cantidad es el valor absoluto final
    nuevaCantidad = datos.cantidad;
  }

  // Actualizar stock y registrar movimiento en una transacción
  const [stockActualizado, movimiento] = await prisma.$transaction([
    prisma.stock.update({
      where: { id: stock.id },
      data: { cantidadDisponible: nuevaCantidad },
    }),
    prisma.movimientoStock.create({
      data: {
        stockId: stock.id,
        tipoMovimiento: datos.tipoMovimiento,
        cantidad: datos.cantidad,
        motivo: datos.motivo,
        idReferencia: datos.idReferencia,
        registradoPorId: datos.registradoPorId,
      },
    }),
  ]);

  return { stock: stockActualizado, movimiento };
};

export const getMovimientosStockService = async (stockId: number) => {
  return prisma.movimientoStock.findMany({
    where: { stockId },
    include: {
      registradoPor: { select: { id: true, nombre: true, apellido: true } },
    },
    orderBy: { fecha: 'desc' },
  });
};
