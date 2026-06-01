"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eliminarVenta = exports.getVentasPorPeriodo = exports.getVentasActivas = exports.getResumenRetiro = exports.registrarRetiro = exports.actualizarEstadoVenta = exports.getVentaById = exports.getVentas = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const ventas_service_1 = require("../services/ventas.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
const actualizarEstadoSchema = zod_1.z.object({
    estado: zod_1.z.enum([
        'confirmado',
        'en_preparacion',
        'listo_para_envio',
        'en_transito',
        'entregado',
        'entregado_parcial',
        'cancelado',
    ]),
});
const retiroParcialSchema = zod_1.z.object({
    detalleVentaId: zod_1.z.number(),
    cantidadRetirada: zod_1.z.number().int().min(1, 'La cantidad debe ser al menos 1'),
});
const getVentas = async (req, res) => {
    try {
        const ventas = await (0, ventas_service_1.getVentasService)(req.user.userId, req.user.rol);
        res.json(ventas);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getVentas = getVentas;
const getVentaById = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const venta = await (0, ventas_service_1.getVentaByIdService)(id);
        res.json(venta);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
};
exports.getVentaById = getVentaById;
const actualizarEstadoVenta = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const { estado } = actualizarEstadoSchema.parse(req.body);
        const venta = await (0, ventas_service_1.actualizarEstadoVentaService)(id, estado);
        res.json(venta);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.actualizarEstadoVenta = actualizarEstadoVenta;
const registrarRetiro = async (req, res) => {
    try {
        const datos = retiroParcialSchema.parse(req.body);
        const resultado = await (0, ventas_service_1.registrarRetiroParcialService)(datos.detalleVentaId, datos.cantidadRetirada, req.user.userId);
        res.status(201).json(resultado);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.registrarRetiro = registrarRetiro;
const getResumenRetiro = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const resumen = await (0, ventas_service_1.getResumenRetiroService)(id);
        res.json(resumen);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getResumenRetiro = getResumenRetiro;
const getVentasActivas = async (req, res) => {
    try {
        const ventas = await (0, ventas_service_1.getVentasActivasService)();
        res.json(ventas);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getVentasActivas = getVentasActivas;
const getVentasPorPeriodo = async (req, res) => {
    try {
        const { desde, hasta, usuarioId } = req.query;
        if (!desde || !hasta) {
            return res.status(400).json({ error: 'Los parámetros desde y hasta son requeridos' });
        }
        const resultado = await (0, ventas_service_1.getVentasPorPeriodoService)(new Date(desde), new Date(hasta), usuarioId ? parseInt(usuarioId) : undefined);
        res.json(resultado);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getVentasPorPeriodo = getVentasPorPeriodo;
const eliminarVenta = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        // 1. Desvincular Compras que referencian esta venta (FK opcional)
        await prisma_1.default.compra.updateMany({ where: { ventaId: id }, data: { ventaId: null } });
        // 2. Desvincular SolicitudLogistica (FK opcional)
        await prisma_1.default.solicitudLogistica.updateMany({ where: { ventaId: id }, data: { ventaId: null } });
        // 3. EspecificacionMedida vinculada a DetalleVenta
        const detalles = await prisma_1.default.detalleVenta.findMany({ where: { ventaId: id }, select: { id: true } });
        const detalleIds = detalles.map(d => d.id);
        if (detalleIds.length) {
            await prisma_1.default.especificacionMedida.deleteMany({ where: { detalleVentaId: { in: detalleIds } } });
            await prisma_1.default.retiroParcial.deleteMany({ where: { detalleVentaId: { in: detalleIds } } });
        }
        // 4. Detalles de venta
        await prisma_1.default.detalleVenta.deleteMany({ where: { ventaId: id } });
        // 5. Pagos y facturas
        await prisma_1.default.pagoCobro.deleteMany({ where: { factura: { ventaId: id } } });
        await prisma_1.default.factura.deleteMany({ where: { ventaId: id } });
        // 6. Logística
        await prisma_1.default.logistica.deleteMany({ where: { ventaId: id } });
        // 7. Venta
        await prisma_1.default.venta.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (err) {
        console.error('Error al eliminar venta:', err);
        res.status(500).json({ error: 'No se pudo eliminar la venta' });
    }
};
exports.eliminarVenta = eliminarVenta;
