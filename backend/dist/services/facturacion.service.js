"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargarNroFacturaArcaService = exports.getCobrosPendientesService = exports.crearNotaCreditoService = exports.getFacturasVencidasService = exports.registrarCobroService = exports.crearFacturaService = exports.getFacturaByIdService = exports.getFacturasService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getFacturasService = async (usuarioId, rol) => {
    const where = rol === 'admin' ? {} : { usuarioId };
    return prisma_1.default.factura.findMany({
        where,
        include: {
            cliente: { select: { id: true, razonSocial: true, cuit: true } },
            usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
            venta: { select: { id: true, estadoPedido: true, tipoEntrega: true } },
            pagos: true,
        },
        orderBy: { fechaEmision: 'desc' },
    });
};
exports.getFacturasService = getFacturasService;
const getFacturaByIdService = async (id) => {
    const factura = await prisma_1.default.factura.findUnique({
        where: { id },
        include: {
            cliente: true,
            usuario: { select: { nombre: true, apellido: true, rol: true } },
            venta: {
                include: { detalles: { include: { producto: true } } },
            },
            pagos: {
                include: { registradoPor: { select: { nombre: true, apellido: true } } },
                orderBy: { fechaPago: 'desc' },
            },
            notasCredito: true,
        },
    });
    if (!factura)
        throw new Error('Factura no encontrada');
    return factura;
};
exports.getFacturaByIdService = getFacturaByIdService;
const crearFacturaService = async (datos, usuarioId) => {
    const venta = await prisma_1.default.venta.findUnique({ where: { id: datos.ventaId } });
    if (!venta)
        throw new Error('Venta no encontrada');
    const facturaExistente = await prisma_1.default.factura.findFirst({
        where: { ventaId: datos.ventaId },
    });
    if (facturaExistente)
        throw new Error('Esta venta ya tiene una factura asociada');
    return prisma_1.default.factura.create({
        data: {
            ventaId: datos.ventaId,
            clienteId: venta.clienteId,
            usuarioId,
            nroFactura: datos.nroFactura,
            esSinFactura: datos.esSinFactura ?? false,
            fechaVencimiento: datos.fechaVencimiento,
            totalNeto: datos.totalNeto,
            iva: datos.iva,
            totalConIva: datos.totalConIva,
            observaciones: datos.observaciones,
        },
        include: {
            cliente: { select: { razonSocial: true } },
        },
    });
};
exports.crearFacturaService = crearFacturaService;
const registrarCobroService = async (facturaId, datos, usuarioId) => {
    const factura = await prisma_1.default.factura.findUnique({
        where: { id: facturaId },
        include: { pagos: true },
    });
    if (!factura)
        throw new Error('Factura no encontrada');
    if (factura.estadoCobro === 'cobrada_total') {
        throw new Error('Esta factura ya fue cobrada en su totalidad');
    }
    const totalCobrado = factura.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
    const saldoPendiente = Number(factura.totalConIva) - totalCobrado;
    if (datos.monto > saldoPendiente + 0.01) {
        throw new Error(`El monto supera el saldo pendiente de $${saldoPendiente.toLocaleString('es-AR')}`);
    }
    const pago = await prisma_1.default.pagoCobro.create({
        data: {
            facturaId,
            clienteId: factura.clienteId,
            monto: datos.monto,
            medioPago: datos.medioPago,
            nroComprobante: datos.nroComprobante,
            esAdelanto: datos.esAdelanto ?? false,
            registradoPorId: usuarioId,
            observaciones: datos.observaciones,
        },
    });
    const nuevoTotalCobrado = totalCobrado + datos.monto;
    let nuevoEstado = nuevoTotalCobrado >= Number(factura.totalConIva) - 0.01
        ? 'cobrada_total'
        : 'cobrada_parcial';
    await prisma_1.default.factura.update({
        where: { id: facturaId },
        data: { estadoCobro: nuevoEstado },
    });
    return {
        pago,
        resumen: {
            totalFactura: Number(factura.totalConIva),
            totalCobrado: nuevoTotalCobrado,
            saldoPendiente: Number(factura.totalConIva) - nuevoTotalCobrado,
            estadoCobro: nuevoEstado,
        },
    };
};
exports.registrarCobroService = registrarCobroService;
const getFacturasVencidasService = async () => {
    const hoy = new Date();
    const facturasVencidas = await prisma_1.default.factura.findMany({
        where: {
            estadoCobro: { in: ['pendiente', 'cobrada_parcial'] },
            fechaVencimiento: { lt: hoy },
        },
        include: {
            cliente: { select: { id: true, razonSocial: true, telefonoContacto: true } },
            usuario: { select: { nombre: true, apellido: true, rol: true } },
            pagos: true,
        },
        orderBy: { fechaVencimiento: 'asc' },
    });
    return facturasVencidas.map((f) => {
        const totalCobrado = f.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
        const diasVencida = Math.floor((hoy.getTime() - new Date(f.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24));
        return {
            ...f,
            totalCobrado,
            saldoPendiente: Number(f.totalConIva) - totalCobrado,
            diasVencida,
            urgencia: diasVencida > 7 ? 'alta' : diasVencida > 3 ? 'media' : 'baja',
        };
    });
};
exports.getFacturasVencidasService = getFacturasVencidasService;
const crearNotaCreditoService = async (datos, usuarioId) => {
    const factura = await prisma_1.default.factura.findUnique({ where: { id: datos.facturaId } });
    if (!factura)
        throw new Error('Factura no encontrada');
    return prisma_1.default.notaCredito.create({
        data: {
            facturaId: datos.facturaId,
            clienteId: factura.clienteId,
            usuarioId,
            nroNota: datos.nroNota,
            monto: datos.monto,
            motivo: datos.motivo,
        },
    });
};
exports.crearNotaCreditoService = crearNotaCreditoService;
const getCobrosPendientesService = async (usuarioId, rol) => {
    const where = {
        estadoCobro: { in: ['pendiente', 'cobrada_parcial'] },
    };
    if (rol !== 'admin')
        where.usuarioId = usuarioId;
    const facturas = await prisma_1.default.factura.findMany({
        where,
        include: {
            cliente: { select: { id: true, razonSocial: true, telefonoContacto: true } },
            usuario: { select: { nombre: true, apellido: true } },
            pagos: true,
        },
        orderBy: { fechaVencimiento: 'asc' },
    });
    return facturas.map((f) => {
        const totalCobrado = f.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
        return {
            ...f,
            totalCobrado,
            saldoPendiente: Number(f.totalConIva) - totalCobrado,
        };
    });
};
exports.getCobrosPendientesService = getCobrosPendientesService;
const cargarNroFacturaArcaService = async (facturaId, nroFacturaArca) => {
    const factura = await prisma_1.default.factura.findUnique({ where: { id: facturaId } });
    if (!factura)
        throw new Error('Factura no encontrada');
    return prisma_1.default.factura.update({
        where: { id: facturaId },
        data: { nroFactura: nroFacturaArca },
    });
};
exports.cargarNroFacturaArcaService = cargarNroFacturaArcaService;
