"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firmarClientePublico = exports.getRemitoPublico = exports.cancelarRemito = exports.actualizarNumeroRemito = exports.enviarRemito = exports.firmarPropietario = exports.crearRemito = exports.getRemitoById = exports.getRemitos = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const remitos_service_1 = require("../services/remitos.service");
const crearRemitoSchema = zod_1.z.object({
    ventaId: zod_1.z.number().int().positive(),
    firmaPropietario: zod_1.z.string().optional(),
    fechaEntrega: zod_1.z.string().optional().transform(v => v ? new Date(v) : undefined),
    observaciones: zod_1.z.string().optional(),
});
const firmarPropietarioSchema = zod_1.z.object({
    firma: zod_1.z.string().min(10, 'Firma inválida'),
});
const firmarClienteSchema = zod_1.z.object({
    firmaCliente: zod_1.z.string().min(10, 'Firma inválida'),
    nombreFirmante: zod_1.z.string().optional(),
});
const numeroRemitoSchema = zod_1.z.object({
    numeroRemito: zod_1.z.string().min(1, 'El número de remito es requerido'),
});
// ── Rutas autenticadas ────────────────────────────────────
const getRemitos = async (req, res) => {
    try {
        const remitos = await (0, remitos_service_1.getRemitosService)(req.user.userId, req.user.rol);
        res.json(remitos);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getRemitos = getRemitos;
const getRemitoById = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const remito = await (0, remitos_service_1.getRemitoByIdService)(id);
        res.json(remito);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
};
exports.getRemitoById = getRemitoById;
const crearRemito = async (req, res) => {
    try {
        const datos = crearRemitoSchema.parse(req.body);
        const remito = await (0, remitos_service_1.crearRemitoService)(datos, req.user.userId);
        res.status(201).json(remito);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.crearRemito = crearRemito;
const firmarPropietario = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const { firma } = firmarPropietarioSchema.parse(req.body);
        const remito = await (0, remitos_service_1.firmarPropietarioService)(id, firma);
        res.json(remito);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.firmarPropietario = firmarPropietario;
const enviarRemito = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const remito = await (0, remitos_service_1.enviarRemitoService)(id);
        res.json(remito);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.enviarRemito = enviarRemito;
const actualizarNumeroRemito = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const { numeroRemito } = numeroRemitoSchema.parse(req.body);
        const remito = await (0, remitos_service_1.actualizarNumeroRemitoService)(id, numeroRemito);
        res.json(remito);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.actualizarNumeroRemito = actualizarNumeroRemito;
const cancelarRemito = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const remito = await (0, remitos_service_1.cancelarRemitoService)(id);
        res.json(remito);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.cancelarRemito = cancelarRemito;
// ── Ruta pública (sin auth) para que el cliente firme ────
const getRemitoPublico = async (req, res) => {
    try {
        const token = String(req.params.token);
        const remito = await (0, remitos_service_1.getRemitoByTokenService)(token);
        // No devolver firmas del propietario para seguridad del canvas
        res.json(remito);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
};
exports.getRemitoPublico = getRemitoPublico;
const firmarClientePublico = async (req, res) => {
    try {
        const token = String(req.params.token);
        const { firmaCliente, nombreFirmante } = firmarClienteSchema.parse(req.body);
        const remito = await (0, remitos_service_1.firmarClienteService)(token, firmaCliente, nombreFirmante);
        res.json({ ok: true, mensaje: 'Remito firmado correctamente. Se envió una copia a tu email.', remitoId: remito.id });
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.firmarClientePublico = firmarClientePublico;
