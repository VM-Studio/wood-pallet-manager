import prisma from '../utils/prisma';
import { sendCodigoRetiro } from '../utils/mailer';
import { registrarRetirosVentaService } from './ventas.service';
import { cancelarVentaService, asegurarVentaNoCancelada } from './cancelacion-venta.service';

// ─── Include base para queries ────────────────────────────────────────────────
const RETIRO_INCLUDE = {
  venta: {
    include: {
      cliente: {
        select: {
          id: true, razonSocial: true, nombreContacto: true,
          telefonoContacto: true, emailContacto: true,
        },
      },
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      detalles: {
        include: {
          producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
          retiros: { select: { id: true, cantidadRetirada: true, fechaRetiro: true } },
        },
      },
      remito: {
        select: {
          id: true, numeroRemito: true, fechaEmision: true,
          estado: true, fechaFirmaCliente: true,
        },
      },
    },
  },
  confirmadoPor: { select: { id: true, nombre: true, apellido: true } },
  proveedor: { select: { id: true, nombreEmpresa: true, telefono: true, ubicacion: true } },
  historialReenvios: {
    include: {
      enviadoPor: { select: { id: true, nombre: true, apellido: true } },
      proveedor: { select: { id: true, nombreEmpresa: true } },
    },
    orderBy: { creadoEn: 'desc' as const },
  },
};

// ─── Generador de código único ────────────────────────────────────────────────
const generarCodigoRetiro = async (): Promise<string> => {
  let codigo: string;
  let existe: boolean;
  do {
    const num = Math.floor(1000 + Math.random() * 9000);
    codigo = `WP-${num}`;
    const found = await prisma.retiro.findUnique({ where: { codigoRetiro: codigo } });
    existe = !!found;
  } while (existe);
  return codigo;
};

// ─── LIST ─────────────────────────────────────────────────────────────────────
export const getRetirosService = async () => {
  return prisma.retiro.findMany({
    include: RETIRO_INCLUDE,
    orderBy: { creadoEn: 'desc' },
  });
};

// ─── GET ONE ──────────────────────────────────────────────────────────────────
export const getRetiroByIdService = async (id: number) => {
  const retiro = await prisma.retiro.findUnique({ where: { id }, include: RETIRO_INCLUDE });
  if (!retiro) throw new Error('Retiro no encontrado');
  return retiro;
};

// ─── KPIs ─────────────────────────────────────────────────────────────────────
export const getStatsRetirosService = async () => {
  const now = new Date();

  // Hoy: utilizar fechaRetiro de la venta (fecha estimada de retiro)
  const inicioHoy = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const finHoy    = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

  // Esta semana (lunes a domingo)
  const diaSemana = now.getUTCDay(); // 0=dom, 1=lun...
  const diasDesdelunes = diaSemana === 0 ? 6 : diaSemana - 1;
  const inicioSemana = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diasDesdelunes));
  const finSemana    = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diasDesdelunes + 7));

  // Este mes
  const inicioMes = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const finMes    = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [pendientesHoy, pendientesSemana, completadosMes] = await Promise.all([
    prisma.retiro.count({
      where: {
        estadoRetiro: { in: ['pendiente', 'confirmado'] },
        venta: { fechaRetiro: { gte: inicioHoy, lt: finHoy } },
      },
    }),
    prisma.retiro.count({
      where: {
        estadoRetiro: { in: ['pendiente', 'confirmado'] },
        venta: { fechaRetiro: { gte: inicioSemana, lt: finSemana } },
      },
    }),
    prisma.retiro.count({
      where: {
        estadoRetiro: 'completado',
        fechaConfirmacion: { gte: inicioMes, lt: finMes },
      },
    }),
  ]);

  return { pendientesHoy, pendientesSemana, completadosMes };
};

// ─── CAMBIAR ESTADO ───────────────────────────────────────────────────────────
export const cambiarEstadoRetiroService = async (
  id: number,
  estado: 'pendiente' | 'confirmado' | 'parcial' | 'completado' | 'cancelado',
  usuarioId: number,
  extra?: { observaciones?: string; motivoCancelacion?: string }
) => {
  const retiro = await prisma.retiro.findUnique({ where: { id } });
  if (!retiro) throw new Error('Retiro no encontrado');

  // Cancelar un retiro es cancelar la venta: misma cascada que desde Ventas
  if (estado === 'cancelado') {
    await cancelarVentaService(retiro.ventaId, extra?.motivoCancelacion ?? '', usuarioId);
    return prisma.retiro.findUnique({ where: { id } });
  }
  await asegurarVentaNoCancelada(prisma, retiro.ventaId);

  const updateData: Record<string, unknown> = { estadoRetiro: estado };

  if (estado === 'completado') {
    updateData.confirmadoPorId = usuarioId;
    updateData.fechaConfirmacion = new Date();
    if (extra?.observaciones) updateData.observacionesConf = extra.observaciones;
  }

  const [retiroActualizado] = await prisma.$transaction(async (tx) => {
    const updated = await tx.retiro.update({ where: { id }, data: updateData as any });

    // Sincronizar estado de venta — el estado de la venta (venta.estadoPedido)
    // es la fuente de verdad que se muestra también en Logística y Retiros,
    // así que cualquier cambio acá se refleja en las tres pantallas.
    if (estado === 'confirmado') {
      await tx.venta.update({
        where: { id: retiro.ventaId },
        data: { estadoPedido: 'confirmado' },
      });
    } else if (estado === 'parcial') {
      await tx.venta.update({
        where: { id: retiro.ventaId },
        data: { estadoPedido: 'entregado_parcial' },
      });
    } else if (estado === 'completado') {
      await tx.venta.update({
        where: { id: retiro.ventaId },
        data: { estadoPedido: 'entregado', fechaEntregaReal: new Date() },
      });
    }

    return [updated];
  });

  return retiroActualizado;
};

// ─── REGISTRAR RETIRO PARCIAL ─────────────────────────────────────────────────
// Se registra por producto sobre el detalle de la venta, así Ventas, Retiros y
// Logística comparten las mismas cantidades y el mismo estado.
export const registrarRetiroParcialService = async (
  id: number,
  items: { detalleVentaId: number; cantidad: number }[],
  usuarioId: number
) => {
  const retiro = await prisma.retiro.findUnique({ where: { id } });
  if (!retiro) throw new Error('Retiro no encontrado');

  return registrarRetirosVentaService(retiro.ventaId, items, usuarioId);
};

// ─── AUTO-CREAR RETIRO (llamado desde cotizaciones.service) ───────────────────
export const crearRetiroService = async (params: {
  ventaId: number;
  clienteNombre: string;
  clienteEmail?: string | null;
  galpon?: string;
  horaEstimadaRetiro?: Date;
  fechaRetiro?: Date;
  productos?: { nombre: string; cantidad: number }[];
}) => {
  const codigo = await generarCodigoRetiro();

  // Vincular el galpón (proveedor) si el nombre coincide con uno solo
  let proveedorId: number | undefined;
  if (params.galpon?.trim()) {
    const candidatos = await prisma.proveedor.findMany({
      where: { activo: true, nombreEmpresa: { startsWith: params.galpon.trim(), mode: 'insensitive' } },
      select: { id: true },
    });
    if (candidatos.length === 1) proveedorId = candidatos[0].id;
  }

  const retiro = await prisma.retiro.create({
    data: {
      ventaId: params.ventaId,
      codigoRetiro: codigo,
      galpon: params.galpon,
      horaEstimadaRetiro: params.horaEstimadaRetiro,
      proveedorId,
    },
  });

  // Enviar email al cliente con el código
  if (params.clienteEmail) {
    try {
      const fechaStr = params.fechaRetiro
        ? new Date(params.fechaRetiro).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : undefined;
      const horaStr = params.horaEstimadaRetiro
        ? new Date(params.horaEstimadaRetiro).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
        : undefined;

      await sendCodigoRetiro({
        to: params.clienteEmail,
        nombre: params.clienteNombre,
        codigoRetiro: codigo,
        fechaRetiro: fechaStr,
        horaRetiro: horaStr,
        galpon: params.galpon,
        productos: params.productos,
      });
    } catch (_err) {
      // No fallar la conversión si el email falla
    }
  }

  return retiro;
};

// ─── ENVIAR CÓDIGO AL GALPÓN (WhatsApp) ───────────────────────────────────────
// Asigna el galpón (proveedor) al que va a ir el cliente y deja registrado el
// envío. El mensaje se abre en WhatsApp desde el navegador con el teléfono del
// proveedor.
export const registrarEnvioGalponService = async (
  retiroId: number,
  proveedorId: number,
  tipoMensaje: 'codigo' | 'retiro_parcial' | 'cancelacion',
  usuarioId: number
) => {
  const retiro = await prisma.retiro.findUnique({ where: { id: retiroId } });
  if (!retiro) throw new Error('Retiro no encontrado');
  // Con el retiro cancelado solo se puede avisar la cancelación al galpón
  if (retiro.estadoRetiro === 'cancelado' && tipoMensaje !== 'cancelacion') {
    throw new Error('El retiro está cancelado: solo se puede avisar la cancelación al galpón');
  }

  const proveedor = await prisma.proveedor.findUnique({ where: { id: proveedorId } });
  if (!proveedor || !proveedor.activo) throw new Error('Galpón no encontrado');
  if (!proveedor.telefono?.trim()) {
    throw new Error(`${proveedor.nombreEmpresa} no tiene teléfono cargado. Agregalo en Proveedores.`);
  }

  return prisma.$transaction(async (tx) => {
    await tx.retiro.update({
      where: { id: retiroId },
      data: { proveedorId, galpon: proveedor.nombreEmpresa },
    });
    return tx.historialReenvioRetiro.create({
      data: {
        retiroId,
        proveedorId,
        tipoMensaje,
        telefonoEnviado: proveedor.telefono,
        enviadoPorId: usuarioId,
      },
    });
  });
};

// ─── REENVIAR CÓDIGO ──────────────────────────────────────────────────────────
export const reenviarCodigoService = async (
  retiroId: number,
  usuarioId: number,
  emailDestino?: string,
  telefonoDestino?: string
) => {
  const retiro = await prisma.retiro.findUnique({
    where: { id: retiroId },
    include: {
      venta: {
        include: {
          cliente: { select: { razonSocial: true, nombreContacto: true, emailContacto: true } },
          detalles: { include: { producto: { select: { nombre: true } } } },
        },
      },
    },
  });
  if (!retiro) throw new Error('Retiro no encontrado');

  // Registrar en historial
  const historial = await prisma.historialReenvioRetiro.create({
    data: {
      retiroId,
      emailEnviado: emailDestino || null,
      telefonoEnviado: telefonoDestino || null,
      enviadoPorId: usuarioId,
    },
  });

  // Enviar email si hay destinatario
  if (emailDestino) {
    const nombre = retiro.venta.cliente.nombreContacto || retiro.venta.cliente.razonSocial;
    const productos = retiro.venta.detalles.map(d => ({
      nombre: d.producto.nombre,
      cantidad: d.cantidadPedida,
    }));
    await sendCodigoRetiro({
      to: emailDestino,
      nombre,
      codigoRetiro: retiro.codigoRetiro,
      galpon: retiro.galpon ?? undefined,
      productos,
    });
  }

  return historial;
};
