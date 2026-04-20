import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import {
  getFacturasService,
  getFacturaByIdService,
  crearFacturaService,
  registrarCobroService,
  getFacturasVencidasService,
  crearNotaCreditoService,
  getCobrosPendientesService,
  cargarNroFacturaArcaService,
} from '../services/facturacion.service';

const crearFacturaSchema = z.object({
  ventaId: z.number().int().positive(),
  nroFactura: z.string().optional(),
  esSinFactura: z.boolean().optional(),
  fechaVencimiento: z.string().optional(),
  totalNeto: z.number().positive(),
  iva: z.number().min(0),
  totalConIva: z.number().positive(),
  observaciones: z.string().optional(),
});

const cobroSchema = z.object({
  monto: z.number().positive(),
  medioPago: z.enum(['transferencia', 'e_check', 'efectivo']),
  nroComprobante: z.string().optional(),
  esAdelanto: z.boolean().optional(),
  observaciones: z.string().optional(),
});

const notaCreditoSchema = z.object({
  facturaId: z.number().int().positive(),
  nroNota: z.string().optional(),
  monto: z.number().positive(),
  motivo: z.string().min(1, 'El motivo es requerido'),
});

export const getFacturas = async (req: AuthRequest, res: Response) => {
  const facturas = await getFacturasService(req.user!.userId, req.user!.rol);
  res.json(facturas);
};

export const getFacturaById = async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  const factura = await getFacturaByIdService(id);
  res.json(factura);
};

export const crearFactura = async (req: AuthRequest, res: Response) => {
  const parsed = crearFacturaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const factura = await crearFacturaService(
    {
      ...parsed.data,
      fechaVencimiento: parsed.data.fechaVencimiento
        ? new Date(parsed.data.fechaVencimiento)
        : undefined,
    },
    req.user!.userId
  );
  res.status(201).json(factura);
};

export const registrarCobro = async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  const parsed = cobroSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const resultado = await registrarCobroService(id, parsed.data, req.user!.userId);
  res.status(201).json(resultado);
};

export const getFacturasVencidas = async (_req: AuthRequest, res: Response) => {
  const facturas = await getFacturasVencidasService();
  res.json(facturas);
};

export const crearNotaCredito = async (req: AuthRequest, res: Response) => {
  const parsed = notaCreditoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const nota = await crearNotaCreditoService(parsed.data, req.user!.userId);
  res.status(201).json(nota);
};

export const getCobrosPendientes = async (req: AuthRequest, res: Response) => {
  const cobros = await getCobrosPendientesService(req.user!.userId, req.user!.rol);
  res.json(cobros);
};

export const actualizarNroFactura = async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  const { nroFactura } = req.body;
  if (!nroFactura || typeof nroFactura !== 'string') {
    res.status(400).json({ error: 'nroFactura es requerido' });
    return;
  }
  const factura = await import('../utils/prisma').then(m => m.default.factura.update({
    where: { id },
    data: { nroFactura: nroFactura.trim() },
  }));
  res.json(factura);
};

export const cargarNroArca = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { nroFacturaArca } = req.body;
    if (!nroFacturaArca?.trim()) {
      res.status(400).json({ error: 'El número de factura ARCA es requerido' });
      return;
    }
    const factura = await cargarNroFacturaArcaService(id, nroFacturaArca.trim());
    res.json(factura);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
