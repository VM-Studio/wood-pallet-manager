import cron from 'node-cron';
import {
  marcarFacturasVencidasService,
  marcarCotizacionesAnuladasService,
} from '../services/alertas.service';
import { ejecutarReglasAutomaticasService } from '../services/seguimientos.service';

export const iniciarTareasProgramadas = () => {
  // Todos los días a las 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Verificando facturas vencidas...');
    try {
      const count = await marcarFacturasVencidasService();
      console.log(`[CRON] ${count} facturas marcadas como vencidas`);
    } catch (error) {
      console.error('[CRON] Error al verificar facturas:', error);
    }
  });

  // Cada 15 minutos — las cotizaciones tienen validez de 72hs, se anulan
  // automáticamente si no fueron aceptadas ni rechazadas en ese plazo.
  cron.schedule('*/15 * * * *', async () => {
    console.log('[CRON] Verificando cotizaciones vencidas (72hs)...');
    try {
      const count = await marcarCotizacionesAnuladasService();
      console.log(`[CRON] ${count} cotizaciones anuladas automáticamente`);
    } catch (error) {
      console.error('[CRON] Error al verificar cotizaciones:', error);
    }
  });


  // Todos los días a las 8:10 AM — automatizaciones de seguimientos
  cron.schedule('10 8 * * *', async () => {
    console.log('[CRON] Ejecutando reglas automáticas de seguimientos...');
    try {
      const count = await ejecutarReglasAutomaticasService();
      console.log(`[CRON] ${count} campañas automáticas enviadas`);
    } catch (error) {
      console.error('[CRON] Error al ejecutar reglas automáticas:', error);
    }
  });

  console.log('[CRON] Tareas programadas iniciadas correctamente');
};
