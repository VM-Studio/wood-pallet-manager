"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearSolicitud = crearSolicitud;
exports.getSolicitudes = getSolicitudes;
exports.responderSolicitud = responderSolicitud;
const solicitudes_logistica_service_1 = require("../services/solicitudes-logistica.service");
async function crearSolicitud(req, res) {
    try {
        const usuario = req.user;
        const solicitud = await (0, solicitudes_logistica_service_1.crearSolicitudService)(usuario.userId, req.body);
        res.status(201).json(solicitud);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}
async function getSolicitudes(req, res) {
    try {
        const usuario = req.user;
        const solicitudes = await (0, solicitudes_logistica_service_1.getSolicitudesService)(usuario.userId, usuario.rol);
        res.json(solicitudes);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}
async function responderSolicitud(req, res) {
    try {
        const usuario = req.user;
        const id = parseInt(String(req.params.id));
        const { estado, notasRespuesta } = req.body;
        if (!['aceptada', 'rechazada'].includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido. Debe ser aceptada o rechazada' });
        }
        const solicitud = await (0, solicitudes_logistica_service_1.responderSolicitudService)(id, usuario.userId, estado, notasRespuesta);
        res.json(solicitud);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}
