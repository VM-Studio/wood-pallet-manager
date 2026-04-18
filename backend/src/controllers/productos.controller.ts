import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import {
  getProductosService,
  getProductosOtroService,
  getProductoByIdService,
  crearProductoService,
  actualizarProductoService,
  desactivarProductoService,
} from '../services/productos.service';

const crearProductoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipo: z.enum(['estandar', 'reforzado', 'liviano', 'exportacion', 'carton', 'a_medida']),
  condicion: z.enum(['nuevo', 'seminuevo', 'usado']),
  dimensionLargo: z.number().optional(),
  dimensionAncho: z.number().optional(),
  cargaMaximaKg: z.number().optional(),
  requiereSenasa: z.boolean().optional(),
  descripcion: z.string().optional(),
});

export const getProductos = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.user!.userId;
    const productos = await getProductosService(usuarioId);
    res.json(productos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProductosOtro = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.user!.userId;
    const productos = await getProductosOtroService(usuarioId);
    res.json(productos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProductoById = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const producto = await getProductoByIdService(id);
    res.json(producto);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const crearProducto = async (req: AuthRequest, res: Response) => {
  try {
    const datos = crearProductoSchema.parse(req.body);
    const propietarioId = req.user!.userId;
    const producto = await crearProductoService({ ...datos, propietarioId });
    res.status(201).json(producto);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const actualizarProducto = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const propietarioId = req.user!.userId;
    const datos = crearProductoSchema.partial().parse(req.body);
    const producto = await actualizarProductoService(id, propietarioId, datos);
    res.json(producto);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const desactivarProducto = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const propietarioId = req.user!.userId;
    const resultado = await desactivarProductoService(id, propietarioId);
    res.json(resultado);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
