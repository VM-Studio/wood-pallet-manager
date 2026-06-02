import prisma from '../utils/prisma';
import { parseFechaLocal } from '../utils/fecha';

export const getClientesService = async (usuarioId: number, rol: string) => {
  const clientes = await prisma.cliente.findMany({
    where: { activo: true },
    include: {
      usuarioAsignado: {
        select: { id: true, nombre: true, apellido: true, rol: true },
      },
    },
    orderBy: { razonSocial: 'asc' },
  });
  return clientes;
};

export const getClienteByIdService = async (id: number) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      usuarioAsignado: {
        select: { id: true, nombre: true, apellido: true, rol: true },
      },
      cotizaciones: {
        orderBy: { fechaCotizacion: 'desc' },
        take: 10,
        include: {
          detalles: { include: { producto: true } },
        },
      },
      ventas: {
        orderBy: { fechaVenta: 'desc' },
        take: 10,
        include: {
          detalles: { include: { producto: true } },
          facturas: true,
        },
      },
      facturas: {
        orderBy: { fechaEmision: 'desc' },
        take: 10,
      },
    },
  });

  if (!cliente) throw new Error('Cliente no encontrado');
  return cliente;
};

export const crearClienteService = async (
  datos: {
    razonSocial: string;
    cuit?: string;
    nombreContacto?: string;
    telefonoContacto?: string;
    emailContacto?: string;
    canalEntrada?: 'whatsapp' | 'formulario_web' | 'llamada' | 'recomendacion' | 'instagram' | 'email' | 'otro';
    direccionEntrega?: string;
    localidad?: string;
    esExportador?: boolean;
    observaciones?: string;
  },
  usuarioId: number
) => {
  return prisma.cliente.create({
    data: { ...datos, usuarioAsignadoId: usuarioId },
    include: {
      usuarioAsignado: {
        select: { id: true, nombre: true, apellido: true, rol: true },
      },
    },
  });
};

export const actualizarClienteService = async (
  id: number,
  datos: {
    razonSocial?: string;
    cuit?: string;
    nombreContacto?: string;
    telefonoContacto?: string;
    emailContacto?: string;
    canalEntrada?: 'whatsapp' | 'formulario_web' | 'llamada' | 'recomendacion' | 'instagram' | 'email' | 'otro';
    direccionEntrega?: string;
    localidad?: string;
    esExportador?: boolean;
    observaciones?: string;
  },
  usuarioId: number,
  rol: string
) => {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) throw new Error('Cliente no encontrado');

  if (cliente.usuarioAsignadoId !== usuarioId && rol !== 'admin') {
    throw new Error('Solo el propietario asignado puede editar este cliente');
  }

  return prisma.cliente.update({
    where: { id },
    data: datos,
    include: {
      usuarioAsignado: {
        select: { id: true, nombre: true, apellido: true, rol: true },
      },
    },
  });
};

export const desactivarClienteService = async (
  id: number,
  usuarioId: number,
  rol: string
) => {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) throw new Error('Cliente no encontrado');

  if (cliente.usuarioAsignadoId !== usuarioId && rol !== 'admin') {
    throw new Error('Solo el propietario asignado puede desactivar este cliente');
  }

  await prisma.cliente.update({ where: { id }, data: { activo: false } });
  return { mensaje: 'Cliente desactivado correctamente' };
};

export const getHistorialClienteService = async (id: number) => {
  const cliente = await prisma.cliente.findUniqueOrThrow({
    where: { id },
    include: {
      cotizaciones: {
        orderBy: { fechaCotizacion: 'desc' },
        include: {
          detalles: {
            include: {
              producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
              especificacion: true,
            },
          },
          usuario: { select: { nombre: true, apellido: true, rol: true } },
          seguimientos: { orderBy: { fechaContacto: 'desc' }, take: 5 },
        },
      },
      ventas: {
        orderBy: { fechaVenta: 'desc' },
        include: {
          detalles: {
            include: {
              producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
              retiros: { orderBy: { fechaRetiro: 'desc' } },
            },
          },
          facturas: {
            include: {
              pagos: { orderBy: { fechaPago: 'desc' } },
              notasCredito: true,
            },
          },
          logistica: true,
          retiroGalpon: true,
          usuario: { select: { nombre: true, apellido: true, rol: true } },
        },
      },
    },
  });

  const totalPallets = cliente.ventas.reduce(
    (acc: number, venta) => acc + venta.detalles.reduce((a: number, d) => a + d.cantidadPedida, 0),
    0
  );

  const totalFacturado = cliente.ventas.reduce(
    (acc: number, venta) => acc + Number(venta.totalConIva || 0),
    0
  );

  const totalCobrado = cliente.ventas.reduce((acc: number, venta) => {
    return acc + venta.facturas.reduce((fa: number, f) => {
      return fa + f.pagos.reduce((pa: number, p) => pa + Number(p.monto || 0), 0);
    }, 0);
  }, 0);

  const totalPendiente = totalFacturado - totalCobrado;

  const primerVenta = cliente.ventas.length
    ? cliente.ventas[cliente.ventas.length - 1].fechaVenta
    : null;

  const ultimaVenta = cliente.ventas.length
    ? cliente.ventas[0].fechaVenta
    : null;

  return {
    cliente: {
      id: cliente.id,
      razonSocial: cliente.razonSocial,
      cuit: cliente.cuit,
      emailContacto: cliente.emailContacto,
      telefonoContacto: cliente.telefonoContacto,
    },
    estadisticas: {
      totalVentas: cliente.ventas.length,
      totalCotizaciones: cliente.cotizaciones.length,
      totalPallets,
      totalFacturado,
      totalCobrado,
      totalPendiente,
      primerVenta,
      ultimaVenta,
    },
    cotizaciones: cliente.cotizaciones,
    ventas: cliente.ventas,
  };
};

export const cargarHistorialClienteService = async (
  clienteId: number,
  usuarioId: number,
  ventas: Array<{
    fechaVenta: string;
    tipoEntrega?: string;
    incluyeIva?: boolean;
    estadoCobro?: 'cobrada_total' | 'cobrada_parcial' | 'pendiente';
    montoCobrado?: number;
    medioPago?: string;
    fechaPago?: string;
    observaciones?: string;
    productos: Array<{
      productoId: number;
      cantidad: number;
      precioUnitario: number;
      costoUnitario?: number;
      proveedorId?: number;
      tipoCompra?: string;
    }>;
  }>
) => {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) throw new Error('Cliente no encontrado');

  return prisma.$transaction(async (tx) => {
    const ventasCreadas: number[] = [];

    for (const v of ventas) {
      const fecha = parseFechaLocal(v.fechaVenta);
      const incluyeIva = v.incluyeIva ?? true;
      const estadoCobro = v.estadoCobro ?? 'cobrada_total';

      // Calcular totales sumando todos los productos
      const totalConIva = v.productos.reduce(
        (acc, p) => acc + p.cantidad * p.precioUnitario, 0
      );
      const totalSinIva = incluyeIva ? totalConIva / 1.21 : totalConIva;

      // Crear la venta histórica con todos sus detalles
      const venta = await tx.venta.create({
        data: {
          clienteId,
          usuarioId,
          fechaVenta: fecha,
          estadoPedido: 'entregado',
          tipoEntrega: (v.tipoEntrega as any) ?? 'retira_cliente',
          totalSinIva,
          totalConIva,
          observaciones: v.observaciones,
          esHistorica: true,
          detalles: {
            create: v.productos.map(p => ({
              productoId: p.productoId,
              cantidadPedida: p.cantidad,
              cantidadEntregada: p.cantidad,
              precioUnitario: p.precioUnitario,
              subtotal: p.cantidad * p.precioUnitario,
              ...(p.costoUnitario !== undefined && { costoUnitarioHistorico: p.costoUnitario }),
              ...(p.proveedorId !== undefined && { proveedorHistoricoId: p.proveedorId }),
              ...(p.tipoCompra !== undefined && { tipoCompraHistorico: p.tipoCompra }),
            })),
          },
        },
      });

      // Crear factura histórica
      const factura = await tx.factura.create({
        data: {
          ventaId: venta.id,
          clienteId,
          usuarioId,
          esSinFactura: !incluyeIva,
          fechaEmision: fecha,
          totalNeto: totalSinIva,
          iva: totalConIva - totalSinIva,
          totalConIva,
          estadoCobro,
        },
      });

      // Si está cobrada, crear el pago
      if (estadoCobro === 'cobrada_total' || estadoCobro === 'cobrada_parcial') {
        const montoPago = estadoCobro === 'cobrada_total' ? totalConIva : (v.montoCobrado ?? 0);
        if (montoPago > 0) {
          await tx.pagoCobro.create({
            data: {
              facturaId: factura.id,
              clienteId,
              monto: montoPago,
              medioPago: (v.medioPago as any) ?? 'transferencia',
              registradoPorId: usuarioId,
              fechaPago: v.fechaPago ? parseFechaLocal(v.fechaPago) : fecha,
              observaciones: 'Pago registrado en carga histórica',
            },
          });
        }
      }

      // Si algún producto tiene costo, crear compra histórica
      for (const p of v.productos) {
        if (p.costoUnitario && p.costoUnitario > 0) {
          await tx.compra.create({
            data: {
              proveedorId: p.proveedorId ?? 1,
              usuarioId,
              ventaId: venta.id,
              fechaCompra: fecha,
              estado: 'pagada',
              tipoCompra: (p.tipoCompra as any) ?? 'reventa_inmediata',
              saldoDeudor: false,
              total: p.costoUnitario * p.cantidad,
              observaciones: 'Compra registrada en carga histórica',
              detalles: {
                create: {
                  productoId: p.productoId,
                  cantidad: p.cantidad,
                  precioCostoUnit: p.costoUnitario,
                  subtotal: p.costoUnitario * p.cantidad,
                },
              },
            },
          });
        }
      }

      ventasCreadas.push(venta.id);
    }

    return { ventasCreadas, total: ventasCreadas.length };
  });
};

export const buscarClientesService = async (query: string) => {
  return prisma.cliente.findMany({
    where: {
      activo: true,
      OR: [
        { razonSocial: { contains: query, mode: 'insensitive' } },
        { cuit: { contains: query } },
        { nombreContacto: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      usuarioAsignado: {
        select: { id: true, nombre: true, apellido: true, rol: true },
      },
    },
    take: 20,
    orderBy: { razonSocial: 'asc' },
  });
};

