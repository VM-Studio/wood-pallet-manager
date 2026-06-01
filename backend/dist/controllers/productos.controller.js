"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desactivarProducto = exports.actualizarProducto = exports.crearProducto = exports.getProductoById = exports.getProductosOtro = exports.getProductos = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const productos_service_1 = require("../services/productos.service");
const crearProductoSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(1, 'El nombre es requerido'),
    tipo: zod_1.z.enum(['estandar', 'reforzado', 'liviano', 'exportacion', 'carton', 'a_medida', 'personalizado']),
    condicion: zod_1.z.enum(['nuevo', 'seminuevo', 'usado']),
    dimensionLargo: zod_1.z.number().optional(),
    dimensionAncho: zod_1.z.number().optional(),
    cargaMaximaKg: zod_1.z.number().optional(),
    requiereSenasa: zod_1.z.boolean().optional(),
    descripcion: zod_1.z.string().optional(),
});
const getProductos = async (req, res) => {
    try {
        const usuarioId = req.user.userId;
        const productos = await (0, productos_service_1.getProductosService)(usuarioId);
        res.json(productos);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getProductos = getProductos;
const getProductosOtro = async (req, res) => {
    try {
        const usuarioId = req.user.userId;
        const productos = await (0, productos_service_1.getProductosOtroService)(usuarioId);
        res.json(productos);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getProductosOtro = getProductosOtro;
const getProductoById = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const producto = await (0, productos_service_1.getProductoByIdService)(id);
        res.json(producto);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
};
exports.getProductoById = getProductoById;
const crearProducto = async (req, res) => {
    try {
        const datos = crearProductoSchema.parse(req.body);
        const propietarioId = req.user.userId;
        if (!propietarioId) {
            return res.status(400).json({ error: 'No se pudo identificar al propietario. Cerrá sesión y volvé a ingresar.' });
        }
        const producto = await (0, productos_service_1.crearProductoService)({ ...datos, propietarioId });
        res.status(201).json(producto);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.crearProducto = crearProducto;
const actualizarProducto = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const propietarioId = req.user.userId;
        const datos = crearProductoSchema.partial().parse(req.body);
        const producto = await (0, productos_service_1.actualizarProductoService)(id, propietarioId, datos);
        res.json(producto);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.actualizarProducto = actualizarProducto;
const desactivarProducto = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const propietarioId = req.user.userId;
        const resultado = await (0, productos_service_1.desactivarProductoService)(id, propietarioId);
        res.json(resultado);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.desactivarProducto = desactivarProducto;
