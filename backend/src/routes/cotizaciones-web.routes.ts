import { Router } from 'express';
import {
  recibirCotizacionWeb,
  getCotizacionesWeb,
  getCotizacionWebById,
  getContadorCotizacionesWeb,
  cambiarEstadoCotizacionWeb,
  convertirCotizacionWeb,
} from '../controllers/cotizaciones-web.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { apiKeyMiddleware } from '../middlewares/apiKey.middleware';

const router = Router();

// ── Endpoint PÚBLICO (solo API key, sin JWT) ──────────────────────────────────
router.post('/nueva', apiKeyMiddleware, recibirCotizacionWeb);

// ── Endpoints PROTEGIDOS (JWT) ────────────────────────────────────────────────
router.use(authenticate);

router.get('/contador', getContadorCotizacionesWeb);
router.get('/', getCotizacionesWeb);
router.get('/:id', getCotizacionWebById);
router.patch('/:id/estado', cambiarEstadoCotizacionWeb);
router.post('/:id/convertir', convertirCotizacionWeb);

export default router;
