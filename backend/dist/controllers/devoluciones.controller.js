"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEstadisticasDevoluciones = exports.cancelarDevolucion = exports.confirmarDeposito = exports.crearDevolucion = exports.getDevolucionById = exports.getDevoluciones = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const devoluciones_service_1 = require("../services/devoluciones.service");
const detalleSchema = zod_1.z.object({
    detalleVentaId: zod_1.z.number().int().positive().optional(),
    productoId: zod_1.z.number().int().positive(),
    cantidadDevuelta: zod_1.z.number().int().positive(),
    precioUnitario: zod_1.z.number().positive(),
});
const crearSchema = zod_1.z.object({
    ventaId: zod_1.z.number().int().positive(),
    tipoCaso: zod_1.z.enum(['pallet_danado', 'cliente_no_quiere', 'devolucion_parcial', 'cancelacion_anticipada']),
    devuelveFlete: zod_1.z.boolean().default(false),
    devuelveSenasa: zod_1.z.boolean().default(false),
    compensaEnSiguientePedido: zod_1.z.boolean().default(false),
    metodoPago: zod_1.z.enum(['transferencia', 'e_check', 'efectivo']).optional(),
    cuentaDestino: zod_1.z.string().optional(),
    observaciones: zod_1.z.string().optional(),
    detalles: zod_1.z.array(detalleSchema).min(1, 'Debe haber al menos un producto a devolver'),
});
const getDevoluciones = async (req, res) => {
    try {
        const devoluciones = await (0, devoluciones_service_1.getDevolucionesService)(req.user.userId);
        res.json(devoluciones);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener devoluciones' });
    }
};
exports.getDevoluciones = getDevoluciones;
const getDevolucionById = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const devolucion = await (0, devoluciones_service_1.getDevolucionByIdService)(id);
        if (!devolucion)
            return res.status(404).json({ error: 'Devolución no encontrada' });
        res.json(devolucion);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener devolución' });
    }
};
exports.getDevolucionById = getDevolucionById;
const crearDevolucion = async (req, res) => {
    try {
        const datos = crearSchema.parse(req.body);
        const devolucion = await (0, devoluciones_service_1.crearDevolucionService)(datos, req.user.userId);
        res.status(201).json(devolucion);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Datos inválidos', detalles: error.issues });
        }
        console.error(error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Error al crear devolución' });
    }
};
exports.crearDevolucion = crearDevolucion;
const confirmarDeposito = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const devolucion = await (0, devoluciones_service_1.confirmarDepositoService)(id, req.user.userId);
        res.json(devolucion);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Error al confirmar depósito' });
    }
};
exports.confirmarDeposito = confirmarDeposito;
const cancelarDevolucion = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const devolucion = await (0, devoluciones_service_1.cancelarDevolucionService)(id);
        res.json(devolucion);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Error al cancelar devolución' });
    }
};
exports.cancelarDevolucion = cancelarDevolucion;
const getEstadisticasDevoluciones = async (req, res) => {
    try {
        const stats = await (0, devoluciones_service_1.getEstadisticasDevolucionesService)();
        res.json(stats);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};
exports.getEstadisticasDevoluciones = getEstadisticasDevoluciones;
