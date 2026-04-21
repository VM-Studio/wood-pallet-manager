import prisma from '../utils/prisma';

// Obtener compras filtradas por usuario y rol
export const getComprasService = async (usuarioId: number, rol: string) => {
  const where = rol === 'admin' ? {} : { usuarioId };

  return await prisma.compra.findMany({
    where,
    include: {
      proveedor: { select: { id: true, nombreEmpresa: true, nombreContacto: true } },
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      detalles: { include: { producto: { select: { id: true, nombre: true, tipo: true } } } },
      pagos: true
    },
    orderBy: { fechaCompra: 'desc' }
  });
};

// Crear una compra nueva
export const crearCompraService = async (
  datos: {
    proveedorId: number;
    tipoCompra: 'reventa_inmediata' | 'stock_propio';
    nroRemito?: string;
    observaciones?: string;
    detalles: { productoId: number; cantidad: number; precioCostoUnit: number }[];
  },
  usuarioId: number,
  rol: string
) => {
  const proveedor = await prisma.proveedor.findUnique({ where: { id: datos.proveedorId } });
  if (!proveedor) throw new Error('Proveedor no encontrado');

  if (rol === 'propietario_juancruz' && proveedor.tipoProducto !== 'seminuevo') {
    throw new Error('Juan Cruz solo puede comprar al Galpón Familiar (pallets semi-nuevos)');
  }

  const total = datos.detalles.reduce(
    (acc, d) => acc + d.precioCostoUnit * d.cantidad, 0
  );

  const compra = await prisma.compra.create({
    data: {
      proveedorId: datos.proveedorId,
      usuarioId,
      tipoCompra: datos.tipoCompra,
      total,
      nroRemito: datos.nroRemito,
      observaciones: datos.observaciones,
      estado: 'pendiente_pago',
      saldoDeudor: true,
      detalles: {
        create: datos.detalles.map(d => ({
          productoId: d.productoId,
          cantidad: d.cantidad,
          precioCostoUnit: d.precioCostoUnit,
          subtotal: d.precioCostoUnit * d.cantidad
        }))
      }
    },
    include: {
      proveedor: true,
      detalles: { include: { producto: true } }
    }
  });

  // Actualizar el stock del producto
  for (const detalle of datos.detalles) {
    const stockEntry = await prisma.stock.findFirst({
      where: { productoId: detalle.productoId, proveedorId: datos.proveedorId }
    });

    if (stockEntry) {
      if (datos.tipoCompra === 'stock_propio') {
        await prisma.stock.update({
          where: { id: stockEntry.id },
          data: {
            cantidadDisponible: { increment: detalle.cantidad },
            cantidadDeudora: { increment: detalle.cantidad }
          }
        });
      } else {
        await prisma.stock.update({
          where: { id: stockEntry.id },
          data: { cantidadDeudora: { increment: detalle.cantidad } }
        });
      }

      await prisma.movimientoStock.create({
        data: {
          stockId: stockEntry.id,
          tipoMovimiento: 'entrada',
          cantidad: detalle.cantidad,
          motivo: 'compra',
          idReferencia: compra.id,
          registradoPorId: usuarioId
        }
      });
    } else {
      const nuevoStock = await prisma.stock.create({
        data: {
          productoId: detalle.productoId,
          proveedorId: datos.proveedorId,
          cantidadDisponible: datos.tipoCompra === 'stock_propio' ? detalle.cantidad : 0,
          cantidadDeudora: detalle.cantidad,
          cantidadMinima: 20
        }
      });

      await prisma.movimientoStock.create({
        data: {
          stockId: nuevoStock.id,
          tipoMovimiento: 'entrada',
          cantidad: detalle.cantidad,
          motivo: 'compra',
          idReferencia: compra.id,
          registradoPorId: usuarioId
        }
      });
    }
  }

  return compra;
};

// Registrar el pago de una compra (tick)
export const registrarPagoCompraService = async (
  compraId: number,
  datos: {
    metodoPago: 'transferencia' | 'e_check' | 'efectivo';
    cuentaDestino?: string;
    nroComprobante?: string;
    observaciones?: string;
  },
  usuarioId: number
) => {
  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    include: { detalles: true }
  });

  if (!compra) throw new Error('Compra no encontrada');
  if (compra.estado === 'pagada') throw new Error('Esta compra ya fue pagada');

  const compraActualizada = await prisma.compra.update({
    where: { id: compraId },
    data: {
      estado: 'pagada',
      saldoDeudor: false,
      fechaPago: new Date(),
      metodoPago: datos.metodoPago as any,
      cuentaDestino: datos.cuentaDestino,
      nroComprobante: datos.nroComprobante,
    }
  });

  // Bajar la cantidad deudora del stock
  for (const detalle of compra.detalles) {
    const stockEntry = await prisma.stock.findFirst({
      where: { productoId: detalle.productoId, proveedorId: compra.proveedorId }
    });

    if (stockEntry) {
      await prisma.stock.update({
        where: { id: stockEntry.id },
        data: { cantidadDeudora: { decrement: detalle.cantidad } }
      });
    }
  }

  return compraActualizada;
};

// Cancelar una compra (cruz — sin stock)
export const cancelarCompraService = async (compraId: number, usuarioId: number) => {
  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    include: { detalles: true }
  });

  if (!compra) throw new Error('Compra no encontrada');
  if (compra.estado !== 'pendiente_pago') throw new Error('Solo se pueden cancelar compras pendientes');

  for (const detalle of compra.detalles) {
    const stockEntry = await prisma.stock.findFirst({
      where: { productoId: detalle.productoId, proveedorId: compra.proveedorId }
    });

    if (stockEntry) {
      const updateData: any = {
        cantidadDeudora: { decrement: detalle.cantidad }
      };
      if (compra.tipoCompra === 'stock_propio') {
        updateData.cantidadDisponible = { decrement: detalle.cantidad };
      }
      await prisma.stock.update({
        where: { id: stockEntry.id },
        data: updateData
      });
    }
  }

  return await prisma.compra.update({
    where: { id: compraId },
    data: { estado: 'cancelada', saldoDeudor: false }
  });
};

// Obtener la deuda total con proveedores
export const getDeudaProveedoresService = async () => {
  const comprasPendientes = await prisma.compra.findMany({
    where: { saldoDeudor: true },
    include: {
      proveedor: { select: { id: true, nombreEmpresa: true, nombreContacto: true } },
    }
  });

  const deudaPorProveedor: Record<number, any> = {};

  for (const compra of comprasPendientes) {
    const provId = compra.proveedor.id;
    if (!deudaPorProveedor[provId]) {
      deudaPorProveedor[provId] = {
        proveedor: compra.proveedor,
        deudaTotal: 0,
        comprasPendientes: 0
      };
    }
    deudaPorProveedor[provId].deudaTotal += Number(compra.total || 0);
    deudaPorProveedor[provId].comprasPendientes += 1;
  }

  return Object.values(deudaPorProveedor);
};
