import prisma from '../utils/prisma';
import { calcularPrecioService } from './precios.service';

export const getCotizacionesService = async (usuarioId: number, rol: string) => {
  const where = rol === 'admin' ? {} : { usuarioId };

  return prisma.cotizacion.findMany({
    where,
    include: {
      cliente: { select: { id: true, razonSocial: true, telefonoContacto: true } },
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      detalles: {
        include: {
          producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
          especificacion: true,
        },
      },
    },
    orderBy: { fechaCotizacion: 'desc' },
  });
};

export const getCotizacionByIdService = async (id: number) => {
  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: {
      cliente: true,
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      detalles: {
        include: {
          producto: true,
          especificacion: true,
        },
      },
      seguimientos: { orderBy: { fechaContacto: 'desc' } },
      venta: { select: { id: true, estadoPedido: true, fechaVenta: true } },
    },
  });
  if (!cotizacion) throw new Error('Cotización no encontrada');
  return cotizacion;
};

export const crearCotizacionService = async (
  datos: {
    clienteId: number;
    incluyeFlete: boolean;
    costoFlete?: number;
    fleteIncluido?: boolean;
    requiereSenasa: boolean;
    costoSenasa?: number;
    canalEnvio?: 'whatsapp' | 'email';
    observaciones?: string;
    detalles: {
      productoId: number;
      cantidad: number;
      precioUnitario?: number;
      esAMedida?: boolean;
      especificacion?: {
        largoMm?: number;
        anchoMm?: number;
        altoMm?: number;
        cargaMaximaKg?: number;
        tipoMadera?: string;
        observacionesCliente?: string;
      };
    }[];
  },
  usuarioId: number
) => {
  let totalSinIva = 0;
  const detallesConPrecio = [];

  // Obtener (o crear) el producto genérico "a_medida" que actúa como placeholder
  let productoMedidaId: number | null = null;
  const getProductoMedidaId = async (): Promise<number> => {
    if (productoMedidaId !== null) return productoMedidaId;
    const existing = await prisma.producto.findFirst({ where: { tipo: 'a_medida' } });
    if (existing) { productoMedidaId = existing.id; return existing.id; }
    const created = await prisma.producto.create({
      data: {
        nombre: 'Pallet a medida',
        tipo: 'a_medida',
        condicion: 'nuevo',
        propietarioId: usuarioId,
        descripcion: 'Producto genérico para cotizaciones con medidas personalizadas',
      },
    });
    productoMedidaId = created.id;
    return created.id;
  };

  for (const detalle of datos.detalles) {
    let precioUnit: number;
    const productoIdReal = detalle.esAMedida ? await getProductoMedidaId() : detalle.productoId;

    if (detalle.precioUnitario !== undefined && detalle.precioUnitario > 0) {
      // Precio especial enviado desde el frontend (incluye pallets a medida)
      precioUnit = detalle.precioUnitario;
    } else {
      // Precio guardado en el módulo de productos
      const precio = await calcularPrecioService(detalle.productoId, detalle.cantidad);
      precioUnit = Number(precio.precioUnitario);
    }
    const subtotal = precioUnit * detalle.cantidad;
    totalSinIva += subtotal;
    detallesConPrecio.push({
      ...detalle,
      productoId: productoIdReal,
      precioUnitario: precioUnit,
      subtotal,
    });
  }

  if (datos.incluyeFlete && datos.costoFlete && datos.fleteIncluido) {
    totalSinIva += datos.costoFlete;
  }
  if (datos.requiereSenasa && datos.costoSenasa) {
    totalSinIva += datos.costoSenasa;
  }

  const totalConIva = totalSinIva * 1.21;

  const fechaVencimiento = new Date();
  fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);

  return prisma.cotizacion.create({
    data: {
      clienteId: datos.clienteId,
      usuarioId,
      fechaVencimiento,
      incluyeFlete: datos.incluyeFlete,
      costoFlete: datos.costoFlete,
      fleteIncluido: datos.fleteIncluido ?? true,
      requiereSenasa: datos.requiereSenasa,
      costoSenasa: datos.costoSenasa,
      totalSinIva,
      totalConIva,
      canalEnvio: datos.canalEnvio,
      observaciones: datos.observaciones,
      detalles: {
        create: detallesConPrecio.map((d) => ({
          productoId: d.productoId,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          subtotal: d.subtotal,
          esAMedida: d.esAMedida ?? false,
          especificacion: d.especificacion ? { create: d.especificacion } : undefined,
        })),
      },
    },
    include: {
      cliente: true,
      detalles: { include: { producto: true } },
    },
  });
};

export const actualizarEstadoCotizacionService = async (
  id: number,
  estado: 'enviada' | 'en_seguimiento' | 'aceptada' | 'rechazada' | 'perdida' | 'vencida',
  usuarioId: number
) => {
  const cotizacion = await prisma.cotizacion.findUnique({ where: { id } });
  if (!cotizacion) throw new Error('Cotización no encontrada');
  return prisma.cotizacion.update({ where: { id }, data: { estado } });
};

export const registrarSeguimientoService = async (
  cotizacionId: number,
  datos: {
    tipoContacto: 'whatsapp' | 'llamada' | 'email' | 'presencial';
    resultado: 'sin_respuesta' | 'interesado' | 'no_interesado' | 'cerrado' | 'reprogramado';
    observaciones?: string;
    proximoContacto?: Date;
  },
  usuarioId: number
) => {
  const cotizacion = await prisma.cotizacion.findUnique({ where: { id: cotizacionId } });
  if (!cotizacion) throw new Error('Cotización no encontrada');

  const seguimiento = await prisma.seguimientoCotizacion.create({
    data: { cotizacionId, usuarioId, ...datos },
  });

  let nuevoEstado = cotizacion.estado;
  if (datos.resultado === 'cerrado') nuevoEstado = 'aceptada';
  if (datos.resultado === 'no_interesado') nuevoEstado = 'perdida';
  if (datos.resultado === 'sin_respuesta') nuevoEstado = 'en_seguimiento';

  await prisma.cotizacion.update({ where: { id: cotizacionId }, data: { estado: nuevoEstado } });

  return seguimiento;
};

export const convertirCotizacionAVentaService = async (
  cotizacionId: number,
  datos: {
    tipoEntrega: 'retira_cliente' | 'envio_woodpallet';
    metodoPago: 'transferencia' | 'e_check' | 'efectivo';
    cuentaDestino?: string;
    modalidadPago: 'adelantado' | 'contra_entrega' | 'por_partes';
    fechaRetiro?: Date;
    lugarEntrega?: string;
    fechaEntrega?: Date;
    observaciones?: string;
  },
  usuarioId: number
) => {
  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: { detalles: true, venta: true },
  });

  if (!cotizacion) throw new Error('Cotización no encontrada');
  if (cotizacion.estado === 'rechazada') throw new Error('No se puede convertir una cotización rechazada');
  if (cotizacion.venta) throw new Error('Esta cotización ya fue convertida en venta');

  // Si aún no estaba aceptada, la marcamos como aceptada automáticamente al convertir
  if (cotizacion.estado !== 'aceptada') {
    await prisma.cotizacion.update({ where: { id: cotizacionId }, data: { estado: 'aceptada' } });
  }

  const venta = await prisma.venta.create({
    data: {
      cotizacionId,
      clienteId: cotizacion.clienteId,
      usuarioId,
      tipoEntrega: datos.tipoEntrega,
      requiereSenasa: cotizacion.requiereSenasa,
      metodoPago: datos.metodoPago as any,
      cuentaDestino: datos.cuentaDestino,
      modalidadPago: datos.modalidadPago as any,
      fechaRetiro: datos.fechaRetiro,
      lugarEntrega: datos.lugarEntrega,
      fechaEstimEntrega: datos.fechaEntrega,
      totalSinIva: cotizacion.totalSinIva,
      totalConIva: cotizacion.totalConIva,
      costoFlete: cotizacion.costoFlete,
      observaciones: datos.observaciones,
      detalles: {
        create: cotizacion.detalles.map((d) => ({
          productoId: d.productoId,
          cantidadPedida: d.cantidad,
          precioUnitario: d.precioUnitario,
          subtotal: d.subtotal,
        })),
      },
    },
    include: {
      cliente: true,
      detalles: { include: { producto: true } },
    },
  });

  // ── Auto-crear factura en estado pendiente ──────────────────────────────
  const totalConIva = Number(cotizacion.totalConIva ?? 0);
  const totalNeto = Number(cotizacion.totalSinIva ?? totalConIva / 1.21);
  const iva = totalConIva - totalNeto;

  await prisma.factura.create({
    data: {
      ventaId: venta.id,
      clienteId: cotizacion.clienteId,
      usuarioId,
      totalNeto,
      iva,
      totalConIva,
      estadoCobro: 'pendiente',
      metodoPago: datos.metodoPago as any,
      cuentaDestino: datos.cuentaDestino,
      modalidadPago: datos.modalidadPago,
      observaciones: `Generada automáticamente al convertir cotización #${cotizacionId}`,
    },
  });

  // ── Auto-crear logística si incluye flete con envío ────────────────────
  if (cotizacion.incluyeFlete && datos.tipoEntrega === 'envio_woodpallet') {
    const usuarioVenta = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    const esJuanCruz = usuarioVenta?.rol === 'propietario_juancruz';

    await prisma.logistica.create({
      data: {
        ventaId: venta.id,
        nombreTransportista: '',
        costoFlete: cotizacion.costoFlete ? Number(cotizacion.costoFlete) : undefined,
        horaEstimadaEntrega: datos.fechaEntrega,
        estadoEntrega: 'pendiente',
        estadoConsulta: esJuanCruz ? 'pendiente_consulta' : 'no_aplica',
        registradoPorId: usuarioId,
        lugarEntrega: datos.lugarEntrega,
      },
    });
  }

  // Mantener estado 'aceptada' en la cotización
  await prisma.cotizacion.update({
    where: { id: cotizacionId },
    data: { estado: 'aceptada' },
  });

  return venta;
};

export const generarTextoWhatsAppService = async (cotizacionId: number) => {
  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: {
      cliente: { select: { razonSocial: true } },
      detalles: {
        include: {
          producto: {
            select: {
              nombre: true,
              tipo: true,
              condicion: true,
              dimensionLargo: true,
              dimensionAncho: true,
              cargaMaximaKg: true,
            },
          },
        },
      },
    },
  });

  if (!cotizacion) throw new Error('Cotización no encontrada');

  let texto = `*Cotización Wood Pallet*\n`;
  texto += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  texto += `Cliente: ${cotizacion.cliente.razonSocial}\n\n`;

  for (const detalle of cotizacion.detalles) {
    const p = detalle.producto;
    texto += `📦 *${p.nombre}*\n`;
    texto += `   Condición: ${p.condicion}\n`;
    if (p.dimensionLargo && p.dimensionAncho) {
      texto += `   Dimensión: ${p.dimensionLargo} x ${p.dimensionAncho} mm\n`;
    }
    if (p.cargaMaximaKg) {
      texto += `   Carga máxima: ${p.cargaMaximaKg} kg\n`;
    }
    texto += `   Cantidad: ${detalle.cantidad} unidades\n`;
    texto += `   Precio unitario: $${Number(detalle.precioUnitario).toLocaleString('es-AR')} + IVA\n`;
    texto += `   Subtotal: $${Number(detalle.subtotal).toLocaleString('es-AR')} + IVA\n\n`;
  }

  if (cotizacion.incluyeFlete && cotizacion.costoFlete) {
    if (cotizacion.fleteIncluido) {
      texto += `�� Flete incluido en el precio\n\n`;
    } else {
      texto += `🚛 Flete: $${Number(cotizacion.costoFlete).toLocaleString('es-AR')}\n\n`;
    }
  }

  if (cotizacion.requiereSenasa && cotizacion.costoSenasa) {
    texto += `🌿 Tratamiento SENASA: $${Number(cotizacion.costoSenasa).toLocaleString('es-AR')}\n\n`;
  }

  texto += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  texto += `*Total + IVA: $${Number(cotizacion.totalConIva).toLocaleString('es-AR')}*\n\n`;
  texto += `_Válida por 7 días_\n`;
  texto += `_Wood Pallet — 11 6623-1866_`;

  return { texto };
};

export const getCotizacionesPendientesService = async () => {
  const hace3Dias = new Date();
  hace3Dias.setDate(hace3Dias.getDate() - 3);

  return prisma.cotizacion.findMany({
    where: {
      estado: { in: ['enviada', 'en_seguimiento'] },
      fechaCotizacion: { lte: hace3Dias },
    },
    include: {
      cliente: { select: { id: true, razonSocial: true, telefonoContacto: true } },
      usuario: { select: { id: true, nombre: true, apellido: true } },
    },
    orderBy: { fechaCotizacion: 'asc' },
  });
};
