import { Router } from 'express';
import {
  login, crearUsuario, getMe, register, actualizarPerfil, cambiarPassword,
  getMeCompleto, solicitarCodigo, cambiarPasswordConCodigo,
  cambiarEmail, cambiarTelefono, actualizarFoto, actualizarFirma,
  recuperarPassword, resetPassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Públicas
router.post('/login', login);
router.post('/register', register);
router.post('/registro', crearUsuario);
router.post('/recuperar-password', recuperarPassword);
router.post('/reset-password', resetPassword);

// Requieren autenticación
router.get('/me', authenticate, getMe);
router.get('/me/completo', authenticate, getMeCompleto);
router.put('/perfil', authenticate, actualizarPerfil);
router.put('/password', authenticate, cambiarPassword);

// Mi Cuenta — verificación por código
router.post('/solicitar-codigo', authenticate, solicitarCodigo);
router.put('/password-con-codigo', authenticate, cambiarPasswordConCodigo);
router.put('/email', authenticate, cambiarEmail);
router.put('/telefono', authenticate, cambiarTelefono);
router.put('/foto', authenticate, actualizarFoto);
router.put('/firma', authenticate, actualizarFirma);

export default router;
