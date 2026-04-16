import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import {
  getListaPreciosService,
  calcularPrecioService,
  crearPrecioService,
  getHistorialPreciosService,
  actualizarPrecioProveedorService,
  getEscalonesProductoService,
} from '../services/precios.service';

const crearPrecioSchema = z.object({
  productoId: z.number(),
  precioUnitario: z.number().positive('El precio debe ser mayor a 0'),
  margenPct: z.number().optional(),
  cantMinima: z.number().int().min(1),
  cantMaxima: z.number().int().optional(),
  bonificaFlete: z.boolean().optional(),
  vigentHasta: z.string().optional(),
  observaciones: z.string().optional(),
});

export const getListaPrecios = async (req: AuthRequest, res: Response) => {
  try {
    const productoId = req.query.productoId
      ? parseInt(req.query.productoId as string)
      : undefined;
    const precios = await getListaPreciosService(productoId);
    res.json(precios);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const calcularPrecio = async (req: AuthRequest, res: Response) => {
  try {
    const productoId = parseId(req.params.productoId);
    const cantidad = parseInt(req.query.cantidad as string);
    if (!cantidad || cantidad < 1) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    }
    const resultado = await calcularPrecioService(productoId, cantidad);
    res.json(resultado);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const crearPrecio = async (req: AuthRequest, res: Response) => {
  try {
    const datos = crearPrecioSchema.parse(req.body);
    const precio = await crearPrecioService(
      { ...datos, vigentHasta: datos.vigentHasta ? new Date(datos.vigentHasta) : undefined },
      req.user!.userId
    );
    res.status(201).json(precio);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const getHistorialPrecios = async (req: AuthRequest, res: Response) => {
  try {
    const productoId = parseId(req.params.productoId);
    const historial = await getHistorialPreciosService(productoId);
    res.json(historial);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarPrecioProveedor = async (req: AuthRequest, res: Response) => {
  try {
    const { productoId, proveedorId, nuevoPrecioCosto } = req.body;
    if (!productoId || !proveedorId || !nuevoPrecioCosto) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    const resultado = await actualizarPrecioProveedorService(
      productoId,
      proveedorId,
      nuevoPrecioCosto,
      req.user!.userId
    );
    res.json(resultado);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getEscalonesProducto = async (req: AuthRequest, res: Response) => {
  try {
    const productoId = parseId(req.params.productoId);
    const escalones = await getEscalonesProductoService(productoId);
    res.json(escalones);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
