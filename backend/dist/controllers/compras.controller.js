"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVentasParaCompraDirecta = exports.actualizarEstadoCompra = exports.getCompraById = exports.getDeudaProveedores = exports.cancelarCompra = exports.registrarPagoCompra = exports.crearCompra = exports.getCompras = void 0;
const zod_1 = require("zod");
const compras_service_1 = require("../services/compras.service");
const detalleSchema = zod_1.z.object({
    productoId: zod_1.z.number(),
    cantidad: zod_1.z.number().int().min(1),
    precioCostoUnit: zod_1.z.number().positive()
});
const crearCompraSchema = zod_1.z.object({
    proveedorId: zod_1.z.number(),
    tipoCompra: zod_1.z.enum(['reventa_inmediata', 'stock_propio']),
    ventaId: zod_1.z.number().optional(),
    nroRemito: zod_1.z.string().optional(),
    observaciones: zod_1.z.string().optional(),
    detalles: zod_1.z.array(detalleSchema).min(1, 'Debe haber al menos un producto')
});
const pagoSchema = zod_1.z.object({
    metodoPago: zod_1.z.enum(['transferencia', 'e_check', 'efectivo']),
    cuentaDestino: zod_1.z.string().optional(),
    nroComprobante: zod_1.z.string().optional(),
    observaciones: zod_1.z.string().optional()
});
const getCompras = async (req, res) => {
    try {
        const compras = await (0, compras_service_1.getComprasService)(req.user.userId, req.user.rol);
        res.json(compras);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getCompras = getCompras;
const crearCompra = async (req, res) => {
    try {
        const datos = crearCompraSchema.parse(req.body);
        const compra = await (0, compras_service_1.crearCompraService)(datos, req.user.userId, req.user.rol);
        res.status(201).json(compra);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.crearCompra = crearCompra;
const registrarPagoCompra = async (req, res) => {
    try {
        const id = parseInt(req.params['id']);
        const datos = pagoSchema.parse(req.body);
        const compra = await (0, compras_service_1.registrarPagoCompraService)(id, datos, req.user.userId);
        res.json(compra);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.registrarPagoCompra = registrarPagoCompra;
const cancelarCompra = async (req, res) => {
    try {
        const id = parseInt(req.params['id']);
        const resultado = await (0, compras_service_1.cancelarCompraService)(id, req.user.userId);
        res.json(resultado);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.cancelarCompra = cancelarCompra;
const getDeudaProveedores = async (req, res) => {
    try {
        const deuda = await (0, compras_service_1.getDeudaProveedoresService)();
        res.json(deuda);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getDeudaProveedores = getDeudaProveedores;
const getCompraById = async (req, res) => {
    try {
        const id = parseInt(req.params['id']);
        const compra = await (0, compras_service_1.getCompraByIdService)(id);
        if (!compra)
            return res.status(404).json({ error: 'Compra no encontrada' });
        res.json(compra);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getCompraById = getCompraById;
const actualizarEstadoCompra = async (req, res) => {
    try {
        const id = parseInt(req.params['id']);
        const { estado } = req.body;
        const compra = await (0, compras_service_1.actualizarEstadoCompraService)(id, estado);
        res.json(compra);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.actualizarEstadoCompra = actualizarEstadoCompra;
const getVentasParaCompraDirecta = async (req, res) => {
    try {
        const ventas = await (0, compras_service_1.getVentasParaCompraDirectaService)(req.user.userId, req.user.rol);
        res.json(ventas);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getVentasParaCompraDirecta = getVentasParaCompraDirecta;
