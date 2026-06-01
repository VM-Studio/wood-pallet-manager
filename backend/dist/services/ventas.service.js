"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVentasPorPeriodoService = exports.getVentasActivasService = exports.getResumenRetiroService = exports.registrarRetiroParcialService = exports.actualizarEstadoVentaService = exports.getVentaByIdService = exports.getVentasService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getVentasService = async (usuarioId, rol) => {
    const where = rol === 'admin' ? {} : { usuarioId };
    return prisma_1.default.venta.findMany({
        where,
        include: {
            cliente: { select: { id: true, razonSocial: true, telefonoContacto: true } },
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
exports.getVentasService = getVentasService;
const getVentaByIdService = async (id) => {
    const venta = await prisma_1.default.venta.findUnique({
        where: { id },
        include: {
            cliente: true,
            usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
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
    if (!venta)
        throw new Error('Venta no encontrada');
    return venta;
};
exports.getVentaByIdService = getVentaByIdService;
const actualizarEstadoVentaService = async (id, estado) => {
    const venta = await prisma_1.default.venta.findUnique({ where: { id } });
    if (!venta)
        throw new Error('Venta no encontrada');
    return prisma_1.default.venta.update({
        where: { id },
        data: {
            estadoPedido: estado,
            fechaEntregaReal: estado === 'entregado' ? new Date() : undefined,
        },
    });
};
exports.actualizarEstadoVentaService = actualizarEstadoVentaService;
const registrarRetiroParcialService = async (detalleVentaId, cantidadRetirada, usuarioId) => {
    const detalle = await prisma_1.default.detalleVenta.findUnique({
        where: { id: detalleVentaId },
        include: { retiros: true, venta: true },
    });
    if (!detalle)
        throw new Error('Detalle de venta no encontrado');
    const totalRetirado = detalle.retiros.reduce((acc, r) => acc + r.cantidadRetirada, 0);
    const pendienteRetiro = detalle.cantidadPedida - totalRetirado;
    if (cantidadRetirada > pendienteRetiro) {
        throw new Error(`Solo quedan ${pendienteRetiro} unidades pendientes de retiro`);
    }
    const retiro = await prisma_1.default.retiroParcial.create({
        data: { detalleVentaId, cantidadRetirada, registradoPorId: usuarioId },
    });
    const nuevaCantidadEntregada = totalRetirado + cantidadRetirada;
    await prisma_1.default.detalleVenta.update({
        where: { id: detalleVentaId },
        data: { cantidadEntregada: nuevaCantidadEntregada },
    });
    // Descontar del stock (solo si hay stock disponible para este producto)
    const stockEntry = await prisma_1.default.stock.findFirst({
        where: { productoId: detalle.productoId },
    });
    if (stockEntry && stockEntry.cantidadDisponible > 0) {
        // Floor en 0: el stock propio nunca puede quedar negativo
        const nuevaCantidad = Math.max(0, stockEntry.cantidadDisponible - cantidadRetirada);
        await prisma_1.default.stock.update({
            where: { id: stockEntry.id },
            data: { cantidadDisponible: nuevaCantidad },
        });
        await prisma_1.default.movimientoStock.create({
            data: {
                stockId: stockEntry.id,
                tipoMovimiento: 'salida',
                cantidad: cantidadRetirada,
                motivo: 'venta',
                idReferencia: detalle.ventaId,
                registradoPorId: usuarioId,
            },
        });
    }
    // Actualizar estado de la venta
    const todosDetalles = await prisma_1.default.detalleVenta.findMany({
        where: { ventaId: detalle.ventaId },
        include: { retiros: true },
    });
    const todosEntregados = todosDetalles.every((d) => {
        const totalD = d.retiros.reduce((acc, r) => acc + r.cantidadRetirada, 0);
        return totalD >= d.cantidadPedida;
    });
    await prisma_1.default.venta.update({
        where: { id: detalle.ventaId },
        data: {
            estadoPedido: todosEntregados ? 'entregado' : 'entregado_parcial',
            fechaEntregaReal: todosEntregados ? new Date() : undefined,
        },
    });
    const detalleActualizado = await prisma_1.default.detalleVenta.findUnique({
        where: { id: detalleVentaId },
        include: { retiros: true },
    });
    const totalRetiradoFinal = detalleActualizado.retiros.reduce((acc, r) => acc + r.cantidadRetirada, 0);
    return {
        retiro,
        resumen: {
            cantidadPedida: detalle.cantidadPedida,
            cantidadRetirada: totalRetiradoFinal,
            cantidadPendiente: detalle.cantidadPedida - totalRetiradoFinal,
        },
    };
};
exports.registrarRetiroParcialService = registrarRetiroParcialService;
const getResumenRetiroService = async (ventaId) => {
    const detalles = await prisma_1.default.detalleVenta.findMany({
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
exports.getResumenRetiroService = getResumenRetiroService;
const getVentasActivasService = async () => {
    return prisma_1.default.venta.findMany({
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
exports.getVentasActivasService = getVentasActivasService;
const getVentasPorPeriodoService = async (desde, hasta, usuarioId) => {
    const where = { fechaVenta: { gte: desde, lte: hasta } };
    if (usuarioId)
        where.usuarioId = usuarioId;
    const ventas = await prisma_1.default.venta.findMany({
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
    const totalPallets = ventas.reduce((acc, v) => acc + v.detalles.reduce((a, d) => a + d.cantidadPedida, 0), 0);
    const totalFacturado = ventas.reduce((acc, v) => acc + Number(v.totalConIva || 0), 0);
    return {
        ventas,
        resumen: { totalVentas: ventas.length, totalPallets, totalFacturado },
    };
};
exports.getVentasPorPeriodoService = getVentasPorPeriodoService;
