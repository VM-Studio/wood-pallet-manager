import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getCompras,
  getCompraById,
  crearCompra,
  actualizarEstadoCompra,
  registrarPago,
  getDeudaProveedores,
} from '../controllers/compras.controller';

const router = Router();

router.use(authenticate);

router.get('/deuda-proveedores', getDeudaProveedores);
router.get('/', getCompras);
router.get('/:id', getCompraById);
router.post('/', crearCompra);
router.put('/:id/estado', actualizarEstadoCompra);
router.post('/:id/pago', registrarPago);

export default router;
