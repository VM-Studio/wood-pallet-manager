import { Router } from 'express';
import {
  getVentas,
  getVentaById,
  actualizarEstadoVenta,
  registrarRetiro,
  getResumenRetiro,
  getVentasActivas,
  getVentasPorPeriodo,
  eliminarVenta,
} from '../controllers/ventas.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Rutas estáticas primero
router.get('/activas', getVentasActivas);
router.get('/por-periodo', getVentasPorPeriodo);

router.get('/', getVentas);

router.get('/:id', getVentaById);
router.get('/:id/retiros', getResumenRetiro);
router.put('/:id/estado', actualizarEstadoVenta);
router.post('/:id/retiro', registrarRetiro);
router.delete('/:id', eliminarVenta);

export default router;
