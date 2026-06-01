"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.iniciarTareasProgramadas = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const alertas_service_1 = require("../services/alertas.service");
const seguimientos_service_1 = require("../services/seguimientos.service");
const iniciarTareasProgramadas = () => {
    // Todos los días a las 8:00 AM
    node_cron_1.default.schedule('0 8 * * *', async () => {
        console.log('[CRON] Verificando facturas vencidas...');
        try {
            const count = await (0, alertas_service_1.marcarFacturasVencidasService)();
            console.log(`[CRON] ${count} facturas marcadas como vencidas`);
        }
        catch (error) {
            console.error('[CRON] Error al verificar facturas:', error);
        }
    });
    // Todos los días a las 8:05 AM
    node_cron_1.default.schedule('5 8 * * *', async () => {
        console.log('[CRON] Verificando cotizaciones vencidas...');
        try {
            const count = await (0, alertas_service_1.marcarCotizacionesVencidasService)();
            console.log(`[CRON] ${count} cotizaciones marcadas como vencidas`);
        }
        catch (error) {
            console.error('[CRON] Error al verificar cotizaciones:', error);
        }
    });
    // Todos los días a las 8:10 AM — automatizaciones de seguimientos
    node_cron_1.default.schedule('10 8 * * *', async () => {
        console.log('[CRON] Ejecutando reglas automáticas de seguimientos...');
        try {
            const count = await (0, seguimientos_service_1.ejecutarReglasAutomaticasService)();
            console.log(`[CRON] ${count} campañas automáticas enviadas`);
        }
        catch (error) {
            console.error('[CRON] Error al ejecutar reglas automáticas:', error);
        }
    });
    console.log('[CRON] Tareas programadas iniciadas correctamente');
};
exports.iniciarTareasProgramadas = iniciarTareasProgramadas;
