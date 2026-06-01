"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ventas_controller_1 = require("../controllers/ventas.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Rutas estáticas primero
router.get('/activas', ventas_controller_1.getVentasActivas);
router.get('/por-periodo', ventas_controller_1.getVentasPorPeriodo);
router.get('/', ventas_controller_1.getVentas);
router.get('/:id', ventas_controller_1.getVentaById);
router.get('/:id/retiros', ventas_controller_1.getResumenRetiro);
router.put('/:id/estado', ventas_controller_1.actualizarEstadoVenta);
router.post('/:id/retiro', ventas_controller_1.registrarRetiro);
router.delete('/:id', ventas_controller_1.eliminarVenta);
exports.default = router;
