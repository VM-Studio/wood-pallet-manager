import prisma from '../utils/prisma';

export const getVentasService = async (usuarioId: number, rol: string) => {
  const where = rol === 'admin' ? { esHistorica: false } : { usuarioId, esHistorica: false };

  return prisma.venta.findMany({
    where,
    include: {
      cliente: { select: { id: true, razonSocial: true, nombreContacto: true, telefonoContacto: true } },
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      detalles: {
        include: {
          producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
          retiros: true,
        },
      },
      facturas: { select: { id: true, estadoCobro: true, totalConIva: true } },
      logistica: { select: { id: true, estadoEntrega: true, fechaRetiroGalpon: true } },
    },
    orderBy: { fechaVenta: 'desc' },
  });
};

export const getVentaByIdService = async (id: number) => {
  const venta = await prisma.venta.findUnique({
    where: { id },
    include: {
      cliente: true,
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      canceladaPor: { select: { id: true, nombre: true, apellido: true } },
      cotizacion: { select: { id: true, fechaCotizacion: true } },
      detalles: {
        include: {
          producto: true,
          especificacion: true,
          retiros: {
            include: {
              registradoPor: { select: { nombre: true, apellido: true } },
            },
            orderBy: { fechaRetiro: 'desc' },
          },
        },
      },
      facturas: { include: { pagos: true } },
      logistica: {
        include: {
          registradoPor: { select: { id: true, nombre: true, apellido: true } },
          consultadaPor: { select: { id: true, nombre: true, apellido: true } },
        },
      },
      solicitudesLogistica: {
        include: {
          solicitante: { select: { id: true, nombre: true, apellido: true, rol: true } },
          destinatario: { select: { id: true, nombre: true, apellido: true, rol: true } },
        },
        orderBy: { fechaSolicitud: 'desc' },
      },
    },
  });
  if (!venta) throw new Error('Venta no encontrada');
  return venta;
};

export const actualizarEstadoVentaService = async (
  id: number,
  estado:
    | 'confirmado'
    | 'en_preparacion'
    | 'listo_para_envio'
    | 'en_transito'
    | 'entregado'
    | 'entregado_parcial'
    | 'cancelado'
) => {
  const venta = await prisma.venta.findUnique({ where: { id }, include: { retiroGalpon: true } });
  if (!venta) throw new Error('Venta no encontrada');
  if (venta.estadoPedido === 'cancelado') throw new Error('La venta está cancelada: no se puede cambiar su estado');
  // La cancelación pide motivo y se propaga a todos los módulos: va por su propio endpoint
  if (estado === 'cancelado') throw new Error('Para cancelar la venta usá el botón "Cancelar venta"');

  return prisma.$transaction(async (tx) => {
    const actualizada = await tx.venta.update({
      where: { id },
      data: {
        estadoPedido: estado,
        fechaEntregaReal: estado === 'entregado' ? new Date() : undefined,
      },
    });

    // Mantener el retiro de galpón (módulo Retiros) alineado con el estado de la venta
    if (venta.retiroGalpon) {
      const actual = venta.retiroGalpon.estadoRetiro;
      // Estados intermedios de la venta: si el retiro estaba cerrado o parcial, se reabre como pendiente
      const estadoRetiro =
        estado === 'entregado' ? 'completado'
        : estado === 'entregado_parcial' ? 'parcial'
        : estado === 'confirmado' ? 'confirmado'
        : ['parcial', 'completado'].includes(actual) ? 'pendiente' : actual;
      if (estadoRetiro !== actual) {
        await tx.retiro.update({ where: { id: venta.retiroGalpon.id }, data: { estadoRetiro } });
      }
    }

    return actualizada;
  });
};

// ─── RETIROS PARCIALES (fuente única) ─────────────────────────────────────────
// Registra retiros por producto de una venta y sincroniza, en una sola
// transacción: detalle de venta, estado de la venta (Ventas/Logística)
// y el retiro de galpón (módulo Retiros). Lo usan tanto el detalle de la venta
// como el botón "Retiro parcial" del módulo Retiros.
export const registrarRetirosVentaService = async (
  ventaId: number,
  items: { detalleVentaId: number; cantidad: number }[],
  usuarioId: number
) => {
  const itemsValidos = items.filter((i) => i.cantidad > 0);
  if (!itemsValidos.length) throw new Error('Ingresá la cantidad retirada de al menos un producto');

  return prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findUnique({
      where: { id: ventaId },
      include: { detalles: { include: { retiros: true, producto: { select: { nombre: true } } } }, retiroGalpon: true },
    });
    if (!venta) throw new Error('Venta no encontrada');
    if (venta.estadoPedido === 'cancelado') throw new Error('La venta está cancelada');
    if (venta.retiroGalpon && ['completado', 'cancelado'].includes(venta.retiroGalpon.estadoRetiro)) {
      throw new Error('No se puede registrar un retiro parcial en el estado actual del retiro');
    }

    const retiradoPorDetalle = new Map(
      venta.detalles.map((d) => [d.id, d.retiros.reduce((acc, r) => acc + r.cantidadRetirada, 0)])
    );

    for (const item of itemsValidos) {
      const detalle = venta.detalles.find((d) => d.id === item.detalleVentaId);
      if (!detalle) throw new Error('El producto no pertenece a esta venta');
      const pendiente = detalle.cantidadPedida - retiradoPorDetalle.get(detalle.id)!;
      if (item.cantidad > pendiente) {
        throw new Error(`Solo quedan ${pendiente} unidades pendientes de retiro de ${detalle.producto.nombre}`);
      }

      await tx.retiroParcial.create({
        data: { detalleVentaId: detalle.id, cantidadRetirada: item.cantidad, registradoPorId: usuarioId },
      });
      const nuevoRetirado = retiradoPorDetalle.get(detalle.id)! + item.cantidad;
      retiradoPorDetalle.set(detalle.id, nuevoRetirado);
      await tx.detalleVenta.update({
        where: { id: detalle.id },
        data: { cantidadEntregada: nuevoRetirado },
      });
      // El stock NO se toca acá: si la venta es de stock propio ya se descontó
      // completo al confirmarla, y si es compra directa nunca fue stock propio.
    }

    const totalPedido = venta.detalles.reduce((acc, d) => acc + d.cantidadPedida, 0);
    const totalRetirado = [...retiradoPorDetalle.values()].reduce((acc, n) => acc + n, 0);
    const completo = venta.detalles.every((d) => retiradoPorDetalle.get(d.id)! >= d.cantidadPedida);
    const ahora = new Date();

    await tx.venta.update({
      where: { id: ventaId },
      data: {
        estadoPedido: completo ? 'entregado' : 'entregado_parcial',
        fechaEntregaReal: completo ? ahora : undefined,
      },
    });

    if (venta.retiroGalpon) {
      await tx.retiro.update({
        where: { id: venta.retiroGalpon.id },
        data: {
          estadoRetiro: completo ? 'completado' : 'parcial',
          cantidadRetiradaParcial: totalRetirado,
          fechaUltimoRetiroParcial: ahora,
          ...(completo ? { confirmadoPorId: usuarioId, fechaConfirmacion: ahora } : {}),
        },
      });
    }

    return {
      completo,
      totalPedido,
      totalRetirado,
      pendiente: totalPedido - totalRetirado,
      detalles: venta.detalles.map((d) => ({
        detalleVentaId: d.id,
        producto: d.producto.nombre,
        cantidadPedida: d.cantidadPedida,
        cantidadRetirada: retiradoPorDetalle.get(d.id)!,
        cantidadPendiente: d.cantidadPedida - retiradoPorDetalle.get(d.id)!,
      })),
    };
  });
};

// Retiro de un solo producto (usado desde el detalle de la venta)
export const registrarRetiroParcialService = async (
  detalleVentaId: number,
  cantidadRetirada: number,
  usuarioId: number
) => {
  const detalle = await prisma.detalleVenta.findUnique({ where: { id: detalleVentaId } });
  if (!detalle) throw new Error('Detalle de venta no encontrado');

  const resultado = await registrarRetirosVentaService(
    detalle.ventaId,
    [{ detalleVentaId, cantidad: cantidadRetirada }],
    usuarioId
  );
  const resumen = resultado.detalles.find((d) => d.detalleVentaId === detalleVentaId)!;

  return {
    completo: resultado.completo,
    resumen: {
      cantidadPedida: resumen.cantidadPedida,
      cantidadRetirada: resumen.cantidadRetirada,
      cantidadPendiente: resumen.cantidadPendiente,
    },
  };
};

export const getResumenRetiroService = async (ventaId: number) => {
  const detalles = await prisma.detalleVenta.findMany({
    where: { ventaId },
    include: {
      producto: { select: { nombre: true } },
      retiros: { orderBy: { fechaRetiro: 'desc' } },
    },
  });

  return detalles.map((d) => {
    const totalRetirado = d.retiros.reduce((acc, r) => acc + r.cantidadRetirada, 0);
    return {
      detalleId: d.id,
      producto: d.producto.nombre,
      cantidadPedida: d.cantidadPedida,
      cantidadRetirada: totalRetirado,
      cantidadPendiente: d.cantidadPedida - totalRetirado,
      porcentajeEntregado: Math.round((totalRetirado / d.cantidadPedida) * 100),
      retiros: d.retiros,
    };
  });
};

export const getVentasActivasService = async () => {
  return prisma.venta.findMany({
    where: {
      estadoPedido: {
        in: [
          'confirmado',
          'en_preparacion',
          'listo_para_envio',
          'en_transito',
          'entregado_parcial',
        ],
      },
    },
    include: {
      cliente: { select: { id: true, razonSocial: true } },
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      cotizacion: { select: { costoFlete: true } },
      detalles: {
        include: {
          producto: { select: { nombre: true } },
        },
      },
      logistica: {
        select: { estadoEntrega: true, fechaRetiroGalpon: true, horaEstimadaEntrega: true },
      },
    },
    orderBy: { fechaVenta: 'asc' },
  });
};

export const getVentasPorPeriodoService = async (
  desde: Date,
  hasta: Date,
  usuarioId?: number
) => {
  const where: any = { fechaVenta: { gte: desde, lte: hasta }, estadoPedido: { not: 'cancelado' } };
  if (usuarioId) where.usuarioId = usuarioId;

  const ventas = await prisma.venta.findMany({
    where,
    include: {
      cliente: { select: { razonSocial: true } },
      usuario: { select: { nombre: true, apellido: true, rol: true } },
      detalles: {
        include: { producto: { select: { nombre: true, tipo: true } } },
      },
      facturas: { select: { estadoCobro: true, totalConIva: true } },
    },
    orderBy: { fechaVenta: 'desc' },
  });

  const totalPallets = ventas.reduce(
    (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
    0
  );
  const totalFacturado = ventas.reduce(
    (acc, v) => acc + Number(v.totalConIva || 0),
    0
  );

  return {
    ventas,
    resumen: { totalVentas: ventas.length, totalPallets, totalFacturado },
  };
};
