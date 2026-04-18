import prisma from '../utils/prisma';

const includeProducto = {
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
  listaPrecios: {
    where: {
      OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }],
    },
    orderBy: { cantMinima: 'asc' as const },
  },
  propietario: { select: { id: true, nombre: true, apellido: true, rol: true } },
};

export const getProductosService = async (propietarioId: number) => {
  return prisma.producto.findMany({
    where: { activo: true, propietarioId },
    include: includeProducto,
    orderBy: { nombre: 'asc' },
  });
};

export const getProductosOtroService = async (propietarioId: number) => {
  // Devuelve productos del otro usuario (cross-user, solo lectura)
  return prisma.producto.findMany({
    where: { activo: true, propietarioId: { not: propietarioId } },
    include: includeProducto,
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
      propietario: { select: { id: true, nombre: true, apellido: true, rol: true } },
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
  propietarioId: number;
}) => {
  return prisma.producto.create({ data: datos });
};

export const actualizarProductoService = async (
  id: number,
  propietarioId: number,
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
  if (producto.propietarioId !== propietarioId) throw new Error('No tenés permiso para editar este producto');
  return prisma.producto.update({ where: { id }, data: datos });
};

export const desactivarProductoService = async (id: number, propietarioId: number) => {
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) throw new Error('Producto no encontrado');
  if (producto.propietarioId !== propietarioId) throw new Error('No tenés permiso para eliminar este producto');
  await prisma.producto.update({ where: { id }, data: { activo: false } });
  return { mensaje: 'Producto desactivado correctamente' };
};
