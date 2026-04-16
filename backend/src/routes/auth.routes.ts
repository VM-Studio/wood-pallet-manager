import { Router } from 'express';
import { login, crearUsuario, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/registro (solo para crear los dos usuarios iniciales)
router.post('/registro', crearUsuario);

// GET /api/auth/me (requiere token)
router.get('/me', authenticate, getMe);

export default router;
