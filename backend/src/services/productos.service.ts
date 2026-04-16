import prisma from '../utils/prisma';

export const getProductosService = async () => {
  return prisma.producto.findMany({
    where: { activo: true },
    include: {
      prodProveedores: {
        include: {
          proveedor: {
            select: { id: true, nombreEmpresa: true, tipoProducto: true },
          },
        },
      },
      stocks: {
        include: {
          proveedor: { select: { id: true, nombreEmpresa: true } },
        },
      },
    },
    orderBy: { nombre: 'asc' },
  });
};

export const getProductoByIdService = async (id: number) => {
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      prodProveedores: { include: { proveedor: true } },
      listaPrecios: {
        where: {
          OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }],
        },
        orderBy: { cantMinima: 'asc' },
      },
      stocks: {
        include: {
          proveedor: { select: { id: true, nombreEmpresa: true } },
        },
      },
    },
  });
  if (!producto) throw new Error('Producto no encontrado');
  return producto;
};

export const crearProductoService = async (datos: {
  nombre: string;
  tipo: 'estandar' | 'reforzado' | 'liviano' | 'exportacion' | 'carton' | 'a_medida';
  condicion: 'nuevo' | 'seminuevo' | 'usado';
  dimensionLargo?: number;
  dimensionAncho?: number;
  cargaMaximaKg?: number;
  requiereSenasa?: boolean;
  descripcion?: string;
}) => {
  return prisma.producto.create({ data: datos });
};

export const actualizarProductoService = async (
  id: number,
  datos: {
    nombre?: string;
    tipo?: 'estandar' | 'reforzado' | 'liviano' | 'exportacion' | 'carton' | 'a_medida';
    condicion?: 'nuevo' | 'seminuevo' | 'usado';
    dimensionLargo?: number;
    dimensionAncho?: number;
    cargaMaximaKg?: number;
    requiereSenasa?: boolean;
    descripcion?: string;
  }
) => {
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) throw new Error('Producto no encontrado');
  return prisma.producto.update({ where: { id }, data: datos });
};

export const desactivarProductoService = async (id: number) => {
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) throw new Error('Producto no encontrado');
  await prisma.producto.update({ where: { id }, data: { activo: false } });
  return { mensaje: 'Producto desactivado correctamente' };
};
