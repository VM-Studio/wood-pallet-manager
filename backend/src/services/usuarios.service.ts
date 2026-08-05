import prisma from '../utils/prisma';

const SELECT_BASE = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  telefono: true,
  rol: true,
  activo: true,
  fechaCreacion: true,
  estadoCuenta: true,
  tieneModulosLimitados: true,
  modulosPermitidos: true,
  motivoRechazo: true,
  fechaAprobacion: true,
  fotoPerfil: true,
} as const;

export const listarUsuariosService = async () => {
  return prisma.usuario.findMany({
    select: SELECT_BASE,
    orderBy: [{ estadoCuenta: 'asc' }, { fechaCreacion: 'desc' }],
  });
};

export const aprobarUsuarioService = async (
  id: number,
  datos: { rol: 'propietario_carlos' | 'propietario_juancruz' | 'admin'; modulosPermitidos: string[] }
) => {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new Error('Usuario no encontrado');

  return prisma.usuario.update({
    where: { id },
    data: {
      rol: datos.rol,
      estadoCuenta: 'aprobado',
      activo: true,
      tieneModulosLimitados: true,
      modulosPermitidos: datos.modulosPermitidos,
      motivoRechazo: null,
      fechaAprobacion: new Date(),
    },
    select: SELECT_BASE,
  });
};

export const rechazarUsuarioService = async (id: number, motivo?: string) => {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new Error('Usuario no encontrado');

  return prisma.usuario.update({
    where: { id },
    data: {
      estadoCuenta: 'rechazado',
      activo: false,
      motivoRechazo: motivo ?? 'Rechazado por el administrador',
    },
    select: SELECT_BASE,
  });
};

export const actualizarAccesoUsuarioService = async (
  id: number,
  modulosPermitidos: string[]
) => {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new Error('Usuario no encontrado');

  return prisma.usuario.update({
    where: { id },
    data: {
      tieneModulosLimitados: true,
      modulosPermitidos,
    },
    select: SELECT_BASE,
  });
};

export const cambiarEstadoActivoService = async (id: number, activo: boolean) => {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new Error('Usuario no encontrado');
  if (usuario.rol === 'propietario_carlos' || usuario.rol === 'propietario_juancruz') {
    throw new Error('No podés desactivar la cuenta de un propietario');
  }

  return prisma.usuario.update({
    where: { id },
    data: { activo },
    select: SELECT_BASE,
  });
};
