import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  getComprasService,
  crearCompraService,
  registrarPagoCompraService,
  cancelarCompraService,
  getDeudaProveedoresService,
  getCompraByIdService,
  actualizarEstadoCompraService
} from '../services/compras.service';

const detalleSchema = z.object({
  productoId: z.number(),
  cantidad: z.number().int().min(1),
  precioCostoUnit: z.number().positive()
});

const crearCompraSchema = z.object({
  proveedorId: z.number(),
  tipoCompra: z.enum(['reventa_inmediata', 'stock_propio']),
  nroRemito: z.string().optional(),
  observaciones: z.string().optional(),
  detalles: z.array(detalleSchema).min(1, 'Debe haber al menos un producto')
});

const pagoSchema = z.object({
  metodoPago: z.enum(['transferencia', 'e_check', 'efectivo']),
  cuentaDestino: z.string().optional(),
  nroComprobante: z.string().optional(),
  observaciones: z.string().optional()
});

export const getCompras = async (req: AuthRequest, res: Response) => {
  try {
    const compras = await getComprasService(req.user!.userId, req.user!.rol);
    res.json(compras);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const crearCompra = async (req: AuthRequest, res: Response) => {
  try {
    const datos = crearCompraSchema.parse(req.body);
    const compra = await crearCompraService(datos, req.user!.userId, req.user!.rol);
    res.status(201).json(compra);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const registrarPagoCompra = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params['id'] as string);
    const datos = pagoSchema.parse(req.body);
    const compra = await registrarPagoCompraService(id, datos, req.user!.userId);
    res.json(compra);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const cancelarCompra = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params['id'] as string);
    const resultado = await cancelarCompraService(id, req.user!.userId);
    res.json(resultado);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getDeudaProveedores = async (req: AuthRequest, res: Response) => {
  try {
    const deuda = await getDeudaProveedoresService();
    res.json(deuda);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCompraById = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params['id'] as string);
    const compra = await getCompraByIdService(id);
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    res.json(compra);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarEstadoCompra = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params['id'] as string);
    const { estado } = req.body;
    const compra = await actualizarEstadoCompraService(id, estado);
    res.json(compra);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
