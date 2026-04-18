import { Router } from 'express';
import {
  getCotizaciones,
  getCotizacionById,
  crearCotizacion,
  actualizarEstado,
  registrarSeguimiento,
  convertirAVenta,
  getTextoWhatsApp,
  getCotizacionesPendientes,
  enviarEmailCotizacion,
} from '../controllers/cotizaciones.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Estáticas antes de dinámicas
router.get('/pendientes-seguimiento', getCotizacionesPendientes);

router.get('/', getCotizaciones);
router.post('/', crearCotizacion);

router.get('/:id', getCotizacionById);
router.get('/:id/whatsapp', getTextoWhatsApp);
router.put('/:id/estado', actualizarEstado);
router.post('/:id/seguimiento', registrarSeguimiento);
router.post('/:id/convertir', convertirAVenta);
router.post('/:id/enviar-email', enviarEmailCotizacion);

export default router;
