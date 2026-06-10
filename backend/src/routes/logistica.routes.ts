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
  avanzarLogistica,
  getLogisticasAceptadas,
  getRutasHoy,
  addressSearch,
  geocodeSingle,
} from '../controllers/logistica.controller';

const router = Router();

router.use(authenticate);

// Address search (Nominatim proxy) — para el autocomplete del front
router.get('/address-search', addressSearch);
router.get('/geocode', geocodeSingle);

router.get('/entregas-hoy', getEntregasHoy);
router.get('/rutas-hoy', getRutasHoy);
router.get('/por-rol', getLogisticasPorRol);
router.get('/aceptadas', getLogisticasAceptadas);
router.get('/', getLogisticas);
router.get('/venta/:ventaId', getLogisticaByVenta);
router.post('/', crearLogistica);
router.put('/venta/:ventaId/estado', actualizarEstadoEntrega);
router.put('/venta/:ventaId/confirmar-cliente', confirmarEntregaCliente);
router.put('/venta/:ventaId/consultar', consultarLogistica);
router.put('/venta/:ventaId/responder-consulta', responderConsultaLogistica);
router.put('/venta/:ventaId/confirmar-carlos', confirmarLogisticaCarlos);
router.put('/venta/:ventaId/avanzar', avanzarLogistica);

export default router;
