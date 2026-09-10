import prisma from '../utils/prisma';

const esMismoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const diffDias = (desde: Date, hasta: Date) =>
  Math.floor((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24));

const labelModalidad: Record<string, string> = {
  adelantado: 'adelantado',
  contra_entrega: 'contra entrega',
  por_partes: 'por partes',
};

export const getAlertasActivasService = async () => {
  const hoy = new Date();
  const alertas: any[] = [];

  // ────────────────────────────────────────────────────────────────
  // 1. Facturas vencidas (fecha de vencimiento de la factura ya pasó)
  // ────────────────────────────────────────────────────────────────
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
    const diasVencida = diffDias(new Date(f.fechaVencimiento!), hoy);
    alertas.push({
      tipo: 'factura_vencida',
      urgencia: diasVencida > 7 ? 'alta' : diasVencida > 3 ? 'media' : 'baja',
      titulo: `Factura vencida — ${f.cliente.razonSocial}`,
      detalle: `Vencida hace ${diasVencida} días. Saldo pendiente: $${(Number(f.totalConIva) - totalCobrado).toLocaleString('es-AR')}`,
      referencia: { tipo: 'factura', id: f.id },
      propietario: f.usuario.rol,
    });
  }

  // ────────────────────────────────────────────────────────────────
  // 2. Cotizaciones enviadas sin respuesta hace 2 días o más
  //    (se toma la fecha de envío o el último contacto registrado)
  // ────────────────────────────────────────────────────────────────
  const cotizacionesActivas = await prisma.cotizacion.findMany({
    where: {
      estado: { in: ['enviada', 'en_seguimiento'] },
    },
    include: {
      cliente: { select: { razonSocial: true } },
      usuario: { select: { nombre: true, rol: true } },
      seguimientos: { orderBy: { fechaContacto: 'desc' }, take: 1 },
    },
  });

  for (const c of cotizacionesActivas) {
    const ultimoContacto = c.seguimientos[0]?.fechaContacto ?? c.fechaCotizacion;
    const diasSinRespuesta = diffDias(new Date(ultimoContacto), hoy);
    if (diasSinRespuesta >= 2) {
      alertas.push({
        tipo: 'cotizacion_sin_seguimiento',
        urgencia: diasSinRespuesta >= 7 ? 'alta' : diasSinRespuesta >= 4 ? 'media' : 'baja',
        titulo: `Cotización sin respuesta — ${c.cliente?.razonSocial ?? c.nombreProspecto ?? 'Cliente'}`,
        detalle: `Enviada el ${new Date(c.fechaCotizacion).toLocaleDateString('es-AR')}, sin respuesta hace ${diasSinRespuesta} días`,
        referencia: { tipo: 'cotizacion', id: c.id },
        propietario: c.usuario.rol,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 3. Facturación: modalidad de pago vs. fecha de entrega/retiro
  //    Se avisa si llegó (o pasó) la fecha de entrega/retiro y el
  //    pago todavía no fue registrado por completo, según la
  //    modalidad pactada (adelantado / contra_entrega / por_partes).
  // ────────────────────────────────────────────────────────────────
  const ventasConModalidad = await prisma.venta.findMany({
    where: {
      esHistorica: false,
      estadoPedido: { not: 'cancelado' },
      modalidadPago: { not: null },
    },
    include: {
      cliente: { select: { razonSocial: true } },
      usuario: { select: { nombre: true, rol: true } },
      facturas: { include: { pagos: true } },
    },
  });

  for (const v of ventasConModalidad) {
    const fechaClave = v.fechaEntregaReal ?? v.fechaRetiro ?? v.fechaEstimEntrega;
    if (!fechaClave || new Date(fechaClave) > hoy) continue;

    const totalPagado = v.facturas.reduce(
      (acc, f) => acc + f.pagos.reduce((a, p) => a + Number(p.monto), 0),
      0
    );
    const montoTotal = Number(v.totalConIva ?? 0);
    const saldoPendiente = montoTotal - totalPagado;

    if (saldoPendiente > 0) {
      const modalidad = v.modalidadPago as string;
      const urgencia = modalidad === 'por_partes' ? 'media' : 'alta';
      alertas.push({
        tipo: 'pago_modalidad_pendiente',
        urgencia,
        titulo: `Pago pendiente (${labelModalidad[modalidad] ?? modalidad}) — ${v.cliente.razonSocial}`,
        detalle:
          modalidad === 'adelantado'
            ? `La modalidad es adelantado y ya llegó la fecha de entrega/retiro, pero no se registró el pago. Saldo: $${saldoPendiente.toLocaleString('es-AR')}`
            : modalidad === 'contra_entrega'
            ? `La modalidad es contra entrega y ya llegó la fecha de entrega/retiro, pero no se registró el pago. Saldo: $${saldoPendiente.toLocaleString('es-AR')}`
            : `La modalidad es por partes y aún queda saldo pendiente tras la fecha de entrega/retiro: $${saldoPendiente.toLocaleString('es-AR')}`,
        referencia: { tipo: 'venta', id: v.id },
        propietario: v.usuario.rol,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 4. Pedidos activos con fecha de entrega vencida
  // ────────────────────────────────────────────────────────────────
  const pedidosAtrasados = await prisma.venta.findMany({
    where: {
      esHistorica: false,
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
    const diasAtraso = diffDias(new Date(p.fechaEstimEntrega!), hoy);
    alertas.push({
      tipo: 'pedido_atrasado',
      urgencia: 'alta',
      titulo: `Pedido atrasado — ${p.cliente.razonSocial}`,
      detalle: `${diasAtraso} días de atraso en la entrega`,
      referencia: { tipo: 'venta', id: p.id },
      propietario: p.usuario.rol,
    });
  }

  // ────────────────────────────────────────────────────────────────
  // 5. Logística: entregas programadas para el día de hoy (informativa)
  // ────────────────────────────────────────────────────────────────
  const logisticasHoy = await prisma.logistica.findMany({
    where: {
      estadoEntrega: { not: 'entregado' },
    },
    include: {
      venta: {
        include: {
          cliente: { select: { razonSocial: true } },
          usuario: { select: { nombre: true, rol: true } },
        },
      },
    },
  });

  for (const l of logisticasHoy) {
    const fechaEntrega = l.venta?.fechaEstimEntrega;
    if (fechaEntrega && esMismoDia(new Date(fechaEntrega), hoy)) {
      alertas.push({
        tipo: 'logistica_hoy',
        urgencia: 'baja',
        titulo: `Entrega programada para hoy — ${l.venta?.cliente.razonSocial ?? 'Cliente'}`,
        detalle: `Venta #${l.ventaId}: entrega logística programada para el día de hoy`,
        referencia: { tipo: 'logistica', id: l.id },
        propietario: l.venta?.usuario.rol ?? 'ambos',
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 6. Retiros: retiros programados para el día de hoy (informativa)
  // ────────────────────────────────────────────────────────────────
  const retirosHoy = await prisma.retiro.findMany({
    where: {
      estadoRetiro: { in: ['pendiente', 'confirmado'] },
    },
    include: {
      venta: {
        include: {
          cliente: { select: { razonSocial: true } },
          usuario: { select: { nombre: true, rol: true } },
        },
      },
    },
  });

  for (const r of retirosHoy) {
    if (r.horaEstimadaRetiro && esMismoDia(new Date(r.horaEstimadaRetiro), hoy)) {
      alertas.push({
        tipo: 'retiro_hoy',
        urgencia: 'baja',
        titulo: `Retiro programado para hoy — ${r.venta?.cliente.razonSocial ?? 'Cliente'}`,
        detalle: `Venta #${r.ventaId}: retiro en depósito programado para el día de hoy (código ${r.codigoRetiro})`,
        referencia: { tipo: 'retiro', id: r.id },
        propietario: r.venta?.usuario.rol ?? 'ambos',
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 7. Compras: ventas directas sin la compra registrada al galpón
  //    (origenStock = 'compra_directa' pero no hay una Compra
  //    tipo 'reventa_inmediata' vinculada a esa venta) — informativa
  // ────────────────────────────────────────────────────────────────
  const ventasDirectas = await prisma.venta.findMany({
    where: {
      esHistorica: false,
      estadoPedido: { not: 'cancelado' },
      origenStock: 'compra_directa',
    },
    include: {
      cliente: { select: { razonSocial: true } },
      usuario: { select: { nombre: true, rol: true } },
      compras: true,
    },
  });

  for (const v of ventasDirectas) {
    const tieneCompraRegistrada = v.compras.some(c => c.tipoCompra === 'reventa_inmediata');
    if (!tieneCompraRegistrada) {
      alertas.push({
        tipo: 'compra_directa_sin_registrar',
        urgencia: 'baja',
        titulo: `Venta directa sin compra registrada — ${v.cliente.razonSocial}`,
        detalle: `Venta #${v.id}: se vendió sin stock propio, pero todavía no se registró la compra al proveedor`,
        referencia: { tipo: 'venta', id: v.id },
        propietario: v.usuario.rol,
      });
    }
  }

  // Ordenar por urgencia
  const orden = { alta: 0, media: 1, baja: 2 };
  alertas.sort(
    (a, b) =>
      orden[a.urgencia as keyof typeof orden] - orden[b.urgencia as keyof typeof orden]
  );

  // Excluir las que ya fueron marcadas como resueltas por algún usuario
  const resueltas = await prisma.alertaResuelta.findMany({
    select: { tipo: true, referenciaTipo: true, referenciaId: true },
  });
  const clavesResueltas = new Set(
    resueltas.map((r) => `${r.tipo}|${r.referenciaTipo}|${r.referenciaId}`)
  );

  const alertasConClave = alertas.map((a) => ({
    ...a,
    clave: `${a.tipo}|${a.referencia.tipo}|${a.referencia.id}`,
  }));

  const alertasActivas = alertasConClave.filter(
    (a) => !clavesResueltas.has(a.clave)
  );

  return {
    total: alertasActivas.length,
    alta: alertasActivas.filter((a) => a.urgencia === 'alta').length,
    media: alertasActivas.filter((a) => a.urgencia === 'media').length,
    baja: alertasActivas.filter((a) => a.urgencia === 'baja').length,
    alertas: alertasActivas,
  };
};

// Lista de alertas ya marcadas como resueltas, con fecha/hora y quién la resolvió
export const getAlertasResueltasService = async () => {
  const resueltas = await prisma.alertaResuelta.findMany({
    include: {
      resueltaPor: { select: { nombre: true, apellido: true, rol: true } },
    },
    orderBy: { resueltaEn: 'desc' },
  });

  return resueltas.map((r) => ({
    id: r.id,
    tipo: r.tipo,
    titulo: r.titulo,
    detalle: r.detalle,
    urgencia: r.urgencia,
    propietario: r.propietario,
    referencia: { tipo: r.referenciaTipo, id: r.referenciaId },
    resueltaEn: r.resueltaEn,
    resueltaPor: r.resueltaPor,
  }));
};

// Marca una alerta activa como resuelta (guarda snapshot + fecha/hora)
export const marcarAlertaResueltaService = async (
  datos: {
    tipo: string;
    titulo: string;
    detalle: string;
    urgencia: string;
    propietario: string;
    referenciaTipo: string;
    referenciaId: number;
  },
  usuarioId: number
) => {
  return prisma.alertaResuelta.upsert({
    where: {
      tipo_referenciaTipo_referenciaId: {
        tipo: datos.tipo,
        referenciaTipo: datos.referenciaTipo,
        referenciaId: datos.referenciaId,
      },
    },
    update: {},
    create: {
      tipo: datos.tipo,
      titulo: datos.titulo,
      detalle: datos.detalle,
      urgencia: datos.urgencia,
      propietario: datos.propietario,
      referenciaTipo: datos.referenciaTipo,
      referenciaId: datos.referenciaId,
      resueltaPorId: usuarioId,
    },
  });
};

// Reabre (elimina el marcado de resuelta) una alerta previamente resuelta
export const reabrirAlertaService = async (id: number) => {
  return prisma.alertaResuelta.delete({ where: { id } });
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
