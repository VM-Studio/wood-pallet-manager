import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import {
  getRetirosService,
  getRetiroByIdService,
  getStatsRetirosService,
  cambiarEstadoRetiroService,
  reenviarCodigoService,
  registrarRetiroParcialService,
  registrarEnvioGalponService,
} from '../services/retiros.service';

export const getRetiros = async (_req: Request, res: Response) => {
  const data = await getRetirosService();
  res.json(data);
};

export const getRetiroById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const data = await getRetiroByIdService(id);
  res.json(data);
};

export const getStatsRetiros = async (_req: Request, res: Response) => {
  const data = await getStatsRetirosService();
  res.json(data);
};

export const cambiarEstadoRetiro = async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  const schema = z.object({
    estado: z.enum(['pendiente', 'confirmado', 'parcial', 'completado', 'cancelado']),
    observaciones: z.string().optional(),
    motivoCancelacion: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const data = await cambiarEstadoRetiroService(
      id,
      parsed.data.estado,
      req.user!.userId,
      { observaciones: parsed.data.observaciones, motivoCancelacion: parsed.data.motivoCancelacion }
    );
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const reenviarCodigo = async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  const schema = z.object({
    email: z.string().email().optional(),
    telefono: z.string().optional(),
  }).refine(d => d.email || d.telefono, {
    message: 'Debés ingresar al menos un email o teléfono',
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = await reenviarCodigoService(
    id,
    req.user!.userId,
    parsed.data.email,
    parsed.data.telefono
  );
  res.json(data);
};

export const registrarRetiroParcial = async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  const schema = z.object({
    items: z.array(z.object({
      detalleVentaId: z.number().int(),
      cantidad: z.number().int().min(0),
    })).min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const data = await registrarRetiroParcialService(id, parsed.data.items, req.user!.userId);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};


export const enviarAGalpon = async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  const schema = z.object({
    proveedorId: z.number().int(),
    tipoMensaje: z.enum(['codigo', 'retiro_parcial', 'cancelacion']),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const data = await registrarEnvioGalponService(id, parsed.data.proveedorId, parsed.data.tipoMensaje, req.user!.userId);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
