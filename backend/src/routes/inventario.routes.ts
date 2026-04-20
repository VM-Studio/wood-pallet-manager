import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getStock,
  getAlertas,
  getMovimientos,
  ajustarStock,
  getConsolidado,
  setStockProducto,
} from '../controllers/inventario.controller';

const router = Router();

router.use(authenticate);

router.get('/alertas', getAlertas);
router.get('/consolidado', getConsolidado);
router.get('/movimientos', getMovimientos);
router.get('/', getStock);
router.post('/ajuste', ajustarStock);
router.patch('/producto/:productoId', setStockProducto);

export default router;
