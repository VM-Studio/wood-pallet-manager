"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEscalonesProductoService = exports.actualizarPrecioProveedorService = exports.getHistorialPreciosService = exports.crearPrecioService = exports.calcularPrecioService = exports.getListaPreciosService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getListaPreciosService = async (productoId) => {
    const where = {
        OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }],
    };
    if (productoId)
        where.productoId = productoId;
    return prisma_1.default.listaPrecio.findMany({
        where,
        include: {
            producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
            creadoPor: { select: { id: true, nombre: true, apellido: true } },
        },
        orderBy: [{ productoId: 'asc' }, { cantMinima: 'asc' }],
    });
};
exports.getListaPreciosService = getListaPreciosService;
const calcularPrecioService = async (productoId, cantidad) => {
    const precio = await prisma_1.default.listaPrecio.findFirst({
        where: {
            productoId,
            cantMinima: { lte: cantidad },
            OR: [{ cantMaxima: null }, { cantMaxima: { gte: cantidad } }],
            AND: [
                { OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }] },
            ],
        },
        orderBy: { cantMinima: 'desc' },
    });
    const base = precio ?? (await prisma_1.default.listaPrecio.findFirst({
        where: {
            productoId,
            OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }],
        },
        orderBy: { cantMinima: 'asc' },
    }));
    if (!base)
        throw new Error('No hay precio configurado para este producto');
    return {
        precioUnitario: base.precioUnitario,
        cantMinima: base.cantMinima,
        cantMaxima: base.cantMaxima,
        bonificaFlete: base.bonificaFlete,
        subtotal: Number(base.precioUnitario) * cantidad,
        subtotalConIva: Number(base.precioUnitario) * cantidad * 1.21,
        escalon: base.cantMaxima
            ? `${base.cantMinima} a ${base.cantMaxima} unidades`
            : `Desde ${base.cantMinima} unidades`,
    };
};
exports.calcularPrecioService = calcularPrecioService;
const crearPrecioService = async (datos, usuarioId) => {
    const precioAnterior = await prisma_1.default.listaPrecio.findFirst({
        where: {
            productoId: datos.productoId,
            cantMinima: datos.cantMinima,
            OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }],
        },
    });
    if (precioAnterior) {
        await prisma_1.default.historialPrecio.create({
            data: {
                productoId: datos.productoId,
                precioAnterior: precioAnterior.precioUnitario,
                precioNuevo: datos.precioUnitario,
                motivo: datos.observaciones || 'Actualización de precio',
                registradoPorId: usuarioId,
            },
        });
        await prisma_1.default.listaPrecio.update({
            where: { id: precioAnterior.id },
            data: { vigentHasta: new Date() },
        });
    }
    return prisma_1.default.listaPrecio.create({
        data: { ...datos, creadoPorId: usuarioId },
        include: {
            producto: { select: { id: true, nombre: true, tipo: true } },
        },
    });
};
exports.crearPrecioService = crearPrecioService;
const getHistorialPreciosService = async (productoId) => {
    return prisma_1.default.historialPrecio.findMany({
        where: { productoId },
        include: {
            producto: { select: { nombre: true } },
            registradoPor: { select: { nombre: true, apellido: true } },
        },
        orderBy: { fechaCambio: 'desc' },
    });
};
exports.getHistorialPreciosService = getHistorialPreciosService;
const actualizarPrecioProveedorService = async (productoId, proveedorId, nuevoPrecioCosto, usuarioId) => {
    const prodProv = await prisma_1.default.productoProveedor.findFirst({
        where: { productoId, proveedorId },
    });
    if (!prodProv)
        throw new Error('No se encontró la relación producto-proveedor');
    await prisma_1.default.productoProveedor.update({
        where: { id: prodProv.id },
        data: { precioCosto: nuevoPrecioCosto, fechaActualizacion: new Date() },
    });
    await prisma_1.default.historialPrecio.create({
        data: {
            productoId,
            precioAnterior: prodProv.precioCosto,
            precioNuevo: nuevoPrecioCosto,
            motivo: 'Actualización de precio del proveedor',
            registradoPorId: usuarioId,
        },
    });
    return { mensaje: 'Precio del proveedor actualizado correctamente' };
};
exports.actualizarPrecioProveedorService = actualizarPrecioProveedorService;
const getEscalonesProductoService = async (productoId) => {
    const escalones = await prisma_1.default.listaPrecio.findMany({
        where: {
            productoId,
            OR: [{ vigentHasta: null }, { vigentHasta: { gte: new Date() } }],
        },
        orderBy: { cantMinima: 'asc' },
    });
    const prodProv = await prisma_1.default.productoProveedor.findFirst({
        where: { productoId },
        orderBy: { fechaActualizacion: 'desc' },
    });
    return {
        escalones,
        precioCostoActual: prodProv?.precioCosto ?? null,
    };
};
exports.getEscalonesProductoService = getEscalonesProductoService;
