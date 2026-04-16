import cron from 'node-cron';
import {
  marcarFacturasVencidasService,
  marcarCotizacionesVencidasService,
} from '../services/alertas.service';

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

  // Todos los días a las 8:05 AM
  cron.schedule('5 8 * * *', async () => {
    console.log('[CRON] Verificando cotizaciones vencidas...');
    try {
      const count = await marcarCotizacionesVencidasService();
      console.log(`[CRON] ${count} cotizaciones marcadas como vencidas`);
    } catch (error) {
      console.error('[CRON] Error al verificar cotizaciones:', error);
    }
  });

  console.log('[CRON] Tareas programadas iniciadas correctamente');
};
