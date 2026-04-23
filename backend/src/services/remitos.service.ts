import prisma from '../utils/prisma';
import { enviarRemitoParaFirmar, enviarRemitoFirmado } from '../utils/mailer';

const REMITO_INCLUDE = {
  venta: {
    include: {
      detalles: { include: { producto: true } },
      facturas: { select: { id: true, nroFactura: true, estadoCobro: true } },
    },
  },
  cliente: { select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true, cuit: true, direccionEntrega: true, localidad: true } },
  usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
};

export const getRemitosService = async (usuarioId: number, rol: string) => {
  const where = rol === 'admin' ? {} : { usuarioId };
  return prisma.remito.findMany({
    where,
    include: REMITO_INCLUDE,
    orderBy: { fechaEmision: 'desc' },
  });
};

export const getRemitoByIdService = async (id: number) => {
  const remito = await prisma.remito.findUnique({ where: { id }, include: REMITO_INCLUDE });
  if (!remito) throw new Error('Remito no encontrado');
  return remito;
};

export const getRemitoByTokenService = async (token: string) => {
  const remito = await prisma.remito.findUnique({
    where: { tokenFirma: token },
    include: REMITO_INCLUDE,
  });
  if (!remito) throw new Error('Remito no encontrado o token inválido');
  if (remito.estado === 'cancelado') throw new Error('Este remito fue cancelado');
  if (remito.estado === 'firmado_por_cliente' || remito.estado === 'completado') {
    throw new Error('Este remito ya fue firmado');
  }
  return remito;
};

export const crearRemitoService = async (
  datos: {
    ventaId: number;
    firmaPropietario?: string;
    fechaEntrega?: Date;
    observaciones?: string;
  },
  usuarioId: number
) => {
  const venta = await prisma.venta.findUnique({
    where: { id: datos.ventaId },
    include: { remito: true },
  });
  if (!venta) throw new Error('Venta no encontrada');
  if (venta.remito) throw new Error('Esta venta ya tiene un remito asociado');

  const remito = await prisma.remito.create({
    data: {
      ventaId: datos.ventaId,
      clienteId: venta.clienteId,
      usuarioId,
      firmaPropietario: datos.firmaPropietario ?? null,
      fechaFirmaPropietario: datos.firmaPropietario ? new Date() : null,
      estado: datos.firmaPropietario ? 'enviado_a_cliente' : 'pendiente_firma_propietario',
      fechaEntrega: datos.fechaEntrega,
      observaciones: datos.observaciones,
    },
    include: REMITO_INCLUDE,
  });

  return remito;
};

export const firmarPropietarioService = async (
  id: number,
  firma: string
) => {
  const remito = await prisma.remito.findUnique({ where: { id } });
  if (!remito) throw new Error('Remito no encontrado');
  if (remito.estado !== 'pendiente_firma_propietario') {
    throw new Error('El remito ya tiene firma del propietario');
  }

  return prisma.remito.update({
    where: { id },
    data: {
      firmaPropietario: firma,
      fechaFirmaPropietario: new Date(),
      estado: 'pendiente_firma_propietario',
    },
    include: REMITO_INCLUDE,
  });
};

export const enviarRemitoService = async (id: number) => {
  const remito = await prisma.remito.findUnique({ where: { id }, include: REMITO_INCLUDE });
  if (!remito) throw new Error('Remito no encontrado');
  if (!remito.firmaPropietario) throw new Error('El remito necesita la firma del propietario antes de enviarse');
  if (remito.estado === 'cancelado') throw new Error('El remito está cancelado');
  if (!remito.cliente.emailContacto) throw new Error('El cliente no tiene email registrado');

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const linkFirma = `${frontendUrl}/remito/${remito.tokenFirma}/firmar`;

  const detalles = remito.venta.detalles.map(d => ({
    nombre: d.producto.nombre,
    cantidad: d.cantidadPedida,
    precioUnitario: Number(d.precioUnitario),
    subtotal: Number(d.subtotal),
  }));

  await enviarRemitoParaFirmar({
    destinatario: remito.cliente.emailContacto,
    razonSocial: remito.cliente.razonSocial,
    numeroRemito: remito.numeroRemito ?? String(remito.id).padStart(4, '0'),
    fechaEmision: remito.fechaEmision.toLocaleDateString('es-AR'),
    fechaEntrega: remito.fechaEntrega?.toLocaleDateString('es-AR'),
    linkFirma,
    productos: detalles,
    totalConIva: Number(remito.venta.totalConIva ?? 0),
    firmaPropietarioBase64: remito.firmaPropietario ?? undefined,
  });

  return prisma.remito.update({
    where: { id },
    data: {
      estado: 'enviado_a_cliente',
      emailEnviado: true,
      fechaEmailEnviado: new Date(),
    },
    include: REMITO_INCLUDE,
  });
};

export const firmarClienteService = async (token: string, firmaCliente: string) => {
  const remito = await prisma.remito.findUnique({ where: { tokenFirma: token }, include: REMITO_INCLUDE });
  if (!remito) throw new Error('Remito no encontrado o token inválido');
  if (remito.estado === 'cancelado') throw new Error('Este remito fue cancelado');
  if (remito.estado === 'firmado_por_cliente' || remito.estado === 'completado') {
    throw new Error('Este remito ya fue firmado');
  }

  const actualizado = await prisma.remito.update({
    where: { id: remito.id },
    data: {
      firmaCliente,
      fechaFirmaCliente: new Date(),
      estado: 'firmado_por_cliente',
    },
    include: REMITO_INCLUDE,
  });

  const nro = actualizado.numeroRemito ?? String(actualizado.id).padStart(4, '0');
  const fechaEmision = actualizado.fechaEmision.toLocaleDateString('es-AR');

  // Enviar copia firmada al cliente
  if (actualizado.cliente.emailContacto) {
    try {
      await enviarRemitoFirmado({
        destinatario: actualizado.cliente.emailContacto,
        razonSocial: actualizado.cliente.razonSocial,
        numeroRemito: nro,
        fechaEmision,
        firmaPropietarioBase64: actualizado.firmaPropietario ?? undefined,
        firmaClienteBase64: firmaCliente,
        esCopia: 'cliente',
      });
    } catch (_) { /* no bloquear si falla el mail */ }
  }

  // Enviar notificación al propietario
  const propietario = await prisma.usuario.findUnique({ where: { id: actualizado.usuarioId } });
  if (propietario?.email) {
    try {
      await enviarRemitoFirmado({
        destinatario: propietario.email,
        razonSocial: actualizado.cliente.razonSocial,
        numeroRemito: nro,
        fechaEmision,
        firmaPropietarioBase64: actualizado.firmaPropietario ?? undefined,
        firmaClienteBase64: firmaCliente,
        esCopia: 'propietario',
      });
    } catch (_) { /* no bloquear si falla el mail */ }
  }

  // Marcar como completado
  return prisma.remito.update({
    where: { id: remito.id },
    data: { estado: 'completado' },
    include: REMITO_INCLUDE,
  });
};

export const actualizarNumeroRemitoService = async (id: number, numeroRemito: string) => {
  const remito = await prisma.remito.findUnique({ where: { id } });
  if (!remito) throw new Error('Remito no encontrado');
  return prisma.remito.update({
    where: { id },
    data: { numeroRemito },
    include: REMITO_INCLUDE,
  });
};

export const cancelarRemitoService = async (id: number) => {
  const remito = await prisma.remito.findUnique({ where: { id } });
  if (!remito) throw new Error('Remito no encontrado');
  if (remito.estado === 'completado') throw new Error('No se puede cancelar un remito completado');
  return prisma.remito.update({
    where: { id },
    data: { estado: 'cancelado' },
    include: REMITO_INCLUDE,
  });
};
