"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscarClientes = exports.getHistorialCliente = exports.desactivarCliente = exports.actualizarCliente = exports.crearCliente = exports.getClienteById = exports.getClientes = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const clientes_service_1 = require("../services/clientes.service");
const crearClienteSchema = zod_1.z.object({
    razonSocial: zod_1.z.string().min(1, 'La razón social es requerida'),
    cuit: zod_1.z.string().optional(),
    nombreContacto: zod_1.z.string().optional(),
    telefonoContacto: zod_1.z.string().optional(),
    emailContacto: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    canalEntrada: zod_1.z
        .enum(['whatsapp', 'formulario_web', 'llamada', 'recomendacion', 'otro'])
        .optional(),
    direccionEntrega: zod_1.z.string().optional(),
    localidad: zod_1.z.string().optional(),
    esExportador: zod_1.z.boolean().optional(),
    observaciones: zod_1.z.string().optional(),
});
const actualizarClienteSchema = crearClienteSchema.partial();
const getClientes = async (req, res) => {
    try {
        const clientes = await (0, clientes_service_1.getClientesService)(req.user.userId, req.user.rol);
        res.json(clientes);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getClientes = getClientes;
const getClienteById = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const cliente = await (0, clientes_service_1.getClienteByIdService)(id);
        res.json(cliente);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
};
exports.getClienteById = getClienteById;
const crearCliente = async (req, res) => {
    try {
        const datos = crearClienteSchema.parse(req.body);
        const cliente = await (0, clientes_service_1.crearClienteService)(datos, req.user.userId);
        res.status(201).json(cliente);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.crearCliente = crearCliente;
const actualizarCliente = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const datos = actualizarClienteSchema.parse(req.body);
        const cliente = await (0, clientes_service_1.actualizarClienteService)(id, datos, req.user.userId, req.user.rol);
        res.json(cliente);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.actualizarCliente = actualizarCliente;
const desactivarCliente = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const resultado = await (0, clientes_service_1.desactivarClienteService)(id, req.user.userId, req.user.rol);
        res.json(resultado);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.desactivarCliente = desactivarCliente;
const getHistorialCliente = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const historial = await (0, clientes_service_1.getHistorialClienteService)(id);
        res.json(historial);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
};
exports.getHistorialCliente = getHistorialCliente;
const buscarClientes = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || query.length < 2) {
            return res
                .status(400)
                .json({ error: 'Ingresá al menos 2 caracteres para buscar' });
        }
        const clientes = await (0, clientes_service_1.buscarClientesService)(query);
        res.json(clientes);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.buscarClientes = buscarClientes;
