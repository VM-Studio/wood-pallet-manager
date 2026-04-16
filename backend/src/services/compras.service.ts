import prisma from '../utils/prisma';

export const getComprasService = async (usuarioId: number, rol: string) => {
  const where = rol === 'admin' ? {} : { usuarioId };

  return prisma.compra.findMany({
    where,
    include: {
      proveedor: { select: { id: true, nombreEmpresa: true, nombreContacto: true } },
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      detalles: {
        include: { producto: { select: { id: true, nombre: true, tipo: true } } },
      },
      pagos: true,
    },
    orderBy: { fechaCompra: 'desc' },
  });
};

export const getCompraByIdService = async (id: number) => {
  const compra = await prisma.compra.findUnique({
    where: { id },
    include: {
      proveedor: true,
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      venta: { select: { id: true, cliente: { select: { razonSocial: true } } } },
      detalles: { include: { producto: true } },
      pagos: {
        include: { registradoPor: { select: { nombre: true, apellido: true } } },
      },
    },
  });
  if (!compra) throw new Error('Compra no encontrada');
  return compra;
};

export const crearCompraService = async (
  datos: {
    proveedorId: number;
    ventaId?: number;
    esAnticipado?: boolean;
    nroRemito?: string;
    observaciones?: string;
    detalles: { productoId: number; cantidad: number; precioCostoUnit: number }[];
  },
  usuarioId: number,
  rol: string
) => {
  if (datos.proveedorId === 2 && rol !== 'propietario_carlos' && rol !== 'admin') {
    throw new Error('Solo Carlos puede realizar compras a Todo Pallets');
  }

  const total = datos.detalles.reduce(
    (acc, d) => acc + d.precioCostoUnit * d.cantidad,
    0
  );

  return prisma.compra.create({
    data: {
      proveedorId: datos.proveedorId,
      usuarioId,
      ventaId: datos.ventaId,
      esAnticipado: datos.esAnticipado ?? false,
      total,
      nroRemito: datos.nroRemito,
      observaciones: datos.observaciones,
      detalles: {
        create: datos.detalles.map((d) => ({
          productoId: d.productoId,
          cantidad: d.cantidad,
          precioCostoUnit: d.precioCostoUnit,
          subtotal: d.precioCostoUnit * d.cantidad,
        })),
      },
    },
    include: {
      proveedor: true,
      detalles: { include: { producto: true } },
    },
  });
};

export const actualizarEstadoCompraService = async (
  id: number,
  estado: 'solicitada' | 'confirmada' | 'recibida' | 'pagada'
) => {
  const compra = await prisma.compra.findUnique({
    where: { id },
    include: { detalles: true },
  });
  if (!compra) throw new Error('Compra no encontrada');

  // Al recibir la compra actualizar stock
  if (estado === 'recibida' && compra.estado !== 'recibida') {
    for (const detalle of compra.detalles) {
      const stockEntry = await prisma.stock.findFirst({
        where: { productoId: detalle.productoId, proveedorId: compra.proveedorId },
      });

      if (stockEntry) {
        await prisma.stock.update({
          where: { id: stockEntry.id },
          data: { cantidadDisponible: { increment: detalle.cantidad } },
        });
        await prisma.movimientoStock.create({
          data: {
            stockId: stockEntry.id,
            tipoMovimiento: 'entrada',
            cantidad: detalle.cantidad,
            motivo: 'compra',
            idReferencia: compra.id,
            registradoPorId: compra.usuarioId,
          },
        });
      } else {
        const nuevoStock = await prisma.stock.create({
          data: {
            productoId: detalle.productoId,
            proveedorId: compra.proveedorId,
            cantidadDisponible: detalle.cantidad,
            cantidadMinima: 20,
          },
        });
        await prisma.movimientoStock.create({
          data: {
            stockId: nuevoStock.id,
            tipoMovimiento: 'entrada',
            cantidad: detalle.cantidad,
            motivo: 'compra',
            idReferencia: compra.id,
            registradoPorId: compra.usuarioId,
          },
        });
      }
    }
  }

  return prisma.compra.update({ where: { id }, data: { estado } });
};

export const registrarPagoProveedorService = async (
  compraId: number,
  datos: {
    monto: number;
    medioPago: 'transferencia' | 'e_check' | 'efectivo';
    nroComprobante?: string;
    observaciones?: string;
  },
  usuarioId: number
) => {
  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    include: { pagos: true },
  });
  if (!compra) throw new Error('Compra no encontrada');

  const totalPagado = compra.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
  const saldoPendiente = Number(compra.total) - totalPagado;

  if (datos.monto > saldoPendiente) {
    throw new Error(
      `El monto supera el saldo pendiente de $${saldoPendiente.toLocaleString('es-AR')}`
    );
  }

  const pago = await prisma.pagoProveedor.create({
    data: {
      compraId,
      proveedorId: compra.proveedorId,
      monto: datos.monto,
      medioPago: datos.medioPago,
      nroComprobante: datos.nroComprobante,
      observaciones: datos.observaciones,
      registradoPorId: usuarioId,
    },
  });

  const nuevoTotalPagado = totalPagado + datos.monto;
  if (nuevoTotalPagado >= Number(compra.total)) {
    await prisma.compra.update({ where: { id: compraId }, data: { estado: 'pagada' } });
  }

  return pago;
};

export const getDeudaProveedoresService = async () => {
  const comprasPendientes = await prisma.compra.findMany({
    where: { estado: { in: ['solicitada', 'confirmada', 'recibida'] } },
    include: {
      proveedor: { select: { id: true, nombreEmpresa: true, nombreContacto: true } },
      pagos: true,
    },
  });

  const deudaPorProveedor: Record<number, any> = {};

  for (const compra of comprasPendientes) {
    const totalPagado = compra.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
    const saldo = Number(compra.total || 0) - totalPagado;

    if (saldo > 0) {
      const provId = compra.proveedor.id;
      if (!deudaPorProveedor[provId]) {
        deudaPorProveedor[provId] = {
          proveedor: compra.proveedor,
          deudaTotal: 0,
          comprasPendientes: 0,
        };
      }
      deudaPorProveedor[provId].deudaTotal += saldo;
      deudaPorProveedor[provId].comprasPendientes += 1;
    }
  }

  return Object.values(deudaPorProveedor);
};
