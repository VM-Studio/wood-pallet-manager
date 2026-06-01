"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const seguimientos_controller_1 = require("../controllers/seguimientos.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Segmentación
router.post('/segmento/preview', seguimientos_controller_1.previsualizarSegmento);
router.post('/segmento/clientes', seguimientos_controller_1.getClientesSegmento);
// Campañas
router.post('/campanas', seguimientos_controller_1.enviarCampana);
router.get('/campanas', seguimientos_controller_1.getHistorialCampanas);
router.get('/campanas/:id', seguimientos_controller_1.getDetalleCampana);
// Plantillas
router.get('/plantillas', seguimientos_controller_1.getPlantillas);
router.post('/plantillas', seguimientos_controller_1.crearPlantilla);
router.put('/plantillas/:id', seguimientos_controller_1.actualizarPlantilla);
router.delete('/plantillas/:id', seguimientos_controller_1.eliminarPlantilla);
// Automatizaciones
router.get('/reglas', seguimientos_controller_1.getReglas);
router.post('/reglas', seguimientos_controller_1.crearRegla);
router.put('/reglas/:id/toggle', seguimientos_controller_1.toggleRegla);
router.delete('/reglas/:id', seguimientos_controller_1.eliminarRegla);
// Historial de cliente
router.get('/cliente/:clienteId', seguimientos_controller_1.getSeguimientosCliente);
exports.default = router;
