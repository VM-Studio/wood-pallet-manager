import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import { parseFechaLocal } from '../utils/fecha';
import {
  getLogisticasService,
  getLogisticaByVentaService,
  crearLogisticaService,
  actualizarEstadoEntregaService,
  confirmarEntregaClienteService,
  getEntregasDelDiaService,
  getLogisticasPorRolService,
  consultarLogisticaService,
  responderConsultaLogisticaService,
  confirmarLogisticaCarlosService,
  avanzarLogisticaService,
  getLogisticasAceptadasService,
  getRutasHoyService,
} from '../services/logistica.service';
import { geocodeAddress } from '../utils/geocode';

// ── Búsqueda de dirección (Nominatim) para el autocomplete del front ──────────
interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export const addressSearch = async (req: Request, res: Response) => {
  const q = (req.query.q as string ?? '').trim();
  if (q.length < 3) { res.json([]); return; }

  try {
    const query = encodeURIComponent(q.includes('argentina') ? q : `${q}, Argentina`);
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${query}&format=json&countrycodes=ar&limit=5&accept-language=es&addressdetails=0`;

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'WoodPalletManager/1.0 (woodpallets.com.ar)',
        'Accept-Language': 'es',
      },
    });
    const data = (await resp.json()) as NominatimResult[];

    res.json(
      data.map(r => ({
        address: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      }))
    );
  } catch (err) {
    console.error('[addressSearch] Nominatim error:', err);
    res.json([]);
  }
};

// ── Geocodificación de una sola dirección ─────────────────────────────────────
export const geocodeSingle = async (req: Request, res: Response) => {
  const q = (req.query.q as string ?? '').trim();
  if (!q) { res.json(null); return; }

  const result = await geocodeAddress(q);
  res.json(result);
};

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
    fechaRetiroGalpon: z.string().optional().transform(v => v ? parseFechaLocal(v) : undefined),
    horaRetiro: z.string().optional().transform(v => v ? parseFechaLocal(v) : undefined),
    horaEstimadaEntrega: z.string().optional().transform(v => v ? parseFechaLocal(v) : undefined),
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

export const getLogisticasPorRol = async (req: AuthRequest, res: Response) => {
  try {
    const vista = req.query.vista as string | undefined;
    const data = await getLogisticasPorRolService(req.user!.userId, req.user!.rol, vista);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const consultarLogistica = async (req: AuthRequest, res: Response) => {
  try {
    const ventaId = parseId(req.params.ventaId);
    const data = await consultarLogisticaService(ventaId, req.user!.userId);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const responderConsultaLogistica = async (req: AuthRequest, res: Response) => {
  try {
    const ventaId = parseId(req.params.ventaId);
    const { respuesta, ...datos } = req.body;
    if (!['aceptada', 'rechazada'].includes(respuesta)) {
      res.status(400).json({ error: 'Respuesta debe ser "aceptada" o "rechazada"' });
      return;
    }
    const data = await responderConsultaLogisticaService(ventaId, respuesta, req.user!.userId, req.user!.rol, datos);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const confirmarLogisticaCarlos = async (req: AuthRequest, res: Response) => {
  try {
    const ventaId = parseId(req.params.ventaId);
    const data = await confirmarLogisticaCarlosService(ventaId, req.user!.rol, req.body);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const avanzarLogistica = async (req: AuthRequest, res: Response) => {
  try {
    const ventaId = parseId(req.params.ventaId);
    const { accion } = req.body;
    if (!['consultando', 'aceptada', 'en_camino', 'entregada'].includes(accion)) {
      res.status(400).json({ error: 'Acción debe ser "consultando", "aceptada", "en_camino" o "entregada"' });
      return;
    }
    const data = await avanzarLogisticaService(ventaId, accion, req.user!.rol);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getLogisticasAceptadas = async (_req: Request, res: Response) => {
  const data = await getLogisticasAceptadasService();
  res.json(data);
};

export const getRutasHoy = async (_req: Request, res: Response) => {
  const data = await getRutasHoyService();
  res.json(data);
};
