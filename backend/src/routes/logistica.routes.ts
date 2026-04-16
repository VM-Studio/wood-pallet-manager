import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getLogisticas,
  getLogisticaByVenta,
  crearLogistica,
  actualizarEstadoEntrega,
  confirmarEntregaCliente,
  getEntregasHoy,
} from '../controllers/logistica.controller';

const router = Router();

router.use(authenticate);

router.get('/entregas-hoy', getEntregasHoy);
router.get('/', getLogisticas);
router.get('/venta/:ventaId', getLogisticaByVenta);
router.post('/', crearLogistica);
router.put('/venta/:ventaId/estado', actualizarEstadoEntrega);
router.put('/venta/:ventaId/confirmar-cliente', confirmarEntregaCliente);

export default router;
