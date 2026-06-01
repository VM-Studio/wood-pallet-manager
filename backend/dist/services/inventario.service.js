"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ajustarStockService = exports.getMovimientosStockService = exports.getAlertasStockService = exports.getStockService = exports.getStockConsolidadoService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Stock consolidado con distinción de stock propio vs deudor
const getStockConsolidadoService = async () => {
    const stock = await prisma_1.default.stock.findMany({
        where: { producto: { activo: true } },
        include: {
            producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
            proveedor: { select: { id: true, nombreEmpresa: true } }
        }
    });
    const consolidado = {};
    for (const s of stock) {
        const prodId = s.producto.id;
        if (!consolidado[prodId]) {
            consolidado[prodId] = {
                producto: s.producto,
                stockTotalPropio: 0,
                stockTotalDeudor: 0,
                porGalpon: []
            };
        }
        consolidado[prodId].stockTotalPropio += s.cantidadDisponible;
        consolidado[prodId].stockTotalDeudor += s.cantidadDeudora;
        consolidado[prodId].porGalpon.push({
            stockId: s.id,
            proveedor: s.proveedor,
            cantidadDisponible: s.cantidadDisponible,
            cantidadDeudora: s.cantidadDeudora,
            cantidadMinima: s.cantidadMinima,
            bajoMinimo: s.cantidadMinima !== null && s.cantidadDisponible <= s.cantidadMinima,
            tieneSaldoDeudor: s.cantidadDeudora > 0
        });
    }
    return Object.values(consolidado);
};
exports.getStockConsolidadoService = getStockConsolidadoService;
// Stock completo sin consolidar
const getStockService = async () => {
    const stock = await prisma_1.default.stock.findMany({
        include: {
            producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
            proveedor: { select: { id: true, nombreEmpresa: true } }
        },
        orderBy: { producto: { nombre: 'asc' } }
    });
    return stock.map(s => ({
        ...s,
        bajoMinimo: s.cantidadMinima !== null && s.cantidadDisponible <= s.cantidadMinima,
        tieneSaldoDeudor: s.cantidadDeudora > 0
    }));
};
exports.getStockService = getStockService;
// Alertas de stock bajo mínimo
const getAlertasStockService = async () => {
    const stock = await prisma_1.default.stock.findMany({
        where: { cantidadMinima: { not: null } },
        include: {
            producto: { select: { id: true, nombre: true, tipo: true } },
            proveedor: { select: { id: true, nombreEmpresa: true } }
        }
    });
    return stock
        .filter(s => s.cantidadDisponible <= (s.cantidadMinima || 0))
        .map(s => ({
        stockId: s.id,
        producto: s.producto,
        proveedor: s.proveedor,
        cantidadDisponible: s.cantidadDisponible,
        cantidadDeudora: s.cantidadDeudora,
        cantidadMinima: s.cantidadMinima,
        deficit: (s.cantidadMinima || 0) - s.cantidadDisponible
    }));
};
exports.getAlertasStockService = getAlertasStockService;
// Movimientos de stock
const getMovimientosStockService = async (productoId, proveedorId) => {
    const where = {};
    if (productoId || proveedorId) {
        const stockConditions = {};
        if (productoId)
            stockConditions.productoId = productoId;
        if (proveedorId)
            stockConditions.proveedorId = proveedorId;
        where.stock = stockConditions;
    }
    return await prisma_1.default.movimientoStock.findMany({
        where,
        include: {
            stock: {
                include: {
                    producto: { select: { nombre: true, tipo: true } },
                    proveedor: { select: { nombreEmpresa: true } }
                }
            },
            registradoPor: { select: { nombre: true, apellido: true } }
        },
        orderBy: { fecha: 'desc' },
        take: 100
    });
};
exports.getMovimientosStockService = getMovimientosStockService;
// Ajuste manual de stock
const ajustarStockService = async (stockId, nuevaCantidad, motivo, usuarioId) => {
    const stock = await prisma_1.default.stock.findUnique({ where: { id: stockId } });
    if (!stock)
        throw new Error('Registro de stock no encontrado');
    // El stock propio nunca puede ser negativo
    const cantidadFinal = Math.max(0, nuevaCantidad);
    const diferencia = cantidadFinal - stock.cantidadDisponible;
    await prisma_1.default.stock.update({
        where: { id: stockId },
        data: { cantidadDisponible: cantidadFinal }
    });
    await prisma_1.default.movimientoStock.create({
        data: {
            stockId,
            tipoMovimiento: 'ajuste',
            cantidad: Math.abs(diferencia),
            motivo: 'ajuste_manual',
            registradoPorId: usuarioId
        }
    });
    return {
        mensaje: 'Stock ajustado correctamente',
        cantidadAnterior: stock.cantidadDisponible,
        cantidadNueva: cantidadFinal,
        diferencia
    };
};
exports.ajustarStockService = ajustarStockService;
