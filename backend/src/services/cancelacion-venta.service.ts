import prisma from '../utils/prisma';

// ─── CANCELACIÓN DE VENTAS (en cascada) ───────────────────────────────────────
// Fuente única para cancelar una venta, se inicie desde Ventas o desde Retiros.
// La venta y todo lo que depende de ella quedan registrados como cancelados
// (no se borra nada): factura anulada, logística / retiro / remito cancelados,
// solicitudes y devoluciones pendientes cerradas, y el stock propio que no se
// llegó a entregar vuelve al inventario. Dashboard y reportes excluyen las
// ventas canceladas y las facturas anuladas.

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const INCLUDE_CANCELACION = {
  cliente: { select: { razonSocial: true } },
  detalles: { include: { producto: { select: { nombre: true } }, retiros: { select: { cantidadRetirada: true } } } },
  facturas: { include: { pagos: { select: { monto: true } } } },
  logistica: true,
  retiroGalpon: true,
  remito: true,
  solicitudesLogistica: { where: { estado: 'pendiente' as const } },
  devoluciones: { where: { estado: { in: ['pendiente', 'esperando_confirmacion_deposito'] as ('pendiente' | 'esperando_confirmacion_deposito')[] } } },
  compras: { include: { proveedor: { select: { nombreEmpresa: true } }, detalles: true } },
};

const cargarVenta = (db: Tx | typeof prisma, ventaId: number) =>
  db.venta.findUnique({ where: { id: ventaId }, include: INCLUDE_CANCELACION });

type VentaCancelacion = NonNullable<Awaited<ReturnType<typeof cargarVenta>>>;

const entregadoDe = (d: VentaCancelacion['detalles'][number]) =>
  Math.max(d.cantidadEntregada, d.retiros.reduce((acc, r) => acc + r.cantidadRetirada, 0));

// Pallets de stock propio que se descontaron al confirmar la venta y que el
// cliente nunca se llevó: son los que vuelven al inventario.
const calcularStockARestaurar = async (db: Tx | typeof prisma, venta: VentaCancelacion) => {
  const salidas = await db.movimientoStock.findMany({
    where: { idReferencia: venta.id, motivo: 'venta', tipoMovimiento: 'salida' },
    include: { stock: { select: { id: true, productoId: true } } },
  });
  const yaRestaurado = await db.movimientoStock.findMany({
    where: { idReferencia: venta.id, motivo: 'cancelacion_venta', tipoMovimiento: 'entrada' },
    include: { stock: { select: { productoId: true } } },
  });

  return venta.detalles
    .map((d) => {
      const salidasProducto = salidas.filter((s) => s.stock.productoId === d.productoId);
      const descontado = salidasProducto.reduce((acc, s) => acc + s.cantidad, 0);
      const restaurado = yaRestaurado
        .filter((s) => s.stock.productoId === d.productoId)
        .reduce((acc, s) => acc + s.cantidad, 0);
      const noEntregado = Math.max(0, d.cantidadPedida - entregadoDe(d));
      const cantidad = Math.max(0, Math.min(noEntregado, descontado - restaurado));
      return { productoId: d.productoId, producto: d.producto.nombre, stockId: salidasProducto[0]?.stock.id, cantidad };
    })
    .filter((s) => s.cantidad > 0 && s.stockId !== undefined) as {
    productoId: number; producto: string; stockId: number; cantidad: number;
  }[];
};

const motivoNoCancelable = (venta: VentaCancelacion): string | null => {
  if (venta.estadoPedido === 'cancelado') return 'La venta ya está cancelada.';
  if (venta.estadoPedido === 'entregado') {
    return 'La venta ya fue entregada por completo. Para revertirla registrá una devolución.';
  }
  return null;
};

// ─── Vista previa: qué se va a cancelar ───────────────────────────────────────
export const getCancelacionPreviewService = async (ventaId: number) => {
  const venta = await cargarVenta(prisma, ventaId);
  if (!venta) throw new Error('Venta no encontrada');

  const facturasActivas = venta.facturas.filter((f) => f.estadoCobro !== 'anulada');
  const totalCobrado = facturasActivas.reduce(
    (acc, f) => acc + f.pagos.reduce((a, p) => a + Number(p.monto), 0), 0
  );
  const palletsPedidos = venta.detalles.reduce((acc, d) => acc + d.cantidadPedida, 0);
  const palletsEntregados = venta.detalles.reduce((acc, d) => acc + entregadoDe(d), 0);
  const stock = await calcularStockARestaurar(prisma, venta);

  const impactos: { modulo: string; detalle: string }[] = [];
  for (const f of facturasActivas) {
    impactos.push({
      modulo: 'Facturación',
      detalle: `${f.esSinFactura ? 'Comprobante' : 'Factura'} #${f.id}${f.nroFactura ? ` (${f.nroFactura})` : ''} se anula`,
    });
  }
  if (venta.logistica && venta.logistica.estadoEntrega !== 'entregado' && venta.logistica.estadoEntrega !== 'cancelado') {
    impactos.push({ modulo: 'Logística', detalle: 'La entrega programada se cancela' });
  }
  if (venta.retiroGalpon && !['completado', 'cancelado'].includes(venta.retiroGalpon.estadoRetiro)) {
    impactos.push({ modulo: 'Retiros', detalle: `El retiro ${venta.retiroGalpon.codigoRetiro} se cancela (el código deja de ser válido)` });
  }
  if (venta.remito && venta.remito.estado !== 'cancelado') {
    impactos.push({ modulo: 'Remitos', detalle: `El remito${venta.remito.numeroRemito ? ` ${venta.remito.numeroRemito}` : ''} se cancela` });
  }
  if (venta.solicitudesLogistica.length) {
    impactos.push({ modulo: 'Logística', detalle: `${venta.solicitudesLogistica.length} solicitud(es) de logística pendiente(s) se cierran` });
  }
  if (venta.devoluciones.length) {
    impactos.push({ modulo: 'Devoluciones', detalle: `${venta.devoluciones.length} devolución(es) en curso se cancelan` });
  }
  for (const s of stock) {
    impactos.push({ modulo: 'Inventario', detalle: `Vuelven ${s.cantidad} u. de ${s.producto} al stock propio` });
  }
  impactos.push({ modulo: 'Dashboard y reportes', detalle: 'La venta deja de sumar en ventas, pallets y facturación' });

  const advertencias: string[] = [];
  if (totalCobrado > 0) {
    advertencias.push(
      `Ya hay $${totalCobrado.toLocaleString('es-AR')} cobrados de esta venta. Los cobros quedan registrados: gestioná la devolución del dinero o dejalo a cuenta del cliente.`
    );
  }
  if (palletsEntregados > 0) {
    advertencias.push(
      `El cliente ya retiró/recibió ${palletsEntregados} de ${palletsPedidos} pallets. Esos pallets quedan registrados como entregados y no vuelven al stock.`
    );
  }
  if (venta.remito && ['firmado_por_cliente', 'completado'].includes(venta.remito.estado)) {
    advertencias.push('El remito ya fue firmado por el cliente.');
  }

  const comprasPendientes = venta.compras
    .filter((c) => c.estado === 'pendiente_pago')
    .map((c) => ({ id: c.id, proveedor: c.proveedor.nombreEmpresa, total: Number(c.total ?? 0) }));
  const comprasPagadas = venta.compras.filter((c) => c.estado === 'pagada').length;
  if (comprasPagadas) {
    advertencias.push(`Hay ${comprasPagadas} compra(s) al proveedor ya pagada(s) para esta venta: no se modifican.`);
  }

  return {
    ventaId: venta.id,
    cliente: venta.cliente.razonSocial,
    estadoPedido: venta.estadoPedido,
    puedeCancelar: !motivoNoCancelable(venta),
    motivoNoCancelable: motivoNoCancelable(venta),
    impactos,
    advertencias,
    comprasPendientes,
  };
};

// ─── Cancelar ─────────────────────────────────────────────────────────────────
export const cancelarVentaService = async (
  ventaId: number,
  motivo: string,
  usuarioId: number,
  opciones: { cancelarCompras?: boolean } = {}
) => {
  const motivoLimpio = motivo.trim();
  if (motivoLimpio.length < 3) throw new Error('Ingresá el motivo de la cancelación');

  return prisma.$transaction(async (tx) => {
    const venta = await cargarVenta(tx, ventaId);
    if (!venta) throw new Error('Venta no encontrada');
    const bloqueo = motivoNoCancelable(venta);
    if (bloqueo) throw new Error(bloqueo);

    const ahora = new Date();
    const nota = `Anulada por cancelación de la venta #${ventaId}: ${motivoLimpio}`;

    // Stock: se calcula antes de tocar nada
    const stock = await calcularStockARestaurar(tx, venta);

    await tx.venta.update({
      where: { id: ventaId },
      data: {
        estadoPedido: 'cancelado',
        motivoCancelacion: motivoLimpio,
        fechaCancelacion: ahora,
        canceladaPorId: usuarioId,
      },
    });

    for (const f of venta.facturas.filter((f) => f.estadoCobro !== 'anulada')) {
      await tx.factura.update({
        where: { id: f.id },
        data: {
          estadoCobro: 'anulada',
          observaciones: f.observaciones ? `${f.observaciones}\n${nota}` : nota,
        },
      });
    }

    if (venta.logistica && venta.logistica.estadoEntrega !== 'entregado') {
      await tx.logistica.update({
        where: { id: venta.logistica.id },
        data: { estadoEntrega: 'cancelado' },
      });
    }

    if (venta.retiroGalpon && venta.retiroGalpon.estadoRetiro !== 'completado') {
      await tx.retiro.update({
        where: { id: venta.retiroGalpon.id },
        data: { estadoRetiro: 'cancelado', motivoCancelacion: motivoLimpio },
      });
    }

    if (venta.remito && venta.remito.estado !== 'cancelado') {
      await tx.remito.update({ where: { id: venta.remito.id }, data: { estado: 'cancelado' } });
    }

    if (venta.solicitudesLogistica.length) {
      await tx.solicitudLogistica.updateMany({
        where: { id: { in: venta.solicitudesLogistica.map((s) => s.id) } },
        data: { estado: 'cancelada', fechaRespuesta: ahora, notasRespuesta: `Venta cancelada: ${motivoLimpio}` },
      });
    }

    if (venta.devoluciones.length) {
      await tx.devolucion.updateMany({
        where: { id: { in: venta.devoluciones.map((d) => d.id) } },
        data: { estado: 'cancelada' },
      });
    }

    for (const s of stock) {
      await tx.stock.update({ where: { id: s.stockId }, data: { cantidadDisponible: { increment: s.cantidad } } });
      await tx.movimientoStock.create({
        data: {
          stockId: s.stockId,
          tipoMovimiento: 'entrada',
          cantidad: s.cantidad,
          motivo: 'cancelacion_venta',
          idReferencia: ventaId,
          registradoPorId: usuarioId,
        },
      });
    }

    // Compras al proveedor pendientes de pago (solo si se pidió): mismo efecto
    // que cancelarlas desde Compras (se libera la deuda con el proveedor).
    const comprasCanceladas: number[] = [];
    if (opciones.cancelarCompras) {
      for (const compra of venta.compras.filter((c) => c.estado === 'pendiente_pago')) {
        for (const detalle of compra.detalles) {
          const stockEntry = await tx.stock.findFirst({
            where: { productoId: detalle.productoId, proveedorId: compra.proveedorId },
          });
          if (stockEntry) {
            await tx.stock.update({
              where: { id: stockEntry.id },
              data: {
                cantidadDeudora: Math.max(0, stockEntry.cantidadDeudora - detalle.cantidad),
                ...(compra.tipoCompra === 'stock_propio'
                  ? { cantidadDisponible: Math.max(0, stockEntry.cantidadDisponible - detalle.cantidad) }
                  : {}),
              },
            });
          }
        }
        await tx.compra.update({
          where: { id: compra.id },
          data: {
            estado: 'cancelada',
            saldoDeudor: false,
            observaciones: compra.observaciones
              ? `${compra.observaciones}\nCancelada por cancelación de la venta #${ventaId}`
              : `Cancelada por cancelación de la venta #${ventaId}`,
          },
        });
        comprasCanceladas.push(compra.id);
      }
    }

    return {
      ventaId,
      estadoPedido: 'cancelado' as const,
      motivoCancelacion: motivoLimpio,
      stockRestaurado: stock.map(({ producto, cantidad }) => ({ producto, cantidad })),
      comprasCanceladas,
    };
  });
};

// ─── Guard para el resto de los módulos ───────────────────────────────────────
export const asegurarVentaNoCancelada = async (db: Tx | typeof prisma, ventaId: number) => {
  const venta = await db.venta.findUnique({ where: { id: ventaId }, select: { estadoPedido: true } });
  if (venta?.estadoPedido === 'cancelado') {
    throw new Error(`La venta #${ventaId} está cancelada: no se puede modificar.`);
  }
};
