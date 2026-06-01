"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockBajoMinimo = exports.getMovimientos = exports.ajustarStock = exports.getStock = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const stock_service_1 = require("../services/stock.service");
const ajustarStockSchema = zod_1.z.object({
    productoId: zod_1.z.number().int().positive(),
    proveedorId: zod_1.z.number().int().positive(),
    tipoMovimiento: zod_1.z.enum(['entrada', 'salida', 'ajuste']),
    cantidad: zod_1.z.number().int().positive(),
    motivo: zod_1.z.enum(['venta', 'compra', 'devolucion', 'ajuste_manual']),
    idReferencia: zod_1.z.number().int().positive().optional(),
});
const getStock = async (req, res) => {
    try {
        const { productoId, proveedorId } = req.query;
        const propietarioId = req.user.userId;
        const stock = await (0, stock_service_1.getStockService)({
            productoId: productoId ? parseInt(productoId) : undefined,
            proveedorId: proveedorId ? parseInt(proveedorId) : undefined,
            propietarioId,
        });
        res.json(stock);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getStock = getStock;
const ajustarStock = async (req, res) => {
    try {
        const datos = ajustarStockSchema.parse(req.body);
        const resultado = await (0, stock_service_1.ajustarStockService)({
            ...datos,
            registradoPorId: req.user.userId,
        });
        res.status(201).json(resultado);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.ajustarStock = ajustarStock;
const getMovimientos = async (req, res) => {
    try {
        const stockId = (0, types_1.parseId)(req.params.stockId);
        const movimientos = await (0, stock_service_1.getMovimientosStockService)(stockId);
        res.json(movimientos);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getMovimientos = getMovimientos;
const getStockBajoMinimo = async (req, res) => {
    try {
        const stock = await (0, stock_service_1.getStockBajoMinimoService)();
        res.json(stock);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getStockBajoMinimo = getStockBajoMinimo;
