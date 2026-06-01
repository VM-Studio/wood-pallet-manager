"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConsolidado = exports.ajustarStock = exports.getMovimientos = exports.getAlertas = exports.getStock = void 0;
const zod_1 = require("zod");
const inventario_service_1 = require("../services/inventario.service");
const getStock = async (_req, res) => {
    const stock = await (0, inventario_service_1.getStockService)();
    res.json(stock);
};
exports.getStock = getStock;
const getAlertas = async (_req, res) => {
    const alertas = await (0, inventario_service_1.getAlertasStockService)();
    res.json(alertas);
};
exports.getAlertas = getAlertas;
const getMovimientos = async (req, res) => {
    const productoId = req.query.productoId ? Number(req.query.productoId) : undefined;
    const proveedorId = req.query.proveedorId ? Number(req.query.proveedorId) : undefined;
    const movimientos = await (0, inventario_service_1.getMovimientosStockService)(productoId, proveedorId);
    res.json(movimientos);
};
exports.getMovimientos = getMovimientos;
const ajustarStock = async (req, res) => {
    const schema = zod_1.z.object({
        stockId: zod_1.z.number().int().positive(),
        nuevaCantidad: zod_1.z.number().int().min(0),
        motivo: zod_1.z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const result = await (0, inventario_service_1.ajustarStockService)(parsed.data.stockId, parsed.data.nuevaCantidad, parsed.data.motivo, req.user.userId);
    res.json(result);
};
exports.ajustarStock = ajustarStock;
const getConsolidado = async (_req, res) => {
    const consolidado = await (0, inventario_service_1.getStockConsolidadoService)();
    res.json(consolidado);
};
exports.getConsolidado = getConsolidado;
