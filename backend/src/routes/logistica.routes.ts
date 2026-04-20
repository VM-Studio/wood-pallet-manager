import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getLogisticas,
  getLogisticaByVenta,
  crearLogistica,
  actualizarEstadoEntrega,
  confirmarEntregaCliente,
  getEntregasHoy,
  getLogisticasPorRol,
  consultarLogistica,
  responderConsultaLogistica,
  confirmarLogisticaCarlos,
} from '../controllers/logistica.controller';

const router = Router();

router.use(authenticate);

router.get('/entregas-hoy', getEntregasHoy);
router.get('/por-rol', getLogisticasPorRol);
router.get('/', getLogisticas);
router.get('/venta/:ventaId', getLogisticaByVenta);
router.post('/', crearLogistica);
router.put('/venta/:ventaId/estado', actualizarEstadoEntrega);
router.put('/venta/:ventaId/confirmar-cliente', confirmarEntregaCliente);
router.put('/venta/:ventaId/consultar', consultarLogistica);
router.put('/venta/:ventaId/responder-consulta', responderConsultaLogistica);
router.put('/venta/:ventaId/confirmar-carlos', confirmarLogisticaCarlos);

export default router;
