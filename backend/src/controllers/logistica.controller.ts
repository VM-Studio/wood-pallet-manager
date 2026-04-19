import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import {
  getLogisticasService,
  getLogisticaByVentaService,
  crearLogisticaService,
  actualizarEstadoEntregaService,
  confirmarEntregaClienteService,
  getEntregasDelDiaService,
} from '../services/logistica.service';

export const getLogisticas = async (_req: Request, res: Response) => {
  const data = await getLogisticasService();
  res.json(data);
};

export const getLogisticaByVenta = async (req: Request, res: Response) => {
  const ventaId = parseId(req.params.ventaId);
  const data = await getLogisticaByVentaService(ventaId);
  res.json(data);
};

export const crearLogistica = async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    ventaId: z.number().int().positive(),
    nombreTransportista: z.string().optional(),
    telefonoTransp: z.string().optional(),
    fechaRetiroGalpon: z.string().optional().transform(v => v ? new Date(v) : undefined),
    horaRetiro: z.string().optional().transform(v => v ? new Date(v) : undefined),
    horaEstimadaEntrega: z.string().optional().transform(v => v ? new Date(v) : undefined),
    costoFlete: z.number().optional(),
    observaciones: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = await crearLogisticaService(parsed.data, req.user!.userId, req.user!.rol);
  res.status(201).json(data);
};

export const actualizarEstadoEntrega = async (req: AuthRequest, res: Response) => {
  const ventaId = parseId(req.params.ventaId);
  const schema = z.object({ estado: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = await actualizarEstadoEntregaService(ventaId, parsed.data.estado, req.user!.rol);
  res.json(data);
};

export const confirmarEntregaCliente = async (req: Request, res: Response) => {
  const ventaId = parseId(req.params.ventaId);
  const data = await confirmarEntregaClienteService(ventaId);
  res.json(data);
};

export const getEntregasHoy = async (_req: Request, res: Response) => {
  const data = await getEntregasDelDiaService();
  res.json(data);
};
