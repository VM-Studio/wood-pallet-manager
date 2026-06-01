"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vincularProducto = exports.desactivarProveedor = exports.actualizarProveedor = exports.crearProveedor = exports.getProveedorById = exports.getProveedores = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const proveedores_service_1 = require("../services/proveedores.service");
const crearProveedorSchema = zod_1.z.object({
    nombreEmpresa: zod_1.z.string().min(1, 'El nombre de la empresa es requerido'),
    nombreContacto: zod_1.z.string().optional().default(''),
    telefono: zod_1.z.string().optional(),
    email: zod_1.z.string().email('Email inválido').optional(),
    tipoProducto: zod_1.z.enum(['seminuevo', 'nuevo_medida', 'ambos']),
    contactoExclusivoId: zod_1.z.number().int().positive().optional(),
    distanciaKm: zod_1.z.number().int().nonnegative().optional(),
    ubicacion: zod_1.z.string().optional(),
    observaciones: zod_1.z.string().optional(),
});
const actualizarProveedorSchema = crearProveedorSchema.partial();
const vincularProductoSchema = zod_1.z.object({
    productoId: zod_1.z.number().int().positive(),
    precioCosto: zod_1.z.number().positive('El precio de costo debe ser mayor a 0'),
    observaciones: zod_1.z.string().optional(),
});
const getProveedores = async (req, res) => {
    try {
        const proveedores = await (0, proveedores_service_1.getProveedoresService)();
        res.json(proveedores);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getProveedores = getProveedores;
const getProveedorById = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const proveedor = await (0, proveedores_service_1.getProveedorByIdService)(id);
        res.json(proveedor);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
};
exports.getProveedorById = getProveedorById;
const crearProveedor = async (req, res) => {
    try {
        const datos = crearProveedorSchema.parse(req.body);
        const proveedor = await (0, proveedores_service_1.crearProveedorService)(datos);
        res.status(201).json(proveedor);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.crearProveedor = crearProveedor;
const actualizarProveedor = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const datos = actualizarProveedorSchema.parse(req.body);
        const proveedor = await (0, proveedores_service_1.actualizarProveedorService)(id, datos);
        res.json(proveedor);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.actualizarProveedor = actualizarProveedor;
const desactivarProveedor = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        await (0, proveedores_service_1.desactivarProveedorService)(id);
        res.json({ message: 'Proveedor desactivado correctamente' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.desactivarProveedor = desactivarProveedor;
const vincularProducto = async (req, res) => {
    try {
        const proveedorId = (0, types_1.parseId)(req.params.id);
        const datos = vincularProductoSchema.parse(req.body);
        const vinculo = await (0, proveedores_service_1.vincularProductoProveedorService)({ proveedorId, ...datos });
        res.status(201).json(vinculo);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.vincularProducto = vincularProducto;
