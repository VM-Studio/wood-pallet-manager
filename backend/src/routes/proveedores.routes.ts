import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getProveedores,
  getProveedorById,
  crearProveedor,
  actualizarProveedor,
  desactivarProveedor,
  vincularProducto,
} from '../controllers/proveedores.controller';

const router = Router();

router.use(authenticate);

router.get('/', getProveedores);
router.get('/:id', getProveedorById);
router.post('/', crearProveedor);
router.put('/:id', actualizarProveedor);
router.delete('/:id', desactivarProveedor);
router.post('/:id/productos', vincularProducto);

export default router;
