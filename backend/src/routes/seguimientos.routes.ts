import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  previsualizarSegmento,
  getClientesSegmento,
  enviarCampana,
  getHistorialCampanas,
  getDetalleCampana,
  getPlantillas,
  crearPlantilla,
  actualizarPlantilla,
  eliminarPlantilla,
  getReglas,
  crearRegla,
  toggleRegla,
  eliminarRegla,
  getSeguimientosCliente,
} from '../controllers/seguimientos.controller';

const router = Router();

router.use(authenticate);

// Segmentación
router.post('/segmento/preview', previsualizarSegmento);
router.post('/segmento/clientes', getClientesSegmento);

// Campañas
router.post('/campanas', enviarCampana);
router.get('/campanas', getHistorialCampanas);
router.get('/campanas/:id', getDetalleCampana);

// Plantillas
router.get('/plantillas', getPlantillas);
router.post('/plantillas', crearPlantilla);
router.put('/plantillas/:id', actualizarPlantilla);
router.delete('/plantillas/:id', eliminarPlantilla);

// Automatizaciones
router.get('/reglas', getReglas);
router.post('/reglas', crearRegla);
router.put('/reglas/:id/toggle', toggleRegla);
router.delete('/reglas/:id', eliminarRegla);

// Historial de cliente
router.get('/cliente/:clienteId', getSeguimientosCliente);

export default router;
