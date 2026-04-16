import { Router } from 'express';
import {
  getProductos,
  getProductoById,
  crearProducto,
  actualizarProducto,
  desactivarProducto,
} from '../controllers/productos.controller';
import {
  getListaPrecios,
  calcularPrecio,
  crearPrecio,
  getHistorialPrecios,
  actualizarPrecioProveedor,
  getEscalonesProducto,
} from '../controllers/precios.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Rutas estáticas primero (antes de /:id para que no se confundan)
router.get('/precios/lista', getListaPrecios);
router.post('/precios', crearPrecio);
router.put('/precios/proveedor', actualizarPrecioProveedor);

// Productos CRUD
router.get('/', getProductos);
router.post('/', crearProducto);
router.get('/:id', getProductoById);
router.put('/:id', actualizarProducto);
router.delete('/:id', desactivarProducto);

// Sub-recursos de producto
router.get('/:productoId/precio', calcularPrecio);
router.get('/:productoId/escalones', getEscalonesProducto);
router.get('/:productoId/historial-precios', getHistorialPrecios);

export default router;
