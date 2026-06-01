"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const remitos_controller_1 = require("../controllers/remitos.controller");
const router = (0, express_1.Router)();
// ── Rutas públicas (firma del cliente, sin JWT) ───────────
router.get('/publico/:token', remitos_controller_1.getRemitoPublico);
router.post('/publico/:token/firmar', remitos_controller_1.firmarClientePublico);
// ── Rutas autenticadas ────────────────────────────────────
router.use(auth_middleware_1.authenticate);
router.get('/', remitos_controller_1.getRemitos);
router.get('/:id', remitos_controller_1.getRemitoById);
router.post('/', remitos_controller_1.crearRemito);
router.put('/:id/firmar-propietario', remitos_controller_1.firmarPropietario);
router.post('/:id/enviar', remitos_controller_1.enviarRemito);
router.put('/:id/numero', remitos_controller_1.actualizarNumeroRemito);
router.put('/:id/cancelar', remitos_controller_1.cancelarRemito);
exports.default = router;
