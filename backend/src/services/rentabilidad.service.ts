import prisma from '../utils/prisma';

// ─── RENTABILIDAD POR VENTA ───────────────────────────────────────────────────
// Para cada venta del período calcula facturación, costo, ganancia y % de
// ganancia de los pallets, producto por producto.
//
// Criterios:
//  • Facturación = subtotal de los pallets, neto de IVA (el IVA no es ganancia).
//    Flete y SENASA se trasladan al costo al cliente: se informan aparte y no
//    suman a la ganancia.
//  • Devoluciones confirmadas/procesadas restan facturación y costo de los
//    pallets devueltos.
//  • Ventas canceladas no se incluyen.
//  • Costo unitario de cada producto, en orden de prioridad:
//      1. costo histórico guardado en la venta (ventas cargadas a mano)
//      2. compra al proveedor vinculada a la venta (compra directa)
//      3. última compra de stock propio de ese producto anterior a la venta
//      4. precio de costo del proveedor (lista de proveedores)
//    Si no hay ninguno, la venta se marca "sin costo" y no suma al total de
//    ganancia (para no inflarlo).

export type FuenteCosto = 'historico' | 'compra_venta' | 'ultima_compra' | 'lista_proveedor' | 'sin_costo';

const ESTADOS_DEVOLUCION_EFECTIVOS = ['confirmada', 'procesada'] as const;

export const getRentabilidadVentasService = async (desde: Date, hasta: Date, usuarioId?: number) => {
  const ventas = await prisma.venta.findMany({
    where: {
      fechaVenta: { gte: desde, lte: hasta },
      estadoPedido: { not: 'cancelado' },
      ...(usuarioId !== undefined ? { usuarioId } : {}),
    },
    include: {
      cliente: { select: { razonSocial: true } },
      usuario: { select: { nombre: true, apellido: true } },
      cotizacion: { select: { costoSenasa: true, incluyeFlete: true, fleteIncluido: true } },
      detalles: { include: { producto: { select: { id: true, nombre: true, tipo: true, condicion: true } } } },
      compras: {
        where: { estado: { not: 'cancelada' } },
        include: { detalles: true, proveedor: { select: { nombreEmpresa: true } } },
      },
      devoluciones: {
        where: { estado: { in: [...ESTADOS_DEVOLUCION_EFECTIVOS] } },
        include: { detalles: true },
      },
      facturas: { select: { estadoCobro: true, totalConIva: true, pagos: { select: { monto: true } } } },
    },
    orderBy: { fechaVenta: 'desc' },
  });

  const productoIds = [...new Set(ventas.flatMap((v) => v.detalles.map((d) => d.productoId)))];

  // Datos para resolver costos (una sola consulta por tipo, no por venta)
  const [comprasStockPropio, listaProveedores, salidasStock] = await Promise.all([
    prisma.detalleCompra.findMany({
      where: {
        productoId: { in: productoIds },
        compra: { tipoCompra: 'stock_propio', estado: { not: 'cancelada' } },
      },
      select: {
        productoId: true,
        precioCostoUnit: true,
        compra: { select: { fechaCompra: true, proveedorId: true, proveedor: { select: { nombreEmpresa: true } } } },
      },
      orderBy: { compra: { fechaCompra: 'desc' } },
    }),
    prisma.productoProveedor.findMany({
      where: { productoId: { in: productoIds } },
      include: { proveedor: { select: { nombreEmpresa: true } } },
      orderBy: { fechaActualizacion: 'desc' },
    }),
    prisma.movimientoStock.findMany({
      where: { motivo: 'venta', tipoMovimiento: 'salida', idReferencia: { in: ventas.map((v) => v.id) } },
      select: { idReferencia: true, stock: { select: { productoId: true, proveedorId: true } } },
    }),
  ]);

  const resolverCosto = (
    venta: (typeof ventas)[number],
    detalle: (typeof ventas)[number]['detalles'][number]
  ): { costoUnitario: number | null; fuente: FuenteCosto; referencia?: string } => {
    if (detalle.costoUnitarioHistorico != null) {
      return { costoUnitario: Number(detalle.costoUnitarioHistorico), fuente: 'historico', referencia: 'Cargado en la venta' };
    }

    // Compra directa: promedio ponderado de lo comprado para esta venta
    const comprados = venta.compras.flatMap((c) =>
      c.detalles.filter((d) => d.productoId === detalle.productoId).map((d) => ({ ...d, proveedor: c.proveedor.nombreEmpresa, compraId: c.id }))
    );
    const cantComprada = comprados.reduce((acc, d) => acc + d.cantidad, 0);
    if (cantComprada > 0) {
      const costo = comprados.reduce((acc, d) => acc + Number(d.precioCostoUnit) * d.cantidad, 0) / cantComprada;
      const refs = [...new Set(comprados.map((d) => `compra #${d.compraId} a ${d.proveedor}`))].join(', ');
      return { costoUnitario: costo, fuente: 'compra_venta', referencia: refs };
    }

    // Galpón del que salió el stock (si la venta descontó stock propio)
    const proveedorStock = salidasStock.find(
      (s) => s.idReferencia === venta.id && s.stock.productoId === detalle.productoId
    )?.stock.proveedorId;

    const comprasProducto = comprasStockPropio.filter(
      (c) => c.productoId === detalle.productoId && c.compra.fechaCompra <= venta.fechaVenta
    );
    const ultimaCompra =
      comprasProducto.find((c) => proveedorStock === undefined || c.compra.proveedorId === proveedorStock) ??
      comprasProducto[0];
    if (ultimaCompra) {
      return {
        costoUnitario: Number(ultimaCompra.precioCostoUnit),
        fuente: 'ultima_compra',
        referencia: `Última compra de stock a ${ultimaCompra.compra.proveedor.nombreEmpresa} (${ultimaCompra.compra.fechaCompra.toLocaleDateString('es-AR')})`,
      };
    }

    const listas = listaProveedores.filter((p) => p.productoId === detalle.productoId);
    const lista = listas.find((p) => proveedorStock === undefined || p.proveedorId === proveedorStock) ?? listas[0];
    if (lista) {
      return {
        costoUnitario: Number(lista.precioCosto),
        fuente: 'lista_proveedor',
        referencia: `Precio de costo de ${lista.proveedor.nombreEmpresa}`,
      };
    }

    return { costoUnitario: null, fuente: 'sin_costo' };
  };

  const filas = ventas.map((venta) => {
    const devueltoPorDetalle = new Map<number, { cantidad: number; monto: number }>();
    for (const dev of venta.devoluciones) {
      for (const d of dev.detalles) {
        if (d.detalleVentaId == null) continue;
        const prev = devueltoPorDetalle.get(d.detalleVentaId) ?? { cantidad: 0, monto: 0 };
        devueltoPorDetalle.set(d.detalleVentaId, {
          cantidad: prev.cantidad + d.cantidadDevuelta,
          monto: prev.monto + Number(d.subtotal),
        });
      }
    }

    const productos = venta.detalles.map((d) => {
      const devuelto = devueltoPorDetalle.get(d.id) ?? { cantidad: 0, monto: 0 };
      const cantidad = d.cantidadPedida - devuelto.cantidad;
      const facturacion = Number(d.subtotal) - devuelto.monto;
      const { costoUnitario, fuente, referencia } = resolverCosto(venta, d);
      const costo = costoUnitario != null ? costoUnitario * cantidad : null;
      const ganancia = costo != null ? facturacion - costo : null;
      return {
        detalleId: d.id,
        producto: d.producto.nombre,
        tipo: d.producto.tipo,
        condicion: d.producto.condicion,
        cantidad,
        cantidadDevuelta: devuelto.cantidad,
        precioUnitario: Number(d.precioUnitario),
        facturacion,
        costoUnitario,
        costo,
        ganancia,
        porcentajeGanancia: ganancia != null && facturacion > 0 ? (ganancia / facturacion) * 100 : null,
        fuenteCosto: fuente,
        referenciaCosto: referencia,
      };
    });

    const facturacion = productos.reduce((acc, p) => acc + p.facturacion, 0);
    const costoCompleto = productos.every((p) => p.costo != null);
    const costo = costoCompleto ? productos.reduce((acc, p) => acc + (p.costo ?? 0), 0) : null;
    const ganancia = costo != null ? facturacion - costo : null;
    const facturasVigentes = venta.facturas.filter((f) => f.estadoCobro !== 'anulada');
    const totalFacturas = facturasVigentes.reduce((acc, f) => acc + Number(f.totalConIva), 0);
    const cobrado = facturasVigentes.reduce((acc, f) => acc + f.pagos.reduce((a, p) => a + Number(p.monto), 0), 0);
    const costoFlete = venta.cotizacion?.incluyeFlete && venta.cotizacion.fleteIncluido ? Number(venta.costoFlete ?? 0) : 0;

    return {
      ventaId: venta.id,
      fechaVenta: venta.fechaVenta,
      cliente: venta.cliente.razonSocial,
      vendedor: `${venta.usuario.nombre} ${venta.usuario.apellido}`,
      estadoPedido: venta.estadoPedido,
      origenStock: venta.origenStock,
      esHistorica: venta.esHistorica,
      pallets: productos.reduce((acc, p) => acc + p.cantidad, 0),
      facturacion,
      costo,
      ganancia,
      porcentajeGanancia: ganancia != null && facturacion > 0 ? (ganancia / facturacion) * 100 : null,
      costoCompleto,
      // Conceptos que se trasladan al cliente y no suman ganancia
      flete: costoFlete,
      senasa: Number(venta.cotizacion?.costoSenasa ?? 0),
      totalConIva: Number(venta.totalConIva ?? 0),
      cobrado,
      porcentajeCobrado: totalFacturas > 0 ? Math.min(100, (cobrado / totalFacturas) * 100) : 0,
      productos,
    };
  });

  const conCosto = filas.filter((f) => f.costoCompleto);
  const facturacionConCosto = conCosto.reduce((acc, f) => acc + f.facturacion, 0);
  const gananciaTotal = conCosto.reduce((acc, f) => acc + (f.ganancia ?? 0), 0);

  // Resumen por tipo de pallet (solo productos con costo conocido para la ganancia)
  const porTipo = new Map<string, { tipo: string; pallets: number; facturacion: number; ganancia: number; facturacionConCosto: number }>();
  for (const f of filas) {
    for (const p of f.productos) {
      const t = porTipo.get(p.tipo) ?? { tipo: p.tipo, pallets: 0, facturacion: 0, ganancia: 0, facturacionConCosto: 0 };
      t.pallets += p.cantidad;
      t.facturacion += p.facturacion;
      if (p.ganancia != null) {
        t.ganancia += p.ganancia;
        t.facturacionConCosto += p.facturacion;
      }
      porTipo.set(p.tipo, t);
    }
  }

  return {
    desde,
    hasta,
    resumen: {
      cantidadVentas: filas.length,
      pallets: filas.reduce((acc, f) => acc + f.pallets, 0),
      facturacion: filas.reduce((acc, f) => acc + f.facturacion, 0),
      costo: conCosto.reduce((acc, f) => acc + (f.costo ?? 0), 0),
      ganancia: gananciaTotal,
      porcentajeGanancia: facturacionConCosto > 0 ? (gananciaTotal / facturacionConCosto) * 100 : null,
      ventasSinCosto: filas.length - conCosto.length,
    },
    porTipo: [...porTipo.values()].map((t) => ({
      tipo: t.tipo,
      pallets: t.pallets,
      facturacion: t.facturacion,
      ganancia: t.ganancia,
      porcentajeGanancia: t.facturacionConCosto > 0 ? (t.ganancia / t.facturacionConCosto) * 100 : null,
    })).sort((a, b) => b.facturacion - a.facturacion),
    ventas: filas,
  };
};
