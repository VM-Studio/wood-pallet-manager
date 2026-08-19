import prisma from '../utils/prisma';

// Parsea el formato `usuario_<id>` que usa el frontend para el selector
// dinámico "Otro" del dashboard (reemplaza el viejo hardcodeo carlos/juancruz
// por cualquier usuario aprobado que tenga el módulo habilitado).
export const parseOtroUsuarioId = (vista?: string): number | undefined => {
  if (!vista) return undefined;
  const match = /^usuario_(\d+)$/.exec(vista);
  return match ? Number(match[1]) : undefined;
};

export const getVentasUltimos12MesesService = async (usuarioId?: number) => {
  const meses: { mes: string; ventas: number; pallets: number; facturacion: number }[] = [];

  // Arrancar desde la venta más antigua del sistema (sin filtrar por usuario)
  // para que el gráfico siempre muestre el mismo rango temporal
  const primeraVenta = await prisma.venta.findFirst({
    orderBy: { fechaVenta: 'asc' },
    select: { fechaVenta: true },
  });

  // Si no hay ventas, usar el mes actual como inicio
  const hoyLocal = new Date();
  const mesInicio = primeraVenta
    ? new Date(primeraVenta.fechaVenta.getFullYear(), primeraVenta.fechaVenta.getMonth(), 1)
    : new Date(hoyLocal.getFullYear(), hoyLocal.getMonth(), 1);

  for (let i = 0; i < 12; i++) {
    const inicio = new Date(mesInicio.getFullYear(), mesInicio.getMonth() + i, 1);
    const fin    = new Date(mesInicio.getFullYear(), mesInicio.getMonth() + i + 1, 0, 23, 59, 59);

    const whereQuery: any = { fechaVenta: { gte: inicio, lte: fin } };
    if (usuarioId !== undefined) whereQuery.usuarioId = usuarioId;

    const ventas = await prisma.venta.findMany({
      where: whereQuery,
      include: { detalles: true },
    });

    const pallets = ventas.reduce(
      (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
      0
    );
    const facturacion = ventas.reduce(
      (acc, v) => acc + Number(v.totalConIva || 0),
      0
    );

    meses.push({
      mes: inicio.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
      ventas: ventas.length,
      pallets,
      facturacion,
    });
  }

  return meses;
};

export const getDashboardService = async (usuarioIdActual?: number, vista?: string) => {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

  // Resolver IDs por rol (no hardcodeados)
  const [usuarioCarlosDB, usuarioJuanCruzDB] = await Promise.all([
    prisma.usuario.findFirst({ where: { rol: 'propietario_carlos' }, select: { id: true } }),
    prisma.usuario.findFirst({ where: { rol: 'propietario_juancruz' }, select: { id: true } }),
  ]);
  const idCarlos = usuarioCarlosDB?.id;
  const idJuanCruz = usuarioJuanCruzDB?.id;

  const [
    ventasMesActual,
    ventasMesAnterior,
    cobrosPendientes,
    facturasVencidas,
    cotizacionesPendientes,
    pedidosActivos,
    entregasHoy,
    stockRaw,
    // --- Carlos ---
    cotizacionesPendientesCarlos,
    pedidosActivosCarlos,
    cobrosPendientesCarlos,
    // --- JuanCruz ---
    cotizacionesPendientesJuanCruz,
    pedidosActivosJuanCruz,
    cobrosPendientesJuanCruz,
  ] = await Promise.all([
    prisma.venta.findMany({
      where: { fechaVenta: { gte: inicioMes } },
      include: {
        detalles: true,
        usuario: { select: { id: true, rol: true, nombre: true } },
        cliente: { select: { id: true, razonSocial: true } },
      },
    }),
    prisma.venta.findMany({
      where: { fechaVenta: { gte: inicioMesAnterior, lte: finMesAnterior } },
      include: { detalles: true, usuario: { select: { id: true } } },
    }),
    prisma.factura.findMany({
      where: { estadoCobro: { in: ['pendiente', 'cobrada_parcial'] } },
      include: { pagos: true },
    }),
    prisma.factura.count({
      where: {
        estadoCobro: { in: ['pendiente', 'cobrada_parcial'] },
        fechaVencimiento: { lt: hoy },
      },
    }),
    prisma.cotizacion.count({
      where: { estado: { in: ['enviada', 'en_seguimiento'] } },
    }),
    prisma.venta.count({
      where: {
        estadoPedido: {
          in: ['confirmado', 'en_preparacion', 'listo_para_envio', 'en_transito'],
        },
      },
    }),
    prisma.logistica.count({
      where: {
        fechaRetiroGalpon: {
          gte: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()),
          lt: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1),
        },
      },
    }),
    prisma.stock.findMany({ where: { cantidadMinima: { not: null } } }),
    // Carlos - cotizaciones
    prisma.cotizacion.count({
      where: { estado: { in: ['enviada', 'en_seguimiento'] }, ...(idCarlos ? { usuarioId: idCarlos } : { usuarioId: -1 }) },
    }),
    // Carlos - pedidos activos
    prisma.venta.count({
      where: {
        ...(idCarlos ? { usuarioId: idCarlos } : { usuarioId: -1 }),
        estadoPedido: { in: ['confirmado', 'en_preparacion', 'listo_para_envio', 'en_transito'] },
      },
    }),
    // Carlos - cobros pendientes
    prisma.factura.findMany({
      where: { estadoCobro: { in: ['pendiente', 'cobrada_parcial'] }, venta: { ...(idCarlos ? { usuarioId: idCarlos } : { usuarioId: -1 }) } },
      include: { pagos: true },
    }),
    // JuanCruz - cotizaciones
    prisma.cotizacion.count({
      where: { estado: { in: ['enviada', 'en_seguimiento'] }, ...(idJuanCruz ? { usuarioId: idJuanCruz } : { usuarioId: -1 }) },
    }),
    // JuanCruz - pedidos activos
    prisma.venta.count({
      where: {
        ...(idJuanCruz ? { usuarioId: idJuanCruz } : { usuarioId: -1 }),
        estadoPedido: { in: ['confirmado', 'en_preparacion', 'listo_para_envio', 'en_transito'] },
      },
    }),
    // JuanCruz - cobros pendientes
    prisma.factura.findMany({
      where: { estadoCobro: { in: ['pendiente', 'cobrada_parcial'] }, venta: { ...(idJuanCruz ? { usuarioId: idJuanCruz } : { usuarioId: -1 }) } },
      include: { pagos: true },
    }),
  ]);

  // ─── Datos del usuario realmente logueado (funciona para cualquier usuario,
  // no solo Carlos/Juan Cruz — ej: cuentas admin con acceso limitado) ───────
  const usuarioIdPropio = usuarioIdActual;
  const [
    cotizacionesPendientesPropio,
    pedidosActivosPropio,
    cobrosPendientesPropio,
  ] = await Promise.all([
    prisma.cotizacion.count({
      where: { estado: { in: ['enviada', 'en_seguimiento'] }, ...(usuarioIdPropio ? { usuarioId: usuarioIdPropio } : { usuarioId: -1 }) },
    }),
    prisma.venta.count({
      where: {
        ...(usuarioIdPropio ? { usuarioId: usuarioIdPropio } : { usuarioId: -1 }),
        estadoPedido: { in: ['confirmado', 'en_preparacion', 'listo_para_envio', 'en_transito'] },
      },
    }),
    prisma.factura.findMany({
      where: { estadoCobro: { in: ['pendiente', 'cobrada_parcial'] }, venta: { ...(usuarioIdPropio ? { usuarioId: usuarioIdPropio } : { usuarioId: -1 }) } },
      include: { pagos: true },
    }),
  ]);

  // ─── Bloque genérico "otro" — usuario arbitrario elegido en el selector
  // dinámico del dashboard (ya no hardcodeado a Carlos/Juan Cruz: puede ser
  // cualquier usuario aprobado con el módulo habilitado) ───────────────────
  const otroUsuarioId = parseOtroUsuarioId(vista);
  const [
    cotizacionesPendientesOtro,
    pedidosActivosOtro,
    cobrosPendientesOtro,
  ] = otroUsuarioId ? await Promise.all([
    prisma.cotizacion.count({
      where: { estado: { in: ['enviada', 'en_seguimiento'] }, usuarioId: otroUsuarioId },
    }),
    prisma.venta.count({
      where: { usuarioId: otroUsuarioId, estadoPedido: { in: ['confirmado', 'en_preparacion', 'listo_para_envio', 'en_transito'] } },
    }),
    prisma.factura.findMany({
      where: { estadoCobro: { in: ['pendiente', 'cobrada_parcial'] }, venta: { usuarioId: otroUsuarioId } },
      include: { pagos: true },
    }),
  ]) : [0, 0, []];

  const alertasStock = stockRaw.filter(
    (s) => s.cantidadDisponible <= (s.cantidadMinima ?? 0)
  ).length;

  const palletsMesActual = ventasMesActual.reduce(
    (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
    0
  );
  const facturacionMesActual = ventasMesActual.reduce(
    (acc, v) => acc + Number(v.totalConIva || 0),
    0
  );
  const palletsMesAnterior = ventasMesAnterior.reduce(
    (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
    0
  );
  const facturacionMesAnterior = ventasMesAnterior.reduce(
    (acc, v) => acc + Number(v.totalConIva || 0),
    0
  );

  const totalCobrosPendientes = cobrosPendientes.reduce((acc, f) => {
    const cobrado = f.pagos.reduce((a, p) => a + Number(p.monto), 0);
    return acc + (Number(f.totalConIva) - cobrado);
  }, 0);

  const totalCobrosPendientesCarlos = cobrosPendientesCarlos.reduce((acc, f) => {
    const cobrado = f.pagos.reduce((a, p) => a + Number(p.monto), 0);
    return acc + (Number(f.totalConIva) - cobrado);
  }, 0);
  const facturasVencidasCarlos = cobrosPendientesCarlos.filter(
    f => f.fechaVencimiento && f.fechaVencimiento < hoy
  ).length;

  const totalCobrosPendientesJuanCruz = cobrosPendientesJuanCruz.reduce((acc, f) => {
    const cobrado = f.pagos.reduce((a, p) => a + Number(p.monto), 0);
    return acc + (Number(f.totalConIva) - cobrado);
  }, 0);
  const facturasVencidasJuanCruz = cobrosPendientesJuanCruz.filter(
    f => f.fechaVencimiento && f.fechaVencimiento < hoy
  ).length;

  const totalCobrosPendientesPropio = cobrosPendientesPropio.reduce((acc, f) => {
    const cobrado = f.pagos.reduce((a, p) => a + Number(p.monto), 0);
    return acc + (Number(f.totalConIva) - cobrado);
  }, 0);
  const facturasVencidasPropio = cobrosPendientesPropio.filter(
    f => f.fechaVencimiento && f.fechaVencimiento < hoy
  ).length;

  const totalCobrosPendientesOtro = cobrosPendientesOtro.reduce((acc, f) => {
    const cobrado = f.pagos.reduce((a, p) => a + Number(p.monto), 0);
    return acc + (Number(f.totalConIva) - cobrado);
  }, 0);
  const facturasVencidasOtro = cobrosPendientesOtro.filter(
    f => f.fechaVencimiento && f.fechaVencimiento < hoy
  ).length;

  const ventasCarlos = ventasMesActual.filter(
    (v) => v.usuario.rol === 'propietario_carlos'
  );
  const ventasJuanCruz = ventasMesActual.filter(
    (v) => v.usuario.rol === 'propietario_juancruz'
  );
  // "Propio" = ventas del usuario realmente logueado (sirve para cualquier
  // rol, no solo los dos propietarios históricos)
  const ventasPropio = usuarioIdPropio
    ? ventasMesActual.filter((v) => v.usuario.id === usuarioIdPropio)
    : [];
  const ventasMesAnteriorPropio = usuarioIdPropio
    ? ventasMesAnterior.filter((v) => v.usuario.id === usuarioIdPropio)
    : [];
  // "Otro" = usuario elegido dinámicamente en el selector del dashboard
  const ventasOtro = otroUsuarioId
    ? ventasMesActual.filter((v) => v.usuario.id === otroUsuarioId)
    : [];
  const ventasMesAnteriorOtro = otroUsuarioId
    ? ventasMesAnterior.filter((v) => v.usuario.id === otroUsuarioId)
    : [];

  const ventasUltimos12Meses = await getVentasUltimos12MesesService();
  const grafico12MesesCarlos = await getVentasUltimos12MesesService(idCarlos);
  const grafico12MesesJuanCruz = await getVentasUltimos12MesesService(idJuanCruz);
  const grafico12MesesPropio =
    usuarioIdPropio === idCarlos ? grafico12MesesCarlos
    : usuarioIdPropio === idJuanCruz ? grafico12MesesJuanCruz
    : await getVentasUltimos12MesesService(usuarioIdPropio);
  const grafico12MesesOtro = otroUsuarioId
    ? await getVentasUltimos12MesesService(otroUsuarioId)
    : [];

  // Cotizaciones activas con cliente — filtradas según la vista elegida,
  // para que cada usuario vea únicamente lo que le corresponde.
  const filtroUsuarioCotizaciones =
    vista === 'mis_datos' ? (usuarioIdPropio ? { usuarioId: usuarioIdPropio } : { usuarioId: -1 })
    : vista === 'carlos'    ? (idCarlos ? { usuarioId: idCarlos } : { usuarioId: -1 })
    : vista === 'juancruz'  ? (idJuanCruz ? { usuarioId: idJuanCruz } : { usuarioId: -1 })
    : otroUsuarioId         ? { usuarioId: otroUsuarioId }
    : {}; // 'todos' / sin vista → sin filtro (total empresa)

  const cotizacionesActivas = await prisma.cotizacion.findMany({
    where: { estado: { in: ['enviada', 'en_seguimiento'] }, ...filtroUsuarioCotizaciones },
    select: {
      id: true,
      estado: true,
      totalConIva: true,
      fechaCotizacion: true,
      cliente: { select: { razonSocial: true } },
      nombreProspecto: true,
    },
    orderBy: { fechaCotizacion: 'desc' },
  });

  // Pagos faltantes del mes anterior: facturas de ventas realizadas el mes
  // pasado que aún no fueron cobradas en su totalidad. Se buscan siempre por
  // fechaVenta (no fechaEmision) para que, aunque el dashboard "arranque en
  // cero" al cambiar de mes, esta tarjeta siga mostrando la deuda pendiente
  // real hasta que se registre el cobro completo.
  const filtroUsuarioVenta =
    vista === 'mis_datos' ? (usuarioIdPropio ? { usuarioId: usuarioIdPropio } : { usuarioId: -1 })
    : vista === 'carlos'    ? (idCarlos ? { usuarioId: idCarlos } : { usuarioId: -1 })
    : vista === 'juancruz'  ? (idJuanCruz ? { usuarioId: idJuanCruz } : { usuarioId: -1 })
    : otroUsuarioId         ? { usuarioId: otroUsuarioId }
    : {};

  const facturasPendientesMesAnterior = await prisma.factura.findMany({
    where: {
      estadoCobro: { in: ['pendiente', 'cobrada_parcial', 'vencida'] },
      venta: {
        fechaVenta: { gte: inicioMesAnterior, lte: finMesAnterior },
        ...filtroUsuarioVenta,
      },
    },
    include: {
      pagos: true,
      cliente: { select: { razonSocial: true } },
      venta: { select: { id: true, fechaVenta: true } },
    },
    orderBy: { fechaEmision: 'asc' },
  });

  const pagosFaltantesMesAnteriorDetalle = facturasPendientesMesAnterior.map(f => {
    const cobrado = f.pagos.reduce((a, p) => a + Number(p.monto), 0);
    const saldoPendiente = Number(f.totalConIva) - cobrado;
    return {
      facturaId: f.id,
      ventaId: f.ventaId,
      clienteNombre: f.cliente?.razonSocial ?? 'Cliente',
      nroFactura: f.nroFactura,
      fechaVenta: f.venta?.fechaVenta,
      totalConIva: Number(f.totalConIva),
      cobrado,
      saldoPendiente,
      estadoCobro: f.estadoCobro,
    };
  }).filter(f => f.saldoPendiente > 0);

  const totalPagosFaltantesMesAnterior = pagosFaltantesMesAnteriorDetalle.reduce(
    (acc, f) => acc + f.saldoPendiente, 0
  );

  // Resumen ventas del mes por cliente (para detalle del dashboard)
  const ventasMesResumenMap = new Map<number, { razonSocial: string; pallets: number; facturacion: number }>();
  for (const v of ventasMesActual) {
    const key = v.cliente.id;
    const existing = ventasMesResumenMap.get(key) ?? { razonSocial: v.cliente.razonSocial, pallets: 0, facturacion: 0 };
    existing.pallets += v.detalles.reduce((a, d) => a + d.cantidadPedida, 0);
    existing.facturacion += Number(v.totalConIva || 0);
    ventasMesResumenMap.set(key, existing);
  }
  const ventasMesDetalle = Array.from(ventasMesResumenMap.values())
    .sort((a, b) => b.pallets - a.pallets);

  // Compras pagadas del mes actual (para calcular ganancias)
  const comprasMesActual = await prisma.compra.findMany({
    where: {
      fechaCompra: { gte: inicioMes },
      estado: 'pagada',
    }
  });

  const costoComprasMes = comprasMesActual.reduce(
    (acc, c) => acc + Number(c.total || 0), 0
  );

  const gananciasMes = facturacionMesActual - costoComprasMes;

  // Mes anterior por propietario (usando id resuelto por rol)
  const ventasMesAnteriorCarlos = ventasMesAnterior.filter(v => v.usuario.id === idCarlos);
  const ventasMesAnteriorJuanCruz = ventasMesAnterior.filter(v => v.usuario.id === idJuanCruz);

  return {
    kpis: {
      palletsMesActual,
      palletsMesAnterior,
      variacionPallets:
        palletsMesAnterior > 0
          ? Math.round(((palletsMesActual - palletsMesAnterior) / palletsMesAnterior) * 100)
          : 0,
      facturacionMesActual,
      facturacionMesAnterior,
      variacionFacturacion:
        facturacionMesAnterior > 0
          ? Math.round(
              ((facturacionMesActual - facturacionMesAnterior) / facturacionMesAnterior) * 100
            )
          : 0,
      totalCobrosPendientes,
      facturasVencidas,
      cotizacionesPendientes,
      pedidosActivos,
      alertasStock,
      entregasHoy,
      gananciasMes,
      costoComprasMes,
    },
    porPropietario: {
      carlos: {
        ventas: ventasCarlos.length,
        pallets: ventasCarlos.reduce(
          (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
          0
        ),
        facturacion: ventasCarlos.reduce(
          (acc, v) => acc + Number(v.totalConIva || 0),
          0
        ),
        palletsMesAnterior: ventasMesAnteriorCarlos.reduce(
          (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
          0
        ),
        facturacionMesAnterior: ventasMesAnteriorCarlos.reduce(
          (acc, v) => acc + Number(v.totalConIva || 0),
          0
        ),
        cotizacionesPendientes: cotizacionesPendientesCarlos,
        pedidosActivos: pedidosActivosCarlos,
        cobrosPendientes: totalCobrosPendientesCarlos,
        facturasVencidas: facturasVencidasCarlos,
        grafico12Meses: grafico12MesesCarlos,
      },
      juanCruz: {
        ventas: ventasJuanCruz.length,
        pallets: ventasJuanCruz.reduce(
          (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
          0
        ),
        facturacion: ventasJuanCruz.reduce(
          (acc, v) => acc + Number(v.totalConIva || 0),
          0
        ),
        palletsMesAnterior: ventasMesAnteriorJuanCruz.reduce(
          (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
          0
        ),
        facturacionMesAnterior: ventasMesAnteriorJuanCruz.reduce(
          (acc, v) => acc + Number(v.totalConIva || 0),
          0
        ),
        grafico12Meses: grafico12MesesJuanCruz,
        cobrosPendientes: totalCobrosPendientesJuanCruz,
        facturasVencidas: facturasVencidasJuanCruz,
        cotizacionesPendientes: cotizacionesPendientesJuanCruz,
        pedidosActivos: pedidosActivosJuanCruz,
      },
      propio: {
        ventas: ventasPropio.length,
        pallets: ventasPropio.reduce(
          (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
          0
        ),
        facturacion: ventasPropio.reduce(
          (acc, v) => acc + Number(v.totalConIva || 0),
          0
        ),
        palletsMesAnterior: ventasMesAnteriorPropio.reduce(
          (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
          0
        ),
        facturacionMesAnterior: ventasMesAnteriorPropio.reduce(
          (acc, v) => acc + Number(v.totalConIva || 0),
          0
        ),
        grafico12Meses: grafico12MesesPropio,
        cobrosPendientes: totalCobrosPendientesPropio,
        facturasVencidas: facturasVencidasPropio,
        cotizacionesPendientes: cotizacionesPendientesPropio,
        pedidosActivos: pedidosActivosPropio,
      },
      // Usuario elegido dinámicamente en el selector "Otro" del dashboard —
      // ya no hardcodeado a Carlos/Juan Cruz, cualquier usuario aprobado con
      // el módulo habilitado puede ser consultado acá.
      otro: {
        ventas: ventasOtro.length,
        pallets: ventasOtro.reduce(
          (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
          0
        ),
        facturacion: ventasOtro.reduce(
          (acc, v) => acc + Number(v.totalConIva || 0),
          0
        ),
        palletsMesAnterior: ventasMesAnteriorOtro.reduce(
          (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
          0
        ),
        facturacionMesAnterior: ventasMesAnteriorOtro.reduce(
          (acc, v) => acc + Number(v.totalConIva || 0),
          0
        ),
        grafico12Meses: grafico12MesesOtro,
        cobrosPendientes: totalCobrosPendientesOtro,
        facturasVencidas: facturasVencidasOtro,
        cotizacionesPendientes: cotizacionesPendientesOtro,
        pedidosActivos: pedidosActivosOtro,
      },
    },
    graficos: { ventasUltimos12Meses },
    ventasMesDetalle,
    cotizacionesActivas: cotizacionesActivas.map(c => ({
      id: c.id,
      estado: c.estado,
      totalConIva: Number(c.totalConIva || 0),
      fechaCotizacion: c.fechaCotizacion,
      razonSocial: c.cliente?.razonSocial ?? c.nombreProspecto ?? 'Prospecto',
    })),
    pagosFaltantesMesAnterior: {
      cantidad: pagosFaltantesMesAnteriorDetalle.length,
      totalPendiente: totalPagosFaltantesMesAnterior,
      detalle: pagosFaltantesMesAnteriorDetalle,
    },
  };
};

export const getGananciasDetalleService = async (
  desde?: Date,
  hasta?: Date,
  usuarioId?: number
) => {
  const hoy = new Date();
  const inicioPeriodo = desde ?? new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finPeriodo = hasta ?? new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

  // Filtro por usuario en ventas y compras
  const ventaWhere: any = { fechaVenta: { gte: inicioPeriodo, lte: finPeriodo } };
  if (usuarioId !== undefined) ventaWhere.usuarioId = usuarioId;

  const compraWhere: any = {
    estado: 'pagada',
    fechaCompra: { gte: inicioPeriodo, lte: finPeriodo },
  };
  if (usuarioId !== undefined) compraWhere.usuarioId = usuarioId;

  // Para PagoCobro filtramos por la venta asociada a la factura
  const cobradoWhere: any = { fechaPago: { gte: inicioPeriodo, lte: finPeriodo } };
  if (usuarioId !== undefined) {
    cobradoWhere.factura = { venta: { usuarioId } };
  }

  const [ventasMes, cobradoAggregate, comprasStockPropioRaw, comprasReventaRaw] = await Promise.all([
    prisma.venta.findMany({
      where: ventaWhere,
      select: { totalConIva: true },
    }),
    prisma.pagoCobro.aggregate({
      _sum: { monto: true },
      where: cobradoWhere,
    }),
    prisma.compra.aggregate({
      _sum: { total: true },
      where: { ...compraWhere, tipoCompra: 'stock_propio' },
    }),
    prisma.compra.aggregate({
      _sum: { total: true },
      where: { ...compraWhere, tipoCompra: 'reventa_inmediata' },
    }),
  ]);

  const cantidadVentas = ventasMes.length;
  const facturadoMes = ventasMes.reduce((acc, v) => acc + Number(v.totalConIva || 0), 0);
  const cobrado = Number(cobradoAggregate._sum?.monto || 0);
  const comprasStockPropio = Number(comprasStockPropioRaw._sum?.total || 0);
  const comprasReventa = Number(comprasReventaRaw._sum?.total || 0);
  const totalCompras = comprasStockPropio + comprasReventa;
  const gananciaNeta = cobrado - totalCompras;

  return {
    cantidadVentas,
    facturadoMes,
    cobradoMes: cobrado,
    comprasStockPropio,
    comprasReventa,
    totalCompras,
    gananciaNeta,
  };
};

export const getReporteVentasService = async (
  desde: Date,
  hasta: Date,
  usuarioId?: number
) => {
  const where: any = { fechaVenta: { gte: desde, lte: hasta } };
  if (usuarioId) where.usuarioId = usuarioId;

  const ventas = await prisma.venta.findMany({
    where,
    include: {
      cliente: { select: { razonSocial: true } },
      usuario: { select: { nombre: true, apellido: true, rol: true } },
      detalles: { include: { producto: { select: { nombre: true, tipo: true } } } },
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
  const totalCobrado = ventas.reduce(
    (acc, v) =>
      acc +
      v.facturas.reduce(
        (a, f) => (f.estadoCobro === 'cobrada_total' ? a + Number(f.totalConIva) : a),
        0
      ),
    0
  );

  const porTipo: Record<string, number> = {};
  for (const venta of ventas) {
    for (const detalle of venta.detalles) {
      const tipo = detalle.producto.tipo;
      porTipo[tipo] = (porTipo[tipo] || 0) + detalle.cantidadPedida;
    }
  }

  const porPropietario: Record<string, any> = {};
  for (const venta of ventas) {
    const rol = venta.usuario.rol;
    if (!porPropietario[rol]) {
      porPropietario[rol] = {
        nombre: `${venta.usuario.nombre} ${venta.usuario.apellido}`,
        ventas: 0,
        pallets: 0,
        facturacion: 0,
      };
    }
    porPropietario[rol].ventas += 1;
    porPropietario[rol].pallets += venta.detalles.reduce(
      (a, d) => a + d.cantidadPedida,
      0
    );
    porPropietario[rol].facturacion += Number(venta.totalConIva || 0);
  }

  return {
    resumen: {
      totalVentas: ventas.length,
      totalPallets,
      totalFacturado,
      totalCobrado,
      pendienteCobro: totalFacturado - totalCobrado,
    },
    porTipoPallet: porTipo,
    porPropietario,
    ventas,
  };
};

export const getTopClientesService = async (limite: number = 10) => {
  const clientes = await prisma.cliente.findMany({
    where: { activo: true },
    include: {
      ventas: { include: { detalles: true } },
    },
  });

  return clientes
    .map((c) => {
      const totalPallets = c.ventas.reduce(
        (acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0),
        0
      );
      const totalFacturado = c.ventas.reduce(
        (acc, v) => acc + Number(v.totalConIva || 0),
        0
      );
      return {
        id: c.id,
        razonSocial: c.razonSocial,
        localidad: c.localidad,
        totalVentas: c.ventas.length,
        totalPallets,
        totalFacturado,
      };
    })
    .sort((a, b) => b.totalPallets - a.totalPallets)
    .slice(0, limite);
};

export const getReporteCobranzasService = async (desde: Date, hasta: Date) => {
  const facturas = await prisma.factura.findMany({
    where: { fechaEmision: { gte: desde, lte: hasta } },
    include: {
      cliente: { select: { razonSocial: true } },
      usuario: { select: { nombre: true, apellido: true, rol: true } },
      pagos: true,
    },
    orderBy: { fechaEmision: 'desc' },
  });

  const totalEmitido = facturas.reduce((acc, f) => acc + Number(f.totalConIva), 0);
  const totalCobrado = facturas.reduce(
    (acc, f) => acc + f.pagos.reduce((a, p) => a + Number(p.monto), 0),
    0
  );

  const porEstado = {
    pendiente: facturas.filter((f) => f.estadoCobro === 'pendiente').length,
    cobrada_parcial: facturas.filter((f) => f.estadoCobro === 'cobrada_parcial').length,
    cobrada_total: facturas.filter((f) => f.estadoCobro === 'cobrada_total').length,
    vencida: facturas.filter((f) => f.estadoCobro === 'vencida').length,
  };

  return {
    resumen: {
      totalFacturas: facturas.length,
      totalEmitido,
      totalCobrado,
      pendienteCobro: totalEmitido - totalCobrado,
      tasaCobranza:
        totalEmitido > 0 ? Math.round((totalCobrado / totalEmitido) * 100) : 0,
    },
    porEstado,
    facturas,
  };
};

// ─── Reporte PDF de ventas por rango de fechas ─────────────────────────────
// Todas las agregaciones (sumas, conteos, agrupaciones) se resuelven en SQL
// vía groupBy/aggregate — nunca se traen las filas completas a Node para
// sumar con reduce/map. El PDF se genera on-demand en el controller, no se
// persiste nada acá.
const TOP_CLIENTES_PDF = 500;

export const getReportePdfDataService = async (desde: Date, hasta: Date) => {
  // Resumen general del período: cantidad de operaciones y facturación total,
  // resuelto con aggregate (SUM/COUNT en SQL, no en JS).
  const agregadoGeneral = await prisma.venta.aggregate({
    where: { fechaVenta: { gte: desde, lte: hasta } },
    _sum: { totalConIva: true },
    _count: { _all: true },
  });

  const totalFacturado = Number(agregadoGeneral._sum.totalConIva ?? 0);
  const cantidadOperaciones = agregadoGeneral._count._all;
  const ticketPromedio = cantidadOperaciones > 0 ? totalFacturado / cantidadOperaciones : 0;

  // Detalle por cliente vía groupBy (SUM + COUNT agrupado por clienteId en
  // SQL), ordenado por monto descendente. Si supera TOP_CLIENTES_PDF filas,
  // se recorta a las primeras N + una fila "Otros" con el resto agregado.
  const grupoClientes = await prisma.venta.groupBy({
    by: ['clienteId'],
    where: { fechaVenta: { gte: desde, lte: hasta } },
    _sum: { totalConIva: true },
    _count: { _all: true },
    orderBy: { _sum: { totalConIva: 'desc' } },
  });

  const idsClientes = grupoClientes.map(g => g.clienteId);
  const clientesInfo = idsClientes.length
    ? await prisma.cliente.findMany({
        where: { id: { in: idsClientes } },
        select: { id: true, razonSocial: true },
      })
    : [];
  const nombreClientePorId = new Map(clientesInfo.map(c => [c.id, c.razonSocial]));

  const detalleCompleto = grupoClientes.map(g => ({
    clienteId: g.clienteId,
    razonSocial: nombreClientePorId.get(g.clienteId) ?? `Cliente #${g.clienteId}`,
    cantidadCompras: g._count._all,
    montoTotal: Number(g._sum.totalConIva ?? 0),
  }));

  let detallePorCliente = detalleCompleto;
  let filaOtros: { cantidadCompras: number; montoTotal: number } | null = null;
  if (detalleCompleto.length > TOP_CLIENTES_PDF) {
    const top = detalleCompleto.slice(0, TOP_CLIENTES_PDF);
    const resto = detalleCompleto.slice(TOP_CLIENTES_PDF);
    filaOtros = {
      cantidadCompras: resto.reduce((acc, c) => acc + c.cantidadCompras, 0),
      montoTotal: resto.reduce((acc, c) => acc + c.montoTotal, 0),
    };
    detallePorCliente = top;
  }

  // Serie mensual del período (para el gráfico de evolución) resuelta en SQL
  // con date_trunc + SUM/COUNT agrupado por mes — no se itera en JS.
  const serieMensualRaw = await prisma.$queryRaw<
    { mes: Date; facturacion: string | null; operaciones: bigint }[]
  >`
    SELECT date_trunc('month', "fechaVenta") AS mes,
           SUM("totalConIva")::text AS facturacion,
           COUNT(*)::bigint AS operaciones
    FROM ventas
    WHERE "fechaVenta" >= ${desde} AND "fechaVenta" <= ${hasta}
    GROUP BY date_trunc('month', "fechaVenta")
    ORDER BY mes ASC
  `;

  const serieMensual = serieMensualRaw.map(r => ({
    mes: r.mes,
    facturacion: Number(r.facturacion ?? 0),
    operaciones: Number(r.operaciones),
  }));

  return {
    desde,
    hasta,
    resumen: {
      totalFacturado,
      cantidadOperaciones,
      ticketPromedio,
    },
    detallePorCliente,
    filaOtros,
    totalClientesDistintos: detalleCompleto.length,
    serieMensual,
  };
};

// Lista de meses (YYYY-MM) que tienen al menos una venta registrada, del más
// reciente al más antiguo — alimenta el selector de "mes" del frontend para
// que solo se puedan elegir períodos con datos reales.
export const getMesesConDatosService = async () => {
  const filas = await prisma.$queryRaw<{ mes: Date }[]>`
    SELECT DISTINCT date_trunc('month', "fechaVenta") AS mes
    FROM ventas
    ORDER BY mes DESC
  `;
  return filas.map(f => {
    const d = new Date(f.mes);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
};
