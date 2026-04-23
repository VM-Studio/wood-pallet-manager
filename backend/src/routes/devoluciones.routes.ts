import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getDevoluciones,
  getDevolucionById,
  crearDevolucion,
  confirmarDeposito,
  cancelarDevolucion,
  getEstadisticasDevoluciones,
} from '../controllers/devoluciones.controller';

const router = Router();
router.use(authenticate);

router.get('/', getDevoluciones);
router.get('/estadisticas', getEstadisticasDevoluciones);
router.get('/:id', getDevolucionById);
router.post('/', crearDevolucion);
router.put('/:id/confirmar-deposito', confirmarDeposito);
router.put('/:id/cancelar', cancelarDevolucion);

export default router;
