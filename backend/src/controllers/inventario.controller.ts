import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import {
  getStockService,
  getAlertasStockService,
  getMovimientosStockService,
  ajustarStockService,
  getStockConsolidadoService,
} from '../services/inventario.service';

export const getStock = async (_req: AuthRequest, res: Response) => {
  const stock = await getStockService();
  res.json(stock);
};

export const getAlertas = async (req: AuthRequest, res: Response) => {
  const propietarioId = req.user!.userId;
  const alertas = await getAlertasStockService(propietarioId);
  res.json(alertas);
};

export const getMovimientos = async (req: AuthRequest, res: Response) => {
  const productoId  = req.query.productoId  ? Number(req.query.productoId)  : undefined;
  const proveedorId = req.query.proveedorId ? Number(req.query.proveedorId) : undefined;
  const propietarioId = req.user!.userId;
  const movimientos = await getMovimientosStockService(productoId, proveedorId, propietarioId);
  res.json(movimientos);
};

export const ajustarStock = async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    stockId: z.number().int().positive(),
    nuevaCantidad: z.number().int().min(0),
    motivo: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const result = await ajustarStockService(
    parsed.data.stockId,
    parsed.data.nuevaCantidad,
    parsed.data.motivo,
    req.user!.userId
  );
  res.json(result);
};

export const getConsolidado = async (req: AuthRequest, res: Response) => {
  const propietarioId = req.user!.userId;
  const consolidado = await getStockConsolidadoService(propietarioId);
  res.json(consolidado);
};
