import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getAlertas,
  getAlertasResueltas,
  marcarAlertaResuelta,
  reabrirAlerta,
} from '../controllers/alertas.controller';

const router = Router();
router.use(authenticate);

router.get('/', getAlertas);
router.get('/resueltas', getAlertasResueltas);
router.post('/resolver', marcarAlertaResuelta);
router.delete('/resueltas/:id', reabrirAlerta);

export default router;
