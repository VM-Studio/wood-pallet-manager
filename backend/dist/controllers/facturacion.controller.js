"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargarNroArca = exports.actualizarNroFactura = exports.getCobrosPendientes = exports.crearNotaCredito = exports.getFacturasVencidas = exports.registrarCobro = exports.crearFactura = exports.getFacturaById = exports.getFacturas = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const facturacion_service_1 = require("../services/facturacion.service");
const crearFacturaSchema = zod_1.z.object({
    ventaId: zod_1.z.number().int().positive(),
    nroFactura: zod_1.z.string().optional(),
    esSinFactura: zod_1.z.boolean().optional(),
    fechaVencimiento: zod_1.z.string().optional(),
    totalNeto: zod_1.z.number().positive(),
    iva: zod_1.z.number().min(0),
    totalConIva: zod_1.z.number().positive(),
    observaciones: zod_1.z.string().optional(),
});
const cobroSchema = zod_1.z.object({
    monto: zod_1.z.number().positive(),
    medioPago: zod_1.z.enum(['transferencia', 'e_check', 'efectivo']),
    nroComprobante: zod_1.z.string().optional(),
    esAdelanto: zod_1.z.boolean().optional(),
    observaciones: zod_1.z.string().optional(),
});
const notaCreditoSchema = zod_1.z.object({
    facturaId: zod_1.z.number().int().positive(),
    nroNota: zod_1.z.string().optional(),
    monto: zod_1.z.number().positive(),
    motivo: zod_1.z.string().min(1, 'El motivo es requerido'),
});
const getFacturas = async (req, res) => {
    const facturas = await (0, facturacion_service_1.getFacturasService)(req.user.userId, req.user.rol);
    res.json(facturas);
};
exports.getFacturas = getFacturas;
const getFacturaById = async (req, res) => {
    const id = (0, types_1.parseId)(req.params.id);
    const factura = await (0, facturacion_service_1.getFacturaByIdService)(id);
    res.json(factura);
};
exports.getFacturaById = getFacturaById;
const crearFactura = async (req, res) => {
    const parsed = crearFacturaSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const factura = await (0, facturacion_service_1.crearFacturaService)({
        ...parsed.data,
        fechaVencimiento: parsed.data.fechaVencimiento
            ? new Date(parsed.data.fechaVencimiento)
            : undefined,
    }, req.user.userId);
    res.status(201).json(factura);
};
exports.crearFactura = crearFactura;
const registrarCobro = async (req, res) => {
    const id = (0, types_1.parseId)(req.params.id);
    const parsed = cobroSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const resultado = await (0, facturacion_service_1.registrarCobroService)(id, parsed.data, req.user.userId);
    res.status(201).json(resultado);
};
exports.registrarCobro = registrarCobro;
const getFacturasVencidas = async (_req, res) => {
    const facturas = await (0, facturacion_service_1.getFacturasVencidasService)();
    res.json(facturas);
};
exports.getFacturasVencidas = getFacturasVencidas;
const crearNotaCredito = async (req, res) => {
    const parsed = notaCreditoSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const nota = await (0, facturacion_service_1.crearNotaCreditoService)(parsed.data, req.user.userId);
    res.status(201).json(nota);
};
exports.crearNotaCredito = crearNotaCredito;
const getCobrosPendientes = async (req, res) => {
    const cobros = await (0, facturacion_service_1.getCobrosPendientesService)(req.user.userId, req.user.rol);
    res.json(cobros);
};
exports.getCobrosPendientes = getCobrosPendientes;
const actualizarNroFactura = async (req, res) => {
    const id = (0, types_1.parseId)(req.params.id);
    const { nroFactura } = req.body;
    if (!nroFactura || typeof nroFactura !== 'string') {
        res.status(400).json({ error: 'nroFactura es requerido' });
        return;
    }
    const factura = await Promise.resolve().then(() => __importStar(require('../utils/prisma'))).then(m => m.default.factura.update({
        where: { id },
        data: { nroFactura: nroFactura.trim() },
    }));
    res.json(factura);
};
exports.actualizarNroFactura = actualizarNroFactura;
const cargarNroArca = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const { nroFacturaArca } = req.body;
        if (!nroFacturaArca?.trim()) {
            res.status(400).json({ error: 'El número de factura ARCA es requerido' });
            return;
        }
        const factura = await (0, facturacion_service_1.cargarNroFacturaArcaService)(id, nroFacturaArca.trim());
        res.json(factura);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.cargarNroArca = cargarNroArca;
