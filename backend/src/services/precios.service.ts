import prisma from '../utils/prisma';

export const getListaPreciosService = async (productoId?: number) => {
  const where: any = {
    OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }],
  };
  if (productoId) where.productoId = productoId;

  return prisma.listaPrecio.findMany({
    where,
    include: {
      producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
      creadoPor: { select: { id: true, nombre: true, apellido: true } },
    },
    orderBy: [{ productoId: 'asc' }, { cantMinima: 'asc' }],
  });
};

export const calcularPrecioService = async (productoId: number, cantidad: number) => {
  const precio = await prisma.listaPrecio.findFirst({
    where: {
      productoId,
      cantMinima: { lte: cantidad },
      OR: [{ cantMaxima: null }, { cantMaxima: { gte: cantidad } }],
      AND: [
        { OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }] },
      ],
    },
    orderBy: { cantMinima: 'desc' },
  });

  const base = precio ?? (await prisma.listaPrecio.findFirst({
    where: {
      productoId,
      OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }],
    },
    orderBy: { cantMinima: 'asc' },
  }));

  if (!base) throw new Error('No hay precio configurado para este producto');

  return {
    precioUnitario: base.precioUnitario,
    cantMinima: base.cantMinima,
    cantMaxima: base.cantMaxima,
    bonificaFlete: base.bonificaFlete,
    subtotal: Number(base.precioUnitario) * cantidad,
    subtotalConIva: Number(base.precioUnitario) * cantidad * 1.21,
    escalon: base.cantMaxima
      ? `${base.cantMinima} a ${base.cantMaxima} unidades`
      : `Desde ${base.cantMinima} unidades`,
  };
};

export const crearPrecioService = async (
  datos: {
    productoId: number;
    precioUnitario: number;
    margenPct?: number;
    cantMinima: number;
    cantMaxima?: number;
    bonificaFlete?: boolean;
    vigentDesde?: Date;
    vigentHasta?: Date;
    observaciones?: string;
  },
  usuarioId: number
) => {
  const precioAnterior = await prisma.listaPrecio.findFirst({
    where: {
      productoId: datos.productoId,
      cantMinima: datos.cantMinima,
      OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }],
    },
  });

  if (precioAnterior) {
    await prisma.historialPrecio.create({
      data: {
        productoId: datos.productoId,
        precioAnterior: precioAnterior.precioUnitario,
        precioNuevo: datos.precioUnitario,
        motivo: datos.observaciones || 'Actualización de precio',
        registradoPorId: usuarioId,
      },
    });
    await prisma.listaPrecio.update({
      where: { id: precioAnterior.id },
      data: { vigentHasta: new Date() },
    });
  }

  return prisma.listaPrecio.create({
    data: { ...datos, creadoPorId: usuarioId },
    include: {
      producto: { select: { id: true, nombre: true, tipo: true } },
    },
  });
};

export const getHistorialPreciosService = async (productoId: number) => {
  return prisma.historialPrecio.findMany({
    where: { productoId },
    include: {
      producto: { select: { nombre: true } },
      registradoPor: { select: { nombre: true, apellido: true } },
    },
    orderBy: { fechaCambio: 'desc' },
  });
};

export const actualizarPrecioProveedorService = async (
  productoId: number,
  proveedorId: number,
  nuevoPrecioCosto: number,
  usuarioId: number
) => {
  const prodProv = await prisma.productoProveedor.findFirst({
    where: { productoId, proveedorId },
  });
  if (!prodProv) throw new Error('No se encontró la relación producto-proveedor');

  await prisma.productoProveedor.update({
    where: { id: prodProv.id },
    data: { precioCosto: nuevoPrecioCosto, fechaActualizacion: new Date() },
  });

  await prisma.historialPrecio.create({
    data: {
      productoId,
      precioAnterior: prodProv.precioCosto,
      precioNuevo: nuevoPrecioCosto,
      motivo: 'Actualización de precio del proveedor',
      registradoPorId: usuarioId,
    },
  });

  return { mensaje: 'Precio del proveedor actualizado correctamente' };
};

export const getEscalonesProductoService = async (productoId: number) => {
  const escalones = await prisma.listaPrecio.findMany({
    where: {
      productoId,
      OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }],
    },
    orderBy: { cantMinima: 'asc' },
  });

  const prodProv = await prisma.productoProveedor.findFirst({
    where: { productoId },
    orderBy: { fechaActualizacion: 'desc' },
  });

  return {
    escalones,
    precioCostoActual: prodProv?.precioCosto ?? null,
  };
};
