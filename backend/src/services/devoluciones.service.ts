import prisma from '../utils/prisma';

const devolucionInclude = {
  cliente: { select: { id: true, razonSocial: true } },
  usuario: { select: { id: true, nombre: true, apellido: true } },
  venta: {
    include: {
      detalles: { include: { producto: true } },
      facturas: true,
      logistica: true,
    },
  },
  detalles: { include: { producto: true, detalleVenta: true } },
};

// ── GET ALL ─────────────────────────────────────────────────────────────────
export const getDevolucionesService = async (usuarioId: number) => {
  return prisma.devolucion.findMany({
    orderBy: { fechaSolicitud: 'desc' },
    include: devolucionInclude,
  });
};

// ── GET BY ID ────────────────────────────────────────────────────────────────
export const getDevolucionByIdService = async (id: number) => {
  return prisma.devolucion.findUnique({
    where: { id },
    include: devolucionInclude,
  });
};

// ── CREATE ───────────────────────────────────────────────────────────────────
export const crearDevolucionService = async (
  datos: {
    ventaId: number;
    tipoCaso: 'pallet_danado' | 'cliente_no_quiere' | 'devolucion_parcial' | 'cancelacion_anticipada';
    devuelveFlete: boolean;
    devuelveSenasa: boolean;
    compensaEnSiguientePedido: boolean;
    metodoPago?: 'transferencia' | 'e_check' | 'efectivo';
    cuentaDestino?: string;
    observaciones?: string;
    detalles: {
      detalleVentaId?: number;
      productoId: number;
      cantidadDevuelta: number;
      precioUnitario: number;
    }[];
  },
  usuarioId: number
) => {
  // Traer venta completa
  const venta = await prisma.venta.findUnique({
    where: { id: datos.ventaId },
    include: {
      detalles: { include: { producto: true } },
      facturas: true,
      logistica: true,
      compras: { include: { detalles: true } },
    },
  });

  if (!venta) throw new Error('Venta no encontrada');

  // ── Calcular monto de pallets a devolver ──────────────────────────────
  const montoPallets = datos.detalles.reduce((acc, d) => {
    return acc + d.cantidadDevuelta * d.precioUnitario;
  }, 0);

  // ── Calcular flete y senasa opcionales ────────────────────────────────
  const montoFlete = datos.devuelveFlete
    ? Number(venta.costoFlete ?? 0)
    : 0;

  const montoSenasa = datos.devuelveSenasa
    ? Number(venta.facturas[0]?.iva ?? 0) // aproximado si se quiere devolver senasa
    : 0;

  // Si hay factura con costoSenasa guardado lo usamos desde cotizacion
  let montoSenasaReal = 0;
  if (datos.devuelveSenasa) {
    const cotizacion = venta.cotizacionId
      ? await prisma.cotizacion.findUnique({ where: { id: venta.cotizacionId } })
      : null;
    montoSenasaReal = cotizacion ? Number(cotizacion.costoSenasa ?? 0) : 0;
  }

  const montoTotal = montoPallets + montoFlete + montoSenasaReal;

  // ── Determinar si requiere confirmación del depósito ──────────────────
  // Requieren confirmación: cliente_no_quiere, devolucion_parcial, cancelacion_anticipada con flete ejecutado
  const requiereConfirmacion =
    datos.tipoCaso === 'cliente_no_quiere' ||
    datos.tipoCaso === 'devolucion_parcial' ||
    (datos.tipoCaso === 'cancelacion_anticipada' && !datos.devuelveFlete);

  // Estado inicial
  const estadoInicial = requiereConfirmacion
    ? 'esperando_confirmacion_deposito'
    : 'confirmada';

  // ── Crear la devolución en transacción ────────────────────────────────
  const devolucion = await prisma.$transaction(async (tx) => {
    const dev = await tx.devolucion.create({
      data: {
        ventaId: datos.ventaId,
        clienteId: venta.clienteId,
        usuarioId,
        tipoCaso: datos.tipoCaso,
        estado: estadoInicial as any,
        devuelveFlete: datos.devuelveFlete,
        devuelveSenasa: datos.devuelveSenasa,
        montoPallets: montoPallets,
        montoFlete: montoFlete > 0 ? montoFlete : null,
        montoSenasa: montoSenasaReal > 0 ? montoSenasaReal : null,
        montoTotal,
        requiereConfirmacionDeposito: requiereConfirmacion,
        depositoConfirmo: !requiereConfirmacion,
        compensaEnSiguientePedido: datos.compensaEnSiguientePedido,
        metodoPago: datos.metodoPago as any,
        cuentaDestino: datos.cuentaDestino,
        observaciones: datos.observaciones,
        detalles: {
          create: datos.detalles.map((d) => ({
            detalleVentaId: d.detalleVentaId ?? null,
            productoId: d.productoId,
            cantidadDevuelta: d.cantidadDevuelta,
            precioUnitario: d.precioUnitario,
            subtotal: d.cantidadDevuelta * d.precioUnitario,
          })),
        },
      },
      include: devolucionInclude,
    });

    // ── Si no requiere confirmación → procesar inmediatamente ─────────
    if (!requiereConfirmacion && !datos.compensaEnSiguientePedido) {
      await procesarDevolucionInterna(tx, dev, venta, usuarioId);
    }

    return dev;
  });

  return devolucion;
};

// ── CONFIRMAR DEPOSITO ────────────────────────────────────────────────────────
export const confirmarDepositoService = async (id: number, usuarioId: number) => {
  const devolucion = await prisma.devolucion.findUnique({
    where: { id },
    include: {
      venta: {
        include: {
          detalles: { include: { producto: true } },
          facturas: true,
          compras: { include: { detalles: true } },
        },
      },
      detalles: { include: { producto: true } },
    },
  });

  if (!devolucion) throw new Error('Devolución no encontrada');
  if (devolucion.estado === 'procesada') throw new Error('La devolución ya fue procesada');
  if (devolucion.estado === 'cancelada') throw new Error('La devolución está cancelada');

  return prisma.$transaction(async (tx) => {
    // Marcar depósito confirmado
    await tx.devolucion.update({
      where: { id },
      data: {
        depositoConfirmo: true,
        fechaConfirmacionDeposito: new Date(),
        estado: 'confirmada',
      },
    });

    // Si no compensa en siguiente pedido, procesar devolución ahora
    if (!devolucion.compensaEnSiguientePedido) {
      await procesarDevolucionInterna(tx, devolucion as any, devolucion.venta as any, usuarioId);
    } else {
      await tx.devolucion.update({
        where: { id },
        data: { estado: 'procesada' },
      });
    }

    return tx.devolucion.findUnique({ where: { id }, include: devolucionInclude });
  });
};

// ── PROCESAR DEVOLUCIÓN (restaurar stock + actualizar factura) ────────────────
async function procesarDevolucionInterna(
  tx: any,
  devolucion: any,
  venta: any,
  usuarioId: number
) {
  // 1. Restaurar stock si la venta usó stock propio
  // Detectamos si hubo compra de tipo stock_propio asociada a esta venta,
  // o si en el momento de crear la venta se marcó usaStockPropio
  // Verificamos buscando movimientos de salida con motivo=venta asociados a esta venta
  for (const detalle of devolucion.detalles) {
    const movimientoOriginal = await tx.movimientoStock.findFirst({
      where: {
        tipoMovimiento: 'salida',
        motivo: 'venta',
        idReferencia: venta.id,
        stock: { productoId: detalle.productoId },
      },
      include: { stock: true },
    });

    if (movimientoOriginal) {
      // Restaurar stock
      await tx.stock.update({
        where: { id: movimientoOriginal.stockId },
        data: { cantidadDisponible: { increment: detalle.cantidadDevuelta } },
      });

      // Registrar movimiento de entrada por devolución
      await tx.movimientoStock.create({
        data: {
          stockId: movimientoOriginal.stockId,
          tipoMovimiento: 'entrada',
          cantidad: detalle.cantidadDevuelta,
          motivo: 'devolucion',
          idReferencia: devolucion.id,
          registradoPorId: usuarioId,
        },
      });
    }
  }

  // 2. Actualizar factura — reducir el totalConIva por el monto devuelto
  if (venta.facturas && venta.facturas.length > 0) {
    const factura = venta.facturas[0];
    const nuevoTotal = Math.max(0, Number(factura.totalConIva) - Number(devolucion.montoTotal));
    const nuevoNeto = Math.max(0, Number(factura.totalNeto) - Number(devolucion.montoPallets));
    const nuevoIva = nuevoTotal - nuevoNeto;

    await tx.factura.update({
      where: { id: factura.id },
      data: {
        totalConIva: nuevoTotal,
        totalNeto: nuevoNeto,
        iva: Math.max(0, nuevoIva),
        estadoCobro: nuevoTotal <= 0 ? 'cobrada_total' : factura.estadoCobro,
        observaciones: `${factura.observaciones ?? ''} | Devolución #${devolucion.id} aplicada: -$${devolucion.montoTotal}`.trim(),
      },
    });

    // 3. Crear nota de crédito
    await tx.notaCredito.create({
      data: {
        facturaId: factura.id,
        clienteId: venta.clienteId,
        usuarioId,
        monto: Number(devolucion.montoTotal),
        motivo: `Devolución #${devolucion.id} — Caso: ${devolucion.tipoCaso.replace(/_/g, ' ')}`,
      },
    });
  }

  // 4. Marcar devolución como procesada y stock restaurado
  await tx.devolucion.update({
    where: { id: devolucion.id },
    data: {
      estado: 'procesada',
      stockRestaurado: true,
    },
  });
}

// ── CANCELAR ──────────────────────────────────────────────────────────────────
export const cancelarDevolucionService = async (id: number) => {
  const dev = await prisma.devolucion.findUnique({ where: { id } });
  if (!dev) throw new Error('Devolución no encontrada');
  if (dev.estado === 'procesada') throw new Error('No se puede cancelar una devolución ya procesada');

  return prisma.devolucion.update({
    where: { id },
    data: { estado: 'cancelada' },
    include: devolucionInclude,
  });
};

// ── STATS para reportes ───────────────────────────────────────────────────────
export const getEstadisticasDevolucionesService = async () => {
  const [total, porCaso, montoTotal] = await Promise.all([
    prisma.devolucion.count({ where: { estado: { not: 'cancelada' } } }),
    prisma.devolucion.groupBy({
      by: ['tipoCaso'],
      _count: { id: true },
      where: { estado: { not: 'cancelada' } },
    }),
    prisma.devolucion.aggregate({
      _sum: { montoTotal: true },
      where: { estado: 'procesada' },
    }),
  ]);

  return { total, porCaso, montoTotalDevuelto: montoTotal._sum.montoTotal ?? 0 };
};
