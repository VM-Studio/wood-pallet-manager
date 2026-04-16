import prisma from '../utils/prisma';

export const getAlertasActivasService = async () => {
  const hoy = new Date();
  const alertas: any[] = [];

  // 1. Facturas vencidas
  const facturasVencidas = await prisma.factura.findMany({
    where: {
      estadoCobro: { in: ['pendiente', 'cobrada_parcial'] },
      fechaVencimiento: { lt: hoy },
    },
    include: {
      cliente: { select: { razonSocial: true } },
      usuario: { select: { nombre: true, rol: true } },
      pagos: true,
    },
  });

  for (const f of facturasVencidas) {
    const totalCobrado = f.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
    const diasVencida = Math.floor(
      (hoy.getTime() - new Date(f.fechaVencimiento!).getTime()) / (1000 * 60 * 60 * 24)
    );
    alertas.push({
      tipo: 'factura_vencida',
      urgencia: diasVencida > 7 ? 'alta' : diasVencida > 3 ? 'media' : 'baja',
      titulo: `Factura vencida — ${f.cliente.razonSocial}`,
      detalle: `Vencida hace ${diasVencida} días. Saldo pendiente: $${(Number(f.totalConIva) - totalCobrado).toLocaleString('es-AR')}`,
      referencia: { tipo: 'factura', id: f.id },
      propietario: f.usuario.rol,
    });
  }

  // 2. Stock bajo mínimo
  const stockBajo = await prisma.stock.findMany({
    where: { cantidadMinima: { not: null } },
    include: {
      producto: { select: { nombre: true, tipo: true } },
      proveedor: { select: { nombreEmpresa: true } },
    },
  });

  for (const s of stockBajo) {
    if (s.cantidadDisponible <= (s.cantidadMinima || 0)) {
      alertas.push({
        tipo: 'stock_bajo',
        urgencia: s.cantidadDisponible === 0 ? 'alta' : 'media',
        titulo: `Stock bajo — ${s.producto.nombre}`,
        detalle: `${s.proveedor.nombreEmpresa}: ${s.cantidadDisponible} unidades disponibles (mínimo: ${s.cantidadMinima})`,
        referencia: { tipo: 'stock', id: s.id },
        propietario: 'ambos',
      });
    }
  }

  // 3. Cotizaciones sin seguimiento hace más de 3 días
  const hace3Dias = new Date();
  hace3Dias.setDate(hace3Dias.getDate() - 3);

  const cotizacionesSinSeguimiento = await prisma.cotizacion.findMany({
    where: {
      estado: { in: ['enviada', 'en_seguimiento'] },
      fechaCotizacion: { lte: hace3Dias },
    },
    include: {
      cliente: { select: { razonSocial: true } },
      usuario: { select: { nombre: true, rol: true } },
    },
  });

  for (const c of cotizacionesSinSeguimiento) {
    const diasSinRespuesta = Math.floor(
      (hoy.getTime() - new Date(c.fechaCotizacion).getTime()) / (1000 * 60 * 60 * 24)
    );
    alertas.push({
      tipo: 'cotizacion_sin_seguimiento',
      urgencia: diasSinRespuesta > 7 ? 'alta' : 'media',
      titulo: `Cotización sin respuesta — ${c.cliente.razonSocial}`,
      detalle: `Sin respuesta hace ${diasSinRespuesta} días`,
      referencia: { tipo: 'cotizacion', id: c.id },
      propietario: c.usuario.rol,
    });
  }

  // 4. Pedidos activos con fecha de entrega vencida
  const pedidosAtrasados = await prisma.venta.findMany({
    where: {
      estadoPedido: {
        in: ['confirmado', 'en_preparacion', 'listo_para_envio', 'en_transito'],
      },
      fechaEstimEntrega: { lt: hoy },
    },
    include: {
      cliente: { select: { razonSocial: true } },
      usuario: { select: { nombre: true, rol: true } },
    },
  });

  for (const p of pedidosAtrasados) {
    const diasAtraso = Math.floor(
      (hoy.getTime() - new Date(p.fechaEstimEntrega!).getTime()) / (1000 * 60 * 60 * 24)
    );
    alertas.push({
      tipo: 'pedido_atrasado',
      urgencia: 'alta',
      titulo: `Pedido atrasado — ${p.cliente.razonSocial}`,
      detalle: `${diasAtraso} días de atraso en la entrega`,
      referencia: { tipo: 'venta', id: p.id },
      propietario: p.usuario.rol,
    });
  }

  // Ordenar por urgencia
  const orden = { alta: 0, media: 1, baja: 2 };
  alertas.sort(
    (a, b) =>
      orden[a.urgencia as keyof typeof orden] - orden[b.urgencia as keyof typeof orden]
  );

  return {
    total: alertas.length,
    alta: alertas.filter((a) => a.urgencia === 'alta').length,
    media: alertas.filter((a) => a.urgencia === 'media').length,
    baja: alertas.filter((a) => a.urgencia === 'baja').length,
    alertas,
  };
};

export const marcarFacturasVencidasService = async () => {
  const hace3Dias = new Date();
  hace3Dias.setDate(hace3Dias.getDate() - 3);

  const actualizadas = await prisma.factura.updateMany({
    where: {
      estadoCobro: { in: ['pendiente', 'cobrada_parcial'] },
      fechaVencimiento: { lt: hace3Dias },
    },
    data: { estadoCobro: 'vencida' },
  });

  return actualizadas.count;
};

export const marcarCotizacionesVencidasService = async () => {
  const hoy = new Date();

  const actualizadas = await prisma.cotizacion.updateMany({
    where: {
      estado: { in: ['enviada', 'en_seguimiento'] },
      fechaVencimiento: { lt: hoy },
    },
    data: { estado: 'vencida' },
  });

  return actualizadas.count;
};
