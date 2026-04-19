import prisma from '../utils/prisma';

export const getVentasUltimos12MesesService = async (usuarioId?: number) => {
  const meses = [];
  const ahora = new Date();

  for (let i = 11; i >= 0; i--) {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 0);

    const where: any = { fechaVenta: { gte: inicio, lte: fin } };
    if (usuarioId !== undefined) where.usuarioId = usuarioId;

    const ventas = await prisma.venta.findMany({
      where,
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

export const getDashboardService = async () => {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

  const [
    ventasMesActual,
    ventasMesAnterior,
    cobrosPendientes,
    facturasVencidas,
    cotizacionesPendientes,
    pedidosActivos,
    entregasHoy,
    stockRaw,
  ] = await Promise.all([
    prisma.venta.findMany({
      where: { fechaVenta: { gte: inicioMes } },
      include: {
        detalles: true,
        usuario: { select: { rol: true, nombre: true } },
      },
    }),
    prisma.venta.findMany({
      where: { fechaVenta: { gte: inicioMesAnterior, lte: finMesAnterior } },
      include: { detalles: true },
      // usuarioId ya está en el modelo, se incluye por defecto
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
  ]);

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

  const ventasCarlos = ventasMesActual.filter(
    (v) => v.usuario.rol === 'propietario_carlos'
  );
  const ventasJuanCruz = ventasMesActual.filter(
    (v) => v.usuario.rol === 'propietario_juancruz'
  );

  const ventasUltimos12Meses = await getVentasUltimos12MesesService();
  const grafico12MesesCarlos = await getVentasUltimos12MesesService(1);
  const grafico12MesesJuanCruz = await getVentasUltimos12MesesService(2);

  // Mes anterior por propietario
  const ventasMesAnteriorCarlos = ventasMesAnterior.filter(v => (v as any).usuarioId === 1);
  const ventasMesAnteriorJuanCruz = ventasMesAnterior.filter(v => (v as any).usuarioId === 2);

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
      },
    },
    graficos: { ventasUltimos12Meses },
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
