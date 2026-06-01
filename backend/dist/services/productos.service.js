"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.desactivarProductoService = exports.actualizarProductoService = exports.crearProductoService = exports.getProductoByIdService = exports.getProductosOtroService = exports.getProductosService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getIncludeProducto = () => ({
    prodProveedores: {
        include: {
            proveedor: {
                select: { id: true, nombreEmpresa: true, tipoProducto: true },
            },
        },
    },
    stocks: {
        include: {
            proveedor: { select: { id: true, nombreEmpresa: true } },
        },
    },
    listaPrecios: {
        where: {
            OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }],
        },
        orderBy: { cantMinima: 'asc' },
    },
    propietario: { select: { id: true, nombre: true, apellido: true, rol: true } },
});
const getProductosService = async (propietarioId) => {
    const productos = await prisma_1.default.producto.findMany({
        where: { activo: true, propietarioId },
        include: getIncludeProducto(),
        orderBy: { nombre: 'asc' },
    });
    return productos.map(p => ({
        ...p,
        stockTotalPropio: p.stocks.reduce((acc, s) => acc + s.cantidadDisponible, 0),
        stockTotalDeudor: p.stocks.reduce((acc, s) => acc + (s.cantidadDeudora || 0), 0),
        tieneSaldoDeudor: p.stocks.some(s => (s.cantidadDeudora || 0) > 0)
    }));
};
exports.getProductosService = getProductosService;
const getProductosOtroService = async (propietarioId) => {
    // Devuelve productos del otro usuario (cross-user, solo lectura)
    const productos = await prisma_1.default.producto.findMany({
        where: { activo: true, propietarioId: { not: propietarioId } },
        include: getIncludeProducto(),
        orderBy: { nombre: 'asc' },
    });
    return productos.map(p => ({
        ...p,
        stockTotalPropio: p.stocks.reduce((acc, s) => acc + s.cantidadDisponible, 0),
        stockTotalDeudor: p.stocks.reduce((acc, s) => acc + (s.cantidadDeudora || 0), 0),
        tieneSaldoDeudor: p.stocks.some(s => (s.cantidadDeudora || 0) > 0)
    }));
};
exports.getProductosOtroService = getProductosOtroService;
const getProductoByIdService = async (id) => {
    const producto = await prisma_1.default.producto.findUnique({
        where: { id },
        include: {
            prodProveedores: { include: { proveedor: true } },
            listaPrecios: {
                where: {
                    OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }],
                },
                orderBy: { cantMinima: 'asc' },
            },
            stocks: {
                include: {
                    proveedor: { select: { id: true, nombreEmpresa: true } },
                },
            },
            propietario: { select: { id: true, nombre: true, apellido: true, rol: true } },
        },
    });
    if (!producto)
        throw new Error('Producto no encontrado');
    return producto;
};
exports.getProductoByIdService = getProductoByIdService;
const crearProductoService = async (datos) => {
    return prisma_1.default.producto.create({ data: datos });
};
exports.crearProductoService = crearProductoService;
const actualizarProductoService = async (id, propietarioId, datos) => {
    const producto = await prisma_1.default.producto.findUnique({ where: { id } });
    if (!producto)
        throw new Error('Producto no encontrado');
    if (producto.propietarioId !== propietarioId)
        throw new Error('No tenés permiso para editar este producto');
    return prisma_1.default.producto.update({ where: { id }, data: datos });
};
exports.actualizarProductoService = actualizarProductoService;
const desactivarProductoService = async (id, propietarioId) => {
    const producto = await prisma_1.default.producto.findUnique({ where: { id } });
    if (!producto)
        throw new Error('Producto no encontrado');
    if (producto.propietarioId !== propietarioId)
        throw new Error('No tenés permiso para eliminar este producto');
    await prisma_1.default.producto.update({ where: { id }, data: { activo: false } });
    return { mensaje: 'Producto desactivado correctamente' };
};
exports.desactivarProductoService = desactivarProductoService;
