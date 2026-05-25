import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import {
  previsualizarSegmentoService,
  enviarCampanaService,
  getHistorialCampanasService,
  getDetalleCampanaService,
  getPlantillasService,
  crearPlantillaService,
  actualizarPlantillaService,
  eliminarPlantillaService,
  getReglasService,
  crearReglaService,
  toggleReglaService,
  eliminarReglaService,
  getClientesPorSegmento,
  getSeguimientosDeClienteService,
} from '../services/seguimientos.service';
import type { SegmentoTipo } from '../services/seguimientos.service';

// ─── SEGMENTO ─────────────────────────────────────────────────────────────────

export const previsualizarSegmento = async (req: AuthRequest, res: Response) => {
  try {
    const { segmento, diasCondicion, clienteIds } = req.body;
    const resultado = await previsualizarSegmentoService(
      segmento as SegmentoTipo,
      diasCondicion,
      clienteIds
    );
    res.json(resultado);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getClientesSegmento = async (req: AuthRequest, res: Response) => {
  try {
    const { segmento, diasCondicion, clienteIds } = req.body;
    const clientes = await getClientesPorSegmento(
      segmento as SegmentoTipo,
      diasCondicion,
      clienteIds
    );
    res.json(clientes);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ─── CAMPAÑAS ─────────────────────────────────────────────────────────────────

const campanaSchema = z.object({
  nombre: z.string().min(1),
  asunto: z.string().min(1),
  segmento: z.enum(['activos', 'cotizacion_sin_respuesta', 'cotizacion_rechazada', 'sin_actividad', 'todos', 'manual']),
  diasCondicion: z.number().int().positive().optional(),
  clienteIdsManual: z.array(z.number()).optional(),
  bloques: z.array(z.any()),
  plantillaId: z.number().int().positive().optional(),
});

export const enviarCampana = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = campanaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const resultado = await enviarCampanaService(parsed.data, req.user!.userId);
    res.status(201).json(resultado);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getHistorialCampanas = async (_req: AuthRequest, res: Response) => {
  const data = await getHistorialCampanasService();
  res.json(data);
};

export const getDetalleCampana = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const data = await getDetalleCampanaService(id);
    if (!data) { res.status(404).json({ error: 'Campaña no encontrada' }); return; }
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ─── PLANTILLAS ───────────────────────────────────────────────────────────────

const plantillaSchema = z.object({
  nombre: z.string().min(1),
  asunto: z.string().min(1),
  bloques: z.array(z.any()),
});

export const getPlantillas = async (_req: AuthRequest, res: Response) => {
  const data = await getPlantillasService();
  res.json(data);
};

export const crearPlantilla = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = plantillaSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const data = await crearPlantillaService(parsed.data, req.user!.userId);
    res.status(201).json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const actualizarPlantilla = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const data = await actualizarPlantillaService(id, req.body);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const eliminarPlantilla = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    await eliminarPlantillaService(id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ─── AUTOMATIZACIONES ────────────────────────────────────────────────────────

const reglaSchema = z.object({
  nombre: z.string().min(1),
  evento: z.enum(['cotizacion_sin_respuesta', 'sin_actividad']),
  diasCondicion: z.number().int().positive(),
  plantillaId: z.number().int().positive(),
  asunto: z.string().min(1),
});

export const getReglas = async (_req: AuthRequest, res: Response) => {
  const data = await getReglasService();
  res.json(data);
};

export const crearRegla = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = reglaSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const data = await crearReglaService(parsed.data, req.user!.userId);
    res.status(201).json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const toggleRegla = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const data = await toggleReglaService(id);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const eliminarRegla = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    await eliminarReglaService(id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ─── SEGUIMIENTOS POR CLIENTE ─────────────────────────────────────────────────

export const getSeguimientosCliente = async (req: AuthRequest, res: Response) => {
  try {
    const clienteId = parseId(req.params.clienteId);
    const data = await getSeguimientosDeClienteService(clienteId);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
