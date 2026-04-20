import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getFacturas,
  getFacturaById,
  crearFactura,
  registrarCobro,
  getFacturasVencidas,
  crearNotaCredito,
  getCobrosPendientes,
  actualizarNroFactura,
  cargarNroArca,
} from '../controllers/facturacion.controller';

const router = Router();
router.use(authenticate);

router.get('/vencidas', getFacturasVencidas);
router.get('/cobros-pendientes', getCobrosPendientes);
router.get('/', getFacturas);
router.get('/:id', getFacturaById);
router.post('/', crearFactura);
router.post('/:id/cobro', registrarCobro);
router.post('/nota-credito', crearNotaCredito);
router.patch('/:id/nro-factura', actualizarNroFactura);
router.put('/:id/nro-arca', cargarNroArca);

export default router;
