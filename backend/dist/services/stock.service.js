"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMovimientosStockService = exports.ajustarStockService = exports.getStockBajoMinimoService = exports.getStockService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getStockService = async (filtros) => {
    return prisma_1.default.stock.findMany({
        where: {
            ...(filtros?.productoId && { productoId: filtros.productoId }),
            ...(filtros?.proveedorId && { proveedorId: filtros.proveedorId }),
            ...(filtros?.propietarioId && { producto: { propietarioId: filtros.propietarioId } }),
        },
        include: {
            producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
            proveedor: { select: { id: true, nombreEmpresa: true } },
        },
        orderBy: { ultimaActualizacion: 'desc' },
    });
};
exports.getStockService = getStockService;
const getStockBajoMinimoService = async () => {
    // Traer todos los stocks con mínimo definido y filtrar en memoria
    const stocks = await prisma_1.default.stock.findMany({
        where: { cantidadMinima: { not: null } },
        include: {
            producto: { select: { id: true, nombre: true } },
            proveedor: { select: { id: true, nombreEmpresa: true } },
        },
    });
    return stocks.filter((s) => s.cantidadDisponible < s.cantidadMinima);
};
exports.getStockBajoMinimoService = getStockBajoMinimoService;
const ajustarStockService = async (datos) => {
    // Buscar o crear registro de stock
    let stock = await prisma_1.default.stock.findUnique({
        where: { productoId_proveedorId: { productoId: datos.productoId, proveedorId: datos.proveedorId } },
    });
    if (!stock) {
        stock = await prisma_1.default.stock.create({
            data: {
                productoId: datos.productoId,
                proveedorId: datos.proveedorId,
                cantidadDisponible: 0,
            },
        });
    }
    // Calcular nueva cantidad
    let nuevaCantidad = stock.cantidadDisponible;
    if (datos.tipoMovimiento === 'entrada') {
        nuevaCantidad += datos.cantidad;
    }
    else if (datos.tipoMovimiento === 'salida') {
        if (stock.cantidadDisponible < datos.cantidad) {
            throw new Error('Stock insuficiente para registrar la salida');
        }
        nuevaCantidad -= datos.cantidad;
    }
    else {
        // ajuste: la cantidad es el valor absoluto final
        nuevaCantidad = datos.cantidad;
    }
    // Actualizar stock y registrar movimiento en una transacción
    const [stockActualizado, movimiento] = await prisma_1.default.$transaction([
        prisma_1.default.stock.update({
            where: { id: stock.id },
            data: { cantidadDisponible: nuevaCantidad },
        }),
        prisma_1.default.movimientoStock.create({
            data: {
                stockId: stock.id,
                tipoMovimiento: datos.tipoMovimiento,
                cantidad: datos.cantidad,
                motivo: datos.motivo,
                idReferencia: datos.idReferencia,
                registradoPorId: datos.registradoPorId,
            },
        }),
    ]);
    return { stock: stockActualizado, movimiento };
};
exports.ajustarStockService = ajustarStockService;
const getMovimientosStockService = async (stockId) => {
    return prisma_1.default.movimientoStock.findMany({
        where: { stockId },
        include: {
            registradoPor: { select: { id: true, nombre: true, apellido: true } },
        },
        orderBy: { fecha: 'desc' },
    });
};
exports.getMovimientosStockService = getMovimientosStockService;
