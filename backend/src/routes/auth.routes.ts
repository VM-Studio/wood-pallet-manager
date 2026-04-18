import { Router } from 'express';
import { login, crearUsuario, getMe, register, actualizarPerfil, cambiarPassword } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/register — registro público (cualquier usuario nuevo)
router.post('/register', register);

// POST /api/auth/registro (solo para crear los dos usuarios iniciales con rol específico)
router.post('/registro', crearUsuario);

// GET /api/auth/me (requiere token)
router.get('/me', authenticate, getMe);

// PUT /api/auth/perfil
router.put('/perfil', authenticate, actualizarPerfil);

// PUT /api/auth/password
router.put('/password', authenticate, cambiarPassword);

export default router;
