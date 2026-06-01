"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGananciasDetalle = exports.getEstacionalidad = exports.getReporteCobranzas = exports.getTopClientes = exports.getReporteVentas = exports.getDashboard = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const reportes_service_1 = require("../services/reportes.service");
const getDashboard = async (_req, res) => {
    const dashboard = await (0, reportes_service_1.getDashboardService)();
    res.json(dashboard);
};
exports.getDashboard = getDashboard;
const getReporteVentas = async (req, res) => {
    const { desde, hasta, usuarioId, vista } = req.query;
    if (!desde || !hasta) {
        res.status(400).json({ error: 'Los parámetros desde y hasta son requeridos' });
        return;
    }
    let resolvedUsuarioId;
    if (vista === 'mis_datos') {
        resolvedUsuarioId = req.user.userId;
    }
    else if (vista === 'carlos') {
        const carlos = await prisma_1.default.usuario.findFirst({ where: { rol: 'propietario_carlos' } });
        resolvedUsuarioId = carlos?.id;
    }
    else if (vista === 'juancruz') {
        const juancruz = await prisma_1.default.usuario.findFirst({ where: { rol: 'propietario_juancruz' } });
        resolvedUsuarioId = juancruz?.id;
    }
    else if (vista === 'todos') {
        resolvedUsuarioId = undefined;
    }
    else if (usuarioId) {
        resolvedUsuarioId = parseInt(usuarioId);
    }
    else {
        resolvedUsuarioId = req.user.userId;
    }
    const reporte = await (0, reportes_service_1.getReporteVentasService)(new Date(desde), new Date(hasta), resolvedUsuarioId);
    res.json(reporte);
};
exports.getReporteVentas = getReporteVentas;
const getTopClientes = async (req, res) => {
    const limite = req.query.limite ? parseInt(req.query.limite) : 10;
    const clientes = await (0, reportes_service_1.getTopClientesService)(limite);
    res.json(clientes);
};
exports.getTopClientes = getTopClientes;
const getReporteCobranzas = async (req, res) => {
    const { desde, hasta } = req.query;
    if (!desde || !hasta) {
        res.status(400).json({ error: 'Los parámetros desde y hasta son requeridos' });
        return;
    }
    const reporte = await (0, reportes_service_1.getReporteCobranzasService)(new Date(desde), new Date(hasta));
    res.json(reporte);
};
exports.getReporteCobranzas = getReporteCobranzas;
const getEstacionalidad = async (req, res) => {
    try {
        const vista = req.query.vista;
        let usuarioId;
        if (vista === 'mis_datos') {
            usuarioId = req.user.userId;
        }
        else if (vista === 'carlos') {
            const carlos = await prisma_1.default.usuario.findFirst({ where: { rol: 'propietario_carlos' } });
            usuarioId = carlos?.id;
        }
        else if (vista === 'juancruz') {
            const juancruz = await prisma_1.default.usuario.findFirst({ where: { rol: 'propietario_juancruz' } });
            usuarioId = juancruz?.id;
        }
        // vista === 'todos' o sin vista → usuarioId queda undefined (todos)
        const datos = await (0, reportes_service_1.getVentasUltimos12MesesService)(usuarioId);
        res.json(datos);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getEstacionalidad = getEstacionalidad;
const getGananciasDetalle = async (req, res) => {
    const { vista } = req.query;
    let usuarioId;
    if (vista === 'mis_datos') {
        usuarioId = req.user.userId;
    }
    else if (vista === 'carlos') {
        const carlos = await prisma_1.default.usuario.findFirst({ where: { rol: 'propietario_carlos' } });
        usuarioId = carlos?.id;
    }
    else if (vista === 'juancruz') {
        const juancruz = await prisma_1.default.usuario.findFirst({ where: { rol: 'propietario_juancruz' } });
        usuarioId = juancruz?.id;
    }
    // vista === 'todos' o sin vista → usuarioId queda undefined (todos)
    const detalle = await (0, reportes_service_1.getGananciasDetalleService)(usuarioId);
    res.json(detalle);
};
exports.getGananciasDetalle = getGananciasDetalle;
