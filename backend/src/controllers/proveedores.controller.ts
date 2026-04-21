import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import {
  getProveedoresService,
  getProveedorByIdService,
  crearProveedorService,
  actualizarProveedorService,
  desactivarProveedorService,
  vincularProductoProveedorService,
} from '../services/proveedores.service';

const crearProveedorSchema = z.object({
  nombreEmpresa: z.string().min(1, 'El nombre de la empresa es requerido'),
  nombreContacto: z.string().optional().default(''),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  tipoProducto: z.enum(['seminuevo', 'nuevo_medida', 'ambos']),
  contactoExclusivoId: z.number().int().positive().optional(),
  distanciaKm: z.number().int().nonnegative().optional(),
  observaciones: z.string().optional(),
});

const actualizarProveedorSchema = crearProveedorSchema.partial();

const vincularProductoSchema = z.object({
  productoId: z.number().int().positive(),
  precioCosto: z.number().positive('El precio de costo debe ser mayor a 0'),
  observaciones: z.string().optional(),
});

export const getProveedores = async (req: AuthRequest, res: Response) => {
  try {
    const proveedores = await getProveedoresService();
    res.json(proveedores);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProveedorById = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const proveedor = await getProveedorByIdService(id);
    res.json(proveedor);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const crearProveedor = async (req: AuthRequest, res: Response) => {
  try {
    const datos = crearProveedorSchema.parse(req.body);
    const proveedor = await crearProveedorService(datos);
    res.status(201).json(proveedor);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const actualizarProveedor = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const datos = actualizarProveedorSchema.parse(req.body);
    const proveedor = await actualizarProveedorService(id, datos);
    res.json(proveedor);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const desactivarProveedor = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    await desactivarProveedorService(id);
    res.json({ message: 'Proveedor desactivado correctamente' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const vincularProducto = async (req: AuthRequest, res: Response) => {
  try {
    const proveedorId = parseId(req.params.id);
    const datos = vincularProductoSchema.parse(req.body);
    const vinculo = await vincularProductoProveedorService({ proveedorId, ...datos });
    res.status(201).json(vinculo);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};
