"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productos_controller_1 = require("../controllers/productos.controller");
const precios_controller_1 = require("../controllers/precios.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Rutas estáticas primero (antes de /:id para que no se confundan)
router.get('/precios/lista', precios_controller_1.getListaPrecios);
router.post('/precios', precios_controller_1.crearPrecio);
router.put('/precios/proveedor', precios_controller_1.actualizarPrecioProveedor);
// Productos CRUD
router.get('/', productos_controller_1.getProductos);
router.get('/otro', productos_controller_1.getProductosOtro);
router.post('/', productos_controller_1.crearProducto);
router.get('/:id', productos_controller_1.getProductoById);
router.put('/:id', productos_controller_1.actualizarProducto);
router.delete('/:id', productos_controller_1.desactivarProducto);
// Sub-recursos de producto
router.get('/:productoId/precio', precios_controller_1.calcularPrecio);
router.get('/:productoId/escalones', precios_controller_1.getEscalonesProducto);
router.get('/:productoId/historial-precios', precios_controller_1.getHistorialPrecios);
exports.default = router;
