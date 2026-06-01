"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarClienteDesdeProspecto = exports.crearCotizacionRapida = exports.eliminarCotizacion = exports.enviarEmailCotizacion = exports.getCotizacionesPendientes = exports.getTextoWhatsApp = exports.convertirAVenta = exports.registrarSeguimiento = exports.actualizarEstado = exports.crearCotizacion = exports.getCotizacionById = exports.getCotizaciones = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const cotizaciones_service_1 = require("../services/cotizaciones.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
const mailer_1 = require("../utils/mailer");
const detalleSchema = zod_1.z.object({
    productoId: zod_1.z.number().min(0), // 0 = a medida (el backend lo resuelve)
    cantidad: zod_1.z.number().int().min(1, 'La cantidad debe ser al menos 1'),
    precioUnitario: zod_1.z.number().optional(),
    esAMedida: zod_1.z.boolean().optional(),
    especificacion: zod_1.z
        .object({
        largoMm: zod_1.z.number().optional(),
        anchoMm: zod_1.z.number().optional(),
        altoMm: zod_1.z.number().optional(),
        cargaMaximaKg: zod_1.z.number().optional(),
        tipoMadera: zod_1.z.string().optional(),
        observacionesCliente: zod_1.z.string().optional(),
        medidas: zod_1.z.array(zod_1.z.any()).optional(),
    })
        .optional(),
});
const crearCotizacionSchema = zod_1.z.object({
    clienteId: zod_1.z.number(),
    incluyeFlete: zod_1.z.boolean().default(false),
    costoFlete: zod_1.z.number().optional(),
    fleteIncluido: zod_1.z.boolean().optional(),
    requiereSenasa: zod_1.z.boolean().default(false),
    costoSenasa: zod_1.z.number().optional(),
    canalEnvio: zod_1.z.enum(['whatsapp', 'email']).optional(),
    observaciones: zod_1.z.string().optional(),
    detalles: zod_1.z.array(detalleSchema).min(1, 'Debe haber al menos un producto'),
});
const seguimientoSchema = zod_1.z.object({
    tipoContacto: zod_1.z.enum(['whatsapp', 'llamada', 'email', 'presencial']),
    resultado: zod_1.z.enum(['sin_respuesta', 'interesado', 'no_interesado', 'cerrado', 'reprogramado']),
    observaciones: zod_1.z.string().optional(),
    proximoContacto: zod_1.z.string().optional(),
});
const convertirSchema = zod_1.z.object({
    tipoEntrega: zod_1.z.enum(['retira_cliente', 'envio_woodpallet']),
    metodoPago: zod_1.z.enum(['transferencia', 'e_check', 'efectivo']),
    cuentaDestino: zod_1.z.string().optional(),
    modalidadPago: zod_1.z.enum(['adelantado', 'contra_entrega', 'por_partes']),
    fechaRetiro: zod_1.z.string().optional().transform(v => v ? new Date(v) : undefined),
    lugarEntrega: zod_1.z.string().optional(),
    fechaEntrega: zod_1.z.string().optional().transform(v => v ? new Date(v) : undefined),
    horaEntrega: zod_1.z.string().optional(), // "HH:MM"
    horaEstimadaRetiro: zod_1.z.string().optional(), // "HH:MM" — para retiro en galpón
    galponRetiro: zod_1.z.string().optional(),
    observaciones: zod_1.z.string().optional(),
    usaStockPropio: zod_1.z.boolean().optional().default(false),
    emitirRemito: zod_1.z.boolean().optional().default(false),
    firmaPropietario: zod_1.z.string().optional(),
});
const getCotizaciones = async (req, res) => {
    try {
        const cotizaciones = await (0, cotizaciones_service_1.getCotizacionesService)(req.user.userId, req.user.rol);
        res.json(cotizaciones);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getCotizaciones = getCotizaciones;
const getCotizacionById = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const cotizacion = await (0, cotizaciones_service_1.getCotizacionByIdService)(id);
        res.json(cotizacion);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
};
exports.getCotizacionById = getCotizacionById;
const crearCotizacion = async (req, res) => {
    try {
        const datos = crearCotizacionSchema.parse(req.body);
        const cotizacion = await (0, cotizaciones_service_1.crearCotizacionService)(datos, req.user.userId);
        res.status(201).json(cotizacion);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.crearCotizacion = crearCotizacion;
const actualizarEstado = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const { estado } = req.body;
        const cotizacion = await (0, cotizaciones_service_1.actualizarEstadoCotizacionService)(id, estado, req.user.userId);
        res.json(cotizacion);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.actualizarEstado = actualizarEstado;
const registrarSeguimiento = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const datos = seguimientoSchema.parse(req.body);
        const seguimiento = await (0, cotizaciones_service_1.registrarSeguimientoService)(id, {
            ...datos,
            proximoContacto: datos.proximoContacto ? new Date(datos.proximoContacto) : undefined,
        }, req.user.userId);
        res.status(201).json(seguimiento);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.registrarSeguimiento = registrarSeguimiento;
const convertirAVenta = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const datos = convertirSchema.parse(req.body);
        const venta = await (0, cotizaciones_service_1.convertirCotizacionAVentaService)(id, datos, req.user.userId);
        res.status(201).json(venta);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.convertirAVenta = convertirAVenta;
const getTextoWhatsApp = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const resultado = await (0, cotizaciones_service_1.generarTextoWhatsAppService)(id);
        res.json(resultado);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
};
exports.getTextoWhatsApp = getTextoWhatsApp;
const getCotizacionesPendientes = async (req, res) => {
    try {
        const pendientes = await (0, cotizaciones_service_1.getCotizacionesPendientesService)();
        res.json(pendientes);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getCotizacionesPendientes = getCotizacionesPendientes;
const enviarEmailCotizacion = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const { pdfBase64, filename, razonSocial, emailDestino, fecha } = req.body;
        if (!pdfBase64 || !emailDestino) {
            return res.status(400).json({ error: 'Faltan datos para enviar el email' });
        }
        await (0, mailer_1.enviarPresupuestoPorEmail)({
            destinatario: emailDestino,
            razonSocial: razonSocial ?? '',
            numeroCotizacion: id,
            fecha: fecha ?? new Date().toLocaleDateString('es-AR'),
            pdfBase64,
            filename: filename ?? `presupuesto-${id}.pdf`,
        });
        res.json({ ok: true, message: 'Email enviado correctamente' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error al enviar el email' });
    }
};
exports.enviarEmailCotizacion = enviarEmailCotizacion;
const eliminarCotizacion = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        // 1. Desvincular venta que referencia a esta cotización (FK opcional)
        await prisma_1.default.venta.updateMany({
            where: { cotizacionId: id },
            data: { cotizacionId: null },
        });
        // 2. Borrar EspecificacionMedida (FK a DetalleCotizacion)
        const detalles = await prisma_1.default.detalleCotizacion.findMany({ where: { cotizacionId: id }, select: { id: true } });
        const detalleIds = detalles.map(d => d.id);
        if (detalleIds.length) {
            await prisma_1.default.especificacionMedida.deleteMany({ where: { detalleCotizacionId: { in: detalleIds } } });
        }
        // 3. Borrar detalles
        await prisma_1.default.detalleCotizacion.deleteMany({ where: { cotizacionId: id } });
        // 4. Borrar seguimientos
        await prisma_1.default.seguimientoCotizacion.deleteMany({ where: { cotizacionId: id } });
        // 5. Borrar la cotización
        await prisma_1.default.cotizacion.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (err) {
        console.error('Error al eliminar cotización:', err);
        res.status(500).json({ error: 'No se pudo eliminar la cotización' });
    }
};
exports.eliminarCotizacion = eliminarCotizacion;
const crearCotizacionRapida = async (req, res) => {
    try {
        const schema = zod_1.z.object({
            nombreProspecto: zod_1.z.string().min(1, 'El nombre es requerido'),
            telefonoProspecto: zod_1.z.string().optional(),
            emailProspecto: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
            incluyeFlete: zod_1.z.boolean().default(false),
            costoFlete: zod_1.z.number().optional(),
            fleteIncluido: zod_1.z.boolean().optional(),
            requiereSenasa: zod_1.z.boolean().default(false),
            costoSenasa: zod_1.z.number().optional(),
            canalEnvio: zod_1.z.enum(['whatsapp', 'email']).optional(),
            observaciones: zod_1.z.string().optional(),
            detalles: zod_1.z.array(detalleSchema).min(1, 'Debe haber al menos un producto'),
        });
        const datos = schema.parse(req.body);
        const cotizacion = await (0, cotizaciones_service_1.crearCotizacionRapidaService)(datos, req.user.userId);
        res.status(201).json(cotizacion);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.crearCotizacionRapida = crearCotizacionRapida;
const registrarClienteDesdeProspecto = async (req, res) => {
    try {
        const id = (0, types_1.parseId)(req.params.id);
        const schema = zod_1.z.object({
            razonSocial: zod_1.z.string().min(1, 'La razón social es requerida'),
            cuit: zod_1.z.string().optional(),
            nombreContacto: zod_1.z.string().optional(),
            telefonoContacto: zod_1.z.string().optional(),
            emailContacto: zod_1.z.string().optional(),
            canalEntrada: zod_1.z.enum(['whatsapp', 'formulario_web', 'llamada', 'recomendacion', 'otro']).optional(),
            direccionEntrega: zod_1.z.string().optional(),
            localidad: zod_1.z.string().optional(),
            observaciones: zod_1.z.string().optional(),
        });
        const datos = schema.parse(req.body);
        const cliente = await (0, cotizaciones_service_1.registrarClienteDesdeProspectoService)(id, datos, req.user.userId);
        res.status(201).json(cliente);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.registrarClienteDesdeProspecto = registrarClienteDesdeProspecto;
