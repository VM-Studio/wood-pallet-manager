import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { getStock, ajustarStock, getMovimientos, getStockBajoMinimo } from '../controllers/stock.controller';

const router = Router();

router.use(authenticate);

router.get('/', getStock);
router.get('/bajo-minimo', getStockBajoMinimo);
router.post('/movimientos', ajustarStock);
router.get('/:stockId/movimientos', getMovimientos);

export default router;
