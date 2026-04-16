import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getDashboard,
  getReporteVentas,
  getTopClientes,
  getReporteCobranzas,
  getEstacionalidad,
} from '../controllers/reportes.controller';

const router = Router();
router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/ventas', getReporteVentas);
router.get('/cobranzas', getReporteCobranzas);
router.get('/top-clientes', getTopClientes);
router.get('/estacionalidad', getEstacionalidad);

export default router;
