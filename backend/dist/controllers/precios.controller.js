"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEscalonesProducto = exports.actualizarPrecioProveedor = exports.getHistorialPrecios = exports.crearPrecio = exports.calcularPrecio = exports.getListaPrecios = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const precios_service_1 = require("../services/precios.service");
const crearPrecioSchema = zod_1.z.object({
    productoId: zod_1.z.number(),
    precioUnitario: zod_1.z.number().positive('El precio debe ser mayor a 0'),
    margenPct: zod_1.z.number().optional(),
    cantMinima: zod_1.z.number().int().min(1),
    cantMaxima: zod_1.z.number().int().optional(),
    bonificaFlete: zod_1.z.boolean().optional(),
    vigentHasta: zod_1.z.string().optional(),
    observaciones: zod_1.z.string().optional(),
});
const getListaPrecios = async (req, res) => {
    try {
        const productoId = req.query.productoId
            ? parseInt(req.query.productoId)
            : undefined;
        const precios = await (0, precios_service_1.getListaPreciosService)(productoId);
        res.json(precios);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getListaPrecios = getListaPrecios;
const calcularPrecio = async (req, res) => {
    try {
        const productoId = (0, types_1.parseId)(req.params.productoId);
        const cantidad = parseInt(req.query.cantidad);
        if (!cantidad || cantidad < 1) {
            return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
        }
        const resultado = await (0, precios_service_1.calcularPrecioService)(productoId, cantidad);
        res.json(resultado);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.calcularPrecio = calcularPrecio;
const crearPrecio = async (req, res) => {
    try {
        const datos = crearPrecioSchema.parse(req.body);
        const precio = await (0, precios_service_1.crearPrecioService)({ ...datos, vigentHasta: datos.vigentHasta ? new Date(datos.vigentHasta) : undefined }, req.user.userId);
        res.status(201).json(precio);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.crearPrecio = crearPrecio;
const getHistorialPrecios = async (req, res) => {
    try {
        const productoId = (0, types_1.parseId)(req.params.productoId);
        const historial = await (0, precios_service_1.getHistorialPreciosService)(productoId);
        res.json(historial);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getHistorialPrecios = getHistorialPrecios;
const actualizarPrecioProveedor = async (req, res) => {
    try {
        const { productoId, proveedorId, nuevoPrecioCosto } = req.body;
        if (!productoId || !proveedorId || !nuevoPrecioCosto) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }
        const resultado = await (0, precios_service_1.actualizarPrecioProveedorService)(productoId, proveedorId, nuevoPrecioCosto, req.user.userId);
        res.json(resultado);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.actualizarPrecioProveedor = actualizarPrecioProveedor;
const getEscalonesProducto = async (req, res) => {
    try {
        const productoId = (0, types_1.parseId)(req.params.productoId);
        const escalones = await (0, precios_service_1.getEscalonesProductoService)(productoId);
        res.json(escalones);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getEscalonesProducto = getEscalonesProducto;
