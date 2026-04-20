import prisma from '../utils/prisma';

export const getFacturasService = async (usuarioId: number, rol: string) => {
  const where = rol === 'admin' ? {} : { usuarioId };

  return prisma.factura.findMany({
    where,
    include: {
      cliente: { select: { id: true, razonSocial: true, cuit: true } },
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      venta: { select: { id: true, estadoPedido: true, tipoEntrega: true } },
      pagos: true,
    },
    orderBy: { fechaEmision: 'desc' },
  });
};

export const getFacturaByIdService = async (id: number) => {
  const factura = await prisma.factura.findUnique({
    where: { id },
    include: {
      cliente: true,
      usuario: { select: { nombre: true, apellido: true, rol: true } },
      venta: {
        include: { detalles: { include: { producto: true } } },
      },
      pagos: {
        include: { registradoPor: { select: { nombre: true, apellido: true } } },
        orderBy: { fechaPago: 'desc' },
      },
      notasCredito: true,
    },
  });

  if (!factura) throw new Error('Factura no encontrada');
  return factura;
};

export const crearFacturaService = async (
  datos: {
    ventaId: number;
    nroFactura?: string;
    esSinFactura?: boolean;
    fechaVencimiento?: Date;
    totalNeto: number;
    iva: number;
    totalConIva: number;
    observaciones?: string;
  },
  usuarioId: number
) => {
  const venta = await prisma.venta.findUnique({ where: { id: datos.ventaId } });
  if (!venta) throw new Error('Venta no encontrada');

  const facturaExistente = await prisma.factura.findFirst({
    where: { ventaId: datos.ventaId },
  });
  if (facturaExistente) throw new Error('Esta venta ya tiene una factura asociada');

  return prisma.factura.create({
    data: {
      ventaId: datos.ventaId,
      clienteId: venta.clienteId,
      usuarioId,
      nroFactura: datos.nroFactura,
      esSinFactura: datos.esSinFactura ?? false,
      fechaVencimiento: datos.fechaVencimiento,
      totalNeto: datos.totalNeto,
      iva: datos.iva,
      totalConIva: datos.totalConIva,
      observaciones: datos.observaciones,
    },
    include: {
      cliente: { select: { razonSocial: true } },
    },
  });
};

export const registrarCobroService = async (
  facturaId: number,
  datos: {
    monto: number;
    medioPago: 'transferencia' | 'e_check' | 'efectivo';
    nroComprobante?: string;
    esAdelanto?: boolean;
    observaciones?: string;
  },
  usuarioId: number
) => {
  const factura = await prisma.factura.findUnique({
    where: { id: facturaId },
    include: { pagos: true },
  });

  if (!factura) throw new Error('Factura no encontrada');
  if (factura.estadoCobro === 'cobrada_total') {
    throw new Error('Esta factura ya fue cobrada en su totalidad');
  }

  const totalCobrado = factura.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
  const saldoPendiente = Number(factura.totalConIva) - totalCobrado;

  if (datos.monto > saldoPendiente + 0.01) {
    throw new Error(
      `El monto supera el saldo pendiente de $${saldoPendiente.toLocaleString('es-AR')}`
    );
  }

  const pago = await prisma.pagoCobro.create({
    data: {
      facturaId,
      clienteId: factura.clienteId,
      monto: datos.monto,
      medioPago: datos.medioPago,
      nroComprobante: datos.nroComprobante,
      esAdelanto: datos.esAdelanto ?? false,
      registradoPorId: usuarioId,
      observaciones: datos.observaciones,
    },
  });

  const nuevoTotalCobrado = totalCobrado + datos.monto;
  let nuevoEstado: 'pendiente' | 'cobrada_parcial' | 'cobrada_total' =
    nuevoTotalCobrado >= Number(factura.totalConIva) - 0.01
      ? 'cobrada_total'
      : 'cobrada_parcial';

  await prisma.factura.update({
    where: { id: facturaId },
    data: { estadoCobro: nuevoEstado },
  });

  return {
    pago,
    resumen: {
      totalFactura: Number(factura.totalConIva),
      totalCobrado: nuevoTotalCobrado,
      saldoPendiente: Number(factura.totalConIva) - nuevoTotalCobrado,
      estadoCobro: nuevoEstado,
    },
  };
};

export const getFacturasVencidasService = async () => {
  const hoy = new Date();

  const facturasVencidas = await prisma.factura.findMany({
    where: {
      estadoCobro: { in: ['pendiente', 'cobrada_parcial'] },
      fechaVencimiento: { lt: hoy },
    },
    include: {
      cliente: { select: { id: true, razonSocial: true, telefonoContacto: true } },
      usuario: { select: { nombre: true, apellido: true, rol: true } },
      pagos: true,
    },
    orderBy: { fechaVencimiento: 'asc' },
  });

  return facturasVencidas.map((f) => {
    const totalCobrado = f.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
    const diasVencida = Math.floor(
      (hoy.getTime() - new Date(f.fechaVencimiento!).getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      ...f,
      totalCobrado,
      saldoPendiente: Number(f.totalConIva) - totalCobrado,
      diasVencida,
      urgencia: diasVencida > 7 ? 'alta' : diasVencida > 3 ? 'media' : 'baja',
    };
  });
};

export const crearNotaCreditoService = async (
  datos: {
    facturaId: number;
    nroNota?: string;
    monto: number;
    motivo: string;
  },
  usuarioId: number
) => {
  const factura = await prisma.factura.findUnique({ where: { id: datos.facturaId } });
  if (!factura) throw new Error('Factura no encontrada');

  return prisma.notaCredito.create({
    data: {
      facturaId: datos.facturaId,
      clienteId: factura.clienteId,
      usuarioId,
      nroNota: datos.nroNota,
      monto: datos.monto,
      motivo: datos.motivo,
    },
  });
};

export const getCobrosPendientesService = async (usuarioId: number, rol: string) => {
  const where: any = {
    estadoCobro: { in: ['pendiente', 'cobrada_parcial'] },
  };
  if (rol !== 'admin') where.usuarioId = usuarioId;

  const facturas = await prisma.factura.findMany({
    where,
    include: {
      cliente: { select: { id: true, razonSocial: true, telefonoContacto: true } },
      usuario: { select: { nombre: true, apellido: true } },
      pagos: true,
    },
    orderBy: { fechaVencimiento: 'asc' },
  });

  return facturas.map((f) => {
    const totalCobrado = f.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
    return {
      ...f,
      totalCobrado,
      saldoPendiente: Number(f.totalConIva) - totalCobrado,
    };
  });
};

export const cargarNroFacturaArcaService = async (facturaId: number, nroFacturaArca: string) => {
  const factura = await prisma.factura.findUnique({ where: { id: facturaId } });
  if (!factura) throw new Error('Factura no encontrada');
  return prisma.factura.update({
    where: { id: facturaId },
    data: { nroFactura: nroFacturaArca },
  });
};
