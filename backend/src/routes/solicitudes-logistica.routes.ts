import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  crearSolicitud,
  getSolicitudes,
  responderSolicitud,
} from '../controllers/solicitudes-logistica.controller';

const router = Router();

router.use(authenticate);

router.get('/', getSolicitudes);
router.post('/', crearSolicitud);
router.put('/:id/responder', responderSolicitud);

export default router;
