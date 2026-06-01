"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlertas = void 0;
const alertas_service_1 = require("../services/alertas.service");
const getAlertas = async (req, res) => {
    const resultado = await (0, alertas_service_1.getAlertasActivasService)();
    if (req.user.rol !== 'admin') {
        resultado.alertas = resultado.alertas.filter((a) => a.propietario === req.user.rol || a.propietario === 'ambos');
        resultado.total = resultado.alertas.length;
        resultado.alta = resultado.alertas.filter((a) => a.urgencia === 'alta').length;
        resultado.media = resultado.alertas.filter((a) => a.urgencia === 'media').length;
        resultado.baja = resultado.alertas.filter((a) => a.urgencia === 'baja').length;
    }
    res.json(resultado);
};
exports.getAlertas = getAlertas;
