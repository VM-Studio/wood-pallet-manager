import { Router } from 'express';
import {
  getClientes,
  getClienteById,
  crearCliente,
  actualizarCliente,
  desactivarCliente,
  getHistorialCliente,
  buscarClientes,
} from '../controllers/clientes.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getClientes);
router.get('/buscar', buscarClientes);
router.get('/:id', getClienteById);
router.get('/:id/historial', getHistorialCliente);
router.post('/', crearCliente);
router.put('/:id', actualizarCliente);
router.delete('/:id', desactivarCliente);

export default router;
