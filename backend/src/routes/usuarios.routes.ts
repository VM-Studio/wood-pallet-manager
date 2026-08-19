import { Router } from 'express';
import { authenticate, requireRol } from '../middlewares/auth.middleware';
import {
  listarUsuarios,
  aprobarUsuario,
  rechazarUsuario,
  actualizarAccesoUsuario,
  cambiarEstadoActivo,
  listarUsuariosParaVista,
} from '../controllers/usuarios.controller';

const router = Router();

// Endpoint abierto a cualquier usuario autenticado (no exclusivo de Carlos):
// alimenta el selector de vista del dashboard con usuarios habilitados.
router.get('/para-vista', authenticate, listarUsuariosParaVista);

// El resto de este módulo es exclusivo del perfil de Carlos
router.use(authenticate, requireRol(['propietario_carlos']));

router.get('/', listarUsuarios);
router.put('/:id/aprobar', aprobarUsuario);
router.put('/:id/rechazar', rechazarUsuario);
router.put('/:id/acceso', actualizarAccesoUsuario);
router.put('/:id/estado', cambiarEstadoActivo);

export default router;
