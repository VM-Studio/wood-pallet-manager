import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getRetiros,
  getRetiroById,
  getStatsRetiros,
  cambiarEstadoRetiro,
  reenviarCodigo,
} from '../controllers/retiros.controller';

const router = Router();
router.use(authenticate);

router.get('/',         getRetiros);
router.get('/stats',    getStatsRetiros);
router.get('/:id',      getRetiroById);
router.put('/:id/estado',   cambiarEstadoRetiro);
router.post('/:id/reenviar-codigo', reenviarCodigo);

export default router;
