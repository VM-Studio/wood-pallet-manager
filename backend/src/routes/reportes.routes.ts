import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getDashboard,
  getReporteVentas,
  getTopClientes,
  getReporteCobranzas,
  getEstacionalidad,
  getGananciasDetalle,
  getReportePdf,
  getMesesConDatos,
} from '../controllers/reportes.controller';

const router = Router();
router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/ventas', getReporteVentas);
router.get('/cobranzas', getReporteCobranzas);
router.get('/top-clientes', getTopClientes);
router.get('/estacionalidad', getEstacionalidad);
router.get('/ganancias-detalle', getGananciasDetalle);
router.get('/meses-con-datos', getMesesConDatos);
router.get('/pdf', getReportePdf);

export default router;
