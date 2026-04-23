import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getRemitos,
  getRemitoById,
  crearRemito,
  firmarPropietario,
  enviarRemito,
  actualizarNumeroRemito,
  cancelarRemito,
  getRemitoPublico,
  firmarClientePublico,
} from '../controllers/remitos.controller';

const router = Router();

// ── Rutas públicas (firma del cliente, sin JWT) ───────────
router.get('/publico/:token',        getRemitoPublico);
router.post('/publico/:token/firmar', firmarClientePublico);

// ── Rutas autenticadas ────────────────────────────────────
router.use(authenticate);
router.get('/',                       getRemitos);
router.get('/:id',                    getRemitoById);
router.post('/',                      crearRemito);
router.put('/:id/firmar-propietario', firmarPropietario);
router.post('/:id/enviar',            enviarRemito);
router.put('/:id/numero',             actualizarNumeroRemito);
router.put('/:id/cancelar',           cancelarRemito);

export default router;
