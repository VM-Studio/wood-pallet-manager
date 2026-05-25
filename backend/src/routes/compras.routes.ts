import { Router } from 'express';
import {
  getCompras,
  crearCompra,
  registrarPagoCompra,
  cancelarCompra,
  getDeudaProveedores,
  getCompraById,
  actualizarEstadoCompra,
  getVentasParaCompraDirecta,
} from '../controllers/compras.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', getCompras);
router.get('/deuda-proveedores', getDeudaProveedores);
router.get('/ventas-para-compra-directa', getVentasParaCompraDirecta);
router.get('/:id', getCompraById);
router.post('/', crearCompra);
router.put('/:id/estado', actualizarEstadoCompra);
router.put('/:id/pagar', registrarPagoCompra);
router.put('/:id/cancelar', cancelarCompra);

export default router;
