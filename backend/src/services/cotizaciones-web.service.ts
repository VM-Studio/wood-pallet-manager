import prisma from '../utils/prisma';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface NuevaCotizacionWebInput {
  nombre: string;
  empresa?: string;
  email: string;
  telefono?: string;
  tipoPallet?: string;
  cantidad?: number;
  fechaNecesidad?: string;
  tipoEntrega?: string;
  localidadEntrega?: string;
  requiereSenasa?: boolean;
  observaciones?: string;
  ipOrigen?: string;
}

// ─── Crear cotización web (llamada desde el endpoint público) ─────────────────

export const crearCotizacionWebService = async (input: NuevaCotizacionWebInput) => {
  return prisma.cotizacionWeb.create({
    data: {
      nombre: input.nombre,
      empresa: input.empresa,
      email: input.email,
      telefono: input.telefono ?? undefined,
      tipoPallet: input.tipoPallet ?? undefined,
      cantidad: input.cantidad ?? undefined,
      fechaNecesidad: input.fechaNecesidad ? new Date(input.fechaNecesidad) : undefined,
      tipoEntrega: input.tipoEntrega ?? undefined,
      localidadEntrega: input.localidadEntrega,
      requiereSenasa: input.requiereSenasa ?? false,
      observaciones: input.observaciones,
      ipOrigen: input.ipOrigen,
      estado: 'pendiente',
    },
  });
};

// ─── Listar con filtros ───────────────────────────────────────────────────────

export const getCotizacionesWebService = async (estado?: string) => {
  const where: any = {};
  if (estado && estado !== 'todas') where.estado = estado;

  return prisma.cotizacionWeb.findMany({
    where,
    include: {
      propietarioAsignado: { select: { id: true, nombre: true, apellido: true, rol: true } },
      cotizacion: { select: { id: true, estado: true, totalConIva: true } },
    },
    orderBy: { creadoEn: 'desc' },
  });
};

// ─── Obtener detalle ──────────────────────────────────────────────────────────

export const getCotizacionWebByIdService = async (id: number) => {
  const cw = await prisma.cotizacionWeb.findUnique({
    where: { id },
    include: {
      propietarioAsignado: { select: { id: true, nombre: true, apellido: true, rol: true } },
      cotizacion: {
        select: { id: true, estado: true, totalConIva: true, fechaCotizacion: true },
      },
    },
  });
  if (!cw) throw new Error('Cotización web no encontrada');
  return cw;
};

// ─── Cambiar estado ───────────────────────────────────────────────────────────

export const cambiarEstadoCotizacionWebService = async (
  id: number,
  estado: 'pendiente' | 'vista' | 'convertida' | 'descartada',
  extra?: { motivoDescarte?: string; propietarioAsignadoId?: number }
) => {
  return prisma.cotizacionWeb.update({
    where: { id },
    data: {
      estado,
      motivoDescarte: extra?.motivoDescarte,
      propietarioAsignadoId: extra?.propietarioAsignadoId,
    },
  });
};

// ─── Marcar como vista al abrir detalle ──────────────────────────────────────

export const marcarComoVistaCotizacionWebService = async (id: number) => {
  const cw = await prisma.cotizacionWeb.findUnique({ where: { id } });
  if (!cw) throw new Error('Cotización web no encontrada');
  if (cw.estado === 'pendiente') {
    return prisma.cotizacionWeb.update({ where: { id }, data: { estado: 'vista' } });
  }
  return cw;
};

// ─── Contador para el badge ───────────────────────────────────────────────────

export const getContadorCotizacionesWebService = async () => {
  const pendientes = await prisma.cotizacionWeb.count({
    where: { estado: { in: ['pendiente', 'vista'] } },
  });
  return { pendientes };
};

// ─── Convertir a cotización formal ────────────────────────────────────────────

export const convertirCotizacionWebService = async (
  id: number,
  datos: {
    usuarioId: number;
    clienteId?: number;
    // Datos para crear cliente nuevo si no existe
    nuevoCliente?: {
      razonSocial: string;
      nombreContacto: string;
      emailContacto: string;
      telefonoContacto: string;
      localidad?: string;
    };
    // Datos de precio para la cotización
    precioUnitario: number;
    costoFlete?: number;
    incluyeFlete: boolean;
  }
) => {
  const cw = await prisma.cotizacionWeb.findUnique({ where: { id } });
  if (!cw) throw new Error('Cotización web no encontrada');
  if (cw.estado === 'convertida') throw new Error('Ya fue convertida');
  if (cw.estado === 'descartada') throw new Error('Está descartada');

  // Resolver producto: buscar por tipo de pallet o usar el primer producto disponible
  let producto = await prisma.producto.findFirst({
    where: {
      activo: true,
      nombre: { contains: cw.tipoPallet, mode: 'insensitive' },
    },
  });
  if (!producto) {
    producto = await prisma.producto.findFirst({ where: { activo: true } });
  }
  if (!producto) throw new Error('No hay productos disponibles para crear la cotización');

  return prisma.$transaction(async (tx) => {
    // 1. Crear cliente si no existe
    let clienteIdFinal = datos.clienteId;
    if (!clienteIdFinal && datos.nuevoCliente) {
      const nuevoCliente = await tx.cliente.create({
        data: {
          razonSocial: datos.nuevoCliente.razonSocial,
          nombreContacto: datos.nuevoCliente.nombreContacto,
          emailContacto: datos.nuevoCliente.emailContacto,
          telefonoContacto: datos.nuevoCliente.telefonoContacto,
          localidad: datos.nuevoCliente.localidad,
          usuarioAsignadoId: datos.usuarioId,
          canalEntrada: 'formulario_web',
        },
      });
      clienteIdFinal = nuevoCliente.id;
    }
    if (!clienteIdFinal) throw new Error('Debés seleccionar o crear un cliente');

    // 2. Calcular totales
    const subtotal = datos.precioUnitario * cw.cantidad;
    const flete = datos.incluyeFlete && datos.costoFlete ? datos.costoFlete : 0;
    const totalSinIva = subtotal + flete;
    const totalConIva = totalSinIva * 1.21;

    // 3. Crear cotización formal
    const cotizacion = await tx.cotizacion.create({
      data: {
        clienteId: clienteIdFinal,
        usuarioId: datos.usuarioId,
        incluyeFlete: datos.incluyeFlete,
        costoFlete: flete > 0 ? flete : null,
        requiereSenasa: cw.requiereSenasa,
        totalSinIva,
        totalConIva,
        observaciones: cw.observaciones
          ? `[Web] ${cw.observaciones}`
          : `[Cotización desde formulario web — ${cw.nombre}]`,
        estado: 'enviada',
        detalles: {
          create: [
            {
              productoId: producto!.id,
              cantidad: cw.cantidad,
              precioUnitario: datos.precioUnitario,
              subtotal,
            },
          ],
        },
      },
    });

    // 4. Actualizar cotización web: vincular y marcar convertida
    await tx.cotizacionWeb.update({
      where: { id },
      data: {
        estado: 'convertida',
        cotizacionId: cotizacion.id,
        propietarioAsignadoId: datos.usuarioId,
      },
    });

    return cotizacion;
  });
};
