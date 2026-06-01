"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogisticasAceptadas = exports.avanzarLogistica = exports.confirmarLogisticaCarlos = exports.responderConsultaLogistica = exports.consultarLogistica = exports.getLogisticasPorRol = exports.getEntregasHoy = exports.confirmarEntregaCliente = exports.actualizarEstadoEntrega = exports.crearLogistica = exports.getLogisticaByVenta = exports.getLogisticas = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const logistica_service_1 = require("../services/logistica.service");
const getLogisticas = async (_req, res) => {
    const data = await (0, logistica_service_1.getLogisticasService)();
    res.json(data);
};
exports.getLogisticas = getLogisticas;
const getLogisticaByVenta = async (req, res) => {
    const ventaId = (0, types_1.parseId)(req.params.ventaId);
    const data = await (0, logistica_service_1.getLogisticaByVentaService)(ventaId);
    res.json(data);
};
exports.getLogisticaByVenta = getLogisticaByVenta;
const crearLogistica = async (req, res) => {
    const schema = zod_1.z.object({
        ventaId: zod_1.z.number().int().positive(),
        nombreTransportista: zod_1.z.string().optional(),
        telefonoTransp: zod_1.z.string().optional(),
        fechaRetiroGalpon: zod_1.z.string().optional().transform(v => v ? new Date(v) : undefined),
        horaRetiro: zod_1.z.string().optional().transform(v => v ? new Date(v) : undefined),
        horaEstimadaEntrega: zod_1.z.string().optional().transform(v => v ? new Date(v) : undefined),
        costoFlete: zod_1.z.number().optional(),
        observaciones: zod_1.z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const data = await (0, logistica_service_1.crearLogisticaService)(parsed.data, req.user.userId, req.user.rol);
    res.status(201).json(data);
};
exports.crearLogistica = crearLogistica;
const actualizarEstadoEntrega = async (req, res) => {
    const ventaId = (0, types_1.parseId)(req.params.ventaId);
    const schema = zod_1.z.object({ estado: zod_1.z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const data = await (0, logistica_service_1.actualizarEstadoEntregaService)(ventaId, parsed.data.estado, req.user.rol);
    res.json(data);
};
exports.actualizarEstadoEntrega = actualizarEstadoEntrega;
const confirmarEntregaCliente = async (req, res) => {
    const ventaId = (0, types_1.parseId)(req.params.ventaId);
    const data = await (0, logistica_service_1.confirmarEntregaClienteService)(ventaId);
    res.json(data);
};
exports.confirmarEntregaCliente = confirmarEntregaCliente;
const getEntregasHoy = async (_req, res) => {
    const data = await (0, logistica_service_1.getEntregasDelDiaService)();
    res.json(data);
};
exports.getEntregasHoy = getEntregasHoy;
const getLogisticasPorRol = async (req, res) => {
    try {
        const vista = req.query.vista;
        const data = await (0, logistica_service_1.getLogisticasPorRolService)(req.user.userId, req.user.rol, vista);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getLogisticasPorRol = getLogisticasPorRol;
const consultarLogistica = async (req, res) => {
    try {
        const ventaId = (0, types_1.parseId)(req.params.ventaId);
        const data = await (0, logistica_service_1.consultarLogisticaService)(ventaId, req.user.userId);
        res.json(data);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.consultarLogistica = consultarLogistica;
const responderConsultaLogistica = async (req, res) => {
    try {
        const ventaId = (0, types_1.parseId)(req.params.ventaId);
        const { respuesta, ...datos } = req.body;
        if (!['aceptada', 'rechazada'].includes(respuesta)) {
            res.status(400).json({ error: 'Respuesta debe ser "aceptada" o "rechazada"' });
            return;
        }
        const data = await (0, logistica_service_1.responderConsultaLogisticaService)(ventaId, respuesta, req.user.userId, req.user.rol, datos);
        res.json(data);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.responderConsultaLogistica = responderConsultaLogistica;
const confirmarLogisticaCarlos = async (req, res) => {
    try {
        const ventaId = (0, types_1.parseId)(req.params.ventaId);
        const data = await (0, logistica_service_1.confirmarLogisticaCarlosService)(ventaId, req.user.rol, req.body);
        res.json(data);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.confirmarLogisticaCarlos = confirmarLogisticaCarlos;
const avanzarLogistica = async (req, res) => {
    try {
        const ventaId = (0, types_1.parseId)(req.params.ventaId);
        const { accion } = req.body;
        if (!['consultando', 'aceptada', 'entregada'].includes(accion)) {
            res.status(400).json({ error: 'Acción debe ser "consultando", "aceptada" o "entregada"' });
            return;
        }
        const data = await (0, logistica_service_1.avanzarLogisticaService)(ventaId, accion, req.user.rol);
        res.json(data);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.avanzarLogistica = avanzarLogistica;
const getLogisticasAceptadas = async (_req, res) => {
    const data = await (0, logistica_service_1.getLogisticasAceptadasService)();
    res.json(data);
};
exports.getLogisticasAceptadas = getLogisticasAceptadas;
