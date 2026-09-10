import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getRetiros,
  getRetiroById,
  getStatsRetiros,
  cambiarEstadoRetiro,
  reenviarCodigo,
  registrarRetiroParcial,
} from '../controllers/retiros.controller';

const router = Router();
router.use(authenticate);

router.get('/',         getRetiros);
router.get('/stats',    getStatsRetiros);
router.get('/:id',      getRetiroById);
router.put('/:id/estado',   cambiarEstadoRetiro);
router.post('/:id/reenviar-codigo', reenviarCodigo);
router.post('/:id/retiro-parcial', registrarRetiroParcial);

export default router;
