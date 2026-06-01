"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reenviarCodigo = exports.cambiarEstadoRetiro = exports.getStatsRetiros = exports.getRetiroById = exports.getRetiros = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const retiros_service_1 = require("../services/retiros.service");
const getRetiros = async (_req, res) => {
    const data = await (0, retiros_service_1.getRetirosService)();
    res.json(data);
};
exports.getRetiros = getRetiros;
const getRetiroById = async (req, res) => {
    const id = (0, types_1.parseId)(req.params.id);
    const data = await (0, retiros_service_1.getRetiroByIdService)(id);
    res.json(data);
};
exports.getRetiroById = getRetiroById;
const getStatsRetiros = async (_req, res) => {
    const data = await (0, retiros_service_1.getStatsRetirosService)();
    res.json(data);
};
exports.getStatsRetiros = getStatsRetiros;
const cambiarEstadoRetiro = async (req, res) => {
    const id = (0, types_1.parseId)(req.params.id);
    const schema = zod_1.z.object({
        estado: zod_1.z.enum(['pendiente', 'confirmado', 'completado', 'cancelado']),
        observaciones: zod_1.z.string().optional(),
        motivoCancelacion: zod_1.z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const data = await (0, retiros_service_1.cambiarEstadoRetiroService)(id, parsed.data.estado, req.user.userId, { observaciones: parsed.data.observaciones, motivoCancelacion: parsed.data.motivoCancelacion });
    res.json(data);
};
exports.cambiarEstadoRetiro = cambiarEstadoRetiro;
const reenviarCodigo = async (req, res) => {
    const id = (0, types_1.parseId)(req.params.id);
    const schema = zod_1.z.object({
        email: zod_1.z.string().email().optional(),
        telefono: zod_1.z.string().optional(),
    }).refine(d => d.email || d.telefono, {
        message: 'Debés ingresar al menos un email o teléfono',
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const data = await (0, retiros_service_1.reenviarCodigoService)(id, req.user.userId, parsed.data.email, parsed.data.telefono);
    res.json(data);
};
exports.reenviarCodigo = reenviarCodigo;
