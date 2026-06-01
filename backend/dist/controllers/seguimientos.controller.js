"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSeguimientosCliente = exports.eliminarRegla = exports.toggleRegla = exports.crearRegla = exports.getReglas = exports.eliminarPlantilla = exports.actualizarPlantilla = exports.crearPlantilla = exports.getPlantillas = exports.getDetalleCampana = exports.getHistorialCampanas = exports.enviarCampana = exports.getClientesSegmento = exports.previsualizarSegmento = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const seguimientos_service_1 = require("../services/seguimientos.service");
// ─── SEGMENTO ─────────────────────────────────────────────────────────────────
const previsualizarSegmento = async (req, res) => {
    try {
        const { segmento, diasCondicion, clienteIds } = req.body;
        const resultado = await (0, seguimientos_service_1.previsualizarSegmentoService)(segmento, diasCondicion, clienteIds);
        res.json(resultado);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.previsualizarSegmento = previsualizarSegmento;
const getClientesSegmento = async (req, res) => {
    try {
        const { segmento, diasCondicion, clienteIds } = req.body;
        const clientes = await (0, seguimientos_service_1.getClientesPorSegmento)(segmento, diasCondicion, clienteIds);
        res.json(clientes);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.getClientesSegmento = getClientesSegmento;
// ─── CAMPAÑAS ─────────────────────────────────────────────────────────────────
const campanaSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(1),
    asunto: zod_1.z.string().min(1),
    segmento: zod_1.z.enum(['activos', 'cotizacion_sin_respuesta', 'cotizacion_rechazada', 'sin_actividad', 'todos', 'manual']),
    diasCondicion: zod_1.z.number().int().positive().optional(),
    clienteIdsManual: zod_1.z.array(zod_1.z.number()).optional(),
    bloques: zod_1.z.array(zod_1.z.any()),
    plantillaId: zod_1.z.number().int().positive().optional(),
});
const enviarCampana = async (req, res) => {
    try {
        const parsed = campanaSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.flatten() });
            return;
        }
        const resultado = await (0, seguimientos_service_1.enviarCampanaService)(parsed.data, req.user.userId);
        res.status(201).json(resultado);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.enviarCampana = enviarCampana;
const getHistorialCampanas = async (_req, res) => {
    const data = await (0, seguimientos_service_1.getHistorialCampanasService)();
    res.json(data);
};
exports.getHistorialCampanas = getHistorialCampanas;
const getDetalleCampana = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const data = await (0, seguimientos_service_1.getDetalleCampanaService)(id);
        if (!data) {
            res.status(404).json({ error: 'Campaña no encontrada' });
            return;
        }
        res.json(data);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.getDetalleCampana = getDetalleCampana;
// ─── PLANTILLAS ───────────────────────────────────────────────────────────────
const plantillaSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(1),
    asunto: zod_1.z.string().min(1),
    bloques: zod_1.z.array(zod_1.z.any()),
});
const getPlantillas = async (_req, res) => {
    const data = await (0, seguimientos_service_1.getPlantillasService)();
    res.json(data);
};
exports.getPlantillas = getPlantillas;
const crearPlantilla = async (req, res) => {
    try {
        const parsed = plantillaSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.flatten() });
            return;
        }
        const data = await (0, seguimientos_service_1.crearPlantillaService)(parsed.data, req.user.userId);
        res.status(201).json(data);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.crearPlantilla = crearPlantilla;
const actualizarPlantilla = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const data = await (0, seguimientos_service_1.actualizarPlantillaService)(id, req.body);
        res.json(data);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.actualizarPlantilla = actualizarPlantilla;
const eliminarPlantilla = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        await (0, seguimientos_service_1.eliminarPlantillaService)(id);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.eliminarPlantilla = eliminarPlantilla;
// ─── AUTOMATIZACIONES ────────────────────────────────────────────────────────
const reglaSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(1),
    evento: zod_1.z.enum(['cotizacion_sin_respuesta', 'sin_actividad']),
    diasCondicion: zod_1.z.number().int().positive(),
    plantillaId: zod_1.z.number().int().positive(),
    asunto: zod_1.z.string().min(1),
});
const getReglas = async (_req, res) => {
    const data = await (0, seguimientos_service_1.getReglasService)();
    res.json(data);
};
exports.getReglas = getReglas;
const crearRegla = async (req, res) => {
    try {
        const parsed = reglaSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.flatten() });
            return;
        }
        const data = await (0, seguimientos_service_1.crearReglaService)(parsed.data, req.user.userId);
        res.status(201).json(data);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.crearRegla = crearRegla;
const toggleRegla = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const data = await (0, seguimientos_service_1.toggleReglaService)(id);
        res.json(data);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.toggleRegla = toggleRegla;
const eliminarRegla = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        await (0, seguimientos_service_1.eliminarReglaService)(id);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.eliminarRegla = eliminarRegla;
// ─── SEGUIMIENTOS POR CLIENTE ─────────────────────────────────────────────────
const getSeguimientosCliente = async (req, res) => {
    try {
        const clienteId = (0, types_1.parseId)(req.params.clienteId);
        const data = await (0, seguimientos_service_1.getSeguimientosDeClienteService)(clienteId);
        res.json(data);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.getSeguimientosCliente = getSeguimientosCliente;
