import prisma from '../utils/prisma';

export const getClientesService = async (usuarioId: number, rol: string) => {
  const clientes = await prisma.cliente.findMany({
    where: { activo: true },
    include: {
      usuarioAsignado: {
        select: { id: true, nombre: true, apellido: true, rol: true },
      },
    },
    orderBy: { razonSocial: 'asc' },
  });
  return clientes;
};

export const getClienteByIdService = async (id: number) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      usuarioAsignado: {
        select: { id: true, nombre: true, apellido: true, rol: true },
      },
      cotizaciones: {
        orderBy: { fechaCotizacion: 'desc' },
        take: 10,
        include: {
          detalles: { include: { producto: true } },
        },
      },
      ventas: {
        orderBy: { fechaVenta: 'desc' },
        take: 10,
        include: {
          detalles: { include: { producto: true } },
          facturas: true,
        },
      },
      facturas: {
        orderBy: { fechaEmision: 'desc' },
        take: 10,
      },
    },
  });

  if (!cliente) throw new Error('Cliente no encontrado');
  return cliente;
};

export const crearClienteService = async (
  datos: {
    razonSocial: string;
    cuit?: string;
    nombreContacto?: string;
    telefonoContacto?: string;
    emailContacto?: string;
    canalEntrada?: 'whatsapp' | 'formulario_web' | 'llamada' | 'recomendacion' | 'otro';
    direccionEntrega?: string;
    localidad?: string;
    esExportador?: boolean;
    observaciones?: string;
  },
  usuarioId: number
) => {
  return prisma.cliente.create({
    data: { ...datos, usuarioAsignadoId: usuarioId },
    include: {
      usuarioAsignado: {
        select: { id: true, nombre: true, apellido: true, rol: true },
      },
    },
  });
};

export const actualizarClienteService = async (
  id: number,
  datos: {
    razonSocial?: string;
    cuit?: string;
    nombreContacto?: string;
    telefonoContacto?: string;
    emailContacto?: string;
    canalEntrada?: 'whatsapp' | 'formulario_web' | 'llamada' | 'recomendacion' | 'otro';
    direccionEntrega?: string;
    localidad?: string;
    esExportador?: boolean;
    observaciones?: string;
  },
  usuarioId: number,
  rol: string
) => {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) throw new Error('Cliente no encontrado');

  if (cliente.usuarioAsignadoId !== usuarioId && rol !== 'admin') {
    throw new Error('Solo el propietario asignado puede editar este cliente');
  }

  return prisma.cliente.update({
    where: { id },
    data: datos,
    include: {
      usuarioAsignado: {
        select: { id: true, nombre: true, apellido: true, rol: true },
      },
    },
  });
};

export const desactivarClienteService = async (
  id: number,
  usuarioId: number,
  rol: string
) => {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) throw new Error('Cliente no encontrado');

  if (cliente.usuarioAsignadoId !== usuarioId && rol !== 'admin') {
    throw new Error('Solo el propietario asignado puede desactivar este cliente');
  }

  await prisma.cliente.update({ where: { id }, data: { activo: false } });
  return { mensaje: 'Cliente desactivado correctamente' };
};

export const getHistorialClienteService = async (id: number) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      ventas: {
        orderBy: { fechaVenta: 'desc' },
        include: {
          detalles: { include: { producto: true } },
          facturas: { include: { pagos: true } },
          logistica: true,
          usuario: { select: { nombre: true, apellido: true, rol: true } },
        },
      },
    },
  });

  if (!cliente) throw new Error('Cliente no encontrado');

  const totalPallets = cliente.ventas.reduce(
    (acc, venta) => acc + venta.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
    0
  );

  const totalFacturado = cliente.ventas.reduce(
    (acc, venta) => acc + Number(venta.totalConIva || 0),
    0
  );

  return {
    cliente: { id: cliente.id, razonSocial: cliente.razonSocial, cuit: cliente.cuit },
    estadisticas: {
      totalVentas: cliente.ventas.length,
      totalPallets,
      totalFacturado,
    },
    ventas: cliente.ventas,
  };
};

export const buscarClientesService = async (query: string) => {
  return prisma.cliente.findMany({
    where: {
      activo: true,
      OR: [
        { razonSocial: { contains: query, mode: 'insensitive' } },
        { cuit: { contains: query } },
        { nombreContacto: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      usuarioAsignado: {
        select: { id: true, nombre: true, apellido: true, rol: true },
      },
    },
    take: 20,
    orderBy: { razonSocial: 'asc' },
  });
};

