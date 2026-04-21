import prisma from '../utils/prisma';
import { TipoProductoProveedor } from '@prisma/client';

export const getProveedoresService = async () => {
  return prisma.proveedor.findMany({
    where: { activo: true },
    orderBy: { nombreEmpresa: 'asc' },
  });
};

export const getProveedorByIdService = async (id: number) => {
  const proveedor = await prisma.proveedor.findUnique({
    where: { id },
    include: {
      prodProveedores: {
        include: {
          producto: { select: { id: true, nombre: true, tipo: true } },
        },
      },
    },
  });
  if (!proveedor) throw new Error('Proveedor no encontrado');
  return proveedor;
};

export const crearProveedorService = async (datos: {
  nombreEmpresa: string;
  nombreContacto?: string;
  telefono?: string;
  email?: string;
  tipoProducto: TipoProductoProveedor;
  contactoExclusivoId?: number;
  distanciaKm?: number;
  observaciones?: string;
}) => {
  return prisma.proveedor.create({ data: { ...datos, nombreContacto: datos.nombreContacto ?? '' } });
};

export const actualizarProveedorService = async (
  id: number,
  datos: Partial<{
    nombreEmpresa: string;
    nombreContacto: string;
    telefono: string;
    email: string;
    tipoProducto: TipoProductoProveedor;
    distanciaKm: number;
    observaciones: string;
  }>
) => {
  await getProveedorByIdService(id);
  return prisma.proveedor.update({ where: { id }, data: datos });
};

export const desactivarProveedorService = async (id: number) => {
  await getProveedorByIdService(id);
  return prisma.proveedor.update({ where: { id }, data: { activo: false } });
};

export const vincularProductoProveedorService = async (datos: {
  proveedorId: number;
  productoId: number;
  precioCosto: number;
  observaciones?: string;
}) => {
  return prisma.productoProveedor.upsert({
    where: {
      id: (
        await prisma.productoProveedor.findFirst({
          where: { proveedorId: datos.proveedorId, productoId: datos.productoId },
          select: { id: true },
        })
      )?.id ?? 0,
    },
    update: {
      precioCosto: datos.precioCosto,
      observaciones: datos.observaciones,
      fechaActualizacion: new Date(),
    },
    create: {
      proveedorId: datos.proveedorId,
      productoId: datos.productoId,
      precioCosto: datos.precioCosto,
      observaciones: datos.observaciones,
    },
  });
};
