"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Públicas
router.post('/login', auth_controller_1.login);
router.post('/register', auth_controller_1.register);
router.post('/registro', auth_controller_1.crearUsuario);
router.post('/recuperar-password', auth_controller_1.recuperarPassword);
router.post('/reset-password', auth_controller_1.resetPassword);
// Requieren autenticación
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.getMe);
router.get('/me/completo', auth_middleware_1.authenticate, auth_controller_1.getMeCompleto);
router.put('/perfil', auth_middleware_1.authenticate, auth_controller_1.actualizarPerfil);
router.put('/password', auth_middleware_1.authenticate, auth_controller_1.cambiarPassword);
// Mi Cuenta — verificación por código
router.post('/solicitar-codigo', auth_middleware_1.authenticate, auth_controller_1.solicitarCodigo);
router.put('/password-con-codigo', auth_middleware_1.authenticate, auth_controller_1.cambiarPasswordConCodigo);
router.put('/email', auth_middleware_1.authenticate, auth_controller_1.cambiarEmail);
router.put('/telefono', auth_middleware_1.authenticate, auth_controller_1.cambiarTelefono);
router.put('/foto', auth_middleware_1.authenticate, auth_controller_1.actualizarFoto);
router.put('/firma', auth_middleware_1.authenticate, auth_controller_1.actualizarFirma);
exports.default = router;
