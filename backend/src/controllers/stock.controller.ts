import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import {
  getStockService,
  getStockBajoMinimoService,
  ajustarStockService,
  getMovimientosStockService,
} from '../services/stock.service';

const ajustarStockSchema = z.object({
  productoId: z.number().int().positive(),
  proveedorId: z.number().int().positive(),
  tipoMovimiento: z.enum(['entrada', 'salida', 'ajuste']),
  cantidad: z.number().int().positive(),
  motivo: z.enum(['venta', 'compra', 'devolucion', 'ajuste_manual']),
  idReferencia: z.number().int().positive().optional(),
});

export const getStock = async (req: AuthRequest, res: Response) => {
  try {
    const { productoId, proveedorId } = req.query as any;
    const propietarioId = req.user!.userId;
    const stock = await getStockService({
      productoId: productoId ? parseInt(productoId) : undefined,
      proveedorId: proveedorId ? parseInt(proveedorId) : undefined,
      propietarioId,
    });
    res.json(stock);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const ajustarStock = async (req: AuthRequest, res: Response) => {
  try {
    const datos = ajustarStockSchema.parse(req.body);
    const resultado = await ajustarStockService({
      ...datos,
      registradoPorId: req.user!.userId,
    });
    res.status(201).json(resultado);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const getMovimientos = async (req: AuthRequest, res: Response) => {
  try {
    const stockId = parseId(req.params.stockId);
    const movimientos = await getMovimientosStockService(stockId);
    res.json(movimientos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getStockBajoMinimo = async (req: AuthRequest, res: Response) => {
  try {
    const stock = await getStockBajoMinimoService();
    res.json(stock);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
