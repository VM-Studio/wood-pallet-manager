import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { getAlertas } from '../controllers/alertas.controller';

const router = Router();
router.use(authenticate);

router.get('/', getAlertas);

export default router;
