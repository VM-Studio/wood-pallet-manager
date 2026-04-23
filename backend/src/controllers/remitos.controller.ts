import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import {
  getRemitosService,
  getRemitoByIdService,
  getRemitoByTokenService,
  crearRemitoService,
  firmarPropietarioService,
  enviarRemitoService,
  firmarClienteService,
  actualizarNumeroRemitoService,
  cancelarRemitoService,
} from '../services/remitos.service';

const crearRemitoSchema = z.object({
  ventaId:          z.number().int().positive(),
  firmaPropietario: z.string().optional(),
  fechaEntrega:     z.string().optional().transform(v => v ? new Date(v) : undefined),
  observaciones:    z.string().optional(),
});

const firmarPropietarioSchema = z.object({
  firma: z.string().min(10, 'Firma inválida'),
});

const firmarClienteSchema = z.object({
  firmaCliente: z.string().min(10, 'Firma inválida'),
});

const numeroRemitoSchema = z.object({
  numeroRemito: z.string().min(1, 'El número de remito es requerido'),
});

// ── Rutas autenticadas ────────────────────────────────────

export const getRemitos = async (req: AuthRequest, res: Response) => {
  try {
    const remitos = await getRemitosService(req.user!.userId, req.user!.rol);
    res.json(remitos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getRemitoById = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const remito = await getRemitoByIdService(id);
    res.json(remito);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const crearRemito = async (req: AuthRequest, res: Response) => {
  try {
    const datos = crearRemitoSchema.parse(req.body);
    const remito = await crearRemitoService(datos, req.user!.userId);
    res.status(201).json(remito);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};

export const firmarPropietario = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { firma } = firmarPropietarioSchema.parse(req.body);
    const remito = await firmarPropietarioService(id, firma);
    res.json(remito);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};

export const enviarRemito = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const remito = await enviarRemitoService(id);
    res.json(remito);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const actualizarNumeroRemito = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { numeroRemito } = numeroRemitoSchema.parse(req.body);
    const remito = await actualizarNumeroRemitoService(id, numeroRemito);
    res.json(remito);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};

export const cancelarRemito = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const remito = await cancelarRemitoService(id);
    res.json(remito);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ── Ruta pública (sin auth) para que el cliente firme ────

export const getRemitoPublico = async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const remito = await getRemitoByTokenService(token);
    // No devolver firmas del propietario para seguridad del canvas
    res.json(remito);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const firmarClientePublico = async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const { firmaCliente } = firmarClienteSchema.parse(req.body);
    const remito = await firmarClienteService(token, firmaCliente);
    res.json({ ok: true, mensaje: 'Remito firmado correctamente. Se envió una copia a tu email.', remitoId: remito.id });
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};
